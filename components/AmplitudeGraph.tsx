
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GraphDataPoint, Harmonic } from '../types';

interface AmplitudeGraphProps {
  harmonics: Harmonic[]; // Should be all 32 potential harmonics, (from App.tsx's allGraphHarmonics)
  activeHarmonicIds: Set<number>; // IDs of harmonics that are currently in App.tsx's activeHarmonics state
  onAmplitudeChange: (id: number, amplitude: number) => void;
}

const MAX_POTENTIAL_HARMONICS = 32;

const AmplitudeGraph: React.FC<AmplitudeGraphProps> = ({ harmonics, activeHarmonicIds, onAmplitudeChange }) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const [draggingHarmonicId, setDraggingHarmonicId] = useState<number | null>(null);
  const yAxisBoundsRef = useRef<{ top: number; bottom: number; height: number } | null>(null);
  
  const hasSolo = harmonics.filter(h => activeHarmonicIds.has(h.id)).some(h => h.amplitude > 0 && h.isSoloed && !h.isMuted);

  const data: GraphDataPoint[] = harmonics.map(h_from_all => {
    const isActiveInAppState = activeHarmonicIds.has(h_from_all.id);
    let displayAmplitude = h_from_all.amplitude;
    const originalAmplitude = h_from_all.amplitude;

    if (h_from_all.isMuted) {
      displayAmplitude = 0;
    } else if (hasSolo && !h_from_all.isSoloed && isActiveInAppState) {
      displayAmplitude = 0;
    }
    
    return {
      name: `H${h_from_all.id}`,
      amplitude: displayAmplitude,
      originalAmplitude: originalAmplitude,
      isMuted: h_from_all.isMuted,
      isLocked: h_from_all.isLocked,
      isSoloed: h_from_all.isSoloed,
      id: h_from_all.id,
    };
  });

  const updateYAxisBounds = useCallback(() => {
    if (!graphRef.current) return;
    const svg = graphRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgRect = svg.getBoundingClientRect();

    // Priority: Use the Cartesian grid's bounding box
    const chartGrid = svg.querySelector('.recharts-cartesian-grid');
    if (chartGrid) {
        const gridRect = chartGrid.getBoundingClientRect();
        const gridTopInSvg = gridRect.top - svgRect.top;
        const gridBottomInSvg = gridRect.bottom - svgRect.top;
        
        // The YAxis domain is [0, 1]. We need the pixel values for these.
        // The grid height should correspond to this range.
        // Sometimes, Recharts applies a small margin/padding internally for the grid.
        // We need to find the actual pixel y for 0 and 1 on the y-axis ticks.
        const yAxisTickValues = Array.from(svg.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value'));
        const yTickCoords = yAxisTickValues.map(tickValueElement => { // tickValueElement is an Element, likely SVGTSpanElement
            const yVal = parseFloat(tickValueElement.textContent || "NaN");
            
            // The <tspan class="recharts-cartesian-axis-tick-value"> is inside a <text> element,
            // which is inside a <g class="recharts-cartesian-axis-tick"> element.
            // The <g> element has the 'transform' attribute.
            const textElement = tickValueElement.parentElement;
            if (textElement) {
                const tickGroupGElement = textElement.parentElement; // This should be the <g>
                if (tickGroupGElement instanceof SVGGraphicsElement) { // SVGGElement extends SVGGraphicsElement
                    const transform = tickGroupGElement.getAttribute('transform');
                    if (transform) {
                        const match = /translate\([^,]+,\s*([^)]+)\)/.exec(transform);
                        if (match && match[1]) {
                            return { value: yVal, yPos: parseFloat(match[1]) };
                        }
                    }
                }
            }
            return null;
        }).filter(Boolean) as { value: number; yPos: number }[];

        const y0 = yTickCoords.find(t => t.value === 0);
        const y1 = yTickCoords.find(t => t.value === 1);

        if (y0 && y1 && Math.abs(y0.yPos - y1.yPos) > 10) { // Ensure distinct points
             yAxisBoundsRef.current = {
                top: Math.min(y0.yPos, y1.yPos), // Y for amplitude 1 (visually higher up on screen is smaller Y value)
                bottom: Math.max(y0.yPos, y1.yPos), // Y for amplitude 0
                height: Math.abs(y0.yPos - y1.yPos),
            };
            return;
        }
        
        // Fallback if ticks are not as expected, use grid bounds, assuming grid covers plot area well
        if (gridRect.height > 10){ // a sanity check for grid height
            yAxisBoundsRef.current = {
                top: gridTopInSvg, // Assuming grid top aligns with Y=1
                bottom: gridBottomInSvg, // Assuming grid bottom aligns with Y=0
                height: gridRect.height,
            };
            console.warn("AmplitudeGraph: Using grid bounds as fallback for Y-axis scale. Drag accuracy might vary slightly.");
            return;
        }
    }

    // Further fallback: original complex logic (less preferred now)
    const yAxisGroup = svg.querySelector('.recharts-yAxis');
    if (yAxisGroup) {
      const yAxisPath = yAxisGroup.querySelector('path.recharts-cartesian-axis-line');
      if (yAxisPath) {
          const d = yAxisPath.getAttribute('d') || '';
          const LCommands = d.split('L').map(cmd => cmd.trim().split(',').map(parseFloat));
          if (LCommands.length > 1 && LCommands[0].length === 2 && LCommands[1].length === 2) {
              const pathY1 = LCommands[0][1]; // M command y
              const pathY2 = LCommands[1][1]; // L command y
              yAxisBoundsRef.current = {
                  top: Math.min(pathY1, pathY2),
                  bottom: Math.max(pathY1, pathY2),
                  height: Math.abs(pathY2 - pathY1),
              };
              return;
          }
      }
    }
    
    // Final fallback: SVG height with margins (least accurate)
    const height = svgRect.height;
    const margin = { top: 20, bottom: 20 }; // Default Recharts-like margins
    yAxisBoundsRef.current = {
        top: margin.top,
        bottom: height - margin.bottom,
        height: height - margin.top - margin.bottom,
    };
    console.error("AmplitudeGraph: Failed to determine Y-axis bounds accurately. Drag functionality might be impaired.");

  }, []);


  useEffect(() => {
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        yAxisBoundsRef.current = null; 
        updateYAxisBounds();
      }, 200); // Increased debounce for resize
    };
    window.setTimeout(updateYAxisBounds, 200); // Initial call after render
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateYAxisBounds]);

  const handleMouseDownOnBar = (event: React.MouseEvent<SVGElement>, harmonicId: number) => {
    if (!yAxisBoundsRef.current || yAxisBoundsRef.current.height === 0) {
      updateYAxisBounds(); 
      if (!yAxisBoundsRef.current || yAxisBoundsRef.current.height === 0) {
        console.error("Y-axis bounds not ready for dragging.");
        return;
      }
    }
    const targetHarmonic = harmonics.find(h => h.id === harmonicId); 

    if (targetHarmonic && targetHarmonic.isLocked) {
        return;
    }
    setDraggingHarmonicId(harmonicId);
    event.preventDefault();
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (draggingHarmonicId === null || !graphRef.current || !yAxisBoundsRef.current || yAxisBoundsRef.current.height <= 10) return; // Added height check
    
    const targetHarmonic = harmonics.find(h => h.id === draggingHarmonicId); 
    if (targetHarmonic && targetHarmonic.isLocked) {
        setDraggingHarmonicId(null); 
        return;
    }

    const svg = graphRef.current.querySelector('svg');
    if(!svg) return;
    const svgRect = svg.getBoundingClientRect();
    if (!svgRect) return;

    const mouseY = event.clientY - svgRect.top;
    const yBounds = yAxisBoundsRef.current;
    
    // yBounds.top is the pixel y-coordinate for amplitude 1 (higher on screen, smaller y value)
    // yBounds.bottom is the pixel y-coordinate for amplitude 0
    let newAmplitude = (yBounds.bottom - mouseY) / yBounds.height;
    newAmplitude = Math.max(0, Math.min(1, newAmplitude));

    onAmplitudeChange(draggingHarmonicId, newAmplitude);

  }, [draggingHarmonicId, onAmplitudeChange, harmonics]);

  const handleMouseUp = useCallback(() => {
    if (draggingHarmonicId !== null) {
        setDraggingHarmonicId(null);
    }
  }, [draggingHarmonicId]);

  useEffect(() => {
    if (draggingHarmonicId !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection during drag
      document.body.style.cursor = 'grabbing';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'default';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'default';
    };
  }, [draggingHarmonicId, handleMouseMove, handleMouseUp]);
  
  const getBarFillColor = (hData: GraphDataPoint) => {
    const isCurrentlyActiveInApp = activeHarmonicIds.has(hData.id);

    if (hData.isLocked) return '#0ea5e9'; 
    if (!isCurrentlyActiveInApp && hData.originalAmplitude === 0) return '#334155'; 
    
    if (hData.isMuted) return '#64748b'; 
    if (isCurrentlyActiveInApp && hasSolo && !hData.isSoloed && hData.originalAmplitude > 0) return '#475569'; 
    if (hData.isSoloed) return '#f59e0b'; 
    
    if (isCurrentlyActiveInApp || hData.originalAmplitude > 0) return '#3b82f6'; 
    
    return '#334155';
  };

  const xAxisTickValues = React.useMemo(() => {
    return data
      // Show tick if index is even OR if it's the last harmonic index
      .filter((point, index) => index % 2 === 0 || index === MAX_POTENTIAL_HARMONICS - 1)
      .map(item => item.name);
  }, [data]);

  return (
    <div ref={graphRef} className="h-full w-full bg-slate-800/50 p-4 rounded-lg shadow-xl flex flex-col select-none"
         onMouseLeave={handleMouseUp} // End drag if mouse leaves graph area
    >
      <h3 className="text-lg font-semibold text-slate-300 mb-3 text-center">Harmonic Amplitudes (Drag bars to adjust/activate)</h3>
      <ResponsiveContainer width="100%" height="100%" debounce={50}>
        <BarChart 
            data={data} 
            margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
            onMouseDown={(e) => { // e is ChartMouseEvent here
                 if (!yAxisBoundsRef.current && e && typeof e.chartY === 'number') { 
                    // Avoid calling updateYAxisBounds on every mousedown if already computed
                    // updateYAxisBounds(); // Call only if really needed
                 }
            }}
            // barCategoryGap={1} // Adjust for thinner bars if needed
            >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 9, fill: '#94a3b8' }} 
            ticks={xAxisTickValues}
            interval={0} // When `ticks` prop is used, set interval to 0 to ensure all provided ticks are considered
            />
          <YAxis 
            domain={[0, 1]} 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            width={35}
           />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', borderRadius: '0.375rem' }}
            labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}
            itemStyle={{ color: '#94a3b8' }}
            formatter={(value: number, name: string, propsPayload: {payload: GraphDataPoint}) => {
                 if (propsPayload.payload) {
                    const { id, originalAmplitude, amplitude: audibleAmplitude, isMuted, isSoloed, isLocked } = propsPayload.payload;
                    const isActivePayload = activeHarmonicIds.has(id);
                    if (!isActivePayload && originalAmplitude === 0) return `Inactive`;

                    let status = "";
                    if (isLocked) status += "(Locked)";

                    if (isMuted) status += status ? " (Muted)" : "(Muted)";
                    else if (isActivePayload && hasSolo && !isSoloed && originalAmplitude > 0) status += status ? " (Not Soloed)" : "(Not Soloed)";
                    else if (isSoloed) status += status ? " (Soloed)" : "(Soloed)";
                    return `${originalAmplitude.toFixed(3)} ${status.trim()} \u2192 ${audibleAmplitude.toFixed(3)} audible`; // \u2192 is right arrow
                 }
                 return value.toFixed(3);
            }}
            cursor={{fill: 'rgba(100, 116, 139, 0.1)'}}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Bar dataKey="amplitude" barSize={12} radius={[2, 2, 0, 0]} > {/* Optional: slightly rounded top corners */}
            {data.map((entry) => {
                const isDraggable = !entry.isLocked;
              return (
              <Cell 
                key={`cell-${entry.id}`} 
                fill={getBarFillColor(entry)}
                cursor={isDraggable ? (draggingHarmonicId === entry.id ? 'grabbing' : 'grab') : 'not-allowed'}
                onMouseDown={(e: any) => isDraggable ? handleMouseDownOnBar(e, entry.id) : null}
                className={isDraggable ? 'hover:opacity-80 transition-opacity' : ''}
              />
            )})}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AmplitudeGraph;

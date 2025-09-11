


// "use client";

// import { useState, useRef, useEffect } from 'react';
// import { Stage, Layer, Line, Circle, Rect, Shape as KonvaShape } from 'react-konva';
// import { Point, Zone, Shape } from '@/types';
// import { useShapes } from '@/hooks/useShapes';
// import { useTimer } from '@/hooks/useTimer';
// import { ShapeUtils } from '@/lib/utils/shapes';
// import { ZoneUtils } from '@/lib/utils/zones';
// import { CANVAS_CONFIG } from '@/lib/constants';
// import ColorPicker from './ColorPicker';
// import MetricCard from './MetricCard';
// import Timer from './Timer';

// export default function PaintCanvas() {
//   const { shapes, currentShape, currentShapeIndex, loading, error, changeShape, nextShape, randomShape } = useShapes();
//   const { timeLeft, isFinished, timeElapsed, startTimer, resetTimer } = useTimer();

//   const stageRef = useRef(null);
//   const containerRef = useRef(null);
//   const [canvasSize, setCanvasSize] = useState({ 
//     width: CANVAS_CONFIG.DEFAULT_WIDTH, 
//     height: CANVAS_CONFIG.DEFAULT_HEIGHT 
//   });

//   const [shape, setShape] = useState<Shape | null>(null);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [brushColor, setBrushColor] = useState<string>('');
//   const [brushSize, setBrushSize] = useState<number>(12);

//   const [nearCount, setNearCount] = useState<number>(0);
//   const [farCount, setFarCount] = useState<number>(0);
//   const [coverage, setCoverage] = useState<number>(0);

//   const [lines, setLines] = useState([]);
//   const [currentLine, setCurrentLine] = useState(null);
//   const lastZoneRef = useRef<Zone | null>(null);

//   // Update canvas size based on container
//   useEffect(() => {
//     const updateCanvasSize = () => {
//       if (!containerRef.current) return;
//       const containerWidth = containerRef.current.clientWidth - 32;
//       const maxWidth = Math.min(CANVAS_CONFIG.DEFAULT_WIDTH, Math.max(CANVAS_CONFIG.MIN_WIDTH, containerWidth));
//       const aspectRatio = CANVAS_CONFIG.DEFAULT_HEIGHT / CANVAS_CONFIG.DEFAULT_WIDTH;
//       const height = Math.round(maxWidth * aspectRatio);
//       setCanvasSize({ width: Math.round(maxWidth), height });
//     };

//     updateCanvasSize();
//     window.addEventListener("resize", updateCanvasSize);
//     return () => window.removeEventListener("resize", updateCanvasSize);
//   }, []);

//   // Update scaled shape when current shape or canvas size changes
//   useEffect(() => {
//     if (!currentShape) return;
//     const scaleX = canvasSize.width / CANVAS_CONFIG.DEFAULT_WIDTH;
//     const scaleY = canvasSize.height / CANVAS_CONFIG.DEFAULT_HEIGHT;
//     setShape(ShapeUtils.scaleShape(currentShape, scaleX, scaleY));
//   }, [currentShape, canvasSize]);

//   const handleZoneTransition = (newZone: Zone) => {
//     const prevZone = lastZoneRef.current;
//     if (prevZone === newZone) return;

//     if (newZone === 'OUTSIDE_NEAR') setNearCount(n => n + 1);
//     if (newZone === 'OUTSIDE_FAR') setFarCount(n => n + 1);

//     lastZoneRef.current = newZone;
//   };

//   const getStagePos = (e): Point => {
//     const stage = e.target.getStage();
//     const pointer = stage.getPointerPosition();
//     return { x: pointer.x, y: pointer.y };
//   };

//   const computeCoverage = () => {
//     if (!shape || lines.length === 0) {
//       setCoverage(0);
//       return;
//     }

//     // Sample points within the shape to check coverage
//     let totalPoints = 0;
//     let paintedPoints = 0;
//     const step = 3; // Sample every 3 pixels for performance

//     for (let y = 0; y < canvasSize.height; y += step) {
//       for (let x = 0; x < canvasSize.width; x += step) {
//         const point = { x, y };
//         const zone = ZoneUtils.getZoneForPoint(point, shape);
        
//         if (zone === 'INSIDE') {
//           totalPoints++;
          
//           // Check if this point is covered by any stroke
//           const isPainted = lines.some(line => {
//             if (!line.points || line.points.length < 4) return false;
            
//             // Check if point is within stroke radius of any line segment
//             for (let i = 0; i < line.points.length - 2; i += 2) {
//               const x1 = line.points[i];
//               const y1 = line.points[i + 1];
//               const x2 = line.points[i + 2] || x1;
//               const y2 = line.points[i + 3] || y1;
              
//               const distance = distanceToLineSegment(point, { x: x1, y: y1 }, { x: x2, y: y2 });
//               if (distance <= line.strokeWidth / 2) {
//                 return true;
//               }
//             }
//             return false;
//           });
          
//           if (isPainted) paintedPoints++;
//         }
//       }
//     }

//     const pct = totalPoints ? (paintedPoints / totalPoints) * 100 : 0;
//     setCoverage(Number(pct.toFixed(1)));
//   };

//   // Helper function to calculate distance from point to line segment
//   const distanceToLineSegment = (point, lineStart, lineEnd) => {
//     const dx = lineEnd.x - lineStart.x;
//     const dy = lineEnd.y - lineStart.y;
//     const length = Math.sqrt(dx * dx + dy * dy);
    
//     if (length === 0) {
//       return Math.sqrt(
//         (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2
//       );
//     }
    
//     const t = Math.max(0, Math.min(1, 
//       ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
//     ));
    
//     const projection = {
//       x: lineStart.x + t * dx,
//       y: lineStart.y + t * dy
//     };
    
//     return Math.sqrt(
//       (point.x - projection.x) ** 2 + (point.y - projection.y) ** 2
//     );
//   };

//   const onPointerDown = (e) => {
//     if (isFinished || !shape || !brushColor) return;
    
//     startTimer();
//     setIsDrawing(true);
//     lastZoneRef.current = null;

//     const point = getStagePos(e);
//     const zone = ZoneUtils.getZoneForPoint(point, shape);
//     handleZoneTransition(zone);

//     if (zone === 'INSIDE') {
//       const newLine = {
//         points: [point.x, point.y],
//         stroke: brushColor,
//         strokeWidth: brushSize,
//         tension: 0.5,
//         lineCap: 'round',
//         lineJoin: 'round',
//       };
//       setCurrentLine(newLine);
//       setLines([...lines, newLine]);
//     }
//   };

//   const onPointerMove = (e) => {
//     if (!isDrawing || isFinished || !shape || !brushColor || !currentLine) return;

//     const point = getStagePos(e);
//     const zone = ZoneUtils.getZoneForPoint(point, shape);
//     handleZoneTransition(zone);

//     if (zone === 'INSIDE') {
//       const updatedLine = {
//         ...currentLine,
//         points: [...currentLine.points, point.x, point.y]
//       };
      
//       setCurrentLine(updatedLine);
//       setLines(prevLines => [
//         ...prevLines.slice(0, -1),
//         updatedLine
//       ]);
//     }
//   };

//   const onPointerUp = () => {
//     setIsDrawing(false);
//     setCurrentLine(null);
//     computeCoverage();
//   };

//   const resetStats = () => {
//     setNearCount(0);
//     setFarCount(0);
//     setCoverage(0);
//     resetTimer();
//     lastZoneRef.current = null;
//   };

//   const handleShapeChange = (index: number) => {
//     changeShape(index);
//     setLines([]);
//     resetStats();
//   };

//   const resetCanvas = () => {
//     setLines([]);
//     resetStats();
//   };

//   const renderShapeOutline = () => {
//     if (!shape) return null;

//     const commonProps = {
//       fill: 'transparent',
//       stroke: '#111111',
//       strokeWidth: 3,
//     };

//     if (shape.type === 'rect') {
//       return (
//         <Rect
//           x={shape.x}
//           y={shape.y}
//           width={shape.width}
//           height={shape.height}
//           {...commonProps}
//         />
//       );
//     }

//     if (shape.type === 'circle') {
//       return (
//         <Circle
//           x={shape.cx}
//           y={shape.cy}
//           radius={shape.r}
//           {...commonProps}
//         />
//       );
//     }

//     if (shape.type === 'polygon' && shape.points?.length > 0) {
//       const points = shape.points.flat();
//       return (
//         <Line
//           points={points}
//           closed={true}
//           {...commonProps}
//         />
//       );
//     }

//     return null;
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
//         <div className="text-center">
//           <div className="text-xl text-gray-600">Loading shapes...</div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
//         <div className="max-w-md text-center bg-white p-6 rounded-lg shadow">
//           <h2 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Shapes</h2>
//           <p className="text-sm text-gray-600">{error}</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div ref={containerRef} className="min-h-screen bg-gray-50 p-4">
//       <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
//         <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">
//           🎨 Shape Painting Task
//         </h1>

//         {!brushColor && (
//           <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm">
//             👆 Pick a color to start painting inside the shape!
//           </div>
//         )}

//         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
//           <div className="text-lg font-semibold">
//             Shape: <span className="text-blue-600">{currentShape?.name || '—'}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <button
//               onClick={nextShape}
//               className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
//             >
//               Next Shape
//             </button>
//             <button
//               onClick={randomShape}
//               className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
//             >
//               🎲 Random
//             </button>
//             <Timer timeLeft={timeLeft} />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 mb-4">
//           <div className="grid grid-cols-1 gap-4">
//             <ColorPicker brushColor={brushColor} onColorChange={setBrushColor} />

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Brush size: {brushSize}px
//                 </label>
//                 <input
//                   type="range"
//                   min={CANVAS_CONFIG.BRUSH_SIZE_MIN}
//                   max={CANVAS_CONFIG.BRUSH_SIZE_MAX}
//                   value={brushSize}
//                   onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
//                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Choose shape:</label>
//                 <select
//                   value={currentShapeIndex}
//                   onChange={(e) => handleShapeChange(parseInt(e.target.value, 10))}
//                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                   {shapes.map((s, i) => (
//                     <option key={s.id} value={i}>{s.name}</option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//           </div>

//           <div className="flex items-end">
//             <button
//               onClick={resetCanvas}
//               className="px-4 py-2 h-10 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
//             >
//               ♻ Reset
//             </button>
//           </div>
//         </div>

//         <div className="mb-4 flex justify-center">
//           <div 
//             className="border-2 border-gray-300 rounded-lg shadow-sm bg-white"
//             style={{
//               width: `${canvasSize.width}px`,
//               height: `${canvasSize.height}px`,
//               maxWidth: '100%',
//             }}
//           >
//             <Stage
//               ref={stageRef}
//               width={canvasSize.width}
//               height={canvasSize.height}
//               onMouseDown={onPointerDown}
//               onMouseMove={onPointerMove}
//               onMouseUp={onPointerUp}
//               onTouchStart={onPointerDown}
//               onTouchMove={onPointerMove}
//               onTouchEnd={onPointerUp}
//               style={{
//                 cursor: brushColor ? 'crosshair' : 'default',
//               }}
//             >
//               <Layer>
//                 {/* White background */}
//                 <Rect
//                   x={0}
//                   y={0}
//                   width={canvasSize.width}
//                   height={canvasSize.height}
//                   fill="white"
//                 />
                
//                 {/* Drawn lines */}
//                 {lines.map((line, i) => (
//                   <Line
//                     key={i}
//                     points={line.points}
//                     stroke={line.stroke}
//                     strokeWidth={line.strokeWidth}
//                     tension={line.tension}
//                     lineCap={line.lineCap}
//                     lineJoin={line.lineJoin}
//                     globalCompositeOperation="source-over"
//                   />
//                 ))}
                
//                 {/* Shape outline */}
//                 {renderShapeOutline()}
//               </Layer>
//             </Stage>
//           </div>
//         </div>

//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
//           <MetricCard label="≤10mm movements" value={nearCount} />
//           <MetricCard label="&gt;10mm movements" value={farCount} />
//           <MetricCard label="Coverage" value={`${coverage}%`} />
//           <MetricCard label="Time elapsed" value={`${timeElapsed}s`} />
//         </div>

//         {isFinished && (
//           <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
//             <h3 className="font-bold text-lg mb-2">🎉 Time&apos;s Up! Final Results:</h3>
//             <div className="grid grid-cols-2 gap-4 text-sm">
//               <div>Coverage: <span className="font-bold">{coverage}%</span></div>
//               <div>≤10mm movements: <span className="font-bold">{nearCount}</span></div>
//               <div>&gt;10mm movements: <span className="font-bold">{farCount}</span></div>
//               <div>Total outside movements: <span className="font-bold">{nearCount + farCount}</span></div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
"use client";

import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line, Circle, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Point, Zone, Shape } from "@/types";
import { useShapes } from "@/hooks/useShapes";
import { useTimer } from "@/hooks/useTimer";
import { ShapeUtils } from "@/lib/utils/shapes";
import { ZoneUtils } from "@/lib/utils/zones";
import { CANVAS_CONFIG } from "@/lib/constants";
import ColorPicker from "./ColorPicker";
import MetricCard from "./MetricCard";
import Timer from "./Timer";

type DrawnLine = {
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: "round" | "butt" | "square";
  lineJoin: "round" | "bevel" | "miter";
};

export default function PaintCanvas() {
  const {
    shapes,
    currentShape,
    currentShapeIndex,
    loading,
    error,
    changeShape,
    nextShape,
    randomShape,
  } = useShapes();
  const { timeLeft, isFinished, timeElapsed, startTimer, resetTimer } = useTimer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: CANVAS_CONFIG.DEFAULT_WIDTH,
    height: CANVAS_CONFIG.DEFAULT_HEIGHT,
  });

  const [shape, setShape] = useState<Shape | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>("");
  const [brushSize, setBrushSize] = useState<number>(12);

  const [nearCount, setNearCount] = useState<number>(0);
  const [farCount, setFarCount] = useState<number>(0);
  const [coverage, setCoverage] = useState<number>(0);

  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [currentLine, setCurrentLine] = useState<DrawnLine | null>(null);
  const lastZoneRef = useRef<Zone | null>(null);

  // Derived zoom based on width (height follows fixed aspect ratio)
  const zoom = canvasSize.width / CANVAS_CONFIG.DEFAULT_WIDTH;

  // Update canvas size based on container
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth - 32;
      const maxWidth = Math.min(
        CANVAS_CONFIG.DEFAULT_WIDTH,
        Math.max(CANVAS_CONFIG.MIN_WIDTH, containerWidth)
      );
      const aspectRatio = CANVAS_CONFIG.DEFAULT_HEIGHT / CANVAS_CONFIG.DEFAULT_WIDTH;
      const height = Math.round(maxWidth * aspectRatio);
      setCanvasSize({ width: Math.round(maxWidth), height });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Update scaled shape when current shape or canvas size changes
  useEffect(() => {
    if (!currentShape) return;
    const scaleX = canvasSize.width / CANVAS_CONFIG.DEFAULT_WIDTH;
    const scaleY = canvasSize.height / CANVAS_CONFIG.DEFAULT_HEIGHT;
    setShape(ShapeUtils.scaleShape(currentShape, scaleX, scaleY));
  }, [currentShape, canvasSize]);

  const handleZoneTransition = (newZone: Zone) => {
    const prevZone = lastZoneRef.current;
    if (prevZone === newZone) return;

    if (newZone === "OUTSIDE_NEAR") setNearCount((n) => n + 1);
    if (newZone === "OUTSIDE_FAR") setFarCount((n) => n + 1);

    lastZoneRef.current = newZone;
  };

  const getStagePos = (e: KonvaEventObject<MouseEvent | TouchEvent>): Point => {
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    return { x: pointer?.x ?? 0, y: pointer?.y ?? 0 };
  };

  const computeCoverage = () => {
    if (!shape || lines.length === 0) {
      setCoverage(0);
      return;
    }

    let totalPoints = 0;
    let paintedPoints = 0;
    const step = 3; // sample stride for perf

    for (let y = 0; y < canvasSize.height; y += step) {
      for (let x = 0; x < canvasSize.width; x += step) {
        const point = { x, y };
        const zone = ZoneUtils.getZoneForPoint(point, shape);

        if (zone === "INSIDE") {
          totalPoints++;

          const isPainted = lines.some((line) => {
            if (!line.points || line.points.length < 4) return false;

            for (let i = 0; i < line.points.length - 2; i += 2) {
              const x1 = line.points[i];
              const y1 = line.points[i + 1];
              const x2 = line.points[i + 2] ?? x1;
              const y2 = line.points[i + 3] ?? y1;

              const distance = distanceToLineSegment(
                point,
                { x: x1, y: y1 },
                { x: x2, y: y2 }
              );
              if (distance <= line.strokeWidth / 2) return true;
            }
            return false;
          });

          if (isPainted) paintedPoints++;
        }
      }
    }

    const pct = totalPoints ? (paintedPoints / totalPoints) * 100 : 0;
    setCoverage(Number(pct.toFixed(1)));
  };

  // Helper: distance from point to line segment
  const distanceToLineSegment = (point: Point, lineStart: Point, lineEnd: Point) => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)
      )
    );

    const proj = { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
    return Math.hypot(point.x - proj.x, point.y - proj.y);
  };

  const onPointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isFinished || !shape || !brushColor) return;

    startTimer();
    setIsDrawing(true);
    lastZoneRef.current = null;

    const point = getStagePos(e);
    const zone = ZoneUtils.getZoneForPoint(point, shape);
    handleZoneTransition(zone);

    if (zone === "INSIDE") {
      const newLine: DrawnLine = {
        points: [point.x, point.y],
        stroke: brushColor,
        strokeWidth: brushSize,
        tension: 0.5,
        lineCap: "round",
        lineJoin: "round",
      };
      setCurrentLine(newLine);
      setLines((prev) => [...prev, newLine]);
    }
  };

  const onPointerMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || isFinished || !shape || !brushColor || !currentLine) return;

    const point = getStagePos(e);
    const zone = ZoneUtils.getZoneForPoint(point, shape);
    handleZoneTransition(zone);

    if (zone === "INSIDE") {
      const updatedLine: DrawnLine = {
        ...currentLine,
        points: [...currentLine.points, point.x, point.y],
      };

      setCurrentLine(updatedLine);
      setLines((prev) => [...prev.slice(0, -1), updatedLine]);
    }
  };

  const onPointerUp = () => {
    setIsDrawing(false);
    setCurrentLine(null);
    computeCoverage();
  };

  const resetStats = () => {
    setNearCount(0);
    setFarCount(0);
    setCoverage(0);
    resetTimer();
    lastZoneRef.current = null;
  };

  const handleShapeChange = (index: number) => {
    changeShape(index);
    setLines([]);
    resetStats();
  };

  const resetCanvas = () => {
    // Clearing the drawn content is just resetting `lines`.
    setLines([]);
    resetStats();
  };

  const renderShapeOutline = () => {
    if (!shape) return null;

    const commonProps = {
      fill: "transparent",
      stroke: "#111111",
      strokeWidth: 3,
    };

    if (shape.type === "rect") {
      return (
        <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />
      );
    }

    if (shape.type === "circle") {
      return <Circle x={shape.cx} y={shape.cy} radius={shape.r} {...commonProps} />;
    }

    if (shape.type === "polygon" && (shape.points?.length ?? 0) > 0) {
      const points = shape.points!.flat();
      return <Line points={points} closed {...commonProps} />;
    }

    return null;
    };
    
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading shapes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md text-center bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Shapes</h2>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">🎨 Shape Painting Task</h1>

        {!brushColor && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm">
            👆 Pick a color to start painting inside the shape!
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div className="text-lg font-semibold">
            Shape: <span className="text-blue-600">{currentShape?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={nextShape} className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100">
              Next Shape
            </button>
            <button onClick={randomShape} className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100">
              🎲 Random
            </button>
            <Timer timeLeft={timeLeft} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 mb-4">
          <div className="grid grid-cols-1 gap-4">
            <ColorPicker brushColor={brushColor} onColorChange={setBrushColor} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brush size: {brushSize}px
                </label>
                <input
                  type="range"
                  min={CANVAS_CONFIG.BRUSH_SIZE_MIN}
                  max={CANVAS_CONFIG.BRUSH_SIZE_MAX}
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose shape:</label>
                <select
                  value={currentShapeIndex}
                  onChange={(e) => handleShapeChange(parseInt(e.target.value, 10))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {shapes.map((s, i) => (
                    <option key={s.id} value={i}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <button onClick={resetCanvas} className="px-4 py-2 h-10 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
              ♻ Reset
            </button>
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <div
            className="border-2 border-gray-300 rounded-lg shadow-sm bg-white"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              maxWidth: "100%",
            }}
          >
            <Stage
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
              style={{ cursor: brushColor ? "crosshair" : "default" }}
            >
              <Layer>
                {/* White background */}
                <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="white" />

                {/* Drawn lines */}
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth}
                    tension={line.tension}
                    lineCap={line.lineCap}
                    lineJoin={line.lineJoin}
                    globalCompositeOperation="source-over"
                  />
                ))}

                {/* Shape outline */}
                {renderShapeOutline()}
              </Layer>
            </Stage>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <MetricCard label="≤10mm movements" value={nearCount} />
          <MetricCard label="&gt;10mm movements" value={farCount} />
          <MetricCard label="Coverage" value={`${coverage}%`} />
          <MetricCard label="Time elapsed" value={`${timeElapsed}s`} />
          <MetricCard label="Zoom" value={`${Math.round(zoom * 100)}%`} />
        </div>

        {isFinished && (
          <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
            <h3 className="font-bold text-lg mb-2">🎉 Time&apos;s Up! Final Results:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                Coverage: <span className="font-bold">{coverage}%</span>
              </div>
              <div>
                ≤10mm movements: <span className="font-bold">{nearCount}</span>
              </div>
              <div>
                &gt;10mm movements: <span className="font-bold">{farCount}</span>
              </div>
              <div>
                Total outside movements: <span className="font-bold">{nearCount + farCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

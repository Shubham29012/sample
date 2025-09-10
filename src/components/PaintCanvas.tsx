"use client";

import { useState, useRef, useEffect } from 'react';
import { Point, Zone, Shape } from '@/types';
import { useShapes } from '@/hooks/useShapes';
import { useTimer } from '@/hooks/useTimer';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasUtils } from '@/lib/utils/canvas';
import { ShapeUtils } from '@/lib/utils/shapes';
import { ZoneUtils } from '@/lib/utils/zones';
import { CANVAS_CONFIG } from '@/lib/constants';
import ColorPicker from './ColorPicker';
import MetricCard from './MetricCard';
import Timer from './Timer';

export default function PaintCanvas() {
  const { shapes, currentShape, currentShapeIndex, loading, error, changeShape, nextShape, randomShape } = useShapes();
  const { timeLeft, isFinished, timeElapsed, startTimer, resetTimer } = useTimer();
  const { canvasRef, containerRef, ctx, canvasSize } = useCanvas();

  const [shape, setShape] = useState<Shape | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>('');
  const [brushSize, setBrushSize] = useState<number>(12);

  const [nearCount, setNearCount] = useState<number>(0);
  const [farCount, setFarCount] = useState<number>(0);
  const [coverage, setCoverage] = useState<number>(0);

  const lastZoneRef = useRef<Zone | null>(null);

  // --- NEW: dedicated offscreen paint layer (strokes only; no outline) ---
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // (Re)create the offscreen paint layer when the visible canvas size changes
  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = canvasSize.width;
    off.height = canvasSize.height;
    paintCanvasRef.current = off;
    paintCtxRef.current = off.getContext('2d');
    // When size changes, visible canvas is wiped too—reset stats and redraw outline.
    resetStats();
    if (ctx && shape) {
      CanvasUtils.clearCanvas(ctx, canvasSize.width, canvasSize.height);
      CanvasUtils.drawShapeOutline(ctx, shape);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.width, canvasSize.height]);

  // Update scaled shape when current shape or canvas size changes
  useEffect(() => {
    if (!currentShape) return;
    const scaleX = canvasSize.width / CANVAS_CONFIG.DEFAULT_WIDTH;
    const scaleY = canvasSize.height / CANVAS_CONFIG.DEFAULT_HEIGHT;
    setShape(ShapeUtils.scaleShape(currentShape, scaleX, scaleY));
  }, [currentShape, canvasSize]);

  // Draw (paint layer + outline) when context or shape changes
  useEffect(() => {
    if (!ctx || !shape) return;
    CanvasUtils.clearCanvas(ctx, canvasSize.width, canvasSize.height);
    // --- NEW: draw strokes first ---
    if (paintCanvasRef.current) {
      ctx.drawImage(paintCanvasRef.current, 0, 0);
    }
    CanvasUtils.drawShapeOutline(ctx, shape);
  }, [ctx, shape, canvasSize]);

  const handleZoneTransition = (newZone: Zone) => {
    const prevZone = lastZoneRef.current;
    if (prevZone === newZone) return;

    if (newZone === 'OUTSIDE_NEAR') setNearCount(n => n + 1);
    if (newZone === 'OUTSIDE_FAR') setFarCount(n => n + 1);

    lastZoneRef.current = newZone;
  };

  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // --- CHANGED: draw only to the paint layer; reflect to visible canvas after ---
  const drawDot = (point: Point, color: string) => {
    const pctx = paintCtxRef.current;
    if (!pctx) return;
    const radius = Math.max(2, Math.round(brushSize / 2));
    pctx.save();
    pctx.beginPath();
    pctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    pctx.fillStyle = color;
    pctx.fill();
    pctx.restore();

    if (ctx && shape) {
      CanvasUtils.clearCanvas(ctx, canvasSize.width, canvasSize.height);
      ctx.drawImage(paintCanvasRef.current!, 0, 0);
      CanvasUtils.drawShapeOutline(ctx, shape);
    }
  };

  // --- CHANGED: compute coverage strictly from the paint layer, not the visible canvas ---
  const computeCoverage = () => {
    if (!paintCtxRef.current || !shape) return;

    const w = canvasSize.width;
    const h = canvasSize.height;
    const data = paintCtxRef.current.getImageData(0, 0, w, h).data;

    let inside = 0;
    let paintedInside = 0;

    // Scan the full canvas; if performance ever becomes a concern,
    // you can step by 2px (x+=2, y+=2) or restrict to a shape bbox.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Use ZoneUtils to avoid needing the shape path here
        const zone = ZoneUtils.getZoneForPoint({ x: x + 0.5, y: y + 0.5 }, shape);
        if (zone === 'INSIDE') {
          inside++;
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 0) paintedInside++;
        }
      }
    }

    const pct = inside ? (paintedInside / inside) * 100 : 0;
    // one decimal for nicer UX (e.g., 37.4%)
    setCoverage(Number(pct.toFixed(1)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isFinished || !paintCtxRef.current || !shape || !brushColor) return;
    e.preventDefault();
    startTimer();
    setIsDrawing(true);
    lastZoneRef.current = null;

    const point = getCanvasPos(e);
    const zone = ZoneUtils.getZoneForPoint(point, shape);
    handleZoneTransition(zone);

    if (zone === 'INSIDE') {
      drawDot(point, brushColor);
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isFinished || !shape || !brushColor) return;
    e.preventDefault();

    const pctx = paintCtxRef.current;
    if (!pctx) return;

    const point = getCanvasPos(e);
    const zone = ZoneUtils.getZoneForPoint(point, shape);
    handleZoneTransition(zone);

    if (zone === 'INSIDE') {
      pctx.save();
      pctx.globalCompositeOperation = 'source-over';
      pctx.lineWidth = brushSize;
      pctx.lineCap = 'round';
      pctx.strokeStyle = brushColor;
      pctx.beginPath();
      pctx.moveTo(point.x, point.y);
      pctx.lineTo(point.x + 0.001, point.y + 0.001);
      pctx.stroke();
      pctx.restore();

      // tiny dot ensures continuous strokes even for minimal movement
      drawDot(point, brushColor);
    }

    // Refresh visible canvas
    if (ctx && shape) {
      CanvasUtils.clearCanvas(ctx, canvasSize.width, canvasSize.height);
      ctx.drawImage(paintCanvasRef.current!, 0, 0);
      CanvasUtils.drawShapeOutline(ctx, shape);
    }
  };

  const endStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    if (e) e.currentTarget.releasePointerCapture?.(e.pointerId);
    computeCoverage();
    // re-draw to ensure outline is on top after stroke ends
    if (ctx && shape) {
      CanvasUtils.clearCanvas(ctx, canvasSize.width, canvasSize.height);
      ctx.drawImage(paintCanvasRef.current!, 0, 0);
      CanvasUtils.drawShapeOutline(ctx, shape);
    }
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
    // clear paint layer whenever shape changes
    if (paintCtxRef.current) {
      paintCtxRef.current.clearRect(0, 0, canvasSize.width, canvasSize.height);
    }
    resetStats();
  };

  const resetCanvas = () => {
    if (paintCtxRef.current) {
      paintCtxRef.current.clearRect(0, 0, canvasSize.width, canvasSize.height);
    }
    if (ctx && shape) {
      CanvasUtils.clearCanvas(ctx, canvasSize.width, canvasSize.height);
      CanvasUtils.drawShapeOutline(ctx, shape);
    }
    resetStats();
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
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">
          🎨 Shape Painting Task
        </h1>

        {!brushColor && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm">
            👆 Pick a color to start painting inside the shape!
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div className="text-lg font-semibold">
            Shape: <span className="text-blue-600">{currentShape?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={nextShape}
              className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
            >
              Next Shape
            </button>
            <button
              onClick={randomShape}
              className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
            >
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
                    <option key={s.id} value={i}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetCanvas}
              className="px-4 py-2 h-10 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              ♻ Reset
            </button>
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border-2 border-gray-300 rounded-lg shadow-sm bg-white touch-none"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              maxWidth: '100%',
              touchAction: 'none',
              cursor: brushColor ? 'crosshair' : 'default',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard label="≤10mm movements" value={nearCount} />
          <MetricCard label="&gt;10mm movements" value={farCount} />
          <MetricCard label="Coverage" value={`${coverage}%`} />
          <MetricCard label="Time elapsed" value={`${timeElapsed}s`} />
        </div>

        {isFinished && (
          <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
            <h3 className="font-bold text-lg mb-2">🎉 Time&apos;s Up! Final Results:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Coverage: <span className="font-bold">{coverage}%</span></div>
              <div>≤10mm movements: <span className="font-bold">{nearCount}</span></div>
              <div>&gt;10mm movements: <span className="font-bold">{farCount}</span></div>
              <div>Total outside movements: <span className="font-bold">{nearCount + farCount}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

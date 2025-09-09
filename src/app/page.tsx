"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

/** ---------- Types ---------- */
type Pt = { x: number; y: number };
type ShapeRect = { id: string; name: string; type: "rect"; x: number; y: number; width: number; height: number };
type ShapeCircle = { id: string; name: string; type: "circle"; cx: number; cy: number; r: number };
type ShapePoly = { id: string; name: string; type: "polygon"; points: number[][] };
type Shape = ShapeRect | ShapeCircle | ShapePoly;

type Zone = "INSIDE" | "OUTSIDE_NEAR" | "OUTSIDE_FAR";

// Fallback shapes if JSON loading fails
const FALLBACK_SHAPES: Shape[] = [
  { id: "triangle", name: "Triangle", type: "polygon", points: [[350, 60], [130, 460], [570, 460]] },
  { id: "rectangle", name: "Rectangle", type: "rect", x: 160, y: 140, width: 380, height: 260 },
  { id: "circle", name: "Circle", type: "circle", cx: 350, cy: 250, r: 180 },
  { id: "kite", name: "Kite", type: "polygon", points: [[350, 70], [170, 260], [350, 450], [530, 260]] }
];

export default function PaintCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 500 });

  // shapes data
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [shape, setShape] = useState<Shape | null>(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [shapesLoaded, setShapesLoaded] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState<string>("");
  const [brushSize, setBrushSize] = useState<number>(12);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [started, setStarted] = useState(false);

  const [outlineCrossings, setOutlineCrossings] = useState(0);
  const [nearCount, setNearCount] = useState(0);
  const [farCount, setFarCount] = useState(0);
  const [coverage, setCoverage] = useState(0);

  const lastZoneRef = useRef<Zone | null>(null);

  // Load shapes from JSON
  useEffect(() => {
    const loadShapes = async () => {
      try {
        const response = await fetch("/shapes.json");
        if (response.ok) {
          const loadedShapes: Shape[] = await response.json();
          setShapes(loadedShapes);
          setShapesLoaded(true);
        } else {
          throw new Error("Failed to load shapes.json");
        }
      } catch (error) {
        console.warn("Could not load shapes.json, using fallback shapes:", error);
        setShapes(FALLBACK_SHAPES);
        setShapesLoaded(true);
      }
    };
    loadShapes();
  }, []);

  // Responsive canvas sizing
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32; // padding
    const maxWidth = Math.min(700, containerWidth);
    const aspectRatio = 500 / 700;
    const height = Math.round(maxWidth * aspectRatio);
    setCanvasSize({ width: Math.round(maxWidth), height });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  // Scale shapes based on canvas size
  const scaleShape = useCallback(
    (originalShape: Shape): Shape => {
      const scaleX = canvasSize.width / 700;
      const scaleY = canvasSize.height / 500;

      if (originalShape.type === "rect") {
        return {
          ...originalShape,
          x: originalShape.x * scaleX,
          y: originalShape.y * scaleY,
          width: originalShape.width * scaleX,
          height: originalShape.height * scaleY
        };
      }

      if (originalShape.type === "circle") {
        return {
          ...originalShape,
          cx: originalShape.cx * scaleX,
          cy: originalShape.cy * scaleY,
          r: originalShape.r * Math.min(scaleX, scaleY)
        };
      }

      // polygon
      return {
        ...originalShape,
        points: originalShape.points.map(([x, y]) => [x * scaleX, y * scaleY])
      };
    },
    [canvasSize]
  );

  // Initialize with random shape when shapes are loaded
  useEffect(() => {
    if (!shapesLoaded || shapes.length === 0) return;
    const randomIndex = Math.floor(Math.random() * shapes.length);
    setCurrentShapeIndex(randomIndex);
    const scaledShape = scaleShape(shapes[randomIndex]);
    setShape(scaledShape);
  }, [shapesLoaded, shapes, scaleShape]);

  // Update shape when canvas size changes
  useEffect(() => {
    if (!shapesLoaded || currentShapeIndex >= shapes.length || currentShapeIndex < 0) return;
    const scaledShape = scaleShape(shapes[currentShapeIndex]);
    setShape(scaledShape);
  }, [canvasSize, currentShapeIndex, scaleShape, shapesLoaded, shapes]);

  /** ---------- Init canvas ---------- */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    // 2D context with read-optimization for getImageData
    const context = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;
    if (!context) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);

    // Set backing store size in device pixels
    c.width = Math.floor(canvasSize.width * dpr);
    c.height = Math.floor(canvasSize.height * dpr);

    // Set displayed size in CSS pixels
    c.style.width = `${canvasSize.width}px`;
    c.style.height = `${canvasSize.height}px`;

    // Map 1 unit to 1 CSS pixel
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    // White background
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    context.restore();

    setCtx(context);
  }, [canvasSize]);

  /** ---------- Geometry helpers ---------- */
  function pointInPolygon(p: Pt, polygon: number[][]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect = (yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInShape(p: Pt, s: Shape) {
    if (s.type === "rect") return p.x >= s.x && p.x <= s.x + s.width && p.y >= s.y && p.y <= s.y + s.height;
    if (s.type === "circle") {
      const dx = p.x - s.cx,
        dy = p.y - s.cy;
      return dx * dx + dy * dy <= s.r * s.r;
    }
    return pointInPolygon(p, s.points);
  }

  function distanceToShapeOutline(p: Pt, s: Shape): number {
    if (s.type === "rect") {
      const { x, y, width, height } = s;
      const dx = Math.max(0, Math.max(x - p.x, p.x - (x + width)));
      const dy = Math.max(0, Math.max(y - p.y, p.y - (y + height)));
      return Math.sqrt(dx * dx + dy * dy);
    }

    if (s.type === "circle") {
      const dx = p.x - s.cx;
      const dy = p.y - s.cy;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      return Math.abs(distToCenter - s.r);
    }

    // polygon
    let minDist = Infinity;
    const points = s.points;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const [x1, y1] = points[i];
      const [x2, y2] = points[j];

      const A = p.x - x1;
      const B = p.y - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = p.x - xx;
      const dy = p.y - yy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }
    return minDist;
  }

  /** ---------- Zone + colors ---------- */
  function getZoneForPoint(p: Pt): Zone {
    if (!shape) return "OUTSIDE_FAR";

    if (pointInShape(p, shape)) {
      return "INSIDE";
    }

    // Convert pixels to mm (assuming ~96 DPI)
    const pixelsPerMm = 3.78;
    const distanceInPixels = distanceToShapeOutline(p, shape);
    const distanceInMm = distanceInPixels / pixelsPerMm;

    return distanceInMm <= 10 ? "OUTSIDE_NEAR" : "OUTSIDE_FAR";
  }

  function colorForZone(zone: Zone) {
    if (zone === "OUTSIDE_NEAR") return "#fca5a5"; // Light red
    if (zone === "OUTSIDE_FAR") return "#ff0000"; // Red
    return brushColor || "transparent"; // User's color for inside
  }

  function handleZoneTransition(newZone: Zone) {
    const prev = lastZoneRef.current;
    if (prev === newZone) return;

    if (newZone === "OUTSIDE_NEAR") setNearCount((n) => n + 1);
    if (newZone === "OUTSIDE_FAR") setFarCount((n) => n + 1);
    if (prev === "INSIDE" && (newZone === "OUTSIDE_NEAR" || newZone === "OUTSIDE_FAR")) {
      setOutlineCrossings((n) => n + 1);
    }
    lastZoneRef.current = newZone;
  }

  /** ---------- Drawing helpers ---------- */
  const traceShapePath = useCallback((s: Shape, c: CanvasRenderingContext2D) => {
    c.beginPath();
    if (s.type === "rect") {
      c.rect(s.x, s.y, s.width, s.height);
    } else if (s.type === "circle") {
      c.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
    } else {
      const pts = s.points;
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath();
    }
  }, []);

  // High-contrast outline that remains visible on any background/DPR.
  const drawShapeOutline = useCallback(
    (s: Shape) => {
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      // Outer light stroke (acts like a halo)
      traceShapePath(s, ctx);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Inner dark stroke
      traceShapePath(s, ctx);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#111111";
      ctx.stroke();

      ctx.restore();
    },
    [ctx, traceShapePath]
  );

  const clearCanvas = useCallback(() => {
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.restore();
  }, [ctx, canvasSize]);

  const redrawAll = useCallback(() => {
    if (!shape) return;
    clearCanvas();
    drawShapeOutline(shape);
  }, [shape, clearCanvas, drawShapeOutline]);

  /** ---------- Redraw when context/shape changes ---------- */
  useEffect(() => {
    if (!ctx || !shape) return;
    // draw after layout to avoid race conditions
    requestAnimationFrame(() => redrawAll());
  }, [ctx, shape, redrawAll]);

  function drawPointerDot(p: Pt, color: string) {
    if (!ctx) return;
    const radius = Math.max(2, Math.round(brushSize / 2));
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function computeCoverage() {
    if (!ctx || !shape) return;
    const img = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
    const data = img.data;
    let inShape = 0,
      painted = 0;

    // sample every 2px for speed
    for (let y = 0; y < canvasSize.height; y += 2) {
      for (let x = 0; x < canvasSize.width; x += 2) {
        const idx = (y * canvasSize.width + x) * 4;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2],
          a = data[idx + 3];

        // any non-white, non-transparent pixel counts as paint
        const isPaint = a > 0 && !(r > 245 && g > 245 && b > 245);
        const p = { x, y };
        if (pointInShape(p, shape)) {
          inShape++;
          if (isPaint) painted++;
        }
      }
    }
    const percent = Math.round((painted / Math.max(1, inShape)) * 100);
    setCoverage(Math.min(100, percent));
  }

  /** ---------- Timer ---------- */
  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [started, timeLeft]);

  /** ---------- Pointer handlers ---------- */
  const getCanvasPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (timeLeft <= 0 || !ctx) return;
    e.preventDefault();
    setStarted(true);
    setIsDrawing(true);
    lastZoneRef.current = null;

    const p = getCanvasPos(e);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.restore();

    const z = getZoneForPoint(p);
    handleZoneTransition(z);
    const col = colorForZone(z);
    if (col !== "transparent") drawPointerDot(p, col);

    try {
      (e.target as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || timeLeft <= 0) return;
    e.preventDefault();
    const p = getCanvasPos(e);
    const z = getZoneForPoint(p);
    handleZoneTransition(z);
    const col = colorForZone(z);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = col;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.restore();

    if (col !== "transparent") drawPointerDot(p, col);
  };

  const onPointerUp = (e?: ReactPointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    ctx?.closePath();
    if (e) {
      try {
        (e.target as Element & { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
    if (shape) computeCoverage();

    // ensure outline stays visible on top after paint
    redrawAll();
  };

  /** ---------- UI ---------- */
  const prominentColors: { color: string; name: string }[] = [
    { color: "#ffff00", name: "Yellow" },
    { color: "#0000ff", name: "Blue" },
    { color: "#ff69b4", name: "Pink" },
    { color: "#00ff00", name: "Green" }
  ];

  const otherColors: { color: string; name: string }[] = [
    { color: "#ffffff", name: "White" },
    { color: "#000000", name: "Black" },
    { color: "#ff0090", name: "Magenta" },
    { color: "#ff0000", name: "Red" },
    { color: "#00ffff", name: "Cyan" },
    { color: "#ff7700", name: "Orange" },
    { color: "#999999", name: "Gray" },
    { color: "#333333", name: "Charcoal" },
    { color: "#ff66cc", name: "Hot Pink" },
    { color: "#cc0000", name: "Crimson" },
    { color: "#00cc66", name: "Emerald" },
    { color: "#0066ff", name: "Azure" },
    { color: "#cc9900", name: "Mustard" },
    { color: "#9933ff", name: "Purple" },
    { color: "#66ffff", name: "Light Cyan" },
    { color: "#ff4444", name: "Coral" }
  ];

  // Show loading state
  if (!shapesLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading shapes...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">🎨 Painting Task</h2>

        {!brushColor && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm">
            👆 Pick a color to start painting inside the shape!
          </div>
        )}

        {/* Shape and timer info */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div className="text-lg font-semibold">
            Shape: <span className="text-blue-600">{shape?.name || "—"}</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`text-xl font-bold px-4 py-2 rounded-lg ${
                timeLeft <= 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              ⏰ {timeLeft}s
            </div>
          </div>
        </div>

        {/* Quick colors - mobile friendly */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Quick colors:</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {prominentColors.map((c) => (
              <button
                key={c.color}
                onClick={() => setBrushColor(c.color)}
                title={c.name}
                className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform ${
                  brushColor === c.color ? "border-gray-800 border-4" : "border-gray-400"
                }`}
                style={{ backgroundColor: c.color }}
                aria-label={`select ${c.name}`}
              />
            ))}
          </div>
        </div>

        {/* Controls - responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="colorSelect" className="block text-sm font-medium text-gray-700 mb-1">
              More colors:
            </label>
            <select
              id="colorSelect"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>
                Pick a color…
              </option>
              <optgroup label="Quick Colors">
                {prominentColors.map((c) => (
                  <option key={c.color} value={c.color}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Colors">
                {otherColors.map((c) => (
                  <option key={c.color} value={c.color}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="brushSize" className="block text-sm font-medium text-gray-700 mb-1">
              Brush size: {brushSize}px
            </label>
            <input
              id="brushSize"
              type="range"
              min={6}
              max={20}
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border-2 border-gray-300 rounded-lg shadow-sm bg-white touch-none"
              style={{
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                maxWidth: "100%",
                touchAction: "none" // important for pen/touch devices
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            {/* Debug info */}
            {!shape && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-lg">
                <div className="text-gray-500 text-center">
                  <div>No shape loaded</div>
                  <div className="text-sm">
                    Canvas: {canvasSize.width}x{canvasSize.height}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend - responsive */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Legend:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <Legend color={brushColor || "#e5e7eb"} label="Inside shape (your color)" />
            <Legend color="#fca5a5" label="Outside ≤10mm (light red)" />
            <Legend color="#ff0000" label="Outside >10mm (red)" />
          </div>
        </div>

        {/* Metrics - responsive grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Metric label="Outline crossings" value={outlineCrossings} />
          <Metric label="Near crossings (≤10mm)" value={nearCount} />
          <Metric label="Far crossings (>10mm)" value={farCount} />
          <Metric label="Coverage" value={`${coverage}%`} />
          <Metric label="Time elapsed" value={`${60 - timeLeft}s`} />
        </div>
      </div>
    </div>
  );
}

/** ---------- UI helpers ---------- */
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded border border-gray-400 flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}

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

export default function PaintCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 500 });

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [shape, setShape] = useState<Shape | null>(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [shapesLoaded, setShapesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  /** ---------- Load shapes from public/shapes.json ONLY ---------- */
  useEffect(() => {
    let cancelled = false;
    const loadShapes = async () => {
      try {
        const res = await fetch("/shapes.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const loaded: Shape[] = await res.json();
        if (!cancelled) {
          setShapes(Array.isArray(loaded) ? loaded : []);
          setShapesLoaded(true);
          if (!Array.isArray(loaded) || loaded.length === 0) {
            setLoadError("No shapes found in /public/shapes.json");
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setShapes([]);
          setShapesLoaded(true);
          setLoadError("Failed to load /public/shapes.json");
          console.error("Shapes load error:", err);
        }
      }
    };
    loadShapes();
    return () => {
      cancelled = true;
    };
  }, []);

  /** ---------- Responsive canvas sizing ---------- */
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32; // padding
    const maxWidth = Math.min(700, Math.max(300, containerWidth));
    const aspectRatio = 500 / 700;
    const height = Math.round(maxWidth * aspectRatio);
    setCanvasSize({ width: Math.round(maxWidth), height });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  /** ---------- Scale shape to current canvas ---------- */
  const scaleShape = useCallback(
    (original: Shape): Shape => {
      const scaleX = canvasSize.width / 700;
      const scaleY = canvasSize.height / 500;
      if (original.type === "rect") {
        return {
          ...original,
          x: original.x * scaleX,
          y: original.y * scaleY,
          width: original.width * scaleX,
          height: original.height * scaleY,
        };
      }
      if (original.type === "circle") {
        return {
          ...original,
          cx: original.cx * scaleX,
          cy: original.cy * scaleY,
          r: original.r * Math.min(scaleX, scaleY),
        };
      }
      return {
        ...original,
        points: original.points.map(([x, y]) => [x * scaleX, y * scaleY]),
      };
    },
    [canvasSize]
  );

  /** ---------- Pick initial shape when shapes load ---------- */
  useEffect(() => {
    if (!shapesLoaded || shapes.length === 0) return;
    const idx = Math.floor(Math.random() * shapes.length);
    setCurrentShapeIndex(idx);
    setShape(scaleShape(shapes[idx]));
  }, [shapesLoaded, shapes, scaleShape]);

  /** ---------- Rerender scaled shape on size change ---------- */
  useEffect(() => {
    if (!shapesLoaded || currentShapeIndex < 0 || currentShapeIndex >= shapes.length) return;
    setShape(scaleShape(shapes[currentShapeIndex]));
  }, [canvasSize, currentShapeIndex, scaleShape, shapesLoaded, shapes]);

  /** ---------- Init canvas ---------- */
  const paintBackground = useCallback(
    (c: CanvasRenderingContext2D) => {
      c.save();
      c.globalCompositeOperation = "source-over";
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, canvasSize.width, canvasSize.height);
      c.restore();
    },
    [canvasSize]
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const context = c.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    c.width = Math.floor(canvasSize.width * dpr);
    c.height = Math.floor(canvasSize.height * dpr);
    c.style.width = `${canvasSize.width}px`;
    c.style.height = `${canvasSize.height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    paintBackground(context);
    setCtx(context);
  }, [canvasSize, paintBackground]);

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
    if (s.type === "rect")
      return p.x >= s.x && p.x <= s.x + s.width && p.y >= s.y && p.y <= s.y + s.height;
    if (s.type === "circle") {
      const dx = p.x - s.cx, dy = p.y - s.cy;
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
    let minDist = Infinity;
    const pts = s.points;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[j];
      const A = p.x - x1, B = p.y - y1, C = x2 - x1, D = y2 - y1;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      let xx, yy;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }
      const dx = p.x - xx, dy = p.y - yy;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }
    return minDist;
  }

  /** ---------- Zone + colors ---------- */
  function getZoneForPoint(p: Pt): Zone {
    if (!shape) return "OUTSIDE_FAR";
    if (pointInShape(p, shape)) return "INSIDE";
    const pixelsPerMm = 3.78;
    const distanceInMm = distanceToShapeOutline(p, shape) / pixelsPerMm;
    return distanceInMm <= 10 ? "OUTSIDE_NEAR" : "OUTSIDE_FAR";
  }

  function colorForZone(zone: Zone) {
    if (zone === "OUTSIDE_NEAR") return "#fca5a5";
    if (zone === "OUTSIDE_FAR") return "#ff0000";
    return brushColor || "transparent";
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
      if (pts.length > 0) {
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
        c.closePath();
      }
    }
  }, []);

  const drawShapeOutline = useCallback(
    (s: Shape) => {
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      // Halo
      traceShapePath(s, ctx);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Inner stroke
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
    paintBackground(ctx);
  }, [ctx, paintBackground]);

  const redrawOutline = useCallback(() => {
    if (!ctx || !shape) return;
    drawShapeOutline(shape);
  }, [ctx, shape, drawShapeOutline]);

  /** Keep outline visible when ctx/shape appear */
  useEffect(() => {
    if (!ctx || !shape) return;
    clearCanvas();
    redrawOutline();
  }, [ctx, shape, clearCanvas, redrawOutline]);

  function drawPointerDot(p: Pt, color: string) {
    if (!ctx || color === "transparent") return;
    const r = Math.max(2, Math.round(brushSize / 2));
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function computeCoverage() {
    if (!ctx || !shape) return;
    const img = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
    const data = img.data;
    let inShape = 0, painted = 0;
    for (let y = 0; y < canvasSize.height; y += 2) {
      for (let x = 0; x < canvasSize.width; x += 2) {
        const idx = (y * canvasSize.width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        const isPaint = a > 0 && !(r > 245 && g > 245 && b > 245); // not white bg
        const p = { x, y };
        if (pointInShape(p, shape)) {
          inShape++;
          if (isPaint) painted++;
        }
      }
    }
    setCoverage(Math.min(100, Math.round((painted / Math.max(1, inShape)) * 100)));
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
    if (timeLeft <= 0 || !ctx || !shape) return; // block drawing when no shape
    e.preventDefault();
    setStarted(true);
    setIsDrawing(true);
    lastZoneRef.current = null;

    const p = getCanvasPos(e);
    const z = getZoneForPoint(p);
    handleZoneTransition(z);
    const col = colorForZone(z);
    drawPointerDot(p, col);

    (e.target as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
    redrawOutline(); // keep outline visible
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || timeLeft <= 0 || !shape) return;
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
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.001, p.y + 0.001); // micro-segment for continuous dots
    ctx.stroke();
    ctx.closePath();
    ctx.restore();

    drawPointerDot(p, col);
    redrawOutline(); // keep outline on top after each move
  };

  const endStroke = (e?: ReactPointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    if (e) (e.target as Element & { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(e.pointerId);
    if (shape) computeCoverage();
    redrawOutline();
  };

  /** ---------- Shape controls (no page refresh needed) ---------- */
  const resetStats = useCallback(() => {
    setOutlineCrossings(0);
    setNearCount(0);
    setFarCount(0);
    setCoverage(0);
    setTimeLeft(60);
    setStarted(false);
    lastZoneRef.current = null;
  }, []);

  const applyShapeIndex = useCallback(
    (idx: number) => {
      if (!shapesLoaded || shapes.length === 0) return;
      const bounded = ((idx % shapes.length) + shapes.length) % shapes.length;
      setCurrentShapeIndex(bounded);
      const s = scaleShape(shapes[bounded]);
      setShape(s);
      if (ctx) {
        clearCanvas();
        drawShapeOutline(s);
      }
      resetStats();
    },
    [shapesLoaded, shapes, scaleShape, ctx, clearCanvas, drawShapeOutline, resetStats]
  );

  const nextShape = () => applyShapeIndex(currentShapeIndex + 1);
  const prevShape = () => applyShapeIndex(currentShapeIndex - 1);
  const randomShape = () => applyShapeIndex(Math.floor(Math.random() * Math.max(1, shapes.length)));

  const resetCanvas = () => {
    if (!ctx || !shape) return;
    clearCanvas();
    drawShapeOutline(shape);
    resetStats();
  };

  /** Keyboard shortcut: N for next */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "n") nextShape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextShape]);

  /** ---------- UI colors ---------- */
  const prominentColors = [
    { color: "#ffff00", name: "Yellow" },
    { color: "#0000ff", name: "Blue" },
    { color: "#ff69b4", name: "Pink" },
    { color: "#00ff00", name: "Green" },
  ];
  const otherColors = [
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
    { color: "#ff4444", name: "Coral" },
  ];

  if (!shapesLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading shapes...</div>
        </div>
      </div>
    );
  }

  if (shapesLoaded && shapes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md text-center bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No shapes available</h2>
          <p className="text-sm text-gray-600">
            {loadError ?? "Add a valid shapes.json under /public to begin."}
          </p>
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

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <div className="text-lg font-semibold">
            Shape: <span className="text-blue-600">{shape?.name || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevShape}
              className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
              title="Previous shape"
            >
              ◀ Prev
            </button>
            <button
              onClick={nextShape}
              className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
              title="Next shape (N)"
            >
              Next ▶
            </button>
            <button
              onClick={randomShape}
              className="px-3 py-1.5 text-sm rounded-md border bg-gray-50 hover:bg-gray-100"
              title="Random shape"
            >
              🎲 Random
            </button>
            <div className={`text-xl font-bold px-4 py-2 rounded-lg ${timeLeft <= 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              ⏰ {timeLeft}s
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Quick colors:</div>
              <div className="flex flex-wrap gap-2">
                {prominentColors.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setBrushColor(c.color)}
                    title={c.name}
                    className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform ${brushColor === c.color ? "border-gray-800 border-4" : "border-gray-400"}`}
                    style={{ backgroundColor: c.color }}
                    aria-label={`select ${c.name}`}
                  />
                ))}
              </div>
            </div>

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

            <div>
              <label htmlFor="shapeSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Choose shape:
              </label>
              <select
                id="shapeSelect"
                value={currentShapeIndex}
                onChange={(e) => applyShapeIndex(parseInt(e.target.value, 10))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {shapes.map((s, i) => (
                  <option key={s.id ?? `${s.type}-${i}`} value={i}>
                    {s.name ?? `${s.type} ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetCanvas}
              className="px-4 py-2 h-10 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              title="Clear the canvas and restart timer"
            >
              ♻ Reset Canvas
            </button>
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border-2 border-gray-300 rounded-lg shadow-sm bg-white touch-none"
              style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, maxWidth: "100%", touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={endStroke}
            />
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

        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Legend:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <Legend color={brushColor || "#e5e7eb"} label="Inside shape (your color)" />
            <Legend color="#fca5a5" label="Outside ≤10mm (light red)" />
            <Legend color="#ff0000" label="Outside >10mm (red)" />
          </div>
        </div>

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

/** ---------- UI bits ---------- */
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

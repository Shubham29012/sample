"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

/** ---------- Types ---------- */
type Pt = { x: number; y: number };
type ShapeRect = { id: string; name: string; type: "rect"; x: number; y: number; width: number; height: number };
type ShapeCircle = { id: string; name: string; type: "circle"; cx: number; cy: number; r: number };
type ShapePoly = { id: string; name: string; type: "polygon"; points: number[][] };
type Shape = ShapeRect | ShapeCircle | ShapePoly;

type Zone = "INSIDE" | "ABOVE_10" | "BELOW_10"; // ⬅️ no orange band

const CANVAS_W = 700;
const CANVAS_H = 500;

export default function PaintCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  // shapes from /public/shapes.json
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [shape, setShape] = useState<Shape | null>(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const [loadingShapes, setLoadingShapes] = useState(true);
  const [shapesError, setShapesError] = useState<string | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  // No default inside color until user picks one
  const [brushColor, setBrushColor] = useState<string>("");
  const [brushSize, setBrushSize] = useState<number>(12);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [started, setStarted] = useState(false);

  const [outlineCrossings, setOutlineCrossings] = useState(0);
  const [above10Count, setAbove10Count] = useState(0); // below shape
  const [below10Count, setBelow10Count] = useState(0); // above shape (per your mapping)

  const [coverage, setCoverage] = useState(0);

  const lastZoneRef = useRef<Zone | null>(null);

  /** ---------- Load shapes from /public/shapes.json ---------- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingShapes(true);
        setShapesError(null);
        const res = await fetch("/shapes.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch shapes.json (${res.status})`);
        const data = (await res.json()) as Shape[];
        setShapes(data);
        setShape(data[0] ?? null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setShapesError(message || "Failed to load shapes.json");
      } finally {
        setLoadingShapes(false);
      }
    })();
  }, []);

  /** ---------- Init canvas ---------- */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    c.width = CANVAS_W * dpr;
    c.height = CANVAS_H * dpr;
    c.style.width = `${CANVAS_W}px`;
    c.style.height = `${CANVAS_H}px`;
    const context = c.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, CANVAS_W, CANVAS_H);
    setCtx(context);
  }, []);

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
      const dx = p.x - s.cx, dy = p.y - s.cy;
      return dx * dx + dy * dy <= s.r * s.r;
    }
    return pointInPolygon(p, s.points);
  }

  function getShapeBBox(s: Shape) {
    if (s.type === "rect") return { left: s.x, right: s.x + s.width, top: s.y, bottom: s.y + s.height };
    if (s.type === "circle") return { left: s.cx - s.r, right: s.cx + s.r, top: s.cy - s.r, bottom: s.cy + s.r };
    const xs = s.points.map((p) => p[0]), ys = s.points.map((p) => p[1]);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }

  /** ---------- Zone + colors (no band) ---------- */
  // Per your mapping:
  // - "BELOW_10" means ABOVE the outline (y smaller -> towards top) -> light red
  // - "ABOVE_10" means BELOW the outline (y larger -> towards bottom) -> red
  function getZoneForPoint(p: Pt): Zone {
    if (!shape) return "ABOVE_10";
    if (pointInShape(p, shape)) return "INSIDE";
    const bbox = getShapeBBox(shape);
    const centerY = (bbox.top + bbox.bottom) / 2;
    return p.y < centerY ? "BELOW_10" : "ABOVE_10";
  }

  function colorForZone(zone: Zone) {
    if (zone === "ABOVE_10") return "#ff0000";  // below the shape -> red
    if (zone === "BELOW_10") return "#fca5a5";  // above the shape -> light red
    return brushColor || "transparent";         // inside uses user color (none if not chosen)
  }

  function handleZoneTransition(newZone: Zone) {
    const prev = lastZoneRef.current;
    if (prev === newZone) return;
    if (newZone === "ABOVE_10") setAbove10Count((n) => n + 1);
    if (newZone === "BELOW_10") setBelow10Count((n) => n + 1);
    if (prev === "INSIDE" && newZone !== "INSIDE") setOutlineCrossings((n) => n + 1);
    lastZoneRef.current = newZone;
  }

  /** ---------- Drawing helpers (memoized) ---------- */
  const clearCanvas = useCallback(() => {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }, [ctx]);

  const drawShapeOutline = useCallback((s: Shape, strokeStyle = "#111", lineWidth = 3) => {
    if (!ctx) return;
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    if (s.type === "rect") {
      ctx.rect(s.x, s.y, s.width, s.height);
    } else if (s.type === "circle") {
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
    } else {
      const pts = s.points;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }, [ctx]);

  const redrawAll = useCallback(() => {
    if (!shape) return;
    clearCanvas();
    drawShapeOutline(shape, "#111", 3);
  }, [shape, clearCanvas, drawShapeOutline]);

  /** ---------- Redraw when context/shape changes ---------- */
  useEffect(() => {
    if (!ctx || !shape) return;
    redrawAll();
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
    const img = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = img.data;
    let inShape = 0, painted = 0;
    for (let y = 0; y < CANVAS_H; y += 2) {
      for (let x = 0; x < CANVAS_W; x += 2) {
        const idx = (y * CANVAS_W + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
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
    setStarted(true);
    setIsDrawing(true);
    lastZoneRef.current = null;
    const p = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
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
    const p = getCanvasPos(e);
    const z = getZoneForPoint(p);
    handleZoneTransition(z);
    const col = colorForZone(z);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = col;
    ctx.lineTo(p.x, p.y);
    ctx.stroke(); // transparent => no visible stroke (inside without a chosen color)
    if (col !== "transparent") drawPointerDot(p, col);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
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
  };

  /** ---------- Controls ---------- */
  const reset = () => {
    setOutlineCrossings(0);
    setAbove10Count(0);
    setBelow10Count(0);
    setCoverage(0);
    setTimeLeft(60);
    setStarted(false);
    lastZoneRef.current = null;
    redrawAll();
  };

  const nextShape = () => {
    if (!shapes.length) return;
    const nextIndex = (currentShapeIndex + 1) % shapes.length;
    setCurrentShapeIndex(nextIndex);
    setShape(shapes[nextIndex]);
    reset();
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

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, Arial, sans-serif" }}>
      <h2 style={{ marginBottom: 8 }}>Painting Task</h2>

      {loadingShapes && <div>Loading shapes…</div>}
      {shapesError && <div style={{ color: "crimson" }}>Error: {shapesError}</div>}
      {!brushColor && (
        <div style={{ margin: "6px 0", fontSize: 13, color: "#6b7280" }}>
          Pick a color to start painting inside the shape.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <div><strong>Shape:</strong>&nbsp; {shape ? shape.name : "—"}</div>

        {/* Quick colors */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span>Quick colors:</span>
          <div style={{ display: "flex", gap: 4 }}>
            {prominentColors.map((c) => (
              <button
                key={c.color}
                onClick={() => setBrushColor(c.color)}
                title={c.name}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: brushColor === c.color ? "3px solid #111" : "2px solid #aaa",
                  background: c.color, cursor: "pointer"
                }}
                aria-label={`select ${c.name}`}
              />
            ))}
          </div>
        </div>

        {/* Color dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>More colors:</span>
          <select
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            style={{ padding: "4px 8px", cursor: "pointer", minWidth: "160px" }}
          >
            <option value="" disabled>Pick a color…</option>
            <optgroup label="Quick Colors">
              {prominentColors.map((c) => (
                <option key={c.color} value={c.color}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="Other Colors">
              {otherColors.map((c) => (
                <option key={c.color} value={c.color}>{c.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Brush size */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="brushSize" style={{ fontSize: 13 }}>Size:</label>
          <input
            id="brushSize"
            type="range"
            min={6}
            max={16}
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
          />
          <div style={{ minWidth: 32, textAlign: "right", fontWeight: 700 }}>{brushSize}px</div>
        </div>

        <button onClick={reset} style={{ padding: "6px 10px", cursor: "pointer" }}>Reset</button>
        <button onClick={nextShape} style={{ padding: "6px 10px", cursor: "pointer" }}>Next Shape</button>
        <div style={{ fontWeight: 700 }}>Time left: {timeLeft}s</div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: CANVAS_W, height: CANVAS_H, border: "1px solid #111", touchAction: "none", display: "block", background: "#fff" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
        <Legend color={brushColor || "transparent"} label="Inside shape (user color)" />
        <Legend color="#ff0000" label="Below the outline (red)" />
        <Legend color="#fca5a5" label="Above the outline (light red)" />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(150px, 1fr))", gap: 10 }}>
        <Metric label="Outline crossings (inside → outside)" value={outlineCrossings} />
        <Metric label="Below outline crossings (red)" value={above10Count} />
        <Metric label="Above outline crossings (light red)" value={below10Count} />
        <Metric label="Coverage inside shape" value={`${coverage}%`} />
        <Metric label="Time elapsed" value={`${60 - timeLeft}s`} />
      </div>
    </div>
  );
}

/** ---------- Small UI helpers ---------- */
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 18, height: 18, background: color || "#ffffff", borderRadius: 4, border: "1px solid #111" }} />
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ padding: 8, border: "1px solid #e6edf3", borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

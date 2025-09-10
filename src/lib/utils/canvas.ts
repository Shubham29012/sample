import { Shape } from '@/types';
import { GeometryUtils } from './geometry';

export const CanvasUtils = {
  setupCanvas(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): CanvasRenderingContext2D | null {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale the drawing operations so we can keep using CSS pixel coords.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return ctx;
  },

  clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },

  drawShapeOutline(ctx: CanvasRenderingContext2D, shape: Shape): void {
    const tracePath = (s: Shape) => {
      ctx.beginPath();
      if (s.type === 'rect') {
        ctx.rect(s.x, s.y, s.width, s.height);
      } else if (s.type === 'circle') {
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      } else {
        const pts = s.points;
        if (pts.length > 0) {
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.closePath();
        }
      }
    };

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // White halo
    tracePath(shape);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Black outline
    tracePath(shape);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111111';
    ctx.stroke();

    ctx.restore();
  },

  computeCoverage(
    ctx: CanvasRenderingContext2D,
    shape: Shape,
    width: number,
    height: number
  ): number {
    // Read pixels across the entire canvas area that corresponds to CSS width/height.
    // Because we set a DPR transform for drawing, getImageData should use the same CSS-size region.
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;

    let inShape = 0;
    let painted = 0;

    // Sample every 2px for speed.
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Consider any non-(nearly) white pixel with alpha as "paint".
        const isPaint = a > 0 && !(r > 245 && g > 245 && b > 245);
        const point = { x, y };

        if (GeometryUtils.pointInShape(point, shape)) {
          inShape++;
          if (isPaint) painted++;
        }
      }
    }

    // ✅ Fixed: removed the extra ')'
    return Math.min(100, Math.round((painted / Math.max(1, inShape)) * 100));
  },
};

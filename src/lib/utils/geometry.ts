import { Point, Shape } from '@/types';

export const GeometryUtils = {
  pointInPolygon(point: Point, polygon: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect = (yi > point.y) !== (yj > point.y) && 
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  },

  pointInShape(point: Point, shape: Shape): boolean {
    if (shape.type === "rect") {
      return point.x >= shape.x && point.x <= shape.x + shape.width && 
             point.y >= shape.y && point.y <= shape.y + shape.height;
    }
    if (shape.type === "circle") {
      const dx = point.x - shape.cx;
      const dy = point.y - shape.cy;
      return dx * dx + dy * dy <= shape.r * shape.r;
    }
    return this.pointInPolygon(point, shape.points);
  },

  distanceToShapeOutline(point: Point, shape: Shape): number {
    if (shape.type === "rect") {
      const { x, y, width, height } = shape;
      const dx = Math.max(0, Math.max(x - point.x, point.x - (x + width)));
      const dy = Math.max(0, Math.max(y - point.y, point.y - (y + height)));
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    if (shape.type === "circle") {
      const dx = point.x - shape.cx;
      const dy = point.y - shape.cy;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);
      return Math.abs(distToCenter - shape.r);
    }
    
    let minDist = Infinity;
    const pts = shape.points;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[j];
      const A = point.x - x1, B = point.y - y1, C = x2 - x1, D = y2 - y1;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      
      let xx, yy;
      if (param < 0) { xx = x1; yy = y1; }
      else if (param > 1) { xx = x2; yy = y2; }
      else { xx = x1 + param * C; yy = y1 + param * D; }
      
      const dx = point.x - xx, dy = point.y - yy;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }
    return minDist;
  }
};
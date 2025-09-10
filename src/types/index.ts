export interface Point {
  x: number;
  y: number;
}

export interface ShapeRect {
  id: string;
  name: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeCircle {
  id: string;
  name: string;
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export interface ShapePolygon {
  id: string;
  name: string;
  type: "polygon";
  points: number[][];
}

export type Shape = ShapeRect | ShapeCircle | ShapePolygon;
export type Zone = "INSIDE" | "OUTSIDE_NEAR" | "OUTSIDE_FAR";

export interface PaintStats {
  nearCount: number;
  farCount: number;
  coverage: number;
  timeElapsed: number;
}

export interface Color {
  color: string;
  name: string;
}
import { Shape } from '@/types';

export const ShapeUtils = {
  scaleShape(shape: Shape, scaleX: number, scaleY: number): Shape {
    if (shape.type === "rect") {
      return {
        ...shape,
        x: shape.x * scaleX,
        y: shape.y * scaleY,
        width: shape.width * scaleX,
        height: shape.height * scaleY,
      };
    }
    if (shape.type === "circle") {
      return {
        ...shape,
        cx: shape.cx * scaleX,
        cy: shape.cy * scaleY,
        r: shape.r * Math.min(scaleX, scaleY),
      };
    }
    return {
      ...shape,
      points: shape.points.map(([x, y]) => [x * scaleX, y * scaleY]),
    };
  },

  getRandomShapeIndex(shapesLength: number): number {
    return Math.floor(Math.random() * shapesLength);
  }
};
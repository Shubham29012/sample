import { useState, useEffect } from 'react';
import { Shape } from '@/types';
import { ShapeUtils } from '@/lib/utils/shapes';

export const useShapes = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);

  useEffect(() => {
    const loadShapes = async () => {
      try {
        const response = await fetch('/shapes.json');
        if (!response.ok) throw new Error('Failed to load shapes');
        const data: Shape[] = await response.json();
        setShapes(data);
        setCurrentShapeIndex(ShapeUtils.getRandomShapeIndex(data.length));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadShapes();
  }, []);

  const changeShape = (index: number) => {
    setCurrentShapeIndex(index);
  };

  const nextShape = () => {
    changeShape((currentShapeIndex + 1) % shapes.length);
  };

  const randomShape = () => {
    changeShape(ShapeUtils.getRandomShapeIndex(shapes.length));
  };

  return {
    shapes,
    currentShape: shapes[currentShapeIndex] || null,
    currentShapeIndex,
    loading,
    error,
    changeShape,
    nextShape,
    randomShape,
  };
};
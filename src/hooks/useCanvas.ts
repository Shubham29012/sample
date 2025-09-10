import { useRef, useState, useEffect, useCallback } from 'react';
import { CANVAS_CONFIG } from '@/lib/constants';
import { CanvasUtils } from '@/lib/utils/canvas';

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ 
    width: CANVAS_CONFIG.DEFAULT_WIDTH, 
    height: CANVAS_CONFIG.DEFAULT_HEIGHT 
  });

  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32;
    const maxWidth = Math.min(CANVAS_CONFIG.DEFAULT_WIDTH, Math.max(CANVAS_CONFIG.MIN_WIDTH, containerWidth));
    const aspectRatio = CANVAS_CONFIG.DEFAULT_HEIGHT / CANVAS_CONFIG.DEFAULT_WIDTH;
    const height = Math.round(maxWidth * aspectRatio);
    setCanvasSize({ width: Math.round(maxWidth), height });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = CanvasUtils.setupCanvas(canvas, canvasSize.width, canvasSize.height);
    if (!context) return;

    CanvasUtils.clearCanvas(context, canvasSize.width, canvasSize.height);
    setCtx(context);
  }, [canvasSize]);

  return {
    canvasRef,
    containerRef,
    ctx,
    canvasSize,
  };
};
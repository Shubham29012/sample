import { useState, useCallback } from 'react';

interface MetricData {
  shapeId: string;
  nearCount: number;
  farCount: number;
  coverage: number;
  timeElapsed: number;
  brushColor?: string;
  brushSize?: number;
  totalStrokes?: number;
}

export const useMetrics = (sessionId: string | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMetrics = useCallback(async (data: MetricData) => {
    if (!sessionId) {
      setError('No active session');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save metrics');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error saving metrics:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return {
    saveMetrics,
    loading,
    error,
  };
};
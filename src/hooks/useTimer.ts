import { useState, useEffect } from 'react';
import { CANVAS_CONFIG } from '@/lib/constants';

export const useTimer = () => {
  const [timeLeft, setTimeLeft] = useState(CANVAS_CONFIG.TIMER_DURATION);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(v => v > 0 ? v - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  const startTimer = () => setStarted(true);
  const resetTimer = () => {
    setTimeLeft(CANVAS_CONFIG.TIMER_DURATION);
    setStarted(false);
  };

  return {
    timeLeft,
    started,
    isFinished: timeLeft === 0,
    timeElapsed: CANVAS_CONFIG.TIMER_DURATION - timeLeft,
    startTimer,
    resetTimer,
  };
};
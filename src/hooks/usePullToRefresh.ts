import { useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export const usePullToRefresh = ({ onRefresh, threshold = 60 }: UsePullToRefreshOptions) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    // Also check if the target element is scrolled to top
    const target = e.currentTarget as HTMLElement;
    const targetScrollTop = target.scrollTop || 0;
    
    if (scrollTop === 0 && targetScrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(100, currentY - startY));
    setPullDistance(distance);
  }, [startY]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > threshold && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    setStartY(0);
  }, [pullDistance, refreshing, onRefresh, threshold]);

  return {
    pullDistance,
    refreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

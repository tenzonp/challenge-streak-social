import { useState, useCallback } from 'react';
import { hapticFeedback } from '@/utils/nativeApp';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export const usePullToRefresh = ({ onRefresh, threshold = 60 }: UsePullToRefreshOptions) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    // Also check if the target element is scrolled to top
    const target = e.currentTarget as HTMLElement;
    const targetScrollTop = target.scrollTop || 0;
    
    if (scrollTop === 0 && targetScrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setHasTriggeredHaptic(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(100, currentY - startY));
    setPullDistance(distance);

    // Trigger haptic when crossing threshold
    if (distance > threshold && !hasTriggeredHaptic) {
      hapticFeedback('medium');
      setHasTriggeredHaptic(true);
    } else if (distance <= threshold && hasTriggeredHaptic) {
      setHasTriggeredHaptic(false);
    }
  }, [startY, threshold, hasTriggeredHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > threshold && !refreshing) {
      setRefreshing(true);
      hapticFeedback('success');
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    setStartY(0);
    setHasTriggeredHaptic(false);
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

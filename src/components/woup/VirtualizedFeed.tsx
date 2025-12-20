import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ViralPostCard from './ViralPostCard';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { Profile } from '@/hooks/useProfile';
import { Sparkles, Loader2 } from 'lucide-react';

interface VirtualizedFeedProps {
  posts: ChallengeResponse[];
  onReact: (responseId: string, emoji: string) => void;
  onViewProfile: (user: Profile) => void;
  onView: (responseId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const VirtualizedFeed = ({ 
  posts, 
  onReact, 
  onViewProfile, 
  onView,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: VirtualizedFeedProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: posts.length + (hasMore ? 1 : 0), // Add 1 for loader
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index: number) => index === posts.length ? 60 : 420, [posts.length]),
    overscan: 3,
  });

  // Infinite scroll detection
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    const lastItem = items[items.length - 1];

    if (!lastItem) return;

    // If we're showing the last few items, load more
    if (
      lastItem.index >= posts.length - 3 &&
      hasMore &&
      !loadingMore &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [virtualizer.getVirtualItems(), posts.length, hasMore, loadingMore, onLoadMore]);

  if (posts.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 text-center border border-border">
        <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No posts yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100dvh-200px)] overflow-auto scrollbar-hide overscroll-contain"
      style={{ 
        contain: 'strict',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= posts.length;
          
          if (isLoaderRow) {
            return (
              <div
                key="loader"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center justify-center py-4"
              >
                {loadingMore && (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                )}
              </div>
            );
          }

          const post = posts[virtualRow.index];
          return (
            <div
              key={post.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
            >
              <ViralPostCard
                post={post}
                onReact={onReact}
                onViewProfile={onViewProfile}
                onView={onView}
                isNew={virtualRow.index < 3}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedFeed;

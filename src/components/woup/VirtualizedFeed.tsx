import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ViralPostCard from './ViralPostCard';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { Profile } from '@/hooks/useProfile';
import { Sparkles } from 'lucide-react';

interface VirtualizedFeedProps {
  posts: ChallengeResponse[];
  onReact: (responseId: string, emoji: string) => void;
  onViewProfile: (user: Profile) => void;
  onView: (responseId: string) => void;
}

const VirtualizedFeed = ({ posts, onReact, onViewProfile, onView }: VirtualizedFeedProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 420, []),
    overscan: 2,
  });

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
      className="h-[calc(100dvh-200px)] overflow-auto scrollbar-hide"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
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

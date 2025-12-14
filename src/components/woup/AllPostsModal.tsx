import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Loader2, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { ChallengeResponse } from '@/hooks/useChallenges';

interface AllPostsModalProps {
  profile: Profile;
  onClose: () => void;
  onViewPost: (post: ChallengeResponse, user: Profile) => void;
}

const POSTS_PER_PAGE = 12;

const AllPostsModal = ({ profile, onClose, onViewPost }: AllPostsModalProps) => {
  const [posts, setPosts] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchPosts = async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    const { data, error } = await supabase
      .from('challenge_responses')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

    if (!error && data) {
      if (append) {
        setPosts(prev => [...prev, ...(data as ChallengeResponse[])]);
      } else {
        setPosts(data as ChallengeResponse[]);
      }
      setHasMore(data.length === POSTS_PER_PAGE);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchPosts(0);
  }, [profile.user_id]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <h2 className="font-bold">{profile.display_name}'s Posts</h2>
          <p className="text-xs text-muted-foreground">{posts.length} posts</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Posts Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Grid3X3 className="w-12 h-12 mb-4" />
            <p>No posts yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {posts.map(post => (
                <motion.button
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-square rounded-xl overflow-hidden relative group"
                  onClick={() => onViewPost(post, profile)}
                >
                  <img
                    src={post.back_photo_url}
                    alt="Post"
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-bold transition-opacity">
                      View
                    </span>
                  </div>
                  {post.front_photo_url && (
                    <div className="absolute top-1 left-1 w-6 h-8 rounded overflow-hidden border border-white/50">
                      <img
                        src={post.front_photo_url}
                        alt="Selfie"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AllPostsModal;

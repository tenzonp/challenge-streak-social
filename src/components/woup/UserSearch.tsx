import { useState } from 'react';
import { Search, X, UserPlus, MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';

interface UserSearchProps {
  onChallenge: (userId: string) => void;
  onChat: (user: Profile) => void;
  onClose: () => void;
}

const UserSearch = ({ onChallenge, onChat, onClose }: UserSearchProps) => {
  const { searchUsers, addFriend, friends } = useFriends();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setSearching(true);
    const users = await searchUsers(query);
    setResults(users);
    setSearching(false);
  };

  const handleAdd = async (userId: string) => {
    const { error } = await addFriend(userId);
    if (!error) {
      toast({ title: 'friend added! 🎉' });
    }
  };

  const isFriend = (userId: string) => friends.some(f => f.user_id === userId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md h-[70vh] glass rounded-3xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-xl font-bold">find friends</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-border/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="search by username..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none"
              />
            </div>
            <Button variant="neon" onClick={handleSearch} disabled={searching}>
              search
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {results.length === 0 && query && !searching && (
            <p className="text-center text-muted-foreground py-8">no users found</p>
          )}
          
          {results.map(user => (
            <div key={user.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <img 
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`}
                className="w-12 h-12 rounded-xl"
                style={{ 
                  borderColor: user.color_primary || undefined,
                  borderWidth: user.color_primary ? 2 : 0
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.display_name}</p>
                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
              </div>
              <div className="flex gap-2">
                {!isFriend(user.user_id) && (
                  <Button variant="outline" size="icon" onClick={() => handleAdd(user.user_id)}>
                    <UserPlus className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="glass" size="icon" onClick={() => onChat(user)}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => onChallenge(user.user_id)}>
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;

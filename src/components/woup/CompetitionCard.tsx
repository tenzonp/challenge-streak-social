import { Trophy, Clock, Users, Flame, ChevronRight, Crown, Medal, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Competition, CompetitionEntry, useCompetitions } from '@/hooks/useCompetitions';
import { cn } from '@/lib/utils';
import { Profile } from '@/hooks/useProfile';

interface CompetitionCardProps {
  competition: Competition;
  leaderboard: CompetitionEntry[];
  userEntry: CompetitionEntry | null;
  onJoin: () => void;
  onViewProfile: (user: Profile) => void;
}

const CompetitionCard = ({ competition, leaderboard, userEntry, onJoin, onViewProfile }: CompetitionCardProps) => {
  const { getTimeRemaining } = useCompetitions();
  const timeRemaining = getTimeRemaining(competition.end_date);
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  return (
    <div className="glass rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-4 gradient-accent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary-foreground" />
            <h3 className="font-bold text-primary-foreground">{competition.title}</h3>
          </div>
          <span className="px-2 py-1 rounded-full bg-background/20 text-xs font-medium text-primary-foreground capitalize">
            {competition.type}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-primary-foreground/80">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {timeRemaining}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {leaderboard.length} competing
          </span>
        </div>
      </div>

      {/* Prize */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <span className="text-2xl">{competition.prize_title.split(' ')[0]}</span>
        <div>
          <p className="font-semibold text-sm">{competition.prize_title}</p>
          {competition.prize_description && (
            <p className="text-xs text-muted-foreground">{competition.prize_description}</p>
          )}
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Top Competitors</h4>
          <span className="text-xs text-muted-foreground">Live standings</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Be the first to join!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => entry.user && onViewProfile(entry.user)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-xl transition-colors",
                  index === 0 && "bg-yellow-500/10",
                  userEntry?.id === entry.id && "bg-primary/10"
                )}
              >
                {getRankIcon(index + 1)}
                
                <img
                  src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user_id}`}
                  className="w-8 h-8 rounded-lg"
                  style={{ 
                    borderColor: entry.user?.color_primary || 'transparent',
                    borderWidth: entry.user?.color_primary ? 2 : 0 
                  }}
                />
                
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm truncate">{entry.user?.display_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">@{entry.user?.username}</p>
                </div>
                
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50">
                  <Flame className="w-3 h-3 text-secondary" />
                  <span className="text-sm font-bold">{entry.current_streak}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="p-4 border-t border-border/50">
        {userEntry ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your rank:</span>
              <span className="font-bold text-primary">
                #{leaderboard.findIndex(e => e.id === userEntry.id) + 1}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-secondary" />
              <span className="font-bold">{userEntry.current_streak} streak</span>
            </div>
          </div>
        ) : (
          <Button onClick={onJoin} className="w-full gap-2" variant="neon">
            <Trophy className="w-4 h-4" />
            Join Competition
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CompetitionCard;

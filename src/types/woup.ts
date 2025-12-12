export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  streak: number;
  bio?: string;
  vibe?: string;
}

export interface Challenge {
  id: string;
  fromUser: User;
  toUser: User;
  challengeText: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'expired';
  response?: ChallengeResponse;
}

export interface ChallengeResponse {
  id: string;
  frontPhoto: string;
  backPhoto: string;
  caption?: string;
  createdAt: Date;
  reactions: Reaction[];
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface FeedPost {
  id: string;
  user: User;
  challenge: Challenge;
  response: ChallengeResponse;
  createdAt: Date;
}

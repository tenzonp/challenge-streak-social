import { User, Challenge, FeedPost } from '@/types/woup';

export const currentUser: User = {
  id: '1',
  username: 'yourvibe',
  displayName: 'You ✨',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=current&backgroundColor=b6e3f4',
  streak: 12,
  bio: 'living my best life 🌈',
  vibe: '💫 vibing',
};

export const friends: User[] = [
  {
    id: '2',
    username: 'maya_k',
    displayName: 'Maya 🦋',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maya&backgroundColor=ffd5dc',
    streak: 24,
    bio: 'coffee addict ☕',
    vibe: '🎨 creative mode',
  },
  {
    id: '3',
    username: 'alex.js',
    displayName: 'Alex 🚀',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=c0aede',
    streak: 7,
    bio: 'tech bro but make it ✨',
    vibe: '💻 coding',
  },
  {
    id: '4',
    username: 'zoe.zen',
    displayName: 'Zoe 🌸',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zoe&backgroundColor=d1f4d1',
    streak: 45,
    bio: 'yoga & good vibes only',
    vibe: '🧘 zen mode',
  },
  {
    id: '5',
    username: 'liam_beats',
    displayName: 'Liam 🎵',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liam&backgroundColor=ffeaa7',
    streak: 18,
    bio: 'making beats, breaking hearts',
    vibe: '🎧 in the zone',
  },
];

export const pendingChallenges: Challenge[] = [
  {
    id: 'c1',
    fromUser: friends[0],
    toUser: currentUser,
    challengeText: 'show me ur study setup rn 📚',
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    status: 'pending',
  },
  {
    id: 'c2',
    fromUser: friends[2],
    toUser: currentUser,
    challengeText: 'what r u eating rn? 🍕',
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    status: 'pending',
  },
];

export const feedPosts: FeedPost[] = [
  {
    id: 'p1',
    user: friends[1],
    challenge: {
      id: 'c3',
      fromUser: friends[3],
      toUser: friends[1],
      challengeText: 'show ur view rn 🌅',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      status: 'completed',
    },
    response: {
      id: 'r1',
      frontPhoto: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=500&fit=crop',
      backPhoto: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=500&fit=crop',
      caption: 'golden hour hits different ✨',
      createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      reactions: [
        { userId: '1', emoji: '🔥' },
        { userId: '3', emoji: '😍' },
        { userId: '4', emoji: '💯' },
      ],
    },
    createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
  },
  {
    id: 'p2',
    user: friends[0],
    challenge: {
      id: 'c4',
      fromUser: currentUser,
      toUser: friends[0],
      challengeText: 'ur outfit today? 👗',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: 'completed',
    },
    response: {
      id: 'r2',
      frontPhoto: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop',
      backPhoto: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop',
      caption: 'feeling this fit today ngl 💅',
      createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      reactions: [
        { userId: '1', emoji: '💖' },
        { userId: '2', emoji: '🔥' },
      ],
    },
    createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
  },
  {
    id: 'p3',
    user: friends[3],
    challenge: {
      id: 'c5',
      fromUser: friends[1],
      toUser: friends[3],
      challengeText: 'what song r u listening to? 🎵',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      status: 'completed',
    },
    response: {
      id: 'r3',
      frontPhoto: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=500&fit=crop',
      backPhoto: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=500&fit=crop',
      caption: 'spotify on repeat fr fr 🎧',
      createdAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
      reactions: [
        { userId: '1', emoji: '🎵' },
        { userId: '2', emoji: '💜' },
        { userId: '3', emoji: '🙌' },
        { userId: '4', emoji: '🔥' },
      ],
    },
    createdAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
  },
];

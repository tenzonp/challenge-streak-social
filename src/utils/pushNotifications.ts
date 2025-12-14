import { supabase } from '@/integrations/supabase/client';

// Notification types
export type NotificationType = 
  | 'challenge' 
  | 'message' 
  | 'streak' 
  | 'friend_request' 
  | 'competition' 
  | 'achievement'
  | 'like'
  | 'comment'
  | 'reaction';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Send push notification to a user
export const sendPushNotification = async ({
  userId,
  type,
  title,
  body,
  data = {}
}: SendNotificationParams): Promise<boolean> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-notification', {
      body: { 
        user_id: userId, 
        type, 
        title, 
        body, 
        data 
      }
    });
    
    if (error) {
      console.error('[Push] Failed to send notification:', error);
      return false;
    }
    
    console.log('[Push] Notification sent:', result);
    return result?.success ?? false;
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return false;
  }
};

// Helper functions for specific notification types
export const notifyNewLike = async (
  postOwnerId: string, 
  likerName: string, 
  postId: string
) => {
  return sendPushNotification({
    userId: postOwnerId,
    type: 'like',
    title: 'new like! ❤️',
    body: `${likerName} liked your post`,
    data: { postId, action: 'view_post' }
  });
};

export const notifyNewComment = async (
  postOwnerId: string, 
  commenterName: string, 
  postId: string,
  commentPreview: string
) => {
  return sendPushNotification({
    userId: postOwnerId,
    type: 'comment',
    title: 'new comment! 💬',
    body: `${commenterName}: ${commentPreview.slice(0, 50)}${commentPreview.length > 50 ? '...' : ''}`,
    data: { postId, action: 'view_comments' }
  });
};

export const notifyCommentReply = async (
  commentOwnerId: string, 
  replierName: string, 
  postId: string,
  replyPreview: string
) => {
  return sendPushNotification({
    userId: commentOwnerId,
    type: 'comment',
    title: 'new reply! 💬',
    body: `${replierName} replied: ${replyPreview.slice(0, 50)}${replyPreview.length > 50 ? '...' : ''}`,
    data: { postId, action: 'view_comments' }
  });
};

export const notifyNewMessage = async (
  receiverId: string,
  senderName: string,
  messagePreview: string
) => {
  return sendPushNotification({
    userId: receiverId,
    type: 'message',
    title: `${senderName} 💌`,
    body: messagePreview.slice(0, 100),
    data: { action: 'open_chat' }
  });
};

export const notifyNewChallenge = async (
  receiverId: string,
  senderName: string,
  challengeText: string
) => {
  return sendPushNotification({
    userId: receiverId,
    type: 'challenge',
    title: 'new challenge! 🎯',
    body: `${senderName}: ${challengeText.slice(0, 50)}`,
    data: { action: 'view_challenge' }
  });
};

export const notifyChallengeCompleted = async (
  senderId: string,
  completerName: string
) => {
  return sendPushNotification({
    userId: senderId,
    type: 'challenge',
    title: 'challenge completed! 🎉',
    body: `${completerName} completed your challenge`,
    data: { action: 'view_feed' }
  });
};

export const notifyFriendRequest = async (
  receiverId: string,
  senderName: string
) => {
  return sendPushNotification({
    userId: receiverId,
    type: 'friend_request',
    title: 'new friend request! 🤝',
    body: `${senderName} wants to be your friend`,
    data: { action: 'view_requests' }
  });
};

export const notifyFriendAccepted = async (
  requesterId: string,
  accepterName: string
) => {
  return sendPushNotification({
    userId: requesterId,
    type: 'friend_request',
    title: 'friend request accepted! 🎉',
    body: `${accepterName} is now your friend`,
    data: { action: 'view_friends' }
  });
};

export const notifyReaction = async (
  postOwnerId: string,
  reactorName: string,
  emoji: string,
  postId: string
) => {
  return sendPushNotification({
    userId: postOwnerId,
    type: 'reaction',
    title: `${reactorName} reacted ${emoji}`,
    body: 'to your post',
    data: { postId, action: 'view_post' }
  });
};

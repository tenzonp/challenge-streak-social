export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "challenge_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_responses: {
        Row: {
          back_photo_url: string
          caption: string | null
          challenge_id: string
          created_at: string
          flag_reason: string | null
          front_photo_url: string
          id: string
          is_flagged: boolean | null
          is_hidden: boolean | null
          report_count: number | null
          user_id: string
        }
        Insert: {
          back_photo_url: string
          caption?: string | null
          challenge_id: string
          created_at?: string
          flag_reason?: string | null
          front_photo_url: string
          id?: string
          is_flagged?: boolean | null
          is_hidden?: boolean | null
          report_count?: number | null
          user_id: string
        }
        Update: {
          back_photo_url?: string
          caption?: string | null
          challenge_id?: string
          created_at?: string
          flag_reason?: string | null
          front_photo_url?: string
          id?: string
          is_flagged?: boolean | null
          is_hidden?: boolean | null
          report_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_responses_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: true
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_text: string
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          challenge_text: string
          created_at?: string
          expires_at: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          challenge_text?: string
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenges_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          response_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          response_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "challenge_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          is_top_friend: boolean
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          is_top_friend?: boolean
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          is_top_friend?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          allow_save: boolean | null
          audio_duration: number | null
          content: string
          created_at: string
          id: string
          is_reported: boolean | null
          media_url: string | null
          message_type: string
          read: boolean
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          snap_views_remaining: number | null
          status: string
        }
        Insert: {
          allow_save?: boolean | null
          audio_duration?: number | null
          content: string
          created_at?: string
          id?: string
          is_reported?: boolean | null
          media_url?: string | null
          message_type?: string
          read?: boolean
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          snap_views_remaining?: number | null
          status?: string
        }
        Update: {
          allow_save?: boolean | null
          audio_duration?: number | null
          content?: string
          created_at?: string
          id?: string
          is_reported?: boolean | null
          media_url?: string | null
          message_type?: string
          read?: boolean
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          snap_views_remaining?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievement_unlocks_enabled: boolean
          challenges_enabled: boolean
          competition_updates_enabled: boolean
          created_at: string
          friend_requests_enabled: boolean
          id: string
          last_activity_view_at: string | null
          messages_enabled: boolean
          streak_reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_unlocks_enabled?: boolean
          challenges_enabled?: boolean
          competition_updates_enabled?: boolean
          created_at?: string
          friend_requests_enabled?: boolean
          id?: string
          last_activity_view_at?: string | null
          messages_enabled?: boolean
          streak_reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_unlocks_enabled?: boolean
          challenges_enabled?: boolean
          competition_updates_enabled?: boolean
          created_at?: string
          friend_requests_enabled?: boolean
          id?: string
          last_activity_view_at?: string | null
          messages_enabled?: boolean
          streak_reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          notification_type: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          notification_type: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          notification_type?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_engagement: {
        Row: {
          engagement_score: number
          id: string
          likes_count: number
          replies_count: number
          response_id: string
          updated_at: string
          views_count: number
        }
        Insert: {
          engagement_score?: number
          id?: string
          likes_count?: number
          replies_count?: number
          response_id: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          engagement_score?: number
          id?: string
          likes_count?: number
          replies_count?: number
          response_id?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "challenge_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          created_at: string
          id: string
          post_visibility: string
          show_spotify_publicly: boolean
          show_streak_publicly: boolean
          updated_at: string
          user_id: string
          who_can_challenge: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_visibility?: string
          show_spotify_publicly?: boolean
          show_streak_publicly?: boolean
          updated_at?: string
          user_id: string
          who_can_challenge?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_visibility?: string
          show_spotify_publicly?: boolean
          show_streak_publicly?: boolean
          updated_at?: string
          user_id?: string
          who_can_challenge?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          color_primary: string | null
          color_secondary: string | null
          created_at: string
          current_artist: string | null
          current_song: string | null
          display_name: string
          email: string | null
          has_completed_onboarding: boolean
          id: string
          interests: string[] | null
          longest_streak: number
          song_url: string | null
          spotify_connected: boolean | null
          streak: number
          updated_at: string
          user_code: string | null
          user_id: string
          username: string
          vibe: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          current_artist?: string | null
          current_song?: string | null
          display_name: string
          email?: string | null
          has_completed_onboarding?: boolean
          id?: string
          interests?: string[] | null
          longest_streak?: number
          song_url?: string | null
          spotify_connected?: boolean | null
          streak?: number
          updated_at?: string
          user_code?: string | null
          user_id: string
          username: string
          vibe?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          current_artist?: string | null
          current_song?: string | null
          display_name?: string
          email?: string | null
          has_completed_onboarding?: boolean
          id?: string
          interests?: string[] | null
          longest_streak?: number
          song_url?: string | null
          spotify_connected?: boolean | null
          streak?: number
          updated_at?: string
          user_code?: string | null
          user_id?: string
          username?: string
          vibe?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          response_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          response_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          response_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "challenge_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          body: string
          created_at: string
          cron_expression: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          last_sent_at: string | null
          notification_type: string
          scheduled_for: string | null
          sent_count: number | null
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          last_sent_at?: string | null
          notification_type?: string
          scheduled_for?: string | null
          sent_count?: number | null
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          cron_expression?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          last_sent_at?: string | null
          notification_type?: string
          scheduled_for?: string | null
          sent_count?: number | null
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      spotify_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_rewards: {
        Row: {
          claimed_at: string
          id: string
          reward_type: string
          streak_count: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_type: string
          streak_count: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_type?: string
          streak_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      typing_status: {
        Row: {
          chat_partner_id: string
          id: string
          is_typing: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_partner_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_partner_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viewed_posts: {
        Row: {
          id: string
          response_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          response_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_send_challenge: {
        Args: { receiver_id: string; sender_id: string }
        Returns: boolean
      }
      can_view_user_posts: {
        Args: { poster_id: string; viewer_id: string }
        Returns: boolean
      }
      generate_unique_user_code: { Args: never; Returns: string }
      increment_post_views: {
        Args: { p_response_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

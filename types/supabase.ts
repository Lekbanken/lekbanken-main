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
      achievement_leaderboards: {
        Row: {
          achievement_count: number
          created_at: string
          id: string
          rank: number | null
          season_number: number | null
          seasonal_achievement_count: number
          tenant_id: string
          total_achievement_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_count?: number
          created_at?: string
          id?: string
          rank?: number | null
          season_number?: number | null
          seasonal_achievement_count?: number
          tenant_id: string
          total_achievement_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_count?: number
          created_at?: string
          id?: string
          rank?: number | null
          season_number?: number | null
          seasonal_achievement_count?: number
          tenant_id?: string
          total_achievement_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_leaderboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          achievement_key: string | null
          badge_color: string | null
          condition_type: string
          condition_value: number | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
        }
        Insert: {
          achievement_key?: string | null
          badge_color?: string | null
          condition_type: string
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
        }
        Update: {
          achievement_key?: string | null
          badge_color?: string | null
          condition_type?: string
          condition_value?: number | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      analytics_timeseries: {
        Row: {
          breakdown_by: string | null
          breakdown_value: string | null
          count: number
          created_at: string
          id: string
          metric_name: string
          metric_type: string
          tenant_id: string | null
          time_bucket: string
          timeseries_key: string | null
          value: number
        }
        Insert: {
          breakdown_by?: string | null
          breakdown_value?: string | null
          count?: number
          created_at?: string
          id?: string
          metric_name: string
          metric_type: string
          tenant_id?: string | null
          time_bucket: string
          timeseries_key?: string | null
          value: number
        }
        Update: {
          breakdown_by?: string | null
          breakdown_value?: string | null
          count?: number
          created_at?: string
          id?: string
          metric_name?: string
          metric_type?: string
          tenant_id?: string | null
          time_bucket?: string
          timeseries_key?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_timeseries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          amount_charged: number | null
          amount_credited: number | null
          created_at: string | null
          event_type: string
          from_plan_id: string | null
          id: string
          notes: string | null
          subscription_id: string | null
          tenant_id: string
          to_plan_id: string | null
        }
        Insert: {
          amount_charged?: number | null
          amount_credited?: number | null
          created_at?: string | null
          event_type: string
          from_plan_id?: string | null
          id?: string
          notes?: string | null
          subscription_id?: string | null
          tenant_id: string
          to_plan_id?: string | null
        }
        Update: {
          amount_charged?: number | null
          amount_credited?: number | null
          created_at?: string | null
          event_type?: string
          from_plan_id?: string | null
          id?: string
          notes?: string | null
          subscription_id?: string | null
          tenant_id?: string
          to_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_history_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          api_limit_daily: number | null
          created_at: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          storage_gb: number | null
          support_level: string | null
          updated_at: string | null
          user_limit: number | null
        }
        Insert: {
          api_limit_daily?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          slug: string
          storage_gb?: number | null
          support_level?: string | null
          updated_at?: string | null
          user_limit?: number | null
        }
        Update: {
          api_limit_daily?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          storage_gb?: number | null
          support_level?: string | null
          updated_at?: string | null
          user_limit?: number | null
        }
        Relationships: []
      }
      billing_products: {
        Row: {
          billing_product_key: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          price_per_seat: number
          seats_included: number
          type: string
          updated_at: string
        }
        Insert: {
          billing_product_key?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          price_per_seat: number
          seats_included?: number
          type: string
          updated_at?: string
        }
        Update: {
          billing_product_key?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          price_per_seat?: number
          seats_included?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      browse_search_logs: {
        Row: {
          created_at: string
          filters_applied: Json | null
          id: string
          result_ids: string[] | null
          results_count: number | null
          search_term: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters_applied?: Json | null
          id?: string
          result_ids?: string[] | null
          results_count?: number | null
          search_term?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters_applied?: Json | null
          id?: string
          result_ids?: string[] | null
          results_count?: number | null
          search_term?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "browse_search_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "browse_search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          browser_info: string | null
          bug_report_key: string | null
          created_at: string
          description: string
          error_message: string | null
          game_id: string | null
          id: string
          is_resolved: boolean
          resolved_at: string | null
          status: string
          steps_to_reproduce: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_info?: string | null
          bug_report_key?: string | null
          created_at?: string
          description: string
          error_message?: string | null
          game_id?: string | null
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          status?: string
          steps_to_reproduce?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_info?: string | null
          bug_report_key?: string | null
          created_at?: string
          description?: string
          error_message?: string | null
          game_id?: string | null
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          status?: string
          steps_to_reproduce?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participation: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          progress_value: number
          reward_claimed: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          progress_value?: number
          reward_claimed?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          progress_value?: number
          reward_claimed?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participation_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "community_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string | null
          game_id: string
          id: string
          order_index: number | null
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          game_id: string
          id?: string
          order_index?: number | null
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          game_id?: string
          id?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "content_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      community_challenges: {
        Row: {
          challenge_type: string
          completion_count: number
          created_at: string
          created_by_user_id: string
          description: string | null
          difficulty: string
          ends_at: string
          id: string
          participation_count: number
          reward_currency_amount: number | null
          reward_points: number
          starts_at: string
          status: string
          target_value: number
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          challenge_type: string
          completion_count?: number
          created_at?: string
          created_by_user_id: string
          description?: string | null
          difficulty?: string
          ends_at: string
          id?: string
          participation_count?: number
          reward_currency_amount?: number | null
          reward_points: number
          starts_at: string
          status?: string
          target_value: number
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          challenge_type?: string
          completion_count?: number
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          difficulty?: string
          ends_at?: string
          id?: string
          participation_count?: number
          reward_currency_amount?: number | null
          reward_points?: number
          starts_at?: string
          status?: string
          target_value?: number
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_challenges_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_analytics: {
        Row: {
          click_count: number | null
          content_id: string
          created_at: string | null
          engagement_score: number | null
          id: string
          last_viewed_at: string | null
          tenant_id: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          click_count?: number | null
          content_id: string
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_viewed_at?: string | null
          tenant_id: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          click_count?: number | null
          content_id?: string
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          last_viewed_at?: string | null
          tenant_id?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collections: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string | null
          created_by_user_id: string
          description: string | null
          game_count: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          name: string
          order_index: number | null
          tenant_id: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          game_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          name: string
          order_index?: number | null
          tenant_id: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          game_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          name?: string
          order_index?: number | null
          tenant_id?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_collections_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_filter_rules: {
        Row: {
          categories: string[]
          created_at: string
          created_by_user_id: string
          id: string
          is_active: boolean
          pattern: string
          rule_type: string
          severity: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          created_by_user_id: string
          id?: string
          is_active?: boolean
          pattern: string
          rule_type: string
          severity: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          created_by_user_id?: string
          id?: string
          is_active?: boolean
          pattern?: string
          rule_type?: string
          severity?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_filter_rules_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_filter_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          description: string | null
          featured_until: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_published: boolean | null
          metadata: Json | null
          tenant_id: string
          title: string
          type: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          tenant_id: string
          title: string
          type: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_preferences: {
        Row: {
          content_category: string | null
          created_at: string | null
          engagement_count: number | null
          frequency_preference: string | null
          id: string
          last_engaged_at: string | null
          preference_level: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_category?: string | null
          created_at?: string | null
          engagement_count?: number | null
          frequency_preference?: string | null
          id?: string
          last_engaged_at?: string | null
          preference_level?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_category?: string | null
          created_at?: string | null
          engagement_count?: number | null
          frequency_preference?: string | null
          id?: string
          last_engaged_at?: string | null
          preference_level?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          assigned_to_user_id: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          priority: string
          reason: string
          reported_by_user_id: string
          resolution_reason: string | null
          resolved_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          reason: string
          reported_by_user_id: string
          resolution_reason?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          reason?: string
          reported_by_user_id?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reported_by_user_id_fkey"
            columns: ["reported_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_schedules: {
        Row: {
          content_id: string
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_schedules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      error_tracking: {
        Row: {
          created_at: string
          error_key: string | null
          error_message: string | null
          error_type: string
          id: string
          last_occurred_at: string | null
          occurrence_count: number
          page_path: string | null
          resolved: boolean
          severity: string | null
          stack_trace: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_key?: string | null
          error_message?: string | null
          error_type: string
          id?: string
          last_occurred_at?: string | null
          occurrence_count?: number
          page_path?: string | null
          resolved?: boolean
          severity?: string | null
          stack_trace?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_key?: string | null
          error_message?: string | null
          error_type?: string
          id?: string
          last_occurred_at?: string | null
          occurrence_count?: number
          page_path?: string | null
          resolved?: boolean
          severity?: string | null
          stack_trace?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rewards: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          created_at: string
          event_id: string
          id: string
          reward_id: string
          reward_name: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          reward_id: string
          reward_name: string
          tenant_id: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          reward_id?: string
          reward_name?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rewards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "limited_time_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage: {
        Row: {
          action_type: string
          category: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          feature_key: string | null
          feature_name: string
          id: string
          metadata: Json | null
          success: boolean | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          category?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature_key?: string | null
          feature_name: string
          id?: string
          metadata?: Json | null
          success?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          category?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature_key?: string | null
          feature_name?: string
          id?: string
          metadata?: Json | null
          success?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          description: string | null
          feedback_key: string | null
          game_id: string | null
          id: string
          is_anonymous: boolean
          rating: number | null
          status: string
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["feedback_type_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feedback_key?: string | null
          game_id?: string | null
          id?: string
          is_anonymous?: boolean
          rating?: number | null
          status?: string
          tenant_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["feedback_type_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feedback_key?: string | null
          game_id?: string | null
          id?: string
          is_anonymous?: boolean
          rating?: number | null
          status?: string
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["feedback_type_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          recipient_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipient_id: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipient_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string | null
          id: string
          tenant_id_1: string | null
          tenant_id_2: string | null
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tenant_id_1?: string | null
          tenant_id_2?: string | null
          user_id_1: string
          user_id_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tenant_id_1?: string | null
          tenant_id_2?: string | null
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_tenant_id_1_fkey"
            columns: ["tenant_id_1"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_tenant_id_2_fkey"
            columns: ["tenant_id_2"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_analytics: {
        Row: {
          abandoned_at_step: number | null
          completed: boolean
          created_at: string
          duration_seconds: number | null
          funnel_key: string | null
          funnel_name: string
          id: string
          step_1: boolean
          step_2: boolean
          step_3: boolean
          step_4: boolean
          step_5: boolean
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          abandoned_at_step?: number | null
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          funnel_key?: string | null
          funnel_name: string
          id?: string
          step_1?: boolean
          step_2?: boolean
          step_3?: boolean
          step_4?: boolean
          step_5?: boolean
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          abandoned_at_step?: number | null
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          funnel_key?: string | null
          funnel_name?: string
          id?: string
          step_1?: boolean
          step_2?: boolean
          step_3?: boolean
          step_4?: boolean
          step_5?: boolean
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_media: {
        Row: {
          alt_text: string | null
          created_at: string
          game_id: string
          id: string
          kind: Database["public"]["Enums"]["game_media_kind"]
          media_id: string
          position: number
          tenant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          game_id: string
          id?: string
          kind?: Database["public"]["Enums"]["game_media_kind"]
          media_id: string
          position?: number
          tenant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          game_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["game_media_kind"]
          media_id?: string
          position?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_media_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          game_id: string
          id: string
          metadata: Json | null
          recorded_at: string
          score: number
          score_key: string | null
          score_type: string | null
          session_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          metadata?: Json | null
          recorded_at?: string
          score?: number
          score_key?: string | null
          score_type?: string | null
          session_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          metadata?: Json | null
          recorded_at?: string
          score?: number
          score_key?: string | null
          score_type?: string | null
          session_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_secondary_purposes: {
        Row: {
          game_id: string
          purpose_id: string
        }
        Insert: {
          game_id: string
          purpose_id: string
        }
        Update: {
          game_id?: string
          purpose_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_secondary_purposes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_secondary_purposes_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          game_id: string
          id: string
          score: number | null
          session_key: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status_enum"]
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          game_id: string
          id?: string
          score?: number | null
          session_key?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status_enum"]
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          game_id?: string
          id?: string
          score?: number | null
          session_key?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status_enum"]
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_translations: {
        Row: {
          created_at: string
          game_id: string
          instructions: Json
          locale: string
          materials: string[] | null
          short_description: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          instructions?: Json
          locale: string
          materials?: string[] | null
          short_description: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          instructions?: Json
          locale?: string
          materials?: string[] | null
          short_description?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_translations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          age_max: number | null
          age_min: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          energy_level: Database["public"]["Enums"]["energy_level_enum"] | null
          game_key: string | null
          holiday_tags: string[] | null
          id: string
          instructions: string | null
          location_type:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          main_purpose_id: string | null
          materials: string[] | null
          max_players: number | null
          min_players: number | null
          name: string
          owner_tenant_id: string | null
          product_id: string | null
          season_tags: string[] | null
          short_description: string | null
          status: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min: number | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level_enum"] | null
          game_key?: string | null
          holiday_tags?: string[] | null
          id?: string
          instructions?: string | null
          location_type?:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          main_purpose_id?: string | null
          materials?: string[] | null
          max_players?: number | null
          min_players?: number | null
          name: string
          owner_tenant_id?: string | null
          product_id?: string | null
          season_tags?: string[] | null
          short_description?: string | null
          status?: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          energy_level?: Database["public"]["Enums"]["energy_level_enum"] | null
          game_key?: string | null
          holiday_tags?: string[] | null
          id?: string
          instructions?: string | null
          location_type?:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          main_purpose_id?: string | null
          materials?: string[] | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          owner_tenant_id?: string | null
          product_id?: string | null
          season_tags?: string[] | null
          short_description?: string | null
          status?: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_main_purpose_id_fkey"
            columns: ["main_purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_profiles: {
        Row: {
          created_at: string | null
          id: string
          interest_activity: number | null
          interest_category: string | null
          interest_weight: number | null
          is_trending: boolean | null
          last_engagement_at: string | null
          tenant_id: string
          trend_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_activity?: number | null
          interest_category?: string | null
          interest_weight?: number | null
          is_trending?: boolean | null
          last_engagement_at?: string | null
          tenant_id: string
          trend_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_activity?: number | null
          interest_category?: string | null
          interest_weight?: number | null
          is_trending?: boolean | null
          last_engagement_at?: string | null
          tenant_id?: string
          trend_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_subtotal: number | null
          amount_tax: number | null
          amount_total: number | null
          billing_product_id: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_key: string | null
          invoice_number: string | null
          issued_at: string | null
          name: string
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status_enum"]
          stripe_invoice_id: string | null
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number | null
          billing_product_id?: string | null
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_key?: string | null
          invoice_number?: string | null
          issued_at?: string | null
          name: string
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status_enum"]
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          amount_subtotal?: number | null
          amount_tax?: number | null
          amount_total?: number | null
          billing_product_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_key?: string | null
          invoice_number?: string | null
          issued_at?: string | null
          name?: string
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status_enum"]
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          avg_score: number | null
          best_score: number | null
          created_at: string
          game_id: string | null
          id: string
          last_played_at: string | null
          leaderboard_key: string | null
          leaderboard_type: string
          tenant_id: string | null
          total_score: number
          total_sessions: number
          updated_at: string
          user_id: string | null
          worst_score: number | null
        }
        Insert: {
          avg_score?: number | null
          best_score?: number | null
          created_at?: string
          game_id?: string | null
          id?: string
          last_played_at?: string | null
          leaderboard_key?: string | null
          leaderboard_type?: string
          tenant_id?: string | null
          total_score?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string | null
          worst_score?: number | null
        }
        Update: {
          avg_score?: number | null
          best_score?: number | null
          created_at?: string
          game_id?: string | null
          id?: string
          last_played_at?: string | null
          leaderboard_key?: string | null
          leaderboard_type?: string
          tenant_id?: string | null
          total_score?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string | null
          worst_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      limited_time_events: {
        Row: {
          completion_count: number
          created_at: string
          created_by_user_id: string
          description: string | null
          ends_at: string
          event_type: string
          id: string
          participant_count: number
          reward_amount: number
          reward_type: string
          starts_at: string
          status: string
          tenant_id: string
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completion_count?: number
          created_at?: string
          created_by_user_id: string
          description?: string | null
          ends_at: string
          event_type: string
          id?: string
          participant_count?: number
          reward_amount: number
          reward_type: string
          starts_at: string
          status?: string
          tenant_id: string
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completion_count?: number
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          ends_at?: string
          event_type?: string
          id?: string
          participant_count?: number
          reward_amount?: number
          reward_type?: string
          starts_at?: string
          status?: string
          tenant_id?: string
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "limited_time_events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limited_time_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_analytics: {
        Row: {
          average_purchase_value: number | null
          created_at: string | null
          date: string | null
          id: string
          most_popular_item_id: string | null
          tenant_id: string
          total_purchases: number | null
          total_revenue: number | null
          unique_buyers: number | null
          updated_at: string | null
        }
        Insert: {
          average_purchase_value?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          most_popular_item_id?: string | null
          tenant_id: string
          total_purchases?: number | null
          total_revenue?: number | null
          unique_buyers?: number | null
          updated_at?: string | null
        }
        Update: {
          average_purchase_value?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          most_popular_item_id?: string | null
          tenant_id?: string
          total_purchases?: number | null
          total_revenue?: number | null
          unique_buyers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_analytics_most_popular_item_id_fkey"
            columns: ["most_popular_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          created_at: string
          game_id: string | null
          id: string
          media_key: string | null
          name: string
          product_id: string | null
          purpose_id: string | null
          type: Database["public"]["Enums"]["media_type_enum"]
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          media_key?: string | null
          name: string
          product_id?: string | null
          purpose_id?: string | null
          type: Database["public"]["Enums"]["media_type_enum"]
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          media_key?: string | null
          name?: string
          product_id?: string | null
          purpose_id?: string | null
          type?: Database["public"]["Enums"]["media_type_enum"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          created_at: string
          duration_minutes: number | null
          expires_at: string | null
          id: string
          is_appealable: boolean
          reason: string
          severity: string
          taken_by_user_id: string
          target_content_id: string | null
          target_user_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          is_appealable?: boolean
          reason: string
          severity?: string
          taken_by_user_id: string
          target_content_id?: string | null
          target_user_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          is_appealable?: boolean
          reason?: string
          severity?: string
          taken_by_user_id?: string
          target_content_id?: string | null
          target_user_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_taken_by_user_id_fkey"
            columns: ["taken_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_analytics: {
        Row: {
          actions_taken: number
          average_resolution_time_hours: number | null
          created_at: string
          date: string
          id: string
          pending_reports: number
          resolved_reports: number
          tenant_id: string
          total_reports: number
          updated_at: string
          users_banned: number
          users_suspended: number
          users_warned: number
        }
        Insert: {
          actions_taken?: number
          average_resolution_time_hours?: number | null
          created_at?: string
          date: string
          id?: string
          pending_reports?: number
          resolved_reports?: number
          tenant_id: string
          total_reports?: number
          updated_at?: string
          users_banned?: number
          users_suspended?: number
          users_warned?: number
        }
        Update: {
          actions_taken?: number
          average_resolution_time_hours?: number | null
          created_at?: string
          date?: string
          id?: string
          pending_reports?: number
          resolved_reports?: number
          tenant_id?: string
          total_reports?: number
          updated_at?: string
          users_banned?: number
          users_suspended?: number
          users_warned?: number
        }
        Relationships: [
          {
            foreignKeyName: "moderation_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          assigned_at: string | null
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          priority: string
          report_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          report_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          priority?: string
          report_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_participants: {
        Row: {
          id: string
          joined_at: string | null
          placement: number | null
          score: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          placement?: number | null
          score?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          placement?: number | null
          score?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_sessions: {
        Row: {
          created_at: string | null
          created_by_user_id: string
          current_players: number | null
          ended_at: string | null
          game_id: string
          id: string
          max_players: number
          started_at: string | null
          status: string | null
          updated_at: string | null
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          current_players?: number | null
          ended_at?: string | null
          game_id: string
          id?: string
          max_players?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          current_players?: number | null
          ended_at?: string | null
          game_id?: string
          id?: string
          max_players?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string | null
          delivery_method: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_method?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_method?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          achievement_notifications: boolean | null
          billing_notifications: boolean | null
          created_at: string | null
          digest_frequency: string | null
          email_enabled: boolean | null
          gameplay_notifications: boolean | null
          id: string
          in_app_enabled: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          support_notifications: boolean | null
          system_notifications: boolean | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_notifications?: boolean | null
          billing_notifications?: boolean | null
          created_at?: string | null
          digest_frequency?: string | null
          email_enabled?: boolean | null
          gameplay_notifications?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          support_notifications?: boolean | null
          system_notifications?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_notifications?: boolean | null
          billing_notifications?: boolean | null
          created_at?: string | null
          digest_frequency?: string | null
          email_enabled?: boolean | null
          gameplay_notifications?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          support_notifications?: boolean | null
          system_notifications?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id: string
          title: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          id: string
          ip_address: string | null
          os_name: string | null
          os_version: string | null
          page_path: string
          page_title: string | null
          page_view_key: string | null
          referrer: string | null
          region: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          os_name?: string | null
          os_version?: string | null
          page_path: string
          page_title?: string | null
          page_view_key?: string | null
          referrer?: string | null
          region?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          os_name?: string | null
          os_version?: string | null
          page_path?: string
          page_title?: string | null
          page_view_key?: string | null
          referrer?: string | null
          region?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last_four: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          stripe_payment_method_id: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string | null
          tenant_id: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last_four?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string
          name: string
          paid_at: string | null
          payment_key: string | null
          provider: string | null
          status: Database["public"]["Enums"]["payment_status_enum"]
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          name: string
          paid_at?: string | null
          payment_key?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["payment_status_enum"]
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          name?: string
          paid_at?: string | null
          payment_key?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["payment_status_enum"]
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_events: {
        Row: {
          created_at: string | null
          event_metadata: Json | null
          event_type: string
          id: string
          item_id: string | null
          item_title: string | null
          item_type: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_metadata?: Json | null
          event_type: string
          id?: string
          item_id?: string | null
          item_title?: string | null
          item_type?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_metadata?: Json | null
          event_type?: string
          id?: string
          item_id?: string | null
          item_title?: string | null
          item_type?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalization_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalization_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["plan_block_type_enum"]
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          game_id: string | null
          id: string
          is_optional: boolean | null
          metadata: Json | null
          notes: string | null
          plan_id: string
          position: number
          title: string | null
          updated_by: string | null
        }
        Insert: {
          block_type: Database["public"]["Enums"]["plan_block_type_enum"]
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          game_id?: string | null
          id?: string
          is_optional?: boolean | null
          metadata?: Json | null
          notes?: string | null
          plan_id: string
          position: number
          title?: string | null
          updated_by?: string | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["plan_block_type_enum"]
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          game_id?: string | null
          id?: string
          is_optional?: boolean | null
          metadata?: Json | null
          notes?: string | null
          plan_id?: string
          position?: number
          title?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_blocks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_blocks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_blocks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_games: {
        Row: {
          game_id: string
          plan_id: string
          position: number
        }
        Insert: {
          game_id: string
          plan_id: string
          position: number
        }
        Update: {
          game_id?: string
          plan_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_games_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_notes_private: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          plan_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          plan_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          plan_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_notes_private_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_notes_private_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_notes_private_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_notes_tenant: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          plan_id: string
          tenant_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          plan_id: string
          tenant_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          plan_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_notes_tenant_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_notes_tenant_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_notes_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_notes_tenant_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_play_progress: {
        Row: {
          completed_at: string | null
          current_block_id: string | null
          current_position: number | null
          id: string
          metadata: Json | null
          plan_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["plan_run_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_block_id?: string | null
          current_position?: number | null
          id?: string
          metadata?: Json | null
          plan_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["plan_run_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_block_id?: string | null
          current_position?: number | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["plan_run_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_play_progress_current_block_id_fkey"
            columns: ["current_block_id"]
            isOneToOne: false
            referencedRelation: "plan_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_play_progress_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_play_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          owner_tenant_id: string | null
          owner_user_id: string
          plan_key: string | null
          total_time_minutes: number | null
          updated_at: string
          updated_by: string | null
          visibility: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_tenant_id?: string | null
          owner_user_id: string
          plan_key?: string | null
          total_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          visibility?: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_tenant_id?: string | null
          owner_user_id?: string
          plan_key?: string | null
          total_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          visibility?: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      player_cosmetics: {
        Row: {
          acquired_at: string | null
          created_at: string | null
          equipped_at: string | null
          id: string
          is_equipped: boolean | null
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string | null
          equipped_at?: string | null
          id?: string
          is_equipped?: boolean | null
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          created_at?: string | null
          equipped_at?: string | null
          id?: string
          is_equipped?: boolean | null
          shop_item_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_cosmetics_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_cosmetics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      private_subscriptions: {
        Row: {
          billing_product_id: string
          cancelled_at: string | null
          created_at: string
          id: string
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_product_id: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          renewal_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_product_id?: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_subscriptions_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purposes: {
        Row: {
          product_id: string
          purpose_id: string
        }
        Insert: {
          product_id: string
          purpose_id: string
        }
        Update: {
          product_id?: string
          purpose_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_purposes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purposes_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          capabilities: Json | null
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          product_key: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_key?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_key?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by_user_id: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          tenant_id: string
          times_used: number | null
          updated_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by_user_id?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          tenant_id: string
          times_used?: number | null
          updated_at?: string | null
          valid_from: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by_user_id?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          tenant_id?: string
          times_used?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purposes: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          purpose_key: string | null
          type: Database["public"]["Enums"]["purpose_type_enum"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          purpose_key?: string | null
          type: Database["public"]["Enums"]["purpose_type_enum"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          purpose_key?: string | null
          type?: Database["public"]["Enums"]["purpose_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "purposes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_history: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          interaction_timestamp: string | null
          item_id: string | null
          item_title: string | null
          item_type: string | null
          rank_position: number | null
          reason: string | null
          recommendation_id: string | null
          tenant_id: string
          user_id: string
          was_clicked: boolean | null
          was_completed: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          interaction_timestamp?: string | null
          item_id?: string | null
          item_title?: string | null
          item_type?: string | null
          rank_position?: number | null
          reason?: string | null
          recommendation_id?: string | null
          tenant_id: string
          user_id: string
          was_clicked?: boolean | null
          was_completed?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          interaction_timestamp?: string | null
          item_id?: string | null
          item_title?: string | null
          item_type?: string | null
          rank_position?: number | null
          reason?: string | null
          recommendation_id?: string | null
          tenant_id?: string
          user_id?: string
          was_clicked?: boolean | null
          was_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          metadata: Json | null
          resource: string
          role: Database["public"]["Enums"]["tenant_role_enum"]
          scope: string
          updated_at: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          metadata?: Json | null
          resource: string
          role: Database["public"]["Enums"]["tenant_role_enum"]
          scope: string
          updated_at?: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          metadata?: Json | null
          resource?: string
          role?: Database["public"]["Enums"]["tenant_role_enum"]
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          id: string
          item_id: string
          item_metadata: Json | null
          item_title: string | null
          item_type: string
          saved_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          item_metadata?: Json | null
          item_title?: string | null
          item_type: string
          saved_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          item_metadata?: Json | null
          item_title?: string | null
          item_type?: string
          saved_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_achievements: {
        Row: {
          achievement_id: string
          available_until: string | null
          created_at: string
          exclusive_to_season: boolean
          id: string
          rarity: string
          released_at: string
          reward_bonus_percent: number
          season_name: string
          season_number: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          achievement_id: string
          available_until?: string | null
          created_at?: string
          exclusive_to_season?: boolean
          id?: string
          rarity?: string
          released_at: string
          reward_bonus_percent?: number
          season_name: string
          season_number: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          achievement_id?: string
          available_until?: string | null
          created_at?: string
          exclusive_to_season?: boolean
          id?: string
          rarity?: string
          released_at?: string
          reward_bonus_percent?: number
          season_name?: string
          season_number?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_achievements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          featured_content_id: string | null
          id: string
          is_active: boolean | null
          name: string
          reward_multiplier: number | null
          start_date: string
          tenant_id: string
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          featured_content_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          reward_multiplier?: number | null
          start_date: string
          tenant_id: string
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          featured_content_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reward_multiplier?: number | null
          start_date?: string
          tenant_id?: string
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_events_featured_content_id_fkey"
            columns: ["featured_content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_analytics: {
        Row: {
          actions_count: number
          completed: boolean
          created_at: string
          device_type: string | null
          ended_at: string | null
          entry_point: string | null
          exit_page: string | null
          game_id: string | null
          id: string
          pages_visited: number
          referrer: string | null
          score: number | null
          session_duration: number
          session_key: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          actions_count?: number
          completed?: boolean
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          entry_point?: string | null
          exit_page?: string | null
          game_id?: string | null
          id?: string
          pages_visited?: number
          referrer?: string | null
          score?: number | null
          session_duration: number
          session_key?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          actions_count?: number
          completed?: boolean
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          entry_point?: string | null
          exit_page?: string | null
          game_id?: string | null
          id?: string
          pages_visited?: number
          referrer?: string | null
          score?: number | null
          session_duration?: number
          session_key?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_analytics_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_analytics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          created_at: string | null
          created_by_user_id: string | null
          currency_id: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          metadata: Json | null
          name: string
          price: number
          quantity_limit: number | null
          quantity_sold: number | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by_user_id?: string | null
          currency_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          metadata?: Json | null
          name: string
          price: number
          quantity_limit?: number | null
          quantity_sold?: number | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by_user_id?: string | null
          currency_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          metadata?: Json | null
          name?: string
          price?: number
          quantity_limit?: number | null
          quantity_sold?: number | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_items_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "virtual_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_leaderboards: {
        Row: {
          achievements_unlocked: number | null
          avg_score: number | null
          best_score: number | null
          game_id: string
          id: string
          last_played_at: string | null
          rank: number | null
          score: number
          tenant_id: string
          total_plays: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements_unlocked?: number | null
          avg_score?: number | null
          best_score?: number | null
          game_id: string
          id?: string
          last_played_at?: string | null
          rank?: number | null
          score?: number
          tenant_id: string
          total_plays?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements_unlocked?: number | null
          avg_score?: number | null
          best_score?: number | null
          game_id?: string
          id?: string
          last_played_at?: string | null
          rank?: number | null
          score?: number
          tenant_id?: string
          total_plays?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_leaderboards_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_leaderboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string
          billing_plan_id: string
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string
          billing_plan_id: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string
          billing_plan_id?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_reports: {
        Row: {
          avg_resolution_time: number | null
          created_at: string
          id: string
          open_tickets: number
          report_key: string | null
          satisfaction_score: number | null
          tenant_id: string | null
          total_tickets: number
          updated_at: string
        }
        Insert: {
          avg_resolution_time?: number | null
          created_at?: string
          id?: string
          open_tickets?: number
          report_key?: string | null
          satisfaction_score?: number | null
          tenant_id?: string | null
          total_tickets?: number
          updated_at?: string
        }
        Update: {
          avg_resolution_time?: number | null
          created_at?: string
          id?: string
          open_tickets?: number
          report_key?: string | null
          satisfaction_score?: number | null
          tenant_id?: string | null
          total_tickets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to_user_id: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority_enum"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status_enum"]
          tenant_id: string | null
          ticket_key: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority_enum"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status_enum"]
          tenant_id?: string | null
          ticket_key?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to_user_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority_enum"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status_enum"]
          tenant_id?: string | null
          ticket_key?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_audit_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          tenant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          tenant_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string | null
          brand_name_override: string | null
          created_at: string
          id: string
          logo_media_id: string | null
          primary_color: string | null
          secondary_color: string | null
          tenant_id: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_name_override?: string | null
          created_at?: string
          id?: string
          logo_media_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_name_override?: string | null
          created_at?: string
          id?: string
          logo_media_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          tenant_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          tenant_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_features_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string
          status: string
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          role: Database["public"]["Enums"]["tenant_role_enum"]
          seat_assignment_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["tenant_role_enum"]
          seat_assignment_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["tenant_role_enum"]
          seat_assignment_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_seat_assignment_id_fkey"
            columns: ["seat_assignment_id"]
            isOneToOne: false
            referencedRelation: "tenant_seat_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_seat_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string | null
          billing_product_id: string
          created_at: string
          id: string
          name: string | null
          released_at: string | null
          seat_assignment_key: string | null
          status: Database["public"]["Enums"]["seat_assignment_status_enum"]
          subscription_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          billing_product_id: string
          created_at?: string
          id?: string
          name?: string | null
          released_at?: string | null
          seat_assignment_key?: string | null
          status?: Database["public"]["Enums"]["seat_assignment_status_enum"]
          subscription_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          billing_product_id?: string
          created_at?: string
          id?: string
          name?: string | null
          released_at?: string | null
          seat_assignment_key?: string | null
          status?: Database["public"]["Enums"]["seat_assignment_status_enum"]
          subscription_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_seat_assignments_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_seat_assignments_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_seat_assignments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_seat_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_seat_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          id: string
          modules: Json | null
          preferences: Json | null
          product_access: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          modules?: Json | null
          preferences?: Json | null
          product_access?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          modules?: Json | null
          preferences?: Json | null
          product_access?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_product_id: string
          cancelled_at: string | null
          created_at: string
          id: string
          renewal_date: string | null
          seats_purchased: number
          start_date: string
          status: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_product_id: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          renewal_date?: string | null
          seats_purchased?: number
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_product_id?: string
          cancelled_at?: string | null
          created_at?: string
          id?: string
          renewal_date?: string | null
          seats_purchased?: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          subscription_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          default_language: string | null
          default_theme: string | null
          demo_flag: boolean | null
          description: string | null
          id: string
          logo_url: string | null
          main_language: Database["public"]["Enums"]["language_code_enum"]
          metadata: Json | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          status: string
          subscription_status: string | null
          subscription_tier: string | null
          tenant_key: string | null
          trial_ends_at: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          default_language?: string | null
          default_theme?: string | null
          demo_flag?: boolean | null
          description?: string | null
          id?: string
          logo_url?: string | null
          main_language?: Database["public"]["Enums"]["language_code_enum"]
          metadata?: Json | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          status?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          tenant_key?: string | null
          trial_ends_at?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          default_language?: string | null
          default_theme?: string | null
          demo_flag?: boolean | null
          description?: string | null
          id?: string
          logo_url?: string | null
          main_language?: Database["public"]["Enums"]["language_code_enum"]
          metadata?: Json | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          status?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          tenant_key?: string | null
          trial_ends_at?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          message_key: string | null
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          message_key?: string | null
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          message_key?: string | null
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_usage: {
        Row: {
          api_calls_made: number | null
          created_at: string | null
          games_created: number | null
          id: string
          tenant_id: string
          trial_end_date: string
          trial_start_date: string
          updated_at: string | null
          users_created: number | null
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string | null
          games_created?: number | null
          id?: string
          tenant_id: string
          trial_end_date: string
          trial_start_date: string
          updated_at?: string | null
          users_created?: number | null
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string | null
          games_created?: number | null
          id?: string
          tenant_id?: string
          trial_end_date?: string
          trial_start_date?: string
          updated_at?: string | null
          users_created?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          tenant_id: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_currency_balances: {
        Row: {
          balance: number | null
          created_at: string | null
          currency_id: string
          id: string
          last_transaction_at: string | null
          tenant_id: string
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency_id: string
          id?: string
          last_transaction_at?: string | null
          tenant_id: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency_id?: string
          id?: string
          last_transaction_at?: string | null
          tenant_id?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_currency_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "virtual_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_currency_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_currency_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allow_friend_requests: boolean | null
          allow_messages: boolean | null
          content_maturity_level: string | null
          created_at: string | null
          difficulty_preference: string | null
          email_frequency: string | null
          enable_recommendations: boolean | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          preferred_game_categories: string[] | null
          profile_visibility: string | null
          recommendation_frequency: string | null
          show_stats_publicly: boolean | null
          tenant_id: string
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_friend_requests?: boolean | null
          allow_messages?: boolean | null
          content_maturity_level?: string | null
          created_at?: string | null
          difficulty_preference?: string | null
          email_frequency?: string | null
          enable_recommendations?: boolean | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          preferred_game_categories?: string[] | null
          profile_visibility?: string | null
          recommendation_frequency?: string | null
          show_stats_publicly?: boolean | null
          tenant_id: string
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_friend_requests?: boolean | null
          allow_messages?: boolean | null
          content_maturity_level?: string | null
          created_at?: string | null
          difficulty_preference?: string | null
          email_frequency?: string | null
          enable_recommendations?: boolean | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          preferred_game_categories?: string[] | null
          profile_visibility?: string | null
          recommendation_frequency?: string | null
          show_stats_publicly?: boolean | null
          tenant_id?: string
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          created_at: string | null
          currency_id: string
          gifted_from_user_id: string | null
          id: string
          is_gift: boolean | null
          price_paid: number
          quantity: number | null
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency_id: string
          gifted_from_user_id?: string | null
          id?: string
          is_gift?: boolean | null
          price_paid: number
          quantity?: number | null
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency_id?: string
          gifted_from_user_id?: string | null
          id?: string
          is_gift?: boolean | null
          price_paid?: number
          quantity?: number | null
          shop_item_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "virtual_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_gifted_from_user_id_fkey"
            columns: ["gifted_from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_restrictions: {
        Row: {
          active: boolean
          active_until: string | null
          appeal_count: number
          can_appeal: boolean
          created_at: string
          created_by_user_id: string
          id: string
          reason: string
          restriction_type: string
          severity: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          active_until?: string | null
          appeal_count?: number
          can_appeal?: boolean
          created_at?: string
          created_by_user_id: string
          id?: string
          reason: string
          restriction_type: string
          severity?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          active_until?: string | null
          appeal_count?: number
          can_appeal?: boolean
          created_at?: string
          created_by_user_id?: string
          id?: string
          reason?: string
          restriction_type?: string
          severity?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_restrictions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          language: Database["public"]["Enums"]["language_code_enum"]
          preferred_theme: string | null
          role: string
          show_theme_toggle_in_header: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          language?: Database["public"]["Enums"]["language_code_enum"]
          preferred_theme?: string | null
          role?: string
          show_theme_toggle_in_header?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_code_enum"]
          preferred_theme?: string | null
          role?: string
          show_theme_toggle_in_header?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      virtual_currencies: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          is_premium: boolean | null
          name: string
          symbol: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          is_premium?: boolean | null
          name: string
          symbol?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          is_premium?: boolean | null
          name?: string
          symbol?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_currencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_initial_tenant_owner: {
        Args: {
          desired_role?: Database["public"]["Enums"]["tenant_role_enum"]
          target_tenant: string
        }
        Returns: {
          created_at: string
          id: string
          is_primary: boolean
          role: Database["public"]["Enums"]["tenant_role_enum"]
          seat_assignment_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tenant_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_tenant_ids: { Args: never; Returns: string[] }
      has_tenant_role:
        | {
            Args: {
              required_role: Database["public"]["Enums"]["tenant_role_enum"]
              target_tenant: string
            }
            Returns: boolean
          }
        | {
            Args: {
              required_roles: Database["public"]["Enums"]["tenant_role_enum"][]
              target_tenant: string
            }
            Returns: boolean
          }
      is_global_admin: { Args: never; Returns: boolean }
      is_system_admin: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { target_tenant: string }; Returns: boolean }
      to_text_array_safe:
        | {
            Args: { input: string[] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.to_text_array_safe(input => text), public.to_text_array_safe(input => _text). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { input: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.to_text_array_safe(input => text), public.to_text_array_safe(input => _text). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      energy_level_enum: "low" | "medium" | "high"
      feedback_type_enum: "bug" | "feature_request" | "improvement" | "other"
      game_media_kind: "cover" | "gallery"
      game_status_enum: "draft" | "published"
      invoice_status_enum:
        | "draft"
        | "issued"
        | "sent"
        | "paid"
        | "overdue"
        | "canceled"
      language_code_enum: "NO" | "SE" | "EN"
      location_type_enum: "indoor" | "outdoor" | "both"
      media_type_enum: "template" | "upload" | "ai"
      payment_status_enum: "pending" | "confirmed" | "failed" | "refunded"
      plan_block_type_enum: "game" | "pause" | "preparation" | "custom"
      plan_run_status_enum:
        | "not_started"
        | "in_progress"
        | "completed"
        | "abandoned"
      plan_visibility_enum: "private" | "tenant" | "public"
      purpose_type_enum: "main" | "sub"
      seat_assignment_status_enum: "active" | "released" | "pending" | "revoked"
      session_status_enum: "active" | "paused" | "completed" | "abandoned"
      subscription_status_enum: "active" | "paused" | "canceled" | "trial"
      tenant_role_enum: "owner" | "admin" | "editor" | "member"
      tenant_status_enum: "active" | "suspended" | "trial" | "demo" | "archived"
      tenant_type_enum: "school" | "sports" | "workplace" | "private" | "demo"
      ticket_priority_enum: "low" | "medium" | "high" | "urgent"
      ticket_status_enum:
        | "open"
        | "in_progress"
        | "waiting_for_user"
        | "resolved"
        | "closed"
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
    Enums: {
      energy_level_enum: ["low", "medium", "high"],
      feedback_type_enum: ["bug", "feature_request", "improvement", "other"],
      game_media_kind: ["cover", "gallery"],
      game_status_enum: ["draft", "published"],
      invoice_status_enum: [
        "draft",
        "issued",
        "sent",
        "paid",
        "overdue",
        "canceled",
      ],
      language_code_enum: ["NO", "SE", "EN"],
      location_type_enum: ["indoor", "outdoor", "both"],
      media_type_enum: ["template", "upload", "ai"],
      payment_status_enum: ["pending", "confirmed", "failed", "refunded"],
      plan_block_type_enum: ["game", "pause", "preparation", "custom"],
      plan_run_status_enum: [
        "not_started",
        "in_progress",
        "completed",
        "abandoned",
      ],
      plan_visibility_enum: ["private", "tenant", "public"],
      purpose_type_enum: ["main", "sub"],
      seat_assignment_status_enum: ["active", "released", "pending", "revoked"],
      session_status_enum: ["active", "paused", "completed", "abandoned"],
      subscription_status_enum: ["active", "paused", "canceled", "trial"],
      tenant_role_enum: ["owner", "admin", "editor", "member"],
      tenant_status_enum: ["active", "suspended", "trial", "demo", "archived"],
      tenant_type_enum: ["school", "sports", "workplace", "private", "demo"],
      ticket_priority_enum: ["low", "medium", "high", "urgent"],
      ticket_status_enum: [
        "open",
        "in_progress",
        "waiting_for_user",
        "resolved",
        "closed",
      ],
    },
  },
} as const

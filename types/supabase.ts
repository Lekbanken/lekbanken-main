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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          hint_text: string | null
          icon_media_id: string | null
          icon_url: string | null
          id: string
          is_easter_egg: boolean
          name: string
          scope_tenant_id: string | null
          tenant_id: string | null
        }
        Insert: {
          achievement_key?: string | null
          badge_color?: string | null
          condition_type: string
          condition_value?: number | null
          created_at?: string
          description?: string | null
          hint_text?: string | null
          icon_media_id?: string | null
          icon_url?: string | null
          id?: string
          is_easter_egg?: boolean
          name: string
          scope_tenant_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          achievement_key?: string | null
          badge_color?: string | null
          condition_type?: string
          condition_value?: number | null
          created_at?: string
          description?: string | null
          hint_text?: string | null
          icon_media_id?: string | null
          icon_url?: string | null
          id?: string
          is_easter_egg?: boolean
          name?: string
          scope_tenant_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_icon_media_id_fkey"
            columns: ["icon_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      award_builder_exports: {
        Row: {
          created_at: string
          export: Json
          exported_at: string
          exported_by_tool: string | null
          exported_by_user_id: string | null
          id: string
          schema_version: string
          scope_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          export: Json
          exported_at?: string
          exported_by_tool?: string | null
          exported_by_user_id?: string | null
          id?: string
          schema_version: string
          scope_type: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          export?: Json
          exported_at?: string
          exported_by_tool?: string | null
          exported_by_user_id?: string | null
          id?: string
          schema_version?: string
          scope_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_builder_exports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          provider: string
          provider_customer_id: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          provider: string
          provider_customer_id: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_customer_id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          event_key: string | null
          event_type: string
          id: string
          invoice_id: string | null
          payload: Json
          payment_id: string | null
          source: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          created_at?: string
          event_key?: string | null
          event_type: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          payment_id?: string | null
          source?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          created_at?: string
          event_key?: string | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          payload?: Json
          payment_id?: string | null
          source?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
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
      billing_product_features: {
        Row: {
          billing_product_id: string
          created_at: string
          description: string | null
          feature_key: string
          id: string
          label: string | null
          updated_at: string
        }
        Insert: {
          billing_product_id: string
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          billing_product_id?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_product_features_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
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
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          reason_code: string | null
          reversal_of: string | null
          source: string | null
          tenant_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reason_code?: string | null
          reversal_of?: string | null
          source?: string | null
          tenant_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reason_code?: string | null
          reversal_of?: string | null
          source?: string | null
          tenant_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
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
      game_artifact_variants: {
        Row: {
          artifact_id: string
          body: string | null
          created_at: string
          id: string
          media_ref: string | null
          metadata: Json | null
          title: string | null
          updated_at: string
          variant_order: number
          visibility: string
          visible_to_role_id: string | null
        }
        Insert: {
          artifact_id: string
          body?: string | null
          created_at?: string
          id?: string
          media_ref?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          variant_order?: number
          visibility?: string
          visible_to_role_id?: string | null
        }
        Update: {
          artifact_id?: string
          body?: string | null
          created_at?: string
          id?: string
          media_ref?: string | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          variant_order?: number
          visibility?: string
          visible_to_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_artifact_variants_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "game_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_artifact_variants_media_ref_fkey"
            columns: ["media_ref"]
            isOneToOne: false
            referencedRelation: "game_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_artifact_variants_visible_to_role_id_fkey"
            columns: ["visible_to_role_id"]
            isOneToOne: false
            referencedRelation: "game_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_artifacts: {
        Row: {
          artifact_order: number
          artifact_type: string
          created_at: string
          description: string | null
          game_id: string
          id: string
          locale: string | null
          metadata: Json | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          artifact_order?: number
          artifact_type?: string
          created_at?: string
          description?: string | null
          game_id: string
          id?: string
          locale?: string | null
          metadata?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          artifact_order?: number
          artifact_type?: string
          created_at?: string
          description?: string | null
          game_id?: string
          id?: string
          locale?: string | null
          metadata?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_artifacts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_board_config: {
        Row: {
          background_color: string | null
          background_media_id: string | null
          created_at: string
          game_id: string
          id: string
          layout_variant: string | null
          locale: string | null
          show_current_phase: boolean | null
          show_game_name: boolean | null
          show_leaderboard: boolean | null
          show_participants: boolean | null
          show_public_roles: boolean | null
          show_qr_code: boolean | null
          show_timer: boolean | null
          theme: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          background_color?: string | null
          background_media_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          layout_variant?: string | null
          locale?: string | null
          show_current_phase?: boolean | null
          show_game_name?: boolean | null
          show_leaderboard?: boolean | null
          show_participants?: boolean | null
          show_public_roles?: boolean | null
          show_qr_code?: boolean | null
          show_timer?: boolean | null
          theme?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          background_color?: string | null
          background_media_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          layout_variant?: string | null
          locale?: string | null
          show_current_phase?: boolean | null
          show_game_name?: boolean | null
          show_leaderboard?: boolean | null
          show_participants?: boolean | null
          show_public_roles?: boolean | null
          show_qr_code?: boolean | null
          show_timer?: boolean | null
          theme?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_board_config_background_media_id_fkey"
            columns: ["background_media_id"]
            isOneToOne: false
            referencedRelation: "game_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_board_config_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_materials: {
        Row: {
          created_at: string
          game_id: string
          id: string
          items: string[] | null
          locale: string | null
          preparation: string | null
          safety_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          items?: string[] | null
          locale?: string | null
          preparation?: string | null
          safety_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          items?: string[] | null
          locale?: string | null
          preparation?: string | null
          safety_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_materials_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
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
      game_phases: {
        Row: {
          auto_advance: boolean | null
          board_message: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          game_id: string
          id: string
          locale: string | null
          name: string
          phase_order: number
          phase_type: string
          timer_style: string | null
          timer_visible: boolean | null
          updated_at: string
        }
        Insert: {
          auto_advance?: boolean | null
          board_message?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          game_id: string
          id?: string
          locale?: string | null
          name: string
          phase_order?: number
          phase_type?: string
          timer_style?: string | null
          timer_visible?: boolean | null
          updated_at?: string
        }
        Update: {
          auto_advance?: boolean | null
          board_message?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          game_id?: string
          id?: string
          locale?: string | null
          name?: string
          phase_order?: number
          phase_type?: string
          timer_style?: string | null
          timer_visible?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_phases_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_roles: {
        Row: {
          assignment_strategy: string
          color: string | null
          conflicts_with: string[] | null
          created_at: string
          game_id: string
          icon: string | null
          id: string
          locale: string | null
          max_count: number | null
          min_count: number
          name: string
          private_hints: string | null
          private_instructions: string
          public_description: string | null
          role_order: number
          scaling_rules: Json | null
          updated_at: string
        }
        Insert: {
          assignment_strategy?: string
          color?: string | null
          conflicts_with?: string[] | null
          created_at?: string
          game_id: string
          icon?: string | null
          id?: string
          locale?: string | null
          max_count?: number | null
          min_count?: number
          name: string
          private_hints?: string | null
          private_instructions: string
          public_description?: string | null
          role_order?: number
          scaling_rules?: Json | null
          updated_at?: string
        }
        Update: {
          assignment_strategy?: string
          color?: string | null
          conflicts_with?: string[] | null
          created_at?: string
          game_id?: string
          icon?: string | null
          id?: string
          locale?: string | null
          max_count?: number | null
          min_count?: number
          name?: string
          private_hints?: string | null
          private_instructions?: string
          public_description?: string | null
          role_order?: number
          scaling_rules?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_roles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
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
      game_snapshots: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          includes_artifacts: boolean
          includes_board_config: boolean
          includes_phases: boolean
          includes_roles: boolean
          includes_steps: boolean
          includes_triggers: boolean
          snapshot_data: Json
          version: number
          version_label: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          includes_artifacts?: boolean
          includes_board_config?: boolean
          includes_phases?: boolean
          includes_roles?: boolean
          includes_steps?: boolean
          includes_triggers?: boolean
          snapshot_data: Json
          version?: number
          version_label?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          includes_artifacts?: boolean
          includes_board_config?: boolean
          includes_phases?: boolean
          includes_roles?: boolean
          includes_steps?: boolean
          includes_triggers?: boolean
          snapshot_data?: Json
          version?: number
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_steps: {
        Row: {
          board_text: string | null
          body: string | null
          conditional: string | null
          created_at: string
          display_mode: string | null
          duration_seconds: number | null
          game_id: string
          id: string
          leader_script: string | null
          locale: string | null
          media_ref: string | null
          optional: boolean | null
          participant_prompt: string | null
          phase_id: string | null
          step_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          board_text?: string | null
          body?: string | null
          conditional?: string | null
          created_at?: string
          display_mode?: string | null
          duration_seconds?: number | null
          game_id: string
          id?: string
          leader_script?: string | null
          locale?: string | null
          media_ref?: string | null
          optional?: boolean | null
          participant_prompt?: string | null
          phase_id?: string | null
          step_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          board_text?: string | null
          body?: string | null
          conditional?: string | null
          created_at?: string
          display_mode?: string | null
          duration_seconds?: number | null
          game_id?: string
          id?: string
          leader_script?: string | null
          locale?: string | null
          media_ref?: string | null
          optional?: boolean | null
          participant_prompt?: string | null
          phase_id?: string | null
          step_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_game_steps_phase"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "game_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_steps_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_steps_media_ref_fkey"
            columns: ["media_ref"]
            isOneToOne: false
            referencedRelation: "game_media"
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
      game_triggers: {
        Row: {
          actions: Json
          condition: Json
          created_at: string
          delay_seconds: number | null
          description: string | null
          enabled: boolean
          execute_once: boolean
          game_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          condition: Json
          created_at?: string
          delay_seconds?: number | null
          description?: string | null
          enabled?: boolean
          execute_once?: boolean
          game_id: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          condition?: Json
          created_at?: string
          delay_seconds?: number | null
          description?: string | null
          enabled?: boolean
          execute_once?: boolean
          game_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_triggers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          accessibility_notes: string | null
          age_max: number | null
          age_min: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration_max: number | null
          energy_level: Database["public"]["Enums"]["energy_level_enum"] | null
          game_content_version: string | null
          game_key: string | null
          holiday_tags: string[] | null
          id: string
          instructions: string | null
          leader_tips: string | null
          location_type:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          main_purpose_id: string | null
          materials: string[] | null
          max_players: number | null
          min_players: number | null
          name: string
          owner_tenant_id: string | null
          play_mode: string | null
          players_recommended: number | null
          popularity_score: number
          product_id: string | null
          rating_average: number | null
          rating_count: number
          season_tags: string[] | null
          short_description: string | null
          space_requirements: string | null
          status: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min: number | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          accessibility_notes?: string | null
          age_max?: number | null
          age_min?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_max?: number | null
          energy_level?: Database["public"]["Enums"]["energy_level_enum"] | null
          game_content_version?: string | null
          game_key?: string | null
          holiday_tags?: string[] | null
          id?: string
          instructions?: string | null
          leader_tips?: string | null
          location_type?:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          main_purpose_id?: string | null
          materials?: string[] | null
          max_players?: number | null
          min_players?: number | null
          name: string
          owner_tenant_id?: string | null
          play_mode?: string | null
          players_recommended?: number | null
          popularity_score?: number
          product_id?: string | null
          rating_average?: number | null
          rating_count?: number
          season_tags?: string[] | null
          short_description?: string | null
          space_requirements?: string | null
          status?: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          accessibility_notes?: string | null
          age_max?: number | null
          age_min?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_max?: number | null
          energy_level?: Database["public"]["Enums"]["energy_level_enum"] | null
          game_content_version?: string | null
          game_key?: string | null
          holiday_tags?: string[] | null
          id?: string
          instructions?: string | null
          leader_tips?: string | null
          location_type?:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          main_purpose_id?: string | null
          materials?: string[] | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          owner_tenant_id?: string | null
          play_mode?: string | null
          players_recommended?: number | null
          popularity_score?: number
          product_id?: string | null
          rating_average?: number | null
          rating_count?: number
          season_tags?: string[] | null
          short_description?: string | null
          space_requirements?: string | null
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
      gamification_admin_award_recipients: {
        Row: {
          award_id: string
          balance_after: number | null
          coin_transaction_id: string | null
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          award_id: string
          balance_after?: number | null
          coin_transaction_id?: string | null
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          award_id?: string
          balance_after?: number | null
          coin_transaction_id?: string | null
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_admin_award_recipients_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "gamification_admin_awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_recipients_coin_transaction_id_fkey"
            columns: ["coin_transaction_id"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_admin_award_request_recipients: {
        Row: {
          created_at: string
          id: string
          request_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_admin_award_request_recipients_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "gamification_admin_award_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_request_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_request_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_admin_award_requests: {
        Row: {
          amount: number
          award_id: string | null
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          id: string
          idempotency_key: string
          message: string | null
          requester_user_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          award_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          id?: string
          idempotency_key: string
          message?: string | null
          requester_user_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          award_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          id?: string
          idempotency_key?: string
          message?: string | null
          requester_user_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_admin_award_requests_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "gamification_admin_awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_requests_decided_by_user_id_fkey"
            columns: ["decided_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_award_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_admin_awards: {
        Row: {
          actor_user_id: string | null
          amount: number
          award_type: string
          created_at: string
          id: string
          idempotency_key: string
          message: string | null
          source: string
          tenant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          amount: number
          award_type: string
          created_at?: string
          id?: string
          idempotency_key: string
          message?: string | null
          source?: string
          tenant_id: string
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          award_type?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          message?: string | null
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_admin_awards_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_admin_awards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_automation_rules: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          event_type: string
          id: string
          is_active: boolean
          name: string
          reward_amount: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          name: string
          reward_amount: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          name?: string
          reward_amount?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_automation_rules_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_campaign_templates: {
        Row: {
          bonus_amount: number
          budget_amount: number | null
          created_at: string
          created_by_user_id: string | null
          duration_days: number
          event_type: string
          id: string
          is_active_default: boolean
          label: string
          name: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          bonus_amount: number
          budget_amount?: number | null
          created_at?: string
          created_by_user_id?: string | null
          duration_days: number
          event_type: string
          id?: string
          is_active_default?: boolean
          label: string
          name: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          bonus_amount?: number
          budget_amount?: number | null
          created_at?: string
          created_by_user_id?: string | null
          duration_days?: number
          event_type?: string
          id?: string
          is_active_default?: boolean
          label?: string
          name?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_campaign_templates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_campaign_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_campaigns: {
        Row: {
          bonus_amount: number
          budget_amount: number | null
          created_at: string
          created_by_user_id: string | null
          ends_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          is_active: boolean
          name: string
          source_template_id: string | null
          spent_amount: number
          starts_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bonus_amount: number
          budget_amount?: number | null
          created_at?: string
          created_by_user_id?: string | null
          ends_at: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          is_active?: boolean
          name: string
          source_template_id?: string | null
          spent_amount?: number
          starts_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bonus_amount?: number
          budget_amount?: number | null
          created_at?: string
          created_by_user_id?: string | null
          ends_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          is_active?: boolean
          name?: string
          source_template_id?: string | null
          spent_amount?: number
          starts_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_campaigns_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_campaigns_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "gamification_campaign_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_daily_summaries: {
        Row: {
          automation_total: number
          awards_count: number
          awards_total: number
          campaign_bonus_total: number
          day: string
          earned: number
          events_count: number
          purchases_count: number
          purchases_spent: number
          spent: number
          tenant_id: string
          tx_count: number
          updated_at: string
        }
        Insert: {
          automation_total?: number
          awards_count?: number
          awards_total?: number
          campaign_bonus_total?: number
          day: string
          earned?: number
          events_count?: number
          purchases_count?: number
          purchases_spent?: number
          spent?: number
          tenant_id: string
          tx_count?: number
          updated_at?: string
        }
        Update: {
          automation_total?: number
          awards_count?: number
          awards_total?: number
          campaign_bonus_total?: number
          day?: string
          earned?: number
          events_count?: number
          purchases_count?: number
          purchases_spent?: number
          spent?: number
          tenant_id?: string
          tx_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_daily_summaries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_events: {
        Row: {
          actor_user_id: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json | null
          source: string
          tenant_id: string | null
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json | null
          source: string
          tenant_id?: string | null
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          source?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gamification_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_level_definitions: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string | null
          next_level_xp: number
          next_reward: string | null
          reward_asset_key: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          name?: string | null
          next_level_xp?: number
          next_reward?: string | null
          reward_asset_key?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string | null
          next_level_xp?: number
          next_reward?: string | null
          reward_asset_key?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_level_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      leader_profile: {
        Row: {
          created_at: string
          display_achievement_ids: string[]
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_achievement_ids?: string[]
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_achievement_ids?: string[]
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_profile_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          metadata: Json | null
          name: string
          product_id: string | null
          purpose_id: string | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["media_type_enum"]
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          media_key?: string | null
          metadata?: Json | null
          name: string
          product_id?: string | null
          purpose_id?: string | null
          tenant_id?: string | null
          type: Database["public"]["Enums"]["media_type_enum"]
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          media_key?: string | null
          metadata?: Json | null
          name?: string
          product_id?: string | null
          purpose_id?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "media_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_ai_generations: {
        Row: {
          completed_at: string | null
          cost_credits: number | null
          created_at: string
          error_message: string | null
          generation_time_ms: number | null
          id: string
          media_id: string
          model: string
          model_version: string | null
          parameters: Json | null
          prompt: string
          revision: number
          seed: number | null
          status: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          media_id: string
          model: string
          model_version?: string | null
          parameters?: Json | null
          prompt: string
          revision?: number
          seed?: number | null
          status?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          cost_credits?: number | null
          created_at?: string
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          media_id?: string
          model?: string
          model_version?: string | null
          parameters?: Json | null
          prompt?: string
          revision?: number
          seed?: number | null
          status?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_ai_generations_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_ai_generations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          main_purpose_id: string | null
          media_id: string
          name: string
          priority: number
          product_id: string | null
          sub_purpose_id: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          main_purpose_id?: string | null
          media_id: string
          name: string
          priority?: number
          product_id?: string | null
          sub_purpose_id?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          main_purpose_id?: string | null
          media_id?: string
          name?: string
          priority?: number
          product_id?: string | null
          sub_purpose_id?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_templates_main_purpose_id_fkey"
            columns: ["main_purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_templates_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_templates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_templates_sub_purpose_id_fkey"
            columns: ["sub_purpose_id"]
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
      participant_achievement_unlocks: {
        Row: {
          achievement_id: string
          achievement_name: string
          achievement_points: number | null
          game_progress_id: string | null
          id: string
          participant_id: string
          rarity: string | null
          session_id: string
          tenant_id: string
          unlock_context: Json | null
          unlocked_at: string | null
        }
        Insert: {
          achievement_id: string
          achievement_name: string
          achievement_points?: number | null
          game_progress_id?: string | null
          id?: string
          participant_id: string
          rarity?: string | null
          session_id: string
          tenant_id: string
          unlock_context?: Json | null
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string
          achievement_name?: string
          achievement_points?: number | null
          game_progress_id?: string | null
          id?: string
          participant_id?: string
          rarity?: string | null
          session_id?: string
          tenant_id?: string
          unlock_context?: Json | null
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_achievement_unlocks_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_achievement_unlocks_game_progress_id_fkey"
            columns: ["game_progress_id"]
            isOneToOne: false
            referencedRelation: "participant_game_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_achievement_unlocks_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_achievement_unlocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_achievement_unlocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_activity_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          participant_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          participant_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          participant_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_activity_log_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_game_progress: {
        Row: {
          achievement_count: number | null
          achievements_unlocked: string[] | null
          completed_at: string | null
          created_at: string | null
          current_checkpoint: string | null
          current_level: number | null
          game_data: Json | null
          game_id: string
          id: string
          last_updated_at: string | null
          max_score: number | null
          participant_id: string
          progress_percentage: number | null
          score: number | null
          session_id: string
          started_at: string | null
          status: string
          tenant_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          achievement_count?: number | null
          achievements_unlocked?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          current_checkpoint?: string | null
          current_level?: number | null
          game_data?: Json | null
          game_id: string
          id?: string
          last_updated_at?: string | null
          max_score?: number | null
          participant_id: string
          progress_percentage?: number | null
          score?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          tenant_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          achievement_count?: number | null
          achievements_unlocked?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          current_checkpoint?: string | null
          current_level?: number | null
          game_data?: Json | null
          game_id?: string
          id?: string
          last_updated_at?: string | null
          max_score?: number | null
          participant_id?: string
          progress_percentage?: number | null
          score?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_game_progress_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_game_progress_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_game_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_game_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          participant_id: string
          revealed_at: string | null
          secret_instructions_revealed_at: string | null
          session_id: string
          session_role_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          participant_id: string
          revealed_at?: string | null
          secret_instructions_revealed_at?: string | null
          session_id: string
          session_role_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          participant_id?: string
          revealed_at?: string | null
          secret_instructions_revealed_at?: string | null
          session_id?: string
          session_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_role_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_role_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_role_assignments_session_role_id_fkey"
            columns: ["session_role_id"]
            isOneToOne: false
            referencedRelation: "session_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_sessions: {
        Row: {
          archived_at: string | null
          board_state: Json | null
          created_at: string
          current_phase_index: number | null
          current_step_index: number | null
          description: string | null
          display_name: string
          ended_at: string | null
          expires_at: string | null
          game_id: string | null
          game_snapshot_id: string | null
          host_user_id: string
          id: string
          participant_count: number
          paused_at: string | null
          plan_id: string | null
          secret_instructions_unlocked_at: string | null
          secret_instructions_unlocked_by: string | null
          session_code: string
          settings: Json
          started_at: string
          status: Database["public"]["Enums"]["participant_session_status"]
          tenant_id: string
          timer_state: Json | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          board_state?: Json | null
          created_at?: string
          current_phase_index?: number | null
          current_step_index?: number | null
          description?: string | null
          display_name: string
          ended_at?: string | null
          expires_at?: string | null
          game_id?: string | null
          game_snapshot_id?: string | null
          host_user_id: string
          id?: string
          participant_count?: number
          paused_at?: string | null
          plan_id?: string | null
          secret_instructions_unlocked_at?: string | null
          secret_instructions_unlocked_by?: string | null
          session_code: string
          settings?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["participant_session_status"]
          tenant_id: string
          timer_state?: Json | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          board_state?: Json | null
          created_at?: string
          current_phase_index?: number | null
          current_step_index?: number | null
          description?: string | null
          display_name?: string
          ended_at?: string | null
          expires_at?: string | null
          game_id?: string | null
          game_snapshot_id?: string | null
          host_user_id?: string
          id?: string
          participant_count?: number
          paused_at?: string | null
          plan_id?: string | null
          secret_instructions_unlocked_at?: string | null
          secret_instructions_unlocked_by?: string | null
          session_code?: string
          settings?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["participant_session_status"]
          tenant_id?: string
          timer_state?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_sessions_game_snapshot_id_fkey"
            columns: ["game_snapshot_id"]
            isOneToOne: false
            referencedRelation: "game_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_token_quotas: {
        Row: {
          created_at: string
          id: string
          no_expiry_tokens_limit: number
          no_expiry_tokens_used: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          no_expiry_tokens_limit?: number
          no_expiry_tokens_used?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          no_expiry_tokens_limit?: number
          no_expiry_tokens_used?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_token_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          avatar_url: string | null
          created_at: string
          disconnected_at: string | null
          display_name: string
          id: string
          ip_address: unknown
          joined_at: string
          last_seen_at: string
          participant_token: string
          progress: Json
          role: Database["public"]["Enums"]["participant_role"]
          session_id: string
          status: Database["public"]["Enums"]["participant_status"]
          token_expires_at: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          disconnected_at?: string | null
          display_name: string
          id?: string
          ip_address?: unknown
          joined_at?: string
          last_seen_at?: string
          participant_token: string
          progress?: Json
          role?: Database["public"]["Enums"]["participant_role"]
          session_id: string
          status?: Database["public"]["Enums"]["participant_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          disconnected_at?: string | null
          display_name?: string
          id?: string
          ip_address?: unknown
          joined_at?: string
          last_seen_at?: string
          participant_token?: string
          progress?: Json
          role?: Database["public"]["Enums"]["participant_role"]
          session_id?: string
          status?: Database["public"]["Enums"]["participant_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
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
      plan_version_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["plan_block_type_enum"]
          duration_minutes: number
          game_id: string | null
          game_snapshot: Json | null
          id: string
          is_optional: boolean | null
          metadata: Json | null
          notes: string | null
          plan_version_id: string
          position: number
          title: string | null
        }
        Insert: {
          block_type: Database["public"]["Enums"]["plan_block_type_enum"]
          duration_minutes?: number
          game_id?: string | null
          game_snapshot?: Json | null
          id?: string
          is_optional?: boolean | null
          metadata?: Json | null
          notes?: string | null
          plan_version_id: string
          position: number
          title?: string | null
        }
        Update: {
          block_type?: Database["public"]["Enums"]["plan_block_type_enum"]
          duration_minutes?: number
          game_id?: string | null
          game_snapshot?: Json | null
          id?: string
          is_optional?: boolean | null
          metadata?: Json | null
          notes?: string | null
          plan_version_id?: string
          position?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_version_blocks_plan_version_id_fkey"
            columns: ["plan_version_id"]
            isOneToOne: false
            referencedRelation: "plan_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          description: string | null
          id: string
          metadata: Json | null
          name: string
          plan_id: string
          published_at: string
          published_by: string
          total_time_minutes: number
          version_number: number
        }
        Insert: {
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          plan_id: string
          published_at?: string
          published_by: string
          total_time_minutes?: number
          version_number: number
        }
        Update: {
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          plan_id?: string
          published_at?: string
          published_by?: string
          total_time_minutes?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          owner_tenant_id: string | null
          owner_user_id: string
          plan_key: string | null
          status: string
          total_time_minutes: number | null
          updated_at: string
          updated_by: string | null
          visibility: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_tenant_id?: string | null
          owner_user_id: string
          plan_key?: string | null
          status?: string
          total_time_minutes?: number | null
          updated_at?: string
          updated_by?: string | null
          visibility?: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_tenant_id?: string | null
          owner_user_id?: string
          plan_key?: string | null
          status?: string
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
            foreignKeyName: "plans_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "plan_versions"
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
      play_chat_messages: {
        Row: {
          anonymous: boolean
          created_at: string
          id: string
          message: string
          sender_name: string
          sender_participant_id: string | null
          sender_user_id: string | null
          session_id: string
          visibility: string
        }
        Insert: {
          anonymous?: boolean
          created_at?: string
          id?: string
          message: string
          sender_name: string
          sender_participant_id?: string | null
          sender_user_id?: string | null
          session_id: string
          visibility: string
        }
        Update: {
          anonymous?: boolean
          created_at?: string
          id?: string
          message?: string
          sender_name?: string
          sender_participant_id?: string | null
          sender_user_id?: string | null
          session_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_chat_messages_sender_participant_id_fkey"
            columns: ["sender_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
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
          stripe_subscription_id: string | null
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
          stripe_subscription_id?: string | null
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
          stripe_subscription_id?: string | null
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
          capabilities: Json
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
          capabilities?: Json
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
          capabilities?: Json
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
          is_standard: boolean
          name: string
          parent_id: string | null
          purpose_key: string | null
          tenant_id: string | null
          type: Database["public"]["Enums"]["purpose_type_enum"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_standard?: boolean
          name: string
          parent_id?: string | null
          purpose_key?: string | null
          tenant_id?: string | null
          type: Database["public"]["Enums"]["purpose_type_enum"]
        }
        Update: {
          created_at?: string
          id?: string
          is_standard?: boolean
          name?: string
          parent_id?: string | null
          purpose_key?: string | null
          tenant_id?: string | null
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
          {
            foreignKeyName: "purposes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          elapsed_seconds: number | null
          id: string
          metadata: Json | null
          plan_version_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["plan_run_status_enum"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          elapsed_seconds?: number | null
          id?: string
          metadata?: Json | null
          plan_version_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["plan_run_status_enum"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          elapsed_seconds?: number | null
          id?: string
          metadata?: Json | null
          plan_version_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["plan_run_status_enum"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_plan_version_id_fkey"
            columns: ["plan_version_id"]
            isOneToOne: false
            referencedRelation: "plan_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      session_artifact_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          participant_id: string
          session_artifact_variant_id: string
          session_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          participant_id: string
          session_artifact_variant_id: string
          session_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          participant_id?: string
          session_artifact_variant_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_artifact_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifact_assignments_session_artifact_variant_id_fkey"
            columns: ["session_artifact_variant_id"]
            isOneToOne: false
            referencedRelation: "session_artifact_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifact_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_artifact_variants: {
        Row: {
          body: string | null
          created_at: string
          highlighted_at: string | null
          id: string
          media_ref: string | null
          metadata: Json | null
          revealed_at: string | null
          session_artifact_id: string
          source_variant_id: string | null
          title: string | null
          variant_order: number
          visibility: string
          visible_to_session_role_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          highlighted_at?: string | null
          id?: string
          media_ref?: string | null
          metadata?: Json | null
          revealed_at?: string | null
          session_artifact_id: string
          source_variant_id?: string | null
          title?: string | null
          variant_order?: number
          visibility?: string
          visible_to_session_role_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          highlighted_at?: string | null
          id?: string
          media_ref?: string | null
          metadata?: Json | null
          revealed_at?: string | null
          session_artifact_id?: string
          source_variant_id?: string | null
          title?: string | null
          variant_order?: number
          visibility?: string
          visible_to_session_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_artifact_variants_media_ref_fkey"
            columns: ["media_ref"]
            isOneToOne: false
            referencedRelation: "game_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifact_variants_session_artifact_id_fkey"
            columns: ["session_artifact_id"]
            isOneToOne: false
            referencedRelation: "session_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifact_variants_source_variant_id_fkey"
            columns: ["source_variant_id"]
            isOneToOne: false
            referencedRelation: "game_artifact_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifact_variants_visible_to_session_role_id_fkey"
            columns: ["visible_to_session_role_id"]
            isOneToOne: false
            referencedRelation: "session_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_artifacts: {
        Row: {
          artifact_order: number
          artifact_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          session_id: string
          source_artifact_id: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          artifact_order?: number
          artifact_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          source_artifact_id?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          artifact_order?: number
          artifact_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          source_artifact_id?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifacts_source_artifact_id_fkey"
            columns: ["source_artifact_id"]
            isOneToOne: false
            referencedRelation: "game_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_decisions: {
        Row: {
          allow_anonymous: boolean
          allow_multiple: boolean
          closed_at: string | null
          created_at: string
          created_by: string | null
          decision_type: string
          id: string
          max_choices: number
          opened_at: string | null
          options: Json
          phase_index: number | null
          prompt: string | null
          revealed_at: string | null
          session_id: string
          status: string
          step_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_anonymous?: boolean
          allow_multiple?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          decision_type?: string
          id?: string
          max_choices?: number
          opened_at?: string | null
          options?: Json
          phase_index?: number | null
          prompt?: string | null
          revealed_at?: string | null
          session_id: string
          status?: string
          step_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_anonymous?: boolean
          allow_multiple?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          decision_type?: string
          id?: string
          max_choices?: number
          opened_at?: string | null
          options?: Json
          phase_index?: number | null
          prompt?: string | null
          revealed_at?: string | null
          session_id?: string
          status?: string
          step_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          actor_participant_id: string | null
          actor_type: string
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          event_category: string
          event_data: Json | null
          event_type: string
          id: string
          parent_event_id: string | null
          payload: Json | null
          session_id: string
          severity: string
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          actor_participant_id?: string | null
          actor_type?: string
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          parent_event_id?: string | null
          payload?: Json | null
          session_id: string
          severity?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          actor_participant_id?: string | null
          actor_type?: string
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          parent_event_id?: string | null
          payload?: Json | null
          session_id?: string
          severity?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_events_actor_participant_id_fkey"
            columns: ["actor_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_outcomes: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          outcome_type: string
          phase_index: number | null
          related_decision_id: string | null
          revealed_at: string | null
          session_id: string
          step_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          outcome_type?: string
          phase_index?: number | null
          related_decision_id?: string | null
          revealed_at?: string | null
          session_id: string
          step_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          outcome_type?: string
          phase_index?: number | null
          related_decision_id?: string | null
          revealed_at?: string | null
          session_id?: string
          step_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_outcomes_related_decision_id_fkey"
            columns: ["related_decision_id"]
            isOneToOne: false
            referencedRelation: "session_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_outcomes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_roles: {
        Row: {
          assigned_count: number
          assignment_strategy: string
          color: string | null
          conflicts_with: string[] | null
          created_at: string
          icon: string | null
          id: string
          max_count: number | null
          min_count: number
          name: string
          private_hints: string | null
          private_instructions: string
          public_description: string | null
          role_order: number
          scaling_rules: Json | null
          session_id: string
          source_role_id: string | null
        }
        Insert: {
          assigned_count?: number
          assignment_strategy?: string
          color?: string | null
          conflicts_with?: string[] | null
          created_at?: string
          icon?: string | null
          id?: string
          max_count?: number | null
          min_count?: number
          name: string
          private_hints?: string | null
          private_instructions: string
          public_description?: string | null
          role_order?: number
          scaling_rules?: Json | null
          session_id: string
          source_role_id?: string | null
        }
        Update: {
          assigned_count?: number
          assignment_strategy?: string
          color?: string | null
          conflicts_with?: string[] | null
          created_at?: string
          icon?: string | null
          id?: string
          max_count?: number | null
          min_count?: number
          name?: string
          private_hints?: string | null
          private_instructions?: string
          public_description?: string | null
          role_order?: number
          scaling_rules?: Json | null
          session_id?: string
          source_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_roles_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_roles_source_role_id_fkey"
            columns: ["source_role_id"]
            isOneToOne: false
            referencedRelation: "game_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_signals: {
        Row: {
          channel: string
          created_at: string
          id: string
          payload: Json
          sender_participant_id: string | null
          sender_user_id: string | null
          session_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          payload?: Json
          sender_participant_id?: string | null
          sender_user_id?: string | null
          session_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          payload?: Json
          sender_participant_id?: string | null
          sender_user_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_signals_sender_participant_id_fkey"
            columns: ["sender_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_statistics: {
        Row: {
          active_participants: number | null
          average_score: number | null
          average_time_per_participant_seconds: number | null
          calculated_at: string | null
          created_at: string | null
          games_completed: number | null
          games_started: number | null
          id: string
          most_achievements: Json | null
          session_id: string
          tenant_id: string
          top_scorers: Json | null
          total_achievements_unlocked: number | null
          total_participants: number | null
          total_score: number | null
          total_time_played_seconds: number | null
          unique_achievements_unlocked: number | null
        }
        Insert: {
          active_participants?: number | null
          average_score?: number | null
          average_time_per_participant_seconds?: number | null
          calculated_at?: string | null
          created_at?: string | null
          games_completed?: number | null
          games_started?: number | null
          id?: string
          most_achievements?: Json | null
          session_id: string
          tenant_id: string
          top_scorers?: Json | null
          total_achievements_unlocked?: number | null
          total_participants?: number | null
          total_score?: number | null
          total_time_played_seconds?: number | null
          unique_achievements_unlocked?: number | null
        }
        Update: {
          active_participants?: number | null
          average_score?: number | null
          average_time_per_participant_seconds?: number | null
          calculated_at?: string | null
          created_at?: string | null
          games_completed?: number | null
          games_started?: number | null
          id?: string
          most_achievements?: Json | null
          session_id?: string
          tenant_id?: string
          top_scorers?: Json | null
          total_achievements_unlocked?: number | null
          total_participants?: number | null
          total_score?: number | null
          total_time_played_seconds?: number | null
          unique_achievements_unlocked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_statistics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_statistics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_time_bank: {
        Row: {
          balance_seconds: number
          session_id: string
          updated_at: string
        }
        Insert: {
          balance_seconds?: number
          session_id: string
          updated_at?: string
        }
        Update: {
          balance_seconds?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_time_bank_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_time_bank_ledger: {
        Row: {
          actor_participant_id: string | null
          actor_user_id: string | null
          created_at: string
          delta_seconds: number
          event_id: string | null
          id: string
          metadata: Json
          reason: string
          session_id: string
        }
        Insert: {
          actor_participant_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          delta_seconds: number
          event_id?: string | null
          id?: string
          metadata?: Json
          reason: string
          session_id: string
        }
        Update: {
          actor_participant_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          delta_seconds?: number
          event_id?: string | null
          id?: string
          metadata?: Json
          reason?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_time_bank_ledger_actor_participant_id_fkey"
            columns: ["actor_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_time_bank_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "session_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_time_bank_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_triggers: {
        Row: {
          actions: Json
          condition: Json
          created_at: string
          delay_seconds: number | null
          description: string | null
          enabled: boolean
          error_count: number
          execute_once: boolean
          fired_at: string | null
          fired_count: number
          id: string
          last_error: string | null
          last_error_at: string | null
          name: string
          session_id: string
          sort_order: number
          source_trigger_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          condition: Json
          created_at?: string
          delay_seconds?: number | null
          description?: string | null
          enabled?: boolean
          error_count?: number
          execute_once?: boolean
          fired_at?: string | null
          fired_count?: number
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          name: string
          session_id: string
          sort_order?: number
          source_trigger_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          condition?: Json
          created_at?: string
          delay_seconds?: number | null
          description?: string | null
          enabled?: boolean
          error_count?: number
          execute_once?: boolean
          fired_at?: string | null
          fired_count?: number
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          name?: string
          session_id?: string
          sort_order?: number
          source_trigger_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_triggers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_triggers_source_trigger_id_fkey"
            columns: ["source_trigger_id"]
            isOneToOne: false
            referencedRelation: "game_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_votes: {
        Row: {
          created_at: string
          decision_id: string
          id: string
          option_key: string
          participant_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          decision_id: string
          id?: string
          option_key: string
          participant_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          decision_id?: string
          id?: string
          option_key?: string
          participant_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "session_votes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "session_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_votes_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
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
      subscription_items: {
        Row: {
          billing_product_id: string
          created_at: string
          id: string
          metadata: Json
          quantity: number
          subscription_id: string
          updated_at: string
        }
        Insert: {
          billing_product_id: string
          created_at?: string
          id?: string
          metadata?: Json
          quantity?: number
          subscription_id: string
          updated_at?: string
        }
        Update: {
          billing_product_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          quantity?: number
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
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
          stripe_subscription_id: string | null
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
          stripe_subscription_id?: string | null
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
          stripe_subscription_id?: string | null
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
      user_audit_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          id: string
          tenant_id: string | null
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_coins_user_id_fkey"
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
      user_devices: {
        Row: {
          device_fingerprint: string | null
          device_type: string | null
          first_seen_at: string | null
          id: string
          ip_last: unknown
          last_seen_at: string | null
          metadata: Json | null
          risk_score: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_fingerprint?: string | null
          device_type?: string | null
          first_seen_at?: string | null
          id?: string
          ip_last?: unknown
          last_seen_at?: string | null
          metadata?: Json | null
          risk_score?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_fingerprint?: string | null
          device_type?: string | null
          first_seen_at?: string | null
          id?: string
          ip_last?: unknown
          last_seen_at?: string | null
          metadata?: Json | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mfa: {
        Row: {
          created_at: string
          enforced_reason: string | null
          enrolled_at: string | null
          last_verified_at: string | null
          methods: Json | null
          recovery_codes_hashed: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enforced_reason?: string | null
          enrolled_at?: string | null
          last_verified_at?: string | null
          methods?: Json | null
          recovery_codes_hashed?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enforced_reason?: string | null
          enrolled_at?: string | null
          last_verified_at?: string | null
          methods?: Json | null
          recovery_codes_hashed?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mfa_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_powerup_consumptions: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          shop_item_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_powerup_consumptions_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_consumptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_consumptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_powerup_effects: {
        Row: {
          consumption_id: string
          created_at: string
          effect_type: string
          expires_at: string
          id: string
          multiplier: number
          shop_item_id: string
          starts_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          consumption_id: string
          created_at?: string
          effect_type: string
          expires_at: string
          id?: string
          multiplier?: number
          shop_item_id: string
          starts_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          consumption_id?: string
          created_at?: string
          effect_type?: string
          expires_at?: string
          id?: string
          multiplier?: number
          shop_item_id?: string
          starts_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_powerup_effects_consumption_id_fkey"
            columns: ["consumption_id"]
            isOneToOne: false
            referencedRelation: "user_powerup_consumptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_effects_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_effects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_effects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_powerup_inventory: {
        Row: {
          created_at: string
          id: string
          quantity: number
          shop_item_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          shop_item_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          shop_item_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_powerup_inventory_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_powerup_inventory_user_id_fkey"
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
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          job_title: string | null
          locale: string | null
          metadata: Json | null
          organisation: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          job_title?: string | null
          locale?: string | null
          metadata?: Json | null
          organisation?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          job_title?: string | null
          locale?: string | null
          metadata?: Json | null
          organisation?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          current_xp: number
          id: string
          level: number
          next_level_xp: number
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_xp?: number
          id?: string
          level?: number
          next_level_xp?: number
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_xp?: number
          id?: string
          level?: number
          next_level_xp?: number
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_purchases: {
        Row: {
          coin_transaction_id: string | null
          created_at: string | null
          currency_id: string
          gifted_from_user_id: string | null
          id: string
          idempotency_key: string | null
          is_gift: boolean | null
          price_paid: number
          quantity: number | null
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          coin_transaction_id?: string | null
          created_at?: string | null
          currency_id: string
          gifted_from_user_id?: string | null
          id?: string
          idempotency_key?: string | null
          is_gift?: boolean | null
          price_paid: number
          quantity?: number | null
          shop_item_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          coin_transaction_id?: string | null
          created_at?: string | null
          currency_id?: string
          gifted_from_user_id?: string | null
          id?: string
          idempotency_key?: string | null
          is_gift?: boolean | null
          price_paid?: number
          quantity?: number | null
          shop_item_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_coin_transaction_id_fkey"
            columns: ["coin_transaction_id"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
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
      user_sessions: {
        Row: {
          device_id: string | null
          id: string
          ip: unknown
          last_login_at: string | null
          last_seen_at: string | null
          revoked_at: string | null
          risk_flags: Json | null
          supabase_session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_id?: string | null
          id?: string
          ip?: unknown
          last_login_at?: string | null
          last_seen_at?: string | null
          revoked_at?: string | null
          risk_flags?: Json | null
          supabase_session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_id?: string | null
          id?: string
          ip?: unknown
          last_login_at?: string | null
          last_seen_at?: string | null
          revoked_at?: string | null
          risk_flags?: Json | null
          supabase_session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          best_streak_days: number
          created_at: string
          current_streak_days: number
          id: string
          last_active_date: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak_days?: number
          created_at?: string
          current_streak_days?: number
          id?: string
          last_active_date?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak_days?: number
          created_at?: string
          current_streak_days?: number
          id?: string
          last_active_date?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_streaks_user_id_fkey"
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
          email_verified: boolean | null
          full_name: string | null
          global_role: Database["public"]["Enums"]["global_role_enum"] | null
          id: string
          language: Database["public"]["Enums"]["language_code_enum"]
          mfa_enforced: boolean | null
          preferred_theme: string | null
          role: string
          show_theme_toggle_in_header: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role_enum"] | null
          id: string
          language?: Database["public"]["Enums"]["language_code_enum"]
          mfa_enforced?: boolean | null
          preferred_theme?: string | null
          role?: string
          show_theme_toggle_in_header?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          global_role?: Database["public"]["Enums"]["global_role_enum"] | null
          id?: string
          language?: Database["public"]["Enums"]["language_code_enum"]
          mfa_enforced?: boolean | null
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
      session_artifact_state: {
        Row: {
          highlighted_variant_id: string | null
          last_highlighted_at: string | null
          last_revealed_at: string | null
          revealed_variant_ids: string[] | null
          session_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "participant_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenant_memberships: {
        Row: {
          created_at: string | null
          id: string | null
          is_primary: boolean | null
          role: Database["public"]["Enums"]["tenant_role_enum"] | null
          seat_assignment_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["tenant_role_enum"] | null
          seat_assignment_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["tenant_role_enum"] | null
          seat_assignment_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      admin_award_coins_v1: {
        Args: {
          p_actor_user_id: string
          p_amount: number
          p_idempotency_key: string
          p_message: string
          p_target_user_ids: string[]
          p_tenant_id: string
        }
        Returns: {
          award_id: string
          balance: number
          coin_transaction_id: string
          recipient_user_id: string
        }[]
      }
      admin_decide_award_request_v1: {
        Args: {
          p_action: string
          p_decider_user_id: string
          p_request_id: string
        }
        Returns: {
          award_id: string
          awarded_count: number
          request_id: string
          status: string
        }[]
      }
      admin_get_campaign_analytics_v1: {
        Args: {
          p_campaign_id: string
          p_tenant_id: string
          p_window_days?: number
        }
        Returns: {
          campaign_id: string
          daily: Json
          since: string
          tenant_id: string
          totals: Json
          window_days: number
        }[]
      }
      admin_get_gamification_analytics_v1: {
        Args: { p_tenant_id: string; p_window_days?: number }
        Returns: {
          awards: Json
          economy: Json
          events: Json
          shop: Json
          since: string
          tenant_id: string
          window_days: number
        }[]
      }
      admin_get_gamification_analytics_v2: {
        Args: { p_tenant_id: string; p_window_days?: number }
        Returns: {
          awards: Json
          campaigns: Json
          economy: Json
          events: Json
          shop: Json
          since: string
          tenant_id: string
          window_days: number
        }[]
      }
      admin_get_gamification_analytics_v3: {
        Args: { p_tenant_id: string; p_window_days?: number }
        Returns: {
          automations: Json
          awards: Json
          campaigns: Json
          economy: Json
          events: Json
          shop: Json
          since: string
          tenant_id: string
          window_days: number
        }[]
      }
      admin_get_gamification_analytics_v4: {
        Args: { p_tenant_id: string; p_window_days?: number }
        Returns: {
          anomalies: Json
          automations: Json
          awards: Json
          campaigns: Json
          economy: Json
          events: Json
          shop: Json
          since: string
          tenant_id: string
          window_days: number
        }[]
      }
      admin_get_gamification_analytics_v5: {
        Args: { p_tenant_id: string; p_window_days?: number }
        Returns: {
          anomalies: Json
          automations: Json
          awards: Json
          campaigns: Json
          economy: Json
          events: Json
          shop: Json
          since: string
          tenant_id: string
          window_days: number
        }[]
      }
      admin_request_award_coins_v1: {
        Args: {
          p_actor_user_id: string
          p_amount: number
          p_idempotency_key: string
          p_message: string
          p_target_user_ids: string[]
          p_tenant_id: string
        }
        Returns: {
          recipient_count: number
          request_id: string
          status: string
        }[]
      }
      apply_automation_rule_reward_v1: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_idempotency_key: string
          p_rule_id: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          applied: boolean
          balance: number
          coin_transaction_id: string
          reward_amount: number
        }[]
      }
      apply_campaign_bonus_v1: {
        Args: {
          p_campaign_id: string
          p_event_id: string
          p_event_type: string
          p_idempotency_key: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          applied: boolean
          balance: number
          bonus_amount: number
          coin_transaction_id: string
        }[]
      }
      apply_coin_transaction_v1: {
        Args: {
          p_amount: number
          p_description?: string
          p_idempotency_key: string
          p_metadata?: Json
          p_reason_code: string
          p_source?: string
          p_tenant_id: string
          p_type: string
          p_user_id: string
        }
        Returns: {
          balance: number
          transaction_id: string
        }[]
      }
      attempt_keypad_unlock: {
        Args: {
          p_artifact_id: string
          p_entered_code: string
          p_participant_id: string
          p_participant_name?: string
        }
        Returns: Json
      }
      consume_powerup_v1: {
        Args: {
          p_idempotency_key: string
          p_shop_item_id: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          remaining_quantity: number
        }[]
      }
      create_game_snapshot: {
        Args: {
          p_created_by?: string
          p_game_id: string
          p_version_label?: string
        }
        Returns: string
      }
      create_gamification_campaign_from_template_v1: {
        Args: {
          p_actor_user_id?: string
          p_idempotency_key?: string
          p_starts_at?: string
          p_template_id: string
          p_tenant_id: string
        }
        Returns: {
          campaign_id: string
          created: boolean
        }[]
      }
      create_session_with_snapshot: {
        Args: {
          p_game_id: string
          p_host_user_id: string
          p_join_code?: string
          p_settings?: Json
        }
        Returns: {
          join_code: string
          session_id: string
          snapshot_id: string
        }[]
      }
      get_active_coin_multiplier_v1: {
        Args: { p_at: string; p_tenant_id: string; p_user_id: string }
        Returns: {
          effect_id: string
          multiplier: number
        }[]
      }
      get_gamification_level_definitions_v1: {
        Args: { p_tenant_id?: string }
        Returns: {
          level: number
          name: string
          next_level_xp: number
          next_reward: string
          reward_asset_key: string
          scope_tenant_id: string
        }[]
      }
      get_latest_game_snapshot: { Args: { p_game_id: string }; Returns: string }
      get_next_plan_version_number: {
        Args: { p_plan_id: string }
        Returns: number
      }
      get_session_event_stats: {
        Args: { p_session_id: string }
        Returns: {
          error_count: number
          event_category: string
          event_count: number
          warning_count: number
        }[]
      }
      get_session_events: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_session_id: string
          p_severity?: string
          p_since?: string
        }
        Returns: {
          actor_id: string
          actor_name: string
          actor_type: string
          correlation_id: string
          created_at: string
          event_category: string
          event_type: string
          id: string
          parent_event_id: string
          payload: Json
          severity: string
          target_id: string
          target_name: string
          target_type: string
        }[]
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
      log_session_event: {
        Args: {
          p_actor_id?: string
          p_actor_name?: string
          p_actor_type?: string
          p_correlation_id?: string
          p_event_category: string
          p_event_type: string
          p_parent_event_id?: string
          p_payload?: Json
          p_session_id: string
          p_severity?: string
          p_target_id?: string
          p_target_name?: string
          p_target_type?: string
        }
        Returns: string
      }
      purchase_shop_item_v1: {
        Args: {
          p_idempotency_key: string
          p_shop_item_id: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: {
          balance: number
          coin_transaction_id: string
          purchase_id: string
        }[]
      }
      recalc_plan_total_time_minutes: {
        Args: { p_plan_id: string }
        Returns: undefined
      }
      refresh_gamification_daily_summaries_v1: {
        Args: { p_days?: number; p_tenant_id: string }
        Returns: number
      }
      replace_gamification_level_definitions_v1: {
        Args: { p_actor_user_id?: string; p_levels: Json; p_tenant_id: string }
        Returns: {
          replaced_count: number
        }[]
      }
      session_trigger_clear_error: {
        Args: { p_trigger_id: string }
        Returns: undefined
      }
      session_trigger_record_error: {
        Args: { p_error_message: string; p_trigger_id: string }
        Returns: undefined
      }
      session_triggers_disable_all: {
        Args: { p_session_id: string }
        Returns: number
      }
      session_triggers_rearm_all: {
        Args: { p_session_id: string }
        Returns: number
      }
      snapshot_game_roles_to_session: {
        Args: { p_game_id: string; p_locale?: string; p_session_id: string }
        Returns: number
      }
      time_bank_apply_delta: {
        Args: {
          p_actor_participant_id?: string
          p_actor_user_id?: string
          p_delta_seconds: number
          p_event_id?: string
          p_max_balance?: number
          p_metadata?: Json
          p_min_balance?: number
          p_reason: string
          p_session_id: string
        }
        Returns: Json
      }
      to_text_array_safe:
        | {
            Args: { input: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.to_text_array_safe(input => text), public.to_text_array_safe(input => _text). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { input: string[] }
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
      global_role_enum:
        | "system_admin"
        | "private_user"
        | "demo_private_user"
        | "member"
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
      participant_role: "observer" | "player" | "team_lead" | "facilitator"
      participant_session_status:
        | "active"
        | "paused"
        | "locked"
        | "ended"
        | "archived"
        | "cancelled"
      participant_status:
        | "active"
        | "idle"
        | "disconnected"
        | "kicked"
        | "blocked"
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
      tenant_role_enum:
        | "owner"
        | "admin"
        | "editor"
        | "member"
        | "organisation_admin"
        | "organisation_user"
        | "demo_org_admin"
        | "demo_org_user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      energy_level_enum: ["low", "medium", "high"],
      feedback_type_enum: ["bug", "feature_request", "improvement", "other"],
      game_media_kind: ["cover", "gallery"],
      game_status_enum: ["draft", "published"],
      global_role_enum: [
        "system_admin",
        "private_user",
        "demo_private_user",
        "member",
      ],
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
      participant_role: ["observer", "player", "team_lead", "facilitator"],
      participant_session_status: [
        "active",
        "paused",
        "locked",
        "ended",
        "archived",
        "cancelled",
      ],
      participant_status: [
        "active",
        "idle",
        "disconnected",
        "kicked",
        "blocked",
      ],
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
      tenant_role_enum: [
        "owner",
        "admin",
        "editor",
        "member",
        "organisation_admin",
        "organisation_user",
        "demo_org_admin",
        "demo_org_user",
      ],
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

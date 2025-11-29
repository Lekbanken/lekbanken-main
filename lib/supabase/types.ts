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
      games: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string
          description: string | null
          energy_level: string | null
          game_key: string | null
          id: string
          instructions: string | null
          location_type: string | null
          main_purpose_id: string | null
          materials: string | null
          max_players: number | null
          min_players: number | null
          name: string
          owner_tenant_id: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min: number | null
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          description?: string | null
          energy_level?: string | null
          game_key?: string | null
          id?: string
          instructions?: string | null
          location_type?: string | null
          main_purpose_id?: string | null
          materials?: string | null
          max_players?: number | null
          min_players?: number | null
          name: string
          owner_tenant_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min?: number | null
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          description?: string | null
          energy_level?: string | null
          game_key?: string | null
          id?: string
          instructions?: string | null
          location_type?: string | null
          main_purpose_id?: string | null
          materials?: string | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          owner_tenant_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["game_status_enum"]
          time_estimate_min?: number | null
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      invoices: {
        Row: {
          amount: number
          billing_product_id: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_key: string | null
          issued_at: string | null
          name: string
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status_enum"]
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          billing_product_id?: string | null
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_key?: string | null
          issued_at?: string | null
          name: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status_enum"]
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          billing_product_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_key?: string | null
          issued_at?: string | null
          name?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status_enum"]
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
      plan_blocks: {
        Row: {
          block_type: string
          created_at: string
          duration_minutes: number | null
          game_id: string | null
          id: string
          notes: string | null
          plan_id: string
          position: number
        }
        Insert: {
          block_type: string
          created_at?: string
          duration_minutes?: number | null
          game_id?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          position: number
        }
        Update: {
          block_type?: string
          created_at?: string
          duration_minutes?: number | null
          game_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          position?: number
        }
        Relationships: [
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
      plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_tenant_id: string | null
          owner_user_id: string
          plan_key: string | null
          total_time_minutes: number | null
          updated_at: string
          visibility: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_tenant_id?: string | null
          owner_user_id: string
          plan_key?: string | null
          total_time_minutes?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_tenant_id?: string | null
          owner_user_id?: string
          plan_key?: string | null
          total_time_minutes?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["plan_visibility_enum"]
        }
        Relationships: [
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
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          product_key: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_key?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_key?: string | null
          updated_at?: string
        }
        Relationships: []
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
          created_at: string
          id: string
          main_language: Database["public"]["Enums"]["language_code_enum"]
          name: string
          status: string
          tenant_key: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_language?: Database["public"]["Enums"]["language_code_enum"]
          name: string
          status?: string
          tenant_key?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          main_language?: Database["public"]["Enums"]["language_code_enum"]
          name?: string
          status?: string
          tenant_key?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_tenant_memberships: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          language: Database["public"]["Enums"]["language_code_enum"]
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          language?: Database["public"]["Enums"]["language_code_enum"]
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_code_enum"]
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_ids: { Args: never; Returns: string[] }
      has_tenant_role: {
        Args: { required_role: string; tenant_uuid: string }
        Returns: boolean
      }
      is_tenant_member: { Args: { tenant_uuid: string }; Returns: boolean }
    }
    Enums: {
      game_status_enum: "draft" | "published"
      invoice_status_enum:
        | "draft"
        | "issued"
        | "sent"
        | "paid"
        | "overdue"
        | "canceled"
      language_code_enum: "NO" | "SE" | "EN"
      media_type_enum: "template" | "upload" | "ai"
      payment_status_enum: "pending" | "confirmed" | "failed" | "refunded"
      plan_visibility_enum: "private" | "tenant" | "public"
      purpose_type_enum: "main" | "sub"
      seat_assignment_status_enum: "active" | "released" | "pending" | "revoked"
      subscription_status_enum: "active" | "paused" | "canceled" | "trial"
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
      media_type_enum: ["template", "upload", "ai"],
      payment_status_enum: ["pending", "confirmed", "failed", "refunded"],
      plan_visibility_enum: ["private", "tenant", "public"],
      purpose_type_enum: ["main", "sub"],
      seat_assignment_status_enum: ["active", "released", "pending", "revoked"],
      subscription_status_enum: ["active", "paused", "canceled", "trial"],
    },
  },
} as const

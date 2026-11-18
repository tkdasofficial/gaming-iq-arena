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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aim_lab_runs: {
        Row: {
          accuracy: number
          avg_reaction_ms: number | null
          best_streak: number
          created_at: string
          game: string
          hits: number
          id: string
          misses: number
          owner_id: string
          scalar: number
        }
        Insert: {
          accuracy?: number
          avg_reaction_ms?: number | null
          best_streak?: number
          created_at?: string
          game: string
          hits?: number
          id?: string
          misses?: number
          owner_id: string
          scalar?: number
        }
        Update: {
          accuracy?: number
          avg_reaction_ms?: number | null
          best_streak?: number
          created_at?: string
          game?: string
          hits?: number
          id?: string
          misses?: number
          owner_id?: string
          scalar?: number
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      chipsets: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_devices: {
        Row: {
          created_at: string
          device: Json
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device?: Json
          id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device?: Json
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          brand_id: string
          created_at: string
          data: Json
          id: string
          release_date: string
          updated_at: string
        }
        Insert: {
          brand_id?: string
          created_at?: string
          data?: Json
          id: string
          release_date?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          data?: Json
          id?: string
          release_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_compatibility: {
        Row: {
          created_at: string
          data: Json
          device_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          device_id?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          device_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_sensitivity_profiles: {
        Row: {
          created_at: string
          game_id: string
          recommended_value: number
          schema_id: string
          setting_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_id: string
          recommended_value: number
          schema_id: string
          setting_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          recommended_value?: number
          schema_id?: string
          setting_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sensitivity_profiles_game_id_schema_id_fkey"
            columns: ["game_id", "schema_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id", "sensitivity_schema_id"]
          },
          {
            foreignKeyName: "game_sensitivity_profiles_schema_id_setting_id_fkey"
            columns: ["schema_id", "setting_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_settings"
            referencedColumns: ["schema_id", "id"]
          },
        ]
      }
      games: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          publisher: string
          sensitivity_schema_id: string | null
          short_name: string
          sort_order: number
          supports_gyro: boolean
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          publisher?: string
          sensitivity_schema_id?: string | null
          short_name: string
          sort_order?: number
          supports_gyro?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          publisher?: string
          sensitivity_schema_id?: string | null
          short_name?: string
          sort_order?: number
          supports_gyro?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_sensitivity_schema_id_fkey"
            columns: ["sensitivity_schema_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          author_id: string
          author_name: string
          claw: string
          created_at: string
          description: string
          device: Json
          game: string
          gyro: string
          headline_metric: string
          id: string
          name: string
          player_archetype: string
          playstyle: string
          sliders: Json
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          author_name?: string
          claw: string
          created_at?: string
          description?: string
          device?: Json
          game: string
          gyro: string
          headline_metric?: string
          id?: string
          name: string
          player_archetype?: string
          playstyle: string
          sliders?: Json
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          claw?: string
          created_at?: string
          description?: string
          device?: Json
          game?: string
          gyro?: string
          headline_metric?: string
          id?: string
          name?: string
          player_archetype?: string
          playstyle?: string
          sliders?: Json
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_setups: {
        Row: {
          created_at: string
          game: string
          id: string
          input: Json
          name: string
          owner_id: string
          sliders: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          input?: Json
          name: string
          owner_id: string
          sliders?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          input?: Json
          name?: string
          owner_id?: string
          sliders?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sensitivity_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          label: string
          requires_gyro: boolean
          schema_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id: string
          label: string
          requires_gyro?: boolean
          schema_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          label?: string
          requires_gyro?: boolean
          schema_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensitivity_categories_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitivity_schemas: {
        Row: {
          created_at: string
          id: string
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      sensitivity_settings: {
        Row: {
          category_id: string
          core_slot: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          input_kind: string
          key: string
          label: string
          max_value: number
          min_value: number
          schema_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          core_slot?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id: string
          input_kind?: string
          key: string
          label: string
          max_value: number
          min_value: number
          schema_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          core_slot?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          input_kind?: string
          key?: string
          label?: string
          max_value?: number
          min_value?: number
          schema_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensitivity_settings_schema_id_category_id_fkey"
            columns: ["schema_id", "category_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_categories"
            referencedColumns: ["schema_id", "id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email_has_account: { Args: { _email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const

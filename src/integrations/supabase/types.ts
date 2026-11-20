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
      calibration_runs: {
        Row: {
          battery_percent: number | null
          created_at: string
          device_temperature_c: number | null
          id: string
          instability: number | null
          measured_movement: number
          overshoot: number | null
          repetition_number: number
          session_id: string
          slider_value: number
          swipe_direction: string | null
          target_movement: number
          time_to_target_ms: number | null
          undershoot: number | null
          user_id: string
        }
        Insert: {
          battery_percent?: number | null
          created_at?: string
          device_temperature_c?: number | null
          id?: string
          instability?: number | null
          measured_movement: number
          overshoot?: number | null
          repetition_number: number
          session_id: string
          slider_value: number
          swipe_direction?: string | null
          target_movement: number
          time_to_target_ms?: number | null
          undershoot?: number | null
          user_id: string
        }
        Update: {
          battery_percent?: number | null
          created_at?: string
          device_temperature_c?: number | null
          id?: string
          instability?: number | null
          measured_movement?: number
          overshoot?: number | null
          repetition_number?: number
          session_id?: string
          slider_value?: number
          swipe_direction?: string | null
          target_movement?: number
          time_to_target_ms?: number | null
          undershoot?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "calibration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_sessions: {
        Row: {
          conditions: Json
          created_at: string
          device_id: string
          game_id: string
          game_version: string | null
          id: string
          setting_id: string
          swipe_distance_mm: number | null
          user_id: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          device_id: string
          game_id: string
          game_version?: string | null
          id?: string
          setting_id: string
          swipe_distance_mm?: number | null
          user_id: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          device_id?: string
          game_id?: string
          game_version?: string | null
          id?: string
          setting_id?: string
          swipe_distance_mm?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_sessions_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_settings"
            referencedColumns: ["id"]
          },
        ]
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
      component_benchmarks: {
        Row: {
          benchmark_name: string
          benchmark_version: string | null
          chipset_id: string | null
          confidence: number | null
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          device_id: string | null
          gpu_score: number | null
          id: string
          multi_core_score: number | null
          sample_count: number | null
          single_core_score: number | null
          source: string
          test_date: string | null
          updated_at: string
        }
        Insert: {
          benchmark_name: string
          benchmark_version?: string | null
          chipset_id?: string | null
          confidence?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          device_id?: string | null
          gpu_score?: number | null
          id?: string
          multi_core_score?: number | null
          sample_count?: number | null
          single_core_score?: number | null
          source: string
          test_date?: string | null
          updated_at?: string
        }
        Update: {
          benchmark_name?: string
          benchmark_version?: string | null
          chipset_id?: string | null
          confidence?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          device_id?: string | null
          gpu_score?: number | null
          id?: string
          multi_core_score?: number | null
          sample_count?: number | null
          single_core_score?: number | null
          source?: string
          test_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "component_benchmarks_chipset_id_fkey"
            columns: ["chipset_id"]
            isOneToOne: false
            referencedRelation: "chipsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "component_benchmarks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
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
      feedback_events: {
        Row: {
          calibration_session_id: string | null
          created_at: string
          device_id: string
          feedback_type: string
          game_id: string
          game_version: string | null
          id: string
          new_value: number
          outcome: string | null
          previous_value: number
          recommendation_id: string
          setting_id: string
          user_id: string
        }
        Insert: {
          calibration_session_id?: string | null
          created_at?: string
          device_id: string
          feedback_type: string
          game_id: string
          game_version?: string | null
          id?: string
          new_value: number
          outcome?: string | null
          previous_value: number
          recommendation_id: string
          setting_id: string
          user_id: string
        }
        Update: {
          calibration_session_id?: string | null
          created_at?: string
          device_id?: string
          feedback_type?: string
          game_id?: string
          game_version?: string | null
          id?: string
          new_value?: number
          outcome?: string | null
          previous_value?: number
          recommendation_id?: string
          setting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_calibration_session_id_fkey"
            columns: ["calibration_session_id"]
            isOneToOne: false
            referencedRelation: "calibration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_events_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_settings"
            referencedColumns: ["id"]
          },
        ]
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
          current_version: string | null
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
          current_version?: string | null
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
          current_version?: string | null
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
      model_versions: {
        Row: {
          configuration: Json
          created_at: string
          game_id: string
          id: string
          is_active: boolean
          model_name: string
          notes: string | null
          release_date: string
          updated_at: string
          version: string
          weights: Json
        }
        Insert: {
          configuration: Json
          created_at?: string
          game_id: string
          id: string
          is_active?: boolean
          model_name: string
          notes?: string | null
          release_date?: string
          updated_at?: string
          version: string
          weights?: Json
        }
        Update: {
          configuration?: Json
          created_at?: string
          game_id?: string
          id?: string
          is_active?: boolean
          model_name?: string
          notes?: string | null
          release_date?: string
          updated_at?: string
          version?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_profiles: {
        Row: {
          comfort_preference: string | null
          created_at: string
          drag_technique: string | null
          finger_count: number | null
          fire_button_position: string | null
          fire_button_size: number | null
          game_id: string
          gyro_status: string | null
          hud_layout: string | null
          id: string
          play_style: string | null
          swipe_length: string | null
          swipe_speed: string | null
          updated_at: string
          user_id: string
          uses_free_look: boolean | null
          weapon_preference: string | null
        }
        Insert: {
          comfort_preference?: string | null
          created_at?: string
          drag_technique?: string | null
          finger_count?: number | null
          fire_button_position?: string | null
          fire_button_size?: number | null
          game_id: string
          gyro_status?: string | null
          hud_layout?: string | null
          id?: string
          play_style?: string | null
          swipe_length?: string | null
          swipe_speed?: string | null
          updated_at?: string
          user_id: string
          uses_free_look?: boolean | null
          weapon_preference?: string | null
        }
        Update: {
          comfort_preference?: string | null
          created_at?: string
          drag_technique?: string | null
          finger_count?: number | null
          fire_button_position?: string | null
          fire_button_size?: number | null
          game_id?: string
          gyro_status?: string | null
          hud_layout?: string | null
          id?: string
          play_style?: string | null
          swipe_length?: string | null
          swipe_speed?: string | null
          updated_at?: string
          user_id?: string
          uses_free_look?: boolean | null
          weapon_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_profiles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
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
      recommendations: {
        Row: {
          calibration_status: string
          confidence: string
          confidence_score: number
          created_at: string
          data_completeness: number
          device_id: string
          factors: Json
          game_id: string
          game_version: string | null
          generation_id: string
          id: string
          model_version_id: string
          pi_score: number | null
          recommended_max: number
          recommended_min: number
          setting_id: string
          suggested_value: number
          tdi_score: number | null
          user_id: string
          value_source: string
        }
        Insert: {
          calibration_status: string
          confidence: string
          confidence_score: number
          created_at?: string
          data_completeness: number
          device_id: string
          factors?: Json
          game_id: string
          game_version?: string | null
          generation_id: string
          id?: string
          model_version_id: string
          pi_score?: number | null
          recommended_max: number
          recommended_min: number
          setting_id: string
          suggested_value: number
          tdi_score?: number | null
          user_id: string
          value_source: string
        }
        Update: {
          calibration_status?: string
          confidence?: string
          confidence_score?: number
          created_at?: string
          data_completeness?: number
          device_id?: string
          factors?: Json
          game_id?: string
          game_version?: string | null
          generation_id?: string
          id?: string
          model_version_id?: string
          pi_score?: number | null
          recommended_max?: number
          recommended_min?: number
          setting_id?: string
          suggested_value?: number
          tdi_score?: number | null
          user_id?: string
          value_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_setting_id_fkey"
            columns: ["setting_id"]
            isOneToOne: false
            referencedRelation: "sensitivity_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_profiles: {
        Row: {
          average_fps: number | null
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          device_id: string
          fps_cap: number | null
          frame_stability: number | null
          game_id: string
          game_version: string | null
          graphics_setting: string | null
          id: string
          measurement_date: string | null
          one_percent_low: number | null
          session_minutes: number | null
          source: string
          thermal_state: string | null
          updated_at: string
        }
        Insert: {
          average_fps?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          device_id: string
          fps_cap?: number | null
          frame_stability?: number | null
          game_id: string
          game_version?: string | null
          graphics_setting?: string | null
          id?: string
          measurement_date?: string | null
          one_percent_low?: number | null
          session_minutes?: number | null
          source: string
          thermal_state?: string | null
          updated_at?: string
        }
        Update: {
          average_fps?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          device_id?: string
          fps_cap?: number | null
          frame_stability?: number | null
          game_id?: string
          game_version?: string | null
          graphics_setting?: string | null
          id?: string
          measurement_date?: string | null
          one_percent_low?: number | null
          session_minutes?: number | null
          source?: string
          thermal_state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_profiles_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_profiles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
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
      touch_profiles: {
        Row: {
          confidence: number | null
          controller_quality: number | null
          created_at: string
          data_status: Database["public"]["Enums"]["data_status"]
          device_id: string
          firmware: string | null
          id: string
          input_consistency_ms: number | null
          measured_at: string | null
          measurement_method: string | null
          sample_count: number | null
          source: string
          touch_latency_ms: number | null
          touch_sampling_rate_hz: number | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          controller_quality?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          device_id: string
          firmware?: string | null
          id?: string
          input_consistency_ms?: number | null
          measured_at?: string | null
          measurement_method?: string | null
          sample_count?: number | null
          source: string
          touch_latency_ms?: number | null
          touch_sampling_rate_hz?: number | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          controller_quality?: number | null
          created_at?: string
          data_status?: Database["public"]["Enums"]["data_status"]
          device_id?: string
          firmware?: string | null
          id?: string
          input_consistency_ms?: number | null
          measured_at?: string | null
          measurement_method?: string | null
          sample_count?: number | null
          source?: string
          touch_latency_ms?: number | null
          touch_sampling_rate_hz?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "touch_profiles_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
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
      record_calibration_session: {
        Args: {
          _conditions: Json
          _device_id: string
          _game_id: string
          _game_version: string
          _runs: Json
          _setting_id: string
          _swipe_distance_mm: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      data_status:
        | "verified"
        | "manufacturer_reported"
        | "user_reported"
        | "estimated"
        | "pending"
        | "not_verified"
        | "not_applicable"
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
      data_status: [
        "verified",
        "manufacturer_reported",
        "user_reported",
        "estimated",
        "pending",
        "not_verified",
        "not_applicable",
      ],
    },
  },
} as const

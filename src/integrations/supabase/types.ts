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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_capabilities: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      business_functions: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      business_objectives: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          id: string
          name: string
          region: string | null
        }
        Insert: {
          code: string
          id?: string
          name: string
          region?: string | null
        }
        Update: {
          code?: string
          id?: string
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      cta_events: {
        Row: {
          created_at: string
          cta: string
          id: string
          session_id: string | null
          source_page: string | null
          target_platform: string | null
          target_route: string | null
          use_case_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cta: string
          id?: string
          session_id?: string | null
          source_page?: string | null
          target_platform?: string | null
          target_route?: string | null
          use_case_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cta?: string
          id?: string
          session_id?: string | null
          source_page?: string | null
          target_platform?: string | null
          target_route?: string | null
          use_case_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gov_functions: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      industries: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      lead_captures: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          cta: string | null
          email: string
          full_name: string
          id: string
          industry: string | null
          interest_area: string | null
          lead_status: string
          notes: string | null
          role: string | null
          source_page: string | null
          source_use_case: string | null
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          cta?: string | null
          email: string
          full_name: string
          id?: string
          industry?: string | null
          interest_area?: string | null
          lead_status?: string
          notes?: string | null
          role?: string | null
          source_page?: string | null
          source_use_case?: string | null
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          cta?: string | null
          email?: string
          full_name?: string
          id?: string
          industry?: string | null
          interest_area?: string | null
          lead_status?: string
          notes?: string | null
          role?: string | null
          source_page?: string | null
          source_use_case?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          industry: string | null
          main_ai_interest: string | null
          organization: string | null
          profile_completed: boolean
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          main_ai_interest?: string | null
          organization?: string | null
          profile_completed?: boolean
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          main_ai_interest?: string | null
          organization?: string | null
          profile_completed?: boolean
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shortlists: {
        Row: {
          added_at: string
          use_case_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          use_case_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          use_case_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortlists_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_business_functions: {
        Row: {
          business_function_id: string
          use_case_id: string
        }
        Insert: {
          business_function_id: string
          use_case_id: string
        }
        Update: {
          business_function_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_business_functions_business_function_id_fkey"
            columns: ["business_function_id"]
            isOneToOne: false
            referencedRelation: "business_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_business_functions_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_business_objectives: {
        Row: {
          objective_id: string
          use_case_id: string
        }
        Insert: {
          objective_id: string
          use_case_id: string
        }
        Update: {
          objective_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_business_objectives_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "business_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_business_objectives_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_capabilities: {
        Row: {
          capability_id: string
          use_case_id: string
        }
        Insert: {
          capability_id: string
          use_case_id: string
        }
        Update: {
          capability_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_capabilities_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "ai_capabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_capabilities_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_countries: {
        Row: {
          country_id: string
          use_case_id: string
        }
        Insert: {
          country_id: string
          use_case_id: string
        }
        Update: {
          country_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_countries_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_gov_functions: {
        Row: {
          gov_function_id: string
          use_case_id: string
        }
        Insert: {
          gov_function_id: string
          use_case_id: string
        }
        Update: {
          gov_function_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_gov_functions_gov_function_id_fkey"
            columns: ["gov_function_id"]
            isOneToOne: false
            referencedRelation: "gov_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_gov_functions_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_industries: {
        Row: {
          industry_id: string
          use_case_id: string
        }
        Insert: {
          industry_id: string
          use_case_id: string
        }
        Update: {
          industry_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_industries_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_industries_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_links: {
        Row: {
          id: string
          kind: string | null
          label: string
          url: string
          use_case_id: string
        }
        Insert: {
          id?: string
          kind?: string | null
          label: string
          url: string
          use_case_id: string
        }
        Update: {
          id?: string
          kind?: string | null
          label?: string
          url?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_links_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_metrics: {
        Row: {
          id: string
          label: string
          sort_order: number | null
          unit: string | null
          use_case_id: string
          value: string
        }
        Insert: {
          id?: string
          label: string
          sort_order?: number | null
          unit?: string | null
          use_case_id: string
          value: string
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number | null
          unit?: string | null
          use_case_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_metrics_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_cases: {
        Row: {
          ai_solution_concept: string | null
          assurance_review_required: boolean
          business_problem: string | null
          business_value: string | null
          complexity: string | null
          created_at: string
          cyber_review_required: boolean
          cybersecurity_notes: string | null
          data_required: string | null
          display_order: number
          effort_score: number | null
          governance_notes: string | null
          governance_required: boolean
          hero_image_url: string | null
          id: string
          impact_score: number | null
          is_featured: boolean
          kpis: string[] | null
          maturity: Database["public"]["Enums"]["maturity_stage"] | null
          maturity_level: string | null
          maturity_score: number | null
          organization: string | null
          organization_type: string | null
          outcomes: string | null
          privacy_notes: string | null
          privacy_review_required: boolean
          problem: string | null
          published_at: string | null
          recommended_platforms: string[] | null
          region: string | null
          risk_level: string | null
          risk_score: number | null
          roi_areas: string[] | null
          show_on_landing: boolean
          slug: string
          solution: string | null
          status: Database["public"]["Enums"]["use_case_status"]
          submitted_by: string | null
          summary: string
          time_to_value: string | null
          title: string
          updated_at: string
          value_potential: string | null
        }
        Insert: {
          ai_solution_concept?: string | null
          assurance_review_required?: boolean
          business_problem?: string | null
          business_value?: string | null
          complexity?: string | null
          created_at?: string
          cyber_review_required?: boolean
          cybersecurity_notes?: string | null
          data_required?: string | null
          display_order?: number
          effort_score?: number | null
          governance_notes?: string | null
          governance_required?: boolean
          hero_image_url?: string | null
          id?: string
          impact_score?: number | null
          is_featured?: boolean
          kpis?: string[] | null
          maturity?: Database["public"]["Enums"]["maturity_stage"] | null
          maturity_level?: string | null
          maturity_score?: number | null
          organization?: string | null
          organization_type?: string | null
          outcomes?: string | null
          privacy_notes?: string | null
          privacy_review_required?: boolean
          problem?: string | null
          published_at?: string | null
          recommended_platforms?: string[] | null
          region?: string | null
          risk_level?: string | null
          risk_score?: number | null
          roi_areas?: string[] | null
          show_on_landing?: boolean
          slug: string
          solution?: string | null
          status?: Database["public"]["Enums"]["use_case_status"]
          submitted_by?: string | null
          summary: string
          time_to_value?: string | null
          title: string
          updated_at?: string
          value_potential?: string | null
        }
        Update: {
          ai_solution_concept?: string | null
          assurance_review_required?: boolean
          business_problem?: string | null
          business_value?: string | null
          complexity?: string | null
          created_at?: string
          cyber_review_required?: boolean
          cybersecurity_notes?: string | null
          data_required?: string | null
          display_order?: number
          effort_score?: number | null
          governance_notes?: string | null
          governance_required?: boolean
          hero_image_url?: string | null
          id?: string
          impact_score?: number | null
          is_featured?: boolean
          kpis?: string[] | null
          maturity?: Database["public"]["Enums"]["maturity_stage"] | null
          maturity_level?: string | null
          maturity_score?: number | null
          organization?: string | null
          organization_type?: string | null
          outcomes?: string | null
          privacy_notes?: string | null
          privacy_review_required?: boolean
          problem?: string | null
          published_at?: string | null
          recommended_platforms?: string[] | null
          region?: string | null
          risk_level?: string | null
          risk_score?: number | null
          roi_areas?: string[] | null
          show_on_landing?: boolean
          slug?: string
          solution?: string | null
          status?: Database["public"]["Enums"]["use_case_status"]
          submitted_by?: string | null
          summary?: string
          time_to_value?: string | null
          title?: string
          updated_at?: string
          value_potential?: string | null
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "contributor" | "viewer"
      maturity_stage:
        | "concept"
        | "prototype"
        | "pilot"
        | "production"
        | "scaled"
      use_case_status: "draft" | "review" | "published" | "archived"
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
      app_role: ["admin", "moderator", "contributor", "viewer"],
      maturity_stage: ["concept", "prototype", "pilot", "production", "scaled"],
      use_case_status: ["draft", "review", "published", "archived"],
    },
  },
} as const

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
      ai_use_cases: {
        Row: {
          ai_type: string | null
          beneficiaries: string | null
          board_id: string
          controls: Json | null
          created_at: string
          created_by: string
          current_state: string | null
          data_sources: Json | null
          expected_benefits: Json | null
          future_state: string | null
          id: string
          kpis: Json | null
          minimum_viable_prediction: string | null
          mvp_scope: string | null
          pattern_id: string | null
          priority_score: number | null
          problem_statement: string | null
          risk_level: string | null
          risks: Json | null
          stakeholders: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_type?: string | null
          beneficiaries?: string | null
          board_id: string
          controls?: Json | null
          created_at?: string
          created_by: string
          current_state?: string | null
          data_sources?: Json | null
          expected_benefits?: Json | null
          future_state?: string | null
          id?: string
          kpis?: Json | null
          minimum_viable_prediction?: string | null
          mvp_scope?: string | null
          pattern_id?: string | null
          priority_score?: number | null
          problem_statement?: string | null
          risk_level?: string | null
          risks?: Json | null
          stakeholders?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_type?: string | null
          beneficiaries?: string | null
          board_id?: string
          controls?: Json | null
          created_at?: string
          created_by?: string
          current_state?: string | null
          data_sources?: Json | null
          expected_benefits?: Json | null
          future_state?: string | null
          id?: string
          kpis?: Json | null
          minimum_viable_prediction?: string | null
          mvp_scope?: string | null
          pattern_id?: string | null
          priority_score?: number | null
          problem_statement?: string | null
          risk_level?: string | null
          risks?: Json | null
          stakeholders?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_cases_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "use_case_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_cases_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "use_case_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: []
      }
      blueprints: {
        Row: {
          budget_assumptions: string | null
          business_case: string | null
          created_at: string
          data_requirements: string | null
          executive_summary: string | null
          governance_controls: string | null
          id: string
          implementation_roadmap: string | null
          model_approach: string | null
          risk_summary: string | null
          success_metrics: string | null
          technical_scope: string | null
          updated_at: string
          use_case_id: string
        }
        Insert: {
          budget_assumptions?: string | null
          business_case?: string | null
          created_at?: string
          data_requirements?: string | null
          executive_summary?: string | null
          governance_controls?: string | null
          id?: string
          implementation_roadmap?: string | null
          model_approach?: string | null
          risk_summary?: string | null
          success_metrics?: string | null
          technical_scope?: string | null
          updated_at?: string
          use_case_id: string
        }
        Update: {
          budget_assumptions?: string | null
          business_case?: string | null
          created_at?: string
          data_requirements?: string | null
          executive_summary?: string | null
          governance_controls?: string | null
          id?: string
          implementation_roadmap?: string | null
          model_approach?: string | null
          risk_summary?: string | null
          success_metrics?: string | null
          technical_scope?: string | null
          updated_at?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
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
      data_readiness_assessments: {
        Row: {
          bias_risk_score: number | null
          created_at: string
          data_accessibility_score: number | null
          data_availability_score: number | null
          data_quality_score: number | null
          id: string
          missing_data_gaps: Json | null
          mitigation_recommendations: Json | null
          overall_data_readiness_score: number | null
          ownership_clarity_score: number | null
          privacy_exposure_score: number | null
          updated_at: string
          use_case_id: string
        }
        Insert: {
          bias_risk_score?: number | null
          created_at?: string
          data_accessibility_score?: number | null
          data_availability_score?: number | null
          data_quality_score?: number | null
          id?: string
          missing_data_gaps?: Json | null
          mitigation_recommendations?: Json | null
          overall_data_readiness_score?: number | null
          ownership_clarity_score?: number | null
          privacy_exposure_score?: number | null
          updated_at?: string
          use_case_id: string
        }
        Update: {
          bias_risk_score?: number | null
          created_at?: string
          data_accessibility_score?: number | null
          data_availability_score?: number | null
          data_quality_score?: number | null
          id?: string
          missing_data_gaps?: Json | null
          mitigation_recommendations?: Json | null
          overall_data_readiness_score?: number | null
          ownership_clarity_score?: number | null
          privacy_exposure_score?: number | null
          updated_at?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_readiness_assessments_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      external_module_links: {
        Row: {
          created_at: string
          id: string
          label: string
          module: string
          sort_order: number
          url: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          module: string
          sort_order?: number
          url: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          module?: string
          sort_order?: number
          url?: string
          use_case_id?: string
        }
        Relationships: []
      }
      feasibility_scores: {
        Row: {
          created_at: string
          created_by: string
          desirability_score: number | null
          feasibility_score: number | null
          governability_score: number | null
          id: string
          notes: string | null
          recommendation: string | null
          sustainability_score: number | null
          total_score: number | null
          updated_at: string
          use_case_id: string
          viability_score: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          desirability_score?: number | null
          feasibility_score?: number | null
          governability_score?: number | null
          id?: string
          notes?: string | null
          recommendation?: string | null
          sustainability_score?: number | null
          total_score?: number | null
          updated_at?: string
          use_case_id: string
          viability_score?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          desirability_score?: number | null
          feasibility_score?: number | null
          governability_score?: number | null
          id?: string
          notes?: string | null
          recommendation?: string | null
          sustainability_score?: number | null
          total_score?: number | null
          updated_at?: string
          use_case_id?: string
          viability_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feasibility_scores_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json | null
          title: string
          use_case_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json | null
          title: string
          use_case_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          title?: string
          use_case_count?: number
          user_id?: string
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
      integration_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          source_module: string
          target_module: string
          use_case_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          source_module: string
          target_module: string
          use_case_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          source_module?: string
          target_module?: string
          use_case_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      integration_links: {
        Row: {
          created_at: string
          external_reference_id: string | null
          id: string
          integration_type: string
          metadata: Json | null
          status: string | null
          updated_at: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          external_reference_id?: string | null
          id?: string
          integration_type: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          external_reference_id?: string | null
          id?: string
          integration_type?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_links_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
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
      organizations: {
        Row: {
          country: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          plan: string
          type: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          plan?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          plan?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_modules: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          added_at: string
          portfolio_id: string
          use_case_id: string
        }
        Insert: {
          added_at?: string
          portfolio_id: string
          use_case_id: string
        }
        Update: {
          added_at?: string
          portfolio_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          id: string
          name: string
          objective: string | null
          portfolio_type: string
          status: string
          target_department: string | null
          target_quarter: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          objective?: string | null
          portfolio_type?: string
          status?: string
          target_department?: string | null
          target_quarter?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          objective?: string | null
          portfolio_type?: string
          status?: string
          target_department?: string | null
          target_quarter?: string | null
          updated_at?: string
          user_id?: string
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
          organization_id: string | null
          plan_type: string
          profile_completed: boolean
          role: string | null
          updated_at: string
          user_id: string
          user_role: string
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
          organization_id?: string | null
          plan_type?: string
          profile_completed?: boolean
          role?: string | null
          updated_at?: string
          user_id: string
          user_role?: string
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
          organization_id?: string | null
          plan_type?: string
          profile_completed?: boolean
          role?: string | null
          updated_at?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_use_cases: {
        Row: {
          id: string
          note: string | null
          priority: string
          saved_at: string
          use_case_id: string
          user_id: string
        }
        Insert: {
          id?: string
          note?: string | null
          priority?: string
          saved_at?: string
          use_case_id: string
          user_id: string
        }
        Update: {
          id?: string
          note?: string | null
          priority?: string
          saved_at?: string
          use_case_id?: string
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
      taxonomy_maturity_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      taxonomy_meta: {
        Row: {
          id: number
          published_at: string
          published_by: string | null
          version: number
        }
        Insert: {
          id?: number
          published_at?: string
          published_by?: string | null
          version?: number
        }
        Update: {
          id?: number
          published_at?: string
          published_by?: string | null
          version?: number
        }
        Relationships: []
      }
      taxonomy_sectors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      taxonomy_tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      use_case_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json | null
          use_case_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          use_case_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          use_case_id?: string | null
        }
        Relationships: []
      }
      use_case_boards: {
        Row: {
          board_type: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          board_type?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          board_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      use_case_downloads: {
        Row: {
          asset_kind: string | null
          created_at: string
          id: string
          session_id: string | null
          source_page: string | null
          use_case_id: string
          user_id: string | null
        }
        Insert: {
          asset_kind?: string | null
          created_at?: string
          id?: string
          session_id?: string | null
          source_page?: string | null
          use_case_id: string
          user_id?: string | null
        }
        Update: {
          asset_kind?: string | null
          created_at?: string
          id?: string
          session_id?: string | null
          source_page?: string | null
          use_case_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      use_case_feedback: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_hidden: boolean
          is_public: boolean
          sentiment: string | null
          updated_at: string
          use_case_slug: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_public?: boolean
          sentiment?: string | null
          updated_at?: string
          use_case_slug: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_public?: boolean
          sentiment?: string | null
          updated_at?: string
          use_case_slug?: string
          user_id?: string
        }
        Relationships: []
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
      use_case_patterns: {
        Row: {
          access_tier: string
          ai_type: string | null
          business_problem: string | null
          complexity_level: string | null
          controls: Json | null
          created_at: string
          data_inputs: Json | null
          domain: string | null
          expected_outputs: Json | null
          function_area: string | null
          government_domain: string | null
          id: string
          industry: string | null
          maturity_level: string | null
          risks: Json | null
          sample_kpis: Json | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          value_potential: string | null
        }
        Insert: {
          access_tier?: string
          ai_type?: string | null
          business_problem?: string | null
          complexity_level?: string | null
          controls?: Json | null
          created_at?: string
          data_inputs?: Json | null
          domain?: string | null
          expected_outputs?: Json | null
          function_area?: string | null
          government_domain?: string | null
          id?: string
          industry?: string | null
          maturity_level?: string | null
          risks?: Json | null
          sample_kpis?: Json | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          value_potential?: string | null
        }
        Update: {
          access_tier?: string
          ai_type?: string | null
          business_problem?: string | null
          complexity_level?: string | null
          controls?: Json | null
          created_at?: string
          data_inputs?: Json | null
          domain?: string | null
          expected_outputs?: Json | null
          function_area?: string | null
          government_domain?: string | null
          id?: string
          industry?: string | null
          maturity_level?: string | null
          risks?: Json | null
          sample_kpis?: Json | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          value_potential?: string | null
        }
        Relationships: []
      }
      use_case_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          updated_at: string
          use_case_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          use_case_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          use_case_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      use_case_scores: {
        Row: {
          created_at: string
          feasibility: number
          id: string
          readiness: number
          risk: number
          strategic: number
          total: number
          ttv: number
          updated_at: string
          use_case_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          feasibility?: number
          id?: string
          readiness?: number
          risk?: number
          strategic?: number
          total?: number
          ttv?: number
          updated_at?: string
          use_case_id: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          feasibility?: number
          id?: string
          readiness?: number
          risk?: number
          strategic?: number
          total?: number
          ttv?: number
          updated_at?: string
          use_case_id?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      use_case_views: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          session_id: string | null
          source_page: string | null
          use_case_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          source_page?: string | null
          use_case_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          source_page?: string | null
          use_case_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      use_cases: {
        Row: {
          ai_solution_concept: string | null
          assurance_review_required: boolean
          business_problem: string | null
          business_value: string | null
          complexity: string | null
          content_status: string
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
          visibility: Database["public"]["Enums"]["use_case_visibility"]
        }
        Insert: {
          ai_solution_concept?: string | null
          assurance_review_required?: boolean
          business_problem?: string | null
          business_value?: string | null
          complexity?: string | null
          content_status?: string
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
          visibility?: Database["public"]["Enums"]["use_case_visibility"]
        }
        Update: {
          ai_solution_concept?: string | null
          assurance_review_required?: boolean
          business_problem?: string | null
          business_value?: string | null
          complexity?: string | null
          content_status?: string
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
          visibility?: Database["public"]["Enums"]["use_case_visibility"]
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
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          workspace_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          workspace_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          workspace_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      use_case_rating_aggregates: {
        Row: {
          avg_rating: number | null
          rating_count: number | null
          use_case_slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_use_case_integration_package: {
        Args: { use_case_uuid: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_tier: { Args: { _user_id: string }; Returns: boolean }
      user_can_access_use_case: {
        Args: { _use_case_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_org_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "contributor"
        | "viewer"
        | "super_admin"
        | "ai_hub_admin"
        | "usecasex_admin"
        | "content_manager"
        | "reviewer"
        | "editor"
        | "user"
      maturity_stage:
        | "concept"
        | "prototype"
        | "pilot"
        | "production"
        | "scaled"
      use_case_status:
        | "draft"
        | "review"
        | "published"
        | "archived"
        | "submitted_for_review"
        | "approved"
        | "unpublished"
      use_case_visibility: "free_lite" | "pro" | "both" | "hidden"
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
      app_role: [
        "admin",
        "moderator",
        "contributor",
        "viewer",
        "super_admin",
        "ai_hub_admin",
        "usecasex_admin",
        "content_manager",
        "reviewer",
        "editor",
        "user",
      ],
      maturity_stage: ["concept", "prototype", "pilot", "production", "scaled"],
      use_case_status: [
        "draft",
        "review",
        "published",
        "archived",
        "submitted_for_review",
        "approved",
        "unpublished",
      ],
      use_case_visibility: ["free_lite", "pro", "both", "hidden"],
    },
  },
} as const

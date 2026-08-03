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
      ai_usage_events: {
        Row: {
          completion_tokens: number | null
          created_at: string
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          error_kind: string | null
          id: string
          model: string
          organization_id: string | null
          prompt_tokens: number | null
          prompt_version: string | null
          provider_alias: string
          status: string
          task: string
          total_tokens: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_kind?: string | null
          id?: string
          model: string
          organization_id?: string | null
          prompt_tokens?: number | null
          prompt_version?: string | null
          provider_alias: string
          status?: string
          task: string
          total_tokens?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_kind?: string | null
          id?: string
          model?: string
          organization_id?: string | null
          prompt_tokens?: number | null
          prompt_version?: string | null
          provider_alias?: string
          status?: string
          task?: string
          total_tokens?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_use_case_org_units: {
        Row: {
          created_at: string
          org_unit_id: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          org_unit_id: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          org_unit_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_case_org_units_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_case_org_units_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_use_case_processes: {
        Row: {
          created_at: string
          process_id: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          process_id: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          process_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_case_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_case_processes_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_use_case_strategic_themes: {
        Row: {
          created_at: string
          theme_id: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          theme_id: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          theme_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_case_strategic_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_strategic_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_case_strategic_themes_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_use_case_value_themes: {
        Row: {
          created_at: string
          theme_id: string
          use_case_id: string
        }
        Insert: {
          created_at?: string
          theme_id: string
          use_case_id: string
        }
        Update: {
          created_at?: string
          theme_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_use_case_value_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_value_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_case_value_themes_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_use_cases: {
        Row: {
          ai_type: string | null
          beneficiaries: string | null
          board_id: string
          completed_at: string | null
          contributors: Json
          controls: Json | null
          created_at: string
          created_by: string
          current_state: string | null
          current_step: string | null
          data_sources: Json | null
          expected_benefits: Json | null
          future_state: string | null
          id: string
          kpis: Json | null
          minimum_viable_prediction: string | null
          mvp_scope: string | null
          organization_id: string | null
          owner_user_id: string | null
          pattern_id: string | null
          position: number
          priority_score: number | null
          problem_statement: string | null
          risk_level: string | null
          risks: Json | null
          source_opportunity_id: string | null
          source_use_case_id: string | null
          stakeholders: Json | null
          status: string
          title: string
          updated_at: string
          version: number
          visibility: string
          wizard_state: Json
          workspace_id: string | null
        }
        Insert: {
          ai_type?: string | null
          beneficiaries?: string | null
          board_id: string
          completed_at?: string | null
          contributors?: Json
          controls?: Json | null
          created_at?: string
          created_by: string
          current_state?: string | null
          current_step?: string | null
          data_sources?: Json | null
          expected_benefits?: Json | null
          future_state?: string | null
          id?: string
          kpis?: Json | null
          minimum_viable_prediction?: string | null
          mvp_scope?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          pattern_id?: string | null
          position?: number
          priority_score?: number | null
          problem_statement?: string | null
          risk_level?: string | null
          risks?: Json | null
          source_opportunity_id?: string | null
          source_use_case_id?: string | null
          stakeholders?: Json | null
          status?: string
          title: string
          updated_at?: string
          version?: number
          visibility?: string
          wizard_state?: Json
          workspace_id?: string | null
        }
        Update: {
          ai_type?: string | null
          beneficiaries?: string | null
          board_id?: string
          completed_at?: string | null
          contributors?: Json
          controls?: Json | null
          created_at?: string
          created_by?: string
          current_state?: string | null
          current_step?: string | null
          data_sources?: Json | null
          expected_benefits?: Json | null
          future_state?: string | null
          id?: string
          kpis?: Json | null
          minimum_viable_prediction?: string | null
          mvp_scope?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          pattern_id?: string | null
          position?: number
          priority_score?: number | null
          problem_statement?: string | null
          risk_level?: string | null
          risks?: Json | null
          source_opportunity_id?: string | null
          source_use_case_id?: string | null
          stakeholders?: Json | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
          visibility?: string
          wizard_state?: Json
          workspace_id?: string | null
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
          {
            foreignKeyName: "ai_use_cases_source_opportunity_id_fkey"
            columns: ["source_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_use_cases_source_use_case_id_fkey"
            columns: ["source_use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
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
          organization_id: string | null
          previous_value: Json | null
          request_id: string | null
          severity: string
          source: string | null
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          new_value?: Json | null
          organization_id?: string | null
          previous_value?: Json | null
          request_id?: string | null
          severity?: string
          source?: string | null
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          new_value?: Json | null
          organization_id?: string | null
          previous_value?: Json | null
          request_id?: string | null
          severity?: string
          source?: string | null
          workspace_id?: string | null
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
          organization_id: string | null
          risk_summary: string | null
          success_metrics: string | null
          technical_scope: string | null
          updated_at: string
          use_case_id: string
          workspace_id: string | null
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
          organization_id?: string | null
          risk_summary?: string | null
          success_metrics?: string | null
          technical_scope?: string | null
          updated_at?: string
          use_case_id: string
          workspace_id?: string | null
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
          organization_id?: string | null
          risk_summary?: string | null
          success_metrics?: string | null
          technical_scope?: string | null
          updated_at?: string
          use_case_id?: string
          workspace_id?: string | null
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
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          note: string | null
          position: number
          use_case_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          note?: string | null
          position?: number
          use_case_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          note?: string | null
          position?: number
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          organization_id: string | null
          share_token: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          organization_id?: string | null
          share_token?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          organization_id?: string | null
          share_token?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
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
          organization_id: string | null
          overall_data_readiness_score: number | null
          ownership_clarity_score: number | null
          privacy_exposure_score: number | null
          updated_at: string
          use_case_id: string
          workspace_id: string | null
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
          organization_id?: string | null
          overall_data_readiness_score?: number | null
          ownership_clarity_score?: number | null
          privacy_exposure_score?: number | null
          updated_at?: string
          use_case_id: string
          workspace_id?: string | null
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
          organization_id?: string | null
          overall_data_readiness_score?: number | null
          ownership_clarity_score?: number | null
          privacy_exposure_score?: number | null
          updated_at?: string
          use_case_id?: string
          workspace_id?: string | null
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
      entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          id: string
          notes: string | null
          organization_id: string
          plan_code: string
          revoked_at: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          plan_code: string
          revoked_at?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          plan_code?: string
          revoked_at?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
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
          organization_id: string | null
          recommendation: string | null
          sustainability_score: number | null
          total_score: number | null
          updated_at: string
          use_case_id: string
          viability_score: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          desirability_score?: number | null
          feasibility_score?: number | null
          governability_score?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          recommendation?: string | null
          sustainability_score?: number | null
          total_score?: number | null
          updated_at?: string
          use_case_id: string
          viability_score?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          desirability_score?: number | null
          feasibility_score?: number | null
          governability_score?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          recommendation?: string | null
          sustainability_score?: number | null
          total_score?: number | null
          updated_at?: string
          use_case_id?: string
          viability_score?: number | null
          workspace_id?: string | null
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
          organization_id: string | null
          payload: Json | null
          title: string
          use_case_count: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          organization_id?: string | null
          payload?: Json | null
          title: string
          use_case_count?: number
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string | null
          payload?: Json | null
          title?: string
          use_case_count?: number
          user_id?: string
          workspace_id?: string | null
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
          organization_id: string | null
          status: string | null
          updated_at: string
          use_case_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          external_reference_id?: string | null
          id?: string
          integration_type: string
          metadata?: Json | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string
          use_case_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          external_reference_id?: string | null
          id?: string
          integration_type?: string
          metadata?: Json | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string
          use_case_id?: string
          workspace_id?: string | null
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
          eligible: boolean | null
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
          waitlist_status: string
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          cta?: string | null
          eligible?: boolean | null
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
          waitlist_status?: string
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          cta?: string | null
          eligible?: boolean | null
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
          waitlist_status?: string
        }
        Relationships: []
      }
      module_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          module_key: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          module_key: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          module_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          ai_assisted: boolean
          ai_suggested_at: string | null
          ai_suggestions: Json | null
          baseline: string | null
          business_function: string | null
          converted_at: string | null
          converted_use_case_id: string | null
          created_at: string
          created_by: string
          desired_outcome: string | null
          evidence: Json
          id: string
          org_unit_id: string | null
          organization_id: string | null
          owner_name: string | null
          owner_user_id: string | null
          pain_point: string | null
          process: string | null
          process_id: string | null
          source: Database["public"]["Enums"]["opportunity_source"]
          source_reference: string | null
          source_use_case_id: string | null
          stakeholders: Json
          status: Database["public"]["Enums"]["opportunity_status"]
          strategic_objective: string | null
          strategic_theme_id: string | null
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["opportunity_urgency"]
          workspace_id: string
        }
        Insert: {
          ai_assisted?: boolean
          ai_suggested_at?: string | null
          ai_suggestions?: Json | null
          baseline?: string | null
          business_function?: string | null
          converted_at?: string | null
          converted_use_case_id?: string | null
          created_at?: string
          created_by: string
          desired_outcome?: string | null
          evidence?: Json
          id?: string
          org_unit_id?: string | null
          organization_id?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          pain_point?: string | null
          process?: string | null
          process_id?: string | null
          source?: Database["public"]["Enums"]["opportunity_source"]
          source_reference?: string | null
          source_use_case_id?: string | null
          stakeholders?: Json
          status?: Database["public"]["Enums"]["opportunity_status"]
          strategic_objective?: string | null
          strategic_theme_id?: string | null
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["opportunity_urgency"]
          workspace_id: string
        }
        Update: {
          ai_assisted?: boolean
          ai_suggested_at?: string | null
          ai_suggestions?: Json | null
          baseline?: string | null
          business_function?: string | null
          converted_at?: string | null
          converted_use_case_id?: string | null
          created_at?: string
          created_by?: string
          desired_outcome?: string | null
          evidence?: Json
          id?: string
          org_unit_id?: string | null
          organization_id?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          pain_point?: string | null
          process?: string | null
          process_id?: string | null
          source?: Database["public"]["Enums"]["opportunity_source"]
          source_reference?: string | null
          source_use_case_id?: string | null
          stakeholders?: Json
          status?: Database["public"]["Enums"]["opportunity_status"]
          strategic_objective?: string | null
          strategic_theme_id?: string | null
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["opportunity_urgency"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_converted_use_case_id_fkey"
            columns: ["converted_use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_use_case_id_fkey"
            columns: ["source_use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_strategic_theme_id_fkey"
            columns: ["strategic_theme_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_strategic_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_units: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          parent_id: string | null
          slug: string | null
          sort_order: number
          unit_type: Database["public"]["Enums"]["org_unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
          unit_type?: Database["public"]["Enums"]["org_unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number
          unit_type?: Database["public"]["Enums"]["org_unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id"]
          },
        ]
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
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          limits: Json
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          limits?: Json
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          limits?: Json
          name?: string
          sort_order?: number
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
          added_by: string | null
          created_at: string
          decision: string
          funding_state: string
          next_action: string | null
          notes: string | null
          portfolio_id: string
          rank: number | null
          target_period: string | null
          updated_at: string
          use_case_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          created_at?: string
          decision?: string
          funding_state?: string
          next_action?: string | null
          notes?: string | null
          portfolio_id: string
          rank?: number | null
          target_period?: string | null
          updated_at?: string
          use_case_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          created_at?: string
          decision?: string
          funding_state?: string
          next_action?: string | null
          notes?: string | null
          portfolio_id?: string
          rank?: number | null
          target_period?: string | null
          updated_at?: string
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
      portfolio_shares: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          label: string | null
          portfolio_id: string
          revoked_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          portfolio_id: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          portfolio_id?: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_shares_portfolio_id_fkey"
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
          organization_id: string | null
          organization_unit_id: string | null
          parent_portfolio_id: string | null
          portfolio_type: string
          review_cadence: string | null
          status: string
          target_department: string | null
          target_quarter: string | null
          updated_at: string
          user_id: string
          visibility: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          objective?: string | null
          organization_id?: string | null
          organization_unit_id?: string | null
          parent_portfolio_id?: string | null
          portfolio_type?: string
          review_cadence?: string | null
          status?: string
          target_department?: string | null
          target_quarter?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          objective?: string | null
          organization_id?: string | null
          organization_unit_id?: string | null
          parent_portfolio_id?: string | null
          portfolio_type?: string
          review_cadence?: string | null
          status?: string
          target_department?: string | null
          target_quarter?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_organization_unit_id_fkey"
            columns: ["organization_unit_id"]
            isOneToOne: false
            referencedRelation: "organization_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_parent_portfolio_id_fkey"
            columns: ["parent_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_name: string
          id: string
          occurred_at: string
          organization_id: string | null
          properties: Json
          request_id: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_name: string
          id?: string
          occurred_at?: string
          organization_id?: string | null
          properties?: Json
          request_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string
          id?: string
          occurred_at?: string
          organization_id?: string | null
          properties?: Json
          request_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string | null
          entitlement_expires_at: string | null
          entitlement_tier: string
          founding_member: boolean
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
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          entitlement_expires_at?: string | null
          entitlement_tier?: string
          founding_member?: boolean
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
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          entitlement_expires_at?: string | null
          entitlement_tier?: string
          founding_member?: boolean
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
          organization_id: string | null
          priority: string
          saved_at: string
          use_case_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          organization_id?: string | null
          priority?: string
          saved_at?: string
          use_case_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          organization_id?: string | null
          priority?: string
          saved_at?: string
          use_case_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      scorecard_results: {
        Row: {
          completeness: number | null
          composite_score: number | null
          confidence: string | null
          created_at: string
          created_by: string
          dimensions: Json
          explanation: Json
          id: string
          note: string | null
          organization_id: string | null
          recommendation: string | null
          responses: Json
          risk_adjusted_score: number | null
          scorecard_id: string
          scorecard_slug: string
          scorecard_version: number
          use_case_id: string
          workspace_id: string | null
        }
        Insert: {
          completeness?: number | null
          composite_score?: number | null
          confidence?: string | null
          created_at?: string
          created_by: string
          dimensions?: Json
          explanation?: Json
          id?: string
          note?: string | null
          organization_id?: string | null
          recommendation?: string | null
          responses?: Json
          risk_adjusted_score?: number | null
          scorecard_id: string
          scorecard_slug: string
          scorecard_version: number
          use_case_id: string
          workspace_id?: string | null
        }
        Update: {
          completeness?: number | null
          composite_score?: number | null
          confidence?: string | null
          created_at?: string
          created_by?: string
          dimensions?: Json
          explanation?: Json
          id?: string
          note?: string | null
          organization_id?: string | null
          recommendation?: string | null
          responses?: Json
          risk_adjusted_score?: number | null
          scorecard_id?: string
          scorecard_slug?: string
          scorecard_version?: number
          use_case_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_results_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "scorecards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecard_results_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          created_at: string
          created_by: string | null
          definition: Json
          description: string | null
          id: string
          is_default: boolean
          name: string
          organization_id: string | null
          slug: string
          status: string
          updated_at: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          organization_id?: string | null
          slug: string
          status?: string
          updated_at?: string
          version?: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          status?: string
          updated_at?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shortlists: {
        Row: {
          added_at: string
          organization_id: string | null
          use_case_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          added_at?: string
          organization_id?: string | null
          use_case_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          added_at?: string
          organization_id?: string | null
          use_case_id?: string
          user_id?: string
          workspace_id?: string | null
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
      taxonomy_lifecycle_stages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          organization_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          organization_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_lifecycle_stages_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      taxonomy_processes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          organization_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          organization_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_processes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_risk_levels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          organization_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          organization_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_risk_levels_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_sectors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          name: string
          organization_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          sort_order: number
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name: string
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          sort_order?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          name?: string
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          sort_order?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_sectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomy_strategic_themes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          organization_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          organization_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_strategic_themes_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      taxonomy_value_themes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          organization_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          organization_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_value_themes_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
      use_case_deliverables: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          deliverable_type: string
          id: string
          organization_id: string | null
          status: string
          updated_at: string
          use_case_id: string
          workspace_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          deliverable_type: string
          id?: string
          organization_id?: string | null
          status?: string
          updated_at?: string
          use_case_id: string
          workspace_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          deliverable_type?: string
          id?: string
          organization_id?: string | null
          status?: string
          updated_at?: string
          use_case_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "use_case_deliverables_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
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
      use_case_processes: {
        Row: {
          process_id: string
          use_case_id: string
        }
        Insert: {
          process_id: string
          use_case_id: string
        }
        Update: {
          process_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_processes_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
          readiness: number
          risk: number
          strategic: number
          total: number
          ttv: number
          updated_at: string
          use_case_id: string
          user_id: string
          value: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          feasibility?: number
          id?: string
          organization_id?: string | null
          readiness?: number
          risk?: number
          strategic?: number
          total?: number
          ttv?: number
          updated_at?: string
          use_case_id: string
          user_id: string
          value?: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          feasibility?: number
          id?: string
          organization_id?: string | null
          readiness?: number
          risk?: number
          strategic?: number
          total?: number
          ttv?: number
          updated_at?: string
          use_case_id?: string
          user_id?: string
          value?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      use_case_strategic_themes: {
        Row: {
          theme_id: string
          use_case_id: string
        }
        Insert: {
          theme_id: string
          use_case_id: string
        }
        Update: {
          theme_id?: string
          use_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "use_case_strategic_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_strategic_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "use_case_strategic_themes_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      use_case_submissions: {
        Row: {
          ai_solution: string | null
          business_problem: string | null
          created_at: string
          id: string
          industry: string | null
          organization_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sector: string | null
          sources: string[]
          status: Database["public"]["Enums"]["submission_status"]
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_solution?: string | null
          business_problem?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          organization_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          sources?: string[]
          status?: Database["public"]["Enums"]["submission_status"]
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_solution?: string | null
          business_problem?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          organization_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector?: string | null
          sources?: string[]
          status?: Database["public"]["Enums"]["submission_status"]
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      use_case_versions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string | null
          organization_id: string | null
          snapshot: Json
          use_case_id: string
          version: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          organization_id?: string | null
          snapshot?: Json
          use_case_id: string
          version: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          snapshot?: Json
          use_case_id?: string
          version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "use_case_versions_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
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
          cost_range: string | null
          created_at: string
          cyber_review_required: boolean
          cybersecurity_notes: string | null
          data_required: string | null
          deployment_model: string | null
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
          security_classification: string | null
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
          cost_range?: string | null
          created_at?: string
          cyber_review_required?: boolean
          cybersecurity_notes?: string | null
          data_required?: string | null
          deployment_model?: string | null
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
          security_classification?: string | null
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
          cost_range?: string | null
          created_at?: string
          cyber_review_required?: boolean
          cybersecurity_notes?: string | null
          data_required?: string | null
          deployment_model?: string | null
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
          security_classification?: string | null
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
      workspace_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          joined_at: string
          role: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      activation_funnel_daily: {
        Row: {
          day: string | null
          event_count: number | null
          event_name: string | null
          organization_id: string | null
          user_count: number | null
          workspace_id: string | null
        }
        Relationships: []
      }
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
      collection_is_accessible: {
        Args: { _collection_id: string; _user_id: string }
        Returns: boolean
      }
      collection_is_owned: {
        Args: { _collection_id: string; _user_id: string }
        Returns: boolean
      }
      ensure_user_workspace:
        | { Args: never; Returns: string }
        | { Args: { _user_id: string }; Returns: string }
      get_use_case_integration_package: {
        Args: { use_case_uuid: string }
        Returns: Json
      }
      has_pro_entitlement: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_tier: { Args: { _user_id: string }; Returns: boolean }
      is_editor_tier: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      org_role: { Args: { _org_id: string; _user_id: string }; Returns: string }
      portfolio_is_readable: {
        Args: { _portfolio_id: string; _user_id: string }
        Returns: boolean
      }
      portfolio_is_writable: {
        Args: { _portfolio_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_use_case: {
        Args: { _use_case_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_org_id: { Args: { _user_id: string }; Returns: string }
      workspace_org: { Args: { _workspace_id: string }; Returns: string }
      workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: string
      }
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
      opportunity_source: "scratch" | "repository" | "workshop" | "referral"
      opportunity_status:
        | "signal"
        | "opportunity"
        | "qualified"
        | "converted"
        | "deferred"
        | "archived"
      opportunity_urgency: "now" | "next" | "later" | "unknown"
      org_unit_type:
        | "group"
        | "company"
        | "business_unit"
        | "department"
        | "team"
        | "program"
        | "project"
      submission_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
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
      opportunity_source: ["scratch", "repository", "workshop", "referral"],
      opportunity_status: [
        "signal",
        "opportunity",
        "qualified",
        "converted",
        "deferred",
        "archived",
      ],
      opportunity_urgency: ["now", "next", "later", "unknown"],
      org_unit_type: [
        "group",
        "company",
        "business_unit",
        "department",
        "team",
        "program",
        "project",
      ],
      submission_status: [
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
      ],
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

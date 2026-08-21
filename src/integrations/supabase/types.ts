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
    PostgrestVersion: "14.15"
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
          demo_template_key: string | null
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
          demo_template_key?: string | null
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
          demo_template_key?: string | null
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
      collab_assignments: {
        Row: {
          assigned_by: string
          assignment_role: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_by: string
          assignment_role: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_by?: string
          assignment_role?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_review_states: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          note: string | null
          status: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          updated_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_review_states_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          slug: string | null
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
          slug?: string | null
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
          slug?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          analytics: boolean
          created_at: string
          decided_at: string
          id: string
          marketing: boolean
          organization_id: string | null
          policy_version: string
          source: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          analytics?: boolean
          created_at?: string
          decided_at?: string
          id?: string
          marketing?: boolean
          organization_id?: string | null
          policy_version?: string
          source?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          analytics?: boolean
          created_at?: string
          decided_at?: string
          id?: string
          marketing?: boolean
          organization_id?: string | null
          policy_version?: string
          source?: string
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
          device: string | null
          id: string
          referrer_host: string | null
          result_count: number | null
          search_query: string | null
          session_id: string | null
          source_page: string | null
          target_platform: string | null
          target_route: string | null
          use_case_id: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          cta: string
          device?: string | null
          id?: string
          referrer_host?: string | null
          result_count?: number | null
          search_query?: string | null
          session_id?: string | null
          source_page?: string | null
          target_platform?: string | null
          target_route?: string | null
          use_case_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          cta?: string
          device?: string | null
          id?: string
          referrer_host?: string | null
          result_count?: number | null
          search_query?: string | null
          session_id?: string | null
          source_page?: string | null
          target_platform?: string | null
          target_route?: string | null
          use_case_id?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          effective_at: string
          grace_days: number
          id: string
          organization_id: string | null
          reason: string | null
          requested_at: string
          scope: Json
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          effective_at?: string
          grace_days?: number
          id?: string
          organization_id?: string | null
          reason?: string | null
          requested_at?: string
          scope?: Json
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          effective_at?: string
          grace_days?: number
          id?: string
          organization_id?: string | null
          reason?: string | null
          requested_at?: string
          scope?: Json
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string
          id: string
          organization_id: string | null
          payload: Json | null
          payload_bytes: number
          progress: number
          requested_at: string
          row_counts: Json
          scope: string[]
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          payload_bytes?: number
          progress?: number
          requested_at?: string
          row_counts?: Json
          scope?: string[]
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          payload_bytes?: number
          progress?: number
          requested_at?: string
          row_counts?: Json
          scope?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
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
      demo_reset_log: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          id: string
          result: Json
          scenario_key: string | null
          scope: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          result?: Json
          scenario_key?: string | null
          scope?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          result?: Json
          scenario_key?: string | null
          scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_sample_copies: {
        Row: {
          created_at: string
          entity_counts: Json
          id: string
          organization_id: string | null
          scenario_key: string
          scenario_label: string
          template_version: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_counts?: Json
          id?: string
          organization_id?: string | null
          scenario_key: string
          scenario_label: string
          template_version?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_counts?: Json
          id?: string
          organization_id?: string | null
          scenario_key?: string
          scenario_label?: string
          template_version?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_sample_copies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          confirmation_attempts: number
          confirmation_last_attempt_at: string | null
          confirmation_last_error: string | null
          confirmation_next_retry_at: string | null
          confirmation_sent_at: string | null
          confirmation_status: string
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
          reference_id: string | null
          referrer_host: string | null
          role: string | null
          source_page: string | null
          source_use_case: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          waitlist_status: string
        }
        Insert: {
          company?: string | null
          confirmation_attempts?: number
          confirmation_last_attempt_at?: string | null
          confirmation_last_error?: string | null
          confirmation_next_retry_at?: string | null
          confirmation_sent_at?: string | null
          confirmation_status?: string
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
          reference_id?: string | null
          referrer_host?: string | null
          role?: string | null
          source_page?: string | null
          source_use_case?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          waitlist_status?: string
        }
        Update: {
          company?: string | null
          confirmation_attempts?: number
          confirmation_last_attempt_at?: string | null
          confirmation_last_error?: string | null
          confirmation_next_retry_at?: string | null
          confirmation_sent_at?: string | null
          confirmation_status?: string
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
          reference_id?: string | null
          referrer_host?: string | null
          role?: string | null
          source_page?: string | null
          source_use_case?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          waitlist_status?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          correlation_id: string | null
          created_at: string
          detail: string | null
          event_type: string
          from_status: string | null
          id: string
          lead_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          correlation_id?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          lead_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          correlation_id?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_captures"
            referencedColumns: ["id"]
          },
        ]
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
          demo_template_key: string | null
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
          demo_template_key?: string | null
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
          demo_template_key?: string | null
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
          name?: string
          plan?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pilot_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          cohort: string
          created_at: string
          from_status: string | null
          id: string
          invitation_id: string | null
          metadata: Json
          reason: string | null
          subject_email: string | null
          subject_user_id: string | null
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          cohort?: string
          created_at?: string
          from_status?: string | null
          id?: string
          invitation_id?: string | null
          metadata?: Json
          reason?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          cohort?: string
          created_at?: string
          from_status?: string | null
          id?: string
          invitation_id?: string | null
          metadata?: Json
          reason?: string | null
          subject_email?: string | null
          subject_user_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_audit_events_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "pilot_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_checkpoint_responses: {
        Row: {
          advisory_interest: boolean
          blocked: boolean
          checkpoint: string
          comment: string | null
          context_route: string | null
          created_at: string
          effort_rating: number | null
          id: string
          journey_stage: string | null
          mission_step: string | null
          organization_id: string | null
          pilot_id: string | null
          portfolio_id: string | null
          rating: number | null
          use_case_ids: string[]
          user_id: string
          value_rating: number | null
          willingness: string | null
          workspace_id: string | null
        }
        Insert: {
          advisory_interest?: boolean
          blocked?: boolean
          checkpoint: string
          comment?: string | null
          context_route?: string | null
          created_at?: string
          effort_rating?: number | null
          id?: string
          journey_stage?: string | null
          mission_step?: string | null
          organization_id?: string | null
          pilot_id?: string | null
          portfolio_id?: string | null
          rating?: number | null
          use_case_ids?: string[]
          user_id?: string
          value_rating?: number | null
          willingness?: string | null
          workspace_id?: string | null
        }
        Update: {
          advisory_interest?: boolean
          blocked?: boolean
          checkpoint?: string
          comment?: string | null
          context_route?: string | null
          created_at?: string
          effort_rating?: number | null
          id?: string
          journey_stage?: string | null
          mission_step?: string | null
          organization_id?: string | null
          pilot_id?: string | null
          portfolio_id?: string | null
          rating?: number | null
          use_case_ids?: string[]
          user_id?: string
          value_rating?: number | null
          willingness?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_checkpoint_responses_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilot_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_invitations: {
        Row: {
          activated_at: string | null
          cohort: string
          completed_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          invite_token: string
          invited_at: string
          invited_by: string | null
          notes: string | null
          organization: string | null
          registered_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          cohort?: string
          completed_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invite_token?: string
          invited_at?: string
          invited_by?: string | null
          notes?: string | null
          organization?: string | null
          registered_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          cohort?: string
          completed_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invite_token?: string
          invited_at?: string
          invited_by?: string | null
          notes?: string | null
          organization?: string | null
          registered_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pilot_launch_check_runs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          cohort: string
          created_at: string
          errored: number
          failed: number
          id: string
          p0_failures: number
          passed: number
          results: Json
          skipped: number
          total: number
          trigger: string
          trigger_detail: string | null
          updated_at: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          cohort: string
          created_at?: string
          errored?: number
          failed?: number
          id?: string
          p0_failures?: number
          passed?: number
          results?: Json
          skipped?: number
          total?: number
          trigger?: string
          trigger_detail?: string | null
          updated_at?: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          cohort?: string
          created_at?: string
          errored?: number
          failed?: number
          id?: string
          p0_failures?: number
          passed?: number
          results?: Json
          skipped?: number
          total?: number
          trigger?: string
          trigger_detail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pilot_onboarding_profiles: {
        Row: {
          ai_experience: string
          availability: string | null
          cohort: string
          completed_at: string
          contact_consent: boolean
          country: string | null
          created_at: string
          expected_use_cases: string | null
          full_name: string
          id: string
          invitation_id: string | null
          organization: string
          primary_goal: string
          role_title: string
          sector: string
          team_size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_experience: string
          availability?: string | null
          cohort: string
          completed_at?: string
          contact_consent?: boolean
          country?: string | null
          created_at?: string
          expected_use_cases?: string | null
          full_name: string
          id?: string
          invitation_id?: string | null
          organization: string
          primary_goal: string
          role_title: string
          sector: string
          team_size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_experience?: string
          availability?: string | null
          cohort?: string
          completed_at?: string
          contact_consent?: boolean
          country?: string | null
          created_at?: string
          expected_use_cases?: string | null
          full_name?: string
          id?: string
          invitation_id?: string | null
          organization?: string
          primary_goal?: string
          role_title?: string
          sector?: string
          team_size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_onboarding_profiles_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "pilot_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_rc_waivers: {
        Row: {
          approved_by: string
          approver_name: string
          approver_role: string
          cohort: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          reason: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          approved_by: string
          approver_name: string
          approver_role: string
          cohort?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string
          approver_name?: string
          approver_role?: string
          cohort?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      pilot_reminder_dispatches: {
        Row: {
          channel: string
          cohort: string
          created_at: string
          detail: string | null
          id: string
          idempotency_key: string
          invitation_id: string | null
          kind: string
          recipient_email: string
          status: string
          updated_at: string
          window_days: number | null
        }
        Insert: {
          channel?: string
          cohort?: string
          created_at?: string
          detail?: string | null
          id?: string
          idempotency_key: string
          invitation_id?: string | null
          kind: string
          recipient_email: string
          status?: string
          updated_at?: string
          window_days?: number | null
        }
        Update: {
          channel?: string
          cohort?: string
          created_at?: string
          detail?: string | null
          id?: string
          idempotency_key?: string
          invitation_id?: string | null
          kind?: string
          recipient_email?: string
          status?: string
          updated_at?: string
          window_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_reminder_dispatches_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "pilot_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_reminders: {
        Row: {
          actor_id: string | null
          body: string
          checkpoint: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          invitation_id: string | null
          kind: string
          mission_step: string | null
          read_at: string | null
          target_route: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body: string
          checkpoint?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          invitation_id?: string | null
          kind: string
          mission_step?: string | null
          read_at?: string | null
          target_route?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          checkpoint?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          invitation_id?: string | null
          kind?: string
          mission_step?: string | null
          read_at?: string | null
          target_route?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_reminders_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "pilot_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_settings: {
        Row: {
          cohort: string
          id: boolean
          invitations_paused: boolean
          pause_reason: string | null
          paused_at: string | null
          paused_by: string | null
          seat_target: number
          updated_at: string
        }
        Insert: {
          cohort?: string
          id?: boolean
          invitations_paused?: boolean
          pause_reason?: string | null
          paused_at?: string | null
          paused_by?: string | null
          seat_target?: number
          updated_at?: string
        }
        Update: {
          cohort?: string
          id?: boolean
          invitations_paused?: boolean
          pause_reason?: string | null
          paused_at?: string | null
          paused_by?: string | null
          seat_target?: number
          updated_at?: string
        }
        Relationships: []
      }
      pilot_verdict_snapshots: {
        Row: {
          checkpoint_answers: number
          cohort: string
          created_at: string
          evidence_gap_state: string | null
          freeze_recommended: boolean
          headline: string
          id: string
          invited: number
          p0_count: number
          p1_count: number
          reasons: Json
          recorded_by: string | null
          registered: number
          verdict: string
          waiver_id: string | null
        }
        Insert: {
          checkpoint_answers?: number
          cohort?: string
          created_at?: string
          evidence_gap_state?: string | null
          freeze_recommended?: boolean
          headline: string
          id?: string
          invited?: number
          p0_count?: number
          p1_count?: number
          reasons?: Json
          recorded_by?: string | null
          registered?: number
          verdict: string
          waiver_id?: string | null
        }
        Update: {
          checkpoint_answers?: number
          cohort?: string
          created_at?: string
          evidence_gap_state?: string | null
          freeze_recommended?: boolean
          headline?: string
          id?: string
          invited?: number
          p0_count?: number
          p1_count?: number
          reasons?: Json
          recorded_by?: string | null
          registered?: number
          verdict?: string
          waiver_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_verdict_snapshots_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "pilot_rc_waivers"
            referencedColumns: ["id"]
          },
        ]
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
          blocked_reason: string | null
          created_at: string
          decision: string
          delivery_owner: string | null
          delivery_stage: string
          depends_on: string[]
          funding_state: string
          last_reviewed_at: string | null
          milestone: string | null
          next_action: string | null
          notes: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          portfolio_id: string
          rank: number | null
          review_notes: string | null
          reviewed_by: string | null
          target_period: string | null
          updated_at: string
          use_case_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          blocked_reason?: string | null
          created_at?: string
          decision?: string
          delivery_owner?: string | null
          delivery_stage?: string
          depends_on?: string[]
          funding_state?: string
          last_reviewed_at?: string | null
          milestone?: string | null
          next_action?: string | null
          notes?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          portfolio_id: string
          rank?: number | null
          review_notes?: string | null
          reviewed_by?: string | null
          target_period?: string | null
          updated_at?: string
          use_case_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          blocked_reason?: string | null
          created_at?: string
          decision?: string
          delivery_owner?: string | null
          delivery_stage?: string
          depends_on?: string[]
          funding_state?: string
          last_reviewed_at?: string | null
          milestone?: string | null
          next_action?: string | null
          notes?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          portfolio_id?: string
          rank?: number | null
          review_notes?: string | null
          reviewed_by?: string | null
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
          demo_template_key: string | null
          id: string
          last_reviewed_at: string | null
          name: string
          objective: string | null
          organization_id: string | null
          organization_unit_id: string | null
          parent_portfolio_id: string | null
          portfolio_type: string
          review_cadence: string | null
          review_notes: string | null
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
          demo_template_key?: string | null
          id?: string
          last_reviewed_at?: string | null
          name: string
          objective?: string | null
          organization_id?: string | null
          organization_unit_id?: string | null
          parent_portfolio_id?: string | null
          portfolio_type?: string
          review_cadence?: string | null
          review_notes?: string | null
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
          demo_template_key?: string | null
          id?: string
          last_reviewed_at?: string | null
          name?: string
          objective?: string | null
          organization_id?: string | null
          organization_unit_id?: string | null
          parent_portfolio_id?: string | null
          portfolio_type?: string
          review_cadence?: string | null
          review_notes?: string | null
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
      product_feedback: {
        Row: {
          allow_contact: boolean
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          category: string
          contact_email: string | null
          context_route: string | null
          created_at: string
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          evidence_url: string | null
          first_response_at: string | null
          id: string
          message: string
          organization_id: string | null
          priority: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          allow_contact?: boolean
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category: string
          contact_email?: string | null
          context_route?: string | null
          created_at?: string
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          evidence_url?: string | null
          first_response_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          priority?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Update: {
          allow_contact?: boolean
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string
          contact_email?: string | null
          context_route?: string | null
          created_at?: string
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          evidence_url?: string | null
          first_response_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          priority?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      request_status_alerts: {
        Row: {
          actor_id: string | null
          created_at: string
          due_at: string | null
          feedback_id: string
          from_status: string | null
          id: string
          note: string | null
          priority: string | null
          read_at: string | null
          to_status: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          due_at?: string | null
          feedback_id: string
          from_status?: string | null
          id?: string
          note?: string | null
          priority?: string | null
          read_at?: string | null
          to_status: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          due_at?: string | null
          feedback_id?: string
          from_status?: string | null
          id?: string
          note?: string | null
          priority?: string | null
          read_at?: string | null
          to_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_alerts_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "product_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_status_alerts_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "v_feedback_queue"
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
      suite_handoff_requests: {
        Row: {
          completed_at: string | null
          consent: Json
          created_at: string
          delivery_mode: string
          dispatched_at: string | null
          id: string
          organization_id: string | null
          owner_user_id: string | null
          payload: Json
          request_type: string
          requested_by: string
          sensitivity: string
          source_version: Json
          status: string
          status_note: string | null
          subject_refs: Json
          summary: string | null
          target: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          consent?: Json
          created_at?: string
          delivery_mode?: string
          dispatched_at?: string | null
          id?: string
          organization_id?: string | null
          owner_user_id?: string | null
          payload?: Json
          request_type: string
          requested_by: string
          sensitivity?: string
          source_version?: Json
          status?: string
          status_note?: string | null
          subject_refs?: Json
          summary?: string | null
          target: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          consent?: Json
          created_at?: string
          delivery_mode?: string
          dispatched_at?: string | null
          id?: string
          organization_id?: string | null
          owner_user_id?: string | null
          payload?: Json
          request_type?: string
          requested_by?: string
          sensitivity?: string
          source_version?: Json
          status?: string
          status_note?: string | null
          subject_refs?: Json
          summary?: string | null
          target?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suite_handoff_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      use_case_benefits: {
        Row: {
          baseline_value: number | null
          benefit_owner: string | null
          category: string
          confidence: string
          created_at: string
          created_by: string | null
          currency: string | null
          erp_last_verified_at: string | null
          erp_reference: string | null
          erp_system: string | null
          erp_verification_status: string
          evidence_links: Json
          evidence_source: string | null
          expected_value: number | null
          id: string
          kpi: string | null
          measurement_frequency: string
          name: string
          notes: string | null
          organization_id: string | null
          period: string
          state: string
          target_value: number | null
          unit_type: string
          updated_at: string
          use_case_id: string
          verification_method: string
          workspace_id: string | null
        }
        Insert: {
          baseline_value?: number | null
          benefit_owner?: string | null
          category?: string
          confidence?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          erp_last_verified_at?: string | null
          erp_reference?: string | null
          erp_system?: string | null
          erp_verification_status?: string
          evidence_links?: Json
          evidence_source?: string | null
          expected_value?: number | null
          id?: string
          kpi?: string | null
          measurement_frequency?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          period?: string
          state?: string
          target_value?: number | null
          unit_type?: string
          updated_at?: string
          use_case_id: string
          verification_method?: string
          workspace_id?: string | null
        }
        Update: {
          baseline_value?: number | null
          benefit_owner?: string | null
          category?: string
          confidence?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          erp_last_verified_at?: string | null
          erp_reference?: string | null
          erp_system?: string | null
          erp_verification_status?: string
          evidence_links?: Json
          evidence_source?: string | null
          expected_value?: number | null
          id?: string
          kpi?: string | null
          measurement_frequency?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          period?: string
          state?: string
          target_value?: number | null
          unit_type?: string
          updated_at?: string
          use_case_id?: string
          verification_method?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "use_case_benefits_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "ai_use_cases"
            referencedColumns: ["id"]
          },
        ]
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
      use_case_deliverable_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          deliverable_id: string
          deliverable_type: string
          id: string
          origin: string
          status: string
          summary: string | null
          use_case_id: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id: string
          deliverable_type: string
          id?: string
          origin?: string
          status?: string
          summary?: string | null
          use_case_id: string
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          deliverable_id?: string
          deliverable_type?: string
          id?: string
          origin?: string
          status?: string
          summary?: string | null
          use_case_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "use_case_deliverable_versions_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "use_case_deliverables"
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
          evidence_urls: string[]
          governance_notes: string | null
          governance_required: boolean
          hero_image_url: string | null
          id: string
          impact_score: number | null
          implementation_notes: string | null
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
          provenance: string
          provenance_note: string | null
          published_at: string | null
          quality_checked_at: string | null
          quality_status: string
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
          evidence_urls?: string[]
          governance_notes?: string | null
          governance_required?: boolean
          hero_image_url?: string | null
          id?: string
          impact_score?: number | null
          implementation_notes?: string | null
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
          provenance?: string
          provenance_note?: string | null
          published_at?: string | null
          quality_checked_at?: string | null
          quality_status?: string
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
          evidence_urls?: string[]
          governance_notes?: string | null
          governance_required?: boolean
          hero_image_url?: string | null
          id?: string
          impact_score?: number | null
          implementation_notes?: string | null
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
          provenance?: string
          provenance_note?: string | null
          published_at?: string | null
          quality_checked_at?: string | null
          quality_status?: string
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
      workshop_canvas_documents: {
        Row: {
          created_at: string
          id: string
          label: string
          mime_type: string
          note: string | null
          section: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          mime_type: string
          note?: string | null
          section: string
          size_bytes?: number
          storage_path: string
          updated_at?: string
          uploaded_by: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          mime_type?: string
          note?: string | null
          section?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_canvas_documents_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_canvas_versions: {
        Row: {
          answered: number
          completeness: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          sections: Json
          version: number
          workshop_id: string
        }
        Insert: {
          answered?: number
          completeness?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sections?: Json
          version: number
          workshop_id: string
        }
        Update: {
          answered?: number
          completeness?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sections?: Json
          version?: number
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_canvas_versions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          display_name: string | null
          email: string | null
          expires_at: string
          id: string
          max_uses: number
          revoked_at: string | null
          role: string
          token: string
          updated_at: string
          use_count: number
          workshop_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          display_name?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          role?: string
          token: string
          updated_at?: string
          use_count?: number
          workshop_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          display_name?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          role?: string
          token?: string
          updated_at?: string
          use_count?: number
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_invitations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_items: {
        Row: {
          business_function: string | null
          converted_at: string | null
          created_at: string
          detail: string | null
          id: string
          kind: string
          merged_into_id: string | null
          opportunity_id: string | null
          source_item_id: string | null
          status: string
          submitted_by: string | null
          submitted_by_name: string | null
          title: string
          updated_at: string
          use_case_id: string | null
          workshop_id: string
        }
        Insert: {
          business_function?: string | null
          converted_at?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          merged_into_id?: string | null
          opportunity_id?: string | null
          source_item_id?: string | null
          status?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          title: string
          updated_at?: string
          use_case_id?: string | null
          workshop_id: string
        }
        Update: {
          business_function?: string | null
          converted_at?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          merged_into_id?: string | null
          opportunity_id?: string | null
          source_item_id?: string | null
          status?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          title?: string
          updated_at?: string
          use_case_id?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_items_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "workshop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_items_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "workshop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_items_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_outcomes: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          summary: Json
          updated_at: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          summary?: Json
          updated_at?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          summary?: Json
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_outcomes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_participants: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          role: string
          user_id: string | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          role?: string
          user_id?: string | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          role?: string
          user_id?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_participants_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_public_value_canvas: {
        Row: {
          completeness: number
          created_at: string
          id: string
          sections: Json
          updated_at: string
          updated_by: string | null
          workshop_id: string
        }
        Insert: {
          completeness?: number
          created_at?: string
          id?: string
          sections?: Json
          updated_at?: string
          updated_by?: string | null
          workshop_id: string
        }
        Update: {
          completeness?: number
          created_at?: string
          id?: string
          sections?: Json
          updated_at?: string
          updated_by?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_public_value_canvas_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: true
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_votes: {
        Row: {
          created_at: string
          criterion: string
          id: string
          item_id: string
          score: number
          updated_at: string
          voter_id: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          criterion: string
          id?: string
          item_id: string
          score: number
          updated_at?: string
          voter_id: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          criterion?: string
          id?: string
          item_id?: string
          score?: number
          updated_at?: string
          voter_id?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_votes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "workshop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_votes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          business_functions: string[]
          client_name: string | null
          created_at: string
          created_by: string
          ends_on: string | null
          id: string
          objective: string | null
          organization_id: string | null
          outcome_report_id: string | null
          portfolio_id: string | null
          stage: string
          starts_on: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_functions?: string[]
          client_name?: string | null
          created_at?: string
          created_by: string
          ends_on?: string | null
          id?: string
          objective?: string | null
          organization_id?: string | null
          outcome_report_id?: string | null
          portfolio_id?: string | null
          stage?: string
          starts_on?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_functions?: string[]
          client_name?: string | null
          created_at?: string
          created_by?: string
          ends_on?: string | null
          id?: string
          objective?: string | null
          organization_id?: string | null
          outcome_report_id?: string | null
          portfolio_id?: string | null
          stage?: string
          starts_on?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_outcome_report_id_fkey"
            columns: ["outcome_report_id"]
            isOneToOne: false
            referencedRelation: "generated_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshops_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshops_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_export_preferences: {
        Row: {
          columns: string[]
          created_at: string
          export_key: string
          id: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          columns?: string[]
          created_at?: string
          export_key: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          columns?: string[]
          created_at?: string
          export_key?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_export_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          max_uses: number
          message: string | null
          organization_id: string | null
          revoked_at: string | null
          role: string
          token: string
          updated_at: string
          use_count: number
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          max_uses?: number
          message?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          role?: string
          token: string
          updated_at?: string
          use_count?: number
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          max_uses?: number
          message?: string | null
          organization_id?: string | null
          revoked_at?: string | null
          role?: string
          token?: string
          updated_at?: string
          use_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          demo_scenario_key: string | null
          description: string | null
          id: string
          is_demo: boolean
          is_demo_template: boolean
          name: string
          organization_id: string
          updated_at: string
          workspace_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          demo_scenario_key?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          is_demo_template?: boolean
          name: string
          organization_id: string
          updated_at?: string
          workspace_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          demo_scenario_key?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          is_demo_template?: boolean
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
      ai_usage_events_reportable: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          error_kind: string | null
          id: string | null
          model: string | null
          organization_id: string | null
          prompt_tokens: number | null
          prompt_version: string | null
          provider_alias: string | null
          status: string | null
          task: string | null
          total_tokens: number | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_kind?: string | null
          id?: string | null
          model?: string | null
          organization_id?: string | null
          prompt_tokens?: number | null
          prompt_version?: string | null
          provider_alias?: string | null
          status?: string | null
          task?: string | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_kind?: string | null
          id?: string | null
          model?: string | null
          organization_id?: string | null
          prompt_tokens?: number | null
          prompt_version?: string | null
          provider_alias?: string | null
          status?: string | null
          task?: string | null
          total_tokens?: number | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      cta_events_reportable: {
        Row: {
          created_at: string | null
          cta: string | null
          id: string | null
          session_id: string | null
          source_page: string | null
          target_platform: string | null
          target_route: string | null
          use_case_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cta?: string | null
          id?: string | null
          session_id?: string | null
          source_page?: string | null
          target_platform?: string | null
          target_route?: string | null
          use_case_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cta?: string | null
          id?: string | null
          session_id?: string | null
          source_page?: string | null
          target_platform?: string | null
          target_route?: string | null
          use_case_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      module_events_reportable: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          module_key: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          module_key?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          module_key?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_events_reportable: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_name: string | null
          id: string | null
          occurred_at: string | null
          organization_id: string | null
          properties: Json | null
          request_id: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string | null
          id?: string | null
          occurred_at?: string | null
          organization_id?: string | null
          properties?: Json | null
          request_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_name?: string | null
          id?: string | null
          occurred_at?: string | null
          organization_id?: string | null
          properties?: Json | null
          request_id?: string | null
          user_id?: string | null
          workspace_id?: string | null
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
      v_activation_funnel_weekly: {
        Row: {
          events: number | null
          stage: string | null
          stage_order: number | null
          users: number | null
          week: string | null
        }
        Relationships: []
      }
      v_ai_usage_weekly: {
        Row: {
          avg_duration_ms: number | null
          calls: number | null
          error_kind: string | null
          status: string | null
          task: string | null
          total_tokens: number | null
          users: number | null
          week: string | null
        }
        Relationships: []
      }
      v_enterprise_interest_weekly: {
        Row: {
          cta: string | null
          interest_area: string | null
          leads: number | null
          week: string | null
        }
        Relationships: []
      }
      v_feedback_queue: {
        Row: {
          allow_contact: boolean | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          category: string | null
          context_route: string | null
          created_at: string | null
          due_at: string | null
          entity_id: string | null
          entity_type: string | null
          evidence_url: string | null
          first_response_at: string | null
          id: string | null
          is_real_activity: boolean | null
          message: string | null
          organization_id: string | null
          priority: string | null
          resolution_note: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          allow_contact?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string | null
          context_route?: string | null
          created_at?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          evidence_url?: string | null
          first_response_at?: string | null
          id?: string | null
          is_real_activity?: never
          message?: string | null
          organization_id?: string | null
          priority?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          allow_contact?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string | null
          context_route?: string | null
          created_at?: string | null
          due_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          evidence_url?: string | null
          first_response_at?: string | null
          id?: string | null
          is_real_activity?: never
          message?: string | null
          organization_id?: string | null
          priority?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      v_launch_visitors_weekly: {
        Row: {
          events: number | null
          signed_in_users: number | null
          visitor_sessions: number | null
          week: string | null
        }
        Relationships: []
      }
      v_search_insights_weekly: {
        Row: {
          search_query: string | null
          searches: number | null
          week: string | null
          zero_result_searches: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_workshop_invitation: { Args: { _token: string }; Returns: string }
      accept_workspace_invitation: { Args: { _token: string }; Returns: string }
      collab_entity_workspace: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: string
      }
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
      is_demo_activity: {
        Args: {
          _organization_id: string
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
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
      publish_use_case_submission: {
        Args: { _review_notes?: string; _submission_id: string }
        Returns: Json
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
      workshop_is_facilitator: {
        Args: { _user_id: string; _workshop_id: string }
        Returns: boolean
      }
      workshop_is_member: {
        Args: { _user_id: string; _workshop_id: string }
        Returns: boolean
      }
      workspace_can_edit: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      workspace_can_manage: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      workspace_display_names: {
        Args: { _user_ids: string[]; _workspace_id: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      workspace_member_directory: {
        Args: { _workspace_id: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
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

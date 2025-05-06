export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          created_at: string
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          ical_uid: string
          id: string
          is_deleted: boolean
          meeting_platform:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url: string | null
          platform:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id: string
          raw: Json | null
          recall_calendar_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at: string
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          ical_uid: string
          id?: string
          is_deleted: boolean
          meeting_platform?:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url?: string | null
          platform?:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id: string
          raw?: Json | null
          recall_calendar_id: string
          start_time: string
          updated_at: string
        }
        Update: {
          created_at?: string
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          ical_uid?: string
          id?: string
          is_deleted?: boolean
          meeting_platform?:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url?: string | null
          platform?:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id?: string
          raw?: Json | null
          recall_calendar_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_recall_calendar_id_fkey"
            columns: ["recall_calendar_id"]
            isOneToOne: false
            referencedRelation: "recall_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events_v2: {
        Row: {
          created_at: string
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          ical_uid: string
          id: string
          is_deleted: boolean
          meeting_platform:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url: string | null
          platform:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id: string
          profile_id: string
          raw: Json | null
          recall_calendar_id: string
          should_join_user_override: boolean | null
          start_time: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at: string
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          ical_uid: string
          id?: string
          is_deleted: boolean
          meeting_platform?:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url?: string | null
          platform?:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id: string
          profile_id: string
          raw?: Json | null
          recall_calendar_id: string
          should_join_user_override?: boolean | null
          start_time: string
          tags?: string[] | null
          updated_at: string
        }
        Update: {
          created_at?: string
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          ical_uid?: string
          id?: string
          is_deleted?: boolean
          meeting_platform?:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url?: string | null
          platform?:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id?: string
          profile_id?: string
          raw?: Json | null
          recall_calendar_id?: string
          should_join_user_override?: boolean | null
          start_time?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "calendar_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "calendar_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_v2_recall_calendar_id_fkey1"
            columns: ["recall_calendar_id"]
            isOneToOne: false
            referencedRelation: "recall_calendars_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          email: string
          google_id: string
          id: string
          name: string
          resource_id: string | null
          user_id: string
          uuid: string | null
          watch_expiry: string | null
        }
        Insert: {
          email: string
          google_id: string
          id?: string
          name: string
          resource_id?: string | null
          user_id: string
          uuid?: string | null
          watch_expiry?: string | null
        }
        Update: {
          email?: string
          google_id?: string
          id?: string
          name?: string
          resource_id?: string | null
          user_id?: string
          uuid?: string | null
          watch_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          latest: boolean
          messages: Json
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latest?: boolean
          messages: Json
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latest?: boolean
          messages?: Json
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "chats_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          end_segment: number | null
          focus_person_analysis: string | null
          id: string
          reasoning: string | null
          start_segment: number | null
          summary: string | null
          video_api_id: string | null
        }
        Insert: {
          end_segment?: number | null
          focus_person_analysis?: string | null
          id: string
          reasoning?: string | null
          start_segment?: number | null
          summary?: string | null
          video_api_id?: string | null
        }
        Update: {
          end_segment?: number | null
          focus_person_analysis?: string | null
          id?: string
          reasoning?: string | null
          start_segment?: number | null
          summary?: string | null
          video_api_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      coaching_frameworks: {
        Row: {
          created_at: string
          definition_prompt: string
          description: string | null
          icon: Database["public"]["Enums"]["icon_enum"] | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          definition_prompt: string
          description?: string | null
          icon?: Database["public"]["Enums"]["icon_enum"] | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          definition_prompt?: string
          description?: string | null
          icon?: Database["public"]["Enums"]["icon_enum"] | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      deletion_processing_status: {
        Row: {
          chats_supabase: string | null
          chats_supabase_affected_row: number | null
          chunks_pinecone: string | null
          chunks_pinecone_affected_row: number | null
          chunks_supabase: string | null
          chunks_supabase_affected_row: number | null
          id: string
          meeting_notes_pinecone: string | null
          meeting_notes_pinecone_affected_row: number | null
          meeting_notes_supabase: string | null
          meeting_notes_supabase_affected_row: number | null
          meeting_supabase: string | null
          meeting_supabase_affected_row: number | null
          moments_meta_supabase: string | null
          moments_meta_supabase_affected_row: number | null
          moments_pinecone: string | null
          moments_pinecone_affected_row: number | null
          moments_supabase: string | null
          moments_supabase_affected_row: number | null
          observation_prompts_supabase: string | null
          observation_prompts_supabase_affected_row: number | null
          profile_id: string | null
          qna_chunks_pinecone: string | null
          qna_chunks_pinecone_affected_row: number | null
          qna_chunks_supabase: string | null
          qna_chunks_supabase_affected_row: number | null
          segments_supabase: string | null
          segments_supabase_affected_row: number | null
          status: string | null
          video: string | null
          video_affected_row: number | null
          video_id: string | null
        }
        Insert: {
          chats_supabase?: string | null
          chats_supabase_affected_row?: number | null
          chunks_pinecone?: string | null
          chunks_pinecone_affected_row?: number | null
          chunks_supabase?: string | null
          chunks_supabase_affected_row?: number | null
          id: string
          meeting_notes_pinecone?: string | null
          meeting_notes_pinecone_affected_row?: number | null
          meeting_notes_supabase?: string | null
          meeting_notes_supabase_affected_row?: number | null
          meeting_supabase?: string | null
          meeting_supabase_affected_row?: number | null
          moments_meta_supabase?: string | null
          moments_meta_supabase_affected_row?: number | null
          moments_pinecone?: string | null
          moments_pinecone_affected_row?: number | null
          moments_supabase?: string | null
          moments_supabase_affected_row?: number | null
          observation_prompts_supabase?: string | null
          observation_prompts_supabase_affected_row?: number | null
          profile_id?: string | null
          qna_chunks_pinecone?: string | null
          qna_chunks_pinecone_affected_row?: number | null
          qna_chunks_supabase?: string | null
          qna_chunks_supabase_affected_row?: number | null
          segments_supabase?: string | null
          segments_supabase_affected_row?: number | null
          status?: string | null
          video?: string | null
          video_affected_row?: number | null
          video_id?: string | null
        }
        Update: {
          chats_supabase?: string | null
          chats_supabase_affected_row?: number | null
          chunks_pinecone?: string | null
          chunks_pinecone_affected_row?: number | null
          chunks_supabase?: string | null
          chunks_supabase_affected_row?: number | null
          id?: string
          meeting_notes_pinecone?: string | null
          meeting_notes_pinecone_affected_row?: number | null
          meeting_notes_supabase?: string | null
          meeting_notes_supabase_affected_row?: number | null
          meeting_supabase?: string | null
          meeting_supabase_affected_row?: number | null
          moments_meta_supabase?: string | null
          moments_meta_supabase_affected_row?: number | null
          moments_pinecone?: string | null
          moments_pinecone_affected_row?: number | null
          moments_supabase?: string | null
          moments_supabase_affected_row?: number | null
          observation_prompts_supabase?: string | null
          observation_prompts_supabase_affected_row?: number | null
          profile_id?: string | null
          qna_chunks_pinecone?: string | null
          qna_chunks_pinecone_affected_row?: number | null
          qna_chunks_supabase?: string | null
          qna_chunks_supabase_affected_row?: number | null
          segments_supabase?: string | null
          segments_supabase_affected_row?: number | null
          status?: string | null
          video?: string | null
          video_affected_row?: number | null
          video_id?: string | null
        }
        Relationships: []
      }
      entities: {
        Row: {
          attributes: Json | null
          created_at: string
          id: string
          is_test: boolean
          master_profile_id: string
          name: string
          type: string | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          id?: string
          is_test?: boolean
          master_profile_id: string
          name: string
          type?: string | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          id?: string
          is_test?: boolean
          master_profile_id?: string
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_master_profile_id_fkey"
            columns: ["master_profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "entities_master_profile_id_fkey"
            columns: ["master_profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "entities_master_profile_id_fkey"
            columns: ["master_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_profile_entities: {
        Row: {
          entity_id: string
          entity_profile_id: string
        }
        Insert: {
          entity_id: string
          entity_profile_id: string
        }
        Update: {
          entity_id?: string
          entity_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_profile_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "meeting_entities_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_profile_entities_entity_profile_id_fkey"
            columns: ["entity_profile_id"]
            isOneToOne: false
            referencedRelation: "entity_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_profiles: {
        Row: {
          alliance_structure: string[]
          communication_architecture: string[]
          conflict_patterns: string[]
          conversational_system_prompt: string | null
          created_at: string
          decision_making_style: string[]
          entity_description: string
          entity_name: string
          environment: string[]
          goals: string[]
          guardrails: string[]
          id: string
          interpersonal_effectiveness: string[]
          organizational_influence: string[]
          performance_issues: string[]
          personality: string[]
          professional_network: string[]
          profile_id: string
          profile_version: number
          project_portfolio: string[]
          psychological_framework: string[]
          raw_business_profile: Json | null
          raw_personal_profile: Json | null
          raw_relationships_profile: Json | null
          relationship_health: string[]
          relationship_with_user: string[]
          relationships: string[]
          role_and_responsibilities: string[]
          source_data_hash: string
          speech_patterns: string[]
          stress_responses: string[]
          tone: string[]
          tools: string[]
          traits: string[]
          typical_phrases: string[]
          updated_at: string
          value_creation: string[]
        }
        Insert: {
          alliance_structure: string[]
          communication_architecture: string[]
          conflict_patterns: string[]
          conversational_system_prompt?: string | null
          created_at?: string
          decision_making_style: string[]
          entity_description: string
          entity_name: string
          environment: string[]
          goals: string[]
          guardrails: string[]
          id?: string
          interpersonal_effectiveness: string[]
          organizational_influence: string[]
          performance_issues: string[]
          personality: string[]
          professional_network: string[]
          profile_id: string
          profile_version?: number
          project_portfolio: string[]
          psychological_framework: string[]
          raw_business_profile?: Json | null
          raw_personal_profile?: Json | null
          raw_relationships_profile?: Json | null
          relationship_health: string[]
          relationship_with_user: string[]
          relationships: string[]
          role_and_responsibilities: string[]
          source_data_hash: string
          speech_patterns: string[]
          stress_responses: string[]
          tone: string[]
          tools: string[]
          traits: string[]
          typical_phrases: string[]
          updated_at?: string
          value_creation: string[]
        }
        Update: {
          alliance_structure?: string[]
          communication_architecture?: string[]
          conflict_patterns?: string[]
          conversational_system_prompt?: string | null
          created_at?: string
          decision_making_style?: string[]
          entity_description?: string
          entity_name?: string
          environment?: string[]
          goals?: string[]
          guardrails?: string[]
          id?: string
          interpersonal_effectiveness?: string[]
          organizational_influence?: string[]
          performance_issues?: string[]
          personality?: string[]
          professional_network?: string[]
          profile_id?: string
          profile_version?: number
          project_portfolio?: string[]
          psychological_framework?: string[]
          raw_business_profile?: Json | null
          raw_personal_profile?: Json | null
          raw_relationships_profile?: Json | null
          relationship_health?: string[]
          relationship_with_user?: string[]
          relationships?: string[]
          role_and_responsibilities?: string[]
          source_data_hash?: string
          speech_patterns?: string[]
          stress_responses?: string[]
          tone?: string[]
          tools?: string[]
          traits?: string[]
          typical_phrases?: string[]
          updated_at?: string
          value_creation?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "entity_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "entity_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "entity_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          created_at: string
          criticality: string
          description: string
          id: number
          screenshot: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criticality: string
          description: string
          id?: never
          screenshot?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criticality?: string
          description?: string
          id?: never
          screenshot?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_signal_templates: {
        Row: {
          activity: string | null
          activity_type: string | null
          created_at: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_template_id: string
          id: string
          is_current: boolean
          tag: string | null
          target_person_type: string | null
          text: string
        }
        Insert: {
          activity?: string | null
          activity_type?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_template_id: string
          id?: string
          is_current?: boolean
          tag?: string | null
          target_person_type?: string | null
          text: string
        }
        Update: {
          activity?: string | null
          activity_type?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_template_id?: string
          id?: string
          is_current?: boolean
          tag?: string | null
          target_person_type?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_signal_templates_goal_template_id_fkey"
            columns: ["goal_template_id"]
            isOneToOne: false
            referencedRelation: "goal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_signals: {
        Row: {
          activity: string | null
          activity_type: string | null
          created_at: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_id: string
          hidden_text: string | null
          id: string
          is_current: boolean
          previous_goal_signal_id: string | null
          tag: string | null
          target_person_type: string | null
          text: string
        }
        Insert: {
          activity?: string | null
          activity_type?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_id: string
          hidden_text?: string | null
          id?: string
          is_current?: boolean
          previous_goal_signal_id?: string | null
          tag?: string | null
          target_person_type?: string | null
          text: string
        }
        Update: {
          activity?: string | null
          activity_type?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_id?: string
          hidden_text?: string | null
          id?: string
          is_current?: boolean
          previous_goal_signal_id?: string | null
          tag?: string | null
          target_person_type?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_signals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_signals_previous_goal_signal_id_fkey"
            columns: ["previous_goal_signal_id"]
            isOneToOne: false
            referencedRelation: "goal_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_templates: {
        Row: {
          context: string | null
          created_at: string
          id: string
          is_current: boolean
          skill_id: string
          text: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          skill_id: string
          text: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          skill_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_templates_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          hidden_text: string | null
          id: string
          is_current: boolean
          is_default: boolean
          previous_goal_id: string | null
          profile_id: string
          progress: number
          skill_id: string
          text: string
          user_provided_context: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          hidden_text?: string | null
          id?: string
          is_current: boolean
          is_default?: boolean
          previous_goal_id?: string | null
          profile_id: string
          progress?: number
          skill_id: string
          text: string
          user_provided_context?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          hidden_text?: string | null
          id?: string
          is_current?: boolean
          is_default?: boolean
          previous_goal_id?: string | null
          profile_id?: string
          progress?: number
          skill_id?: string
          text?: string
          user_provided_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_previous_goal_id_fkey"
            columns: ["previous_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      group_report_processing_status: {
        Row: {
          created_at: string
          goal_ids: string[] | null
          id: string
          profile_id: string | null
          skill_id: string | null
          status: Database["public"]["Enums"]["processing_status"] | null
        }
        Insert: {
          created_at?: string
          goal_ids?: string[] | null
          id: string
          profile_id?: string | null
          skill_id?: string | null
          status?: Database["public"]["Enums"]["processing_status"] | null
        }
        Update: {
          created_at?: string
          goal_ids?: string[] | null
          id?: string
          profile_id?: string | null
          skill_id?: string | null
          status?: Database["public"]["Enums"]["processing_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "group_report_processing_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "group_report_processing_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "group_report_processing_status_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_report_processing_status_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          access_token: string | null
          created_at: string
          expiry_date: string | null
          id: string
          last_refresh_attempt: string | null
          provider: string | null
          refresh_error: string | null
          refresh_token: string | null
          requires_reauth: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          last_refresh_attempt?: string | null
          provider?: string | null
          refresh_error?: string | null
          refresh_token?: string | null
          requires_reauth?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          last_refresh_attempt?: string | null
          provider?: string | null
          refresh_error?: string | null
          refresh_token?: string | null
          requires_reauth?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "integration_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "integration_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          id: string
          logs: Json | null
          status: string | null
          type: string | null
          video_api_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logs?: Json | null
          status?: string | null
          type?: string | null
          video_api_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logs?: Json | null
          status?: string | null
          type?: string | null
          video_api_id?: string | null
        }
        Relationships: []
      }
      meeting_action_item_assignees: {
        Row: {
          assignee_id: string
          meeting_action_item_id: string
        }
        Insert: {
          assignee_id: string
          meeting_action_item_id: string
        }
        Update: {
          assignee_id?: string
          meeting_action_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_item_assignees_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_item_assignees_meeting_action_item_id_fkey"
            columns: ["meeting_action_item_id"]
            isOneToOne: false
            referencedRelation: "action_items_with_assignees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_item_assignees_meeting_action_item_id_fkey"
            columns: ["meeting_action_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          api_video_id: string
          completed: boolean | null
          completed_at: string | null
          completed_date: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          server_deleted_at: string | null
          text: string
          vtt_end_segment_id: number | null
          vtt_start_segment_id: number | null
        }
        Insert: {
          api_video_id: string
          completed?: boolean | null
          completed_at?: string | null
          completed_date?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          server_deleted_at?: string | null
          text: string
          vtt_end_segment_id?: number | null
          vtt_start_segment_id?: number | null
        }
        Update: {
          api_video_id?: string
          completed?: boolean | null
          completed_at?: string | null
          completed_date?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          server_deleted_at?: string | null
          text?: string
          vtt_end_segment_id?: number | null
          vtt_start_segment_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      meeting_bots: {
        Row: {
          api_video_id: string | null
          created_at: string
          deduplication_key: string | null
          error_code: string | null
          event_id: string | null
          id: string
          message: string | null
          mp4_source_url: string | null
          profile_id: string | null
          provider:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          raw_data: Json | null
          recall_calendar_id: string | null
          recording_id: string | null
          speakers: string[] | null
          status: string | null
          sub_code: string | null
          title: string | null
        }
        Insert: {
          api_video_id?: string | null
          created_at?: string
          deduplication_key?: string | null
          error_code?: string | null
          event_id?: string | null
          id: string
          message?: string | null
          mp4_source_url?: string | null
          profile_id?: string | null
          provider?:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          raw_data?: Json | null
          recall_calendar_id?: string | null
          recording_id?: string | null
          speakers?: string[] | null
          status?: string | null
          sub_code?: string | null
          title?: string | null
        }
        Update: {
          api_video_id?: string | null
          created_at?: string
          deduplication_key?: string | null
          error_code?: string | null
          event_id?: string | null
          id?: string
          message?: string | null
          mp4_source_url?: string | null
          profile_id?: string | null
          provider?:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          raw_data?: Json | null
          recall_calendar_id?: string | null
          recording_id?: string | null
          speakers?: string[] | null
          status?: string | null
          sub_code?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_bots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_bots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bots_recall_calendar_id_fkey"
            columns: ["recall_calendar_id"]
            isOneToOne: false
            referencedRelation: "recall_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bots_v2: {
        Row: {
          api_video_id: string | null
          created_at: string
          deduplication_key: string | null
          error_code: string | null
          event_id: string | null
          id: string
          is_removed: boolean
          message: string | null
          mp4_source_url: string | null
          profile_id: string | null
          provider: Database["public"]["Enums"]["meeting_bots_provider_enum"]
          raw_data: Json | null
          recall_calendar_id: string | null
          recording_id: string | null
          reporting_status:
            | Database["public"]["Enums"]["meeting_bot_reporting_status"]
            | null
          speakers: string[] | null
          status: string | null
          sub_code: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          api_video_id?: string | null
          created_at?: string
          deduplication_key?: string | null
          error_code?: string | null
          event_id?: string | null
          id: string
          is_removed?: boolean
          message?: string | null
          mp4_source_url?: string | null
          profile_id?: string | null
          provider: Database["public"]["Enums"]["meeting_bots_provider_enum"]
          raw_data?: Json | null
          recall_calendar_id?: string | null
          recording_id?: string | null
          reporting_status?:
            | Database["public"]["Enums"]["meeting_bot_reporting_status"]
            | null
          speakers?: string[] | null
          status?: string | null
          sub_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          api_video_id?: string | null
          created_at?: string
          deduplication_key?: string | null
          error_code?: string | null
          event_id?: string | null
          id?: string
          is_removed?: boolean
          message?: string | null
          mp4_source_url?: string | null
          profile_id?: string | null
          provider?: Database["public"]["Enums"]["meeting_bots_provider_enum"]
          raw_data?: Json | null
          recall_calendar_id?: string | null
          recording_id?: string | null
          reporting_status?:
            | Database["public"]["Enums"]["meeting_bot_reporting_status"]
            | null
          speakers?: string[] | null
          status?: string | null
          sub_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bots_v2_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_details_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bots_v2_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bots_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_bots_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_bots_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bots_v2_recall_calendar_id_fkey1"
            columns: ["recall_calendar_id"]
            isOneToOne: false
            referencedRelation: "recall_calendars_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_entities_v2: {
        Row: {
          api_video_id: string
          created_at: string
          description: string | null
          id: string
          latest: boolean
          meeting_topic_id: string
          name: string
          profile_id: string
          type: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          description?: string | null
          id?: string
          latest?: boolean
          meeting_topic_id: string
          name: string
          profile_id: string
          type: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          description?: string | null
          id?: string
          latest?: boolean
          meeting_topic_id?: string
          name?: string
          profile_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_entities_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_entities_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_entity_observations_v2: {
        Row: {
          api_video_id: string
          created_at: string
          id: string
          latest: boolean
          meeting_entity_id: string
          meeting_topic_id: string
          observation: string
          profile_id: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_entity_id: string
          meeting_topic_id: string
          observation: string
          profile_id: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_entity_id?: string
          meeting_topic_id?: string
          observation?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_entity_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_meeting_entity_id_fkey"
            columns: ["meeting_entity_id"]
            isOneToOne: false
            referencedRelation: "meeting_entities_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_entity_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_entity_participants: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          meeting_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          meeting_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_entity_participants_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_entity_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      meeting_entity_relationship_observations_v2: {
        Row: {
          api_video_id: string
          created_at: string
          id: string
          latest: boolean
          meeting_entity_relationship_id: string
          meeting_topic_id: string
          observation: string
          profile_id: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_entity_relationship_id: string
          meeting_topic_id: string
          observation: string
          profile_id: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_entity_relationship_id?: string
          meeting_topic_id?: string
          observation?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_entity_relationship_o_meeting_entity_relationship__fkey"
            columns: ["meeting_entity_relationship_id"]
            isOneToOne: false
            referencedRelation: "meeting_entity_relationships_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_relationship_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_entity_relationships_v2: {
        Row: {
          api_video_id: string
          created_at: string
          id: string
          latest: boolean
          meeting_topic_id: string
          object_entity_name: string
          profile_id: string
          relationship_type: string
          subject_entity_name: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_topic_id: string
          object_entity_name: string
          profile_id: string
          relationship_type: string
          subject_entity_name: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_topic_id?: string
          object_entity_name?: string
          profile_id?: string
          relationship_type?: string
          subject_entity_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_entity_relationships_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_entity_relationships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes_chunks: {
        Row: {
          chunk_id: string | null
          clear_text: string | null
          end_segment: number | null
          id: string
          start_segment: number | null
          video_api_id: string | null
        }
        Insert: {
          chunk_id?: string | null
          clear_text?: string | null
          end_segment?: number | null
          id: string
          start_segment?: number | null
          video_api_id?: string | null
        }
        Update: {
          chunk_id?: string | null
          clear_text?: string | null
          end_segment?: number | null
          id?: string
          start_segment?: number | null
          video_api_id?: string | null
        }
        Relationships: []
      }
      meeting_observations_v2: {
        Row: {
          api_video_id: string
          created_at: string
          id: string
          latest: boolean
          meeting_topic_id: string
          observation: string
          profile_id: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_topic_id: string
          observation: string
          profile_id: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          id?: string
          latest?: boolean
          meeting_topic_id?: string
          observation?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_observations_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_processing_status: {
        Row: {
          action_items_status: string | null
          backend_call_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          created_at: string | null
          embed_meeting_status: string | null
          embed_moments_status: string | null
          entity_extraction_status: Database["public"]["Enums"]["processing_status"]
          id: string
          interestingness_status: string | null
          internal: boolean | null
          meeting_bot_id: string | null
          meetings_status: string | null
          meta_data_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          moments_status: string | null
          observation_status: string | null
          origin: string | null
          segments_status: string | null
          supabase_video_upload_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          topic_segmentation_status: Database["public"]["Enums"]["processing_status"]
          topics_status: string | null
          transcript_slice_words_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at: string | null
          video_api_upload_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          video_id: string | null
        }
        Insert: {
          action_items_status?: string | null
          backend_call_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          created_at?: string | null
          embed_meeting_status?: string | null
          embed_moments_status?: string | null
          entity_extraction_status?: Database["public"]["Enums"]["processing_status"]
          id?: string
          interestingness_status?: string | null
          internal?: boolean | null
          meeting_bot_id?: string | null
          meetings_status?: string | null
          meta_data_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          moments_status?: string | null
          observation_status?: string | null
          origin?: string | null
          segments_status?: string | null
          supabase_video_upload_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          topic_segmentation_status?: Database["public"]["Enums"]["processing_status"]
          topics_status?: string | null
          transcript_slice_words_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at?: string | null
          video_api_upload_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          video_id?: string | null
        }
        Update: {
          action_items_status?: string | null
          backend_call_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          created_at?: string | null
          embed_meeting_status?: string | null
          embed_moments_status?: string | null
          entity_extraction_status?: Database["public"]["Enums"]["processing_status"]
          id?: string
          interestingness_status?: string | null
          internal?: boolean | null
          meeting_bot_id?: string | null
          meetings_status?: string | null
          meta_data_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          moments_status?: string | null
          observation_status?: string | null
          origin?: string | null
          segments_status?: string | null
          supabase_video_upload_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          topic_segmentation_status?: Database["public"]["Enums"]["processing_status"]
          topics_status?: string | null
          transcript_slice_words_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at?: string | null
          video_api_upload_status?:
            | Database["public"]["Enums"]["processing_status"]
            | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_processing_status_meeting_bot_id_fkey"
            columns: ["meeting_bot_id"]
            isOneToOne: true
            referencedRelation: "meeting_bots_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_topic_events_v2: {
        Row: {
          api_video_id: string
          created_at: string
          event: string
          id: string
          latest: boolean
          meeting_topic_id: string
          profile_id: string
          timestamp: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          event: string
          id?: string
          latest?: boolean
          meeting_topic_id: string
          profile_id: string
          timestamp: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          event?: string
          id?: string
          latest?: boolean
          meeting_topic_id?: string
          profile_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_topic_events_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_meeting_topic_id_fkey"
            columns: ["meeting_topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_topic_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_topics: {
        Row: {
          api_video_id: string
          created_at: string
          id: string
          server_deleted_at: string | null
          summary: string
          title: string
          vtt_end_segment_id: number | null
          vtt_start_segment_id: number | null
        }
        Insert: {
          api_video_id: string
          created_at?: string
          id?: string
          server_deleted_at?: string | null
          summary: string
          title: string
          vtt_end_segment_id?: number | null
          vtt_start_segment_id?: number | null
        }
        Update: {
          api_video_id?: string
          created_at?: string
          id?: string
          server_deleted_at?: string | null
          summary?: string
          title?: string
          vtt_end_segment_id?: number | null
          vtt_start_segment_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_topics_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_topics_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_topics_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_topics_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      meeting_topics_v2: {
        Row: {
          api_video_id: string
          created_at: string
          end_segment_id: number
          id: string
          index: number
          latest: boolean
          profile_id: string
          start_segment_id: number
          summary: string
          title: string
        }
        Insert: {
          api_video_id: string
          created_at?: string
          end_segment_id: number
          id?: string
          index: number
          latest?: boolean
          profile_id: string
          start_segment_id: number
          summary: string
          title: string
        }
        Update: {
          api_video_id?: string
          created_at?: string
          end_segment_id?: number
          id?: string
          index?: number
          latest?: boolean
          profile_id?: string
          start_segment_id?: number
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_topics_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_topics_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_topics_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_topics_v2_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "meeting_topics_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_topics_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_topics_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          clean_vtt_file: string | null
          created_at: string
          date: string | null
          db_created_at: string | null
          duration_in_ms: number | null
          duration_in_seconds: number | null
          meeting_baas_original_json: Json | null
          name: string | null
          original_vtt_file: string | null
          preprocessing_payload: Json | null
          profile_id: string | null
          provider:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          searchable: unknown | null
          speaker: string | null
          speaker_time_percentage: number | null
          summary: string | null
          tags: string | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["event_type"] | null
          updated_at: string
          vectorized: boolean
          video_api_id: string
        }
        Insert: {
          clean_vtt_file?: string | null
          created_at?: string
          date?: string | null
          db_created_at?: string | null
          duration_in_ms?: number | null
          duration_in_seconds?: number | null
          meeting_baas_original_json?: Json | null
          name?: string | null
          original_vtt_file?: string | null
          preprocessing_payload?: Json | null
          profile_id?: string | null
          provider?:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          searchable?: unknown | null
          speaker?: string | null
          speaker_time_percentage?: number | null
          summary?: string | null
          tags?: string | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["event_type"] | null
          updated_at?: string
          vectorized?: boolean
          video_api_id: string
        }
        Update: {
          clean_vtt_file?: string | null
          created_at?: string
          date?: string | null
          db_created_at?: string | null
          duration_in_ms?: number | null
          duration_in_seconds?: number | null
          meeting_baas_original_json?: Json | null
          name?: string | null
          original_vtt_file?: string | null
          preprocessing_payload?: Json | null
          profile_id?: string | null
          provider?:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          searchable?: unknown | null
          speaker?: string | null
          speaker_time_percentage?: number | null
          summary?: string | null
          tags?: string | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["event_type"] | null
          updated_at?: string
          vectorized?: boolean
          video_api_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meetings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          moment_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          moment_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          moment_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_comments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_comments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_profile_development_themes: {
        Row: {
          connection_strength_score: number | null
          created_at: string
          id: string
          moment_id: string | null
          profile_development_theme_id: string | null
        }
        Insert: {
          connection_strength_score?: number | null
          created_at?: string
          id?: string
          moment_id?: string | null
          profile_development_theme_id?: string | null
        }
        Update: {
          connection_strength_score?: number | null
          created_at?: string
          id?: string
          moment_id?: string | null
          profile_development_theme_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moment_profile_development_th_profile_development_theme_id_fkey"
            columns: ["profile_development_theme_id"]
            isOneToOne: false
            referencedRelation: "profile_development_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_profile_development_themes_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_profile_development_themes_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_reactions: {
        Row: {
          created_at: string
          id: string
          moment_id: string
          reaction_type: Database["public"]["Enums"]["moment_reaction_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moment_id: string
          reaction_type: Database["public"]["Enums"]["moment_reaction_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          moment_id?: string
          reaction_type?: Database["public"]["Enums"]["moment_reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_reactions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_reactions_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_subtags: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          moment_id: string | null
          profile_id: string | null
          reasoning: string | null
          tag: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          moment_id?: string | null
          profile_id?: string | null
          reasoning?: string | null
          tag?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          moment_id?: string | null
          profile_id?: string | null
          reasoning?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moment_subtags_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_subtags_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_subtags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_subtags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_subtags_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_subtags_qa: {
        Row: {
          created_at: string
          decision: boolean | null
          id: string
          moment_id: string | null
          note: string | null
          profile_id: string | null
          tag: string | null
        }
        Insert: {
          created_at?: string
          decision?: boolean | null
          id?: string
          moment_id?: string | null
          note?: string | null
          profile_id?: string | null
          tag?: string | null
        }
        Update: {
          created_at?: string
          decision?: boolean | null
          id?: string
          moment_id?: string | null
          note?: string | null
          profile_id?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moment_subtags_qa_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_subtags_qa_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_subtags_qa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_subtags_qa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moment_subtags_qa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_types: {
        Row: {
          color: string | null
          created_at: string
          icon: Database["public"]["Enums"]["icon_enum"]
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon: Database["public"]["Enums"]["icon_enum"]
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: Database["public"]["Enums"]["icon_enum"]
          name?: string
          slug?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          _internal_comment: string | null
          _internal_thumbs_down: number
          _internal_thumbs_up: number
          activity: string | null
          activity_reasoning: string | null
          activity_type: string | null
          activity_type_confidence: number | null
          altitude_reasoning: string | null
          altitude_score: number | null
          altitude_score_reasoning: string | null
          altitude_score_reasoning_not_higher: string | null
          altitude_score_reasoning_not_lower: string | null
          altitude_type: string | null
          coaching_theme_summary: string | null
          coaching_themes_analyses: string | null
          created_at: string
          final_score: number | null
          id: string
          intensity: number | null
          interestingness_reasoning: string | null
          interestingness_reasoning_not_higher: string | null
          interestingness_reasoning_not_lower: string | null
          interestingness_score: number | null
          latest: boolean
          moment_url: string | null
          profile_id: string | null
          qa_reasoning: string | null
          qa_reasoning_not_higher: string | null
          qa_reasoning_not_lower: string | null
          qa_score: number | null
          relevant: boolean
          search_vector: unknown | null
          segment_end_timestamp: string | null
          segment_end_timestamp_in_seconds: number | null
          segment_id_sequence_end: number | null
          segment_id_sequence_start: number | null
          segment_id_sequence_start_ideal: number | null
          segment_id_sequence_start_ideal_algorithm: number | null
          segment_start_timestamp: string | null
          segment_start_timestamp_in_seconds: number | null
          segment_start_timestamp_in_seconds_ideal: number | null
          segment_start_timestamp_in_seconds_ideal_algorithm: number | null
          summary: string | null
          target_person_confidence: number | null
          target_person_reasoning: string | null
          target_person_score: number | null
          target_person_type: string | null
          title: string | null
          topic_id: string | null
          updated_at: string | null
          version: number | null
          video_api_id: string | null
          vtt: string | null
        }
        Insert: {
          _internal_comment?: string | null
          _internal_thumbs_down?: number
          _internal_thumbs_up?: number
          activity?: string | null
          activity_reasoning?: string | null
          activity_type?: string | null
          activity_type_confidence?: number | null
          altitude_reasoning?: string | null
          altitude_score?: number | null
          altitude_score_reasoning?: string | null
          altitude_score_reasoning_not_higher?: string | null
          altitude_score_reasoning_not_lower?: string | null
          altitude_type?: string | null
          coaching_theme_summary?: string | null
          coaching_themes_analyses?: string | null
          created_at?: string
          final_score?: number | null
          id: string
          intensity?: number | null
          interestingness_reasoning?: string | null
          interestingness_reasoning_not_higher?: string | null
          interestingness_reasoning_not_lower?: string | null
          interestingness_score?: number | null
          latest?: boolean
          moment_url?: string | null
          profile_id?: string | null
          qa_reasoning?: string | null
          qa_reasoning_not_higher?: string | null
          qa_reasoning_not_lower?: string | null
          qa_score?: number | null
          relevant?: boolean
          search_vector?: unknown | null
          segment_end_timestamp?: string | null
          segment_end_timestamp_in_seconds?: number | null
          segment_id_sequence_end?: number | null
          segment_id_sequence_start?: number | null
          segment_id_sequence_start_ideal?: number | null
          segment_id_sequence_start_ideal_algorithm?: number | null
          segment_start_timestamp?: string | null
          segment_start_timestamp_in_seconds?: number | null
          segment_start_timestamp_in_seconds_ideal?: number | null
          segment_start_timestamp_in_seconds_ideal_algorithm?: number | null
          summary?: string | null
          target_person_confidence?: number | null
          target_person_reasoning?: string | null
          target_person_score?: number | null
          target_person_type?: string | null
          title?: string | null
          topic_id?: string | null
          updated_at?: string | null
          version?: number | null
          video_api_id?: string | null
          vtt?: string | null
        }
        Update: {
          _internal_comment?: string | null
          _internal_thumbs_down?: number
          _internal_thumbs_up?: number
          activity?: string | null
          activity_reasoning?: string | null
          activity_type?: string | null
          activity_type_confidence?: number | null
          altitude_reasoning?: string | null
          altitude_score?: number | null
          altitude_score_reasoning?: string | null
          altitude_score_reasoning_not_higher?: string | null
          altitude_score_reasoning_not_lower?: string | null
          altitude_type?: string | null
          coaching_theme_summary?: string | null
          coaching_themes_analyses?: string | null
          created_at?: string
          final_score?: number | null
          id?: string
          intensity?: number | null
          interestingness_reasoning?: string | null
          interestingness_reasoning_not_higher?: string | null
          interestingness_reasoning_not_lower?: string | null
          interestingness_score?: number | null
          latest?: boolean
          moment_url?: string | null
          profile_id?: string | null
          qa_reasoning?: string | null
          qa_reasoning_not_higher?: string | null
          qa_reasoning_not_lower?: string | null
          qa_score?: number | null
          relevant?: boolean
          search_vector?: unknown | null
          segment_end_timestamp?: string | null
          segment_end_timestamp_in_seconds?: number | null
          segment_id_sequence_end?: number | null
          segment_id_sequence_start?: number | null
          segment_id_sequence_start_ideal?: number | null
          segment_id_sequence_start_ideal_algorithm?: number | null
          segment_start_timestamp?: string | null
          segment_start_timestamp_in_seconds?: number | null
          segment_start_timestamp_in_seconds_ideal?: number | null
          segment_start_timestamp_in_seconds_ideal_algorithm?: number | null
          summary?: string | null
          target_person_confidence?: number | null
          target_person_reasoning?: string | null
          target_person_score?: number | null
          target_person_type?: string | null
          title?: string | null
          topic_id?: string | null
          updated_at?: string | null
          version?: number | null
          video_api_id?: string | null
          vtt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "meeting_topics_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      moments_qa: {
        Row: {
          activity: boolean | null
          activity_borderline: boolean | null
          activity_borderline_note: string | null
          activity_note: string | null
          activity_type: string | null
          activity_type_note: string | null
          altitude_note: string | null
          altitude_score: number | null
          created_at: string | null
          id: string
          ideal_time_stamp_index: number | null
          moment_id: string | null
          profile_id: string
          skip_flag: boolean | null
          target_person: string | null
          target_person_note: string | null
        }
        Insert: {
          activity?: boolean | null
          activity_borderline?: boolean | null
          activity_borderline_note?: string | null
          activity_note?: string | null
          activity_type?: string | null
          activity_type_note?: string | null
          altitude_note?: string | null
          altitude_score?: number | null
          created_at?: string | null
          id?: string
          ideal_time_stamp_index?: number | null
          moment_id?: string | null
          profile_id?: string
          skip_flag?: boolean | null
          target_person?: string | null
          target_person_note?: string | null
        }
        Update: {
          activity?: boolean | null
          activity_borderline?: boolean | null
          activity_borderline_note?: string | null
          activity_note?: string | null
          activity_type?: string | null
          activity_type_note?: string | null
          altitude_note?: string | null
          altitude_score?: number | null
          created_at?: string | null
          id?: string
          ideal_time_stamp_index?: number | null
          moment_id?: string | null
          profile_id?: string
          skip_flag?: boolean | null
          target_person?: string | null
          target_person_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moments_qa_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_qa_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_qa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moments_qa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moments_qa_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moments_v2: {
        Row: {
          activity: string | null
          activity_reasoning: string | null
          activity_type: string | null
          altitude_reasoning: string | null
          altitude_score: number | null
          altitude_score_reasoning: string | null
          altitude_score_reasoning_not_higher: string | null
          altitude_score_reasoning_not_lower: string | null
          altitude_type: string | null
          created_at: string | null
          final_score: number | null
          id: string
          intensity: number | null
          interestingness_reasoning: string | null
          interestingness_reasoning_not_higher: string | null
          interestingness_reasoning_not_lower: string | null
          interestingness_score: number | null
          latest: string | null
          moment_url: string | null
          profile_id: string | null
          qa_reasoning: string | null
          qa_reasoning_not_higher: string | null
          qa_reasoning_not_lower: string | null
          qa_score: number | null
          relevant: boolean
          search_vector: unknown | null
          segment_end_timestamp: string | null
          segment_end_timestamp_in_seconds: number | null
          segment_id_sequence_end: number | null
          segment_id_sequence_start: number | null
          segment_start_timestamp: string | null
          segment_start_timestamp_in_seconds: number | null
          summary: string | null
          target_person_reasoning: string | null
          target_person_role_reasoning: string | null
          target_person_role_score: number | null
          target_person_role_type: string | null
          target_person_score: number | null
          target_person_type: string | null
          title: string | null
          topic_id: string | null
          updated_at: string | null
          version: number
          video_api_id: string | null
          vtt: string | null
        }
        Insert: {
          activity?: string | null
          activity_reasoning?: string | null
          activity_type?: string | null
          altitude_reasoning?: string | null
          altitude_score?: number | null
          altitude_score_reasoning?: string | null
          altitude_score_reasoning_not_higher?: string | null
          altitude_score_reasoning_not_lower?: string | null
          altitude_type?: string | null
          created_at?: string | null
          final_score?: number | null
          id?: string
          intensity?: number | null
          interestingness_reasoning?: string | null
          interestingness_reasoning_not_higher?: string | null
          interestingness_reasoning_not_lower?: string | null
          interestingness_score?: number | null
          latest?: string | null
          moment_url?: string | null
          profile_id?: string | null
          qa_reasoning?: string | null
          qa_reasoning_not_higher?: string | null
          qa_reasoning_not_lower?: string | null
          qa_score?: number | null
          relevant?: boolean
          search_vector?: unknown | null
          segment_end_timestamp?: string | null
          segment_end_timestamp_in_seconds?: number | null
          segment_id_sequence_end?: number | null
          segment_id_sequence_start?: number | null
          segment_start_timestamp?: string | null
          segment_start_timestamp_in_seconds?: number | null
          summary?: string | null
          target_person_reasoning?: string | null
          target_person_role_reasoning?: string | null
          target_person_role_score?: number | null
          target_person_role_type?: string | null
          target_person_score?: number | null
          target_person_type?: string | null
          title?: string | null
          topic_id?: string | null
          updated_at?: string | null
          version?: number
          video_api_id?: string | null
          vtt?: string | null
        }
        Update: {
          activity?: string | null
          activity_reasoning?: string | null
          activity_type?: string | null
          altitude_reasoning?: string | null
          altitude_score?: number | null
          altitude_score_reasoning?: string | null
          altitude_score_reasoning_not_higher?: string | null
          altitude_score_reasoning_not_lower?: string | null
          altitude_type?: string | null
          created_at?: string | null
          final_score?: number | null
          id?: string
          intensity?: number | null
          interestingness_reasoning?: string | null
          interestingness_reasoning_not_higher?: string | null
          interestingness_reasoning_not_lower?: string | null
          interestingness_score?: number | null
          latest?: string | null
          moment_url?: string | null
          profile_id?: string | null
          qa_reasoning?: string | null
          qa_reasoning_not_higher?: string | null
          qa_reasoning_not_lower?: string | null
          qa_score?: number | null
          relevant?: boolean
          search_vector?: unknown | null
          segment_end_timestamp?: string | null
          segment_end_timestamp_in_seconds?: number | null
          segment_id_sequence_end?: number | null
          segment_id_sequence_start?: number | null
          segment_start_timestamp?: string | null
          segment_start_timestamp_in_seconds?: number | null
          summary?: string | null
          target_person_reasoning?: string | null
          target_person_role_reasoning?: string | null
          target_person_role_score?: number | null
          target_person_role_type?: string | null
          target_person_score?: number | null
          target_person_type?: string | null
          title?: string | null
          topic_id?: string | null
          updated_at?: string | null
          version?: number
          video_api_id?: string | null
          vtt?: string | null
        }
        Relationships: []
      }
      observation_prompts: {
        Row: {
          created_at: string
          id: string
          latest: boolean | null
          profile_id: string | null
          prompt: string
          result: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          id: string
          latest?: boolean | null
          profile_id?: string | null
          prompt: string
          result?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          latest?: boolean | null
          profile_id?: string | null
          prompt?: string
          result?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observation_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "observation_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "observation_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_task_completions: {
        Row: {
          completed_at: string
          id: string
          profile_id: string
          task_name: Database["public"]["Enums"]["onboarding_task_name_enum"]
        }
        Insert: {
          completed_at?: string
          id?: string
          profile_id: string
          task_name: Database["public"]["Enums"]["onboarding_task_name_enum"]
        }
        Update: {
          completed_at?: string
          id?: string
          profile_id?: string
          task_name?: Database["public"]["Enums"]["onboarding_task_name_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_task_completions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "onboarding_task_completions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "onboarding_task_completions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_development_themes: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string
          icon: string
          id: string
          is_enabled: boolean
          key_points: string[]
          order: number
          parent_theme: string | null
          profile_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description: string
          icon: string
          id?: string
          is_enabled: boolean
          key_points: string[]
          order: number
          parent_theme?: string | null
          profile_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_enabled?: boolean
          key_points?: string[]
          order?: number
          parent_theme?: string | null
          profile_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_development_themes_parent_theme_fkey"
            columns: ["parent_theme"]
            isOneToOne: false
            referencedRelation: "profile_development_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_development_themes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_development_themes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_development_themes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_enhancements: {
        Row: {
          created_at: string
          dossier: string | null
          id: string
          org_chart: Json | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          dossier?: string | null
          id?: string
          org_chart?: Json | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          dossier?: string | null
          id?: string
          org_chart?: Json | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_enhancements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_enhancements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_enhancements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_signals: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          id: string
          is_enabled: boolean
          profile_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          id?: string
          is_enabled?: boolean
          profile_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["goal_signal_direction_type"]
          id?: string
          is_enabled?: boolean
          profile_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_signals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_signals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profile_signals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          coach_id: string | null
          company: string | null
          created_at: string | null
          did_complete_onboarding: boolean
          did_complete_post_ten_meeting_onboarding: boolean
          email: string
          explore_email_sent: boolean | null
          force_post_ten_meeting_onboarding: boolean
          id: string
          image_url: string | null
          is_admin: boolean
          nickname: string | null
          role: Database["public"]["Enums"]["user_role_enum"]
          status: Database["public"]["Enums"]["profile_status_enum"]
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          company?: string | null
          created_at?: string | null
          did_complete_onboarding?: boolean
          did_complete_post_ten_meeting_onboarding?: boolean
          email: string
          explore_email_sent?: boolean | null
          force_post_ten_meeting_onboarding?: boolean
          id: string
          image_url?: string | null
          is_admin?: boolean
          nickname?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: Database["public"]["Enums"]["profile_status_enum"]
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          company?: string | null
          created_at?: string | null
          did_complete_onboarding?: boolean
          did_complete_post_ten_meeting_onboarding?: boolean
          email?: string
          explore_email_sent?: boolean | null
          force_post_ten_meeting_onboarding?: boolean
          id?: string
          image_url?: string | null
          is_admin?: boolean
          nickname?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: Database["public"]["Enums"]["profile_status_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qna_chunks: {
        Row: {
          chunk_id: string | null
          clear_text: string | null
          created_at: string
          id: string
          sources: Json | null
          video_api_id: string | null
        }
        Insert: {
          chunk_id?: string | null
          clear_text?: string | null
          created_at?: string
          id?: string
          sources?: Json | null
          video_api_id?: string | null
        }
        Update: {
          chunk_id?: string | null
          clear_text?: string | null
          created_at?: string
          id?: string
          sources?: Json | null
          video_api_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qna_chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "qna_chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "qna_chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "qna_chunks_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      recall_calendars: {
        Row: {
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["recall_calendar_platform_type"]
          profile_id: string
        }
        Insert: {
          created_at?: string
          id: string
          platform: Database["public"]["Enums"]["recall_calendar_platform_type"]
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["recall_calendar_platform_type"]
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_calendars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recall_calendars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recall_calendars_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_calendars_v2: {
        Row: {
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["recall_calendar_platform_type"]
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          platform: Database["public"]["Enums"]["recall_calendar_platform_type"]
          profile_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["recall_calendar_platform_type"]
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_calendars_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recall_calendars_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recall_calendars_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          profile_id: string
          report_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          profile_id: string
          report_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          profile_id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "report_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "report_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_goal_signals: {
        Row: {
          activity: string | null
          activity_type: string | null
          created_at: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_signal_id: string
          hidden_text: string | null
          id: string
          report_id: string
          tag: string | null
          target_person_type: string | null
          text: string | null
        }
        Insert: {
          activity?: string | null
          activity_type?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_signal_id: string
          hidden_text?: string | null
          id?: string
          report_id: string
          tag?: string | null
          target_person_type?: string | null
          text?: string | null
        }
        Update: {
          activity?: string | null
          activity_type?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["goal_signal_direction_type"]
          goal_signal_id?: string
          hidden_text?: string | null
          id?: string
          report_id?: string
          tag?: string | null
          target_person_type?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_goal_signals_goal_signal_id_fkey"
            columns: ["goal_signal_id"]
            isOneToOne: false
            referencedRelation: "goal_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_goal_signals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_goals: {
        Row: {
          created_at: string | null
          goal_id: string
          hidden_text: string | null
          id: string
          is_reviewed: boolean
          report_id: string
          text: string | null
          updated_at: string | null
          user_provided_context: string | null
        }
        Insert: {
          created_at?: string | null
          goal_id: string
          hidden_text?: string | null
          id?: string
          is_reviewed?: boolean
          report_id: string
          text?: string | null
          updated_at?: string | null
          user_provided_context?: string | null
        }
        Update: {
          created_at?: string | null
          goal_id?: string
          hidden_text?: string | null
          id?: string
          is_reviewed?: boolean
          report_id?: string
          text?: string | null
          updated_at?: string | null
          user_provided_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_goals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_moments: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean | null
          moment_id: string
          omission_reason: string | null
          report_goal_signal_id: string
          report_id: string
          report_section_above_threshold: boolean | null
          report_section_confidence: number | null
          report_section_id: string | null
          report_section_reasoning: string | null
          score: number | null
          updated_at: string | null
          VTT: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean | null
          moment_id: string
          omission_reason?: string | null
          report_goal_signal_id: string
          report_id: string
          report_section_above_threshold?: boolean | null
          report_section_confidence?: number | null
          report_section_id?: string | null
          report_section_reasoning?: string | null
          score?: number | null
          updated_at?: string | null
          VTT?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean | null
          moment_id?: string
          omission_reason?: string | null
          report_goal_signal_id?: string
          report_id?: string
          report_section_above_threshold?: boolean | null
          report_section_confidence?: number | null
          report_section_id?: string | null
          report_section_reasoning?: string | null
          score?: number | null
          updated_at?: string | null
          VTT?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_moments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_moments_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments_with_score"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_moments_report_goal_signal_id_fkey"
            columns: ["report_goal_signal_id"]
            isOneToOne: false
            referencedRelation: "report_goal_signals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_moments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_moments_report_section_id_fkey"
            columns: ["report_section_id"]
            isOneToOne: false
            referencedRelation: "report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      report_processing_status: {
        Row: {
          created_at: string
          error_msg: string | null
          group_processing_status_id: string
          id: string
          report_id: string | null
          status: Database["public"]["Enums"]["report_processing_status_type"]
        }
        Insert: {
          created_at?: string
          error_msg?: string | null
          group_processing_status_id: string
          id: string
          report_id?: string | null
          status?: Database["public"]["Enums"]["report_processing_status_type"]
        }
        Update: {
          created_at?: string
          error_msg?: string | null
          group_processing_status_id?: string
          id?: string
          report_id?: string | null
          status?: Database["public"]["Enums"]["report_processing_status_type"]
        }
        Relationships: [
          {
            foreignKeyName: "report_processing_status_group_processing_status_id_fkey"
            columns: ["group_processing_status_id"]
            isOneToOne: false
            referencedRelation: "group_report_processing_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_processing_status_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_sections: {
        Row: {
          created_at: string
          direction:
            | Database["public"]["Enums"]["goal_signal_direction_type"]
            | null
          id: string
          index: number | null
          report_id: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          direction?:
            | Database["public"]["Enums"]["goal_signal_direction_type"]
            | null
          id?: string
          index?: number | null
          report_id?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          direction?:
            | Database["public"]["Enums"]["goal_signal_direction_type"]
            | null
          id?: string
          index?: number | null
          report_id?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_hidden: boolean
          personality_badges: string[] | null
          personality_color: string | null
          personality_description: string | null
          personality_icon: string | null
          personality_text: string | null
          profile_id: string | null
          skill_id: string | null
          start_date: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_hidden?: boolean
          personality_badges?: string[] | null
          personality_color?: string | null
          personality_description?: string | null
          personality_icon?: string | null
          personality_text?: string | null
          profile_id?: string | null
          skill_id?: string | null
          start_date?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_hidden?: boolean
          personality_badges?: string[] | null
          personality_color?: string | null
          personality_description?: string | null
          personality_icon?: string | null
          personality_text?: string | null
          profile_id?: string | null
          skill_id?: string | null
          start_date?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_meetings: {
        Row: {
          calendar_id: string
          conference_id: string | null
          created_at: string | null
          event_id: string
          id: string
          meet_link: string | null
          notification_time: string
          start_time: string
          status: string
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          calendar_id: string
          conference_id?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          meet_link?: string | null
          notification_time: string
          start_time: string
          status?: string
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          calendar_id?: string
          conference_id?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          meet_link?: string | null
          notification_time?: string
          start_time?: string
          status?: string
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_meetings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          duration: number | null
          end_timestamp: string | null
          hard_filler_word_count: number | null
          id: string
          index: number | null
          profanity_count: number | null
          question_count: number | null
          sentence_count: number | null
          soft_filler_word_count: number | null
          speaker_name: string | null
          start_timestamp: string | null
          text: string | null
          total_arousal: number | null
          total_dominance: number | null
          total_valence: number | null
          vad_word_count: number | null
          video_api_id: string | null
          word_count: number | null
        }
        Insert: {
          duration?: number | null
          end_timestamp?: string | null
          hard_filler_word_count?: number | null
          id: string
          index?: number | null
          profanity_count?: number | null
          question_count?: number | null
          sentence_count?: number | null
          soft_filler_word_count?: number | null
          speaker_name?: string | null
          start_timestamp?: string | null
          text?: string | null
          total_arousal?: number | null
          total_dominance?: number | null
          total_valence?: number | null
          vad_word_count?: number | null
          video_api_id?: string | null
          word_count?: number | null
        }
        Update: {
          duration?: number | null
          end_timestamp?: string | null
          hard_filler_word_count?: number | null
          id?: string
          index?: number | null
          profanity_count?: number | null
          question_count?: number | null
          sentence_count?: number | null
          soft_filler_word_count?: number | null
          speaker_name?: string | null
          start_timestamp?: string | null
          text?: string | null
          total_arousal?: number | null
          total_dominance?: number | null
          total_valence?: number | null
          vad_word_count?: number | null
          video_api_id?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      session_annotation_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: Database["public"]["Enums"]["moment_reaction_type"]
          session_annotation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: Database["public"]["Enums"]["moment_reaction_type"]
          session_annotation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: Database["public"]["Enums"]["moment_reaction_type"]
          session_annotation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_annotation_reactions_session_annotation_id_fkey"
            columns: ["session_annotation_id"]
            isOneToOne: false
            referencedRelation: "session_annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_annotation_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "session_annotation_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "session_annotation_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_annotation_sources: {
        Row: {
          created_at: string
          id: string
          session_annotation_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_annotation_id: string
          source_id: string
          source_type: string
        }
        Update: {
          created_at?: string
          id?: string
          session_annotation_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_annotation_sources_session_annotation_id_fkey"
            columns: ["session_annotation_id"]
            isOneToOne: false
            referencedRelation: "session_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_annotations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          session_id: string
          thumbs_down: number
          thumbs_up: number
          title: string | null
          title_summarized: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          session_id: string
          thumbs_down?: number
          thumbs_up?: number
          title?: string | null
          title_summarized?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          session_id?: string
          thumbs_down?: number
          thumbs_up?: number
          title?: string | null
          title_summarized?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_annotations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          attachment_url: string | null
          author_id: string
          color: Database["public"]["Enums"]["note_color"]
          content: string
          created_at: string
          id: string
          minimized: boolean
          position_x: number
          position_y: number
          session_id: string
          updated_at: string
          z_index: number
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          color?: Database["public"]["Enums"]["note_color"]
          content: string
          created_at?: string
          id?: string
          minimized?: boolean
          position_x?: number
          position_y?: number
          session_id: string
          updated_at?: string
          z_index?: number
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          color?: Database["public"]["Enums"]["note_color"]
          content?: string
          created_at?: string
          id?: string
          minimized?: boolean
          position_x?: number
          position_y?: number
          session_id?: string
          updated_at?: string
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "session_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "session_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          api_video_id: string | null
          coach_id: string | null
          created_at: string
          date: string | null
          event_id: string | null
          id: string
          summary: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          api_video_id?: string | null
          coach_id?: string | null
          created_at?: string
          date?: string | null
          event_id?: string | null
          id?: string
          summary?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          api_video_id?: string | null
          coach_id?: string | null
          created_at?: string
          date?: string | null
          event_id?: string | null
          id?: string
          summary?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "coach_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "coach_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "coach_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "coach_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "sessions_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "sessions_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "sessions_api_video_id_fkey"
            columns: ["api_video_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_event_details_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_scales: {
        Row: {
          id: string
          negative_tag_description: string | null
          negative_tag_title: string
          positive_tag_description: string | null
          positive_tag_title: string
          skill_id: string
        }
        Insert: {
          id?: string
          negative_tag_description?: string | null
          negative_tag_title: string
          positive_tag_description?: string | null
          positive_tag_title: string
          skill_id: string
        }
        Update: {
          id?: string
          negative_tag_description?: string | null
          negative_tag_title?: string
          positive_tag_description?: string | null
          positive_tag_title?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_scales_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          internal_title: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          internal_title?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          internal_title?: string | null
          title?: string
        }
        Relationships: []
      }
      transcript_slices: {
        Row: {
          bot_id: string
          created_at: string
          id: string
          index: number
          speaker_name: string | null
        }
        Insert: {
          bot_id: string
          created_at?: string
          id?: string
          index: number
          speaker_name?: string | null
        }
        Update: {
          bot_id?: string
          created_at?: string
          id?: string
          index?: number
          speaker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bot_transcript_slices_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bot_transcripts"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "meeting_bot_transcript_slices_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_slices_v2: {
        Row: {
          bot_id: string
          created_at: string
          id: string
          index: number
          speaker_name: string | null
        }
        Insert: {
          bot_id: string
          created_at?: string
          id?: string
          index: number
          speaker_name?: string | null
        }
        Update: {
          bot_id?: string
          created_at?: string
          id?: string
          index?: number
          speaker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_slices_v2_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bots_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_words: {
        Row: {
          bot_id: string
          content: string | null
          created_at: string
          end_time: number | null
          id: string
          index: number | null
          start_time: number | null
          transcript_slice_id: string
        }
        Insert: {
          bot_id?: string
          content?: string | null
          created_at?: string
          end_time?: number | null
          id?: string
          index?: number | null
          start_time?: number | null
          transcript_slice_id?: string
        }
        Update: {
          bot_id?: string
          content?: string | null
          created_at?: string
          end_time?: number | null
          id?: string
          index?: number | null
          start_time?: number | null
          transcript_slice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_words_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bot_transcripts"
            referencedColumns: ["bot_id"]
          },
          {
            foreignKeyName: "transcript_words_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_words_transcript_slice_id_fkey"
            columns: ["transcript_slice_id"]
            isOneToOne: false
            referencedRelation: "transcript_slices"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_words_v2: {
        Row: {
          bot_id: string
          content: string | null
          created_at: string
          end_time: number | null
          id: string
          index: number | null
          start_time: number | null
          transcript_slice_id: string
        }
        Insert: {
          bot_id: string
          content?: string | null
          created_at?: string
          end_time?: number | null
          id?: string
          index?: number | null
          start_time?: number | null
          transcript_slice_id: string
        }
        Update: {
          bot_id?: string
          content?: string | null
          created_at?: string
          end_time?: number | null
          id?: string
          index?: number | null
          start_time?: number | null
          transcript_slice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_words_v2_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bots_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_words_v2_transcript_slice_id_fkey1"
            columns: ["transcript_slice_id"]
            isOneToOne: false
            referencedRelation: "transcript_slices_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          company: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          invited_by: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role_enum"] | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          invited_by: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          invited_by?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          bot_name: string | null
          created_at: string
          has_ai_coaching_enabled: boolean
          id: number
          profile_id: string
          report_email_template: Database["public"]["Enums"]["email_template_type"]
          report_frequency_in_days: number
          should_join_external_meetings: boolean
          should_join_team_meetings: boolean
          should_not_join_coaching_sessions: boolean
          should_not_join_owned_by_others_meetings: boolean
          should_not_join_pending_meetings: boolean
        }
        Insert: {
          bot_name?: string | null
          created_at?: string
          has_ai_coaching_enabled?: boolean
          id?: number
          profile_id: string
          report_email_template?: Database["public"]["Enums"]["email_template_type"]
          report_frequency_in_days?: number
          should_join_external_meetings?: boolean
          should_join_team_meetings?: boolean
          should_not_join_coaching_sessions?: boolean
          should_not_join_owned_by_others_meetings?: boolean
          should_not_join_pending_meetings?: boolean
        }
        Update: {
          bot_name?: string | null
          created_at?: string
          has_ai_coaching_enabled?: boolean
          id?: number
          profile_id?: string
          report_email_template?: Database["public"]["Enums"]["email_template_type"]
          report_frequency_in_days?: number
          should_join_external_meetings?: boolean
          should_join_team_meetings?: boolean
          should_not_join_coaching_sessions?: boolean
          should_not_join_owned_by_others_meetings?: boolean
          should_not_join_pending_meetings?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "user_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      action_items_with_assignees: {
        Row: {
          assignee_entity_ids: string[] | null
          assignee_names: string[] | null
          completed: boolean | null
          completed_date: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          meeting_date: string | null
          meeting_id: string | null
          meeting_title: string | null
          participant_entity_ids: string[] | null
          participant_names: string[] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "meeting_action_items_api_video_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      calendar_event_details_v2: {
        Row: {
          attendees: Json | null
          created: string | null
          created_at: string | null
          creator_email: string | null
          end_date_time: string | null
          end_time: string | null
          event_id: string | null
          html_link: string | null
          ical_uid: string | null
          id: string | null
          is_deleted: boolean | null
          meeting_platform:
            | Database["public"]["Enums"]["meeting_platform_enum"]
            | null
          meeting_url: string | null
          platform:
            | Database["public"]["Enums"]["recall_calendar_platform_type"]
            | null
          platform_id: string | null
          profile_id: string | null
          raw: Json | null
          recall_calendar_id: string | null
          should_join_user_override: boolean | null
          start_date_time: string | null
          start_time: string | null
          status: string | null
          summary: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "calendar_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "calendar_events_v2_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_v2_recall_calendar_id_fkey1"
            columns: ["recall_calendar_id"]
            isOneToOne: false
            referencedRelation: "recall_calendars_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bot_transcripts: {
        Row: {
          bot_id: string | null
          transcripts: Json[] | null
        }
        Relationships: []
      }
      meeting_processing_status_view: {
        Row: {
          action_items_status: string | null
          backend_call_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          created_at: string | null
          email: string | null
          embed_meeting_status: string | null
          embed_moments_status: string | null
          entity_extraction_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          id: string | null
          interestingness_status: string | null
          internal: boolean | null
          meeting_bot_id: string | null
          meeting_created_at: string | null
          meeting_name: string | null
          meeting_summary: string | null
          meeting_video_api_id: string | null
          meetings_status: string | null
          moments_status: string | null
          nickname: string | null
          observation_status: string | null
          origin: string | null
          profile_id: string | null
          segments_status: string | null
          supabase_video_upload_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          topic_segmentation_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          topics_status: string | null
          transcript_slice_words_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          updated_at: string | null
          video_api_upload_status:
            | Database["public"]["Enums"]["processing_status"]
            | null
          video_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_processing_status_meeting_bot_id_fkey"
            columns: ["meeting_bot_id"]
            isOneToOne: true
            referencedRelation: "meeting_bots_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings_with_profile: {
        Row: {
          clean_vtt_file: string | null
          created_at: string | null
          date: string | null
          db_created_at: string | null
          duration_in_ms: number | null
          meeting_baas_original_json: Json | null
          name: string | null
          original_vtt_file: string | null
          profile_id: string | null
          searchable: unknown | null
          speaker: string | null
          summary: string | null
          tags: string | null
          thumbnail_url: string | null
          vectorized: boolean | null
          video_api_id: string | null
        }
        Relationships: []
      }
      moments_with_score: {
        Row: {
          activity: string | null
          activity_reasoning: string | null
          activity_type: string | null
          created_at: string | null
          date: string | null
          id: string | null
          intensity: number | null
          latest: boolean | null
          moment_url: string | null
          profile_id: string | null
          relevant: boolean | null
          score: number | null
          search_vector: unknown | null
          segment_end_timestamp: string | null
          segment_end_timestamp_in_seconds: number | null
          segment_id_sequence_end: number | null
          segment_id_sequence_start: number | null
          segment_start_timestamp: string | null
          segment_start_timestamp_in_seconds: number | null
          summary: string | null
          target_person_reasoning: string | null
          target_person_type: string | null
          title: string | null
          updated_at: string | null
          version: number | null
          video_api_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "moments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meeting_processing_status_view"
            referencedColumns: ["meeting_video_api_id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "meetings_with_profile"
            referencedColumns: ["video_api_id"]
          },
          {
            foreignKeyName: "moments_video_api_id_fkey"
            columns: ["video_api_id"]
            isOneToOne: false
            referencedRelation: "upcoming_meetings_with_action_items"
            referencedColumns: ["meeting_id"]
          },
        ]
      }
      upcoming_meetings_with_action_items: {
        Row: {
          incomplete_action_items: number | null
          meeting_date: string | null
          meeting_id: string | null
          meeting_title: string | null
          participant_names: string[] | null
          total_action_items: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_meeting_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_user_permissions: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_action_items_for_entity: {
        Args: { entity_id: string }
        Returns: {
          id: string
          title: string
          meeting_id: string
          meeting_title: string
          due_date: string
          completed: boolean
          is_assignee: boolean
          is_participant: boolean
        }[]
      }
      get_action_items_for_meeting: {
        Args: { meeting_id: string }
        Returns: {
          id: string
          title: string
          due_date: string
          completed: boolean
          assignee_entity_ids: string[]
          assignee_names: string[]
        }[]
      }
      get_action_items_for_next_meeting: {
        Args: { entity_name: string }
        Returns: {
          id: string
          title: string
          meeting_id: string
          meeting_title: string
          meeting_date: string
          due_date: string
          completed: boolean
          assignee_entity_ids: string[]
          assignee_names: string[]
        }[]
      }
      get_moments_with_metadata: {
        Args: { p_limit: number; p_cursor?: string }
        Returns: {
          moment_data: Database["public"]["Tables"]["moments"]["Row"]
          reactions: Database["public"]["CompositeTypes"]["moment_reaction_with_user"][]
          comments: Database["public"]["CompositeTypes"]["moment_comment_with_user"][]
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      parse_search_query: {
        Args: { search_input: string }
        Returns: string
      }
      search_meetings: {
        Args: { search_input: string }
        Returns: {
          clean_vtt_file: string | null
          created_at: string
          date: string | null
          db_created_at: string | null
          duration_in_ms: number | null
          duration_in_seconds: number | null
          meeting_baas_original_json: Json | null
          name: string | null
          original_vtt_file: string | null
          preprocessing_payload: Json | null
          profile_id: string | null
          provider:
            | Database["public"]["Enums"]["meeting_bots_provider_enum"]
            | null
          searchable: unknown | null
          speaker: string | null
          speaker_time_percentage: number | null
          summary: string | null
          tags: string | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["event_type"] | null
          updated_at: string
          vectorized: boolean
          video_api_id: string
        }[]
      }
      search_moments: {
        Args: { search_query: string }
        Returns: {
          id: string
          rank: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      sql_query_runner: {
        Args: { query: string }
        Returns: string
      }
      update_profile_id_on_moments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      email_template_type:
        | "skill-report-ready-founder"
        | "skill-report-ready-manager"
      event_type:
        | "meeting"
        | "coaching_session"
        | "one_on_one"
        | "external"
        | "team"
      goal_signal_direction_type: "positive" | "negative"
      icon_enum:
        | "Brain"
        | "GitCommitHorizontal"
        | "Heart"
        | "MessageSquare"
        | "Goal"
        | "Users"
        | "UserCheck"
        | "MessageCircle"
        | "Scissors"
        | "Activity"
        | "SendToBack"
      meeting_bot_error_code_type:
        | "CannotJoinMeeting"
        | "TimeoutWaitingToStart"
        | "BotNotAccepted"
        | "InternalError"
        | "InvalidMeetingUrl"
      meeting_bot_reporting_status:
        | "failed"
        | "partial"
        | "pending"
        | "skipped"
        | "completed"
        | "plsfix"
      meeting_bot_status_type:
        | "joining_call"
        | "in_waiting_room"
        | "in_call_not_recording"
        | "in_call_recording"
        | "call_ended"
        | "ready"
        | "recording_permission_allowed"
        | "recording_permission_denied"
        | "done"
        | "fatal"
        | "analysis_done"
        | "analysis_failed"
        | "media_expired"
        | "recording_done"
        | "in_waiting_for_host"
      meeting_bots_provider_enum: "meeting_baas" | "recall"
      meeting_platform_enum:
        | "zoom"
        | "google_meet"
        | "goto_meeting"
        | "microsoft_teams"
        | "microsoft_teams_live"
        | "webex"
        | "chime_sdk"
        | "webrtc"
        | "slack_huddle_observer"
      moment_reaction_type: "thumbs_up" | "thumbs_down"
      note_color: "yellow" | "blue" | "green" | "pink" | "purple"
      onboarding_task_name_enum:
        | "explore_team_conflict_chat"
        | "explore_feedback_chat"
        | "explore_discovery_chat"
        | "ask_follow_up"
        | "watch_moment"
        | "use_moments_command"
        | "reset_chat"
      processing_status:
        | "pending"
        | "completed"
        | "failed"
        | "partial"
        | "skipped"
      profile_status_enum: "active" | "pending" | "inactive"
      recall_calendar_platform_type: "google_calendar" | "microsoft_outlook"
      report_processing_status_type: "pending" | "completed" | "failed"
      source_type: "moment"
      user_role_enum: "user" | "coach" | "admin"
    }
    CompositeTypes: {
      moment_comment_with_user: {
        id: string | null
        moment_id: string | null
        user_id: string | null
        content: string | null
        created_at: string | null
        updated_at: string | null
        user_nickname: string | null
        user_avatar_url: string | null
        user_is_admin: boolean | null
      }
      moment_reaction_with_user: {
        id: string | null
        moment_id: string | null
        reaction_type: string | null
        created_at: string | null
        user_id: string | null
        user_nickname: string | null
        user_avatar_url: string | null
        user_is_admin: boolean | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      email_template_type: [
        "skill-report-ready-founder",
        "skill-report-ready-manager",
      ],
      event_type: [
        "meeting",
        "coaching_session",
        "one_on_one",
        "external",
        "team",
      ],
      goal_signal_direction_type: ["positive", "negative"],
      icon_enum: [
        "Brain",
        "GitCommitHorizontal",
        "Heart",
        "MessageSquare",
        "Goal",
        "Users",
        "UserCheck",
        "MessageCircle",
        "Scissors",
        "Activity",
        "SendToBack",
      ],
      meeting_bot_error_code_type: [
        "CannotJoinMeeting",
        "TimeoutWaitingToStart",
        "BotNotAccepted",
        "InternalError",
        "InvalidMeetingUrl",
      ],
      meeting_bot_reporting_status: [
        "failed",
        "partial",
        "pending",
        "skipped",
        "completed",
        "plsfix",
      ],
      meeting_bot_status_type: [
        "joining_call",
        "in_waiting_room",
        "in_call_not_recording",
        "in_call_recording",
        "call_ended",
        "ready",
        "recording_permission_allowed",
        "recording_permission_denied",
        "done",
        "fatal",
        "analysis_done",
        "analysis_failed",
        "media_expired",
        "recording_done",
        "in_waiting_for_host",
      ],
      meeting_bots_provider_enum: ["meeting_baas", "recall"],
      meeting_platform_enum: [
        "zoom",
        "google_meet",
        "goto_meeting",
        "microsoft_teams",
        "microsoft_teams_live",
        "webex",
        "chime_sdk",
        "webrtc",
        "slack_huddle_observer",
      ],
      moment_reaction_type: ["thumbs_up", "thumbs_down"],
      note_color: ["yellow", "blue", "green", "pink", "purple"],
      onboarding_task_name_enum: [
        "explore_team_conflict_chat",
        "explore_feedback_chat",
        "explore_discovery_chat",
        "ask_follow_up",
        "watch_moment",
        "use_moments_command",
        "reset_chat",
      ],
      processing_status: [
        "pending",
        "completed",
        "failed",
        "partial",
        "skipped",
      ],
      profile_status_enum: ["active", "pending", "inactive"],
      recall_calendar_platform_type: ["google_calendar", "microsoft_outlook"],
      report_processing_status_type: ["pending", "completed", "failed"],
      source_type: ["moment"],
      user_role_enum: ["user", "coach", "admin"],
    },
  },
} as const

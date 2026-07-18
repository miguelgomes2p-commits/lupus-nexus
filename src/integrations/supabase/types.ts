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
      activities: {
        Row: {
          client_id: string | null
          created_at: string
          description: string
          id: string
          lead_id: string | null
          metadata: Json | null
          opportunity_id: string | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          opportunity_id?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          direction: string
          entry_date: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          direction: string
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          direction?: string
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          company_name: string
          company_size: string | null
          contact_name: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_value: number | null
          created_at: string
          document_notes: string | null
          email: string | null
          id: string
          industry: string | null
          lead_id: string | null
          legal_representative: string | null
          monthly_recurring_revenue: number | null
          notes: string | null
          onboarding_status: string | null
          owner_id: string | null
          phone: string | null
          segment: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["client_status"]
          tax_regime: string | null
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_name: string
          company_size?: string | null
          contact_name?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_value?: number | null
          created_at?: string
          document_notes?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          legal_representative?: string | null
          monthly_recurring_revenue?: number | null
          notes?: string | null
          onboarding_status?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_value?: number | null
          created_at?: string
          document_notes?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          lead_id?: string | null
          legal_representative?: string | null
          monthly_recurring_revenue?: number | null
          notes?: string | null
          onboarding_status?: string | null
          owner_id?: string | null
          phone?: string | null
          segment?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          lead_id: string | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          lead_id?: string | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          lead_id?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          category: string | null
          cost_type: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          incurred_at: string
          notes: string | null
          paid: boolean
          paid_at: string | null
          payment_method: string | null
          recurrence: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          incurred_at?: string
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          recurrence?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          incurred_at?: string
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          recurrence?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      email_scripts: {
        Row: {
          active: boolean
          body_html: string
          category: string
          created_at: string
          id: string
          key: string
          name: string
          subject: string
          updated_at: string
          variables_desc: string | null
        }
        Insert: {
          active?: boolean
          body_html: string
          category?: string
          created_at?: string
          id?: string
          key: string
          name: string
          subject: string
          updated_at?: string
          variables_desc?: string | null
        }
        Update: {
          active?: boolean
          body_html?: string
          category?: string
          created_at?: string
          id?: string
          key?: string
          name?: string
          subject?: string
          updated_at?: string
          variables_desc?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          id: string
          instagram: string | null
          last_interaction_at: string | null
          name: string
          next_action_at: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          source_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          instagram?: string | null
          last_interaction_at?: string | null
          name: string
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          source_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          instagram?: string | null
          last_interaction_at?: string | null
          name?: string
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          source_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closings: {
        Row: {
          auto_generated: boolean
          cash_in: number
          cash_out: number
          clients_in: number
          closed_by: string | null
          costs_out: number
          created_at: string
          id: string
          net_result: number
          notes: string | null
          period_end: string
          period_start: string
          reference_month: string
          total_in: number
          total_out: number
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean
          cash_in?: number
          cash_out?: number
          clients_in?: number
          closed_by?: string | null
          costs_out?: number
          created_at?: string
          id?: string
          net_result?: number
          notes?: string | null
          period_end: string
          period_start: string
          reference_month: string
          total_in?: number
          total_out?: number
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean
          cash_in?: number
          cash_out?: number
          clients_in?: number
          closed_by?: string | null
          costs_out?: number
          created_at?: string
          id?: string
          net_result?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          reference_month?: string
          total_in?: number
          total_out?: number
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          id: string
          lead_id: string | null
          opportunity_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          expected_close_date: string | null
          id: string
          last_moved_at: string
          lead_id: string | null
          lost_at: string | null
          lost_reason: string | null
          owner_id: string | null
          probability: number
          stage_id: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at: string
          value: number
          won_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          last_moved_at?: string
          lead_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          owner_id?: string | null
          probability?: number
          stage_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          last_moved_at?: string
          lead_id?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          owner_id?: string | null
          probability?: number
          stage_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          updated_at?: string
          value?: number
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_scripts: {
        Row: {
          approach: Database["public"]["Enums"]["script_approach"]
          author_id: string | null
          category: Database["public"]["Enums"]["script_category"]
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_favorite: boolean
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          approach?: Database["public"]["Enums"]["script_approach"]
          author_id?: string | null
          category?: Database["public"]["Enums"]["script_category"]
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          approach?: Database["public"]["Enums"]["script_approach"]
          author_id?: string | null
          category?: Database["public"]["Enums"]["script_category"]
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_favorite?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          related_client_id: string | null
          related_lead_id: string | null
          related_opportunity_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          related_client_id?: string | null
          related_lead_id?: string | null
          related_opportunity_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          related_client_id?: string | null
          related_lead_id?: string | null
          related_opportunity_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_opportunity_id_fkey"
            columns: ["related_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
      can_access_client: { Args: { _client_id: string }; Returns: boolean }
      can_access_lead: { Args: { _lead_id: string }; Returns: boolean }
      can_access_opportunity: { Args: { _opp_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_monthly_closing: {
        Args: { _reference_date?: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      activity_type:
        | "lead_criado"
        | "lead_editado"
        | "lead_convertido"
        | "oportunidade_criada"
        | "oportunidade_movida"
        | "oportunidade_ganha"
        | "oportunidade_perdida"
        | "tarefa_criada"
        | "tarefa_concluida"
        | "nota_criada"
        | "cliente_criado"
        | "responsavel_alterado"
        | "status_alterado"
        | "etapa_alterada"
        | "contato_registrado"
        | "tarefa_removida"
        | "nota_removida"
        | "documento_anexado"
        | "documento_removido"
      app_role: "admin" | "gestor" | "comercial"
      client_status: "ativo" | "inativo" | "pausado"
      lead_status:
        | "novo"
        | "contatado"
        | "qualificado"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
        | "descartado"
      lead_temperature: "frio" | "morno" | "quente"
      opportunity_status: "aberta" | "ganha" | "perdida"
      priority_level: "baixa" | "media" | "alta" | "urgente"
      script_approach:
        | "cold_call"
        | "whatsapp"
        | "email"
        | "reuniao"
        | "linkedin"
        | "indicacao"
      script_category:
        | "prospeccao"
        | "qualificacao"
        | "apresentacao"
        | "objecoes"
        | "fechamento"
        | "follow_up"
        | "reativacao"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
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
      activity_type: [
        "lead_criado",
        "lead_editado",
        "lead_convertido",
        "oportunidade_criada",
        "oportunidade_movida",
        "oportunidade_ganha",
        "oportunidade_perdida",
        "tarefa_criada",
        "tarefa_concluida",
        "nota_criada",
        "cliente_criado",
        "responsavel_alterado",
        "status_alterado",
        "etapa_alterada",
        "contato_registrado",
        "tarefa_removida",
        "nota_removida",
        "documento_anexado",
        "documento_removido",
      ],
      app_role: ["admin", "gestor", "comercial"],
      client_status: ["ativo", "inativo", "pausado"],
      lead_status: [
        "novo",
        "contatado",
        "qualificado",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
        "descartado",
      ],
      lead_temperature: ["frio", "morno", "quente"],
      opportunity_status: ["aberta", "ganha", "perdida"],
      priority_level: ["baixa", "media", "alta", "urgente"],
      script_approach: [
        "cold_call",
        "whatsapp",
        "email",
        "reuniao",
        "linkedin",
        "indicacao",
      ],
      script_category: [
        "prospeccao",
        "qualificacao",
        "apresentacao",
        "objecoes",
        "fechamento",
        "follow_up",
        "reativacao",
      ],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const

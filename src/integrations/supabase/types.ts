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
      client_invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          due_date: string
          email_sent_at: string | null
          id: string
          nfe_file_name: string | null
          nfe_file_path: string | null
          nfe_uploaded_at: string | null
          notes: string | null
          paid_at: string | null
          reference_month: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          due_date: string
          email_sent_at?: string | null
          id?: string
          nfe_file_name?: string | null
          nfe_file_path?: string | null
          nfe_uploaded_at?: string | null
          notes?: string | null
          paid_at?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          due_date?: string
          email_sent_at?: string | null
          id?: string
          nfe_file_name?: string | null
          nfe_file_path?: string | null
          nfe_uploaded_at?: string | null
          notes?: string | null
          paid_at?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          employee_id: string | null
          id: string
          incurred_at: string
          notes: string | null
          paid: boolean
          paid_at: string | null
          payment_method: string | null
          recurrence: string | null
          source: string
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
          employee_id?: string | null
          id?: string
          incurred_at?: string
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          recurrence?: string | null
          source?: string
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
          employee_id?: string | null
          id?: string
          incurred_at?: string
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          recurrence?: string | null
          source?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      employees: {
        Row: {
          bank_notes: string | null
          cost_id: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          hire_date: string
          id: string
          name: string
          notes: string | null
          payment_day: number
          phone: string | null
          pix_key: string | null
          position: string
          salary: number
          status: string
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          bank_notes?: string | null
          cost_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          hire_date?: string
          id?: string
          name: string
          notes?: string | null
          payment_day?: number
          phone?: string | null
          pix_key?: string | null
          position: string
          salary?: number
          status?: string
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          bank_notes?: string | null
          cost_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          hire_date?: string
          id?: string
          name?: string
          notes?: string | null
          payment_day?: number
          phone?: string | null
          pix_key?: string | null
          position?: string
          salary?: number
          status?: string
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_cost_fk"
            columns: ["cost_id"]
            isOneToOne: false
            referencedRelation: "costs"
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
      payroll_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string
          employee_id: string
          id: string
          notes: string | null
          paid_at: string | null
          receipt_file_name: string | null
          receipt_file_path: string | null
          receipt_uploaded_at: string | null
          reference_month: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          due_date: string
          employee_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          receipt_file_name?: string | null
          receipt_file_path?: string | null
          receipt_uploaded_at?: string | null
          reference_month: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          receipt_file_name?: string | null
          receipt_file_path?: string | null
          receipt_uploaded_at?: string | null
          reference_month?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_status: "pendente_nfe" | "pago" | "cancelado"
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
      invoice_status: ["pendente_nfe", "pago", "cancelado"],
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

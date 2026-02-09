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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          action: string
          created_at: string
          failure_reason: string | null
          geo_city: string | null
          geo_country: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          resource: string | null
          resource_id: string | null
          session_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          failure_reason?: string | null
          geo_city?: string | null
          geo_country?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string | null
          resource_id?: string | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          failure_reason?: string | null
          geo_city?: string | null
          geo_country?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource?: string | null
          resource_id?: string | null
          session_id?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      addon_modules: {
        Row: {
          category: Database["public"]["Enums"]["addon_module_category"]
          created_at: string
          currency: string
          description: string | null
          display_order: number
          features: Json
          icon: string
          id: string
          implementation_status: string
          is_active: boolean
          monthly_price: number
          name: string
          requirements: string | null
          setup_fee: number
          slug: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["addon_module_category"]
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          icon?: string
          id?: string
          implementation_status?: string
          is_active?: boolean
          monthly_price?: number
          name: string
          requirements?: string | null
          setup_fee?: number
          slug: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["addon_module_category"]
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          icon?: string
          id?: string
          implementation_status?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          requirements?: string | null
          setup_fee?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      apply_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string | null
          event_id: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_attempt_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "apply_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_notifications: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          provider_message_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          template_key: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_key?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_notifications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          created_at: string
          id: string
          invoice_show_breakdown: boolean
          modules_billing_mode: string
          proration_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_show_breakdown?: boolean
          modules_billing_mode?: string
          proration_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_show_breakdown?: boolean
          modules_billing_mode?: string
          proration_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      business_category_configs: {
        Row: {
          category_key: string
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json
          icon: string
          id: string
          is_active: boolean | null
          name: string
          terminology: Json
          theme: Json
          updated_at: string | null
        }
        Insert: {
          category_key: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          terminology?: Json
          theme?: Json
          updated_at?: string | null
        }
        Update: {
          category_key?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          terminology?: Json
          theme?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      business_kpis_daily: {
        Row: {
          active_partners: number | null
          active_tenants: number | null
          addon_attach_rate: number | null
          addon_revenue: number | null
          arr: number | null
          avg_arpu: number | null
          avg_ltv: number | null
          churned_mrr: number | null
          churned_tenants: number | null
          created_at: string
          date: string
          expansion_mrr: number | null
          gross_revenue_retention: number | null
          id: string
          metadata: Json | null
          mrr: number | null
          net_revenue_retention: number | null
          new_mrr: number | null
          new_tenants: number | null
          partner_revenue: number | null
          past_due_amount: number | null
          past_due_count: number | null
          total_gmv: number | null
          total_orders: number | null
          total_partners: number | null
          total_tenants: number | null
          trial_to_paid_rate: number | null
          trials_active: number | null
        }
        Insert: {
          active_partners?: number | null
          active_tenants?: number | null
          addon_attach_rate?: number | null
          addon_revenue?: number | null
          arr?: number | null
          avg_arpu?: number | null
          avg_ltv?: number | null
          churned_mrr?: number | null
          churned_tenants?: number | null
          created_at?: string
          date: string
          expansion_mrr?: number | null
          gross_revenue_retention?: number | null
          id?: string
          metadata?: Json | null
          mrr?: number | null
          net_revenue_retention?: number | null
          new_mrr?: number | null
          new_tenants?: number | null
          partner_revenue?: number | null
          past_due_amount?: number | null
          past_due_count?: number | null
          total_gmv?: number | null
          total_orders?: number | null
          total_partners?: number | null
          total_tenants?: number | null
          trial_to_paid_rate?: number | null
          trials_active?: number | null
        }
        Update: {
          active_partners?: number | null
          active_tenants?: number | null
          addon_attach_rate?: number | null
          addon_revenue?: number | null
          arr?: number | null
          avg_arpu?: number | null
          avg_ltv?: number | null
          churned_mrr?: number | null
          churned_tenants?: number | null
          created_at?: string
          date?: string
          expansion_mrr?: number | null
          gross_revenue_retention?: number | null
          id?: string
          metadata?: Json | null
          mrr?: number | null
          net_revenue_retention?: number | null
          new_mrr?: number | null
          new_tenants?: number | null
          partner_revenue?: number | null
          past_due_amount?: number | null
          past_due_count?: number | null
          total_gmv?: number | null
          total_orders?: number | null
          total_partners?: number | null
          total_tenants?: number | null
          trial_to_paid_rate?: number | null
          trials_active?: number | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          call_type: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          duration_seconds: number | null
          id: string
          notes: string | null
          order_created: boolean | null
          order_id: string | null
          phone_number: string
          tenant_id: string
          was_answered: boolean | null
        }
        Insert: {
          call_type?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          order_created?: boolean | null
          order_id?: string | null
          phone_number: string
          tenant_id: string
          was_answered?: boolean | null
        }
        Update: {
          call_type?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          order_created?: boolean | null
          order_id?: string | null
          phone_number?: string
          tenant_id?: string
          was_answered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      caller_id_config: {
        Row: {
          auto_popup: boolean | null
          config: Json | null
          created_at: string | null
          hardware_model: string | null
          hardware_port: string | null
          id: string
          is_active: boolean | null
          record_calls: boolean | null
          show_history: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_popup?: boolean | null
          config?: Json | null
          created_at?: string | null
          hardware_model?: string | null
          hardware_port?: string | null
          id?: string
          is_active?: boolean | null
          record_calls?: boolean | null
          show_history?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_popup?: boolean | null
          config?: Json | null
          created_at?: string | null
          hardware_model?: string | null
          hardware_port?: string | null
          id?: string
          is_active?: boolean | null
          record_calls?: boolean | null
          show_history?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caller_id_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          reason: string | null
        }
        Insert: {
          amount: number
          cash_register_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          reason?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          opened_at: string | null
          opened_by: string
          opening_amount: number
          tenant_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          opened_at?: string | null
          opened_by: string
          opening_amount?: number
          tenant_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          opened_at?: string | null
          opened_by?: string
          opening_amount?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_history: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_type: string
          comanda_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type: string
          comanda_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string
          comanda_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comanda_history_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_orders: {
        Row: {
          can_cancel: boolean | null
          can_modify: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          comanda_id: string
          confirmed_at: string | null
          confirmed_by_customer: boolean | null
          created_at: string | null
          delivered_at: string | null
          delivered_by: string | null
          id: string
          modified_at: string | null
          notes: string | null
          order_id: string | null
          ordered_by_customer_id: string | null
          ordered_by_waiter_id: string | null
          participant_id: string | null
          requires_waiter_approval: boolean | null
          waiter_approved: boolean | null
          waiter_approved_at: string | null
          waiter_approved_by: string | null
        }
        Insert: {
          can_cancel?: boolean | null
          can_modify?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          comanda_id: string
          confirmed_at?: string | null
          confirmed_by_customer?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          modified_at?: string | null
          notes?: string | null
          order_id?: string | null
          ordered_by_customer_id?: string | null
          ordered_by_waiter_id?: string | null
          participant_id?: string | null
          requires_waiter_approval?: boolean | null
          waiter_approved?: boolean | null
          waiter_approved_at?: string | null
          waiter_approved_by?: string | null
        }
        Update: {
          can_cancel?: boolean | null
          can_modify?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          comanda_id?: string
          confirmed_at?: string | null
          confirmed_by_customer?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          modified_at?: string | null
          notes?: string | null
          order_id?: string | null
          ordered_by_customer_id?: string | null
          ordered_by_waiter_id?: string | null
          participant_id?: string | null
          requires_waiter_approval?: boolean | null
          waiter_approved?: boolean | null
          waiter_approved_at?: string | null
          waiter_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comanda_orders_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_ordered_by_customer_id_fkey"
            columns: ["ordered_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_ordered_by_customer_id_fkey"
            columns: ["ordered_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_ordered_by_waiter_id_fkey"
            columns: ["ordered_by_waiter_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "comanda_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_orders_waiter_approved_by_fkey"
            columns: ["waiter_approved_by"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_participants: {
        Row: {
          authorized_at: string | null
          authorized_by: string | null
          can_order: boolean | null
          can_pay: boolean | null
          can_view_total: boolean | null
          comanda_id: string
          created_at: string | null
          customer_id: string | null
          exit_at: string | null
          exit_authorized: boolean | null
          exit_qr_code: string | null
          id: string
          individual_paid: number | null
          individual_subtotal: number | null
          invite_code: string | null
          invite_expires_at: string | null
          requires_approval: boolean | null
          role: Database["public"]["Enums"]["participant_role"] | null
          updated_at: string | null
        }
        Insert: {
          authorized_at?: string | null
          authorized_by?: string | null
          can_order?: boolean | null
          can_pay?: boolean | null
          can_view_total?: boolean | null
          comanda_id: string
          created_at?: string | null
          customer_id?: string | null
          exit_at?: string | null
          exit_authorized?: boolean | null
          exit_qr_code?: string | null
          id?: string
          individual_paid?: number | null
          individual_subtotal?: number | null
          invite_code?: string | null
          invite_expires_at?: string | null
          requires_approval?: boolean | null
          role?: Database["public"]["Enums"]["participant_role"] | null
          updated_at?: string | null
        }
        Update: {
          authorized_at?: string | null
          authorized_by?: string | null
          can_order?: boolean | null
          can_pay?: boolean | null
          can_view_total?: boolean | null
          comanda_id?: string
          created_at?: string | null
          customer_id?: string | null
          exit_at?: string | null
          exit_authorized?: boolean | null
          exit_qr_code?: string | null
          id?: string
          individual_paid?: number | null
          individual_subtotal?: number | null
          invite_code?: string | null
          invite_expires_at?: string | null
          requires_approval?: boolean | null
          role?: Database["public"]["Enums"]["participant_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comanda_participants_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "customer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_participants_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "customer_registrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_participants_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_participants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_participants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      comanda_payments: {
        Row: {
          amount: number
          comanda_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          participant_id: string | null
          payment_id: string | null
          payment_method: string
          payment_type: string | null
          requires_waiter_approval: boolean | null
          split_amounts: Json | null
          split_participants: string[] | null
          status: string | null
          waiter_approved: boolean | null
          waiter_approved_at: string | null
          waiter_approved_by: string | null
        }
        Insert: {
          amount: number
          comanda_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          participant_id?: string | null
          payment_id?: string | null
          payment_method: string
          payment_type?: string | null
          requires_waiter_approval?: boolean | null
          split_amounts?: Json | null
          split_participants?: string[] | null
          status?: string | null
          waiter_approved?: boolean | null
          waiter_approved_at?: string | null
          waiter_approved_by?: string | null
        }
        Update: {
          amount?: number
          comanda_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          participant_id?: string | null
          payment_id?: string | null
          payment_method?: string
          payment_type?: string | null
          requires_waiter_approval?: boolean | null
          split_amounts?: Json | null
          split_participants?: string[] | null
          status?: string | null
          waiter_approved?: boolean | null
          waiter_approved_at?: string | null
          waiter_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comanda_payments_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_payments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "comanda_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_payments_waiter_approved_by_fkey"
            columns: ["waiter_approved_by"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          actual_guests: number | null
          closed_at: string | null
          comanda_number: number
          created_at: string | null
          current_waiter_id: string | null
          discount: number | null
          exit_validated: boolean | null
          exit_validated_at: string | null
          exit_validated_by: string | null
          expected_guests: number | null
          id: string
          initial_waiter_id: string | null
          notes: string | null
          opened_at: string | null
          paid_amount: number | null
          pending_amount: number | null
          service_fee: number | null
          service_fee_percent: number | null
          status: Database["public"]["Enums"]["comanda_status"] | null
          store_id: string | null
          subtotal: number | null
          table_id: string | null
          tenant_id: string
          titular_customer_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          actual_guests?: number | null
          closed_at?: string | null
          comanda_number?: number
          created_at?: string | null
          current_waiter_id?: string | null
          discount?: number | null
          exit_validated?: boolean | null
          exit_validated_at?: string | null
          exit_validated_by?: string | null
          expected_guests?: number | null
          id?: string
          initial_waiter_id?: string | null
          notes?: string | null
          opened_at?: string | null
          paid_amount?: number | null
          pending_amount?: number | null
          service_fee?: number | null
          service_fee_percent?: number | null
          status?: Database["public"]["Enums"]["comanda_status"] | null
          store_id?: string | null
          subtotal?: number | null
          table_id?: string | null
          tenant_id: string
          titular_customer_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_guests?: number | null
          closed_at?: string | null
          comanda_number?: number
          created_at?: string | null
          current_waiter_id?: string | null
          discount?: number | null
          exit_validated?: boolean | null
          exit_validated_at?: string | null
          exit_validated_by?: string | null
          expected_guests?: number | null
          id?: string
          initial_waiter_id?: string | null
          notes?: string | null
          opened_at?: string | null
          paid_amount?: number | null
          pending_amount?: number | null
          service_fee?: number | null
          service_fee_percent?: number | null
          status?: Database["public"]["Enums"]["comanda_status"] | null
          store_id?: string | null
          subtotal?: number | null
          table_id?: string | null
          tenant_id?: string
          titular_customer_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comandas_current_waiter_id_fkey"
            columns: ["current_waiter_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_initial_waiter_id_fkey"
            columns: ["initial_waiter_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_titular_customer_id_fkey"
            columns: ["titular_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_titular_customer_id_fkey"
            columns: ["titular_customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          consent_version: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          revoked_at: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_type: string
          consent_version: string
          created_at?: string
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          revoked_at?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_type?: string
          consent_version?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          revoked_at?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_funnel_metrics: {
        Row: {
          avg_time_to_next_stage: unknown
          conversion_from_previous: number | null
          count: number | null
          created_at: string
          date: string
          funnel_stage: string
          id: string
          metadata: Json | null
        }
        Insert: {
          avg_time_to_next_stage?: unknown
          conversion_from_previous?: number | null
          count?: number | null
          created_at?: string
          date: string
          funnel_stage: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          avg_time_to_next_stage?: unknown
          conversion_from_previous?: number | null
          count?: number | null
          created_at?: string
          date?: string
          funnel_stage?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          discount_amount: number
          final_amount: number
          id: string
          invoice_id: string | null
          original_amount: number
          redeemed_at: string
          tenant_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount: number
          final_amount: number
          id?: string
          invoice_id?: string | null
          original_amount: number
          redeemed_at?: string
          tenant_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          invoice_id?: string | null
          original_amount?: number
          redeemed_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "partner_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to: string | null
          applies_to_ids: string[] | null
          auto_apply: boolean | null
          code: string
          created_at: string | null
          customer_limit: number | null
          customer_usage: Json | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_items: number | null
          min_order_value: number | null
          schedule: Json | null
          stackable: boolean | null
          tenant_id: string
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to?: string | null
          applies_to_ids?: string[] | null
          auto_apply?: boolean | null
          code: string
          created_at?: string | null
          customer_limit?: number | null
          customer_usage?: Json | null
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_items?: number | null
          min_order_value?: number | null
          schedule?: Json | null
          stackable?: boolean | null
          tenant_id: string
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to?: string | null
          applies_to_ids?: string[] | null
          auto_apply?: boolean | null
          code?: string
          created_at?: string | null
          customer_limit?: number | null
          customer_usage?: Json | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_items?: number | null
          min_order_value?: number | null
          schedule?: Json | null
          stackable?: boolean | null
          tenant_id?: string
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          created_at: string | null
          delivery_fee: number | null
          id: string
          is_active: boolean | null
          is_internal: boolean | null
          license_plate: string | null
          name: string
          phone: string
          tenant_id: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          license_plate?: string | null
          name: string
          phone: string
          tenant_id: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          license_plate?: string | null
          name?: string
          phone?: string
          tenant_id?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couriers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_logs: {
        Row: {
          created_at: string | null
          executed_at: string
          id: string
          job_name: string
          results: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          executed_at?: string
          id?: string
          job_name: string
          results?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          executed_at?: string
          id?: string
          job_name?: string
          results?: Json | null
          status?: string
        }
        Relationships: []
      }
      customer_push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          order_id: string | null
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          order_id?: string | null
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          order_id?: string | null
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_registrations: {
        Row: {
          cpf: string | null
          created_at: string | null
          device_id: string | null
          document_type: string | null
          document_url: string | null
          email: string | null
          full_name: string
          id: string
          ip_address: string | null
          is_verified: boolean | null
          phone: string
          registration_type:
            | Database["public"]["Enums"]["customer_registration_type"]
            | null
          selfie_url: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          device_id?: string | null
          document_type?: string | null
          document_url?: string | null
          email?: string | null
          full_name: string
          id?: string
          ip_address?: string | null
          is_verified?: boolean | null
          phone: string
          registration_type?:
            | Database["public"]["Enums"]["customer_registration_type"]
            | null
          selfie_url?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          device_id?: string | null
          document_type?: string | null
          document_url?: string | null
          email?: string | null
          full_name?: string
          id?: string
          ip_address?: string | null
          is_verified?: boolean | null
          phone?: string
          registration_type?:
            | Database["public"]["Enums"]["customer_registration_type"]
            | null
          selfie_url?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          archive_before_delete: boolean | null
          created_at: string
          id: string
          is_active: boolean | null
          last_applied_at: string | null
          notes: string | null
          records_archived: number | null
          records_deleted: number | null
          retention_days: number
          table_name: string
          updated_at: string
        }
        Insert: {
          archive_before_delete?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_applied_at?: string | null
          notes?: string | null
          records_archived?: number | null
          records_deleted?: number | null
          retention_days?: number
          table_name: string
          updated_at?: string
        }
        Update: {
          archive_before_delete?: boolean | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_applied_at?: string | null
          notes?: string | null
          records_archived?: number | null
          records_deleted?: number | null
          retention_days?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          created_at: string
          data_export_url: string | null
          deadline_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          request_type: string
          requester_email: string
          status: string
          submitted_at: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_export_url?: string | null
          deadline_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          request_type: string
          requester_email: string
          status?: string
          submitted_at?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_export_url?: string | null
          deadline_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          request_type?: string
          requester_email?: string
          status?: string
          submitted_at?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          courier_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_notes: string | null
          id: string
          order_id: string
          picked_up_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          courier_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          id?: string
          order_id: string
          picked_up_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          courier_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          id?: string
          order_id?: string
          picked_up_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          delivery_fee: number | null
          estimated_time_minutes: number | null
          id: string
          is_active: boolean | null
          min_order_value: number | null
          name: string
          neighborhoods: string[] | null
          tenant_id: string
          zip_codes: string[] | null
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          name: string
          neighborhoods?: string[] | null
          tenant_id: string
          zip_codes?: string[] | null
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number | null
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          name?: string
          neighborhoods?: string[] | null
          tenant_id?: string
          zip_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_service_global_config: {
        Row: {
          created_at: string | null
          default_call_timeout_minutes: number | null
          default_escalation_levels: number | null
          default_exit_requires_cashier: boolean | null
          default_exit_requires_waiter: boolean | null
          default_order_requires_waiter: boolean | null
          default_payment_requires_waiter: boolean | null
          id: string
          kyc_require_document: boolean | null
          kyc_require_selfie: boolean | null
          kyc_required_for_exit: boolean | null
          kyc_required_for_modification: boolean | null
          kyc_required_for_ordering: boolean | null
          kyc_required_for_payment: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_call_timeout_minutes?: number | null
          default_escalation_levels?: number | null
          default_exit_requires_cashier?: boolean | null
          default_exit_requires_waiter?: boolean | null
          default_order_requires_waiter?: boolean | null
          default_payment_requires_waiter?: boolean | null
          id?: string
          kyc_require_document?: boolean | null
          kyc_require_selfie?: boolean | null
          kyc_required_for_exit?: boolean | null
          kyc_required_for_modification?: boolean | null
          kyc_required_for_ordering?: boolean | null
          kyc_required_for_payment?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_call_timeout_minutes?: number | null
          default_escalation_levels?: number | null
          default_exit_requires_cashier?: boolean | null
          default_exit_requires_waiter?: boolean | null
          default_order_requires_waiter?: boolean | null
          default_payment_requires_waiter?: boolean | null
          id?: string
          kyc_require_document?: boolean | null
          kyc_require_selfie?: boolean | null
          kyc_required_for_exit?: boolean | null
          kyc_required_for_modification?: boolean | null
          kyc_required_for_ordering?: boolean | null
          kyc_required_for_payment?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dispatcher_config: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          sms_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
          whatsapp_api_token: string | null
          whatsapp_enabled: boolean | null
          whatsapp_phone_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sms_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
          whatsapp_api_token?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sms_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          whatsapp_api_token?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatcher_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatcher_messages: {
        Row: {
          channel: string
          created_at: string | null
          customer_phone: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message: string
          order_id: string | null
          read_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          tenant_id: string
          trigger_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          customer_phone: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message: string
          order_id?: string | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id: string
          trigger_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          customer_phone?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message?: string
          order_id?: string | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
          trigger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatcher_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatcher_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatcher_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatcher_messages_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "dispatcher_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatcher_triggers: {
        Row: {
          channel: string | null
          conditions: Json | null
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          message_template: string
          name: string
          tenant_id: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          conditions?: Json | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_template: string
          name: string
          tenant_id: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          conditions?: Json | null
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          name?: string
          tenant_id?: string
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatcher_triggers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_timeline: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string | null
          data: Json | null
          dispute_id: string
          id: string
          new_status: string | null
          previous_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string | null
          data?: Json | null
          dispute_id: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string | null
          data?: Json | null
          dispute_id?: string
          id?: string
          new_status?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_timeline_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          dedupe_key: string
          dispute_type: string
          evidence_deadline_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          opened_at: string | null
          partner_id: string | null
          provider: string
          provider_payment_id: string
          resolved_at: string | null
          source_event_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          dedupe_key: string
          dispute_type: string
          evidence_deadline_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          opened_at?: string | null
          partner_id?: string | null
          provider?: string
          provider_payment_id: string
          resolved_at?: string | null
          source_event_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          dedupe_key?: string
          dispute_type?: string
          evidence_deadline_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          opened_at?: string | null
          partner_id?: string | null
          provider?: string
          provider_payment_id?: string
          resolved_at?: string | null
          source_event_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "disputes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_alerts: {
        Row: {
          alert_level: Database["public"]["Enums"]["fraud_alert_level"]
          created_at: string | null
          id: string
          is_resolved: boolean | null
          match_reason: string
          matched_record_id: string | null
          payment_machine_record_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
        }
        Insert: {
          alert_level: Database["public"]["Enums"]["fraud_alert_level"]
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          match_reason: string
          matched_record_id?: string | null
          payment_machine_record_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
        }
        Update: {
          alert_level?: Database["public"]["Enums"]["fraud_alert_level"]
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          match_reason?: string
          matched_record_id?: string | null
          payment_machine_record_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_alerts_matched_record_id_fkey"
            columns: ["matched_record_id"]
            isOneToOne: false
            referencedRelation: "payment_machine_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_alerts_payment_machine_record_id_fkey"
            columns: ["payment_machine_record_id"]
            isOneToOne: false
            referencedRelation: "payment_machine_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_refunds: boolean | null
          couvert_price: number | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          refund_deadline_hours: number | null
          requires_full_registration: boolean | null
          start_time: string | null
          store_id: string | null
          tenant_id: string
          ticket_price: number
          tickets_available: number | null
          tickets_sold: number | null
          total_capacity: number | null
          updated_at: string | null
        }
        Insert: {
          allow_refunds?: boolean | null
          couvert_price?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          refund_deadline_hours?: number | null
          requires_full_registration?: boolean | null
          start_time?: string | null
          store_id?: string | null
          tenant_id: string
          ticket_price: number
          tickets_available?: number | null
          tickets_sold?: number | null
          total_capacity?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_refunds?: boolean | null
          couvert_price?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          refund_deadline_hours?: number | null
          requires_full_registration?: boolean | null
          start_time?: string | null
          store_id?: string | null
          tenant_id?: string
          ticket_price?: number
          tickets_available?: number | null
          tickets_sold?: number | null
          total_capacity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exit_validations: {
        Row: {
          admin_override: boolean | null
          cashier_confirmed: boolean | null
          comanda_id: string
          created_at: string | null
          denial_reason: string | null
          id: string
          participant_id: string | null
          payment_verified: boolean | null
          qr_code: string
          status: Database["public"]["Enums"]["exit_status"] | null
          tenant_id: string
          validated_at: string | null
          validated_by: string | null
          validation_method: string | null
          waiter_confirmed: boolean | null
        }
        Insert: {
          admin_override?: boolean | null
          cashier_confirmed?: boolean | null
          comanda_id: string
          created_at?: string | null
          denial_reason?: string | null
          id?: string
          participant_id?: string | null
          payment_verified?: boolean | null
          qr_code: string
          status?: Database["public"]["Enums"]["exit_status"] | null
          tenant_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_method?: string | null
          waiter_confirmed?: boolean | null
        }
        Update: {
          admin_override?: boolean | null
          cashier_confirmed?: boolean | null
          comanda_id?: string
          created_at?: string | null
          denial_reason?: string | null
          id?: string
          participant_id?: string | null
          payment_verified?: boolean | null
          qr_code?: string
          status?: Database["public"]["Enums"]["exit_status"] | null
          tenant_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_method?: string | null
          waiter_confirmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "exit_validations_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_validations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "comanda_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exit_validations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Relationships: []
      }
      financial_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          after_state: Json | null
          before_state: Json | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          after_state?: Json | null
          before_state?: Json | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          after_state?: Json | null
          before_state?: Json | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      financial_audit_log_archive: {
        Row: {
          action: string | null
          actor_id: string | null
          actor_type: string | null
          after_state: Json | null
          archived_at: string | null
          before_state: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          actor_type?: string | null
          after_state?: Json | null
          archived_at?: string | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id: string
          metadata?: Json | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          actor_type?: string | null
          after_state?: Json | null
          archived_at?: string | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      financial_reconciliation: {
        Row: {
          checked_at: string | null
          created_at: string | null
          difference: number | null
          expected_amount: number | null
          id: string
          internal_event_id: string | null
          metadata: Json | null
          provider: string
          provider_amount: number | null
          provider_payment_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          internal_event_id?: string | null
          metadata?: Json | null
          provider: string
          provider_amount?: number | null
          provider_payment_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          internal_event_id?: string | null
          metadata?: Json | null
          provider?: string
          provider_amount?: number | null
          provider_payment_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_reconciliation_internal_event_id_fkey"
            columns: ["internal_event_id"]
            isOneToOne: false
            referencedRelation: "payment_events"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          dedupe_key: string | null
          details: Json
          id: string
          partner_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_event_id: string | null
          status: string
          tenant_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          details?: Json
          id?: string
          partner_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_event_id?: string | null
          status?: string
          tenant_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          details?: Json
          id?: string
          partner_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_event_id?: string | null
          status?: string
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "fraud_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_notifications_sent: {
        Row: {
          goal_id: string
          id: string
          notification_type: string
          recipients: Json | null
          sent_at: string
          tenant_id: string
        }
        Insert: {
          goal_id: string
          id?: string
          notification_type?: string
          recipients?: Json | null
          sent_at?: string
          tenant_id: string
        }
        Update: {
          goal_id?: string
          id?: string
          notification_type?: string
          recipients?: Json | null
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_notifications_sent_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "sales_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_notifications_sent_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_flows: {
        Row: {
          completion_reward: string | null
          created_at: string
          description: string | null
          flow_key: string
          id: string
          is_active: boolean | null
          name: string
          reward_config: Json | null
          steps: Json
          target_audience: string[] | null
        }
        Insert: {
          completion_reward?: string | null
          created_at?: string
          description?: string | null
          flow_key: string
          id?: string
          is_active?: boolean | null
          name: string
          reward_config?: Json | null
          steps: Json
          target_audience?: string[] | null
        }
        Update: {
          completion_reward?: string | null
          created_at?: string
          description?: string | null
          flow_key?: string
          id?: string
          is_active?: boolean | null
          name?: string
          reward_config?: Json | null
          steps?: Json
          target_audience?: string[] | null
        }
        Relationships: []
      }
      ifood_integrations: {
        Row: {
          access_token: string | null
          auto_accept_orders: boolean | null
          client_id: string | null
          client_secret: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          merchant_id: string | null
          refresh_token: string | null
          sync_menu: boolean | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          auto_accept_orders?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          refresh_token?: string | null
          sync_menu?: boolean | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          auto_accept_orders?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          refresh_token?: string | null
          sync_menu?: boolean | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ifood_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_logs: {
        Row: {
          created_at: string | null
          direction: string
          endpoint: string | null
          error_message: string | null
          event_type: string
          id: string
          request_data: Json | null
          response_data: Json | null
          status_code: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          endpoint?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          status_code?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          request_data?: Json | null
          response_data?: Json | null
          status_code?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifood_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_menu_mapping: {
        Row: {
          created_at: string | null
          id: string
          ifood_item_id: string | null
          last_synced_at: string | null
          product_id: string
          sync_status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ifood_item_id?: string | null
          last_synced_at?: string | null
          product_id: string
          sync_status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ifood_item_id?: string | null
          last_synced_at?: string | null
          product_id?: string
          sync_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifood_menu_mapping_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_menu_mapping_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_menu_mapping_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_orders: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          discount: number | null
          id: string
          ifood_order_id: string
          ifood_short_id: string | null
          items: Json
          order_id: string | null
          payment_method: string | null
          raw_data: Json | null
          scheduled_to: string | null
          status: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal: number | null
          tenant_id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          id?: string
          ifood_order_id: string
          ifood_short_id?: string | null
          items: Json
          order_id?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          scheduled_to?: string | null
          status?: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          id?: string
          ifood_order_id?: string
          ifood_short_id?: string | null
          items?: Json
          order_id?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          scheduled_to?: string | null
          status?: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ifood_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          is_active: boolean | null
          min_stock: number | null
          name: string
          tenant_id: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name: string
          tenant_id: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name?: string
          tenant_id?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_display_config: {
        Row: {
          alert_threshold_minutes: number | null
          auto_advance: boolean | null
          config: Json | null
          created_at: string | null
          display_mode: string | null
          group_by_category: boolean | null
          id: string
          is_active: boolean | null
          show_customer_name: boolean | null
          show_order_number: boolean | null
          sound_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          alert_threshold_minutes?: number | null
          auto_advance?: boolean | null
          config?: Json | null
          created_at?: string | null
          display_mode?: string | null
          group_by_category?: boolean | null
          id?: string
          is_active?: boolean | null
          show_customer_name?: boolean | null
          show_order_number?: boolean | null
          sound_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          alert_threshold_minutes?: number | null
          auto_advance?: boolean | null
          config?: Json | null
          created_at?: string | null
          display_mode?: string | null
          group_by_category?: boolean | null
          id?: string
          is_active?: boolean | null
          show_customer_name?: boolean | null
          show_order_number?: boolean | null
          sound_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_display_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_order_items: {
        Row: {
          bumped_at: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          order_item_id: string
          priority: number | null
          started_at: string | null
          station_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bumped_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          order_item_id: string
          priority?: number | null
          started_at?: string | null
          station_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bumped_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          order_item_id?: string
          priority?: number | null
          started_at?: string | null
          station_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_order_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_order_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_stations: {
        Row: {
          categories: string[] | null
          config: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          config?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          config?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_stations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          currency: string
          entry_type: string
          gateway_provider: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          payment_method: string | null
          tenant_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          entry_type: string
          gateway_provider?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          tenant_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          entry_type?: string
          gateway_provider?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_method?: string | null
          tenant_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_config: {
        Row: {
          birthday_points: number | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          min_points_redemption: number | null
          points_expiry_days: number | null
          points_per_real: number | null
          tenant_id: string
          updated_at: string | null
          vip_discount_percent: number | null
          vip_threshold: number | null
          welcome_points: number | null
        }
        Insert: {
          birthday_points?: number | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_points_redemption?: number | null
          points_expiry_days?: number | null
          points_per_real?: number | null
          tenant_id: string
          updated_at?: string | null
          vip_discount_percent?: number | null
          vip_threshold?: number | null
          welcome_points?: number | null
        }
        Update: {
          birthday_points?: number | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_points_redemption?: number | null
          points_expiry_days?: number | null
          points_per_real?: number | null
          tenant_id?: string
          updated_at?: string | null
          vip_discount_percent?: number | null
          vip_threshold?: number | null
          welcome_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_customers: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string | null
          current_points: number | null
          email: string | null
          id: string
          is_vip: boolean | null
          last_order_at: string | null
          name: string | null
          phone: string
          tenant_id: string
          total_orders: number | null
          total_points_earned: number | null
          total_points_redeemed: number | null
          total_spent: number | null
          updated_at: string | null
          vip_since: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          current_points?: number | null
          email?: string | null
          id?: string
          is_vip?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone: string
          tenant_id: string
          total_orders?: number | null
          total_points_earned?: number | null
          total_points_redeemed?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vip_since?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string | null
          current_points?: number | null
          email?: string | null
          id?: string
          is_vip?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone?: string
          tenant_id?: string
          total_orders?: number | null
          total_points_earned?: number | null
          total_points_redeemed?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vip_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          points: number
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points: number
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points?: number
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "loyalty_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_seo_audit_history: {
        Row: {
          audit_type: string
          created_at: string
          current_score: number
          id: string
          notes: string | null
          previous_score: number
          score_delta: number | null
          settings_id: string | null
          tenant_id: string
        }
        Insert: {
          audit_type?: string
          created_at?: string
          current_score?: number
          id?: string
          notes?: string | null
          previous_score?: number
          score_delta?: number | null
          settings_id?: string | null
          tenant_id: string
        }
        Update: {
          audit_type?: string
          created_at?: string
          current_score?: number
          id?: string
          notes?: string | null
          previous_score?: number
          score_delta?: number | null
          settings_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_seo_audit_history_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "marketing_seo_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_seo_audit_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_seo_pages: {
        Row: {
          canonical_url: string | null
          content_score: number | null
          created_at: string | null
          description_score: number | null
          id: string
          is_indexed: boolean | null
          issues: Json | null
          last_crawled_at: string | null
          meta_description: string | null
          meta_keywords: string[] | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          overall_score: number | null
          page_path: string
          page_title: string | null
          settings_id: string | null
          suggestions: Json | null
          tenant_id: string
          title_score: number | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          content_score?: number | null
          created_at?: string | null
          description_score?: number | null
          id?: string
          is_indexed?: boolean | null
          issues?: Json | null
          last_crawled_at?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          overall_score?: number | null
          page_path: string
          page_title?: string | null
          settings_id?: string | null
          suggestions?: Json | null
          tenant_id: string
          title_score?: number | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          content_score?: number | null
          created_at?: string | null
          description_score?: number | null
          id?: string
          is_indexed?: boolean | null
          issues?: Json | null
          last_crawled_at?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          overall_score?: number | null
          page_path?: string
          page_title?: string | null
          settings_id?: string | null
          suggestions?: Json | null
          tenant_id?: string
          title_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_seo_pages_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "marketing_seo_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_seo_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_seo_reports: {
        Row: {
          content_score: number | null
          created_at: string | null
          critical_issues: number | null
          id: string
          issues: Json | null
          meta_score: number | null
          overall_score: number | null
          recommendations: number | null
          recommendations_list: Json | null
          report_type: string
          settings_id: string | null
          technical_score: number | null
          tenant_id: string
          warnings: number | null
        }
        Insert: {
          content_score?: number | null
          created_at?: string | null
          critical_issues?: number | null
          id?: string
          issues?: Json | null
          meta_score?: number | null
          overall_score?: number | null
          recommendations?: number | null
          recommendations_list?: Json | null
          report_type: string
          settings_id?: string | null
          technical_score?: number | null
          tenant_id: string
          warnings?: number | null
        }
        Update: {
          content_score?: number | null
          created_at?: string | null
          critical_issues?: number | null
          id?: string
          issues?: Json | null
          meta_score?: number | null
          overall_score?: number | null
          recommendations?: number | null
          recommendations_list?: Json | null
          report_type?: string
          settings_id?: string | null
          technical_score?: number | null
          tenant_id?: string
          warnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_seo_reports_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "marketing_seo_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_seo_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_seo_settings: {
        Row: {
          bing_verification_code: string | null
          bing_webmaster_verified: boolean | null
          bing_webmaster_verified_at: string | null
          created_at: string | null
          default_description: string | null
          default_keywords: string[] | null
          default_title_suffix: string | null
          domain_id: string | null
          google_search_console_verified: boolean | null
          google_search_console_verified_at: string | null
          google_verification_code: string | null
          id: string
          last_audit_at: string | null
          robots_allow_all: boolean | null
          robots_txt_custom: string | null
          schema_org_data: Json | null
          schema_org_type: string | null
          seo_init_status: string
          seo_score: number | null
          sitemap_change_freq: string | null
          sitemap_enabled: boolean | null
          sitemap_priority: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          bing_verification_code?: string | null
          bing_webmaster_verified?: boolean | null
          bing_webmaster_verified_at?: string | null
          created_at?: string | null
          default_description?: string | null
          default_keywords?: string[] | null
          default_title_suffix?: string | null
          domain_id?: string | null
          google_search_console_verified?: boolean | null
          google_search_console_verified_at?: string | null
          google_verification_code?: string | null
          id?: string
          last_audit_at?: string | null
          robots_allow_all?: boolean | null
          robots_txt_custom?: string | null
          schema_org_data?: Json | null
          schema_org_type?: string | null
          seo_init_status?: string
          seo_score?: number | null
          sitemap_change_freq?: string | null
          sitemap_enabled?: boolean | null
          sitemap_priority?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          bing_verification_code?: string | null
          bing_webmaster_verified?: boolean | null
          bing_webmaster_verified_at?: string | null
          created_at?: string | null
          default_description?: string | null
          default_keywords?: string[] | null
          default_title_suffix?: string | null
          domain_id?: string | null
          google_search_console_verified?: boolean | null
          google_search_console_verified_at?: string | null
          google_verification_code?: string | null
          id?: string
          last_audit_at?: string | null
          robots_allow_all?: boolean | null
          robots_txt_custom?: string | null
          schema_org_data?: Json | null
          schema_org_type?: string | null
          seo_init_status?: string
          seo_score?: number | null
          sitemap_change_freq?: string | null
          sitemap_enabled?: boolean | null
          sitemap_priority?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_seo_settings_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "organization_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_seo_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          auto_accept_orders: boolean | null
          client_id: string | null
          client_secret: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          merchant_id: string | null
          provider: string
          refresh_token: string | null
          store_id: string | null
          sync_menu: boolean | null
          sync_prices: boolean | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          auto_accept_orders?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          provider: string
          refresh_token?: string | null
          store_id?: string | null
          sync_menu?: boolean | null
          sync_prices?: boolean | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          auto_accept_orders?: boolean | null
          client_id?: string | null
          client_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merchant_id?: string | null
          provider?: string
          refresh_token?: string | null
          store_id?: string | null
          sync_menu?: boolean | null
          sync_prices?: boolean | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_logs: {
        Row: {
          created_at: string | null
          direction: string
          endpoint: string | null
          error_message: string | null
          event_type: string
          id: string
          provider: string
          request_data: Json | null
          response_data: Json | null
          status_code: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          endpoint?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          provider: string
          request_data?: Json | null
          response_data?: Json | null
          status_code?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          provider?: string
          request_data?: Json | null
          response_data?: Json | null
          status_code?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          created_at: string | null
          customer_document: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          discount: number | null
          external_order_id: string
          external_short_id: string | null
          id: string
          items: Json
          order_id: string | null
          payment_method: string | null
          provider: string
          raw_data: Json | null
          scheduled_to: string | null
          status: string | null
          subtotal: number | null
          tenant_id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_document?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          external_order_id: string
          external_short_id?: string | null
          id?: string
          items?: Json
          order_id?: string | null
          payment_method?: string | null
          provider: string
          raw_data?: Json | null
          scheduled_to?: string | null
          status?: string | null
          subtotal?: number | null
          tenant_id: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_document?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          external_order_id?: string
          external_short_id?: string | null
          id?: string
          items?: Json
          order_id?: string | null
          payment_method?: string | null
          provider?: string
          raw_data?: Json | null
          scheduled_to?: string | null
          status?: string | null
          subtotal?: number | null
          tenant_id?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_command_config: {
        Row: {
          allow_split_payment: boolean | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          require_table: boolean | null
          show_product_images: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allow_split_payment?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          require_table?: boolean | null
          show_product_images?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allow_split_payment?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          require_table?: boolean | null
          show_product_images?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_command_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_name: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_plan_limits: {
        Row: {
          created_at: string
          id: string
          limit_key: string
          limit_value: number
          module_slug: string
          plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          limit_key: string
          limit_value?: number
          module_slug: string
          plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          limit_key?: string
          limit_value?: number
          module_slug?: string
          plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_plan_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      module_purchases: {
        Row: {
          addon_module_id: string
          amount: number
          billing_type: string | null
          created_at: string
          currency: string
          gateway: string
          gateway_customer_id: string | null
          gateway_invoice_url: string | null
          gateway_payment_id: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_module_id: string
          amount: number
          billing_type?: string | null
          created_at?: string
          currency?: string
          gateway: string
          gateway_customer_id?: string | null
          gateway_invoice_url?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_module_id?: string
          amount?: number
          billing_type?: string | null
          created_at?: string
          currency?: string
          gateway?: string
          gateway_customer_id?: string | null
          gateway_invoice_url?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_purchases_addon_module_id_fkey"
            columns: ["addon_module_id"]
            isOneToOne: false
            referencedRelation: "addon_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery: {
        Row: {
          created_at: string
          id: string
          outbox_id: string
          provider: string
          provider_message_id: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          outbox_id: string
          provider: string
          provider_message_id?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          outbox_id?: string
          provider?: string
          provider_message_id?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["notification_channel"]
          correlation_id: string | null
          created_at: string
          dedupe_key: string
          event_id: string | null
          id: string
          invoice_id: string | null
          last_error: string | null
          max_attempts: number
          next_attempt_at: string | null
          partner_id: string | null
          payload: Json
          status: Database["public"]["Enums"]["notification_outbox_status"]
          template_key: string
          tenant_id: string | null
          to_address: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          correlation_id?: string | null
          created_at?: string
          dedupe_key: string
          event_id?: string | null
          id?: string
          invoice_id?: string | null
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          partner_id?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["notification_outbox_status"]
          template_key: string
          tenant_id?: string | null
          to_address: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          correlation_id?: string | null
          created_at?: string
          dedupe_key?: string
          event_id?: string | null
          id?: string
          invoice_id?: string | null
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          partner_id?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["notification_outbox_status"]
          template_key?: string
          tenant_id?: string | null
          to_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "payment_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "notification_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          is_active: boolean
          partner_id: string | null
          subject: string | null
          template_key: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id?: string | null
          subject?: string | null
          template_key: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_active?: boolean
          partner_id?: string | null
          subject?: string | null
          template_key?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      operational_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          dedupe_key: string | null
          details: Json
          id: string
          idempotency_key: string | null
          partner_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          tenant_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          dedupe_key?: string | null
          details?: Json
          id?: string
          idempotency_key?: string | null
          partner_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          tenant_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          dedupe_key?: string | null
          details?: Json
          id?: string
          idempotency_key?: string | null
          partner_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "operational_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_logs: {
        Row: {
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          event_id: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          partner_id: string | null
          provider_payment_id: string | null
          scope: string
          tenant_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          event_id?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          partner_id?: string | null
          provider_payment_id?: string | null
          scope: string
          tenant_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          event_id?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          partner_id?: string | null
          provider_payment_id?: string | null
          scope?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      operational_logs_archive: {
        Row: {
          archived_at: string | null
          correlation_id: string | null
          created_at: string | null
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          scope: string | null
        }
        Insert: {
          archived_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          id: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          scope?: string | null
        }
        Update: {
          archived_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          scope?: string | null
        }
        Relationships: []
      }
      ops_metrics_daily: {
        Row: {
          avg_apply_duration_ms: number | null
          created_at: string | null
          disputes_opened_count: number | null
          disputes_resolved_count: number | null
          duplicates_ignored: number | null
          events_applied_ok: number | null
          events_apply_error: number | null
          events_received: number | null
          id: string
          metric_date: string
          p95_apply_duration_ms: number | null
          partner_payouts_total: number | null
          payout_failed_count: number | null
          payout_success_count: number | null
          platform_revenue: number | null
          provider: string | null
          queue_lag_p95_seconds: number | null
          reconciliation_mismatch_count: number | null
          total_volume_processed: number | null
        }
        Insert: {
          avg_apply_duration_ms?: number | null
          created_at?: string | null
          disputes_opened_count?: number | null
          disputes_resolved_count?: number | null
          duplicates_ignored?: number | null
          events_applied_ok?: number | null
          events_apply_error?: number | null
          events_received?: number | null
          id?: string
          metric_date: string
          p95_apply_duration_ms?: number | null
          partner_payouts_total?: number | null
          payout_failed_count?: number | null
          payout_success_count?: number | null
          platform_revenue?: number | null
          provider?: string | null
          queue_lag_p95_seconds?: number | null
          reconciliation_mismatch_count?: number | null
          total_volume_processed?: number | null
        }
        Update: {
          avg_apply_duration_ms?: number | null
          created_at?: string | null
          disputes_opened_count?: number | null
          disputes_resolved_count?: number | null
          duplicates_ignored?: number | null
          events_applied_ok?: number | null
          events_apply_error?: number | null
          events_received?: number | null
          id?: string
          metric_date?: string
          p95_apply_duration_ms?: number | null
          partner_payouts_total?: number | null
          payout_failed_count?: number | null
          payout_success_count?: number | null
          platform_revenue?: number | null
          provider?: string | null
          queue_lag_p95_seconds?: number | null
          reconciliation_mismatch_count?: number | null
          total_volume_processed?: number | null
        }
        Relationships: []
      }
      ops_recommendations: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          dedupe_key: string
          error_message: string | null
          id: string
          partner_id: string | null
          payload: Json | null
          provider: string
          provider_payment_id: string | null
          status: string
          suggested_action: string
          tenant_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          dedupe_key: string
          error_message?: string | null
          id?: string
          partner_id?: string | null
          payload?: Json | null
          provider: string
          provider_payment_id?: string | null
          status?: string
          suggested_action: string
          tenant_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          dedupe_key?: string
          error_message?: string | null
          id?: string
          partner_id?: string | null
          payload?: Json | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          suggested_action?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ops_recommendations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ops_recommendations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "ops_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_id: string | null
          addon_name: string
          id: string
          order_item_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          addon_id?: string | null
          addon_name: string
          id?: string
          order_item_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          addon_id?: string | null
          addon_name?: string
          id?: string
          order_item_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          variation_id: string | null
          variation_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
          variation_id?: string | null
          variation_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variation_id?: string | null
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_neighborhood: string | null
          delivery_zip_code: string | null
          discount: number | null
          estimated_time_minutes: number | null
          id: string
          is_delivery: boolean | null
          marketplace_order_id: string | null
          notes: string | null
          order_number: number
          origin: Database["public"]["Enums"]["order_origin"]
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_neighborhood?: string | null
          delivery_zip_code?: string | null
          discount?: number | null
          estimated_time_minutes?: number | null
          id?: string
          is_delivery?: boolean | null
          marketplace_order_id?: string | null
          notes?: string | null
          order_number?: number
          origin?: Database["public"]["Enums"]["order_origin"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_neighborhood?: string | null
          delivery_zip_code?: string | null
          discount?: number | null
          estimated_time_minutes?: number | null
          id?: string
          is_delivery?: boolean | null
          marketplace_order_id?: string | null
          notes?: string | null
          order_number?: number
          origin?: Database["public"]["Enums"]["order_origin"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string | null
          dns_configured: boolean | null
          domain: string
          domain_type: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          last_checked_at: string | null
          ssl_status: string | null
          tenant_id: string
          updated_at: string | null
          verification_method: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          dns_configured?: boolean | null
          domain: string
          domain_type?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          last_checked_at?: string | null
          ssl_status?: string | null
          tenant_id: string
          updated_at?: string | null
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          dns_configured?: boolean | null
          domain?: string
          domain_type?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          last_checked_at?: string | null
          ssl_status?: string | null
          tenant_id?: string
          updated_at?: string | null
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_addons: {
        Row: {
          amount: number
          billing_period: string | null
          created_at: string
          currency: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          module_key: string | null
          name: string
          partner_id: string
          pricing_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_period?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          module_key?: string | null
          name: string
          partner_id: string
          pricing_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          module_key?: string | null
          name?: string
          partner_id?: string
          pricing_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_addons_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_addons_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_branding: {
        Row: {
          accent_color: string | null
          created_at: string | null
          favicon_url: string | null
          footer_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          logo_url: string | null
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          partner_id: string
          platform_name: string | null
          powered_by_enabled: boolean | null
          powered_by_text: string | null
          primary_color: string | null
          privacy_url: string | null
          secondary_color: string | null
          support_email: string | null
          support_phone: string | null
          terms_url: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          partner_id: string
          platform_name?: string | null
          powered_by_enabled?: boolean | null
          powered_by_text?: string | null
          primary_color?: string | null
          privacy_url?: string | null
          secondary_color?: string | null
          support_email?: string | null
          support_phone?: string | null
          terms_url?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          partner_id?: string
          platform_name?: string | null
          powered_by_enabled?: boolean | null
          powered_by_text?: string | null
          primary_color?: string | null
          privacy_url?: string | null
          secondary_color?: string | null
          support_email?: string | null
          support_phone?: string | null
          terms_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_branding_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_branding_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_coupons: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_redemptions: number | null
          max_redemptions_per_tenant: number | null
          min_amount: number | null
          partner_id: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          max_redemptions_per_tenant?: number | null
          min_amount?: number | null
          partner_id: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          max_redemptions_per_tenant?: number | null
          min_amount?: number | null
          partner_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_coupons_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_coupons_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_delinquency_config: {
        Row: {
          created_at: string | null
          full_block_days: number | null
          id: string
          partial_block_days: number | null
          partner_id: string | null
          send_email_warning: boolean | null
          send_sms_warning: boolean | null
          updated_at: string | null
          warning_days: number | null
        }
        Insert: {
          created_at?: string | null
          full_block_days?: number | null
          id?: string
          partial_block_days?: number | null
          partner_id?: string | null
          send_email_warning?: boolean | null
          send_sms_warning?: boolean | null
          updated_at?: string | null
          warning_days?: number | null
        }
        Update: {
          created_at?: string | null
          full_block_days?: number | null
          id?: string
          partial_block_days?: number | null
          partner_id?: string | null
          send_email_warning?: boolean | null
          send_sms_warning?: boolean | null
          updated_at?: string | null
          warning_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_delinquency_config_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_delinquency_config_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_domains: {
        Row: {
          created_at: string | null
          domain: string
          domain_type: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          partner_id: string
          published: boolean
          ssl_status: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          domain_type?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          partner_id: string
          published?: boolean
          ssl_status?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          domain_type?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          partner_id?: string
          published?: boolean
          ssl_status?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_domains_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_domains_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_dunning_policies: {
        Row: {
          auto_cancel_after_days: number | null
          auto_cancel_enabled: boolean
          block_after_days: number
          created_at: string
          grace_days: number
          id: string
          notify_schedule: Json
          partner_id: string | null
          suspend_after_days: number
          updated_at: string
        }
        Insert: {
          auto_cancel_after_days?: number | null
          auto_cancel_enabled?: boolean
          block_after_days?: number
          created_at?: string
          grace_days?: number
          id?: string
          notify_schedule?: Json
          partner_id?: string | null
          suspend_after_days?: number
          updated_at?: string
        }
        Update: {
          auto_cancel_after_days?: number | null
          auto_cancel_enabled?: boolean
          block_after_days?: number
          created_at?: string
          grace_days?: number
          id?: string
          notify_schedule?: Json
          partner_id?: string | null
          suspend_after_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_dunning_policies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_dunning_policies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_earnings: {
        Row: {
          created_at: string | null
          currency: string | null
          external_payment_id: string | null
          gateway_fee: number
          gross_amount: number
          id: string
          merchant_net: number
          order_id: string | null
          original_earning_id: string | null
          partner_fee: number
          partner_id: string
          payment_method: string | null
          platform_fee: number
          reversal_reason: string | null
          reversed_at: string | null
          settled_at: string | null
          settlement_mode: string | null
          status: string | null
          tenant_id: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          external_payment_id?: string | null
          gateway_fee?: number
          gross_amount: number
          id?: string
          merchant_net?: number
          order_id?: string | null
          original_earning_id?: string | null
          partner_fee?: number
          partner_id: string
          payment_method?: string | null
          platform_fee?: number
          reversal_reason?: string | null
          reversed_at?: string | null
          settled_at?: string | null
          settlement_mode?: string | null
          status?: string | null
          tenant_id: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          external_payment_id?: string | null
          gateway_fee?: number
          gross_amount?: number
          id?: string
          merchant_net?: number
          order_id?: string | null
          original_earning_id?: string | null
          partner_fee?: number
          partner_id?: string
          payment_method?: string | null
          platform_fee?: number
          reversal_reason?: string | null
          reversed_at?: string | null
          settled_at?: string | null
          settlement_mode?: string | null
          status?: string | null
          tenant_id?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_earnings_original_earning_id_fkey"
            columns: ["original_earning_id"]
            isOneToOne: false
            referencedRelation: "partner_earnings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_earnings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_earnings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_earnings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_fee_config: {
        Row: {
          boleto_fee_fixed: number | null
          created_at: string | null
          credit_fee_percent: number | null
          debit_fee_percent: number | null
          default_settlement_mode: string | null
          gateway_split_recipient_id: string | null
          id: string
          is_enabled: boolean | null
          partner_id: string
          pix_fee_percent: number | null
          platform_fee_fixed: number | null
          platform_fee_percent: number | null
          platform_share_enabled: boolean | null
          platform_share_percent: number | null
          split_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          boleto_fee_fixed?: number | null
          created_at?: string | null
          credit_fee_percent?: number | null
          debit_fee_percent?: number | null
          default_settlement_mode?: string | null
          gateway_split_recipient_id?: string | null
          id?: string
          is_enabled?: boolean | null
          partner_id: string
          pix_fee_percent?: number | null
          platform_fee_fixed?: number | null
          platform_fee_percent?: number | null
          platform_share_enabled?: boolean | null
          platform_share_percent?: number | null
          split_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          boleto_fee_fixed?: number | null
          created_at?: string | null
          credit_fee_percent?: number | null
          debit_fee_percent?: number | null
          default_settlement_mode?: string | null
          gateway_split_recipient_id?: string | null
          id?: string
          is_enabled?: boolean | null
          partner_id?: string
          pix_fee_percent?: number | null
          platform_fee_fixed?: number | null
          platform_fee_percent?: number | null
          platform_share_enabled?: boolean | null
          platform_share_percent?: number | null
          split_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_fee_config_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_fee_config_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_guides: {
        Row: {
          category: string | null
          content_md: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          key: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_md: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          key: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_md?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_invoices: {
        Row: {
          amount: number
          billing_type: string | null
          canceled_at: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          due_date: string
          gateway_invoice_url: string | null
          gateway_payment_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          partner_plan_id: string | null
          payment_provider: string | null
          status: string
          tenant_id: string
          tenant_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_type?: string | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date: string
          gateway_invoice_url?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          partner_plan_id?: string | null
          payment_provider?: string | null
          status?: string
          tenant_id: string
          tenant_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_type?: string | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string
          gateway_invoice_url?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          partner_plan_id?: string | null
          payment_provider?: string | null
          status?: string
          tenant_id?: string
          tenant_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_plan_id_fkey"
            columns: ["partner_plan_id"]
            isOneToOne: false
            referencedRelation: "partner_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_tenant_subscription_id_fkey"
            columns: ["tenant_subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          contact: string
          created_at: string
          id: string
          message: string | null
          name: string
          notes: string | null
          partner_id: string
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          partner_id: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          partner_id?: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_marketing_pages: {
        Row: {
          benefits: Json | null
          benefits_title: string | null
          created_at: string
          cta_button_text: string | null
          cta_subtitle: string | null
          cta_title: string | null
          faq_items: Json | null
          faq_title: string | null
          features: Json | null
          features_title: string | null
          hero_badge: string | null
          hero_cta_text: string | null
          hero_cta_url: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string
          id: string
          include_in_sitemap: boolean
          partner_id: string
          published: boolean
          published_at: string | null
          schema_org: Json | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          show_faq_section: boolean | null
          show_modules_section: boolean | null
          show_pricing_section: boolean | null
          show_testimonials_section: boolean | null
          social_proof_text: string | null
          testimonials: Json | null
          updated_at: string
        }
        Insert: {
          benefits?: Json | null
          benefits_title?: string | null
          created_at?: string
          cta_button_text?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          faq_items?: Json | null
          faq_title?: string | null
          features?: Json | null
          features_title?: string | null
          hero_badge?: string | null
          hero_cta_text?: string | null
          hero_cta_url?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string
          id?: string
          include_in_sitemap?: boolean
          partner_id: string
          published?: boolean
          published_at?: string | null
          schema_org?: Json | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          show_faq_section?: boolean | null
          show_modules_section?: boolean | null
          show_pricing_section?: boolean | null
          show_testimonials_section?: boolean | null
          social_proof_text?: string | null
          testimonials?: Json | null
          updated_at?: string
        }
        Update: {
          benefits?: Json | null
          benefits_title?: string | null
          created_at?: string
          cta_button_text?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          faq_items?: Json | null
          faq_title?: string | null
          features?: Json | null
          features_title?: string | null
          hero_badge?: string | null
          hero_cta_text?: string | null
          hero_cta_url?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string
          id?: string
          include_in_sitemap?: boolean
          partner_id?: string
          published?: boolean
          published_at?: string | null
          schema_org?: Json | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          show_faq_section?: boolean | null
          show_modules_section?: boolean | null
          show_pricing_section?: boolean | null
          show_testimonials_section?: boolean | null
          social_proof_text?: string | null
          testimonials?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_marketing_pages_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_marketing_pages_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_onboarding_status: {
        Row: {
          completed_at: string | null
          created_at: string
          dry_run_passed: boolean | null
          dry_run_passed_at: string | null
          partner_id: string
          step_branding_completed: boolean
          step_compliance_completed: boolean
          step_domains_completed: boolean
          step_notifications_completed: boolean
          step_payments_completed: boolean
          step_plans_completed: boolean
          step_ready_to_sell: boolean | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dry_run_passed?: boolean | null
          dry_run_passed_at?: string | null
          partner_id: string
          step_branding_completed?: boolean
          step_compliance_completed?: boolean
          step_domains_completed?: boolean
          step_notifications_completed?: boolean
          step_payments_completed?: boolean
          step_plans_completed?: boolean
          step_ready_to_sell?: boolean | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dry_run_passed?: boolean | null
          dry_run_passed_at?: string | null
          partner_id?: string
          step_branding_completed?: boolean
          step_compliance_completed?: boolean
          step_domains_completed?: boolean
          step_notifications_completed?: boolean
          step_payments_completed?: boolean
          step_plans_completed?: boolean
          step_ready_to_sell?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_onboarding_status_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_onboarding_status_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_payment_accounts: {
        Row: {
          capabilities: Json
          created_at: string
          id: string
          kyc_level: string
          last_sync_at: string | null
          onboarding_url: string | null
          partner_id: string
          provider: string
          provider_account_id: string | null
          provider_wallet_id: string | null
          status: string
          sync_error: string | null
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          id?: string
          kyc_level?: string
          last_sync_at?: string | null
          onboarding_url?: string | null
          partner_id: string
          provider?: string
          provider_account_id?: string | null
          provider_wallet_id?: string | null
          status?: string
          sync_error?: string | null
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          id?: string
          kyc_level?: string
          last_sync_at?: string | null
          onboarding_url?: string | null
          partner_id?: string
          provider?: string
          provider_account_id?: string | null
          provider_wallet_id?: string | null
          status?: string
          sync_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payment_accounts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payment_accounts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          created_at: string | null
          executed_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          partner_id: string
          payout_method: string
          provider_reference: string | null
          settlement_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          executed_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          partner_id: string
          payout_method: string
          provider_reference?: string | null
          settlement_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          executed_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          partner_id?: string
          payout_method?: string
          provider_reference?: string | null
          settlement_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_payouts_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_plan_modules: {
        Row: {
          created_at: string | null
          id: string
          included_quantity: number | null
          is_active: boolean | null
          module_key: string
          partner_plan_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          included_quantity?: number | null
          is_active?: boolean | null
          module_key: string
          partner_plan_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          included_quantity?: number | null
          is_active?: boolean | null
          module_key?: string
          partner_plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_plan_modules_partner_plan_id_fkey"
            columns: ["partner_plan_id"]
            isOneToOne: false
            referencedRelation: "partner_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_plans: {
        Row: {
          base_plan_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          display_order: number | null
          id: string
          included_features: string[] | null
          included_modules: string[] | null
          is_active: boolean | null
          is_free: boolean | null
          max_orders_per_month: number | null
          max_products: number | null
          max_users: number | null
          monthly_price: number
          name: string
          partner_id: string
          slug: string
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          base_plan_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          included_features?: string[] | null
          included_modules?: string[] | null
          is_active?: boolean | null
          is_free?: boolean | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_users?: number | null
          monthly_price: number
          name: string
          partner_id: string
          slug: string
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          base_plan_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          included_features?: string[] | null
          included_modules?: string[] | null
          is_active?: boolean | null
          is_free?: boolean | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_users?: number | null
          monthly_price?: number
          name?: string
          partner_id?: string
          slug?: string
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_plans_base_plan_id_fkey"
            columns: ["base_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_plans_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_plans_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_policies: {
        Row: {
          allow_free_plan: boolean
          allow_offline_billing: boolean
          allowed_features_catalog: string[] | null
          allowed_modules_catalog: string[] | null
          created_at: string
          free_plan_constraints: Json | null
          free_plan_max_features: number
          free_plan_max_modules: number
          id: string
          max_boleto_fee_fixed: number | null
          max_credit_fee_percent: number | null
          max_debit_fee_percent: number | null
          max_features_per_plan: number
          max_modules_per_plan: number
          max_pix_fee_percent: number | null
          max_plans_per_partner: number
          max_platform_fee_fixed: number | null
          max_platform_fee_percent: number | null
          max_trial_days_allowed: number
          min_paid_plan_price: number
          partner_id: string | null
          require_plan_hierarchy: boolean
          trial_allowed_features: string[] | null
          trial_allowed_modules: string[] | null
          updated_at: string
        }
        Insert: {
          allow_free_plan?: boolean
          allow_offline_billing?: boolean
          allowed_features_catalog?: string[] | null
          allowed_modules_catalog?: string[] | null
          created_at?: string
          free_plan_constraints?: Json | null
          free_plan_max_features?: number
          free_plan_max_modules?: number
          id?: string
          max_boleto_fee_fixed?: number | null
          max_credit_fee_percent?: number | null
          max_debit_fee_percent?: number | null
          max_features_per_plan?: number
          max_modules_per_plan?: number
          max_pix_fee_percent?: number | null
          max_plans_per_partner?: number
          max_platform_fee_fixed?: number | null
          max_platform_fee_percent?: number | null
          max_trial_days_allowed?: number
          min_paid_plan_price?: number
          partner_id?: string | null
          require_plan_hierarchy?: boolean
          trial_allowed_features?: string[] | null
          trial_allowed_modules?: string[] | null
          updated_at?: string
        }
        Update: {
          allow_free_plan?: boolean
          allow_offline_billing?: boolean
          allowed_features_catalog?: string[] | null
          allowed_modules_catalog?: string[] | null
          created_at?: string
          free_plan_constraints?: Json | null
          free_plan_max_features?: number
          free_plan_max_modules?: number
          id?: string
          max_boleto_fee_fixed?: number | null
          max_credit_fee_percent?: number | null
          max_debit_fee_percent?: number | null
          max_features_per_plan?: number
          max_modules_per_plan?: number
          max_pix_fee_percent?: number | null
          max_plans_per_partner?: number
          max_platform_fee_fixed?: number | null
          max_platform_fee_percent?: number | null
          max_trial_days_allowed?: number
          min_paid_plan_price?: number
          partner_id?: string | null
          require_plan_hierarchy?: boolean
          trial_allowed_features?: string[] | null
          trial_allowed_modules?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_policies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_policies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_seo_pages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          include_in_sitemap: boolean
          is_active: boolean
          is_indexable: boolean
          keywords: string[] | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          og_type: string | null
          partner_id: string
          path: string
          robots: string | null
          sitemap_changefreq: string | null
          sitemap_priority: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          include_in_sitemap?: boolean
          is_active?: boolean
          is_indexable?: boolean
          keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_type?: string | null
          partner_id: string
          path: string
          robots?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          include_in_sitemap?: boolean
          is_active?: boolean
          is_indexable?: boolean
          keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_type?: string | null
          partner_id?: string
          path?: string
          robots?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_seo_pages_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_seo_pages_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_settlement_configs: {
        Row: {
          auto_payout_enabled: boolean
          chargeback_reserve_percent: number
          created_at: string
          notes: string | null
          partner_id: string
          payout_day_of_month: number | null
          payout_day_of_week: number | null
          payout_min_amount: number
          payout_schedule: string
          settlement_mode: string
          updated_at: string
        }
        Insert: {
          auto_payout_enabled?: boolean
          chargeback_reserve_percent?: number
          created_at?: string
          notes?: string | null
          partner_id: string
          payout_day_of_month?: number | null
          payout_day_of_week?: number | null
          payout_min_amount?: number
          payout_schedule?: string
          settlement_mode?: string
          updated_at?: string
        }
        Update: {
          auto_payout_enabled?: boolean
          chargeback_reserve_percent?: number
          created_at?: string
          notes?: string | null
          partner_id?: string
          payout_day_of_month?: number | null
          payout_day_of_week?: number | null
          payout_min_amount?: number
          payout_schedule?: string
          settlement_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_settlement_configs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlement_configs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partner_tenant_addon_subscriptions: {
        Row: {
          addon_id: string
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string
          end_at: string | null
          id: string
          partner_id: string
          start_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          addon_id: string
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          partner_id: string
          start_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          addon_id?: string
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          partner_id?: string
          start_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tenant_addon_subscriptions_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "partner_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tenant_addon_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tenant_addon_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_tenant_addon_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_tenants: {
        Row: {
          billing_notes: string | null
          id: string
          joined_at: string | null
          next_billing_date: string | null
          partner_id: string
          partner_plan_id: string | null
          risk_flag: string | null
          risk_flagged_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          billing_notes?: string | null
          id?: string
          joined_at?: string | null
          next_billing_date?: string | null
          partner_id: string
          partner_plan_id?: string | null
          risk_flag?: string | null
          risk_flagged_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          billing_notes?: string | null
          id?: string
          joined_at?: string | null
          next_billing_date?: string | null
          partner_id?: string
          partner_plan_id?: string | null
          risk_flag?: string | null
          risk_flagged_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_tenants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tenants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_tenants_partner_plan_id_fkey"
            columns: ["partner_plan_id"]
            isOneToOne: false
            referencedRelation: "partner_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          partner_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string | null
          document: string | null
          email: string
          id: string
          is_active: boolean | null
          is_suspended: boolean
          max_tenants: number | null
          max_users_per_tenant: number | null
          name: string
          notes: string | null
          phone: string | null
          revenue_share_percent: number | null
          slug: string
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean
          max_tenants?: number | null
          max_users_per_tenant?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          revenue_share_percent?: number | null
          slug: string
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean
          max_tenants?: number | null
          max_users_per_tenant?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          revenue_share_percent?: number | null
          slug?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      password_panel_config: {
        Row: {
          config: Json | null
          created_at: string | null
          current_number: number | null
          display_format: string | null
          display_timeout_seconds: number | null
          id: string
          is_active: boolean | null
          max_displayed: number | null
          reset_daily: boolean | null
          tenant_id: string
          updated_at: string | null
          voice_enabled: boolean | null
          voice_text: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          current_number?: number | null
          display_format?: string | null
          display_timeout_seconds?: number | null
          id?: string
          is_active?: boolean | null
          max_displayed?: number | null
          reset_daily?: boolean | null
          tenant_id: string
          updated_at?: string | null
          voice_enabled?: boolean | null
          voice_text?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          current_number?: number | null
          display_format?: string | null
          display_timeout_seconds?: number | null
          id?: string
          is_active?: boolean | null
          max_displayed?: number | null
          reset_daily?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          voice_enabled?: boolean | null
          voice_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_panel_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_queue: {
        Row: {
          called_at: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          order_id: string | null
          password_number: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          called_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          password_number: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          called_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          password_number?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount_gross: number
          amount_net: number | null
          applied_at: string | null
          correlation_id: string | null
          created_at: string
          currency: string
          error_message: string | null
          event_type: string
          id: string
          occurred_at: string
          partner_id: string | null
          payload: Json | null
          payment_method: string | null
          provider: string
          provider_event_id: string
          provider_payment_id: string
          received_at: string
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount_gross?: number
          amount_net?: number | null
          applied_at?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          partner_id?: string | null
          payload?: Json | null
          payment_method?: string | null
          provider?: string
          provider_event_id: string
          provider_payment_id: string
          received_at?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          applied_at?: string | null
          correlation_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          partner_id?: string | null
          payload?: Json | null
          payment_method?: string | null
          provider?: string
          provider_event_id?: string
          provider_payment_id?: string
          received_at?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "payment_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events_archive: {
        Row: {
          amount_gross: number | null
          amount_net: number | null
          applied_at: string | null
          archived_at: string | null
          correlation_id: string | null
          created_at: string | null
          currency: string | null
          error_message: string | null
          event_type: string | null
          id: string
          occurred_at: string | null
          partner_id: string | null
          payload: Json | null
          payment_method: string | null
          provider: string | null
          provider_event_id: string | null
          provider_payment_id: string | null
          received_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_gross?: number | null
          amount_net?: number | null
          applied_at?: string | null
          archived_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          event_type?: string | null
          id: string
          occurred_at?: string | null
          partner_id?: string | null
          payload?: Json | null
          payment_method?: string | null
          provider?: string | null
          provider_event_id?: string | null
          provider_payment_id?: string | null
          received_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_gross?: number | null
          amount_net?: number | null
          applied_at?: string | null
          archived_at?: string | null
          correlation_id?: string | null
          created_at?: string | null
          currency?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          occurred_at?: string | null
          partner_id?: string | null
          payload?: Json | null
          payment_method?: string | null
          provider?: string | null
          provider_event_id?: string | null
          provider_payment_id?: string | null
          received_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          api_key_masked: string | null
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key_masked?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key_masked?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_machine_records: {
        Row: {
          amount: number
          authorization_code: string | null
          card_brand: string | null
          card_last4: string | null
          card_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          installments: number | null
          is_approved: boolean | null
          nsu_doc: string | null
          order_id: string | null
          payment_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          raw_response: Json | null
          tenant_id: string
          tid: string | null
          transaction_datetime: string
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          card_brand?: string | null
          card_last4?: string | null
          card_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          installments?: number | null
          is_approved?: boolean | null
          nsu_doc?: string | null
          order_id?: string | null
          payment_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          raw_response?: Json | null
          tenant_id: string
          tid?: string | null
          transaction_datetime: string
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          card_brand?: string | null
          card_last4?: string | null
          card_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          installments?: number | null
          is_approved?: boolean | null
          nsu_doc?: string | null
          order_id?: string | null
          payment_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          raw_response?: Json | null
          tenant_id?: string
          tid?: string | null
          transaction_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_machine_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_machine_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_machine_records_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_machine_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_terms: {
        Row: {
          clauses: Json
          content: string
          created_at: string
          id: string
          is_active: boolean
          published_at: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          clauses?: Json
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          version: string
        }
        Update: {
          clauses?: Json
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      payment_terms_acceptance: {
        Row: {
          accepted_at: string
          accepted_by: string
          id: string
          ip_address: string | null
          tenant_id: string
          terms_id: string
          terms_version: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          id?: string
          ip_address?: string | null
          tenant_id: string
          terms_id: string
          terms_version: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string
          terms_id?: string
          terms_version?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_terms_acceptance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_terms_acceptance_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          gateway_payment_intent: string | null
          gateway_provider: string | null
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          order_id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          gateway_payment_intent?: string | null
          gateway_provider?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          gateway_payment_intent?: string | null
          gateway_provider?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_jobs: {
        Row: {
          amount: number
          attempts: number
          completed_at: string | null
          created_at: string
          currency: string
          dedupe_key: string
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string | null
          partner_id: string
          provider_transfer_id: string | null
          scheduled_at: string
          settlement_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          attempts?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          dedupe_key: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          partner_id: string
          provider_transfer_id?: string | null
          scheduled_at?: string
          settlement_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attempts?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          dedupe_key?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          partner_id?: string
          provider_transfer_id?: string | null
          scheduled_at?: string
          settlement_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_jobs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_jobs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "payout_jobs_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_addon_modules: {
        Row: {
          addon_module_id: string
          created_at: string
          created_by: string | null
          id: string
          plan_id: string
        }
        Insert: {
          addon_module_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          plan_id: string
        }
        Update: {
          addon_module_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_addon_modules_addon_module_id_fkey"
            columns: ["addon_module_id"]
            isOneToOne: false
            referencedRelation: "addon_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_addon_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_prorations: {
        Row: {
          applied_at: string | null
          created_at: string
          days_in_cycle: number
          days_remaining: number
          from_amount: number
          from_plan_id: string | null
          from_plan_name: string | null
          id: string
          invoice_id: string | null
          net_amount: number
          proration_charge: number
          proration_credit: number
          status: string
          tenant_id: string
          to_amount: number
          to_plan_id: string | null
          to_plan_name: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          days_in_cycle: number
          days_remaining: number
          from_amount: number
          from_plan_id?: string | null
          from_plan_name?: string | null
          id?: string
          invoice_id?: string | null
          net_amount: number
          proration_charge: number
          proration_credit: number
          status?: string
          tenant_id: string
          to_amount: number
          to_plan_id?: string | null
          to_plan_name?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          days_in_cycle?: number
          days_remaining?: number
          from_amount?: number
          from_plan_id?: string | null
          from_plan_name?: string | null
          id?: string
          invoice_id?: string | null
          net_amount?: number
          proration_charge?: number
          proration_credit?: number
          status?: string
          tenant_id?: string
          to_amount?: number
          to_plan_id?: string | null
          to_plan_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_prorations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_prorations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_config: {
        Row: {
          created_at: string
          default_fixed: number
          default_percent: number
          enabled: boolean
          id: string
          mode: string
          per_method_config: Json
          per_plan_config: Json
          split_account_id: string | null
          split_destination: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_fixed?: number
          default_percent?: number
          enabled?: boolean
          id?: string
          mode?: string
          per_method_config?: Json
          per_plan_config?: Json
          split_account_id?: string | null
          split_destination?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_fixed?: number
          default_percent?: number
          enabled?: boolean
          id?: string
          mode?: string
          per_method_config?: Json
          per_plan_config?: Json
          split_account_id?: string | null
          split_destination?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_partner_revenue: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          external_payment_id: string | null
          fee_type: string
          id: string
          invoice_id: string | null
          original_revenue_id: string | null
          partner_earning_id: string | null
          partner_id: string
          period_end: string | null
          period_start: string | null
          reversal_reason: string | null
          reversed_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          external_payment_id?: string | null
          fee_type: string
          id?: string
          invoice_id?: string | null
          original_revenue_id?: string | null
          partner_earning_id?: string | null
          partner_id: string
          period_end?: string | null
          period_start?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          external_payment_id?: string | null
          fee_type?: string
          id?: string
          invoice_id?: string | null
          original_revenue_id?: string | null
          partner_earning_id?: string | null
          partner_id?: string
          period_end?: string | null
          period_start?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_partner_revenue_original_revenue_id_fkey"
            columns: ["original_revenue_id"]
            isOneToOne: false
            referencedRelation: "platform_partner_revenue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_partner_revenue_partner_earning_id_fkey"
            columns: ["partner_earning_id"]
            isOneToOne: false
            referencedRelation: "partner_earnings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_partner_revenue_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_partner_revenue_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      platform_seo_pages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          include_in_sitemap: boolean
          is_active: boolean
          is_indexable: boolean
          keywords: string[] | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          og_type: string | null
          page_schema_data: Json | null
          page_schema_type: string | null
          path: string
          robots: string | null
          sitemap_changefreq: string | null
          sitemap_priority: number | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          include_in_sitemap?: boolean
          is_active?: boolean
          is_indexable?: boolean
          keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_type?: string | null
          page_schema_data?: Json | null
          page_schema_type?: string | null
          path: string
          robots?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          include_in_sitemap?: boolean
          is_active?: boolean
          is_indexable?: boolean
          keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_type?: string | null
          page_schema_data?: Json | null
          page_schema_type?: string | null
          path?: string
          robots?: string | null
          sitemap_changefreq?: string | null
          sitemap_priority?: number | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_seo_settings: {
        Row: {
          app_category: string | null
          app_features: string[] | null
          app_operating_system: string | null
          app_price: string | null
          app_price_currency: string | null
          app_rating_count: number | null
          app_rating_value: number | null
          bing_site_verification: string | null
          canonical_domain: string
          created_at: string
          default_description: string | null
          default_keywords: string[] | null
          default_robots: string | null
          default_title: string
          google_site_verification: string | null
          id: string
          logo_url: string | null
          og_image_url: string | null
          og_locale: string | null
          og_type: string | null
          organization_address: Json | null
          organization_email: string | null
          organization_name: string | null
          organization_phone: string | null
          site_name: string
          social_links: string[] | null
          theme_color: string | null
          twitter_card: string | null
          twitter_creator: string | null
          twitter_site: string | null
          updated_at: string
        }
        Insert: {
          app_category?: string | null
          app_features?: string[] | null
          app_operating_system?: string | null
          app_price?: string | null
          app_price_currency?: string | null
          app_rating_count?: number | null
          app_rating_value?: number | null
          bing_site_verification?: string | null
          canonical_domain?: string
          created_at?: string
          default_description?: string | null
          default_keywords?: string[] | null
          default_robots?: string | null
          default_title?: string
          google_site_verification?: string | null
          id?: string
          logo_url?: string | null
          og_image_url?: string | null
          og_locale?: string | null
          og_type?: string | null
          organization_address?: Json | null
          organization_email?: string | null
          organization_name?: string | null
          organization_phone?: string | null
          site_name?: string
          social_links?: string[] | null
          theme_color?: string | null
          twitter_card?: string | null
          twitter_creator?: string | null
          twitter_site?: string | null
          updated_at?: string
        }
        Update: {
          app_category?: string | null
          app_features?: string[] | null
          app_operating_system?: string | null
          app_price?: string | null
          app_price_currency?: string | null
          app_rating_count?: number | null
          app_rating_value?: number | null
          bing_site_verification?: string | null
          canonical_domain?: string
          created_at?: string
          default_description?: string | null
          default_keywords?: string[] | null
          default_robots?: string | null
          default_title?: string
          google_site_verification?: string | null
          id?: string
          logo_url?: string | null
          og_image_url?: string | null
          og_locale?: string | null
          og_type?: string | null
          organization_address?: Json | null
          organization_email?: string | null
          organization_name?: string | null
          organization_phone?: string | null
          site_name?: string
          social_links?: string[] | null
          theme_color?: string | null
          twitter_card?: string | null
          twitter_creator?: string | null
          twitter_site?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_addon_mapping: {
        Row: {
          addon_id: string
          id: string
          max_quantity: number | null
          product_id: string
        }
        Insert: {
          addon_id: string
          id?: string
          max_quantity?: number | null
          product_id: string
        }
        Update: {
          addon_id?: string
          id?: string
          max_quantity?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_mapping_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_mapping_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_mapping_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addons: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          price_modifier: number | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_modifier?: number | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_modifier?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          has_addons: boolean | null
          has_variations: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          is_combo: boolean | null
          name: string
          sku: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_addons?: boolean | null
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_combo?: boolean | null
          name: string
          sku?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_addons?: boolean | null
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_combo?: boolean | null
          name?: string
          sku?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf_cnpj: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          store_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          store_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          store_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_transfers: {
        Row: {
          amount: number
          bank_account_info: Json | null
          confirmed_at: string | null
          created_at: string
          currency: string
          error_message: string | null
          fee: number | null
          id: string
          net_amount: number | null
          partner_id: string
          payload: Json | null
          payout_job_id: string | null
          provider: string
          provider_transfer_id: string
          settlement_id: string | null
          status: string
          transfer_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_info?: Json | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          partner_id: string
          payload?: Json | null
          payout_job_id?: string | null
          provider?: string
          provider_transfer_id: string
          settlement_id?: string | null
          status?: string
          transfer_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_info?: Json | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          partner_id?: string
          payload?: Json | null
          payout_job_id?: string | null
          provider?: string
          provider_transfer_id?: string
          settlement_id?: string | null
          status?: string
          transfer_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_transfers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transfers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "provider_transfers_payout_job_id_fkey"
            columns: ["payout_job_id"]
            isOneToOne: false
            referencedRelation: "payout_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_transfers_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          key: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          key: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          key?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          id: string
          ingredient_id: string
          quantity: number
          recipe_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          quantity: number
          recipe_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          updated_at: string | null
          variation_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          updated_at?: string | null
          variation_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          updated_at?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_forecast_history: {
        Row: {
          accuracy_percentage: number | null
          actual_amount: number | null
          confidence: number | null
          created_at: string
          forecast_date: string
          id: string
          predicted_amount: number
          target_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accuracy_percentage?: number | null
          actual_amount?: number | null
          confidence?: number | null
          created_at?: string
          forecast_date: string
          id?: string
          predicted_amount?: number
          target_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accuracy_percentage?: number | null
          actual_amount?: number | null
          confidence?: number | null
          created_at?: string
          forecast_date?: string
          id?: string
          predicted_amount?: number
          target_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_forecast_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          goal_type: string
          id: string
          is_active: boolean | null
          start_date: string
          target_amount: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          start_date: string
          target_amount?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_amount?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_actions: {
        Row: {
          action_key: string
          actor_types: string[]
          confirmation_type: string | null
          cooldown_minutes: number | null
          created_at: string
          description: string | null
          help_url: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_confirmation: boolean | null
        }
        Insert: {
          action_key: string
          actor_types: string[]
          confirmation_type?: string | null
          cooldown_minutes?: number | null
          created_at?: string
          description?: string | null
          help_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_confirmation?: boolean | null
        }
        Update: {
          action_key?: string
          actor_types?: string[]
          confirmation_type?: string | null
          cooldown_minutes?: number | null
          created_at?: string
          description?: string | null
          help_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_confirmation?: boolean | null
        }
        Relationships: []
      }
      sensitive_actions_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          partner_id: string | null
          reason: string | null
          requires_review: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          target_id: string | null
          target_type: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          partner_id?: string | null
          reason?: string | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          partner_id?: string | null
          reason?: string | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensitive_actions_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensitive_actions_log_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "sensitive_actions_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_calls: {
        Row: {
          acknowledged_at: string | null
          assigned_waiter_id: string | null
          call_type: Database["public"]["Enums"]["service_call_type"]
          comanda_id: string | null
          created_at: string | null
          customer_id: string | null
          escalated_at: string | null
          escalation_level: number | null
          escalation_timeout_minutes: number | null
          id: string
          notes: string | null
          priority: number | null
          resolved_at: string | null
          resolved_by: string | null
          response_time_seconds: number | null
          status: Database["public"]["Enums"]["service_call_status"] | null
          table_id: string | null
          tenant_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_waiter_id?: string | null
          call_type: Database["public"]["Enums"]["service_call_type"]
          comanda_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          escalation_timeout_minutes?: number | null
          id?: string
          notes?: string | null
          priority?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_seconds?: number | null
          status?: Database["public"]["Enums"]["service_call_status"] | null
          table_id?: string | null
          tenant_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_waiter_id?: string | null
          call_type?: Database["public"]["Enums"]["service_call_type"]
          comanda_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          escalation_timeout_minutes?: number | null
          id?: string
          notes?: string | null
          priority?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_seconds?: number | null
          status?: Database["public"]["Enums"]["service_call_status"] | null
          table_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_assigned_waiter_id_fkey"
            columns: ["assigned_waiter_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          settlement_id: string
          transaction_effect_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          settlement_id: string
          transaction_effect_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          settlement_id?: string
          transaction_effect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_transaction_effect_id_fkey"
            columns: ["transaction_effect_id"]
            isOneToOne: true
            referencedRelation: "transaction_effects"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          generated_at: string
          id: string
          metadata: Json | null
          paid_at: string | null
          partner_id: string
          period_end: string
          period_start: string
          settlement_mode: string
          status: string
          total_gross: number
          total_partner_net: number
          total_platform_fee: number
          transaction_count: number
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          generated_at?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          partner_id: string
          period_end: string
          period_start: string
          settlement_mode?: string
          status?: string
          total_gross?: number
          total_partner_net?: number
          total_platform_fee?: number
          transaction_count?: number
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          generated_at?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          settlement_mode?: string
          status?: string
          total_gross?: number
          total_partner_net?: number
          total_platform_fee?: number
          transaction_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message_template: string
          messages_delivered: number | null
          messages_failed: number | null
          messages_sent: number | null
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          target_audience: string | null
          target_filter: Json | null
          tenant_id: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_template: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_sent?: number | null
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          target_audience?: string | null
          target_filter?: Json | null
          tenant_id: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_template?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_sent?: number | null
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          target_audience?: string | null
          target_filter?: Json | null
          tenant_id?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_config: {
        Row: {
          api_key: string | null
          api_secret: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          messages_sent_this_month: number | null
          monthly_limit: number | null
          provider: string | null
          sender_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          messages_sent_this_month?: number | null
          monthly_limit?: number | null
          provider?: string | null
          sender_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          messages_sent_this_month?: number | null
          monthly_limit?: number | null
          provider?: string | null
          sender_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message: string
          phone_number: string
          sent_at: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message: string
          phone_number: string
          sent_at?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message?: string
          phone_number?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entries: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          entry_date: string | null
          id: string
          ingredient_id: string
          notes: string | null
          quantity: number
          supplier_id: string | null
          tenant_id: string
          total_cost: number | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          entry_date?: string | null
          id?: string
          ingredient_id: string
          notes?: string | null
          quantity: number
          supplier_id?: string | null
          tenant_id: string
          total_cost?: number | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          entry_date?: string | null
          id?: string
          ingredient_id?: string
          notes?: string | null
          quantity?: number
          supplier_id?: string | null
          tenant_id?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          ingredient_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ingredient_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ingredient_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          price_override: number | null
          product_id: string
          stock_quantity: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          price_override?: number | null
          product_id: string
          stock_quantity?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          price_override?: number | null
          product_id?: string
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_user_access: {
        Row: {
          access_level: string
          created_at: string
          id: string
          store_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          store_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          store_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_user_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_user_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          business_hours: Json | null
          city: string | null
          code: string
          config: Json | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_headquarters: boolean | null
          manager_name: string | null
          name: string
          phone: string | null
          state: string | null
          tenant_id: string
          timezone: string | null
          type: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          city?: string | null
          code: string
          config?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          manager_name?: string | null
          name: string
          phone?: string | null
          state?: string | null
          tenant_id: string
          timezone?: string | null
          type?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          city?: string | null
          code?: string
          config?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          manager_name?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          tenant_id?: string
          timezone?: string | null
          type?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_cycles: {
        Row: {
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          invoice_id: string | null
          partner_id: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          cycle_end: string
          cycle_start: string
          id?: string
          invoice_id?: string | null
          partner_id?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          invoice_id?: string | null
          partner_id?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          display_order: number | null
          feature_ai_forecast: boolean | null
          feature_api_access: boolean | null
          feature_cmv_reports: boolean | null
          feature_courier_app: boolean | null
          feature_custom_integrations: boolean | null
          feature_delivery_management: boolean | null
          feature_goal_notifications: boolean | null
          feature_kitchen_display: boolean | null
          feature_multi_branch: boolean | null
          feature_pos: boolean | null
          feature_priority_support: boolean | null
          feature_public_menu: boolean | null
          feature_reports_advanced: boolean | null
          feature_reports_basic: boolean | null
          feature_stock_control: boolean | null
          feature_white_label: boolean | null
          id: string
          is_active: boolean | null
          max_orders_per_month: number | null
          max_products: number | null
          max_users: number | null
          monthly_price: number
          name: string
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number | null
          feature_ai_forecast?: boolean | null
          feature_api_access?: boolean | null
          feature_cmv_reports?: boolean | null
          feature_courier_app?: boolean | null
          feature_custom_integrations?: boolean | null
          feature_delivery_management?: boolean | null
          feature_goal_notifications?: boolean | null
          feature_kitchen_display?: boolean | null
          feature_multi_branch?: boolean | null
          feature_pos?: boolean | null
          feature_priority_support?: boolean | null
          feature_public_menu?: boolean | null
          feature_reports_advanced?: boolean | null
          feature_reports_basic?: boolean | null
          feature_stock_control?: boolean | null
          feature_white_label?: boolean | null
          id?: string
          is_active?: boolean | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_users?: number | null
          monthly_price?: number
          name: string
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number | null
          feature_ai_forecast?: boolean | null
          feature_api_access?: boolean | null
          feature_cmv_reports?: boolean | null
          feature_courier_app?: boolean | null
          feature_custom_integrations?: boolean | null
          feature_delivery_management?: boolean | null
          feature_goal_notifications?: boolean | null
          feature_kitchen_display?: boolean | null
          feature_multi_branch?: boolean | null
          feature_pos?: boolean | null
          feature_priority_support?: boolean | null
          feature_public_menu?: boolean | null
          feature_reports_advanced?: boolean | null
          feature_reports_basic?: boolean | null
          feature_stock_control?: boolean | null
          feature_white_label?: boolean | null
          id?: string
          is_active?: boolean | null
          max_orders_per_month?: number | null
          max_products?: number | null
          max_users?: number | null
          monthly_price?: number
          name?: string
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          admin_response: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          organization_name: string | null
          responded_at: string | null
          responded_by: string | null
          source: string
          status: Database["public"]["Enums"]["suggestion_status"]
          subject: string
          suggestion_type: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          admin_response?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          organization_name?: string | null
          responded_at?: string | null
          responded_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          subject: string
          suggestion_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          admin_response?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          organization_name?: string | null
          responded_at?: string | null
          responded_by?: string | null
          source?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          subject?: string
          suggestion_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      table_session_items: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          quantity: number
          session_id: string
          status: string | null
          total_price: number
          unit_price: number
          variation_id: string | null
          variation_name: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          session_id: string
          status?: string | null
          total_price: number
          unit_price: number
          variation_id?: string | null
          variation_name?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          session_id?: string
          status?: string | null
          total_price?: number
          unit_price?: number
          variation_id?: string | null
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_pricing_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_session_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          id: string
          notes: string | null
          opened_at: string | null
          status: string
          subtotal: number | null
          table_id: string
          tenant_id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          status?: string
          subtotal?: number | null
          table_id: string
          tenant_id: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          status?: string
          subtotal?: number | null
          table_id?: string
          tenant_id?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string | null
          number: number
          qr_code: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          number: number
          qr_code?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          number?: number
          qr_code?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tef_config: {
        Row: {
          auto_capture: boolean | null
          com_port: string | null
          config: Json | null
          confirmation_required: boolean | null
          created_at: string | null
          establishment_code: string | null
          id: string
          is_active: boolean | null
          print_receipt: boolean | null
          provider: string | null
          tenant_id: string
          terminal_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_capture?: boolean | null
          com_port?: string | null
          config?: Json | null
          confirmation_required?: boolean | null
          created_at?: string | null
          establishment_code?: string | null
          id?: string
          is_active?: boolean | null
          print_receipt?: boolean | null
          provider?: string | null
          tenant_id: string
          terminal_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_capture?: boolean | null
          com_port?: string | null
          config?: Json | null
          confirmation_required?: boolean | null
          created_at?: string | null
          establishment_code?: string | null
          id?: string
          is_active?: boolean | null
          print_receipt?: boolean | null
          provider?: string | null
          tenant_id?: string
          terminal_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tef_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tef_transactions: {
        Row: {
          amount: number
          authorization_code: string | null
          card_brand: string | null
          card_last4: string | null
          created_at: string | null
          error_message: string | null
          host_nsu: string | null
          id: string
          installments: number | null
          nsu: string | null
          order_id: string | null
          payment_id: string | null
          raw_response: Json | null
          receipt_customer: string | null
          receipt_merchant: string | null
          status: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string | null
          error_message?: string | null
          host_nsu?: string | null
          id?: string
          installments?: number | null
          nsu?: string | null
          order_id?: string | null
          payment_id?: string | null
          raw_response?: Json | null
          receipt_customer?: string | null
          receipt_merchant?: string | null
          status?: string | null
          tenant_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string | null
          error_message?: string | null
          host_nsu?: string | null
          id?: string
          installments?: number | null
          nsu?: string | null
          order_id?: string | null
          payment_id?: string | null
          raw_response?: Json | null
          receipt_customer?: string | null
          receipt_merchant?: string | null
          status?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tef_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tef_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tef_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tef_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_addon_subscriptions: {
        Row: {
          addon_module_id: string
          admin_notes: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          billing_mode: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          grant_type: string | null
          id: string
          installed_by: string | null
          is_free: boolean | null
          next_billing_date: string | null
          notes: string | null
          price_paid: number | null
          purchased_at: string | null
          quota: number | null
          source: string | null
          started_at: string
          status: Database["public"]["Enums"]["addon_subscription_status"]
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          addon_module_id: string
          admin_notes?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          billing_mode?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grant_type?: string | null
          id?: string
          installed_by?: string | null
          is_free?: boolean | null
          next_billing_date?: string | null
          notes?: string | null
          price_paid?: number | null
          purchased_at?: string | null
          quota?: number | null
          source?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["addon_subscription_status"]
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          addon_module_id?: string
          admin_notes?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          billing_mode?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          grant_type?: string | null
          id?: string
          installed_by?: string | null
          is_free?: boolean | null
          next_billing_date?: string | null
          notes?: string | null
          price_paid?: number | null
          purchased_at?: string | null
          quota?: number | null
          source?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["addon_subscription_status"]
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_addon_subscriptions_addon_module_id_fkey"
            columns: ["addon_module_id"]
            isOneToOne: false
            referencedRelation: "addon_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_addon_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_billing_profiles: {
        Row: {
          billing_doc: string | null
          billing_email: string | null
          billing_name: string | null
          billing_phone: string | null
          created_at: string
          id: string
          metadata: Json | null
          partner_id: string | null
          provider: string
          provider_customer_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_doc?: string | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_doc?: string | null
          billing_email?: string | null
          billing_name?: string | null
          billing_phone?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          partner_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_billing_profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tenant_billing_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_entitlements: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          entitlement_key: string
          entitlement_value: Json
          id: string
          partner_id: string | null
          source: string
          source_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          entitlement_key: string
          entitlement_value?: Json
          id?: string
          partner_id?: string | null
          source: string
          source_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          entitlement_key?: string
          entitlement_value?: Json
          id?: string
          partner_id?: string | null
          source?: string
          source_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_entitlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_entitlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_fee_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          notes: string | null
          override_fixed: number | null
          override_percent: number | null
          per_method_override: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          notes?: string | null
          override_fixed?: number | null
          override_percent?: number | null
          per_method_override?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          notes?: string | null
          override_fixed?: number | null
          override_percent?: number | null
          per_method_override?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_fee_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invoices: {
        Row: {
          amount: number
          canceled_at: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          partner_id: string | null
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          provider: string
          provider_payment_id: string | null
          provider_payment_url: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_payment_url?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_payment_url?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "tenant_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "partner_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_module_audit: {
        Row: {
          action: string
          addon_module_id: string
          grant_type: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          previous_status: string | null
          source: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          addon_module_id: string
          grant_type?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          previous_status?: string | null
          source?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          addon_module_id?: string
          grant_type?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          previous_status?: string | null
          source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_module_audit_addon_module_id_fkey"
            columns: ["addon_module_id"]
            isOneToOne: false
            referencedRelation: "addon_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_module_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_module_usage: {
        Row: {
          created_at: string
          id: string
          module_slug: string
          period_end: string
          period_start: string
          tenant_id: string
          updated_at: string
          usage_count: number
          usage_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_slug: string
          period_end: string
          period_start: string
          tenant_id: string
          updated_at?: string
          usage_count?: number
          usage_key: string
        }
        Update: {
          created_at?: string
          id?: string
          module_slug?: string
          period_end?: string
          period_start?: string
          tenant_id?: string
          updated_at?: string
          usage_count?: number
          usage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_module_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_pending_coupons: {
        Row: {
          applied_at: string | null
          applies_to: string
          coupon_id: string
          created_at: string
          id: string
          status: string
          target_id: string | null
          tenant_id: string
        }
        Insert: {
          applied_at?: string | null
          applies_to: string
          coupon_id: string
          created_at?: string
          id?: string
          status?: string
          target_id?: string | null
          tenant_id: string
        }
        Update: {
          applied_at?: string | null
          applies_to?: string
          coupon_id?: string
          created_at?: string
          id?: string
          status?: string
          target_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_pending_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "partner_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_pending_coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_service_config: {
        Row: {
          allow_customer_ordering: boolean | null
          allow_customer_payment: boolean | null
          allow_order_cancellation: boolean | null
          allow_order_modification: boolean | null
          allow_partial_payment: boolean | null
          allow_split_payment: boolean | null
          allow_subcomanda: boolean | null
          allow_waiter_change: boolean | null
          block_payment_until_orders_complete: boolean | null
          created_at: string | null
          exit_control_enabled: boolean | null
          exit_requires_full_payment: boolean | null
          exit_validation_method: string | null
          id: string
          modification_deadline_minutes: number | null
          notify_bar: boolean | null
          notify_cashier: boolean | null
          notify_kitchen: boolean | null
          notify_waiter: boolean | null
          order_requires_waiter_approval: boolean | null
          payment_requires_waiter_approval: boolean | null
          service_fee_optional: boolean | null
          service_fee_percent: number | null
          subcomanda_requires_titular_approval: boolean | null
          subcomanda_requires_waiter_approval: boolean | null
          tenant_id: string
          updated_at: string | null
          waiter_change_requires_approval: boolean | null
        }
        Insert: {
          allow_customer_ordering?: boolean | null
          allow_customer_payment?: boolean | null
          allow_order_cancellation?: boolean | null
          allow_order_modification?: boolean | null
          allow_partial_payment?: boolean | null
          allow_split_payment?: boolean | null
          allow_subcomanda?: boolean | null
          allow_waiter_change?: boolean | null
          block_payment_until_orders_complete?: boolean | null
          created_at?: string | null
          exit_control_enabled?: boolean | null
          exit_requires_full_payment?: boolean | null
          exit_validation_method?: string | null
          id?: string
          modification_deadline_minutes?: number | null
          notify_bar?: boolean | null
          notify_cashier?: boolean | null
          notify_kitchen?: boolean | null
          notify_waiter?: boolean | null
          order_requires_waiter_approval?: boolean | null
          payment_requires_waiter_approval?: boolean | null
          service_fee_optional?: boolean | null
          service_fee_percent?: number | null
          subcomanda_requires_titular_approval?: boolean | null
          subcomanda_requires_waiter_approval?: boolean | null
          tenant_id: string
          updated_at?: string | null
          waiter_change_requires_approval?: boolean | null
        }
        Update: {
          allow_customer_ordering?: boolean | null
          allow_customer_payment?: boolean | null
          allow_order_cancellation?: boolean | null
          allow_order_modification?: boolean | null
          allow_partial_payment?: boolean | null
          allow_split_payment?: boolean | null
          allow_subcomanda?: boolean | null
          allow_waiter_change?: boolean | null
          block_payment_until_orders_complete?: boolean | null
          created_at?: string | null
          exit_control_enabled?: boolean | null
          exit_requires_full_payment?: boolean | null
          exit_validation_method?: string | null
          id?: string
          modification_deadline_minutes?: number | null
          notify_bar?: boolean | null
          notify_cashier?: boolean | null
          notify_kitchen?: boolean | null
          notify_waiter?: boolean | null
          order_requires_waiter_approval?: boolean | null
          payment_requires_waiter_approval?: boolean | null
          service_fee_optional?: boolean | null
          service_fee_percent?: number | null
          subcomanda_requires_titular_approval?: boolean | null
          subcomanda_requires_waiter_approval?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          waiter_change_requires_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_service_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_mode: string
          canceled_at: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          delinquency_level: string | null
          delinquency_stage: string | null
          delinquent_since: string | null
          external_subscription_id: string | null
          id: string
          last_payment_at: string | null
          last_payment_attempt_at: string | null
          monthly_amount: number | null
          notes: string | null
          partner_plan_id: string | null
          partner_tenant_id: string | null
          payment_attempts: number | null
          payment_provider: string | null
          status: string
          tenant_id: string
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          billing_mode?: string
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          delinquency_level?: string | null
          delinquency_stage?: string | null
          delinquent_since?: string | null
          external_subscription_id?: string | null
          id?: string
          last_payment_at?: string | null
          last_payment_attempt_at?: string | null
          monthly_amount?: number | null
          notes?: string | null
          partner_plan_id?: string | null
          partner_tenant_id?: string | null
          payment_attempts?: number | null
          payment_provider?: string | null
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_mode?: string
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          delinquency_level?: string | null
          delinquency_stage?: string | null
          delinquent_since?: string | null
          external_subscription_id?: string | null
          id?: string
          last_payment_at?: string | null
          last_payment_attempt_at?: string | null
          monthly_amount?: number | null
          notes?: string | null
          partner_plan_id?: string | null
          partner_tenant_id?: string | null
          payment_attempts?: number | null
          payment_provider?: string | null
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_partner_plan_id_fkey"
            columns: ["partner_plan_id"]
            isOneToOne: false
            referencedRelation: "partner_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_partner_tenant_id_fkey"
            columns: ["partner_tenant_id"]
            isOneToOne: false
            referencedRelation: "partner_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          business_category: string | null
          city: string | null
          created_at: string | null
          email: string | null
          fallback_to_manual: boolean | null
          hide_from_public_listing: boolean | null
          id: string
          in_person_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          is_active: boolean | null
          last_payment_at: string | null
          last_payment_method: string | null
          last_payment_provider: string | null
          last_payment_status: string | null
          logo_url: string | null
          name: string
          online_gateway_card: boolean | null
          online_gateway_enabled: boolean | null
          online_gateway_pix: boolean | null
          phone: string | null
          pos_allow_cashier_mode_change: boolean | null
          pos_display_mode: string | null
          slug: string
          state: string | null
          subscription_current_period_end: string | null
          subscription_current_period_start: string | null
          subscription_plan_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          whatsapp_number: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          business_category?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          fallback_to_manual?: boolean | null
          hide_from_public_listing?: boolean | null
          id?: string
          in_person_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          is_active?: boolean | null
          last_payment_at?: string | null
          last_payment_method?: string | null
          last_payment_provider?: string | null
          last_payment_status?: string | null
          logo_url?: string | null
          name: string
          online_gateway_card?: boolean | null
          online_gateway_enabled?: boolean | null
          online_gateway_pix?: boolean | null
          phone?: string | null
          pos_allow_cashier_mode_change?: boolean | null
          pos_display_mode?: string | null
          slug: string
          state?: string | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          business_category?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          fallback_to_manual?: boolean | null
          hide_from_public_listing?: boolean | null
          id?: string
          in_person_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          is_active?: boolean | null
          last_payment_at?: string | null
          last_payment_method?: string | null
          last_payment_provider?: string | null
          last_payment_status?: string | null
          logo_url?: string | null
          name?: string
          online_gateway_card?: boolean | null
          online_gateway_enabled?: boolean | null
          online_gateway_pix?: boolean | null
          phone?: string | null
          pos_allow_cashier_mode_change?: boolean | null
          pos_display_mode?: string | null
          slug?: string
          state?: string | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          customer_id: string | null
          event_id: string
          id: string
          payment_id: string | null
          price_paid: number
          refund_amount: number | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          tenant_id: string
          ticket_code: string
          ticket_type: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          event_id: string
          id?: string
          payment_id?: string | null
          price_paid: number
          refund_amount?: number | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tenant_id: string
          ticket_code: string
          ticket_type?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          event_id?: string
          id?: string
          payment_id?: string | null
          price_paid?: number
          refund_amount?: number | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tenant_id?: string
          ticket_code?: string
          ticket_type?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_registrations_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_effects: {
        Row: {
          amount: number
          created_at: string
          direction: string
          id: string
          metadata: Json | null
          reason: string
          source_event_id: string
          target: string
          target_record_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          direction: string
          id?: string
          metadata?: Json | null
          reason: string
          source_event_id: string
          target: string
          target_record_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json | null
          reason?: string
          source_event_id?: string
          target?: string
          target_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_effects_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "payment_events"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_effects_archive: {
        Row: {
          amount: number | null
          archived_at: string | null
          created_at: string | null
          direction: string | null
          id: string
          metadata: Json | null
          reason: string | null
          source_event_id: string | null
          target: string | null
          target_record_id: string | null
        }
        Insert: {
          amount?: number | null
          archived_at?: string | null
          created_at?: string | null
          direction?: string | null
          id: string
          metadata?: Json | null
          reason?: string | null
          source_event_id?: string | null
          target?: string | null
          target_record_id?: string | null
        }
        Update: {
          amount?: number | null
          archived_at?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          source_event_id?: string | null
          target?: string | null
          target_record_id?: string | null
        }
        Relationships: []
      }
      trial_conversion_metrics: {
        Row: {
          avg_days_to_convert: number | null
          conversion_rate: number | null
          created_at: string
          date: string
          id: string
          metadata: Json | null
          top_churn_reasons: string[] | null
          top_conversion_features: string[] | null
          trials_active: number | null
          trials_converted: number | null
          trials_expired: number | null
          trials_started: number | null
        }
        Insert: {
          avg_days_to_convert?: number | null
          conversion_rate?: number | null
          created_at?: string
          date: string
          id?: string
          metadata?: Json | null
          top_churn_reasons?: string[] | null
          top_conversion_features?: string[] | null
          trials_active?: number | null
          trials_converted?: number | null
          trials_expired?: number | null
          trials_started?: number | null
        }
        Update: {
          avg_days_to_convert?: number | null
          conversion_rate?: number | null
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          top_churn_reasons?: string[] | null
          top_conversion_features?: string[] | null
          trials_active?: number | null
          trials_converted?: number | null
          trials_expired?: number | null
          trials_started?: number | null
        }
        Relationships: []
      }
      trial_events: {
        Row: {
          created_at: string
          event_type: string
          feature_key: string | null
          id: string
          limit_value: number | null
          metadata: Json | null
          percentage_used: number | null
          tenant_id: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          feature_key?: string | null
          id?: string
          limit_value?: number | null
          metadata?: Json | null
          percentage_used?: number | null
          tenant_id: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          feature_key?: string | null
          id?: string
          limit_value?: number | null
          metadata?: Json | null
          percentage_used?: number | null
          tenant_id?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          trial_end_date: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          trial_end_date: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          trial_end_date?: string
          user_id?: string
        }
        Relationships: []
      }
      upsell_events: {
        Row: {
          conversion_value: number | null
          created_at: string
          dedupe_key: string | null
          display_context: string | null
          event_type: string
          id: string
          offer_type: string | null
          offer_value: Json | null
          rule_id: string | null
          tenant_id: string
          user_response: string | null
        }
        Insert: {
          conversion_value?: number | null
          created_at?: string
          dedupe_key?: string | null
          display_context?: string | null
          event_type: string
          id?: string
          offer_type?: string | null
          offer_value?: Json | null
          rule_id?: string | null
          tenant_id: string
          user_response?: string | null
        }
        Update: {
          conversion_value?: number | null
          created_at?: string
          dedupe_key?: string | null
          display_context?: string | null
          event_type?: string
          id?: string
          offer_type?: string | null
          offer_value?: Json | null
          rule_id?: string | null
          tenant_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upsell_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "upsell_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_rules: {
        Row: {
          cooldown_hours: number | null
          created_at: string
          description: string | null
          display_type: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_displays: number | null
          name: string
          offer_config: Json
          offer_type: string
          priority: number | null
          start_date: string | null
          target_audience: string | null
          trigger_condition: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          cooldown_hours?: number | null
          created_at?: string
          description?: string | null
          display_type?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_displays?: number | null
          name: string
          offer_config: Json
          offer_type: string
          priority?: number | null
          start_date?: string | null
          target_audience?: string | null
          trigger_condition: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          cooldown_hours?: number | null
          created_at?: string
          description?: string | null
          display_type?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_displays?: number | null
          name?: string
          offer_config?: Json
          offer_type?: string
          priority?: number | null
          start_date?: string | null
          target_audience?: string | null
          trigger_condition?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_enforcement_log: {
        Row: {
          action_taken: string
          created_at: string
          current_usage: number | null
          enforcement_level: string
          feature_key: string
          grace_expires_at: string | null
          id: string
          limit_value: number | null
          metadata: Json | null
          percentage_used: number | null
          resolved_at: string | null
          resolved_by: string | null
          tenant_id: string
          user_notified: boolean | null
        }
        Insert: {
          action_taken: string
          created_at?: string
          current_usage?: number | null
          enforcement_level: string
          feature_key: string
          grace_expires_at?: string | null
          id?: string
          limit_value?: number | null
          metadata?: Json | null
          percentage_used?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id: string
          user_notified?: boolean | null
        }
        Update: {
          action_taken?: string
          created_at?: string
          current_usage?: number | null
          enforcement_level?: string
          feature_key?: string
          grace_expires_at?: string | null
          id?: string
          limit_value?: number | null
          metadata?: Json | null
          percentage_used?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          tenant_id?: string
          user_notified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_enforcement_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_soft_limits: {
        Row: {
          created_at: string
          feature_key: string
          grace_period_hours: number | null
          hard_limit_action: string | null
          hard_limit_threshold: number | null
          id: string
          is_active: boolean | null
          plan_id: string | null
          soft_limit_action: string | null
          soft_limit_threshold: number | null
          updated_at: string
          warn_action: string | null
          warn_threshold: number | null
        }
        Insert: {
          created_at?: string
          feature_key: string
          grace_period_hours?: number | null
          hard_limit_action?: string | null
          hard_limit_threshold?: number | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          soft_limit_action?: string | null
          soft_limit_threshold?: number | null
          updated_at?: string
          warn_action?: string | null
          warn_threshold?: number | null
        }
        Update: {
          created_at?: string
          feature_key?: string
          grace_period_hours?: number | null
          hard_limit_action?: string | null
          hard_limit_threshold?: number | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          soft_limit_action?: string | null
          soft_limit_threshold?: number | null
          updated_at?: string
          warn_action?: string | null
          warn_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_soft_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_commission_config: {
        Row: {
          base_percent: number | null
          category_rates: Json | null
          commission_trigger:
            | Database["public"]["Enums"]["commission_trigger"]
            | null
          created_at: string | null
          fixed_amount: number | null
          id: string
          is_enabled: boolean | null
          split_mode: string | null
          store_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          base_percent?: number | null
          category_rates?: Json | null
          commission_trigger?:
            | Database["public"]["Enums"]["commission_trigger"]
            | null
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_enabled?: boolean | null
          split_mode?: string | null
          store_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          base_percent?: number | null
          category_rates?: Json | null
          commission_trigger?:
            | Database["public"]["Enums"]["commission_trigger"]
            | null
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_enabled?: boolean | null
          split_mode?: string | null
          store_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiter_commission_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_commission_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_commissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          comanda_id: string | null
          commission_amount: number
          commission_percent: number | null
          created_at: string | null
          id: string
          is_split: boolean | null
          order_id: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          split_percent: number | null
          split_with: string[] | null
          status: string | null
          tenant_id: string
          trigger_type: Database["public"]["Enums"]["commission_trigger"]
          waiter_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount: number
          comanda_id?: string | null
          commission_amount: number
          commission_percent?: number | null
          created_at?: string | null
          id?: string
          is_split?: boolean | null
          order_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          split_percent?: number | null
          split_with?: string[] | null
          status?: string | null
          tenant_id: string
          trigger_type: Database["public"]["Enums"]["commission_trigger"]
          waiter_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          comanda_id?: string | null
          commission_amount?: number
          commission_percent?: number | null
          created_at?: string | null
          id?: string
          is_split?: boolean | null
          order_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          split_percent?: number | null
          split_with?: string[] | null
          status?: string | null
          tenant_id?: string
          trigger_type?: Database["public"]["Enums"]["commission_trigger"]
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_commissions_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_commissions_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_performance: {
        Row: {
          avg_delivery_time: number | null
          avg_response_time: number | null
          bills_closed: number | null
          calls_escalated: number | null
          calls_ignored: number | null
          calls_received: number | null
          calls_resolved: number | null
          created_at: string | null
          id: string
          orders_delivered: number | null
          orders_taken: number | null
          payments_received: number | null
          performance_score: number | null
          period_date: string
          period_type: string | null
          tenant_id: string
          total_commissions: number | null
          total_sales: number | null
          updated_at: string | null
          waiter_id: string
        }
        Insert: {
          avg_delivery_time?: number | null
          avg_response_time?: number | null
          bills_closed?: number | null
          calls_escalated?: number | null
          calls_ignored?: number | null
          calls_received?: number | null
          calls_resolved?: number | null
          created_at?: string | null
          id?: string
          orders_delivered?: number | null
          orders_taken?: number | null
          payments_received?: number | null
          performance_score?: number | null
          period_date: string
          period_type?: string | null
          tenant_id: string
          total_commissions?: number | null
          total_sales?: number | null
          updated_at?: string | null
          waiter_id: string
        }
        Update: {
          avg_delivery_time?: number | null
          avg_response_time?: number | null
          bills_closed?: number | null
          calls_escalated?: number | null
          calls_ignored?: number | null
          calls_received?: number | null
          calls_resolved?: number | null
          created_at?: string | null
          id?: string
          orders_delivered?: number | null
          orders_taken?: number | null
          payments_received?: number | null
          performance_score?: number | null
          period_date?: string
          period_type?: string | null
          tenant_id?: string
          total_commissions?: number | null
          total_sales?: number | null
          updated_at?: string | null
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_performance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_performance_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_unmatched_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          gateway: string
          gateway_customer_id: string | null
          gateway_payment_id: string | null
          id: string
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          gateway: string
          gateway_customer_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          gateway?: string
          gateway_customer_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_registrations_safe: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          registration_type:
            | Database["public"]["Enums"]["customer_registration_type"]
            | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          registration_type?:
            | Database["public"]["Enums"]["customer_registration_type"]
            | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          registration_type?:
            | Database["public"]["Enums"]["customer_registration_type"]
            | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_orders_kitchen: {
        Row: {
          created_at: string | null
          id: string | null
          ifood_order_id: string | null
          ifood_short_id: string | null
          items: Json | null
          scheduled_to: string | null
          status: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal: number | null
          tenant_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          ifood_order_id?: string | null
          ifood_short_id?: string | null
          items?: Json | null
          scheduled_to?: string | null
          status?: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          ifood_order_id?: string | null
          ifood_short_id?: string | null
          items?: Json | null
          scheduled_to?: string | null
          status?: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ifood_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_orders_safe: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          discount: number | null
          id: string | null
          ifood_order_id: string | null
          ifood_short_id: string | null
          items: Json | null
          order_id: string | null
          payment_method: string | null
          raw_data: Json | null
          scheduled_to: string | null
          status: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal: number | null
          tenant_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: never
          customer_phone?: never
          delivery_address?: never
          delivery_fee?: number | null
          discount?: number | null
          id?: string | null
          ifood_order_id?: string | null
          ifood_short_id?: string | null
          items?: Json | null
          order_id?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          scheduled_to?: string | null
          status?: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: never
          customer_phone?: never
          delivery_address?: never
          delivery_fee?: number | null
          discount?: number | null
          id?: string | null
          ifood_order_id?: string | null
          ifood_short_id?: string | null
          items?: Json | null
          order_id?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          scheduled_to?: string | null
          status?: Database["public"]["Enums"]["ifood_order_status"] | null
          subtotal?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ifood_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifood_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_safe: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_neighborhood: string | null
          delivery_zip_code: string | null
          discount: number | null
          estimated_time_minutes: number | null
          id: string | null
          is_delivery: boolean | null
          marketplace_order_id: string | null
          notes: string | null
          order_number: number | null
          origin: Database["public"]["Enums"]["order_origin"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tenant_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: never
          customer_name?: never
          customer_phone?: never
          delivery_address?: never
          delivery_city?: never
          delivery_fee?: number | null
          delivery_instructions?: never
          delivery_neighborhood?: never
          delivery_zip_code?: never
          discount?: number | null
          estimated_time_minutes?: number | null
          id?: string | null
          is_delivery?: boolean | null
          marketplace_order_id?: string | null
          notes?: string | null
          order_number?: number | null
          origin?: Database["public"]["Enums"]["order_origin"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: never
          customer_name?: never
          customer_phone?: never
          delivery_address?: never
          delivery_city?: never
          delivery_fee?: number | null
          delivery_instructions?: never
          delivery_neighborhood?: never
          delivery_zip_code?: never
          discount?: number | null
          estimated_time_minutes?: number | null
          id?: string | null
          is_delivery?: boolean | null
          marketplace_order_id?: string | null
          notes?: string | null
          order_number?: number | null
          origin?: Database["public"]["Enums"]["order_origin"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tenant_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_overdue_invoices: {
        Row: {
          amount: number | null
          billing_type: string | null
          canceled_at: string | null
          created_at: string | null
          currency: string | null
          days_overdue: number | null
          description: string | null
          due_date: string | null
          gateway_invoice_url: string | null
          gateway_payment_id: string | null
          id: string | null
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string | null
          partner_name: string | null
          partner_plan_id: string | null
          payment_provider: string | null
          plan_name: string | null
          status: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_subscription_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partner_financial_kpis"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_plan_id_fkey"
            columns: ["partner_plan_id"]
            isOneToOne: false
            referencedRelation: "partner_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_tenant_subscription_id_fkey"
            columns: ["tenant_subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events_all: {
        Row: {
          amount_gross: number | null
          amount_net: number | null
          applied_at: string | null
          correlation_id: string | null
          created_at: string | null
          currency: string | null
          error_message: string | null
          event_type: string | null
          id: string | null
          is_archived: boolean | null
          occurred_at: string | null
          partner_id: string | null
          payload: Json | null
          payment_method: string | null
          provider: string | null
          provider_event_id: string | null
          provider_payment_id: string | null
          received_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      products_pricing_safe: {
        Row: {
          base_price: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          has_addons: boolean | null
          has_variations: boolean | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          is_combo: boolean | null
          name: string | null
          sku: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: never
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_addons?: boolean | null
          has_variations?: boolean | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_combo?: boolean | null
          name?: string | null
          sku?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: never
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_addons?: boolean | null
          has_variations?: boolean | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_combo?: boolean | null
          name?: string | null
          sku?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          phone: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          phone?: never
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          phone?: never
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules_detailed: {
        Row: {
          addon_module_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          billing_mode: string | null
          expires_at: string | null
          id: string | null
          is_free: boolean | null
          module_category:
            | Database["public"]["Enums"]["addon_module_category"]
            | null
          module_description: string | null
          module_features: Json | null
          module_icon: string | null
          module_name: string | null
          module_price: number | null
          module_slug: string | null
          next_billing_date: string | null
          plan_name: string | null
          price_paid: number | null
          purchased_at: string | null
          source: string | null
          started_at: string | null
          status:
            | Database["public"]["Enums"]["addon_subscription_status"]
            | null
          stripe_subscription_id: string | null
          subscription_plan_id: string | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_addon_subscriptions_addon_module_id_fkey"
            columns: ["addon_module_id"]
            isOneToOne: false
            referencedRelation: "addon_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_addon_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_effects_all: {
        Row: {
          amount: number | null
          created_at: string | null
          direction: string | null
          id: string | null
          is_archived: boolean | null
          metadata: Json | null
          reason: string | null
          source_event_id: string | null
          target: string | null
          target_record_id: string | null
        }
        Relationships: []
      }
      v_ops_backoffice_summary: {
        Row: {
          critical_alerts_open: number | null
          disputes_open: number | null
          events_last_24h: number | null
          events_last_hour: number | null
          high_risk_fraud_flags: number | null
          payouts_failed: number | null
          payouts_pending: number | null
          recommendations_pending: number | null
          reconciliation_mismatches: number | null
          total_alerts_open: number | null
        }
        Relationships: []
      }
      v_partner_financial_kpis: {
        Row: {
          confirmed_payments: number | null
          open_disputes: number | null
          partner_id: string | null
          partner_name: string | null
          period_day: string | null
          period_month: string | null
          period_week: string | null
          platform_fees: number | null
          refunds_chargebacks: number | null
          total_credited: number | null
          total_debited: number | null
          total_events: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_partner_tenant_subscription: {
        Args: {
          p_gateway_payment_id?: string
          p_payment_provider?: string
          p_tenant_subscription_id: string
        }
        Returns: Json
      }
      apply_coupon_to_next_invoice: {
        Args: { p_code: string; p_tenant_id: string }
        Returns: string
      }
      apply_dunning_policy: { Args: { p_tenant_id: string }; Returns: Json }
      apply_ops_recommendation: {
        Args: { p_actor_id?: string; p_recommendation_id: string }
        Returns: Json
      }
      apply_payment_event: { Args: { p_event_id: string }; Returns: Json }
      apply_retention_policy: {
        Args: never
        Returns: {
          archived: number
          deleted: number
          table_name: string
        }[]
      }
      archive_ledger: { Args: { before_date?: string }; Returns: Json }
      assert_partner_ready_for: {
        Args: { p_action: string; p_partner_id: string }
        Returns: Json
      }
      assert_partner_scope: {
        Args: { p_actor_id: string; p_partner_id: string }
        Returns: boolean
      }
      assert_tenant_scope: {
        Args: { p_actor_id: string; p_tenant_id: string }
        Returns: boolean
      }
      calculate_daily_kpis: { Args: { p_date?: string }; Returns: string }
      calculate_partner_transaction_fee: {
        Args: {
          p_gross_amount: number
          p_partner_id: string
          p_payment_method: string
          p_tenant_id: string
        }
        Returns: Json
      }
      calculate_platform_fee: {
        Args: {
          p_amount: number
          p_payment_method: string
          p_tenant_id: string
        }
        Returns: Json
      }
      calculate_proration: {
        Args: { p_new_plan_id: string; p_tenant_id: string }
        Returns: {
          days_in_cycle: number
          days_remaining: number
          from_amount: number
          from_plan_id: string
          from_plan_name: string
          net_amount: number
          proration_charge: number
          proration_credit: number
          to_amount: number
          to_plan_id: string
          to_plan_name: string
        }[]
      }
      can_create_branch: { Args: { p_tenant_id: string }; Returns: boolean }
      cancel_tenant_addon_subscription: {
        Args: { p_reason?: string; p_subscription_id: string }
        Returns: boolean
      }
      change_tenant_plan_with_proration: {
        Args: {
          p_new_plan_id: string
          p_tenant_id: string
          p_waive_proration?: boolean
        }
        Returns: string
      }
      check_entitlement: {
        Args: { p_key: string; p_requested_value?: number; p_tenant_id: string }
        Returns: {
          allowed: boolean
          current_value: Json
          reason: string
        }[]
      }
      check_module_limit: {
        Args: {
          p_limit_key: string
          p_module_slug: string
          p_tenant_id: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: Json
      }
      check_tenant_subscription_access: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: Json
      }
      check_usage_limit: {
        Args: {
          p_current_usage: number
          p_feature_key: string
          p_tenant_id: string
        }
        Returns: {
          action_required: string
          enforcement_level: string
          message: string
          percentage_used: number
        }[]
      }
      complete_partner_registration: {
        Args: {
          p_email: string
          p_name: string
          p_phone?: string
          p_slug: string
          p_user_id: string
        }
        Returns: Json
      }
      complete_payout_job: {
        Args: {
          p_error?: string
          p_job_id: string
          p_provider_transfer_id?: string
          p_success: boolean
        }
        Returns: Json
      }
      compute_ops_metrics: { Args: { p_date?: string }; Returns: Json }
      create_or_update_billing_profile: {
        Args: {
          p_billing_doc?: string
          p_billing_email?: string
          p_billing_name?: string
          p_billing_phone?: string
          p_provider_customer_id?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      create_partner_account: {
        Args: {
          p_email: string
          p_name: string
          p_password: string
          p_phone?: string
        }
        Returns: Json
      }
      create_partner_addon: {
        Args: {
          p_amount?: number
          p_billing_period?: string
          p_description?: string
          p_module_key?: string
          p_name: string
          p_partner_id: string
          p_pricing_type?: string
        }
        Returns: string
      }
      create_provider_charge_v2: {
        Args: {
          p_amount: number
          p_description?: string
          p_metadata?: Json
          p_tenant_id: string
        }
        Returns: Json
      }
      create_subscription_invoice: {
        Args: {
          p_amount: number
          p_due_date: string
          p_idempotency_key?: string
          p_period_end: string
          p_period_start: string
          p_subscription_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      detect_fraud_signals: {
        Args: { p_lookback_days?: number; p_partner_id: string }
        Returns: Json
      }
      emit_billing_notifications: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: {
          enqueued: number
          skipped: number
        }[]
      }
      enqueue_apply_event: { Args: { p_event_id: string }; Returns: Json }
      enqueue_notification: {
        Args: {
          p_channel: Database["public"]["Enums"]["notification_channel"]
          p_dedupe_key?: string
          p_event_id?: string
          p_invoice_id?: string
          p_partner_id: string
          p_payload: Json
          p_template_key: string
          p_tenant_id: string
          p_to_address: string
        }
        Returns: string
      }
      enqueue_payout_job: {
        Args: {
          p_amount?: number
          p_partner_id: string
          p_settlement_id?: string
        }
        Returns: Json
      }
      ensure_headquarters_store: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      execute_partner_payout: {
        Args: {
          p_payout_method?: string
          p_provider_reference?: string
          p_settlement_id: string
        }
        Returns: Json
      }
      execute_partner_payout_v2: {
        Args: {
          p_external_reference?: string
          p_payment_method?: string
          p_settlement_id: string
        }
        Returns: Json
      }
      force_sync_tenant_modules: {
        Args: { p_tenant_id: string }
        Returns: {
          action_taken: string
          details: string
          module_name: string
        }[]
      }
      generate_operational_alerts: { Args: never; Returns: Json }
      generate_ops_recommendations: { Args: never; Returns: number }
      generate_partner_settlement: {
        Args: {
          p_partner_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      generate_unique_code: { Args: { prefix?: string }; Returns: string }
      get_active_payment_gateways: {
        Args: never
        Returns: {
          config: Json
          id: string
          is_default: boolean
          name: string
          provider: string
        }[]
      }
      get_billing_ops_overview: { Args: never; Returns: Json }
      get_billing_settings: {
        Args: never
        Returns: {
          invoice_show_breakdown: boolean
          modules_billing_mode: string
          proration_enabled: boolean
        }[]
      }
      get_feature_flag: { Args: { p_flag_key: string }; Returns: boolean }
      get_ifood_integration_safe: {
        Args: { p_tenant_id: string }
        Returns: {
          auto_accept_orders: boolean
          created_at: string
          credentials_configured: boolean
          has_valid_token: boolean
          id: string
          is_active: boolean
          merchant_id: string
          sync_menu: boolean
          tenant_id: string
          updated_at: string
        }[]
      }
      get_multi_store_quota: {
        Args: { p_tenant_id: string }
        Returns: {
          available: number
          quota: number
          used: number
        }[]
      }
      get_partner_by_domain: {
        Args: { p_domain: string }
        Returns: {
          branding: Json
          domain_type: string
          is_published: boolean
          is_suspended: boolean
          marketing_page: Json
          partner_id: string
          partner_name: string
          partner_slug: string
        }[]
      }
      get_partner_financial_summary: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      get_partner_for_tenant: { Args: { p_tenant_id: string }; Returns: string }
      get_partner_guides: { Args: { p_category?: string }; Returns: Json }
      get_partner_leads: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_partner_id: string
          p_status?: string
        }
        Returns: Json
      }
      get_partner_onboarding_progress: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      get_partner_onboarding_status: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      get_partner_policy: {
        Args: { p_partner_id: string }
        Returns: {
          allow_free_plan: boolean
          allow_offline_billing: boolean
          allowed_features_catalog: string[] | null
          allowed_modules_catalog: string[] | null
          created_at: string
          free_plan_constraints: Json | null
          free_plan_max_features: number
          free_plan_max_modules: number
          id: string
          max_boleto_fee_fixed: number | null
          max_credit_fee_percent: number | null
          max_debit_fee_percent: number | null
          max_features_per_plan: number
          max_modules_per_plan: number
          max_pix_fee_percent: number | null
          max_plans_per_partner: number
          max_platform_fee_fixed: number | null
          max_platform_fee_percent: number | null
          max_trial_days_allowed: number
          min_paid_plan_price: number
          partner_id: string | null
          require_plan_hierarchy: boolean
          trial_allowed_features: string[] | null
          trial_allowed_modules: string[] | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_policies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_partner_publication_status: {
        Args: { p_partner_id: string }
        Returns: {
          app_domain: string
          app_domain_verified: boolean
          has_branding: boolean
          has_marketing_page: boolean
          is_published: boolean
          marketing_domain: string
          marketing_domain_verified: boolean
          published_at: string
        }[]
      }
      get_partner_seo_by_domain: {
        Args: { p_domain: string }
        Returns: {
          canonical_domain: string
          default_description: string
          default_title: string
          domain_type: string
          favicon_url: string
          is_published: boolean
          logo_url: string
          og_image_url: string
          partner_id: string
          partner_name: string
          partner_slug: string
          schema_org: Json
          seo_keywords: string[]
          site_name: string
        }[]
      }
      get_partner_sitemap_pages: {
        Args: { p_partner_id: string }
        Returns: {
          lastmod: string
          path: string
          sitemap_changefreq: string
          sitemap_priority: number
        }[]
      }
      get_partners_payment_status: { Args: never; Returns: Json }
      get_pending_payout_jobs: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      get_plan_addon_modules: {
        Args: { p_plan_id: string }
        Returns: {
          addon_module_id: string
          addon_name: string
          addon_slug: string
        }[]
      }
      get_public_addon_modules: {
        Args: never
        Returns: {
          category: string
          currency: string
          description: string
          display_order: number
          features: Json
          icon: string
          id: string
          monthly_price: number
          name: string
          slug: string
        }[]
      }
      get_public_business_categories: {
        Args: never
        Returns: {
          category_key: string
          description: string
          display_order: number
          icon: string
          id: string
          name: string
        }[]
      }
      get_public_categories: {
        Args: { p_tenant_id: string }
        Returns: {
          category_display_order: number
          category_id: string
          category_name: string
        }[]
      }
      get_public_menu: {
        Args: { p_tenant_id: string }
        Returns: {
          product_base_price: number
          product_category_id: string
          product_category_name: string
          product_description: string
          product_display_order: number
          product_has_variations: boolean
          product_id: string
          product_image_url: string
          product_name: string
          tenant_id: string
          tenant_logo_url: string
          tenant_name: string
          tenant_whatsapp: string
        }[]
      }
      get_public_order_history: {
        Args: { p_order_id: string }
        Returns: {
          created_at: string
          id: string
          notes: string
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      get_public_order_tracking: {
        Args: { p_order_number: number; p_tenant_id?: string }
        Returns: {
          created_at: string
          estimated_time_minutes: number
          id: string
          is_delivery: boolean
          order_number: number
          origin: Database["public"]["Enums"]["order_origin"]
          status: Database["public"]["Enums"]["order_status"]
          tenant_logo_url: string
          tenant_name: string
          total: number
          updated_at: string
        }[]
      }
      get_public_partner_plans: {
        Args: { p_partner_id: string }
        Returns: {
          currency: string
          description: string
          display_order: number
          id: string
          included_features: string[]
          included_modules: string[]
          is_free: boolean
          max_orders_per_month: number
          max_products: number
          max_users: number
          monthly_price: number
          name: string
          slug: string
          trial_days: number
        }[]
      }
      get_public_partner_profile: { Args: { p_slug: string }; Returns: Json }
      get_public_product_variations: {
        Args: { p_product_ids: string[] }
        Returns: {
          price_modifier: number
          product_id: string
          variation_id: string
          variation_name: string
        }[]
      }
      get_public_settings: {
        Args: never
        Returns: {
          setting_key: string
          setting_value: Json
        }[]
      }
      get_public_subscribers: {
        Args: never
        Returns: {
          category_name: string
          city: string
          id: string
          logo_url: string
          name: string
          state: string
        }[]
      }
      get_public_subscription_plans: {
        Args: never
        Returns: {
          currency: string
          description: string
          display_order: number
          feature_ai_forecast: boolean
          feature_api_access: boolean
          feature_cmv_reports: boolean
          feature_courier_app: boolean
          feature_custom_integrations: boolean
          feature_delivery_management: boolean
          feature_goal_notifications: boolean
          feature_kitchen_display: boolean
          feature_multi_branch: boolean
          feature_pos: boolean
          feature_priority_support: boolean
          feature_public_menu: boolean
          feature_reports_advanced: boolean
          feature_reports_basic: boolean
          feature_stock_control: boolean
          feature_white_label: boolean
          id: string
          max_orders_per_month: number
          max_products: number
          max_users: number
          monthly_price: number
          name: string
          slug: string
        }[]
      }
      get_tenant_billing_summary: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_user_active_store: { Args: { p_user_id: string }; Returns: string }
      get_user_allowed_stores: {
        Args: { _user_id: string }
        Returns: {
          access_level: string
          is_active: boolean
          is_headquarters: boolean
          store_code: string
          store_id: string
          store_name: string
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      handle_billing_event_from_ssot: {
        Args: { p_event_id: string }
        Returns: Json
      }
      has_accepted_current_terms: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      housekeeping_all: {
        Args: { p_archive_before_days?: number; p_log_retention_days?: number }
        Returns: Json
      }
      increment_module_usage: {
        Args: {
          p_module_slug: string
          p_tenant_id: string
          p_usage_key: string
        }
        Returns: Json
      }
      initialize_tenant_seo_settings: {
        Args: { p_domain_id?: string; p_tenant_id: string }
        Returns: string
      }
      insert_payment_event: {
        Args: {
          p_amount_gross: number
          p_event_type: string
          p_occurred_at: string
          p_partner_id: string
          p_payload: Json
          p_payment_method: string
          p_provider: string
          p_provider_event_id: string
          p_provider_payment_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      is_assigned_courier: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_partner_admin: {
        Args: { _partner_id: string; _user_id: string }
        Returns: boolean
      }
      link_invoice_to_provider: {
        Args: {
          p_invoice_id: string
          p_provider_payment_id: string
          p_provider_payment_url?: string
        }
        Returns: Json
      }
      list_available_addons_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: {
          amount: number
          billing_period: string
          currency: string
          description: string
          id: string
          is_subscribed: boolean
          name: string
          pricing_type: string
        }[]
      }
      list_partner_addons: {
        Args: { p_partner_id: string }
        Returns: {
          amount: number
          billing_period: string
          currency: string
          description: string
          id: string
          is_active: boolean
          module_key: string
          name: string
          pricing_type: string
          subscribers_count: number
        }[]
      }
      list_tenant_addon_subscriptions: {
        Args: { p_tenant_id: string }
        Returns: {
          addon_description: string
          addon_id: string
          addon_name: string
          amount: number
          end_at: string
          id: string
          pricing_type: string
          start_at: string
          status: string
        }[]
      }
      log_comanda_action: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_name?: string
          p_actor_type: string
          p_comanda_id: string
          p_details?: Json
        }
        Returns: string
      }
      log_sensitive_action: {
        Args: {
          p_action: string
          p_new_value?: Json
          p_old_value?: Json
          p_reason?: string
          p_risk_level?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      manage_push_subscription: {
        Args: {
          p_action: string
          p_auth?: string
          p_endpoint: string
          p_order_id?: string
          p_p256dh?: string
        }
        Returns: Json
      }
      map_asaas_event_type: { Args: { p_event: string }; Returns: string }
      mark_notification_delivery: {
        Args: {
          p_outbox_id: string
          p_provider: string
          p_provider_message_id: string
          p_raw?: Json
          p_status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Returns: string
      }
      mark_payout_job_processing: { Args: { p_job_id: string }; Returns: Json }
      preview_notification: {
        Args: {
          p_channel: Database["public"]["Enums"]["notification_channel"]
          p_partner_id: string
          p_payload?: Json
          p_template_key: string
        }
        Returns: {
          body: string
          is_default: boolean
          rendered_body: string
          rendered_subject: string
          subject: string
          template_id: string
        }[]
      }
      process_apply_queue: {
        Args: { p_batch_size?: number; p_worker_id?: string }
        Returns: Json
      }
      process_notification_outbox: {
        Args: { p_batch_size?: number }
        Returns: {
          dead: number
          failed: number
          processed: number
          sent: number
        }[]
      }
      process_partner_invoice_payment: {
        Args: {
          p_billing_type?: string
          p_gateway_payment_id?: string
          p_invoice_id: string
          p_payment_provider: string
        }
        Returns: Json
      }
      publish_partner_landing: {
        Args: { p_partner_id: string; p_publish: boolean }
        Returns: boolean
      }
      reactivate_on_payment: {
        Args: { p_invoice_id?: string; p_tenant_id: string }
        Returns: Json
      }
      rebuild_tenant_entitlements: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      reconcile_provider_payments: {
        Args: { p_from_date?: string; p_provider?: string }
        Returns: Json
      }
      reconcile_provider_payments_v2: {
        Args: {
          p_partner_id?: string
          p_period_end?: string
          p_period_start?: string
          p_status?: string
          p_tenant_id?: string
        }
        Returns: {
          difference: number
          internal_amount: number
          issue_type: string
          provider: string
          provider_amount: number
          provider_payment_id: string
          reconciliation_id: string
          status: string
        }[]
      }
      record_ledger_entry: {
        Args: {
          p_amount: number
          p_entry_type: string
          p_gateway_provider?: string
          p_metadata?: Json
          p_order_id: string
          p_payment_method?: string
          p_tenant_id: string
          p_transaction_id: string
        }
        Returns: string
      }
      record_partner_transaction: {
        Args: {
          p_external_payment_id?: string
          p_gross_amount: number
          p_order_id: string
          p_partner_id: string
          p_payment_method: string
          p_settlement_mode?: string
          p_tenant_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      record_trial_event: {
        Args: {
          p_event_type: string
          p_feature_key?: string
          p_limit_value?: number
          p_metadata?: Json
          p_tenant_id: string
          p_usage_count?: number
        }
        Returns: string
      }
      record_upsell_event: {
        Args: {
          p_dedupe_key?: string
          p_event_type: string
          p_offer_type?: string
          p_offer_value?: Json
          p_rule_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      reprocess_payment_event: { Args: { p_event_id: string }; Returns: Json }
      request_data_deletion: { Args: { p_tenant_id: string }; Returns: string }
      request_data_export: { Args: { p_tenant_id: string }; Returns: string }
      requeue_dead_notification: {
        Args: { p_outbox_id: string }
        Returns: boolean
      }
      resolve_notification_template: {
        Args: {
          p_channel: Database["public"]["Enums"]["notification_channel"]
          p_partner_id: string
          p_template_key: string
        }
        Returns: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          id: string
          is_default: boolean
          partner_id: string
          subject: string
          template_key: string
          variables: Json
        }[]
      }
      resolve_payment_context: {
        Args: { p_provider_payment_id: string }
        Returns: Json
      }
      reverse_partner_transaction: {
        Args: {
          p_external_payment_id: string
          p_reversal_reason: string
          p_reversal_type?: string
        }
        Returns: Json
      }
      rotate_logs: {
        Args: { p_archive_days?: number; p_retention_days?: number }
        Returns: Json
      }
      run_billing_cycle_cron: {
        Args: { p_target_date?: string }
        Returns: Json
      }
      run_partner_onboarding_dry_run: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      set_feature_flag: {
        Args: { p_enabled: boolean; p_flag_key: string }
        Returns: Json
      }
      start_partner_onboarding: {
        Args: { p_partner_id: string }
        Returns: Json
      }
      submit_partner_lead: {
        Args: {
          p_contact: string
          p_message?: string
          p_name: string
          p_partner_id: string
          p_source_url?: string
        }
        Returns: Json
      }
      subscribe_tenant_addon: {
        Args: { p_addon_id: string; p_tenant_id: string }
        Returns: string
      }
      sync_invoice_status_from_ssot: {
        Args: { p_provider_payment_id: string }
        Returns: Json
      }
      sync_partner_tenant_modules: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      sync_provider_transfers_status: {
        Args: { p_partner_id?: string }
        Returns: Json
      }
      sync_tenant_modules_from_plan: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      tenant_has_addon: {
        Args: { _addon_slug: string; _tenant_id: string }
        Returns: boolean
      }
      update_dispute_status: {
        Args: {
          p_actor_id?: string
          p_dispute_id: string
          p_new_status: string
          p_notes?: string
        }
        Returns: Json
      }
      update_partner_addon: {
        Args: {
          p_addon_id: string
          p_amount?: number
          p_billing_period?: string
          p_description?: string
          p_is_active?: boolean
          p_name?: string
          p_pricing_type?: string
        }
        Returns: boolean
      }
      update_partner_lead_status: {
        Args: { p_lead_id: string; p_notes?: string; p_status: string }
        Returns: Json
      }
      update_partner_onboarding_step: {
        Args: { p_partner_id: string; p_step: string; p_value: boolean }
        Returns: Json
      }
      update_partner_payment_account: {
        Args: {
          p_capabilities?: Json
          p_kyc_level?: string
          p_onboarding_url?: string
          p_partner_id: string
          p_provider_account_id?: string
          p_status?: string
          p_sync_error?: string
        }
        Returns: Json
      }
      update_provider_transfer_status: {
        Args: {
          p_error_message?: string
          p_fee?: number
          p_net_amount?: number
          p_status: string
          p_transfer_id: string
        }
        Returns: Json
      }
      upsert_dispute_from_event: {
        Args: { p_event_id: string }
        Returns: string
      }
      upsert_notification_template: {
        Args: {
          p_body: string
          p_channel: Database["public"]["Enums"]["notification_channel"]
          p_is_active?: boolean
          p_partner_id: string
          p_subject: string
          p_template_key: string
          p_variables?: Json
        }
        Returns: string
      }
      upsert_partner_settlement_config: {
        Args: {
          p_partner_id: string
          p_payout_day_of_week?: number
          p_payout_min_amount?: number
          p_payout_schedule?: string
          p_settlement_mode?: string
        }
        Returns: string
      }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_store_access: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      validate_actor_permission: {
        Args: { p_action: string; p_actor_id: string; p_scope?: string }
        Returns: {
          allowed: boolean
          reason: string
          risk_level: string
        }[]
      }
      validate_coupon: {
        Args: { p_code: string; p_tenant_id: string }
        Returns: {
          applies_to: string
          coupon_id: string
          discount_type: string
          discount_value: number
          error_message: string
          valid: boolean
        }[]
      }
      validate_financial_integrity: {
        Args: {
          p_partner_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      write_financial_audit: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_type: string
          p_after_state?: Json
          p_before_state?: Json
          p_correlation_id?: string
          p_entity_id?: string
          p_entity_type: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
      write_operational_log: {
        Args: {
          p_correlation_id?: string
          p_duration_ms?: number
          p_event_id?: string
          p_level: string
          p_message: string
          p_metadata?: Json
          p_partner_id?: string
          p_provider_payment_id?: string
          p_scope: string
          p_tenant_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      addon_module_category:
        | "integrations"
        | "operations"
        | "marketing"
        | "hardware"
        | "logistics"
        | "digital_service"
        | "payment"
        | "access_control"
      addon_subscription_status: "active" | "trial" | "suspended" | "cancelled"
      app_role:
        | "admin"
        | "manager"
        | "cashier"
        | "kitchen"
        | "stock"
        | "delivery"
        | "super_admin"
      comanda_status:
        | "open"
        | "pending_payment"
        | "paid"
        | "closed"
        | "cancelled"
      commission_trigger:
        | "order_placed"
        | "order_delivered"
        | "bill_closed"
        | "payment_received"
      customer_registration_type: "simple" | "complete"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_route"
        | "delivered"
        | "failed"
      exit_status: "pending" | "approved" | "denied"
      fraud_alert_level: "low" | "medium" | "high" | "blocked"
      ifood_order_status:
        | "PLACED"
        | "CONFIRMED"
        | "INTEGRATED"
        | "CANCELLED"
        | "PREPARATION_STARTED"
        | "READY_TO_PICKUP"
        | "DISPATCHED"
        | "DELIVERED"
        | "CONCLUDED"
      notification_channel: "email" | "whatsapp" | "inapp" | "sms"
      notification_delivery_status:
        | "accepted"
        | "delivered"
        | "bounced"
        | "complained"
        | "failed"
      notification_outbox_status:
        | "queued"
        | "sending"
        | "sent"
        | "failed"
        | "dead"
      order_origin: "online" | "pos" | "whatsapp" | "ifood" | "marketplace"
      order_status:
        | "pending_payment"
        | "paid"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      participant_role: "titular" | "guest"
      payment_method:
        | "cash"
        | "pix"
        | "credit_card"
        | "debit_card"
        | "voucher"
        | "mixed"
      payment_provider:
        | "stone_connect"
        | "stone_tef"
        | "stone_android"
        | "cielo_lio"
        | "pagbank"
        | "manual"
      payment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "refunded"
        | "cancelled"
      service_call_status:
        | "pending"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "escalated"
      service_call_type: "waiter" | "bill" | "cash_payment" | "assistance"
      stock_movement_type: "entry" | "exit" | "adjustment" | "reversal" | "loss"
      suggestion_status: "pending" | "read" | "responded" | "archived"
      ticket_status: "available" | "sold" | "used" | "cancelled" | "expired"
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
      addon_module_category: [
        "integrations",
        "operations",
        "marketing",
        "hardware",
        "logistics",
        "digital_service",
        "payment",
        "access_control",
      ],
      addon_subscription_status: ["active", "trial", "suspended", "cancelled"],
      app_role: [
        "admin",
        "manager",
        "cashier",
        "kitchen",
        "stock",
        "delivery",
        "super_admin",
      ],
      comanda_status: [
        "open",
        "pending_payment",
        "paid",
        "closed",
        "cancelled",
      ],
      commission_trigger: [
        "order_placed",
        "order_delivered",
        "bill_closed",
        "payment_received",
      ],
      customer_registration_type: ["simple", "complete"],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_route",
        "delivered",
        "failed",
      ],
      exit_status: ["pending", "approved", "denied"],
      fraud_alert_level: ["low", "medium", "high", "blocked"],
      ifood_order_status: [
        "PLACED",
        "CONFIRMED",
        "INTEGRATED",
        "CANCELLED",
        "PREPARATION_STARTED",
        "READY_TO_PICKUP",
        "DISPATCHED",
        "DELIVERED",
        "CONCLUDED",
      ],
      notification_channel: ["email", "whatsapp", "inapp", "sms"],
      notification_delivery_status: [
        "accepted",
        "delivered",
        "bounced",
        "complained",
        "failed",
      ],
      notification_outbox_status: [
        "queued",
        "sending",
        "sent",
        "failed",
        "dead",
      ],
      order_origin: ["online", "pos", "whatsapp", "ifood", "marketplace"],
      order_status: [
        "pending_payment",
        "paid",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      participant_role: ["titular", "guest"],
      payment_method: [
        "cash",
        "pix",
        "credit_card",
        "debit_card",
        "voucher",
        "mixed",
      ],
      payment_provider: [
        "stone_connect",
        "stone_tef",
        "stone_android",
        "cielo_lio",
        "pagbank",
        "manual",
      ],
      payment_status: [
        "pending",
        "approved",
        "rejected",
        "refunded",
        "cancelled",
      ],
      service_call_status: [
        "pending",
        "acknowledged",
        "in_progress",
        "resolved",
        "escalated",
      ],
      service_call_type: ["waiter", "bill", "cash_payment", "assistance"],
      stock_movement_type: ["entry", "exit", "adjustment", "reversal", "loss"],
      suggestion_status: ["pending", "read", "responded", "archived"],
      ticket_status: ["available", "sold", "used", "cancelled", "expired"],
    },
  },
} as const

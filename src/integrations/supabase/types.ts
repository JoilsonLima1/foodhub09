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
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          tenant_id: string
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          tenant_id: string
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
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
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
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
      tenant_addon_subscriptions: {
        Row: {
          addon_module_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["addon_subscription_status"]
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          addon_module_id: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["addon_subscription_status"]
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          addon_module_id?: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["addon_subscription_status"]
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
      tenants: {
        Row: {
          address: string | null
          business_category: string | null
          city: string | null
          created_at: string | null
          email: string | null
          fallback_to_manual: boolean | null
          id: string
          in_person_provider:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          is_active: boolean | null
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
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          whatsapp_number: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_category?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          fallback_to_manual?: boolean | null
          id?: string
          in_person_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          is_active?: boolean | null
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
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_category?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          fallback_to_manual?: boolean | null
          id?: string
          in_person_provider?:
            | Database["public"]["Enums"]["payment_provider"]
            | null
          is_active?: boolean | null
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
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
          zip_code?: string | null
        }
        Relationships: []
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
    }
    Views: {
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
    }
    Functions: {
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
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_courier: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
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
      tenant_has_addon: {
        Args: { _addon_slug: string; _tenant_id: string }
        Returns: boolean
      }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      addon_module_category:
        | "integrations"
        | "operations"
        | "marketing"
        | "hardware"
        | "logistics"
      addon_subscription_status: "active" | "trial" | "suspended" | "cancelled"
      app_role:
        | "admin"
        | "manager"
        | "cashier"
        | "kitchen"
        | "stock"
        | "delivery"
        | "super_admin"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_route"
        | "delivered"
        | "failed"
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
      stock_movement_type: "entry" | "exit" | "adjustment" | "reversal" | "loss"
      suggestion_status: "pending" | "read" | "responded" | "archived"
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
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_route",
        "delivered",
        "failed",
      ],
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
      stock_movement_type: ["entry", "exit", "adjustment", "reversal", "loss"],
      suggestion_status: ["pending", "read", "responded", "archived"],
    },
  },
} as const

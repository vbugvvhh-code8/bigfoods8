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
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          sent_at: string | null
          title: string
          zone: string | null
        }
        Insert: {
          audience: string
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          sent_at?: string | null
          title: string
          zone?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          sent_at?: string | null
          title?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          raised_by: string | null
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          raised_by?: string | null
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          raised_by?: string | null
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "visible_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          email: string
          id: string
          sent_at: string | null
        }
        Insert: {
          email: string
          id?: string
          sent_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          purpose: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          purpose: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          doc_type: string
          id: string
          is_current: boolean
          published_at: string | null
          version: number
        }
        Insert: {
          content: string
          doc_type: string
          id?: string
          is_current?: boolean
          published_at?: string | null
          version: number
        }
        Update: {
          content?: string
          doc_type?: string
          id?: string
          is_current?: boolean
          published_at?: string | null
          version?: number
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          lga: string
          senatorial_zone: string
          state: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          lga: string
          senatorial_zone: string
          state?: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          lga?: string
          senatorial_zone?: string
          state?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_seed_data: boolean
          name: string
          price: number
          restaurant_id: string | null
          subcategory: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_seed_data?: boolean
          name: string
          price: number
          restaurant_id?: string | null
          subcategory?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_seed_data?: boolean
          name?: string
          price?: number
          restaurant_id?: string | null
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          order_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          order_id?: string | null
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          order_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "visible_menu_items"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "visible_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          customer_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_code: string | null
          delivery_fee: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_minutes: number | null
          dispatch_retry_count: number
          id: string
          is_seed_data: boolean
          last_dispatch_attempt_at: string | null
          placed_at: string
          platform_fee: number
          restaurant_id: string | null
          rider_id: string | null
          status: string
          subtotal: number
          tip_amount: number | null
          zone: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_code?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_minutes?: number | null
          dispatch_retry_count?: number
          id?: string
          is_seed_data?: boolean
          last_dispatch_attempt_at?: string | null
          placed_at?: string
          platform_fee?: number
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string
          subtotal: number
          tip_amount?: number | null
          zone?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_code?: string | null
          delivery_fee?: number | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_minutes?: number | null
          dispatch_retry_count?: number
          id?: string
          is_seed_data?: boolean
          last_dispatch_attempt_at?: string | null
          placed_at?: string
          platform_fee?: number
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string
          subtotal?: number
          tip_amount?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          id: string
          is_seed_data: boolean
          processed_at: string | null
          requested_at: string | null
          rider_id: string | null
          status: string
        }
        Insert: {
          amount: number
          id?: string
          is_seed_data?: boolean
          processed_at?: string | null
          requested_at?: string | null
          rider_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          id?: string
          is_seed_data?: boolean
          processed_at?: string | null
          requested_at?: string | null
          rider_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: number
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: number
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: number
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          description: string | null
          id: number
          key: string
          updated_at: string | null
          updated_by: string | null
          value: number
        }
        Insert: {
          description?: string | null
          id?: number
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: number
        }
        Update: {
          description?: string | null
          id?: number
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          block_reason: string | null
          blocked: boolean
          created_at: string | null
          full_name: string | null
          id: string
          lga: string | null
          phone: string | null
          role: string
          starred: boolean
          state: string | null
          status: string
        }
        Insert: {
          block_reason?: string | null
          blocked?: boolean
          created_at?: string | null
          full_name?: string | null
          id: string
          lga?: string | null
          phone?: string | null
          role: string
          starred?: boolean
          state?: string | null
          status?: string
        }
        Update: {
          block_reason?: string | null
          blocked?: boolean
          created_at?: string | null
          full_name?: string | null
          id?: string
          lga?: string | null
          phone?: string | null
          role?: string
          starred?: boolean
          state?: string | null
          status?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          ends_at: string | null
          id: string
          is_seed_data: boolean
          plan: string | null
          restaurant_id: string | null
          starts_at: string | null
          status: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_seed_data?: boolean
          plan?: string | null
          restaurant_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_seed_data?: boolean
          plan?: string | null
          restaurant_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys: Json
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys: Json
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          id: string
          restaurant_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          id?: string
          restaurant_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payouts: {
        Row: {
          amount: number
          bank_account_snapshot: Json | null
          fee: number
          id: string
          net_amount: number
          processed_at: string | null
          rejection_reason: string | null
          requested_at: string | null
          restaurant_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          bank_account_snapshot?: Json | null
          fee?: number
          id?: string
          net_amount?: number
          processed_at?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          bank_account_snapshot?: Json | null
          fee?: number
          id?: string
          net_amount?: number
          processed_at?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payouts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payouts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payouts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accepting_end_time: string | null
          accepting_start_time: string | null
          address: string | null
          approval_status: string
          category: string | null
          created_at: string | null
          delivery_radius_km: number | null
          id: string
          image_url: string | null
          is_accepting_orders: boolean
          is_featured: boolean
          is_seed_data: boolean
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string | null
          rating: number | null
          zone: string | null
        }
        Insert: {
          accepting_end_time?: string | null
          accepting_start_time?: string | null
          address?: string | null
          approval_status?: string
          category?: string | null
          created_at?: string | null
          delivery_radius_km?: number | null
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean
          is_featured?: boolean
          is_seed_data?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id?: string | null
          rating?: number | null
          zone?: string | null
        }
        Update: {
          accepting_end_time?: string | null
          accepting_start_time?: string | null
          address?: string | null
          approval_status?: string
          category?: string | null
          created_at?: string | null
          delivery_radius_km?: number | null
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean
          is_featured?: boolean
          is_seed_data?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string | null
          rating?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          id: string
          rider_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          id?: string
          rider_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          id?: string
          rider_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rider_bank_accounts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_bank_accounts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_bank_accounts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_transfers: {
        Row: {
          cancellation_note: string | null
          cancellation_reason: string
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          handed_off_at: string | null
          id: string
          new_rider_id: string | null
          order_id: string
          original_rider_id: string
          original_rider_lat: number | null
          original_rider_lng: number | null
          reward_pct: number
          status: string
          transfer_code: string | null
        }
        Insert: {
          cancellation_note?: string | null
          cancellation_reason: string
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          handed_off_at?: string | null
          id?: string
          new_rider_id?: string | null
          order_id: string
          original_rider_id: string
          original_rider_lat?: number | null
          original_rider_lng?: number | null
          reward_pct: number
          status?: string
          transfer_code?: string | null
        }
        Update: {
          cancellation_note?: string | null
          cancellation_reason?: string
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          handed_off_at?: string | null
          id?: string
          new_rider_id?: string | null
          order_id?: string
          original_rider_id?: string
          original_rider_lat?: number | null
          original_rider_lng?: number | null
          reward_pct?: number
          status?: string
          transfer_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_transfers_new_rider_id_fkey"
            columns: ["new_rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_new_rider_id_fkey"
            columns: ["new_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_new_rider_id_fkey"
            columns: ["new_rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "visible_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_original_rider_id_fkey"
            columns: ["original_rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_original_rider_id_fkey"
            columns: ["original_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_transfers_original_rider_id_fkey"
            columns: ["original_rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          approval_status: string
          company_name: string | null
          created_at: string | null
          email: string | null
          face_photo_url: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          id_number: string | null
          is_seed_data: boolean
          last_location_update: string | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          plate_number: string | null
          profile_id: string | null
          status: string | null
          strikes: number
          vehicle_type: string | null
          verification_fee_paid: boolean
          waiver_completed: boolean
          waiver_screenshot_url: string | null
          zone: string | null
        }
        Insert: {
          approval_status?: string
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          face_photo_url?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          is_seed_data?: boolean
          last_location_update?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          plate_number?: string | null
          profile_id?: string | null
          status?: string | null
          strikes?: number
          vehicle_type?: string | null
          verification_fee_paid?: boolean
          waiver_completed?: boolean
          waiver_screenshot_url?: string | null
          zone?: string | null
        }
        Update: {
          approval_status?: string
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          face_photo_url?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          id_number?: string | null
          is_seed_data?: boolean
          last_location_update?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          plate_number?: string | null
          profile_id?: string | null
          status?: string | null
          strikes?: number
          vehicle_type?: string | null
          verification_fee_paid?: boolean
          waiver_completed?: boolean
          waiver_screenshot_url?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address: string | null
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          label: string
          lat: number
          lng: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          label: string
          lat: number
          lng: number
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number
          lng?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          is_seed_data: boolean
          order_id: string | null
          plan: string | null
          reference: string | null
          restaurant_id: string | null
          rider_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_seed_data?: boolean
          order_id?: string | null
          plan?: string | null
          reference?: string | null
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_seed_data?: boolean
          order_id?: string | null
          plan?: string | null
          reference?: string | null
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "admin_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "visible_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_submissions: {
        Row: {
          created_at: string | null
          detected_area: string | null
          detected_lga: string | null
          detected_state: string | null
          email: string
          id: string
          intent: string
          raw_lat: number | null
          raw_lng: number | null
        }
        Insert: {
          created_at?: string | null
          detected_area?: string | null
          detected_lga?: string | null
          detected_state?: string | null
          email: string
          id?: string
          intent: string
          raw_lat?: number | null
          raw_lng?: number | null
        }
        Update: {
          created_at?: string | null
          detected_area?: string | null
          detected_lga?: string | null
          detected_state?: string | null
          email?: string
          id?: string
          intent?: string
          raw_lat?: number | null
          raw_lng?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_user_directory: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          lga: string | null
          phone: string | null
          role: string | null
          state: string | null
          status: string | null
        }
        Relationships: []
      }
      cancellation_rate_weekly: {
        Row: {
          cancellation_rate: number | null
          week_start: string | null
        }
        Relationships: []
      }
      dashboard_kpis_today: {
        Row: {
          active_restaurants: number | null
          active_riders: number | null
          avg_delivery_minutes_today: number | null
          avg_delivery_minutes_yesterday: number | null
          new_restaurants_this_week: number | null
          new_riders_this_week: number | null
          orders_today: number | null
          orders_yesterday: number | null
          revenue_today: number | null
          revenue_yesterday: number | null
        }
        Relationships: []
      }
      orders_trend_14d: {
        Row: {
          day: string | null
          orders: number | null
        }
        Relationships: []
      }
      payouts_with_riders: {
        Row: {
          amount: number | null
          id: string | null
          is_seed_data: boolean | null
          processed_at: string | null
          requested_at: string | null
          rider_id: string | null
          rider_name: string | null
          rider_zone: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_restaurant_applications: {
        Row: {
          approval_status: string | null
          category: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          is_seed_data: boolean | null
          name: string | null
          rating: number | null
          zone: string | null
        }
        Insert: {
          approval_status?: string | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          rating?: number | null
          zone?: string | null
        }
        Update: {
          approval_status?: string | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          rating?: number | null
          zone?: string | null
        }
        Relationships: []
      }
      pending_rider_applications: {
        Row: {
          approval_status: string | null
          created_at: string | null
          id: string | null
          is_seed_data: boolean | null
          name: string | null
          status: string | null
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          id?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          status?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          id?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          status?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      promotions_with_restaurants: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          ends_at: string | null
          id: string | null
          is_seed_data: boolean | null
          restaurant_id: string | null
          restaurant_name: string | null
          restaurant_zone: string | null
          starts_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_breakdown_this_month: {
        Row: {
          total: number | null
          type: string | null
        }
        Relationships: []
      }
      visible_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          image_urls: string[] | null
          is_seed_data: boolean | null
          name: string | null
          price: number | null
          restaurant_id: string | null
          subcategory: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          image_urls?: string[] | null
          is_seed_data?: boolean | null
          name?: string | null
          price?: number | null
          restaurant_id?: string | null
          subcategory?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          image_urls?: string[] | null
          is_seed_data?: boolean | null
          name?: string | null
          price?: number | null
          restaurant_id?: string | null
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      visible_orders: {
        Row: {
          cancelled_at: string | null
          delivered_at: string | null
          delivery_fee: number | null
          delivery_minutes: number | null
          id: string | null
          is_seed_data: boolean | null
          placed_at: string | null
          platform_fee: number | null
          restaurant_id: string | null
          rider_id: string | null
          status: string | null
          subtotal: number | null
          zone: string | null
        }
        Insert: {
          cancelled_at?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          delivery_minutes?: number | null
          id?: string | null
          is_seed_data?: boolean | null
          placed_at?: string | null
          platform_fee?: number | null
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string | null
          subtotal?: number | null
          zone?: string | null
        }
        Update: {
          cancelled_at?: string | null
          delivered_at?: string | null
          delivery_fee?: number | null
          delivery_minutes?: number | null
          id?: string | null
          is_seed_data?: boolean | null
          placed_at?: string | null
          platform_fee?: number | null
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string | null
          subtotal?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pending_restaurant_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "visible_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "pending_rider_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "visible_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      visible_restaurants: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          is_seed_data: boolean | null
          name: string | null
          rating: number | null
          zone: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          rating?: number | null
          zone?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          rating?: number | null
          zone?: string | null
        }
        Relationships: []
      }
      visible_riders: {
        Row: {
          created_at: string | null
          id: string | null
          is_seed_data: boolean | null
          name: string | null
          status: string | null
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          status?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_seed_data?: boolean | null
          name?: string | null
          status?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      waitlist_summary: {
        Row: {
          area: string | null
          intent: string | null
          most_recent: string | null
          state: string | null
          submissions: number | null
        }
        Relationships: []
      }
      zone_activity: {
        Row: {
          orders_today: number | null
          restaurant_count: number | null
          riders_online: number | null
          zone: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          block_reason: string
          blocked: boolean
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          lga: string
          phone: string
          profile_created_at: string
          role: string
          starred: boolean
          state: string
          status: string
        }[]
      }
      expire_promotions: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id: string
          p_target_table: string
        }
        Returns: undefined
      }
      publish_legal_document: {
        Args: { p_content: string; p_doc_type: string }
        Returns: string
      }
      seed_data_visible: { Args: never; Returns: boolean }
      set_seed_data_visibility: {
        Args: { visible: boolean }
        Returns: undefined
      }
      set_user_status: {
        Args: { new_status: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// Convenience aliases used throughout the app's hooks -- kept here so
// `import type { Rider } from '@/types/database'` etc. keep working
// unchanged after this regeneration.
export type Rider = Database["public"]["Tables"]["riders"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type Payout = Database["public"]["Tables"]["payouts"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"]
export type RiderBankAccountRow = Database["public"]["Tables"]["rider_bank_accounts"]["Row"]
export type RiderTransferRow = Database["public"]["Tables"]["rider_transfers"]["Row"]

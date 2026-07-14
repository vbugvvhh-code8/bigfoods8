// Regenerated from the live `bigfoods` Supabase project schema.
// Covers tables the restaurant portal touches; admin-only tables
// (audit_log, disputes, announcements, etc.) are intentionally omitted —
// that's the admin session's schema to maintain.
//
// Updated: orders gained customer_id/delivery_address/delivery_lat/delivery_lng/
// delivery_code/tip_amount (customer-order backend work). email_otp_codes was
// dropped entirely and replaced by email_verification_codes — the OTP system
// was unified across all three portals (customer/restaurant/rider all share
// send-email-otp / verify-email-otp now, purpose field distinguishes them).

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          zone: string | null;
          rating: number | null;
          image_url: string | null;
          is_seed_data: boolean;
          created_at: string | null;
          approval_status: string;
          is_featured: boolean;
          is_accepting_orders: boolean;
          accepting_start_time: string | null;
          accepting_end_time: string | null;
          owner_id: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          delivery_radius_km: number | null;
          // NOT real columns on the live table — components/home/* (out of
          // scope for this session per the handoff doc) reference these.
          // Kept optional here only so that unrelated code still compiles;
          // whoever owns the customer homepage should reconcile this.
          // is_promoted maps conceptually to is_featured; is_open maps to
          // is_accepting_orders on the real schema.
          slug?: string;
          delivery_time_min?: number;
          delivery_time_max?: number;
          is_promoted?: boolean;
          is_open?: boolean;
        };
        Insert: Partial<Database['public']['Tables']['restaurants']['Row']> & { name: string };
        Update: Partial<Database['public']['Tables']['restaurants']['Row']>;
      };
      riders: {
        Row: {
          id: string;
          name: string;
          vehicle_type: string | null;
          zone: string | null;
          status: string | null;
          is_seed_data: boolean;
          created_at: string | null;
          approval_status: string;
          lat: number | null;
          lng: number | null;
          last_location_update: string | null;
          // NOT a real column yet — riders have no auth/profile link at all
          // currently. This is a known, flagged gap (see rider portal handoff),
          // not something to build against until it actually exists.
          // profile_id?: string;
        };
        Insert: Partial<Database['public']['Tables']['riders']['Row']> & { name: string };
        Update: Partial<Database['public']['Tables']['riders']['Row']>;
      };
      locations: {
        Row: {
          id: number;
          state: string;
          lga: string;
          senatorial_zone: string;
          is_active: boolean;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['locations']['Row']> & { lga: string; senatorial_zone: string };
        Update: Partial<Database['public']['Tables']['locations']['Row']>;
      };
      pricing_config: {
        Row: {
          id: number;
          key: string;
          value: number;
          description: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: Partial<Database['public']['Tables']['pricing_config']['Row']> & { key: string; value: number };
        Update: Partial<Database['public']['Tables']['pricing_config']['Row']>;
      };
      transactions: {
        Row: {
          id: string;
          order_id: string | null;
          type: string;
          amount: number;
          created_at: string | null;
          is_seed_data: boolean;
          restaurant_id: string | null;
          reference: string | null;
          status: string | null;
        };
        Insert: Partial<Database['public']['Tables']['transactions']['Row']> & { type: string; amount: number };
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string | null;
          name: string;
          price: number;
          category: string | null;
          image_url: string | null;
          is_seed_data: boolean;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['menu_items']['Row']> & { name: string; price: number };
        Update: Partial<Database['public']['Tables']['menu_items']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string | null;
          phone: string | null;
          status: string;
          state: string | null;
          lga: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; role: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      promotions: {
        Row: {
          id: string;
          restaurant_id: string | null;
          status: string;
          starts_at: string | null;
          ends_at: string | null;
          amount_paid: number | null;
          created_at: string | null;
          is_seed_data: boolean;
        };
        Insert: Partial<Database['public']['Tables']['promotions']['Row']>;
        Update: Partial<Database['public']['Tables']['promotions']['Row']>;
      };
      restaurant_payouts: {
        Row: {
          id: string;
          restaurant_id: string | null;
          amount: number;
          status: string | null;
          requested_at: string | null;
          processed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['restaurant_payouts']['Row']> & { amount: number };
        Update: Partial<Database['public']['Tables']['restaurant_payouts']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string | null;
          rider_id: string | null;
          customer_id: string | null;
          zone: string | null;
          status: string;
          subtotal: number;
          platform_fee: number;
          delivery_fee: number | null;
          tip_amount: number | null;
          delivery_address: string | null;
          delivery_lat: number | null;
          delivery_lng: number | null;
          delivery_code: string | null;
          placed_at: string;
          delivered_at: string | null;
          cancelled_at: string | null;
          delivery_minutes: number | null;
          is_seed_data: boolean;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & { subtotal: number };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      push_subscriptions: {
        Row: {
          id: string;
          profile_id: string | null;
          endpoint: string;
          keys: Record<string, unknown>;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['push_subscriptions']['Row']> & { endpoint: string; keys: Record<string, unknown> };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Row']>;
      };
      // Replaces the old email_otp_codes table (dropped — 0 rows existed,
      // no migration needed). Shared across all three portals now; `purpose`
      // is what distinguishes a customer signup code from a restaurant one.
      email_verification_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          purpose: string; // 'customer_signup' | 'restaurant_signup' (rider_signup not added yet)
          expires_at: string;
          verified_at: string | null;
          attempts: number;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['email_verification_codes']['Row']> & {
          email: string;
          code: string;
          purpose: string;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['email_verification_codes']['Row']>;
      };
      email_send_log: {
        Row: { id: string; email: string; sent_at: string | null };
        Insert: Partial<Database['public']['Tables']['email_send_log']['Row']> & { email: string };
        Update: Partial<Database['public']['Tables']['email_send_log']['Row']>;
      };
    };
  };
}

export type Restaurant = Database['public']['Tables']['restaurants']['Row'];
export type Rider = Database['public']['Tables']['riders']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];
export type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Promotion = Database['public']['Tables']['promotions']['Row'];
export type RestaurantPayout = Database['public']['Tables']['restaurant_payouts']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type EmailVerificationCode = Database['public']['Tables']['email_verification_codes']['Row'];
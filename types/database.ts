// Regenerated from the live `bigfoods` Supabase project schema.
// Covers tables the restaurant portal touches; admin-only tables
// (audit_log, disputes, announcements, etc.) are intentionally omitted —
// that's the admin session's schema to maintain.
//
// RECONCILED VERSION (v3) — this pass adds the rider-portal cancellation/
// transfer/onboarding/wallet work on top of the v2 reconciliation, and
// resolves both conflicts v2 left open:
//
// ✅ RESOLVED — CONFLICT #1 (riders.profile_id), was unresolved in v2.
// Confirmed directly against the live DB: profile_id is a real column, and
// RLS policies ("Riders can view own row" / "Riders can update own row")
// are written against `profile_id = auth.uid()`. The rider-portal source
// was correct; the customer-order-work flag was stale. Safe to build
// against.
//
// ✅ RESOLVED — CONFLICT #2 (email_verification_codes.purpose / rider_signup),
// was unresolved in v2. Confirmed directly against the live DB's check
// constraint: purpose is `'customer_signup' | 'restaurant_signup' |
// 'rider_signup' | 'rider_bank_change'`. rider_signup was already live
// (the programmer's file was right); rider_bank_change is new this pass,
// added for the rider withdrawal-account change-confirmation flow.
//
// NOTE (this pass) — riders gained onboarding/waiver/verification columns:
// phone, email, face_photo_url, id_front_url, id_back_url, id_number,
// company_name, verification_fee_paid, waiver_completed, waiver_screenshot_url.
// All confirmed live. `phone`/`email` duplicate what's on `profiles`, but the
// rider portal writes them independently during onboarding before the
// profiles row is necessarily in sync — treat riders.email/phone as the
// source of truth for rider-facing screens.
//
// NOTE (this pass) — orders gained dispatch-retry tracking:
// last_dispatch_attempt_at, dispatch_retry_count. Used by the rider
// cancellation/reassignment flow and the 1-minute dispatch-retry cron —
// not customer- or restaurant-facing, but added here since `orders` is
// shared across all three portals' types.
//
// NOTE (this pass) — two new tables: rider_bank_accounts (rider-side
// counterpart to restaurant_bank_accounts, not present in v2) and
// rider_transfers (the rider-to-rider delivery hand-off flow: a rider who's
// already picked up food but can't finish opens one of these so another
// online rider can claim it, confirm a physical handoff code, and finish
// the delivery — commission then splits between both riders per
// reward_pct). Neither existed anywhere before this pass.

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
          plate_number: string | null;
          zone: string | null;
          status: string | null;
          is_seed_data: boolean;
          created_at: string | null;
          approval_status: string;
          lat: number | null;
          lng: number | null;
          last_location_update: string | null;
          strikes: number;
          // Resolved live — see CONFLICT #1 note at top of file.
          profile_id: string | null;
          // NEW this pass — onboarding/waiver/verification fields, all
          // confirmed live. See file-level note above.
          phone: string | null;
          email: string | null;
          face_photo_url: string | null;
          id_front_url: string | null;
          id_back_url: string | null;
          id_number: string | null;
          company_name: string | null;
          verification_fee_paid: boolean;
          waiver_completed: boolean;
          waiver_screenshot_url: string | null;
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
          rider_id: string | null;
          reference: string | null;
          status: string | null;
          // NEW this pass — set for a multi-restaurant order's single
          // combined payment (order_id stays null in that case; use this
          // instead to find which order_group a payment covers).
          order_group_id: string | null;
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
          image_urls: string[] | null;
          subcategory: string | null;
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
      restaurant_bank_accounts: {
        Row: {
          id: string;
          restaurant_id: string;
          account_name: string;
          account_number: string;
          bank_name: string;
          bank_code: string;
          verified: boolean;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['restaurant_bank_accounts']['Row']> & {
          restaurant_id: string;
          account_name: string;
          account_number: string;
          bank_name: string;
          bank_code: string;
        };
        Update: Partial<Database['public']['Tables']['restaurant_bank_accounts']['Row']>;
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
      // Rider-side counterpart to restaurant_payouts. Naming is asymmetric
      // (restaurant_payouts vs payouts, not rider_payouts) — kept as-is per
      // v2's note; not worth a rename now that both flows are built on it.
      payouts: {
        Row: {
          id: string;
          rider_id: string | null;
          amount: number;
          status: string;
          requested_at: string | null;
          processed_at: string | null;
          is_seed_data: boolean;
        };
        Insert: Partial<Database['public']['Tables']['payouts']['Row']> & { amount: number };
        Update: Partial<Database['public']['Tables']['payouts']['Row']>;
      };
      // NEW this pass — rider-side counterpart to restaurant_bank_accounts.
      // First save per rider goes straight through (after Paystack name-match
      // verification); any change after that is gated behind an emailed
      // rider_bank_change code (see conflict #2 resolution above) via
      // rider-confirm-bank-change rather than saving directly.
      rider_bank_accounts: {
        Row: {
          id: string;
          rider_id: string;
          account_name: string;
          account_number: string;
          bank_name: string;
          bank_code: string;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['rider_bank_accounts']['Row']> & {
          rider_id: string;
          account_name: string;
          account_number: string;
          bank_name: string;
          bank_code: string;
        };
        Update: Partial<Database['public']['Tables']['rider_bank_accounts']['Row']>;
      };
      // NEW this pass — the rider-to-rider delivery hand-off flow. Created
      // when a rider who's already picked up food can't finish the delivery
      // (rider-request-transfer); status moves open -> claimed -> handed_off
      // -> completed as another rider accepts, then confirms the physical
      // handoff via transfer_code, then delivers. reward_pct (0-80) is what
      // the original rider gives up from their commission to whoever
      // finishes it; original_rider_lat/lng are a snapshot at cancel time so
      // the broadcast doesn't depend on the original rider's location still
      // updating after they've stopped.
      rider_transfers: {
        Row: {
          id: string;
          order_id: string;
          original_rider_id: string;
          new_rider_id: string | null;
          reward_pct: number;
          cancellation_reason: string;
          cancellation_note: string | null;
          status: string; // 'open' | 'claimed' | 'handed_off' | 'completed' | 'void'
          transfer_code: string | null;
          original_rider_lat: number | null;
          original_rider_lng: number | null;
          created_at: string;
          claimed_at: string | null;
          handed_off_at: string | null;
          completed_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['rider_transfers']['Row']> & {
          order_id: string;
          original_rider_id: string;
          reward_pct: number;
          cancellation_reason: string;
        };
        Update: Partial<Database['public']['Tables']['rider_transfers']['Row']>;
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
          cancelled_by: string | null;
          delivery_minutes: number | null;
          is_seed_data: boolean;
          // NEW this pass — dispatch-retry tracking, see file-level note above.
          last_dispatch_attempt_at: string | null;
          dispatch_retry_count: number;
          // NEW this pass — set when this order is one leg of a multi-restaurant
          // order (see order_groups/delivery_batches below). Null for a plain
          // single-restaurant order, which works exactly as before.
          order_group_id: string | null;
          delivery_batch_id: string | null;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & { subtotal: number };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      // NEW this pass — the customer-facing wrapper for a checkout that
      // spans multiple restaurants: one delivery address, one combined
      // Paystack payment. Each restaurant leg is still a normal `orders`
      // row (own subtotal, own platform_fee, own status), just linked back
      // here via order_group_id.
      order_groups: {
        Row: {
          id: string;
          customer_id: string;
          delivery_address: string | null;
          delivery_lat: number;
          delivery_lng: number;
          delivery_note: string | null;
          payment_reference: string | null;
          payment_status: string; // 'pending' | 'paid' | 'failed'
          total_amount: number;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['order_groups']['Row']> & {
          customer_id: string;
          delivery_lat: number;
          delivery_lng: number;
        };
        Update: Partial<Database['public']['Tables']['order_groups']['Row']>;
      };
      // NEW this pass — one per rider within an order_group. A cart spanning
      // more than 3 restaurants splits into multiple batches, each an
      // independent delivery with its own rider, fee, and drop-off code.
      delivery_batches: {
        Row: {
          id: string;
          order_group_id: string;
          rider_id: string | null;
          status: string; // 'assigning' | 'collecting' | 'delivered' | 'cancelled'
          delivery_code: string | null;
          delivery_fee: number;
          tip_amount: number;
          route_sequence: string[] | null; // ordered restaurant_ids for this rider's pickup sequence
          last_dispatch_attempt_at: string | null;
          dispatch_retry_count: number;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['delivery_batches']['Row']> & { order_group_id: string };
        Update: Partial<Database['public']['Tables']['delivery_batches']['Row']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string | null;
          menu_item_id: string | null;
          quantity: number;
          unit_price: number;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['order_items']['Row']> & { unit_price: number };
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
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
      // Shared across all three portals; `purpose` is what distinguishes a
      // customer signup code from a restaurant/rider one, or a rider bank
      // account change confirmation. See CONFLICT #2 resolution at top of file.
      email_verification_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          purpose: string; // 'customer_signup' | 'restaurant_signup' | 'rider_signup' | 'rider_bank_change'
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
      saved_addresses: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          address: string | null;
          lat: number;
          lng: number;
          is_default: boolean;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['saved_addresses']['Row']> & {
          customer_id: string;
          label: string;
          lat: number;
          lng: number;
        };
        Update: Partial<Database['public']['Tables']['saved_addresses']['Row']>;
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
export type RestaurantBankAccount = Database['public']['Tables']['restaurant_bank_accounts']['Row'];
export type RestaurantPayout = Database['public']['Tables']['restaurant_payouts']['Row'];
export type Payout = Database['public']['Tables']['payouts']['Row'];
export type RiderBankAccount = Database['public']['Tables']['rider_bank_accounts']['Row'];
export type RiderTransfer = Database['public']['Tables']['rider_transfers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type EmailVerificationCode = Database['public']['Tables']['email_verification_codes']['Row'];
export type SavedAddress = Database['public']['Tables']['saved_addresses']['Row'];
export type OrderGroup = Database['public']['Tables']['order_groups']['Row'];
export type DeliveryBatch = Database['public']['Tables']['delivery_batches']['Row'];

// Regenerated from the live `bigfoods` Supabase project schema.
// Covers tables the restaurant portal touches; admin-only tables
// (audit_log, disputes, announcements, etc.) are intentionally omitted —
// that's the admin session's schema to maintain.
//
// RECONCILED VERSION (v2) — merged from THREE sources:
//  1) Customer-order backend work: orders gained customer_id/delivery_address/
//     delivery_lat/delivery_lng/delivery_code/tip_amount. email_otp_codes was
//     dropped entirely and replaced by email_verification_codes (shared across
//     customer/restaurant/rider portals via send-email-otp / verify-email-otp,
//     `purpose` field distinguishes them).
//  2) Rider portal work: riders gained plate_number/strikes/profile_id,
//     transactions gained rider_id, orders gained cancelled_by, and a new
//     `payouts` table (rider payouts, parallel to restaurant_payouts) was added.
//  3) Programmer's working file (this pass): IMPORTANT — this file was
//     branched from an OLDER copy of the schema, before the rider-portal
//     merge (2) landed, and his actual work in it was scoped to orders /
//     customer flow. That changes how much weight to give different parts of it:
//       - order_items, saved_addresses, and the full orders field set
//         (customer_id, delivery_address/lat/lng/delivery_code, tip_amount,
//         cancelled_by) ARE this pass's real, fresh contribution — trust these.
//       - riders.plate_number/strikes/profile_id appearing in his file is NOT
//         independent confirmation of anything — he inherited those from his
//         (older) base without touching that section. Don't read it as a
//         second source verifying profile_id; see conflict #1 below.
//       - transactions missing rider_id, and payouts missing entirely, are
//         most likely just staleness — his base predates when those were
//         added — not a signal that they aren't real. Kept both in below.
//
// ⚠️ UNRESOLVED CONFLICT #1 — riders.profile_id
// The customer-order-work version of this file explicitly flagged riders as
// having NO auth/profile link yet ("known flagged gap, not something to build
// against until it actually exists"). The rider-portal version has profile_id
// live as a real column. The programmer's file also has it, but per the note
// above that's inherited, not a fresh check — so this is effectively still
// one source (rider-portal work) claiming it exists against one source
// (customer-order work) flagging it as not yet real. Not resolved by this
// pass. Confirm with the rider-portal dev or check the live DB directly
// before building anything against it, especially anything auth-sensitive.
//
// ⚠️ UNRESOLVED CONFLICT #2 — email_verification_codes.purpose / rider_signup
// The previous reconciled version stated rider_signup is NOT YET a valid
// purpose value ("add it when the rider portal actually wires up its OTP
// flow"). The programmer's file states the opposite: that the send-email-otp
// / verify-email-otp Edge Functions already use rider_signup as one of three
// live purpose values. Unlike the profile_id note above, this reads as a
// deliberate claim about how the Edge Functions behave, not stale inherited
// copy — worth resolving before any code (e.g. a Screen 6 / Login flow)
// writes or expects a rider_signup code.
//
// NOTE — transactions.rider_id / payouts table
// Both present in the rider-portal-merged version, both absent from the
// programmer's file — but given his file predates that merge, this is
// expected staleness, not evidence against either existing. Kept in below.
//
// NOTE (this pass) — menu_items.image_urls / subcategory
// Verified directly against the live Supabase schema (bigfoods project):
// both columns exist on the real table. image_urls is a text[] with a
// check constraint requiring either 0 or 2-3 entries; subcategory is a
// nullable text column. Added below — this was simply missing from the
// prior version of this file, not a conflict between sources.

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
          // See UNRESOLVED CONFLICT #1 at top of file before relying on this.
          profile_id: string | null;
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
          // Absent from the programmer's latest file — stale base, not a
          // conflict. See NOTE — transactions.rider_id / payouts at top of file.
          rider_id: string | null;
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
          // Verified against live schema this pass — see NOTE at top of file.
          // Check constraint on the live table: array_length is either NULL
          // or between 2 and 3 (never 1 image).
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
      // (restaurant_payouts vs payouts, not rider_payouts) — worth confirming
      // with the rider-portal dev whether that's intentional or worth renaming
      // for consistency before too much code references it.
      // NOTE: absent from the programmer's latest file — expected, since that
      // file was branched before this table was added (see file-level note).
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
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']> & { subtotal: number };
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      // NEW — added by the programmer's latest file. Not present in either
      // prior reconciled source; no conflicting notes to carry over.
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
      // Replaces the old email_otp_codes table (dropped — 0 rows existed,
      // no migration needed). Shared across all three portals now; `purpose`
      // is what distinguishes a customer signup code from a restaurant one.
      // See UNRESOLVED CONFLICT #2 at top of file re: rider_signup validity.
      email_verification_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          purpose: string; // 'customer_signup' | 'restaurant_signup' | 'rider_signup' — see conflict note at top
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
      // NEW — added by the programmer's latest file. Not present in either
      // prior reconciled source; no conflicting notes to carry over.
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
export type RestaurantPayout = Database['public']['Tables']['restaurant_payouts']['Row'];
export type Payout = Database['public']['Tables']['payouts']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type EmailVerificationCode = Database['public']['Tables']['email_verification_codes']['Row'];
export type SavedAddress = Database['public']['Tables']['saved_addresses']['Row'];

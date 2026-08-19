export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MarketStatus =
  | "requested"
  | "sandbox"
  | "seeding"
  | "public"
  | "paused"
  | "archived";

export type ObservationState =
  | "pending"
  | "provisional"
  | "verified"
  | "disputed"
  | "rejected"
  | "expired";

export type Database = {
  public: {
    Tables: {
      markets: {
        Row: {
          id: string;
          region_id: string;
          slug: string;
          name: string;
          currency_code: string;
          timezone: string;
          status: MarketStatus;
          freshness_hours: number;
          created_at: string;
          published_at: string | null;
        };
      };
      stores: {
        Row: {
          id: string;
          slug: string;
          name: string;
          status: string;
        };
      };
      store_branches: {
        Row: {
          id: string;
          store_id: string;
          market_id: string;
          slug: string;
          name: string;
          address: string | null;
          verification_status: string;
          is_public: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          brand: string | null;
          package_size: number | null;
          package_size_text: string | null;
          unit: string;
          measure_kind: string;
          status: string;
        };
      };
      current_prices: {
        Row: {
          id: string;
          market_id: string;
          branch_id: string;
          product_id: string;
          price_cents: number;
          currency_code: string;
          quantity: number;
          package_size: number | null;
          unit: string;
          unit_price_cents: number | null;
          unit_price_basis: string | null;
          is_sale: boolean;
          observed_on: string;
          confidence: number;
          state: ObservationState;
          evidence_count: number;
          stale_labeled: boolean;
          created_at: string;
        };
      };
    };
    Views: {
      current_prices: {
        Row: Database["public"]["Tables"]["current_prices"]["Row"];
      };
    };
  };
};

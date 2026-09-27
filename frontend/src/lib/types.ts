export interface Facility {
  id: string;
  name: string;
  full_name: string | null;
  type: "lot" | "garage";
  display_hidden: boolean;
  latitude: number | null;
  longitude: number | null;
  max_occupancy_total: number | null;
  current_total: number | null;
  current_pct: number | null;
  is_unreliable: boolean;
  last_polled_at: string | null;
}

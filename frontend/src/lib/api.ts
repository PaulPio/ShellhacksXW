const API_BASE = import.meta.env.VITE_API_BASE as string;

export interface ParsedClass {
  course: string;
  section: string | null;
  title: string | null;
  days: string[];
  start: string | null;
  end: string | null;
  is_online: boolean;
  building: string | null;
  building_code: string | null;
  building_source: "printed" | null;
  latitude: number | null;
  longitude: number | null;
}

export interface IngestResponse {
  classes: ParsedClass[];
  source: "pdf" | "image";
}

export async function ingestSchedule(file: File): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch(`${API_BASE}/api/ingest`, { method: "POST", body: formData });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ingest failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

export interface RecommendedLot {
  facility_id: string;
  name: string;
  full_name: string | null;
  walk_minutes: number;
  utilization_pct: number | null;
  p_free_space: number;
  confidence: "low" | "medium" | "high";
  provenance: "live" | "modelled" | "simulated";
  is_unreliable: boolean;
  maps_url: string;
}

export interface LeaveNowInfo {
  leave_by: string;
  minutes_until_leave: number;
  status: "leave_now" | "leave_soon" | "plenty_of_time";
  fill_rate_pct_per_min: number;
  is_filling_fast: boolean;
}

export interface ClassPlan {
  course: string;
  target_arrival: string;
  recommended: RecommendedLot;
  alternates: RecommendedLot[];
  fallback_chain: { id: string; name: string | null }[];
  leave_now: LeaveNowInfo;
}

export interface PlanResponse {
  plans: ClassPlan[];
  as_of: string;
}

export async function getPlan(classes: ParsedClass[]): Promise<PlanResponse> {
  const resp = await fetch(`${API_BASE}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(classes),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Plan failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

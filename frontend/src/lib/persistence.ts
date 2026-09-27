/**
 * The ONLY module in the frontend allowed to write user data to Supabase.
 * Every exported function here early-returns a no-op when there's no
 * session -- this is what makes "guest mode writes zero rows" a one-file
 * audit instead of a scattered convention. Never call
 * supabase.from('pantherpark_saved_schedules'/'pantherpark_user_preferences'/
 * 'pantherpark_plan_history').insert/update/upsert anywhere else.
 */

import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export interface ParsedClass {
  course: string;
  days: string[];
  start: string;
  end: string;
  building: string | null;
  building_source: "printed" | null;
}

export async function saveSchedule(
  session: Session | null,
  classes: ParsedClass[],
  name = "My Schedule",
  termCode = "1268"
): Promise<{ saved: boolean; id?: string; reason?: string }> {
  if (!session) {
    return { saved: false, reason: "guest mode: nothing is persisted" };
  }
  const { data, error } = await supabase
    .from("pantherpark_saved_schedules")
    .insert({ user_id: session.user.id, name, term_code: termCode, classes })
    .select("id")
    .single();
  if (error) return { saved: false, reason: error.message };
  return { saved: true, id: data.id };
}

export async function savePreferences(
  session: Session | null,
  walkSpeedMps: number,
  bufferMinutes: number
): Promise<{ saved: boolean; reason?: string }> {
  if (!session) {
    return { saved: false, reason: "guest mode: nothing is persisted" };
  }
  const { error } = await supabase.from("pantherpark_user_preferences").upsert({
    user_id: session.user.id,
    walk_speed_mps: walkSpeedMps,
    buffer_minutes: bufferMinutes,
  });
  return { saved: !error, reason: error?.message };
}

export async function logPlanHistory(
  session: Session | null,
  classSnapshot: unknown,
  recommendedLot: string,
  targetArrivalIso: string
): Promise<{ saved: boolean; reason?: string }> {
  if (!session) {
    return { saved: false, reason: "guest mode: nothing is persisted" };
  }
  const { error } = await supabase.from("pantherpark_plan_history").insert({
    user_id: session.user.id,
    class_snapshot: classSnapshot,
    recommended_lot: recommendedLot,
    target_arrival: targetArrivalIso,
  });
  return { saved: !error, reason: error?.message };
}

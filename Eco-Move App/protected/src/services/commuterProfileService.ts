import { supabase } from "../supabaseClient";

import type {CommuterProfileData} from '../../../src/features/profile/commuterTypes';
export type {CommuterProfileData} from '../../../src/features/profile/commuterTypes';

const STORAGE_KEY_PREFIX = "ecomove_commuter_profile_";
const ONBOARDING_COMPLETED_PREFIX = "ecomove_onboarding_completed_";

/**
 * Get saved commuter profile synchronously from local cache
 */
export function getCommuterProfile(userId: string): CommuterProfileData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw) as CommuterProfileData;
    }
  } catch (err) {
    console.warn("Could not read commuter profile from localStorage:", err);
  }
  return null;
}

/**
 * Fetch user-specific commuter profile from Supabase with local fallback.
 * Checks the dedicated `public.commuter_profiles` table first, then `auth.users` metadata.
 */
export async function fetchCommuterProfile(userId: string): Promise<CommuterProfileData | null> {
  const local = getCommuterProfile(userId);

  if (!userId || userId === "guest" || userId === "demo-user-nagpur-001") {
    return local;
  }

  try {
    // 1. Try querying the dedicated public.commuter_profiles table in Supabase
    const { data: dbRow, error: dbError } = await supabase
      .from("commuter_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!dbError && dbRow) {
      const parsed: CommuterProfileData = {
        occupation: dbRow.occupation || undefined,
        commuteDistance: dbRow.commute_distance || undefined,
        vehicleOwned: dbRow.vehicle_owned || undefined,
        vehicleModelYear: dbRow.vehicle_model_year || undefined,
        transitFrequency: dbRow.transit_frequency || undefined,
        frequentHubs: dbRow.frequent_hubs || undefined,
        dailyTravelTime: dbRow.daily_travel_time || undefined,
        commutePriority: dbRow.commute_priority || undefined,
        monthlyExpense: dbRow.monthly_expense || undefined,
        completedAt: dbRow.completed_at || undefined,
        isSkipped: dbRow.is_skipped || false,
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(parsed));
      setCommuterOnboardingCompleted(userId, true);
      return parsed;
    }

    // 2. Fallback to Supabase Auth user_metadata
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user?.id === userId) {
      const cloud = data.user.user_metadata?.["commuter_profile"] as CommuterProfileData | undefined;
      if (cloud && typeof cloud === "object" && Object.keys(cloud).length > 0) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cloud));
        setCommuterOnboardingCompleted(userId, true);
        return cloud;
      }
    }
  } catch (err) {
    console.warn("Could not fetch user commuter profile from Supabase:", err);
  }

  return local;
}

/**
 * Check if the user has already completed or dismissed onboarding
 */
export function hasCompletedCommuterOnboarding(userId: string): boolean {
  try {
    const status = localStorage.getItem(`${ONBOARDING_COMPLETED_PREFIX}${userId}`);
    if (status === "true") return true;
    const profile = getCommuterProfile(userId);
    return Boolean(profile?.completedAt || profile?.isSkipped);
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed or skipped
 */
export function setCommuterOnboardingCompleted(userId: string, completed = true): void {
  try {
    localStorage.setItem(`${ONBOARDING_COMPLETED_PREFIX}${userId}`, completed ? "true" : "false");
  } catch (err) {
    console.warn("Could not set onboarding completed in localStorage:", err);
  }
}

/**
 * Save user-specific commuter profile data to Supabase and local cache
 */
export async function saveCommuterProfile(
  userId: string,
  profileData: Partial<CommuterProfileData>,
  isSkipped = false
): Promise<CommuterProfileData> {
  const current = getCommuterProfile(userId) || {};
  const updated: CommuterProfileData = {
    ...current,
    ...profileData,
    completedAt: new Date().toISOString(),
    isSkipped,
    syncStatus: "local",
  };

  // 1. Save to local storage for instant zero-latency UI feedback
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
    setCommuterOnboardingCompleted(userId, true);
  } catch (err) {
    console.warn("Failed to save commuter profile locally:", err);
  }

  // 2. Persist user-specific data directly to Supabase
  if (userId && userId !== "guest" && userId !== "demo-user-nagpur-001") {
    try {
      const {data: session} = await supabase.auth.getUser();
      if (session.user?.id !== userId) return updated;
      // 2A. Upsert into public.commuter_profiles table in Supabase
      const { error: tableError } = await supabase
        .from("commuter_profiles")
        .upsert(
          {
            user_id: userId,
            occupation: updated.occupation || null,
            commute_distance: updated.commuteDistance || null,
            vehicle_owned: updated.vehicleOwned || null,
            vehicle_model_year: updated.vehicleModelYear || null,
            transit_frequency: updated.transitFrequency || {},
            frequent_hubs: updated.frequentHubs || [],
            daily_travel_time: updated.dailyTravelTime || null,
            commute_priority: updated.commutePriority || null,
            monthly_expense: updated.monthlyExpense || null,
            is_skipped: updated.isSkipped || false,
            completed_at: updated.completedAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (tableError) {
        // Non-blocking: table might still be being created by user
        console.warn("Notice: public.commuter_profiles upsert:", tableError.message);
      }

      // 2B. Update Supabase auth user metadata (persistent cloud account storage)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          commuter_profile: updated,
          onboarding_completed: true,
        },
      });
      if (authError) {
        console.warn("Notice: auth metadata update:", authError.message);
      }

      if (!tableError || !authError) {
        updated.syncStatus = "cloud";
        localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(updated));
      }
      // Commute survey answers must not overwrite existing routing preferences.

    } catch (err) {
      console.warn("Supabase user-specific sync skipped:", err);
    }
  }

  return updated;
}

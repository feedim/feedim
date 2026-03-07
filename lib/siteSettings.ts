import { createAdminClient } from "@/lib/supabase/admin";
import { cache, cached } from "@/lib/cache";

const ADS_CACHE_KEY = "site:ads_enabled";

export interface AdsSettings {
  enabled: boolean;
  feed: boolean;
  moments: boolean;
  videoPostroll: boolean;
}

const DEFAULT_ADS_SETTINGS: AdsSettings = {
  enabled: false,
  feed: false,
  moments: false,
  videoPostroll: false,
};

export async function getAdsSettings(): Promise<AdsSettings> {
  return cached<AdsSettings>(ADS_CACHE_KEY, 60, async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "ads_enabled")
      .single();
    if (!data?.value || typeof data.value !== "object") return DEFAULT_ADS_SETTINGS;
    const v = data.value as Record<string, unknown>;
    // Backwards-compat: old format was { enabled: boolean }
    if (typeof v.feed === "undefined") {
      const enabled = !!v.enabled;
      return { enabled, feed: enabled, moments: enabled, videoPostroll: enabled };
    }
    return {
      enabled: !!v.enabled,
      feed: !!v.feed,
      moments: !!v.moments,
      videoPostroll: !!v.videoPostroll,
    };
  });
}

/** @deprecated Use getAdsSettings() instead */
export async function getAdsEnabled(): Promise<boolean> {
  const settings = await getAdsSettings();
  return settings.enabled;
}

export async function setAdsSettings(partial: Partial<AdsSettings>): Promise<AdsSettings> {
  const current = await getAdsSettings();
  const next: AdsSettings = { ...current, ...partial };
  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert({ key: "ads_enabled", value: next }, { onConflict: "key" });
  cache.delete(ADS_CACHE_KEY);
  return next;
}

/** @deprecated Use setAdsSettings() instead */
export async function setAdsEnabled(enabled: boolean): Promise<void> {
  await setAdsSettings({ enabled });
}

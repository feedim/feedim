import { createAdminClient } from "@/lib/supabase/admin";
import { cache, cached } from "@/lib/cache";

const ADS_CACHE_KEY = "site:ads_enabled";

export async function getAdsEnabled(): Promise<boolean> {
  return cached<boolean>(ADS_CACHE_KEY, 60, async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "ads_enabled")
      .single();
    if (!data?.value || typeof data.value.enabled !== "boolean") return false;
    return data.value.enabled as boolean;
  });
}

export async function setAdsEnabled(enabled: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert({ key: "ads_enabled", value: { enabled } }, { onConflict: "key" });
  cache.delete(ADS_CACHE_KEY);
}

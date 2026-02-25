import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { latitude, longitude, ip_fallback } = body;

  let city: string | null = null;
  let region: string | null = null;
  let countryCode: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  if (typeof latitude === "number" && typeof longitude === "number") {
    // Browser geolocation — reverse geocode with Nominatim
    lat = latitude;
    lng = longitude;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`,
        { headers: { "User-Agent": "Feedim/1.0" } }
      );
      if (geoRes.ok) {
        const geo = await geoRes.json();
        const addr = geo.address || {};
        city = addr.city || addr.town || addr.village || null;
        region = addr.state || null;
        countryCode = addr.country_code ? addr.country_code.toUpperCase() : null;
      }
    } catch {}
  } else if (ip_fallback) {
    // IP-based fallback — get country/city from IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || null;

    if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
      try {
        const ipRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,countryCode,regionName,city,lat,lon`);
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.status === "success") {
            city = ipData.city || null;
            region = ipData.regionName || null;
            countryCode = ipData.countryCode || null;
            lat = ipData.lat || null;
            lng = ipData.lon || null;
          }
        }
      } catch {}
    }

    // If IP lookup failed (localhost/private), try header-based country detection
    if (!countryCode) {
      const cfCountry = req.headers.get("cf-ipcountry");
      const vercelCountry = req.headers.get("x-vercel-ip-country");
      countryCode = cfCountry || vercelCountry || null;
      if (countryCode) countryCode = countryCode.toUpperCase();
    }
  } else {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Nothing found at all
  if (!city && !region && !countryCode) {
    return NextResponse.json({ location: null, message: "Could not determine location" });
  }

  const admin = createAdminClient();

  // Check for duplicate
  const { data: existing } = await admin
    .from("user_locations")
    .select("id")
    .eq("user_id", user.id)
    .eq("city", city ?? "")
    .eq("region", region ?? "")
    .eq("country_code", countryCode ?? "")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ location: { city, region, country_code: countryCode }, skipped: true });
  }

  // Insert new location
  const { error } = await admin
    .from("user_locations")
    .insert({
      user_id: user.id,
      latitude: lat || 0,
      longitude: lng || 0,
      city,
      region,
      country_code: countryCode,
    });

  if (error) {
    return safeError(error);
  }

  // Keep max 10 locations per user
  const { data: allLocations } = await admin
    .from("user_locations")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (allLocations && allLocations.length > 10) {
    const idsToDelete = allLocations.slice(10).map((l: { id: number }) => l.id);
    await admin.from("user_locations").delete().in("id", idsToDelete);
  }

  return NextResponse.json({ location: { city, region, country_code: countryCode } });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_locations")
    .select("city, region, country_code, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ location: data || null });
}

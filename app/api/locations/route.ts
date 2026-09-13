import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  countries,
  locationDistricts,
  locationRegions,
  locationSchools,
  locationTowns,
} from "@/db/schema";

// Cascading type-ahead search for the location database:
// Region -> District/Municipality -> Town/Community -> School.
//
//   GET /api/locations?level=region&country=GH&q=vol
//   GET /api/locations?level=district&regionId=<uuid>&q=ho
//   GET /api/locations?level=town&districtId=<uuid>&q=win
//   GET /api/locations?level=school&districtId=<uuid>&q=meth
//
// `q` is optional; when omitted, the first `limit` rows (alphabetical) for
// the given parent are returned - useful for populating a dropdown on open.

const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const level = searchParams.get("level");
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(
      Number(searchParams.get("limit")) || 20,
      MAX_LIMIT
    );
    const countryCode = searchParams.get("country") ?? "GH";
    const regionId = searchParams.get("regionId");
    const districtId = searchParams.get("districtId");
    const townId = searchParams.get("townId");

    const searchFilter = (column: Parameters<typeof ilike>[0]) =>
      q ? ilike(column, `${q}%`) : undefined;

    if (level === "region") {
      const [country] = await db
        .select({ id: countries.id })
        .from(countries)
        .where(eq(countries.code, countryCode))
        .limit(1);

      if (!country) {
        return NextResponse.json({ success: true, data: { level, items: [] } });
      }

      const items = await db
        .select({
          id: locationRegions.id,
          name: locationRegions.name,
          capital: locationRegions.capital,
        })
        .from(locationRegions)
        .where(and(eq(locationRegions.countryId, country.id), searchFilter(locationRegions.name)))
        .orderBy(asc(locationRegions.name))
        .limit(limit);

      return NextResponse.json({ success: true, data: { level, items } });
    }

    if (level === "district") {
      if (!regionId) {
        return NextResponse.json(
          { success: false, error: "regionId is required for level=district" },
          { status: 400 }
        );
      }
      const items = await db
        .select({
          id: locationDistricts.id,
          name: locationDistricts.name,
          category: locationDistricts.category,
          capital: locationDistricts.capital,
        })
        .from(locationDistricts)
        .where(and(eq(locationDistricts.regionId, regionId), searchFilter(locationDistricts.name)))
        .orderBy(asc(locationDistricts.name))
        .limit(limit);

      return NextResponse.json({ success: true, data: { level, items } });
    }

    if (level === "town") {
      if (!districtId) {
        return NextResponse.json(
          { success: false, error: "districtId is required for level=town" },
          { status: 400 }
        );
      }
      const items = await db
        .select({
          id: locationTowns.id,
          name: locationTowns.name,
          isDistrictCapital: locationTowns.isDistrictCapital,
        })
        .from(locationTowns)
        .where(and(eq(locationTowns.districtId, districtId), searchFilter(locationTowns.name)))
        .orderBy(asc(locationTowns.name))
        .limit(limit);

      return NextResponse.json({ success: true, data: { level, items } });
    }

    if (level === "school") {
      if (!districtId && !townId) {
        return NextResponse.json(
          { success: false, error: "districtId or townId is required for level=school" },
          { status: 400 }
        );
      }
      const items = await db
        .select({
          id: locationSchools.id,
          name: locationSchools.name,
          ownership: locationSchools.ownership,
          levelBand: locationSchools.levelBand,
        })
        .from(locationSchools)
        .where(
          and(
            townId ? eq(locationSchools.townId, townId) : eq(locationSchools.districtId, districtId!),
            searchFilter(locationSchools.name)
          )
        )
        .orderBy(asc(locationSchools.name))
        .limit(limit);

      return NextResponse.json({ success: true, data: { level, items } });
    }

    return NextResponse.json(
      { success: false, error: "level must be one of: region, district, town, school" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Locations API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

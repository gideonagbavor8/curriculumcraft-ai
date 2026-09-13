// Seeds the location database (countries -> regions -> districts -> towns)
// from db/seedData/ghanaLocations.ts. Idempotent: safe to re-run (uses
// onConflictDoNothing keyed on the unique slug-per-parent constraints).
//
// Run with: npx tsx db/seedGhanaLocations.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, count, eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as schema from "./schema";
import { slugify } from "../lib/utils";
import {
  GHANA_DISTRICTS,
  GHANA_REGION_CAPITALS,
  GHANA_SOURCE_REFERENCE,
} from "./seedData/ghanaLocations";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Normalize a district/town name for de-duplication comparisons (case +
// whitespace insensitive) without mutating the display name we store.
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  console.log("Seeding Ghana location database...");
  console.log(`Source: ${GHANA_SOURCE_REFERENCE}`);

  // 1. Country
  const [country] = await db
    .insert(schema.countries)
    .values({ code: "GH", name: "Ghana" })
    .onConflictDoNothing({ target: schema.countries.code })
    .returning();

  const ghana =
    country ??
    (await db.select().from(schema.countries).where(eq(schema.countries.code, "GH")).limit(1))[0];

  if (!ghana) {
    throw new Error("Failed to create or find Ghana country row");
  }

  // 2. Regions (unique by name, derived from the district list + capitals map)
  const regionNames = [...new Set(GHANA_DISTRICTS.map((d) => d.region))];
  if (regionNames.length !== 16) {
    throw new Error(`Expected 16 Ghana regions, found ${regionNames.length}`);
  }

  const regionIdByName = new Map<string, string>();
  for (const name of regionNames) {
    const slug = slugify(name);
    const capital = GHANA_REGION_CAPITALS[name];
    const [inserted] = await db
      .insert(schema.locationRegions)
      .values({
        countryId: ghana.id,
        name,
        slug,
        capital,
        sourceReference: GHANA_SOURCE_REFERENCE,
      })
      .onConflictDoNothing({
        target: [schema.locationRegions.countryId, schema.locationRegions.slug],
      })
      .returning();

    const region =
      inserted ??
      (
        await db
          .select()
          .from(schema.locationRegions)
          .where(and(eq(schema.locationRegions.countryId, ghana.id), eq(schema.locationRegions.slug, slug)))
          .limit(1)
      )[0];

    if (!region) throw new Error(`Failed to create or find region ${name}`);
    regionIdByName.set(name, region.id);
  }

  // 3. Districts (dedupe by region+slug; the seed data is already verified
  // duplicate-free, but normalize defensively in case of future edits)
  const seenDistrictKeys = new Set<string>();
  let districtsInserted = 0;
  let districtsSkipped = 0;
  const districtIdByRegionAndName = new Map<string, string>();

  for (const d of GHANA_DISTRICTS) {
    const key = `${d.region}||${normalizeKey(d.name)}`;
    if (seenDistrictKeys.has(key)) {
      districtsSkipped++;
      continue;
    }
    seenDistrictKeys.add(key);

    const regionId = regionIdByName.get(d.region)!;
    const slug = slugify(d.name);

    const [inserted] = await db
      .insert(schema.locationDistricts)
      .values({
        regionId,
        name: d.name,
        slug,
        category: d.category,
        capital: d.capital,
        isRegionalCapital: Boolean(d.isRegionalCapital),
        sourceReference: GHANA_SOURCE_REFERENCE,
      })
      .onConflictDoNothing({
        target: [schema.locationDistricts.regionId, schema.locationDistricts.slug],
      })
      .returning();

    const district =
      inserted ??
      (
        await db
          .select()
          .from(schema.locationDistricts)
          .where(and(eq(schema.locationDistricts.regionId, regionId), eq(schema.locationDistricts.slug, slug)))
          .limit(1)
      )[0];

    if (!district) throw new Error(`Failed to create or find district ${d.name}`);
    districtIdByRegionAndName.set(key, district.id);
    if (inserted) districtsInserted++;
  }

  // 4. Towns: seed one town per district - its capital - marked as the
  // district capital. This is a deliberately bounded starting point (see
  // README note in ghanaLocations.ts); additional towns can be inserted into
  // location_towns later (e.g. from a future EMIS/census import) without any
  // schema change.
  let townsInserted = 0;
  for (const d of GHANA_DISTRICTS) {
    const key = `${d.region}||${normalizeKey(d.name)}`;
    const districtId = districtIdByRegionAndName.get(key);
    if (!districtId) continue;

    const slug = slugify(d.capital);
    const [inserted] = await db
      .insert(schema.locationTowns)
      .values({
        districtId,
        name: d.capital,
        slug,
        isDistrictCapital: true,
        sourceReference: GHANA_SOURCE_REFERENCE,
      })
      .onConflictDoNothing({
        target: [schema.locationTowns.districtId, schema.locationTowns.slug],
      })
      .returning();

    if (inserted) townsInserted++;
  }

  const regionCount = (await db.select({ value: count() }).from(schema.locationRegions))[0].value;
  const districtCount = (await db.select({ value: count() }).from(schema.locationDistricts))[0].value;
  const townCount = (await db.select({ value: count() }).from(schema.locationTowns))[0].value;
  const schoolCount = (await db.select({ value: count() }).from(schema.locationSchools))[0].value;

  console.log("\nSeed complete. Current row counts:");
  console.log(`  countries: 1 (Ghana)`);
  console.log(`  regions:   ${regionCount}`);
  console.log(`  districts: ${districtCount} (inserted this run: ${districtsInserted}, skipped as dupes in source: ${districtsSkipped})`);
  console.log(`  towns:     ${townCount} (inserted this run: ${townsInserted})`);
  console.log(`  schools:   ${schoolCount} (none seeded yet - schema is ready for a future EMIS/bulk import)`);
}

main()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

// Imports Primary/JHS/Kindergarten schools into location_schools from
// db/seedData/ghanaSchools.json (see extraction notes in that file's header).
// Idempotent: safe to re-run (onConflictDoNothing on district+slug).
//
// Run with: npx tsx db/seedGhanaSchools.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as schema from "./schema";
import { slugify } from "../lib/utils";
import { GHANA_DISTRICTS } from "./seedData/ghanaLocations";
import schoolsData from "./seedData/ghanaSchools.json";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const SCHOOLS_SOURCE_REFERENCE =
  "OpenStreetMap contributors, via Humanitarian Data Exchange (HDX) dataset " +
  "'Education Facilities of Ghana' (hotosm_gha_education_facilities, Humanitarian " +
  "OpenStreetMap Team, admin-boundary-joined export), retrieved 2026-09. " +
  "Crowd-sourced OSM data: coverage is uneven (denser in urban areas) and not " +
  "exhaustive; excludes Senior High Schools by name-pattern filtering.";

interface SchoolRecord {
  region: string;
  district: string;
  town: string | null;
  name: string;
  ownership: string | null;
  levelBand: string | null;
  lon: number | null;
  lat: number | null;
}

const schools = schoolsData as SchoolRecord[];

function normalizeDistrict(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(municipal|metropolitan|metropolis|assembly|district)$/i, "")
    .replace(/[-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Manual aliases for known naming variants between the OSM admin-boundary
// export and our canonical GHANA_DISTRICTS list (renames, spelling variants,
// suffix differences, or a capital-town name used in place of the district
// name). Verified by manual lookup against ghanaLocations.ts - see the
// district-matching dry run in this session's notes.
const DISTRICT_ALIASES: Record<string, string> = {
  sagnerigu: "sagnarigu",
  "kasena nankana east": "kassena nankana",
  "lower manya": "lower manya krobo",
  "bolga east": "bolgatanga east",
  "atwima nwabiagya south": "atwima nwabiagya",
  dormaa: "dormaa central",
  mfantseman: "mfantsiman",
  "akwapem north": "akuapim north",
  "akwapem south": "akuapim south",
  "upper manya": "upper manya krobo",
  "sekyere afram plains north": "sekyere afram plains",
  "wassa amenfi west": "amenfi west",
  "wassa amenfi central": "amenfi central",
  "asene akroso manso": "asene manso akroso",
  "assin fosu": "assin central",
  "nsawam adoagyiri": "nsawam adoagyire",
};
// Known ambiguous/unresolvable district names left over after aliasing
// (e.g. a pre-split district name that could map to more than one current
// district) - schools in these are intentionally skipped and reported as
// incomplete coverage rather than guessed.

async function main() {
  console.log("Seeding Ghana schools (Primary/JHS/Kindergarten)...");
  console.log(`Source: ${SCHOOLS_SOURCE_REFERENCE}`);
  console.log(`Candidate records: ${schools.length}`);

  // Preload regions -> districts -> ids
  const regions = await db.select().from(schema.locationRegions);
  const districts = await db.select().from(schema.locationDistricts);
  const regionNameById = new Map(regions.map((r) => [r.id, r.name]));
  const districtIdByKey = new Map<string, string>();
  for (const d of districts) {
    const regionName = regionNameById.get(d.regionId);
    if (!regionName) continue;
    const key = `${regionName.toLowerCase()}||${normalizeDistrict(d.name)}`;
    districtIdByKey.set(key, d.id);
  }
  // Sanity check against the canonical source list (defensive; DB should
  // already match ghanaLocations.ts from the location seed run).
  if (districts.length !== GHANA_DISTRICTS.length) {
    console.warn(
      `Warning: DB has ${districts.length} districts but GHANA_DISTRICTS has ${GHANA_DISTRICTS.length}. Run seedGhanaLocations.ts first.`
    );
  }

  // Preload existing towns per district (districtId+slug -> townId)
  const towns = await db.select().from(schema.locationTowns);
  const townIdByDistrictSlug = new Map<string, string>();
  for (const t of towns) {
    townIdByDistrictSlug.set(`${t.districtId}||${t.slug}`, t.id);
  }

  let unresolvedDistrict = 0;
  const unresolvedDistrictCounts = new Map<string, number>();

  // Resolve each candidate's districtId up front; collect any new
  // town/community rows we need to create first (batched), then batch the
  // school inserts. This keeps round trips to the DB roughly proportional to
  // chunk count rather than record count.
  interface Resolved {
    region: string;
    districtId: string;
    townSlug: string | null;
    townName: string | null;
    name: string;
    slug: string;
    ownership: string | null;
    levelBand: string | null;
  }
  const resolved: Resolved[] = [];

  for (const s of schools) {
    let norm = normalizeDistrict(s.district);
    norm = DISTRICT_ALIASES[norm] ?? norm;
    const districtKey = `${s.region.toLowerCase()}||${norm}`;
    const districtId = districtIdByKey.get(districtKey);

    if (!districtId) {
      unresolvedDistrict++;
      const k = `${s.region} || ${s.district}`;
      unresolvedDistrictCounts.set(k, (unresolvedDistrictCounts.get(k) ?? 0) + 1);
      continue;
    }

    resolved.push({
      region: s.region,
      districtId,
      townSlug: s.town ? slugify(s.town) : null,
      townName: s.town,
      name: s.name,
      slug: slugify(s.name),
      ownership: s.ownership,
      levelBand: s.levelBand,
    });
  }

  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // 1. Batch-create any missing towns.
  const newTownKeys = new Map<string, { districtId: string; name: string; slug: string }>();
  for (const r of resolved) {
    if (!r.townSlug || !r.townName) continue;
    const key = `${r.districtId}||${r.townSlug}`;
    if (townIdByDistrictSlug.has(key) || newTownKeys.has(key)) continue;
    newTownKeys.set(key, { districtId: r.districtId, name: r.townName, slug: r.townSlug });
  }

  let townsCreated = 0;
  const newTownValues = [...newTownKeys.values()];
  for (const batch of chunk(newTownValues, 200)) {
    const insertedTowns = await db
      .insert(schema.locationTowns)
      .values(
        batch.map((t) => ({
          districtId: t.districtId,
          name: t.name,
          slug: t.slug,
          isDistrictCapital: false,
          sourceReference: SCHOOLS_SOURCE_REFERENCE,
        }))
      )
      .onConflictDoNothing({
        target: [schema.locationTowns.districtId, schema.locationTowns.slug],
      })
      .returning();
    townsCreated += insertedTowns.length;
  }

  // Re-fetch all towns for the districts we touched so newly created (and
  // any pre-existing but not-yet-cached) towns are resolvable.
  if (newTownValues.length > 0) {
    const touchedDistrictIds = [...new Set(newTownValues.map((t) => t.districtId))];
    for (const batch of chunk(touchedDistrictIds, 100)) {
      const rows = await db
        .select()
        .from(schema.locationTowns)
        .where(inArray(schema.locationTowns.districtId, batch));
      for (const t of rows) {
        townIdByDistrictSlug.set(`${t.districtId}||${t.slug}`, t.id);
      }
    }
  }

  // 2. Batch-insert schools.
  let inserted = 0;
  const byRegion = new Map<string, number>();
  const regionByDistrictSlug = new Map<string, string>();
  for (const r of resolved) {
    regionByDistrictSlug.set(`${r.districtId}||${r.slug}`, r.region);
  }

  for (const batch of chunk(resolved, 200)) {
    const insertedSchools = await db
      .insert(schema.locationSchools)
      .values(
        batch.map((r) => ({
          districtId: r.districtId,
          townId: r.townSlug ? townIdByDistrictSlug.get(`${r.districtId}||${r.townSlug}`) : undefined,
          name: r.name,
          slug: r.slug,
          ownership: r.ownership,
          levelBand: r.levelBand,
          sourceReference: SCHOOLS_SOURCE_REFERENCE,
        }))
      )
      .onConflictDoNothing({
        target: [schema.locationSchools.districtId, schema.locationSchools.slug],
      })
      .returning({ districtId: schema.locationSchools.districtId, slug: schema.locationSchools.slug });

    inserted += insertedSchools.length;
    for (const row of insertedSchools) {
      const region = regionByDistrictSlug.get(`${row.districtId}||${row.slug}`);
      if (region) byRegion.set(region, (byRegion.get(region) ?? 0) + 1);
    }
  }

  const duplicateSkipped = resolved.length - inserted;

  const totalSchools = (await db.select({ value: count() }).from(schema.locationSchools))[0].value;
  const totalTowns = (await db.select({ value: count() }).from(schema.locationTowns))[0].value;

  console.log("\nSeed complete.");
  console.log(`  inserted this run:        ${inserted}`);
  console.log(`  duplicate skipped:        ${duplicateSkipped}`);
  console.log(`  unresolved district:      ${unresolvedDistrict}`);
  console.log(`  new towns created:        ${townsCreated}`);
  console.log(`  location_schools total:   ${totalSchools}`);
  console.log(`  location_towns total:     ${totalTowns}`);

  console.log("\nInserted by region:");
  for (const [region, n] of [...byRegion.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${region}: ${n}`);
  }

  if (unresolvedDistrictCounts.size > 0) {
    console.log("\nUnresolved districts (schools skipped, NOT invented/guessed):");
    for (const [k, n] of [...unresolvedDistrictCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k}: ${n}`);
    }
  }
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

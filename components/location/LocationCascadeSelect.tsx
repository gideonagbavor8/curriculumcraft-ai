"use client";

// Reusable cascading, searchable Region -> District -> Town/Community -> School
// picker backed by /api/locations. Emits plain string values (region/district/
// community/schoolName) matching the existing `LocationProfile` shape used by
// the local-context engine, so no downstream code needs to change.
//
// Each field is a free-text input with a live type-ahead suggestion list:
// - Region: always searches the full region list for the given country.
// - District: searches within the selected region once one is chosen.
// - Town/Community: searches within the selected district once one is chosen.
// - School: searches within the selected district (school data is sparse
//   today, so this mostly behaves like a plain text field until a school
//   database import is added).
//
// Typing a value that doesn't match a suggestion is still accepted (teachers
// can always enter a real place we haven't captured yet) - selecting a
// suggestion just fills the field and unlocks the next level's search.

import { useEffect, useRef, useState } from "react";

interface LocationItem {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface LocationCascadeValue {
  region: string;
  district: string;
  community: string;
  schoolName: string;
}

interface LocationCascadeSelectProps {
  value: LocationCascadeValue;
  onChange: (value: LocationCascadeValue) => void;
  countryCode?: string;
  className?: string;
}

function useLocationSuggestions(
  level: "region" | "district" | "town" | "school",
  query: string,
  parentId: string | null,
  enabled: boolean
) {
  const [items, setItems] = useState<LocationItem[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ level, limit: "20" });
      if (query) params.set("q", query);
      if (level === "region") params.set("country", "GH");
      if (level === "district" && parentId) params.set("regionId", parentId);
      if (level === "town" && parentId) params.set("districtId", parentId);
      if (level === "school" && parentId) params.set("districtId", parentId);

      fetch(`/api/locations?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => {
          if (json?.success) setItems(json.data.items);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") console.error("Location search failed:", err);
        });
    }, 150);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [level, query, parentId, enabled]);

  return items;
}

function LocationField({
  label,
  placeholder,
  value,
  onInputChange,
  onSelect,
  items,
  disabled,
  disabledHint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onInputChange: (value: string) => void;
  onSelect: (item: LocationItem) => void;
  items: LocationItem[];
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={disabled ? disabledHint : placeholder}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      {open && !disabled && items.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-lg text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  onSelect(item);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-green-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100"
              >
                {item.name}
                {typeof item.capital === "string" && item.capital !== item.name && (
                  <span className="text-gray-400 dark:text-gray-500"> · {item.capital}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Standalone searchable region field (no district/town/school cascade) - used
 * where only a per-lesson region override is needed, e.g. the Lesson Builder's
 * "Region for local examples" field.
 */
export function RegionSearchInput({
  value,
  onChange,
  placeholder = "Start typing a region, e.g. Volta",
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}) {
  const items = useLocationSuggestions("region", value, null, true);
  return (
    <LocationField
      label="Region for local examples"
      placeholder={placeholder}
      value={value}
      items={items}
      onInputChange={onChange}
      onSelect={(item) => onChange(item.name)}
    />
  );
}

export default function LocationCascadeSelect({
  value,
  onChange,
  className,
}: LocationCascadeSelectProps) {
  const [regionId, setRegionId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);

  const regionItems = useLocationSuggestions("region", value.region, null, true);
  const districtItems = useLocationSuggestions("district", value.district, regionId, Boolean(regionId));
  const townItems = useLocationSuggestions("town", value.community, districtId, Boolean(districtId));
  const schoolItems = useLocationSuggestions("school", value.schoolName, districtId, Boolean(districtId));

  // Resolve regionId/districtId from a previously-saved profile (loaded by
  // name only) so the cascade below it becomes searchable without the user
  // having to re-pick the region/district from a suggestion.
  useEffect(() => {
    if (!value.region || regionId) return;
    const controller = new AbortController();
    fetch(`/api/locations?level=region&q=${encodeURIComponent(value.region)}&limit=5`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        const match = json?.data?.items?.find(
          (item: LocationItem) => item.name.toLowerCase() === value.region.toLowerCase()
        );
        if (match) setRegionId(match.id);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.region]);

  useEffect(() => {
    if (!regionId || !value.district || districtId) return;
    const controller = new AbortController();
    fetch(
      `/api/locations?level=district&regionId=${regionId}&q=${encodeURIComponent(value.district)}&limit=5`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((json) => {
        const match = json?.data?.items?.find(
          (item: LocationItem) => item.name.toLowerCase() === value.district.toLowerCase()
        );
        if (match) setDistrictId(match.id);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId, value.district]);

  return (
    <div className={className ?? "space-y-4"}>
      <LocationField
        label="Region"
        placeholder="Start typing a region, e.g. Volta"
        value={value.region}
        items={regionItems}
        onInputChange={(next) => {
          setRegionId(null);
          setDistrictId(null);
          onChange({ region: next, district: "", community: "", schoolName: value.schoolName });
        }}
        onSelect={(item) => {
          setRegionId(item.id);
          setDistrictId(null);
          onChange({ region: item.name, district: "", community: "", schoolName: value.schoolName });
        }}
      />
      <LocationField
        label="District / Municipality"
        placeholder="e.g. Ho Municipal"
        value={value.district}
        items={districtItems}
        disabled={!value.region}
        disabledHint="Pick a region first"
        onInputChange={(next) => {
          setDistrictId(null);
          onChange({ ...value, district: next, community: "" });
        }}
        onSelect={(item) => {
          setDistrictId(item.id);
          onChange({ ...value, district: item.name, community: "" });
        }}
      />
      <LocationField
        label="Town / Community"
        placeholder="e.g. Abutia"
        value={value.community}
        items={townItems}
        disabled={!value.district}
        disabledHint="Pick a district first"
        onInputChange={(next) => onChange({ ...value, community: next })}
        onSelect={(item) => onChange({ ...value, community: item.name })}
      />
      <LocationField
        label="School Name (optional)"
        placeholder="e.g. Abutia D/A Primary School — type freely if yours isn't listed yet"
        value={value.schoolName}
        items={schoolItems}
        onInputChange={(next) => onChange({ ...value, schoolName: next })}
        onSelect={(item) => onChange({ ...value, schoolName: item.name })}
      />
    </div>
  );
}

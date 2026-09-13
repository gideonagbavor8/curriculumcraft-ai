import type { LocalContextProvider, RegionProfile } from "./types";

// Ghana's 16 administrative regions with well-established, broadly-known local
// details (markets, water bodies, crops, festivals, occupations, transport,
// landmarks, community activities). Deliberately conservative: only includes
// facts that are widely documented and uncontroversial, to avoid inventing or
// misattributing local detail. Each region has several options per category so
// the rotation logic (see rotation.ts) can avoid repeating the same example.
const REGIONS: RegionProfile[] = [
  {
    name: "Greater Accra",
    aliases: ["Accra", "GAR"],
    examples: {
      market: ["Makola Market", "Kaneshie Market", "Agbogbloshie Market"],
      waterBody: ["the Gulf of Guinea coastline", "the Odaw River"],
      landform: ["the Accra coastal plains"],
      crop: ["vegetables", "cassava", "maize"],
      festival: ["Homowo festival"],
      occupation: ["fishing", "trading", "port work at Tema Harbour"],
      transport: ["trotro", "the Accra-Tema Motorway", "ferries at Tema Harbour"],
      landmark: ["Independence Square", "Tema Harbour", "Jamestown Lighthouse"],
      activity: ["beach clean-up", "market trading", "community durbar"],
    },
  },
  {
    name: "Ashanti",
    aliases: ["Kumasi"],
    examples: {
      market: ["Kejetia Market", "Adum Market"],
      waterBody: ["Lake Bosomtwe"],
      landform: ["the forested Ashanti uplands"],
      crop: ["cocoa", "plantain", "cassava"],
      festival: ["Akwasidae festival"],
      occupation: ["cocoa farming", "kente weaving", "trading"],
      transport: ["trotro", "the Kumasi-Accra highway"],
      landmark: ["Manhyia Palace", "Kejetia Market", "Lake Bosomtwe"],
      activity: ["kente weaving demonstration", "cocoa harvest", "durbar of chiefs"],
    },
  },
  {
    name: "Central",
    aliases: ["Cape Coast"],
    examples: {
      market: ["Kotokuraba Market"],
      waterBody: ["the Gulf of Guinea", "the Kakum River"],
      landform: ["the Cape Coast coastline", "Kakum forest canopy"],
      crop: ["coconut", "oil palm", "cassava"],
      festival: ["Fetu Afahye festival"],
      occupation: ["fishing", "coconut farming", "tourism guiding"],
      transport: ["fishing canoes", "trotro"],
      landmark: ["Cape Coast Castle", "Elmina Castle", "Kakum National Park canopy walkway"],
      activity: ["canopy walk", "fish smoking at the harbour", "durbar"],
    },
  },
  {
    name: "Western",
    aliases: ["Takoradi", "Sekondi"],
    examples: {
      market: ["Takoradi Market Circle"],
      waterBody: ["the Ankobra River", "the Tano River", "the Gulf of Guinea"],
      landform: ["the Western coastline", "rainforest reserves"],
      crop: ["cocoa", "rubber", "oil palm"],
      festival: ["Kundum festival"],
      occupation: ["fishing", "oil and gas work", "timber logging", "rubber tapping"],
      transport: ["fishing canoes", "trotro"],
      landmark: ["Takoradi Harbour", "Axim beaches"],
      activity: ["cocoa harvest", "canoe building", "durbar"],
    },
  },
  {
    name: "Western North",
    aliases: ["Sefwi"],
    examples: {
      market: ["Sefwi Wiawso market"],
      waterBody: ["the Tano River"],
      landform: ["Sefwi forest reserves"],
      crop: ["cocoa", "rubber"],
      festival: ["Kundum festival"],
      occupation: ["cocoa farming", "timber work"],
      transport: ["trotro"],
      landmark: ["Bibiani forest reserve"],
      activity: ["cocoa harvest", "community farming day"],
    },
  },
  {
    name: "Volta",
    aliases: ["Ho"],
    examples: {
      market: ["Ho Market"],
      waterBody: ["Lake Volta", "the Keta Lagoon", "the Volta River"],
      landform: ["the Wli Waterfalls", "the Volta hills"],
      crop: ["cassava", "yam", "maize"],
      festival: ["Hogbetsotso festival"],
      occupation: ["fishing on Lake Volta", "cassava farming", "trading"],
      transport: ["boats on Lake Volta", "the Adomi Bridge", "trotro"],
      landmark: ["the Adomi Bridge", "Wli Waterfalls", "Akosombo Dam"],
      activity: ["fishing on Lake Volta", "durbar", "cassava processing"],
    },
  },
  {
    name: "Oti",
    aliases: ["Krachi", "Nkwanta"],
    examples: {
      market: ["Nkwanta market"],
      waterBody: ["the Oti River", "Lake Volta"],
      landform: ["the Oti river valley"],
      crop: ["yam", "maize", "cassava"],
      festival: ["Hogbetsotso festival"],
      occupation: ["yam farming", "fishing"],
      transport: ["boats on the Oti River", "trotro"],
      landmark: ["the Oti River"],
      activity: ["yam festival preparation", "fishing"],
    },
  },
  {
    name: "Eastern",
    aliases: ["Koforidua"],
    examples: {
      market: ["Koforidua Central Market"],
      waterBody: ["the Volta River", "Lake Volta near Akosombo"],
      landform: ["the Akwapim hills", "Boti Falls"],
      crop: ["cocoa", "oil palm", "citrus"],
      festival: ["Odwira festival"],
      occupation: ["cocoa farming", "trading"],
      transport: ["trotro"],
      landmark: ["Boti Falls", "Aburi Botanical Gardens", "Akosombo Dam"],
      activity: ["cocoa harvest", "hiking in the Akwapim hills", "durbar"],
    },
  },
  {
    name: "Northern",
    aliases: ["Tamale"],
    examples: {
      market: ["Tamale Central Market"],
      waterBody: ["the White Volta River"],
      landform: ["the northern savannah"],
      crop: ["yam", "shea nuts", "groundnuts", "millet"],
      festival: ["Damba festival"],
      occupation: ["yam farming", "shea butter processing", "guinea fowl rearing"],
      transport: ["motorbikes", "trotro"],
      landmark: ["Mole National Park"],
      activity: ["shea butter processing", "yam harvest", "Damba durbar"],
    },
  },
  {
    name: "Savannah",
    aliases: ["Damongo"],
    examples: {
      market: ["Damongo market"],
      waterBody: ["the White Volta River"],
      landform: ["the savannah grasslands"],
      crop: ["yam", "groundnuts"],
      festival: ["Damba festival"],
      occupation: ["yam farming", "wildlife guiding"],
      transport: ["motorbikes"],
      landmark: ["Mole National Park", "Larabanga Mosque"],
      activity: ["safari walk", "yam harvest"],
    },
  },
  {
    name: "North East",
    aliases: ["Nalerigu", "Gambaga"],
    examples: {
      market: ["Nalerigu market"],
      waterBody: ["the White Volta River"],
      landform: ["the Gambaga escarpment"],
      crop: ["millet", "groundnuts"],
      festival: ["Damba festival"],
      occupation: ["millet farming", "groundnut farming"],
      transport: ["motorbikes"],
      landmark: ["the Gambaga escarpment"],
      activity: ["millet harvest", "community farming day"],
    },
  },
  {
    name: "Upper East",
    aliases: ["Bolgatanga", "Bolga"],
    examples: {
      market: ["Bolgatanga Market"],
      waterBody: ["the White Volta River", "the Tono irrigation dam"],
      landform: ["the Upper East savannah"],
      crop: ["millet", "sorghum", "groundnuts"],
      festival: ["Feok festival"],
      occupation: ["basket weaving", "dry-season irrigation farming", "leatherwork"],
      transport: ["bicycles", "motorbikes"],
      landmark: ["Paga crocodile pond", "Bolgatanga Market"],
      activity: ["basket weaving", "dry-season farming", "visiting the Paga crocodile pond"],
    },
  },
  {
    name: "Upper West",
    aliases: ["Wa"],
    examples: {
      market: ["Wa Market"],
      waterBody: ["the Black Volta River"],
      landform: ["the Upper West savannah"],
      crop: ["millet", "groundnuts", "shea nuts"],
      festival: ["Kobine festival"],
      occupation: ["shea butter processing", "groundnut farming"],
      transport: ["bicycles", "motorbikes"],
      landmark: ["Wechiau Hippo Sanctuary"],
      activity: ["shea butter processing", "hippo-watching at Wechiau"],
    },
  },
  {
    name: "Bono",
    aliases: ["Sunyani"],
    examples: {
      market: ["Sunyani Market"],
      waterBody: ["the Tano River"],
      landform: ["the Bono forest-savannah transition"],
      crop: ["cashew", "cocoa", "yam"],
      festival: ["Apoo festival"],
      occupation: ["cashew farming", "cocoa farming"],
      transport: ["trotro"],
      landmark: ["Sunyani Market"],
      activity: ["cashew harvest", "durbar"],
    },
  },
  {
    name: "Bono East",
    aliases: ["Techiman"],
    examples: {
      market: ["Techiman Market"],
      waterBody: ["the Tano River"],
      landform: ["the Bono East plains"],
      crop: ["yam", "tomatoes", "maize"],
      festival: ["Apoo festival"],
      occupation: ["yam farming", "tomato trading"],
      transport: ["trotro"],
      landmark: ["Techiman Market"],
      activity: ["market trading day", "yam harvest"],
    },
  },
  {
    name: "Ahafo",
    aliases: ["Goaso"],
    examples: {
      market: ["Goaso market"],
      waterBody: ["the Tano River"],
      landform: ["the Ahafo forest belt"],
      crop: ["cocoa", "plantain"],
      festival: ["Apoo festival"],
      occupation: ["cocoa farming"],
      transport: ["trotro"],
      landmark: ["Goaso forest reserve"],
      activity: ["cocoa harvest", "community farming day"],
    },
  },
];

export const GHANA_PROVIDER: LocalContextProvider = {
  countryCode: "GH",
  countryName: "Ghana",
  regions: REGIONS,
  // These four are the ones the task explicitly flags as over-represented in
  // generic AI output - deprioritised (never excluded) in the fallback pool.
  overusedRegionNames: ["Greater Accra", "Ashanti", "Central", "Western"],
};

export function findRegion(name: string): RegionProfile | undefined {
  const normalized = name.trim().toLowerCase();
  return REGIONS.find(
    (region) =>
      region.name.toLowerCase() === normalized ||
      region.aliases?.some((alias) => alias.toLowerCase() === normalized)
  );
}

export const GHANA_REGION_NAMES = REGIONS.map((region) => region.name);

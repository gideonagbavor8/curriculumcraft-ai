"use client";

import { useEffect, useState } from "react";
import type { CurriculumCatalog } from "@/types/curriculum";

export function useCurriculumCatalog() {
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/curriculum/catalog", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load curriculum catalog");
        }
        setCatalog(result.data);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load curriculum catalog"
        );
      });

    return () => controller.abort();
  }, []);

  return { catalog, error };
}
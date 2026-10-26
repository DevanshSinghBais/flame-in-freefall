import type { NtrsRecord } from "@/lib/ntrs-provider-core";

export type MetadataCoverage = {
  total: number;
  fields: Array<{ key: string; label: string; available: number; missing: number }>;
};

export function getMetadataCoverage(records: readonly NtrsRecord[]): MetadataCoverage {
  const checks: Array<{ key: string; label: string; has: (record: NtrsRecord) => boolean }> = [
    { key: "abstract", label: "Abstract", has: (record) => Boolean(record.abstract?.trim()) },
    { key: "authors", label: "Author names", has: (record) => record.authors.length > 0 },
    { key: "publicationDate", label: "Publication date", has: (record) => Boolean(record.publicationDate?.trim()) },
    { key: "documentType", label: "Document type", has: (record) => Boolean(record.documentType?.trim()) },
    { key: "center", label: "NASA center", has: (record) => Boolean(record.center?.trim()) },
    { key: "doi", label: "DOI", has: (record) => Boolean(record.doi?.trim()) },
    { key: "subjectCategories", label: "Subject categories", has: (record) => record.subjectCategories.length > 0 },
  ];
  return {
    total: records.length,
    fields: checks.map(({ key, label, has }) => {
      const available = records.reduce((count, record) => count + Number(has(record)), 0);
      return { key, label, available, missing: records.length - available };
    }),
  };
}

export function countByLabel(labels: readonly (string | undefined)[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const raw of labels) {
    const label = raw?.trim() || "Not provided by NASA NTRS";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function publicationYear(publicationDate: string | undefined): string | undefined {
  if (!publicationDate) return undefined;
  const parsed = new Date(publicationDate);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return String(parsed.getUTCFullYear());
}

export type ScenarioAssumptions = {
  gravityContext: string;
  fuelDescription: string;
  oxidizerDescription: string;
  ambientPressureKpa: string;
  initialTemperatureK: string;
  oxygenVolumePercent: string;
  durationSeconds: string;
};

export type ScenarioParameter = { name: string; value: string; unit?: string };

export type ScenarioFingerprint = {
  label: string;
  value: string;
  kind: "context" | "composition" | "environment" | "duration";
};

export function buildScenarioSearchQuery(input: ScenarioAssumptions): string {
  const gravity = input.gravityContext.toLocaleLowerCase().includes("micro")
    ? "microgravity"
    : input.gravityContext.toLocaleLowerCase().includes("partial")
      ? "partial gravity"
      : input.gravityContext.toLocaleLowerCase().includes("earth")
        ? "earth gravity"
        : "combustion";
  const terms = [
    gravity,
    input.fuelDescription.trim(),
    input.oxidizerDescription.trim(),
    input.oxygenVolumePercent.trim() ? `${input.oxygenVolumePercent.trim()} oxygen` : "",
    input.ambientPressureKpa.trim() ? `${input.ambientPressureKpa.trim()} kPa pressure` : "",
  ].filter(Boolean);
  return terms.join(" ").slice(0, 300) || "microgravity combustion";
}

export function getScenarioFingerprint(input: ScenarioAssumptions): ScenarioFingerprint[] {
  const values: Array<[string, string, ScenarioFingerprint["kind"]]> = [
    ["Gravity context", input.gravityContext, "context"],
    ["Fuel or material", input.fuelDescription, "composition"],
    ["Oxidizer", input.oxidizerDescription, "composition"],
    ["Oxygen concentration", input.oxygenVolumePercent ? `${input.oxygenVolumePercent}% vol` : "", "environment"],
    ["Ambient pressure", input.ambientPressureKpa ? `${input.ambientPressureKpa} kPa` : "", "environment"],
    ["Initial temperature", input.initialTemperatureK ? `${input.initialTemperatureK} K` : "", "environment"],
    ["Planned duration", input.durationSeconds ? `${input.durationSeconds} s` : "", "duration"],
  ];
  return values
    .map(([label, value, kind]) => ({ label, value: value.trim(), kind }))
    .filter(({ value }) => Boolean(value));
}

export function getScenarioCompletion(input: ScenarioAssumptions): { provided: number; total: number; percentage: number } {
  const total = 7;
  const provided = getScenarioFingerprint(input).length;
  return { provided, total, percentage: Math.round((provided / total) * 100) };
}

export type EvidenceGap = {
  key: string;
  label: string;
  detail: string;
  severity: "priority" | "watch" | "covered";
};

export type EvidenceGapAnalysis = {
  total: number;
  abstractCoverage: number;
  fullTextCoverage: number;
  datedRecords: number;
  distinctCenters: number;
  gaps: EvidenceGap[];
};

export function getEvidenceGapAnalysis(records: readonly NtrsRecord[]): EvidenceGapAnalysis {
  const total = records.length;
  const abstractCoverage = records.filter((record) => Boolean(record.abstract?.trim())).length;
  const fullTextCoverage = records.filter((record) => record.fullTextLinks.length > 0).length;
  const datedRecords = records.filter((record) => Boolean(publicationYear(record.publicationDate))).length;
  const distinctCenters = new Set(records.map((record) => record.center?.trim()).filter(Boolean)).size;
  const gaps: EvidenceGap[] = [];
  const add = (key: string, label: string, detail: string, severity: EvidenceGap["severity"]) => gaps.push({ key, label, detail, severity });

  if (!total) return { total, abstractCoverage, fullTextCoverage, datedRecords, distinctCenters, gaps: [{ key: "empty", label: "No returned evidence", detail: "Run a broader query before interpreting this coverage view.", severity: "priority" }] };
  if (abstractCoverage < total) add("abstract", "Abstract coverage", `${total - abstractCoverage} of ${total} records have no abstract in this response.`, "priority");
  else add("abstract", "Abstract coverage", `All ${total} returned records include an abstract for first-pass review.`, "covered");
  if (fullTextCoverage === 0) add("full-text", "Full-text access", "No returned record includes a NASA full-text download link.", "priority");
  else if (fullTextCoverage < total) add("full-text", "Full-text access", `${fullTextCoverage} of ${total} records include a returned full-text link.`, "watch");
  else add("full-text", "Full-text access", `All ${total} returned records include a full-text link.`, "covered");
  if (datedRecords < total) add("date", "Publication timeline", `${total - datedRecords} records are missing a publication date in the provider response.`, "watch");
  else add("date", "Publication timeline", "Every returned record has a publication date for timeline analysis.", "covered");
  if (distinctCenters < 2) add("center", "Institutional breadth", "The sample represents one or zero NASA centers; broaden the query before treating it as representative.", "watch");
  else add("center", "Institutional breadth", `${distinctCenters} NASA centers are represented in this returned sample.`, "covered");
  return { total, abstractCoverage, fullTextCoverage, datedRecords, distinctCenters, gaps };
}

export type ResearchLandscapeSummary = {
  total: number;
  abstractCount: number;
  fullTextCount: number;
  datedCount: number;
  yearRange: { first: string; last: string } | null;
  centers: Array<{ label: string; count: number }>;
  subjects: Array<{ label: string; count: number }>;
};

export function getResearchLandscapeSummary(records: readonly NtrsRecord[]): ResearchLandscapeSummary {
  const years = records.map((record) => publicationYear(record.publicationDate)).filter((year): year is string => Boolean(year)).sort();
  return {
    total: records.length,
    abstractCount: records.filter((record) => Boolean(record.abstract?.trim())).length,
    fullTextCount: records.filter((record) => record.fullTextLinks.length > 0).length,
    datedCount: years.length,
    yearRange: years.length ? { first: years[0], last: years[years.length - 1] } : null,
    centers: countByLabel(records.map((record) => record.center)).slice(0, 6),
    subjects: countByLabel(records.flatMap((record) => record.subjectCategories)).slice(0, 6),
  };
}

/**
 * Creates a portable record of user-entered assumptions. It intentionally
 * contains no model output, measured value, or inferred combustion result.
 */
export function createScenarioAssumptionRecord(input: ScenarioAssumptions) {
  const text = (value: string) => value.trim();
  const parameters: ScenarioParameter[] = [];
  const gravityContext = text(input.gravityContext);
  const fuelDescription = text(input.fuelDescription);
  const oxidizerDescription = text(input.oxidizerDescription);
  const ambientPressureKpa = text(input.ambientPressureKpa);
  const initialTemperatureK = text(input.initialTemperatureK);
  const oxygenVolumePercent = text(input.oxygenVolumePercent);
  const durationSeconds = text(input.durationSeconds);

  if (gravityContext) parameters.push({ name: "Gravity context", value: gravityContext });
  if (fuelDescription) parameters.push({ name: "Fuel description", value: fuelDescription });
  if (oxidizerDescription) parameters.push({ name: "Oxidizer description", value: oxidizerDescription });
  if (ambientPressureKpa) parameters.push({ name: "Ambient pressure", value: ambientPressureKpa, unit: "kPa" });
  if (initialTemperatureK) parameters.push({ name: "Initial temperature", value: initialTemperatureK, unit: "K" });
  if (oxygenVolumePercent) parameters.push({ name: "Oxygen concentration", value: oxygenVolumePercent, unit: "vol %" });
  if (durationSeconds) parameters.push({ name: "Planned duration", value: durationSeconds, unit: "s" });

  return {
    title: "User-defined combustion scenario assumptions",
    recordType: "user-assumptions",
    provenance: "User-entered assumptions; not published evidence or measured experimental data.",
    parameters,
    calculations: [] as string[],
    limitation: "No physical combustion model, prediction, or NASA simulation has been applied.",
  };
}

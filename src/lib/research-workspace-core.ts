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

import test from "node:test";
import assert from "node:assert/strict";
import { buildScenarioSearchQuery, countByLabel, createScenarioAssumptionRecord, getEvidenceGapAnalysis, getMetadataCoverage, getResearchLandscapeSummary, getScenarioCompletion, getScenarioFingerprint, publicationYear } from "../src/lib/research-workspace-core.ts";

const record = (overrides = {}) => ({
  id: "20210015913",
  canonicalUrl: "https://ntrs.nasa.gov/citations/20210015913",
  title: "A traceable NTRS record",
  abstract: "An abstract returned by the provider.",
  authors: ["Author, A."],
  publicationDate: "2021-04-02T00:00:00Z",
  documentType: "Technical Memorandum",
  center: "Glenn Research Center",
  subjectCategories: ["Combustion"],
  fullTextLinks: [],
  ...overrides,
});

test("metadata coverage counts only fields present on returned records", () => {
  const result = getMetadataCoverage([
    record(),
    record({ abstract: undefined, authors: [], publicationDate: undefined, documentType: undefined, center: undefined, doi: undefined, subjectCategories: [] }),
  ]);
  assert.equal(result.total, 2);
  assert.deepEqual(result.fields.map(({ key, available, missing }) => [key, available, missing]), [
    ["abstract", 1, 1], ["authors", 1, 1], ["publicationDate", 1, 1],
    ["documentType", 1, 1], ["center", 1, 1], ["doi", 0, 2], ["subjectCategories", 1, 1],
  ]);
});

test("metadata groupings are deterministic and mark missing provider fields", () => {
  assert.deepEqual(countByLabel(["Presentation", "Presentation", "Conference Paper", undefined]), [
    { label: "Presentation", count: 2 },
    { label: "Conference Paper", count: 1 },
    { label: "Not provided by NASA NTRS", count: 1 },
  ]);
  assert.equal(publicationYear("2019-08-01T00:00:00Z"), "2019");
  assert.equal(publicationYear(undefined), undefined);
  assert.equal(publicationYear("not-a-date"), undefined);
});

test("scenario export preserves assumptions, units, and makes no predicted outputs", () => {
  const result = createScenarioAssumptionRecord({
    gravityContext: "Microgravity (user-selected context)",
    fuelDescription: "User description",
    oxidizerDescription: "",
    ambientPressureKpa: "101.3",
    initialTemperatureK: "",
    oxygenVolumePercent: "21",
    durationSeconds: "30",
  });
  assert.equal(result.recordType, "user-assumptions");
  assert.match(result.provenance, /User-entered assumptions/);
  assert.deepEqual(result.parameters, [
    { name: "Gravity context", value: "Microgravity (user-selected context)" },
    { name: "Fuel description", value: "User description" },
    { name: "Ambient pressure", value: "101.3", unit: "kPa" },
    { name: "Oxygen concentration", value: "21", unit: "vol %" },
    { name: "Planned duration", value: "30", unit: "s" },
  ]);
  assert.deepEqual(result.calculations, []);
  assert.match(result.limitation, /No physical combustion model/);
  assert.equal(Object.hasOwn(result, "outcome"), false);
});

test("scenario fingerprint creates a bounded NASA vocabulary query", () => {
  const input = {
    gravityContext: "Microgravity (user-selected context)",
    fuelDescription: "methane", oxidizerDescription: "air",
    ambientPressureKpa: "101.3", initialTemperatureK: "", oxygenVolumePercent: "21", durationSeconds: "30",
  };
  assert.equal(buildScenarioSearchQuery(input), "microgravity methane air 21 oxygen 101.3 kPa pressure");
  assert.equal(getScenarioCompletion(input).percentage, 86);
  assert.equal(getScenarioFingerprint(input).length, 6);
});

test("evidence gap analysis exposes actionable limits in a returned sample", () => {
  const result = getEvidenceGapAnalysis([
    record({ abstract: undefined, fullTextLinks: [], center: "Glenn Research Center" }),
    record({ id: "20210015914", abstract: "A second abstract.", fullTextLinks: [{ label: "PDF", url: "https://ntrs.nasa.gov/api/citations/20210015914/downloads/1" }], center: "Ames Research Center" }),
  ]);
  assert.equal(result.total, 2);
  assert.equal(result.abstractCoverage, 1);
  assert.equal(result.distinctCenters, 2);
  assert.equal(result.gaps.find((gap) => gap.key === "abstract")?.severity, "priority");
  assert.equal(result.gaps.find((gap) => gap.key === "center")?.severity, "covered");
});

test("research landscape summarizes real metadata dimensions without outcomes", () => {
  const result = getResearchLandscapeSummary([
    record(),
    record({ id: "20210015914", publicationDate: "2022-04-02T00:00:00Z", center: "Ames Research Center", subjectCategories: ["Combustion", "Fire safety"], fullTextLinks: [{ label: "PDF", url: "https://ntrs.nasa.gov/api/citations/20210015914/downloads/1" }] }),
  ]);
  assert.deepEqual(result.yearRange, { first: "2021", last: "2022" });
  assert.equal(result.abstractCount, 2);
  assert.equal(result.fullTextCount, 1);
  assert.deepEqual(result.centers.map(({ label, count }) => ({ label, count })), [{ label: "Ames Research Center", count: 1 }, { label: "Glenn Research Center", count: 1 }]);
  assert.equal(result.subjects[0].label, "Combustion");
  assert.equal(result.subjects[0].count, 2);
});

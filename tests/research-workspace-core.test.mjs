import test from "node:test";
import assert from "node:assert/strict";
import { countByLabel, createScenarioAssumptionRecord, getMetadataCoverage, publicationYear } from "../src/lib/research-workspace-core.ts";

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

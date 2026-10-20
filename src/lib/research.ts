export type ResearchRecord = {
  id: string;
  title: string;
  summary: string;
  area: string;
  recordType: string;
  href: string;
  source: "NASA Science";
};

// A small, hand-verified source set for this interface milestone. This is not
// a complete or live research index; every summary links to its NASA source.
export const researchRecords: ResearchRecord[] = [
  {
    id: "acme",
    title: "Advanced Combustion via Microgravity Experiments (ACME)",
    summary:
      "NASA describes ACME as a set of studies of gaseous flames, with goals that include combustion understanding and spacecraft fire prevention.",
    area: "Combustion research",
    recordType: "Mission overview",
    href: "https://science.nasa.gov/mission/acme/",
    source: "NASA Science",
  },
  {
    id: "s-flame",
    title: "Structure and Response of Spherical Flames (s-Flame)",
    summary:
      "Investigation of the structure and dynamics, including extinction, of soot-free and sooty spherical flames.",
    area: "Flame structure",
    recordType: "Investigation",
    href: "https://science.nasa.gov/biological-physical/investigations/s-flame/",
    source: "NASA Science",
  },
  {
    id: "cld-flame",
    title: "Coflow Laminar Diffusion Flame (CLD Flame)",
    summary:
      "NASA describes measurements of flame characteristics including size, structure, temperature, soot, and stability.",
    area: "Flame structure",
    recordType: "Investigation",
    href: "https://science.nasa.gov/biological-physical/investigations/cld-flame/",
    source: "NASA Science",
  },
  {
    id: "bre",
    title: "Burning Rate Emulator (BRE)",
    summary:
      "A spacecraft fire-safety investigation focused on materials flammability, extinction behavior, and sustained combustion conditions.",
    area: "Materials flammability",
    recordType: "Investigation",
    href: "https://science.nasa.gov/biological-physical/investigations/bre/",
    source: "NASA Science",
  },
  {
    id: "e-field",
    title: "Electric-Field Effects on Laminar Diffusion Flames",
    summary:
      "Investigation of flame ions and how electric fields can influence non-premixed flames.",
    area: "Flame control",
    recordType: "Investigation",
    href: "https://science.nasa.gov/biological-physical/investigations/e-field-flames/",
    source: "NASA Science",
  },
  {
    id: "flame-design",
    title: "Flame Design",
    summary:
      "NASA describes research on soot production and control in oxygen-enriched combustion and robust, soot-free flames.",
    area: "Soot and emissions",
    recordType: "Investigation",
    href: "https://science.nasa.gov/biological-physical/investigations/flame-design/",
    source: "NASA Science",
  },
];

export const nasaFlameComparisonSource =
  "https://science.nasa.gov/image-detail/candle-flames-3/";

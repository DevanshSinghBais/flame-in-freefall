import { ArrowUpRight, Droplets, Flame, Gauge, Orbit, Shield, Sparkles, Wind } from "lucide-react";
import { FlameComparison } from "@/components/flame-comparison";
import { nasaFlameComparisonSource, researchRecords } from "@/lib/research";

const facts = [
  {
    icon: Wind,
    label: "FLOW",
    title: "Buoyancy leaves the picture",
    text: "On Earth, warm gases rise and shape a teardrop flame. In microgravity, reduced convective flow allows a more spherical flame form.",
    source: nasaFlameComparisonSource,
  },
  {
    icon: Flame,
    label: "MORPHOLOGY",
    title: "Spherical flames become a test bed",
    text: "NASA’s s-Flame investigation examines the structure and dynamics of soot-free and sooty spherical flames, including extinction.",
    source: researchRecords.find((record) => record.id === "s-flame")?.href ?? nasaFlameComparisonSource,
  },
  {
    icon: Shield,
    label: "SAFETY",
    title: "Extinction is as important as ignition",
    text: "The Burning Rate Emulator investigation focuses on materials flammability, extinction behavior, and the conditions needed for sustained combustion.",
    source: researchRecords.find((record) => record.id === "bre")?.href ?? nasaFlameComparisonSource,
  },
  {
    icon: Droplets,
    label: "SOOT",
    title: "Soot is a research variable",
    text: "NASA studies flame size, structure, temperature, soot, and stability separately because visual appearance can hide different combustion behavior.",
    source: researchRecords.find((record) => record.id === "cld-flame")?.href ?? nasaFlameComparisonSource,
  },
  {
    icon: Gauge,
    label: "CONTROL",
    title: "The environment can tune a flame",
    text: "NASA’s Flame Design work explores soot production and control, while electric-field studies examine ways to influence non-premixed flames.",
    source: researchRecords.find((record) => record.id === "flame-design")?.href ?? nasaFlameComparisonSource,
  },
  {
    icon: Orbit,
    label: "MISSION",
    title: "This is spacecraft fire science",
    text: "The ACME program connects fundamental gaseous-flame research with the practical goal of understanding and preventing fires in spacecraft.",
    source: researchRecords.find((record) => record.id === "acme")?.href ?? nasaFlameComparisonSource,
  },
];

const researchQuestions = [
  ["01", "How does a flame transport heat when buoyancy is reduced?"],
  ["02", "What conditions make a flame extinguish instead of spread?"],
  ["03", "How do soot, oxygen, pressure, and flow reshape the flame?"],
  ["04", "Which materials and geometries remain safe inside a spacecraft?"],
];

const scienceLenses = [
  ["SIZE", "How large is the reaction zone?", "Flame size is one of the characteristics NASA’s CLD Flame work measures when comparing flame behavior."],
  ["STRUCTURE", "What shape does the flame take?", "Shape reveals how heat and mass move through the flame, especially when buoyant flow is reduced."],
  ["TEMPERATURE", "Where is heat concentrated?", "Temperature is tracked alongside structure and stability because a brighter flame is not automatically a safer flame."],
  ["SOOT", "What particles are produced?", "Soot production and control are explicit research targets in NASA’s Flame Design work."],
  ["STABILITY", "Does combustion continue?", "Sustained combustion and extinction define the boundary between a flame that persists and one that goes out."],
];

export function ResearchOverviewBrief() {
  return <div className="research-overview-brief">
    <section className="overview-hero-panel" aria-labelledby="overview-hero-title">
      <div className="overview-hero-copy"><p className="eyebrow">FLAME IN FREEFALL · THE SCIENCE IN ONE VIEW</p><h1 id="overview-hero-title">When buoyancy disappears, fire changes its language.</h1><p>Microgravity combustion is a controlled window into flame structure, extinction, soot, and spacecraft safety. This overview gathers the NASA-backed ideas that define the field.</p><div className="overview-hero-tags"><span><span className="overview-tag-dot is-ember" /> Reduced gravity</span><span><span className="overview-tag-dot is-cyan" /> Flame structure</span><span><span className="overview-tag-dot is-green" /> Fire safety</span></div></div>
      <div className="overview-orbit-visual" aria-hidden="true"><span className="overview-orbit-ring ring-one" /><span className="overview-orbit-ring ring-two" /><span className="overview-orbit-core"><Flame size={34} /></span><span className="overview-orbit-spark spark-one" /><span className="overview-orbit-spark spark-two" /></div>
    </section>

    <section className="overview-stat-grid" aria-label="Microgravity combustion at a glance">
      <div><strong>{researchRecords.length}</strong><span>NASA investigation threads</span><small>linked below</small></div>
      <div><strong>2</strong><span>contrasting flame regimes</span><small>buoyant and diffusion-dominated</small></div>
      <div><strong>4</strong><span>core safety questions</span><small>ignition · spread · extinction · soot</small></div>
      <div><strong>1 g → μg</strong><span>the defining comparison</span><small>same fire, different transport</small></div>
    </section>

    <section className="overview-section-block" aria-labelledby="overview-facts-title"><div className="overview-section-heading"><div><p className="eyebrow">THE FIELD NOTES</p><h2 id="overview-facts-title">Six facts that make microgravity combustion different</h2></div><span>NASA-backed orientation</span></div><div className="overview-fact-grid">{facts.map(({ icon: Icon, label, title, text, source }) => <article className="overview-fact-card" key={title}><div className="overview-fact-icon"><Icon size={18} aria-hidden="true" /></div><p className="semantic-label">{label}</p><h3>{title}</h3><p>{text}</p><a href={source} target="_blank" rel="noreferrer">Read NASA source <ArrowUpRight size={13} aria-hidden="true" /></a></article>)}</div></section>

    <section className="overview-lenses-panel" aria-labelledby="overview-lenses-title"><div className="overview-section-heading"><div><p className="eyebrow">HOW TO READ A FLAME</p><h2 id="overview-lenses-title">Five measurement lenses</h2><p>A flame is more than a shape. Researchers separate these signals so an observation can become a defensible scientific question.</p></div><span>Observation → evidence</span></div><div className="overview-lenses-grid">{scienceLenses.map(([label, title, text], index) => <article key={label}><span>{String(index + 1).padStart(2, "0")}</span><p className="semantic-label">{label}</p><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="overview-research-map" aria-labelledby="overview-research-map-title"><div className="overview-section-heading"><div><p className="eyebrow">NASA INVESTIGATION MAP</p><h2 id="overview-research-map-title">The field is a network, not one experiment</h2><p>These linked NASA investigations approach the same combustion problem from different angles: gaseous flames, materials, soot, control, and safety.</p></div><span>{researchRecords.length} source threads</span></div><div className="overview-research-list">{researchRecords.map((record, index) => <a className="overview-research-card" href={record.href} target="_blank" rel="noreferrer" key={record.id}><span className="overview-research-number">{String(index + 1).padStart(2, "0")}</span><div><p className="semantic-label">{record.area}</p><h3>{record.title}</h3><p>{record.summary}</p><small>{record.source} · {record.recordType} <ArrowUpRight size={12} aria-hidden="true" /></small></div></a>)}</div></section>

    <section className="overview-visual-block" aria-labelledby="overview-visual-title"><div className="overview-section-heading"><div><p className="eyebrow">THE SIGNATURE IMAGE</p><h2 id="overview-visual-title">One photograph, two combustion worlds</h2><p>NASA’s ACME comparison is the visual anchor for the field: a buoyant teardrop flame on Earth beside a rounded blue flame in microgravity.</p></div><a href={nasaFlameComparisonSource} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14} aria-hidden="true" /></a></div><FlameComparison compact title="Earth gravity vs microgravity" /></section>

    <section className="overview-question-panel" aria-labelledby="overview-questions-title"><div><p className="eyebrow">THE RESEARCH FRONTIER</p><h2 id="overview-questions-title">What scientists are trying to understand</h2><p>Every question below connects a visible flame behavior to a real engineering concern: reliable combustion science and safer spacecraft.</p></div><ol>{researchQuestions.map(([number, question]) => <li key={number}><span>{number}</span><strong>{question}</strong></li>)}</ol></section>

    <section className="overview-source-strip" aria-label="Overview source note"><Sparkles size={17} aria-hidden="true" /><p>All facts on this page are short orientation summaries linked to NASA source descriptions. They provide context for the workspace; they are not measurements, a solver, or a substitute for reading the source records.</p><a href="https://science.nasa.gov/mission/acme/" target="_blank" rel="noreferrer">Start with ACME <ArrowUpRight size={13} aria-hidden="true" /></a></section>
  </div>;
}

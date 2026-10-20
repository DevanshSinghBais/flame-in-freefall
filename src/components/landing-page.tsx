import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, GitCompare, MessageCircle, Search } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { FlameComparison } from "@/components/flame-comparison";
import { researchRecords } from "@/lib/research";

export function LandingPage() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-image-wrap" role="img" aria-label="Illustrative concept artwork depicting a luminous spherical flame inside an experimental combustion chamber; this is not NASA photography.">
            <Image
              src="/images/microgravity-flame-concept.png"
              alt=""
              fill
              priority
              sizes="(max-width: 760px) 100vw, 68vw"
              className="hero-image"
            />
          </div>
          <div className="hero-field" aria-hidden="true" />
          <div className="page-width hero-content">
            <div className="hero-copy">
              <h1 id="landing-title"><span>FIRE BEHAVES</span><span>DIFFERENTLY</span><span>BEYOND EARTH.</span></h1>
              <p className="hero-lede">Without gravity, buoyancy-driven flow changes how flames move, mix, and burn.</p>
              <p className="hero-description">FLAME IN FREEFALL helps researchers find, compare, and interpret published evidence on microgravity combustion.</p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/workspace/overview">Explore Research <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link className="button button-secondary" href="/workspace/ai-research-assistant"><MessageCircle size={17} aria-hidden="true" /> Ask the Research Assistant</Link>
              </div>
            </div>
          </div>
          <p className="hero-image-caption">Illustrative concept image · not NASA photography</p>
          <div className="hero-bottom-rule" aria-hidden="true" />
        </section>

        <section className="science-story page-width" aria-labelledby="science-story-heading">
          <div className="science-copy">
            <h2 className="section-title" id="science-story-heading">A different kind of flame</h2>
            <p>On Earth, gravity-driven buoyant convection moves hot gases upward, shaping familiar flame forms. In microgravity, that upward flow is greatly reduced, changing the conditions in which flames develop.</p>
            <p>Comparing these environments helps researchers investigate flame structure, soot, stability, and combustion behavior.</p>
            <Link className="text-link" href="/about">About the science <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <FlameComparison />
        </section>

        <section className="discovery-section" aria-labelledby="discovery-heading">
          <div className="page-width discovery-grid">
            <div className="preview-device">
              <div className="research-preview" aria-label="Preview of the research source interface">
              <div className="preview-window-bar">
                <span className="preview-window-dot" aria-hidden="true" />
                <span>FLAME IN FREEFALL <span className="preview-bar-slash">/</span> RESEARCH OVERVIEW</span>
                <span className="preview-source-count">INTERFACE CONCEPT</span>
              </div>
              <div className="preview-search"><Search size={16} aria-hidden="true" /><span>microgravity combustion flame structure</span><ArrowRight size={15} aria-hidden="true" /></div>
              <div className="preview-filters"><span>Research area</span><span>Environment</span><span>Source type</span></div>
              <div className="preview-results">
                {researchRecords.slice(0, 3).map((record) => (
                  <a href={record.href} target="_blank" rel="noreferrer" className="preview-result" key={record.id}>
                    <span className="preview-record-icon"><BookOpen size={16} aria-hidden="true" /></span>
                    <span className="preview-record-main"><strong>{record.title}</strong><small>{record.source} · {record.recordType}</small></span>
                    <ArrowUpRight className="preview-record-arrow" size={16} aria-hidden="true" />
                  </a>
                ))}
              </div>
                <p className="preview-disclaimer">Curated NASA Science source pages · this is not live search output</p>
              </div>
            </div>
            <div className="discovery-copy">
              <h2 className="section-title" id="discovery-heading">Find. Compare. Deepen understanding.</h2>
              <p>Search traceable research sources, compare the conditions they describe, and keep published evidence distinct from generated interpretation.</p>
              <ul className="discovery-list">
                <li><span className="discovery-icon"><Search size={19} aria-hidden="true" /></span><span><strong>Discover relevant research</strong><small>Start with NASA’s microgravity combustion source pages.</small></span></li>
                <li><span className="discovery-icon"><GitCompare size={19} aria-hidden="true" /></span><span><strong>Compare evidence</strong><small>Read source context before drawing comparisons.</small></span></li>
                <li><span className="discovery-icon"><MessageCircle size={19} aria-hidden="true" /></span><span><strong>Get research support</strong><small>Ask for a source-grounded synthesis with links to the NASA records used.</small></span></li>
              </ul>
              <div className="discovery-evidence-key" aria-label="How the workspace separates source evidence and AI interpretation">
                <div><span className="semantic-label">PUBLISHED EVIDENCE</span><p>Traceable source wording and metadata.</p></div>
                <div><span className="semantic-label">AI INTERPRETATION</span><p>Generated synthesis, kept distinct and cited.</p></div>
              </div>
              <Link className="text-link" href="/sources">View the curated sources <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="closing-section" aria-labelledby="closing-heading">
          <div className="closing-atmosphere" aria-hidden="true"><img src="https://www.nasa.gov/wp-content/uploads/2023/03/iss066e152100.jpg" alt="" /></div>
          <div className="page-width closing-content">
            <h2 className="section-title" id="closing-heading">Same questions.<br />A larger perspective.</h2>
            <p>Explore traceable research into combustion under conditions beyond Earth.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/workspace/overview">Explore Research <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link className="button button-secondary" href="/workspace/ai-research-assistant"><MessageCircle size={17} aria-hidden="true" /> Ask the Research Assistant</Link>
            </div>
          </div>
          <a className="closing-photo-credit" href="https://www.nasa.gov/image-article/sun-rises-above-horizon-illuminating-earth/" target="_blank" rel="noreferrer">Earth photographed from the ISS · NASA</a>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}

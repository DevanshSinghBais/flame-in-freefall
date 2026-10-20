import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { nasaFlameComparisonSource } from "@/lib/research";

const nasaCandleFlameImage = "https://science.nasa.gov/wp-content/uploads/2023/09/candle-flames.gif";

export function FlameComparison({ compact = false, title }: { compact?: boolean; title?: string }) {
  return (
    <section className={`comparison-section${compact ? " comparison-compact" : ""}`} id="flame-comparison" aria-labelledby={compact ? "comparison-heading-dashboard" : undefined} aria-label={compact ? undefined : "NASA image comparing candle flames on Earth and in microgravity"}>
      {compact && <div className="comparison-heading-row">
        <h2 className="section-title" id="comparison-heading-dashboard">{title ?? "Flame morphology comparison"}</h2>
        <span className="comparison-source-label">NASA SOURCE IMAGE</span>
      </div>}
      <figure className="comparison-photo">
        <a className="comparison-photo-link" href={nasaFlameComparisonSource} target="_blank" rel="noreferrer" aria-label="Open the NASA image source for the flame comparison">
          <img
            src={nasaCandleFlameImage}
            alt="NASA image comparing a yellow, teardrop-shaped candle flame at 1 g with a spherical blue candle flame in microgravity."
            loading={compact ? "lazy" : "eager"}
            decoding="async"
          />
          <span className="comparison-photo-open" aria-hidden="true"><ArrowUpRight size={15} /></span>
        </a>
        <figcaption className="comparison-photo-caption">
          <span><strong>On Earth</strong><small>Gravity-driven buoyant convection</small></span>
          <span><strong>In microgravity</strong><small>Reduced convective flow</small></span>
        </figcaption>
      </figure>
      <p className="comparison-disclaimer">NASA image credit · ACME flame comparison. <Link href={nasaFlameComparisonSource} target="_blank" rel="noreferrer">Read the source description <ArrowUpRight size={13} aria-hidden="true" /></Link></p>
    </section>
  );
}

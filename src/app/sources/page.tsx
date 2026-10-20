import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { researchRecords } from "@/lib/research";

export const metadata: Metadata = { title: "Research Sources" };

export default function SourcesPage() {
  return (
    <>
      <PublicHeader />
      <main className="public-text-page page-width sources-page">
        <p className="eyebrow">TRACEABLE SOURCE PAGES</p>
        <h1>Research sources</h1>
        <p className="public-page-lede">A small, hand-verified starter set of NASA Science pages. It is not a complete or live research index. Each summary links directly to its source; author, date, DOI, and section metadata are not shown here unless verified in the source record.</p>
        <div className="source-list-heading"><span>Source record</span><span>Research area</span><span>Source</span></div>
        <div className="source-list">
          {researchRecords.map((record) => (
            <article className="source-list-row" key={record.id}>
              <div><span className="source-type-label">{record.recordType}</span><h2>{record.title}</h2><p>{record.summary}</p></div>
              <span className="source-area">{record.area}</span>
              <a href={record.href} target="_blank" rel="noreferrer">NASA Science <ArrowUpRight size={14} aria-hidden="true" /></a>
            </article>
          ))}
        </div>
        <p className="source-integrity-note">Scientific statements in FLAME IN FREEFALL must remain connected to traceable source records. This preview does not show experimental measurements, generated analysis, or unsupported citations.</p>
        <Link className="text-link" href="/workspace/overview">Back to research overview <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </main>
      <PublicFooter />
    </>
  );
}

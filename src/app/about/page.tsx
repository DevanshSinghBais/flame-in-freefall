import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { FlameComparison } from "@/components/flame-comparison";

export const metadata: Metadata = { title: "About the Science" };

export default function AboutPage() {
  return (
    <>
      <PublicHeader />
      <main className="public-text-page page-width">
        <p className="eyebrow">ABOUT THE SCIENCE</p>
        <h1>Combustion, seen in a different flow.</h1>
        <p className="public-page-lede">Gravity shapes the way hot gases move around a flame. Studying flames in microgravity changes that flow environment and gives researchers a way to examine combustion behavior under different conditions.</p>
        <FlameComparison />
        <section className="about-source-note">
          <h2 className="section-title">A traceable starting point</h2>
          <p>NASA’s Advanced Combustion via Microgravity Experiments (ACME) includes studies of gaseous flames conducted in the Combustion Integrated Rack aboard the International Space Station. The mission page describes research goals that include improved fuel efficiency, reduced pollutant production, and spacecraft fire prevention through materials-flammability research.</p>
          <a className="text-link" href="https://science.nasa.gov/mission/acme/" target="_blank" rel="noreferrer">Read NASA’s ACME mission page <ArrowUpRight size={15} aria-hidden="true" /></a>
        </section>
        <div className="about-actions"><Link className="button button-primary" href="/workspace/overview">Explore Research <ArrowUpRight size={16} aria-hidden="true" /></Link><Link className="button button-secondary" href="/sources">Browse research sources</Link></div>
      </main>
      <PublicFooter />
    </>
  );
}

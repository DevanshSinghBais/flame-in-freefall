"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

export function EditorialReveals() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const revealTargets = document.querySelectorAll<HTMLElement>([
      "main > section:not(.landing-hero)",
      ".discovery-grid > *",
      ".closing-content",
      ".source-list-row",
      ".overview-stat-grid > div",
      ".overview-fact-card",
      ".overview-lenses-grid > article",
      ".overview-research-card",
      ".auth-panel",
      ".research-detail-header",
      ".detail-metadata",
      ".detail-abstract",
      ".detail-full-text",
      ".workspace-heading",
      ".research-search-section",
      ".tool-panel",
    ].join(","));

    const visibleTargets = new WeakSet<HTMLElement>();
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        currentObserver.unobserve(element);
        if (visibleTargets.has(element)) return;
        visibleTargets.add(element);
        gsap.fromTo(element, { y: 18, autoAlpha: 0 }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.72,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
        });
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -36px 0px" });

    revealTargets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

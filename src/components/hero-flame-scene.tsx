"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type HeroSceneMotion = {
  pointerX: number;
  pointerY: number;
  hover: number;
  scroll: number;
};

const HeroFlameCanvas = dynamic(
  () => import("@/components/three/hero-flame-canvas").then((module) => module.HeroFlameCanvas),
  { ssr: false },
);

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("The interactive hero scene failed; retaining the static visual fallback.", error, errorInfo);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroFlameScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  const motion = useRef<HeroSceneMotion>({ pointerX: 0, pointerY: 0, hover: 0, scroll: 0 });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const hero = stageRef.current?.closest(".landing-hero");
    if (!hero) return;

    const scrollAnimation = gsap.to(motion.current, {
      scroll: 1,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 1.2,
      },
    });

    return () => {
      scrollAnimation.scrollTrigger?.kill();
      scrollAnimation.kill();
    };
  }, []);

  const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    motion.current.pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    motion.current.pointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  };

  return (
    <div
      className="hero-3d-stage"
      ref={stageRef}
      aria-hidden="true"
      onPointerEnter={() => { motion.current.hover = 1; }}
      onPointerLeave={() => {
        motion.current.hover = 0;
        motion.current.pointerX = 0;
        motion.current.pointerY = 0;
      }}
      onPointerMove={updatePointer}
    >
      <div className="hero-scene-fallback">
        <span className="hero-scene-fallback-orbit hero-scene-fallback-orbit-a" />
        <span className="hero-scene-fallback-orbit hero-scene-fallback-orbit-b" />
        <span className="hero-scene-fallback-flame" />
      </div>
      <SceneErrorBoundary>
        <HeroFlameCanvas motion={motion} />
      </SceneErrorBoundary>
      <div className="hero-scene-label">
        <span>MICROGRAVITY / 3D MODEL</span>
        <span>INTERACTIVE FLAME STUDY</span>
      </div>
    </div>
  );
}

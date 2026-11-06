"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { HeroSceneMotion } from "@/components/hero-flame-scene";

const palette = ["#d36b3f", "#d9ad64", "#6f9c7d", "#7383ad"].map((color) => new THREE.Color(color));

function paletteColor(time: number, offset = 0) {
  const cycle = (((time * 0.11 + offset) % palette.length) + palette.length) % palette.length;
  const index = Math.floor(cycle);
  const blend = THREE.MathUtils.smoothstep(cycle - index, 0, 1);
  return palette[index].clone().lerp(palette[(index + 1) % palette.length], blend);
}

function FlameCore({ motion }: { motion: React.RefObject<HeroSceneMotion> }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (!group.current || !material.current) return;
    const time = clock.elapsedTime;
    const sceneMotion = motion.current;
    const hover = sceneMotion?.hover ?? 0;
    const scroll = sceneMotion?.scroll ?? 0;
    group.current.rotation.x += delta * (0.12 + hover * 0.08);
    group.current.rotation.y += delta * (0.18 + hover * 0.13);
    group.current.rotation.z = Math.sin(time * 0.18) * 0.12;
    group.current.rotation.x += Math.sin(time * 0.2) * delta * 0.05;
    group.current.position.y = Math.sin(time * 0.7) * 0.06;
    group.current.scale.setScalar(1 + hover * 0.035 - scroll * 0.08);
    material.current.uniforms.uTime.value = time;
    material.current.uniforms.uHover.value = THREE.MathUtils.damp(material.current.uniforms.uHover.value, hover, 2, delta);
  });

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uHover: { value: 0 } }), []);

  return (
    <group ref={group}>
      <mesh castShadow>
        <sphereGeometry args={[0.72, 72, 56]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={`
            uniform float uTime;
            varying vec3 vNormal;
            varying vec3 vView;
            varying vec3 vPosition;
            void main() {
              vec3 displaced = position + normal * (
                sin(position.y * 5.2 + uTime * 0.7) * 0.018 +
                sin(position.x * 4.1 - uTime * 0.5) * 0.012
              );
              vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vView = normalize(-viewPosition.xyz);
              vPosition = position;
              gl_Position = projectionMatrix * viewPosition;
            }
          `}
          fragmentShader={`
            uniform float uTime;
            uniform float uHover;
            varying vec3 vNormal;
            varying vec3 vView;
            varying vec3 vPosition;
            vec3 palette(float phase) {
              float i = floor(mod(phase, 4.0));
              float f = smoothstep(0.0, 1.0, fract(phase));
              vec3 ember = vec3(0.82, 0.24, 0.09);
              vec3 gold = vec3(0.88, 0.62, 0.28);
              vec3 cyan = vec3(0.28, 0.55, 0.39);
              vec3 violet = vec3(0.35, 0.43, 0.68);
              if (i < 1.0) return mix(ember, gold, f);
              if (i < 2.0) return mix(gold, cyan, f);
              if (i < 3.0) return mix(cyan, violet, f);
              return mix(violet, ember, f);
            }
            void main() {
              vec3 n = normalize(vNormal);
              float fresnel = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.2);
              float phase = uTime * 0.08 + uHover * 0.38;
              vec3 hue = palette(phase);
              vec3 underside = palette(phase + 1.45);
              float gradient = smoothstep(-0.72, 0.76, vPosition.y + sin(uTime * 0.7) * 0.08);
              float flowingBands = 0.5 + 0.5 * sin(vPosition.y * 5.5 + atan(vPosition.z, vPosition.x) * 2.0 - uTime * 0.75);
              vec3 color = mix(underside * 0.66, hue, gradient);
              color = mix(color, hue * 1.3, flowingBands * 0.1);
              color *= 0.58 + 0.22 * max(dot(n, normalize(vec3(0.45, 0.65, 1.0))), 0.0);
              color += hue * fresnel * 0.9;
              gl_FragColor = vec4(color, 1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }
          `}
        />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[0.72, 48, 36]} />
        <meshPhysicalMaterial
          color="#c6d9c7"
          metalness={0.78}
          roughness={0.13}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.07}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OrbitingRings({ motion }: { motion: React.RefObject<HeroSceneMotion> }) {
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const ringC = useRef<THREE.Mesh>(null);
  const ringRefs = [ringA, ringB, ringC];

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const hover = motion.current?.hover ?? 0;
    ringRefs.forEach((ring, index) => {
      if (!ring.current) return;
      const direction = index === 1 ? -1 : 1;
      ring.current.rotation.x = [0.85, 1.3, 0.48][index] + Math.sin(time * (0.16 + index * 0.025) + index) * 0.46;
      ring.current.rotation.y += delta * direction * (0.11 + index * 0.025 + hover * 0.07);
      ring.current.rotation.z = Math.sin(time * (0.12 + index * 0.035) + index * 2) * 0.32;
      const material = ring.current.material as THREE.MeshPhysicalMaterial;
      material.color.copy(paletteColor(time, index * 0.72 + hover * 0.12));
      material.emissive.copy(material.color);
    });
  });

  return (
    <>
      <mesh ref={ringA}>
        <torusGeometry args={[1.06, 0.012, 10, 128]} />
        <meshPhysicalMaterial color={palette[0]} emissive={palette[0]} emissiveIntensity={0.54} metalness={0.88} roughness={0.2} />
      </mesh>
      <mesh ref={ringB}>
        <torusGeometry args={[1.24, 0.008, 8, 128]} />
        <meshPhysicalMaterial color={palette[2]} emissive={palette[2]} emissiveIntensity={0.62} metalness={0.92} roughness={0.16} />
      </mesh>
      <mesh ref={ringC}>
        <torusGeometry args={[0.91, 0.006, 8, 128]} />
        <meshPhysicalMaterial color={palette[1]} emissive={palette[1]} emissiveIntensity={0.62} metalness={0.82} roughness={0.24} />
      </mesh>
    </>
  );
}

function ParticleField() {
  const points = useRef<THREE.Points>(null);
  const count = 72;
  const { positions, colors, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = Array.from({ length: count }, (_, index) => ({
      angle: (index / count) * Math.PI * 2,
      radius: 1.28 + ((index * 37) % 100) / 260,
      speed: 0.04 + ((index * 17) % 100) / 1500,
      offset: ((index * 23) % count) / count,
    }));
    return { positions, colors, seeds };
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      const seed = seeds[index];
      const angle = seed.angle + time * seed.speed + Math.sin(time * 0.15 + seed.offset * 8) * 0.22;
      const slot = index * 3;
      positions[slot] = Math.cos(angle) * seed.radius;
      positions[slot + 1] = Math.sin(angle * 0.8 + time * 0.12) * 0.38;
      positions[slot + 2] = Math.sin(angle) * seed.radius * 0.62;
      const color = paletteColor(time, seed.offset);
      colors[slot] = color.r;
      colors[slot + 1] = color.g;
      colors[slot + 2] = color.b;
    }
    if (points.current) {
      points.current.geometry.attributes.position.needsUpdate = true;
      points.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} sizeAttenuation vertexColors transparent opacity={0.88} depthWrite={false} />
    </points>
  );
}

function AnimatedLighting() {
  const warm = useRef<THREE.PointLight>(null);
  const cool = useRef<THREE.PointLight>(null);
  const warmColor = useMemo(() => new THREE.Color(), []);
  const coolColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (warm.current) {
      warm.current.position.set(Math.sin(time * 0.32) * 1.4, 0.7 + Math.cos(time * 0.29) * 0.4, 1.4);
      warm.current.color.copy(warmColor.copy(paletteColor(time, 0.04)));
      warm.current.intensity = 13 + Math.sin(time * 0.62) * 2;
    }
    if (cool.current) {
      cool.current.position.set(Math.cos(time * 0.27 + 1) * 1.5, Math.sin(time * 0.24) * 0.7, -0.5);
      cool.current.color.copy(coolColor.copy(paletteColor(time, 0.54)));
      cool.current.intensity = 9 + Math.cos(time * 0.48) * 1.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} color="#b7d8ed" />
      <directionalLight position={[-3, 4, 4]} intensity={1.35} color="#f4f4ff" />
      <pointLight ref={warm} color="#ff9b58" intensity={13} distance={7} decay={2} />
      <pointLight ref={cool} color="#56d4f2" intensity={9} distance={7} decay={2} />
    </>
  );
}

function SceneContents({ motion }: { motion: React.RefObject<HeroSceneMotion> }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const reducedMotion = useReducedMotion();

  useFrame((_, delta) => {
    if (!group.current) return;
    const sceneMotion = motion.current;
    if (!sceneMotion || reducedMotion) return;
    const time = performance.now() / 1000;
    const hover = THREE.MathUtils.damp(sceneMotion.hover, sceneMotion.hover, 4, delta);
    const scroll = sceneMotion.scroll;
    group.current.rotation.y += delta * (0.035 + hover * 0.04) * (1 - scroll * 0.55);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, sceneMotion.pointerY * -0.12, 3.5, delta);
    group.current.rotation.z = Math.sin(time * 0.12) * 0.025 + sceneMotion.pointerX * -0.035;
    target.set(sceneMotion.pointerX * 0.12, -sceneMotion.pointerY * 0.08, 4.1 + scroll * 0.45);
    camera.position.lerp(target, 1 - Math.exp(-delta * 1.4));
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <AnimatedLighting />
      <group ref={group} position={[0.12, 0, 0]}>
        <FlameCore motion={motion} />
        <OrbitingRings motion={motion} />
        <ParticleField />
      </group>
    </>
  );
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);
  return reducedMotion;
}

export function HeroFlameCanvas({ motion }: { motion: React.RefObject<HeroSceneMotion> }) {
  const reducedMotion = useReducedMotion();

  return (
    <Canvas
      className="hero-flame-canvas"
      camera={{ position: [0, 0, 4.1], fov: 36 }}
      dpr={[1, 1.35]}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      fallback={null}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
      }}
    >
      <Suspense fallback={null}>
        <SceneContents motion={motion} />
      </Suspense>
    </Canvas>
  );
}

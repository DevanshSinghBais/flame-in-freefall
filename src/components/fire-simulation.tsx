"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  calculateFireSimulation,
  DEFAULT_FIRE_SIMULATION_INPUTS,
  type FireSimulationInputs,
} from "@/lib/fire-simulation-core";

type SliderDefinition = {
  key: keyof FireSimulationInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  help: string;
};

const sliders: SliderDefinition[] = [
  { key: "gravityPercent", label: "Gravity level", min: 0, max: 100, step: 1, unit: "% of Earth g", help: "Controls the transition from a rounded microgravity flame to a buoyant Earth-like form." },
  { key: "oxygenPercent", label: "Oxygen concentration", min: 15, max: 60, step: 1, unit: "vol %", help: "Changes the visual brightness and color response." },
  { key: "fuelRatePercent", label: "Fuel rate", min: 10, max: 100, step: 1, unit: "%", help: "Changes the illustrative flame scale." },
  { key: "airflowPercent", label: "Airflow", min: 0, max: 100, step: 1, unit: "%", help: "Adds directional lean and visual disturbance." },
  { key: "sootPercent", label: "Soot tendency", min: 0, max: 100, step: 1, unit: "%", help: "Shifts the illustrative color toward a warmer luminous flame." },
  { key: "pressureKpa", label: "Ambient pressure", min: 30, max: 150, step: 1, unit: "kPa", help: "Adjusts the visual intensity within this conceptual model." },
];

function formatValue(definition: SliderDefinition, value: number): string {
  return `${value}${definition.unit ? ` ${definition.unit}` : ""}`;
}

const presets = [
  { key: "baseline", label: "Microgravity baseline", values: DEFAULT_FIRE_SIMULATION_INPUTS },
  { key: "earth", label: "Earth gravity", values: { ...DEFAULT_FIRE_SIMULATION_INPUTS, gravityPercent: 100, airflowPercent: 22 } },
  { key: "high-flow", label: "High-flow oxygen", values: { ...DEFAULT_FIRE_SIMULATION_INPUTS, gravityPercent: 0, oxygenPercent: 34, fuelRatePercent: 76, airflowPercent: 68, sootPercent: 56 } },
] as const;

function inputsMatch(left: FireSimulationInputs, right: FireSimulationInputs): boolean {
  return (Object.keys(left) as Array<keyof FireSimulationInputs>).every((key) => left[key] === right[key]);
}

function FlameCanvas({ model }: { model: ReturnType<typeof calculateFireSimulation> }) {
  return (
    <div className="simulation-canvas" role="img" aria-label={`${model.gravityLabel} illustrative flame. ${model.morphology}. ${model.directionality}.`}>
      <svg viewBox="0 0 320 260" aria-hidden="true">
        <defs>
          <radialGradient id="simulation-chamber" cx="50%" cy="56%" r="64%">
            <stop offset="0%" stopColor="#173446" stopOpacity=".82" />
            <stop offset="72%" stopColor="#0b1a26" stopOpacity=".5" />
            <stop offset="100%" stopColor="#07131d" stopOpacity="0" />
          </radialGradient>
          <filter id="simulation-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id="simulation-flame-glow" x="-70%" y="-60%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <ellipse cx="160" cy="149" rx="120" ry="96" fill="url(#simulation-chamber)" />
        <path d="M42 219H278" stroke="#3b5263" strokeOpacity=".55" />
        <path d="M75 54V219M245 54V219" stroke="#203342" strokeDasharray="2 8" strokeOpacity=".65" />
        <ellipse cx="160" cy="205" rx="76" ry="28" fill={model.glowColor} opacity={model.glowOpacity} filter="url(#simulation-glow)" />
        <path d={model.outerPath} fill={model.outerColor} opacity=".9" filter="url(#simulation-flame-glow)" />
        <path d={model.innerPath} fill={model.innerColor} opacity=".9" />
        <ellipse cx="160" cy="220" rx="38" ry="4" fill="#d5e9f2" opacity=".35" />
      </svg>
      <span className="simulation-canvas-note">Illustrative visualization · not a measured result</span>
    </div>
  );
}

export function FireSimulationWorkspace() {
  const [inputs, setInputs] = useState<FireSimulationInputs>(DEFAULT_FIRE_SIMULATION_INPUTS);
  const model = useMemo(() => calculateFireSimulation(inputs), [inputs]);
  const selectedPreset = presets.find((preset) => inputsMatch(inputs, preset.values))?.key ?? null;

  function update(key: keyof FireSimulationInputs, value: string) {
    setInputs((current) => ({ ...current, [key]: Number(value) }));
  }

  function applyPreset(preset: FireSimulationInputs) {
    setInputs(preset);
  }

  return (
    <div className="workspace-tool-page fire-simulation-workspace">
      <section className="simulation-limit-note" role="note">
        <span className="tool-semantic-marker" aria-hidden="true" />
        <div><p className="semantic-label">INTERACTIVE VISUAL MODEL</p><p>Move the controls to see how selected conditions change flame morphology in this dashboard. This model is for exploration and education; it is not a validated combustion solver, measured result, or fire-safety prediction.</p></div>
      </section>

      <section className="tool-panel simulation-controls-panel" aria-labelledby="simulation-controls-title">
        <div className="tool-panel-heading"><div><p className="eyebrow">SCENARIO CONTROLS</p><h2 id="simulation-controls-title">Shape a flame in freefall</h2><p>Adjust one variable at a time or start from a reference condition. The visualization responds immediately.</p></div><span className="workspace-scope"><Sparkles size={13} aria-hidden="true" /> LIVE VISUAL</span></div>
        <div className="simulation-presets" aria-label="Reference presets">
          <span>Reference conditions</span>
           {presets.map((preset) => <button key={preset.key} type="button" className={`simulation-preset${selectedPreset === preset.key ? " is-selected" : ""}`} aria-pressed={selectedPreset === preset.key} onClick={() => applyPreset(preset.values)}>{preset.label}</button>)}
          <button type="button" className="quiet-button simulation-reset" onClick={() => setInputs(DEFAULT_FIRE_SIMULATION_INPUTS)}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
        </div>
        <div className="simulation-layout">
          <form className="simulation-form" onSubmit={(event) => event.preventDefault()} aria-label="Flame simulation controls">
            {sliders.map((definition) => <label key={definition.key} className="simulation-slider-row">
              <span className="simulation-slider-heading"><span><strong>{definition.label}</strong><small>{definition.help}</small></span><output htmlFor={`simulation-${definition.key}`}>{formatValue(definition, inputs[definition.key])}</output></span>
              <input id={`simulation-${definition.key}`} type="range" min={definition.min} max={definition.max} step={definition.step} value={inputs[definition.key]} onChange={(event) => update(definition.key, event.target.value)} />
            </label>)}
          </form>
          <aside className="simulation-readout" aria-live="polite" aria-label="Current simulation visualization">
            <div className="simulation-readout-heading"><div><p className="eyebrow">DASHBOARD PREVIEW</p><h3>{model.gravityLabel}</h3></div><span className="simulation-live-dot">LIVE</span></div>
            <FlameCanvas model={model} />
            <dl className="simulation-metrics">
              <div><dt>Morphology</dt><dd>{model.morphology}</dd></div>
              <div><dt>Directionality</dt><dd>{model.directionality}</dd></div>
              <div><dt>Visual state</dt><dd>{model.behavior}</dd></div>
              <div><dt>Visual intensity</dt><dd>{model.visualIntensity}%</dd></div>
            </dl>
          </aside>
        </div>
      </section>
      <p className="tool-disclaimer">The displayed flame is a documented conceptual visualization of user-selected trends. Compare it with the linked NASA source records before making any scientific or engineering claim.</p>
    </div>
  );
}

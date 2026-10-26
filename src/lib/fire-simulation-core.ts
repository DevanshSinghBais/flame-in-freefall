export type FireSimulationInputs = {
  gravityPercent: number;
  oxygenPercent: number;
  fuelRatePercent: number;
  airflowPercent: number;
  sootPercent: number;
  pressureKpa: number;
};

export type FireSimulationModel = {
  outerPath: string;
  innerPath: string;
  gravityLabel: string;
  morphology: string;
  behavior: string;
  directionality: string;
  visualIntensity: number;
  outerColor: string;
  innerColor: string;
  glowColor: string;
  glowOpacity: number;
};

export const DEFAULT_FIRE_SIMULATION_INPUTS: FireSimulationInputs = {
  gravityPercent: 0,
  oxygenPercent: 21,
  fuelRatePercent: 58,
  airflowPercent: 8,
  sootPercent: 18,
  pressureKpa: 101,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function normalized(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function flamePath({
  centerX,
  baseY,
  height,
  width,
  pointiness,
  shear,
  inner = false,
}: {
  centerX: number;
  baseY: number;
  height: number;
  width: number;
  pointiness: number;
  shear: number;
  inner?: boolean;
}): string {
  const scale = inner ? 0.58 : 1;
  const flameWidth = width * scale;
  const flameHeight = height * (inner ? 0.67 : 1);
  const base = baseY - (inner ? 3 : 0);
  const top = base - flameHeight;
  const tipOffset = flameWidth * (0.05 + pointiness * 0.2);
  const topX = centerX + shear * (inner ? 0.6 : 1);
  const shoulderY = top + flameHeight * (0.42 + (1 - pointiness) * 0.12);
  const left = centerX - flameWidth / 2;
  const right = centerX + flameWidth / 2;
  const shoulderLeft = centerX - flameWidth * (0.43 - pointiness * 0.08);
  const shoulderRight = centerX + flameWidth * (0.43 - pointiness * 0.08);

  return [
    `M ${rounded(left)} ${rounded(base)}`,
    `C ${rounded(left - flameWidth * 0.04)} ${rounded(base - flameHeight * 0.2)}, ${rounded(shoulderLeft - flameWidth * 0.08)} ${rounded(shoulderY + flameHeight * 0.08)}, ${rounded(topX - tipOffset)} ${rounded(top + flameHeight * 0.08)}`,
    `C ${rounded(topX - flameWidth * (0.24 - pointiness * 0.08))} ${rounded(top + flameHeight * 0.02)}, ${rounded(topX - flameWidth * 0.2)} ${rounded(top)}, ${rounded(topX)} ${rounded(top)}`,
    `C ${rounded(topX + flameWidth * 0.2)} ${rounded(top)}, ${rounded(topX + flameWidth * 0.24)} ${rounded(top + flameHeight * 0.02)}, ${rounded(topX + tipOffset)} ${rounded(top + flameHeight * 0.08)}`,
    `C ${rounded(shoulderRight + flameWidth * 0.08)} ${rounded(shoulderY + flameHeight * 0.08)}, ${rounded(right + flameWidth * 0.04)} ${rounded(base - flameHeight * 0.2)}, ${rounded(right)} ${rounded(base)}`,
    `C ${rounded(right - flameWidth * 0.08)} ${rounded(base + flameHeight * 0.04)}, ${rounded(left + flameWidth * 0.08)} ${rounded(base + flameHeight * 0.04)}, ${rounded(left)} ${rounded(base)} Z`,
  ].join(" ");
}

export function calculateFireSimulation(inputs: FireSimulationInputs): FireSimulationModel {
  const gravity = normalized(inputs.gravityPercent, 0, 100);
  const oxygen = normalized(inputs.oxygenPercent, 15, 60);
  const fuel = normalized(inputs.fuelRatePercent, 10, 100);
  const airflow = normalized(inputs.airflowPercent, 0, 100);
  const soot = normalized(inputs.sootPercent, 0, 100);
  const pressure = normalized(inputs.pressureKpa, 30, 150);
  const pointiness = clamp(0.18 + gravity * 0.72, 0.16, 0.92);
  const intensity = clamp(0.35 + oxygen * 0.35 + fuel * 0.28 + pressure * 0.1, 0.2, 1);
  const height = 88 + intensity * 82 + gravity * 30;
  const width = 76 + (1 - gravity) * 56 + fuel * 24 - airflow * 12;
  const shear = airflow * (8 + gravity * 24);
  const outerColor = soot > 0.62 ? "#ff8a4c" : oxygen > 0.62 ? "#66c9ef" : "#f3a35b";
  const innerColor = oxygen > 0.62 ? "#e9fbff" : "#fff1bc";
  const glowColor = soot > 0.62 ? "#ff6b35" : oxygen > 0.62 ? "#4db9e8" : "#ff9b50";

  return {
    outerPath: flamePath({ centerX: 160, baseY: 222, height, width, pointiness, shear }),
    innerPath: flamePath({ centerX: 160 + shear * 0.45, baseY: 220, height, width, pointiness, shear, inner: true }),
    gravityLabel: gravity < 0.2 ? "Microgravity" : gravity < 0.7 ? "Partial gravity" : "Earth gravity",
    morphology: gravity < 0.2 ? "Rounded diffusion-dominated form" : gravity < 0.7 ? "Transitional rounded form" : "Buoyant elongated form",
    behavior: airflow > 0.62 ? "Flow-disturbed visual state" : intensity > 0.72 ? "Bright, energetic visual state" : "Steady visual state",
    directionality: gravity < 0.2 && airflow < 0.25 ? "Nearly symmetric" : airflow > 0.55 ? "Strong lateral bias" : "Moderate upward bias",
    visualIntensity: Math.round(intensity * 100),
    outerColor,
    innerColor,
    glowColor,
    glowOpacity: rounded(0.28 + intensity * 0.35),
  };
}

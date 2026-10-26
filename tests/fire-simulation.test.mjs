import test from "node:test";
import assert from "node:assert/strict";
import { calculateFireSimulation, clamp } from "../src/lib/fire-simulation-core.ts";

const baseline = {
  gravityPercent: 0,
  oxygenPercent: 21,
  fuelRatePercent: 58,
  airflowPercent: 8,
  sootPercent: 18,
  pressureKpa: 101,
};

test("simulation responds with a rounder microgravity flame and an elongated Earth-gravity flame", () => {
  const microgravity = calculateFireSimulation(baseline);
  const earthGravity = calculateFireSimulation({ ...baseline, gravityPercent: 100 });

  assert.match(microgravity.morphology, /Rounded/);
  assert.match(earthGravity.morphology, /elongated/);
  assert.notEqual(microgravity.outerPath, earthGravity.outerPath);
  assert.equal(microgravity.gravityLabel, "Microgravity");
  assert.equal(earthGravity.gravityLabel, "Earth gravity");
});

test("oxygen, fuel, and airflow controls change visual state without producing invalid output", () => {
  const highFlow = calculateFireSimulation({ ...baseline, oxygenPercent: 50, fuelRatePercent: 95, airflowPercent: 90 });

  assert.equal(highFlow.directionality, "Strong lateral bias");
  assert.equal(highFlow.outerColor, "#66c9ef");
  assert.ok(highFlow.visualIntensity > calculateFireSimulation(baseline).visualIntensity);
  assert.ok(highFlow.outerPath.includes("M "));
  assert.ok(Number.isFinite(highFlow.glowOpacity));
});

test("clamp protects simulation inputs from non-finite and out-of-range values", () => {
  assert.equal(clamp(-4, 0, 100), 0);
  assert.equal(clamp(140, 0, 100), 100);
  assert.equal(clamp(Number.NaN, 0, 100), 0);
});

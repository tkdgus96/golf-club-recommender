import { lazy, Suspense, useState, useContext, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { UnitContext } from "../contexts/UnitContext";
import SimulatorResults from "../components/simulator/SimulatorResults";
import {
  calculateBallFlight,
  getDefaultInputs,
  getInputRanges,
} from "../utils/ballFlight";
import type { RenderPerformanceSample } from "../utils/monitoring";
import { recordRenderPerformance } from "../utils/monitoring";
import type { BallFlightInput, BallFlightResult } from "../types";
import { useExperiment } from "../contexts/ExperimentContext";

const BallFlightCanvas = lazy(
  () => import("../components/simulator/BallFlightCanvas")
);

// Conversion: 1 mph = 0.44704 m/s
const mphToMs = (mph: number) => Math.round(mph * 0.44704);
const msToMph = (ms: number) => ms / 0.44704;

function detectRenderQuality(): "ultra" | "balanced" | "safe" {
  if (typeof window === "undefined") return "balanced";

  const nav = window.navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const dpr = window.devicePixelRatio ?? 1;

  if (memory <= 2 || cores <= 2) return "safe";
  if (memory <= 4 || cores <= 4 || dpr > 2.4) return "balanced";
  return "ultra";
}

export default function Simulator() {
  const { t } = useTranslation("simulator");
  const { unitSystem } = useContext(UnitContext);
  const isMetric = unitSystem === "metric";
  const { trackEvent } = useExperiment();

  // Internal state always in mph for calculations
  const [inputs, setInputs] = useState<BallFlightInput>(getDefaultInputs());
  const [result, setResult] = useState<BallFlightResult | null>(null);
  const [renderQuality] = useState<"ultra" | "balanced" | "safe">(
    detectRenderQuality()
  );
  const [renderIssue, setRenderIssue] = useState<string | null>(null);
  const [renderPerf, setRenderPerf] = useState<{
    fps: number;
    droppedPercent: number;
    status: "good" | "warn" | "poor";
  } | null>(null);
  const lastPerfWarningAt = useRef(0);
  const ranges = getInputRanges();

  // Convert ranges for display
  const getSpeedRange = (range: { min: number; max: number; step: number }) => {
    if (isMetric) {
      return {
        min: mphToMs(range.min),
        max: mphToMs(range.max),
        step: 1,
      };
    }
    return range;
  };

  // Get displayed value (convert to m/s if metric)
  const getDisplaySpeed = (mph: number) => (isMetric ? mphToMs(mph) : mph);

  // Handle speed input change (convert from m/s to mph if metric)
  const handleSpeedChange = (key: "ballSpeed" | "clubSpeed", displayValue: number) => {
    const mphValue = isMetric ? msToMph(displayValue) : displayValue;
    setInputs((prev) => ({ ...prev, [key]: mphValue }));
  };

  const handleInputChange = (key: keyof BallFlightInput, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSimulate = () => {
    const calculated = calculateBallFlight(inputs, isMetric);
    setResult(calculated);
    trackEvent("simulator_run", {
      ballSpeed: inputs.ballSpeed,
      launchAngle: inputs.launchAngle,
    });
  };

  const handleReset = () => {
    setInputs(getDefaultInputs());
    setResult(null);
  };

  const handlePerformanceSample = useCallback(
    (sample: RenderPerformanceSample) => {
      const status =
        sample.fps >= 52 ? "good" : sample.fps >= 40 ? "warn" : "poor";
      setRenderPerf({
        fps: sample.fps,
        droppedPercent: Math.round(sample.droppedFrameRatio * 100),
        status,
      });

      const now = Date.now();
      if (sample.lowFps && now - lastPerfWarningAt.current > 15000) {
        recordRenderPerformance(sample);
        trackEvent("simulator_low_fps", {
          fps: Math.round(sample.fps),
          quality: sample.quality,
          drops: Number(sample.droppedFrameRatio.toFixed(2)),
        });
        lastPerfWarningAt.current = now;
      }
    },
    [trackEvent]
  );

  const speedUnit = isMetric ? t("units.ms") : t("units.mph");
  const ballSpeedRange = getSpeedRange(ranges.ballSpeed);
  const clubSpeedRange = getSpeedRange(ranges.clubSpeed);

  return (
    <div className="simulator-page">
      <div className="simulator-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <div className="simulator-quality-row">
          <div className="simulator-quality-badge">
            {t(`quality.${renderQuality}`)}
          </div>
          {renderPerf && (
            <div className={`perf-badge ${renderPerf.status}`}>
              FPS {Math.round(renderPerf.fps)} | Drop {renderPerf.droppedPercent}%
            </div>
          )}
        </div>
        {renderIssue && <p className="simulator-render-issue">{t("quality.fallback")}</p>}
      </div>

      <div className="simulator-layout">
        <aside className="simulator-controls">
          <h3>{t("inputs.title")}</h3>

          <div className="input-group">
            <label>
              {t("inputs.ballSpeed")} ({speedUnit})
              <span className="input-value">{getDisplaySpeed(inputs.ballSpeed)}</span>
            </label>
            <input
              type="range"
              min={ballSpeedRange.min}
              max={ballSpeedRange.max}
              step={ballSpeedRange.step}
              value={getDisplaySpeed(inputs.ballSpeed)}
              onChange={(e) =>
                handleSpeedChange("ballSpeed", parseFloat(e.target.value))
              }
            />
            <div className="range-labels">
              <span>{ballSpeedRange.min}</span>
              <span>{ballSpeedRange.max}</span>
            </div>
          </div>

          <div className="input-group">
            <label>
              {t("inputs.clubSpeed")} ({speedUnit})
              <span className="input-value">{getDisplaySpeed(inputs.clubSpeed)}</span>
            </label>
            <input
              type="range"
              min={clubSpeedRange.min}
              max={clubSpeedRange.max}
              step={clubSpeedRange.step}
              value={getDisplaySpeed(inputs.clubSpeed)}
              onChange={(e) =>
                handleSpeedChange("clubSpeed", parseFloat(e.target.value))
              }
            />
            <div className="range-labels">
              <span>{clubSpeedRange.min}</span>
              <span>{clubSpeedRange.max}</span>
            </div>
          </div>

          <div className="input-group">
            <label>
              {t("inputs.launchAngle")} (°)
              <span className="input-value">{inputs.launchAngle}</span>
            </label>
            <input
              type="range"
              min={ranges.launchAngle.min}
              max={ranges.launchAngle.max}
              step={ranges.launchAngle.step}
              value={inputs.launchAngle}
              onChange={(e) =>
                handleInputChange("launchAngle", parseFloat(e.target.value))
              }
            />
            <div className="range-labels">
              <span>{ranges.launchAngle.min}°</span>
              <span>{ranges.launchAngle.max}°</span>
            </div>
          </div>

          <div className="input-group">
            <label>
              {t("inputs.clubFaceAngle")} (°)
              <span className="input-value">
                {inputs.clubFaceAngle > 0 ? "+" : ""}
                {inputs.clubFaceAngle}
              </span>
            </label>
            <input
              type="range"
              min={ranges.clubFaceAngle.min}
              max={ranges.clubFaceAngle.max}
              step={ranges.clubFaceAngle.step}
              value={inputs.clubFaceAngle}
              onChange={(e) =>
                handleInputChange("clubFaceAngle", parseFloat(e.target.value))
              }
            />
            <div className="range-labels">
              <span>{t("inputs.closed")}</span>
              <span>{t("inputs.open")}</span>
            </div>
          </div>

          <div className="input-group">
            <label>
              {t("inputs.clubPathAngle")} (°)
              <span className="input-value">
                {inputs.clubPathAngle > 0 ? "+" : ""}
                {inputs.clubPathAngle}
              </span>
            </label>
            <input
              type="range"
              min={ranges.clubPathAngle.min}
              max={ranges.clubPathAngle.max}
              step={ranges.clubPathAngle.step}
              value={inputs.clubPathAngle}
              onChange={(e) =>
                handleInputChange("clubPathAngle", parseFloat(e.target.value))
              }
            />
            <div className="range-labels">
              <span>{t("inputs.outToIn")}</span>
              <span>{t("inputs.inToOut")}</span>
            </div>
          </div>

          <div className="input-group">
            <label>
              {t("inputs.backspin")} (rpm)
              <span className="input-value">{inputs.backspin}</span>
            </label>
            <input
              type="range"
              min={ranges.backspin.min}
              max={ranges.backspin.max}
              step={ranges.backspin.step}
              value={inputs.backspin}
              onChange={(e) =>
                handleInputChange("backspin", parseFloat(e.target.value))
              }
            />
            <div className="range-labels">
              <span>{ranges.backspin.min}</span>
              <span>{ranges.backspin.max}</span>
            </div>
          </div>

          <div className="control-buttons">
            <button className="btn btn-primary btn-block" onClick={handleSimulate}>
              {t("buttons.simulate")}
            </button>
            <button className="btn btn-secondary btn-block" onClick={handleReset}>
              {t("buttons.reset")}
            </button>
          </div>
        </aside>

        <div className="simulator-main">
          <Suspense fallback={<div className="ball-flight-fallback">Loading 3D scene...</div>}>
            <BallFlightCanvas
              result={result}
              isMetric={isMetric}
              quality={renderQuality}
              onRenderFailure={(reason) => setRenderIssue(reason)}
              onPerformanceSample={handlePerformanceSample}
            />
          </Suspense>
          <SimulatorResults result={result} isMetric={isMetric} />
        </div>
      </div>
    </div>
  );
}

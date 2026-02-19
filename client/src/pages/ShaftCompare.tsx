import {
  lazy,
  Suspense,
  useState,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { UnitContext } from "../contexts/UnitContext";
import { useProfile } from "../contexts/ProfileContext";
import { useExperiment } from "../contexts/ExperimentContext";
import ShaftSelector from "../components/compare/ShaftSelector";
import ComparisonResults from "../components/compare/ComparisonResults";
import {
  compareShafts,
  compareShaftsFromClubData,
  getDefaultShotData,
  getDefaultClubData,
  getShotDataRanges,
  getClubDataRanges,
  type ShotData,
  type ClubData,
  type ComparisonResult,
  type ShaftApplication,
} from "../utils/shaftComparison";
import { calculateBallFlight } from "../utils/ballFlight";
import type { RenderPerformanceSample } from "../utils/monitoring";
import { recordRenderPerformance } from "../utils/monitoring";
import type { Shaft, BallFlightInput, BallFlightResult } from "../types";

const DualTrajectoryCanvas = lazy(
  () => import("../components/compare/DualTrajectoryCanvas")
);

type InputMode = "shot" | "club";

const SHAFT_APPLICATIONS: ShaftApplication[] = [
  "driver",
  "fairway_wood",
  "hybrid",
  "iron",
  "wedge",
  "putter",
];

// Conversion helpers
const yardsToMeters = (y: number) => Math.round(y / 1.09361);
const metersToYards = (m: number) => Math.round(m * 1.09361);
const mphToMs = (mph: number) => Math.round(mph * 0.44704);
const msToMph = (ms: number) => Math.round(ms / 0.44704);

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

export default function ShaftCompare() {
  const { t } = useTranslation("compare");
  const { unitSystem } = useContext(UnitContext);
  const isMetric = unitSystem === "metric";
  const {
    modelCalibration,
    updateCalibration,
    resetCalibration,
    addCompareHistory,
  } = useProfile();
  const { variants, trackEvent } = useExperiment();

  const [currentShaft, setCurrentShaft] = useState<Shaft | null>(null);
  const [targetShaft, setTargetShaft] = useState<Shaft | null>(null);
  const [applicationFilter, setApplicationFilter] =
    useState<ShaftApplication>("driver");
  const [inputMode, setInputMode] = useState<InputMode>("shot");
  const [shotData, setShotData] = useState<ShotData>(getDefaultShotData());
  const [clubData, setClubData] = useState<ClubData>(getDefaultClubData());
  const [result, setResult] = useState<ComparisonResult | null>(null);
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
  const [trajectories, setTrajectories] = useState<{
    current: BallFlightResult | null;
    target: BallFlightResult | null;
  }>({ current: null, target: null });

  const shotRanges = getShotDataRanges();
  const clubRanges = getClubDataRanges();

  // Clear target shaft if current shaft category changes
  const handleCurrentShaftSelect = (shaft: Shaft | null) => {
    setCurrentShaft(shaft);
    if (shaft && targetShaft && shaft.category !== targetShaft.category) {
      setTargetShaft(null);
      setResult(null);
      setTrajectories({ current: null, target: null });
    }
  };

  const handleApplicationChange = (app: ShaftApplication) => {
    setApplicationFilter(app);
    if (currentShaft && !currentShaft.applications?.includes(app)) {
      setCurrentShaft(null);
    }
    if (targetShaft && !targetShaft.applications?.includes(app)) {
      setTargetShaft(null);
    }
    setResult(null);
    setTrajectories({ current: null, target: null });
  };

  // Convert display values for metric
  const getDisplayCarry = (yards: number) =>
    isMetric ? yardsToMeters(yards) : yards;
  const setCarryFromDisplay = (display: number) =>
    isMetric ? metersToYards(display) : display;
  const getDisplaySpeed = (mph: number) =>
    isMetric ? mphToMs(mph) : mph;
  const setSpeedFromDisplay = (display: number) =>
    isMetric ? msToMph(display) : display;

  const handleShotDataChange = (key: keyof ShotData, value: number) => {
    setShotData((prev) => ({ ...prev, [key]: value }));
  };

  const handleClubDataChange = (key: keyof ClubData, value: number) => {
    setClubData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompare = () => {
    if (!currentShaft || !targetShaft) return;

    let comparisonResult: ComparisonResult;
    let currentInput: BallFlightInput;
    let targetInput: BallFlightInput;

    const comparisonOptions = {
      application: applicationFilter,
      calibration: modelCalibration,
    } as const;

    if (inputMode === "shot") {
      comparisonResult = compareShafts(
        shotData,
        currentShaft,
        targetShaft,
        isMetric,
        { clubFaceAngle: 0, clubPathAngle: 0 },
        comparisonOptions
      );

      currentInput = {
        ballSpeed: shotData.ballSpeed,
        clubSpeed: shotData.ballSpeed * 0.67,
        launchAngle: shotData.launchAngle,
        clubFaceAngle: 0,
        clubPathAngle: 0,
        backspin: shotData.spinRate,
      };

      targetInput = {
        ballSpeed: comparisonResult.predictedBallSpeed,
        clubSpeed: comparisonResult.predictedBallSpeed * 0.67,
        launchAngle: comparisonResult.predictedLaunchAngle,
        clubFaceAngle: comparisonResult.predictedClubFaceAngle,
        clubPathAngle: comparisonResult.predictedClubPathAngle,
        backspin: comparisonResult.predictedSpinRate,
      };
    } else {
      comparisonResult = compareShaftsFromClubData(
        clubData,
        currentShaft,
        targetShaft,
        isMetric,
        comparisonOptions
      );

      currentInput = {
        ballSpeed: clubData.clubSpeed * 1.5,
        clubSpeed: clubData.clubSpeed,
        launchAngle: 12,
        clubFaceAngle: clubData.clubFaceAngle,
        clubPathAngle: clubData.clubPathAngle,
        backspin: clubData.backspin,
      };

      targetInput = {
        ballSpeed: comparisonResult.predictedBallSpeed,
        clubSpeed: comparisonResult.predictedBallSpeed * 0.67,
        launchAngle: comparisonResult.predictedLaunchAngle,
        clubFaceAngle: comparisonResult.predictedClubFaceAngle,
        clubPathAngle: comparisonResult.predictedClubPathAngle,
        backspin: comparisonResult.predictedSpinRate,
      };
    }

    setResult(comparisonResult);
    setRenderIssue(null);

    addCompareHistory({
      application: applicationFilter,
      currentShaftId: currentShaft.id,
      currentShaftName: `${currentShaft.vendor} ${currentShaft.title}`,
      targetShaftId: targetShaft.id,
      targetShaftName: `${targetShaft.vendor} ${targetShaft.title}`,
      recommendation: comparisonResult.recommendation,
      expectedStrokesDelta: comparisonResult.expectedStrokesDelta,
      modelConfidence: comparisonResult.modelConfidence,
      carryChange: comparisonResult.carryChange,
      offlineAbsChange: comparisonResult.offlineAbsChange,
    });
    trackEvent("compare_executed", {
      application: applicationFilter,
      recommendation: comparisonResult.recommendation,
      expectedStrokesDelta: comparisonResult.expectedStrokesDelta,
      variant: variants.compare_ui,
    });

    const currentFlight = calculateBallFlight(currentInput, isMetric);
    const targetFlight = calculateBallFlight(targetInput, isMetric);

    setTrajectories({
      current: currentFlight,
      target: targetFlight,
    });
  };

  const handleReset = () => {
    setResult(null);
    setTrajectories({ current: null, target: null });
  };

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setResult(null);
    setTrajectories({ current: null, target: null });
  };

  const canCompare = currentShaft && targetShaft;

  const carryRange = useMemo(() => {
    if (isMetric) {
      return {
        min: yardsToMeters(shotRanges.carry.min),
        max: yardsToMeters(shotRanges.carry.max),
        step: 1,
      };
    }
    return shotRanges.carry;
  }, [isMetric, shotRanges.carry]);

  const ballSpeedRange = useMemo(() => {
    if (isMetric) {
      return {
        min: mphToMs(shotRanges.ballSpeed.min),
        max: mphToMs(shotRanges.ballSpeed.max),
        step: 1,
      };
    }
    return shotRanges.ballSpeed;
  }, [isMetric, shotRanges.ballSpeed]);

  const clubSpeedRange = useMemo(() => {
    if (isMetric) {
      return {
        min: mphToMs(clubRanges.clubSpeed.min),
        max: mphToMs(clubRanges.clubSpeed.max),
        step: 1,
      };
    }
    return clubRanges.clubSpeed;
  }, [isMetric, clubRanges.clubSpeed]);

  const distUnit = isMetric ? t("units.meters") : t("units.yards");
  const speedUnit = isMetric ? t("units.ms") : t("units.mph");

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
        trackEvent("compare_low_fps", {
          fps: Math.round(sample.fps),
          quality: sample.quality,
          drops: Number(sample.droppedFrameRatio.toFixed(2)),
        });
        lastPerfWarningAt.current = now;
      }
    },
    [trackEvent]
  );

  return (
    <div
      className={`compare-page ${
        variants.compare_ui === "one_thumb" ? "compare-one-thumb" : ""
      }`}
    >
      <div className="compare-header">
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
        {renderIssue && <p className="simulator-render-issue">{t("fallback.description")}</p>}
        <div className="compare-application-tabs">
          {SHAFT_APPLICATIONS.map((app) => (
            <button
              key={app}
              className={`app-tab ${applicationFilter === app ? "active" : ""}`}
              onClick={() => handleApplicationChange(app)}
            >
              {t(`applications.${app}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="compare-layout">
        <div className="compare-inputs">
          <div className="shaft-selectors">
            <ShaftSelector
              label={t("currentShaft")}
              selectedShaft={currentShaft}
              onSelect={handleCurrentShaftSelect}
              applicationFilter={applicationFilter}
            />
            <div className="selector-arrow">→</div>
            <ShaftSelector
              label={t("targetShaft")}
              selectedShaft={targetShaft}
              onSelect={setTargetShaft}
              categoryFilter={currentShaft?.category}
              applicationFilter={applicationFilter}
            />
          </div>

          <div className="shot-data-panel">
            <div className="input-mode-toggle">
              <button
                className={`mode-btn ${inputMode === "shot" ? "active" : ""}`}
                onClick={() => handleModeChange("shot")}
              >
                {t("modes.shotData")}
              </button>
              <button
                className={`mode-btn ${inputMode === "club" ? "active" : ""}`}
                onClick={() => handleModeChange("club")}
              >
                {t("modes.clubData")}
              </button>
            </div>

            <p className="mode-description">
              {inputMode === "shot" ? t("modes.shotDescription") : t("modes.clubDescription")}
            </p>

            <div className="calibration-panel">
              <div className="calibration-header">
                <h4>{t("calibration.title")}</h4>
                <button className="btn btn-sm btn-secondary" onClick={resetCalibration}>
                  {t("calibration.reset")}
                </button>
              </div>
              <p>{t("calibration.subtitle")}</p>

              <div className="calibration-grid">
                <label>
                  {t("calibration.ballSpeedBias")} ({speedUnit})
                  <span className="input-value">{modelCalibration.ballSpeedBias.toFixed(1)}</span>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.1}
                    value={modelCalibration.ballSpeedBias}
                    onChange={(e) =>
                      updateCalibration({ ballSpeedBias: Number(e.target.value) })
                    }
                  />
                </label>

                <label>
                  {t("calibration.launchAngleBias")} (°)
                  <span className="input-value">{modelCalibration.launchAngleBias.toFixed(1)}</span>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={modelCalibration.launchAngleBias}
                    onChange={(e) =>
                      updateCalibration({ launchAngleBias: Number(e.target.value) })
                    }
                  />
                </label>

                <label>
                  {t("calibration.spinRateBias")} ({t("units.rpm")})
                  <span className="input-value">{Math.round(modelCalibration.spinRateBias)}</span>
                  <input
                    type="range"
                    min={-400}
                    max={400}
                    step={10}
                    value={modelCalibration.spinRateBias}
                    onChange={(e) =>
                      updateCalibration({ spinRateBias: Number(e.target.value) })
                    }
                  />
                </label>

                <label>
                  {t("calibration.faceAngleBias")} (°)
                  <span className="input-value">{modelCalibration.faceAngleBias.toFixed(1)}</span>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={modelCalibration.faceAngleBias}
                    onChange={(e) =>
                      updateCalibration({ faceAngleBias: Number(e.target.value) })
                    }
                  />
                </label>

                <label>
                  {t("calibration.pathAngleBias")} (°)
                  <span className="input-value">{modelCalibration.pathAngleBias.toFixed(1)}</span>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={modelCalibration.pathAngleBias}
                    onChange={(e) =>
                      updateCalibration({ pathAngleBias: Number(e.target.value) })
                    }
                  />
                </label>

                <label>
                  {t("calibration.dispersionBias")} ({distUnit})
                  <span className="input-value">{modelCalibration.dispersionBias.toFixed(1)}</span>
                  <input
                    type="range"
                    min={-4}
                    max={4}
                    step={0.1}
                    value={modelCalibration.dispersionBias}
                    onChange={(e) =>
                      updateCalibration({ dispersionBias: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            </div>

            {inputMode === "shot" ? (
              <>
                <div className="input-group">
                  <label>
                    {t("inputs.ballSpeed")} ({speedUnit})
                    <span className="input-value">{getDisplaySpeed(shotData.ballSpeed)}</span>
                  </label>
                  <input
                    type="range"
                    min={ballSpeedRange.min}
                    max={ballSpeedRange.max}
                    step={ballSpeedRange.step}
                    value={getDisplaySpeed(shotData.ballSpeed)}
                    onChange={(e) =>
                      handleShotDataChange("ballSpeed", setSpeedFromDisplay(parseFloat(e.target.value)))
                    }
                  />
                  <div className="range-labels">
                    <span>{ballSpeedRange.min}</span>
                    <span>{ballSpeedRange.max}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    {t("inputs.launchAngle")} (°)
                    <span className="input-value">{shotData.launchAngle}</span>
                  </label>
                  <input
                    type="range"
                    min={shotRanges.launchAngle.min}
                    max={shotRanges.launchAngle.max}
                    step={shotRanges.launchAngle.step}
                    value={shotData.launchAngle}
                    onChange={(e) =>
                      handleShotDataChange("launchAngle", parseFloat(e.target.value))
                    }
                  />
                  <div className="range-labels">
                    <span>{shotRanges.launchAngle.min}°</span>
                    <span>{shotRanges.launchAngle.max}°</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    {t("inputs.spinRate")} ({t("units.rpm")})
                    <span className="input-value">{shotData.spinRate}</span>
                  </label>
                  <input
                    type="range"
                    min={shotRanges.spinRate.min}
                    max={shotRanges.spinRate.max}
                    step={shotRanges.spinRate.step}
                    value={shotData.spinRate}
                    onChange={(e) =>
                      handleShotDataChange("spinRate", parseFloat(e.target.value))
                    }
                  />
                  <div className="range-labels">
                    <span>{shotRanges.spinRate.min}</span>
                    <span>{shotRanges.spinRate.max}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    {t("inputs.carry")} ({distUnit})
                    <span className="input-value">{getDisplayCarry(shotData.carry)}</span>
                  </label>
                  <input
                    type="range"
                    min={carryRange.min}
                    max={carryRange.max}
                    step={carryRange.step}
                    value={getDisplayCarry(shotData.carry)}
                    onChange={(e) =>
                      handleShotDataChange(
                        "carry",
                        setCarryFromDisplay(parseFloat(e.target.value))
                      )
                    }
                  />
                  <div className="range-labels">
                    <span>{carryRange.min}</span>
                    <span>{carryRange.max}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="input-group">
                  <label>
                    {t("inputs.clubSpeed")} ({speedUnit})
                    <span className="input-value">{getDisplaySpeed(clubData.clubSpeed)}</span>
                  </label>
                  <input
                    type="range"
                    min={clubSpeedRange.min}
                    max={clubSpeedRange.max}
                    step={clubSpeedRange.step}
                    value={getDisplaySpeed(clubData.clubSpeed)}
                    onChange={(e) =>
                      handleClubDataChange(
                        "clubSpeed",
                        setSpeedFromDisplay(parseFloat(e.target.value))
                      )
                    }
                  />
                  <div className="range-labels">
                    <span>{clubSpeedRange.min}</span>
                    <span>{clubSpeedRange.max}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    {t("inputs.clubFaceAngle")} (°)
                    <span className="input-value">
                      {clubData.clubFaceAngle > 0 ? "+" : ""}
                      {clubData.clubFaceAngle}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={clubRanges.clubFaceAngle.min}
                    max={clubRanges.clubFaceAngle.max}
                    step={clubRanges.clubFaceAngle.step}
                    value={clubData.clubFaceAngle}
                    onChange={(e) =>
                      handleClubDataChange("clubFaceAngle", parseFloat(e.target.value))
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
                      {clubData.clubPathAngle > 0 ? "+" : ""}
                      {clubData.clubPathAngle}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={clubRanges.clubPathAngle.min}
                    max={clubRanges.clubPathAngle.max}
                    step={clubRanges.clubPathAngle.step}
                    value={clubData.clubPathAngle}
                    onChange={(e) =>
                      handleClubDataChange("clubPathAngle", parseFloat(e.target.value))
                    }
                  />
                  <div className="range-labels">
                    <span>{t("inputs.inToOut")}</span>
                    <span>{t("inputs.outToIn")}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    {t("inputs.attackAngle")} (°)
                    <span className="input-value">
                      {clubData.attackAngle > 0 ? "+" : ""}
                      {clubData.attackAngle}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={clubRanges.attackAngle.min}
                    max={clubRanges.attackAngle.max}
                    step={clubRanges.attackAngle.step}
                    value={clubData.attackAngle}
                    onChange={(e) =>
                      handleClubDataChange("attackAngle", parseFloat(e.target.value))
                    }
                  />
                  <div className="range-labels">
                    <span>{t("inputs.down")}</span>
                    <span>{t("inputs.up")}</span>
                  </div>
                </div>

                <div className="input-group">
                  <label>
                    {t("inputs.backspin")} ({t("units.rpm")})
                    <span className="input-value">{clubData.backspin}</span>
                  </label>
                  <input
                    type="range"
                    min={clubRanges.backspin.min}
                    max={clubRanges.backspin.max}
                    step={clubRanges.backspin.step}
                    value={clubData.backspin}
                    onChange={(e) =>
                      handleClubDataChange("backspin", parseFloat(e.target.value))
                    }
                  />
                  <div className="range-labels">
                    <span>{clubRanges.backspin.min}</span>
                    <span>{clubRanges.backspin.max}</span>
                  </div>
                </div>
              </>
            )}

            <div className="control-buttons">
              <button
                className="btn btn-primary btn-block"
                onClick={handleCompare}
                disabled={!canCompare}
              >
                {t("buttons.compare")}
              </button>
              <button className="btn btn-secondary btn-block" onClick={handleReset}>
                {t("buttons.reset")}
              </button>
            </div>
            {variants.compare_ui === "one_thumb" && (
              <div className="thumb-cta">
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleCompare}
                  disabled={!canCompare}
                >
                  {t("buttons.compare")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="compare-main">
          {result ? (
            <>
              <ComparisonResults result={result} isMetric={isMetric} />
              <div className="trajectory-section">
                <h3>{t("trajectoryComparison")}</h3>
                <Suspense fallback={<div className="dual-trajectory-fallback">Loading 3D comparison...</div>}>
                  <DualTrajectoryCanvas
                    currentResult={trajectories.current}
                    targetResult={trajectories.target}
                    isMetric={isMetric}
                    quality={renderQuality}
                    onRenderFailure={(reason) => setRenderIssue(reason)}
                    onPerformanceSample={handlePerformanceSample}
                  />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="compare-empty">
              <h3>{t("emptyState.title")}</h3>
              <p>{t("emptyState.description")}</p>
              <ol>
                <li>{t("emptyState.step1")}</li>
                <li>{t("emptyState.step2")}</li>
                <li>{t("emptyState.step3")}</li>
                <li>{t("emptyState.step4")}</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

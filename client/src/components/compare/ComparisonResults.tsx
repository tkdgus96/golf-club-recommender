import { useTranslation } from "react-i18next";
import type { ComparisonResult } from "../../utils/shaftComparison";

interface ComparisonResultsProps {
  result: ComparisonResult;
  isMetric: boolean;
}

const YARDS_TO_METERS = 1 / 1.09361;
const MPH_TO_MS = 0.44704;

function roundTo(value: number, digits: number = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export default function ComparisonResults({
  result,
  isMetric,
}: ComparisonResultsProps) {
  const { t } = useTranslation("compare");

  const distUnit = isMetric ? t("units.meters") : t("units.yards");
  const speedUnit = isMetric ? t("units.ms") : t("units.mph");

  const toDistanceDisplay = (value: number) =>
    isMetric ? value * YARDS_TO_METERS : value;
  const toSpeedDisplay = (value: number) =>
    isMetric ? value * MPH_TO_MS : value;

  const displayCarry = roundTo(toDistanceDisplay(result.predictedCarry), 0);
  const displayCarryChange = roundTo(toDistanceDisplay(result.carryChange), 0);
  const displayBallSpeed = roundTo(toSpeedDisplay(result.predictedBallSpeed), 0);
  const displayBallSpeedChange = roundTo(toSpeedDisplay(result.ballSpeedChange), 0);
  const displayCurrentOffline = roundTo(toDistanceDisplay(result.currentOffline), 1);
  const displayPredictedOffline = roundTo(toDistanceDisplay(result.predictedOffline), 1);
  const displayOfflineChange = roundTo(toDistanceDisplay(result.offlineChange), 1);
  const displayOfflineAbsChange = roundTo(toDistanceDisplay(result.offlineAbsChange), 1);

  const displayStartLineDelta = roundTo(
    toDistanceDisplay(result.startLineOfflineDelta),
    1
  );
  const displayCurvatureDelta = roundTo(
    toDistanceDisplay(result.curvatureOfflineDelta),
    1
  );
  const displayDispersionBandCurrent = roundTo(
    toDistanceDisplay(result.dispersionBandCurrent),
    1
  );
  const displayDispersionBandPredicted = roundTo(
    toDistanceDisplay(result.dispersionBandPredicted),
    1
  );
  const displayDispersionBandChange = roundTo(
    toDistanceDisplay(result.dispersionBandChange),
    1
  );

  const displayCarryLow = roundTo(toDistanceDisplay(result.predictedCarryLow), 0);
  const displayCarryHigh = roundTo(toDistanceDisplay(result.predictedCarryHigh), 0);
  const displayOfflineLeft = roundTo(toDistanceDisplay(result.predictedOfflineLeft), 1);
  const displayOfflineRight = roundTo(toDistanceDisplay(result.predictedOfflineRight), 1);
  const displayCarryP10 = roundTo(toDistanceDisplay(result.carryP10), 0);
  const displayCarryP50 = roundTo(toDistanceDisplay(result.carryP50), 0);
  const displayCarryP90 = roundTo(toDistanceDisplay(result.carryP90), 0);
  const displayOfflineP10 = roundTo(toDistanceDisplay(result.offlineP10), 1);
  const displayOfflineP50 = roundTo(toDistanceDisplay(result.offlineP50), 1);
  const displayOfflineP90 = roundTo(toDistanceDisplay(result.offlineP90), 1);

  const formatChange = (
    value: number,
    unit: string = "",
    decimals: number = 0
  ) => {
    const sign = value > 0 ? "+" : "";
    const formatted = decimals > 0 ? value.toFixed(decimals) : `${Math.round(value)}`;
    return `${sign}${formatted}${unit}`;
  };

  const formatOffline = (value: number) => {
    if (Math.abs(value) < 0.1) return t("offline.center");
    return value > 0
      ? `${Math.abs(roundTo(value, 1))} ${t("offline.right")}`
      : `${Math.abs(roundTo(value, 1))} ${t("offline.left")}`;
  };

  const getChangeClass = (value: number, invert: boolean = false) => {
    const adjusted = invert ? -value : value;
    if (adjusted > 0.5) return "positive";
    if (adjusted < -0.5) return "negative";
    return "neutral";
  };

  const getRatingBars = (rating: number, label: string) => {
    const bars = [];
    for (let i = -3; i <= 3; i++) {
      const isFilled =
        (rating > 0 && i > 0 && i <= rating) ||
        (rating < 0 && i < 0 && i >= rating);
      bars.push(
        <span
          key={i}
          className={`rating-block ${i === 0 ? "center" : ""} ${
            isFilled ? (rating > 0 ? "positive" : "negative") : ""
          }`}
        />
      );
    }

    return (
      <div className="rating-display">
        <span className="rating-label">{label}</span>
        <div className="rating-bars">{bars}</div>
        <span
          className={`rating-text ${
            rating > 0 ? "positive" : rating < 0 ? "negative" : ""
          }`}
        >
          {rating > 0
            ? t("ratings.better")
            : rating < 0
            ? t("ratings.worse")
            : t("ratings.same")}
        </span>
      </div>
    );
  };

  return (
    <div className="comparison-results">
      <h3>{t("predictedChanges")}</h3>

      <div className="strokes-panel">
        <div className="strokes-item">
          <span className="change-label">{t("strokes.current")}</span>
          <strong>{result.expectedStrokesCurrent.toFixed(2)}</strong>
        </div>
        <div className="strokes-item">
          <span className="change-label">{t("strokes.predicted")}</span>
          <strong>{result.expectedStrokesPredicted.toFixed(2)}</strong>
        </div>
        <div className={`strokes-item ${getChangeClass(result.expectedStrokesDelta)}`}>
          <span className="change-label">{t("strokes.delta")}</span>
          <strong>{formatChange(result.expectedStrokesDelta, "", 2)}</strong>
        </div>
      </div>

      <div className="changes-grid">
        <div className={`change-item ${getChangeClass(result.ballSpeedChange)}`}>
          <span className="change-label">{t("metrics.ballSpeed")}</span>
          <span className="change-values">
            <span className="current">{displayBallSpeed - displayBallSpeedChange}</span>
            <span className="arrow">→</span>
            <span className="predicted">{displayBallSpeed}</span>
            <span className="unit">{speedUnit}</span>
          </span>
          <span className="change-diff">
            ({formatChange(displayBallSpeedChange, ` ${speedUnit}`)})
          </span>
        </div>

        <div className={`change-item ${getChangeClass(result.launchAngleChange)}`}>
          <span className="change-label">{t("metrics.launchAngle")}</span>
          <span className="change-values">
            <span className="current">
              {(result.predictedLaunchAngle - result.launchAngleChange).toFixed(1)}
            </span>
            <span className="arrow">→</span>
            <span className="predicted">{result.predictedLaunchAngle.toFixed(1)}</span>
            <span className="unit">°</span>
          </span>
          <span className="change-diff">({formatChange(result.launchAngleChange, "°", 1)})</span>
        </div>

        <div className={`change-item ${getChangeClass(result.spinRateChange, true)}`}>
          <span className="change-label">{t("metrics.spinRate")}</span>
          <span className="change-values">
            <span className="current">
              {Math.round(result.predictedSpinRate - result.spinRateChange)}
            </span>
            <span className="arrow">→</span>
            <span className="predicted">{Math.round(result.predictedSpinRate)}</span>
            <span className="unit">{t("units.rpm")}</span>
          </span>
          <span className="change-diff">
            ({formatChange(result.spinRateChange, ` ${t("units.rpm")}`)})
          </span>
        </div>

        <div className={`change-item primary ${getChangeClass(result.carryChange)}`}>
          <span className="change-label">{t("metrics.carry")}</span>
          <span className="change-values">
            <span className="current">{displayCarry - displayCarryChange}</span>
            <span className="arrow">→</span>
            <span className="predicted">{displayCarry}</span>
            <span className="unit">{distUnit}</span>
          </span>
          <span className="change-diff">({formatChange(displayCarryChange, ` ${distUnit}`)})</span>
        </div>

        <div className={`change-item ${getChangeClass(result.clubFaceAngleChange, true)}`}>
          <span className="change-label">{t("metrics.clubFaceAngle")}</span>
          <span className="change-values">
            <span className="current">
              {(result.predictedClubFaceAngle - result.clubFaceAngleChange).toFixed(1)}
            </span>
            <span className="arrow">→</span>
            <span className="predicted">{result.predictedClubFaceAngle.toFixed(1)}</span>
            <span className="unit">°</span>
          </span>
          <span className="change-diff">({formatChange(result.clubFaceAngleChange, "°", 1)})</span>
        </div>

        <div className={`change-item ${getChangeClass(result.clubPathAngleChange, true)}`}>
          <span className="change-label">{t("metrics.clubPathAngle")}</span>
          <span className="change-values">
            <span className="current">
              {(result.predictedClubPathAngle - result.clubPathAngleChange).toFixed(1)}
            </span>
            <span className="arrow">→</span>
            <span className="predicted">{result.predictedClubPathAngle.toFixed(1)}</span>
            <span className="unit">°</span>
          </span>
          <span className="change-diff">({formatChange(result.clubPathAngleChange, "°", 1)})</span>
        </div>

        <div className={`change-item ${getChangeClass(result.faceToPathChange, true)}`}>
          <span className="change-label">{t("metrics.faceToPath")}</span>
          <span className="change-values">
            <span className="current">{result.currentFaceToPath.toFixed(1)}</span>
            <span className="arrow">→</span>
            <span className="predicted">{result.predictedFaceToPath.toFixed(1)}</span>
            <span className="unit">°</span>
          </span>
          <span className="change-diff">({formatChange(result.faceToPathChange, "°", 1)})</span>
        </div>

        <div className={`change-item ${getChangeClass(-displayOfflineAbsChange)}`}>
          <span className="change-label">{t("metrics.offline")}</span>
          <span className="change-values">
            <span className="current">{formatOffline(displayCurrentOffline)}</span>
            <span className="arrow">→</span>
            <span className="predicted">{formatOffline(displayPredictedOffline)}</span>
            <span className="unit">{distUnit}</span>
          </span>
          <span className="change-diff">
            ({formatChange(displayOfflineChange, ` ${distUnit}`)} |{" "}
            {formatChange(displayOfflineAbsChange, ` ${distUnit}`)})
          </span>
        </div>
      </div>

      <div className="dispersion-analysis">
        <h4>{t("dispersion.title")}</h4>
        <div className="changes-grid dispersion-grid">
          <div className={`change-item ${getChangeClass(-Math.abs(displayStartLineDelta))}`}>
            <span className="change-label">{t("dispersion.startLine")}</span>
            <span className="change-values">
              <span className="predicted">{formatChange(displayStartLineDelta, ` ${distUnit}`, 1)}</span>
            </span>
          </div>
          <div className={`change-item ${getChangeClass(-Math.abs(displayCurvatureDelta))}`}>
            <span className="change-label">{t("dispersion.curvature")}</span>
            <span className="change-values">
              <span className="predicted">{formatChange(displayCurvatureDelta, ` ${distUnit}`, 1)}</span>
            </span>
          </div>
          <div className={`change-item ${getChangeClass(displayDispersionBandChange, true)}`}>
            <span className="change-label">{t("dispersion.band")}</span>
            <span className="change-values">
              <span className="current">±{displayDispersionBandCurrent}</span>
              <span className="arrow">→</span>
              <span className="predicted">±{displayDispersionBandPredicted}</span>
              <span className="unit">{distUnit}</span>
            </span>
            <span className="change-diff">
              ({formatChange(displayDispersionBandChange, ` ${distUnit}`, 1)})
            </span>
          </div>
        </div>
      </div>

      <div className="uncertainty-panel">
        <div className="uncertainty-item">
          <span className="change-label">{t("uncertainty.carryRange")}</span>
          <strong>
            {displayCarryLow} - {displayCarryHigh} {distUnit}
          </strong>
        </div>
        <div className="uncertainty-item">
          <span className="change-label">{t("uncertainty.offlineWindow")}</span>
          <strong>
            {formatOffline(displayOfflineLeft)} to {formatOffline(displayOfflineRight)}
          </strong>
        </div>
        <div className="uncertainty-item">
          <span className="change-label">{t("uncertainty.modelConfidence")}</span>
          <strong>{Math.round(result.modelConfidence * 100)}%</strong>
        </div>
      </div>

      <div className="probability-panel">
        <h4>{t("probability.title")}</h4>
        <div className="probability-row">
          <span>{t("probability.carry")}</span>
          <strong>
            P10 {displayCarryP10} / P50 {displayCarryP50} / P90 {displayCarryP90} {distUnit}
          </strong>
        </div>
        <div className="probability-row">
          <span>{t("probability.offline")}</span>
          <strong>
            P10 {formatOffline(displayOfflineP10)} / P50 {formatOffline(displayOfflineP50)} / P90{" "}
            {formatOffline(displayOfflineP90)}
          </strong>
        </div>
      </div>

      <div className="ratings-section">
        <h4>{t("overallRating")}</h4>
        {getRatingBars(result.distanceRating, t("ratings.distance"))}
        {getRatingBars(result.accuracyRating, t("ratings.accuracy"))}
      </div>

      <div className={`recommendation recommendation-${result.recommendation}`}>
        <span className="recommendation-icon">
          {result.recommendation === "better"
            ? "✓"
            : result.recommendation === "worse"
            ? "✗"
            : "–"}
        </span>
        <div className="recommendation-text">
          <strong>{t(`recommendations.${result.recommendation}`)}</strong>
          <span>{t(`reasons.${result.recommendationReason}`)}</span>
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import type { BallFlightResult } from "../../types";

interface SimulatorResultsProps {
  result: BallFlightResult | null;
  isMetric: boolean;
}

export default function SimulatorResults({ result, isMetric }: SimulatorResultsProps) {
  const { t } = useTranslation("simulator");

  if (!result) {
    return (
      <div className="simulator-results empty">
        <p>{t("results.empty")}</p>
      </div>
    );
  }

  const unit = isMetric ? t("units.meters") : t("units.yards");
  const formatDist = (val: number) => Math.round(val);
  const formatOffline = (val: number) => {
    const rounded = Math.round(Math.abs(val));
    if (val > 1) return `${rounded} ${unit} ${t("results.right")}`;
    if (val < -1) return `${rounded} ${unit} ${t("results.left")}`;
    return t("results.straight");
  };

  return (
    <div className="simulator-results">
      <h3>{t("results.title")}</h3>
      <div className="results-grid">
        <div className="result-item primary">
          <span className="result-label">{t("results.carry")}</span>
          <span className="result-value">
            {formatDist(result.carry)} <small>{unit}</small>
          </span>
        </div>
        <div className="result-item primary">
          <span className="result-label">{t("results.total")}</span>
          <span className="result-value">
            {formatDist(result.total)} <small>{unit}</small>
          </span>
        </div>
        <div className="result-item">
          <span className="result-label">{t("results.maxHeight")}</span>
          <span className="result-value">
            {formatDist(result.maxHeight)} <small>{unit}</small>
          </span>
        </div>
        <div className="result-item">
          <span className="result-label">{t("results.landingAngle")}</span>
          <span className="result-value">{result.landingAngle}°</span>
        </div>
        <div className="result-item">
          <span className="result-label">{t("results.offline")}</span>
          <span className="result-value">{formatOffline(result.offline)}</span>
        </div>
        <div className="result-item">
          <span className="result-label">{t("results.flightTime")}</span>
          <span className="result-value">{result.flightTime} {t("units.seconds")}</span>
        </div>
      </div>
    </div>
  );
}

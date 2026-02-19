import { useState } from "react";
import { useEffect } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type {
  RecommendationSet,
  ScoredClub,
  QuizAnswers,
  ReasonItem,
  BundleOffersResponse,
} from "../types";
import { useProfile } from "../contexts/ProfileContext";
import { useExperiment } from "../contexts/ExperimentContext";
import {
  buildFitterReportText,
  createSharedReport,
  downloadTextFile,
} from "../utils/reporting";
import { optimizeClubSetup } from "../utils/setupOptimization";
import { getBundleOffers } from "../services/api";

function ClubRecommendation({
  label,
  scored,
  answers,
  t,
  tc,
  tr,
}: {
  label: string;
  scored: ScoredClub | null;
  answers: QuizAnswers;
  t: (key: string, params?: Record<string, unknown>) => string;
  tc: (key: string, params?: Record<string, unknown>) => string;
  tr: (key: string, params?: Record<string, unknown>) => string;
}) {
  if (!scored) return null;

  const { club, score, reasons, confidence } = scored;
  const setup = optimizeClubSetup(club, answers);
  const confidencePercent = Math.round(confidence.score * 100);
  const confidenceClass = `confidence-${confidence.level}`;
  const sourceUpdatedAt = club.sourceUpdatedAt
    ? new Date(club.sourceUpdatedAt).toLocaleDateString()
    : null;

  const translateReason = (reason: ReasonItem): string => {
    if (reason.params) {
      return tr(`reasons.${reason.key}`, reason.params);
    }
    return tr(`reasons.${reason.key}`);
  };

  return (
    <div className="rec-card">
      <div className="rec-card-header">
        <span className="rec-category">{label}</span>
        <div className="rec-score-stack">
          <span className="rec-score">{score.toFixed(1)} / 100</span>
          <span className={`confidence-badge ${confidenceClass}`}>
            {t(`confidence.levels.${confidence.level}`)} {confidencePercent}%
          </span>
        </div>
      </div>
      <div className="rec-card-body">
        <h3>
          {club.brand} {club.name}
        </h3>
        <p className="rec-price">${Number(club.price).toFixed(2)}</p>
        <p className="rec-desc">{club.description}</p>
        <div className="rec-ratings">
          <span>{tc("ratings.forgiveness")}: {club.forgivenessRating}/10</span>
          <span>{tc("ratings.distance")}: {club.distanceRating}/10</span>
          <span>{tc("ratings.accuracy")}: {club.accuracyRating}/10</span>
        </div>
        <div className="rec-reasons">
          <strong>{t("whyRecommended")}:</strong>
          <ul>
            {reasons.map((r, i) => (
              <li key={i}>{translateReason(r)}</li>
            ))}
          </ul>
        </div>
        <div className="rec-confidence">
          <strong>{t("confidence.title")}:</strong>
          <span>
            {t("confidence.breakdown", {
              model: Math.round(confidence.components.modelFit * 100),
              data: Math.round(confidence.components.dataQuality * 100),
              signal: Math.round(confidence.components.signalStrength * 100),
            })}
          </span>
        </div>
        <div className="rec-optimization">
          <strong>{t("optimization.title", { defaultValue: "Optimized Setup" })}:</strong>
          <span>
            {t("optimization.adjustments", {
              defaultValue:
                "Loft {{loft}}°, Lie {{lie}}°, Length {{length}}in",
              loft:
                setup.loftAdjustmentDeg > 0
                  ? `+${setup.loftAdjustmentDeg}`
                  : setup.loftAdjustmentDeg,
              lie:
                setup.lieAdjustmentDeg > 0
                  ? `+${setup.lieAdjustmentDeg}`
                  : setup.lieAdjustmentDeg,
              length:
                setup.lengthAdjustmentIn > 0
                  ? `+${setup.lengthAdjustmentIn}`
                  : setup.lengthAdjustmentIn,
            })}
          </span>
          <span>
            {t("optimization.shaft", {
              defaultValue:
                "Shaft: {{flex}}, {{weight}}, {{torque}}, {{launch}} launch",
              flex: setup.shaftTarget.flex,
              weight: setup.shaftTarget.weightRange,
              torque: setup.shaftTarget.torqueRange,
              launch: setup.shaftTarget.launchProfile,
            })}
          </span>
          <span>
            {t("optimization.ball", {
              defaultValue:
                "Ball: {{profile}} / {{compression}} compression / {{spin}} spin",
              profile: setup.ballTarget.profile,
              compression: setup.ballTarget.compression,
              spin: setup.ballTarget.spinProfile,
            })}
          </span>
        </div>
        {(club.sourceName || club.sourceUrl || sourceUpdatedAt || club.dataConfidence) && (
          <div className="rec-source">
            <strong>{t("source.title")}:</strong>
            {club.sourceName && <span>{club.sourceName}</span>}
            {sourceUpdatedAt && (
              <span>{t("source.updated", { date: sourceUpdatedAt })}</span>
            )}
            {typeof club.dataConfidence === "number" && (
              <span>
                {t("source.dataConfidence", {
                  value: Math.round(club.dataConfidence * 100),
                })}
              </span>
            )}
            {club.sourceUrl && (
              <a href={club.sourceUrl} target="_blank" rel="noreferrer">
                {t("source.link")}
              </a>
            )}
          </div>
        )}
        <Link to={`/clubs/${club.id}`} className="btn btn-sm btn-secondary">
          {tc("buttons.viewDetails")}
        </Link>
      </div>
    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const { t } = useTranslation("results");
  const { t: tc } = useTranslation("common");
  const { saveBag } = useProfile();
  const { variants, trackEvent } = useExperiment();
  const [actionMessage, setActionMessage] = useState("");
  const [bundleOffers, setBundleOffers] = useState<BundleOffersResponse | null>(null);

  const state = location.state as {
    results: RecommendationSet;
    answers: QuizAnswers;
  } | null;

  if (!state) {
    return <Navigate to="/quiz" replace />;
  }

  const { results, answers } = state;

  useEffect(() => {
    const ids = [
      results.driver?.club.id,
      results.fairwayWood?.club.id,
      results.hybrid?.club.id,
      results.ironSet?.club.id,
      results.wedge?.club.id,
      results.putter?.club.id,
    ].filter((id): id is number => typeof id === "number");

    if (ids.length === 0) return;
    getBundleOffers(ids).then(setBundleOffers).catch(() => setBundleOffers(null));
  }, [results]);

  const handleSaveBag = () => {
    const label = `${answers.skillLevel || "player"} fit ${new Date().toLocaleDateString()}`;
    saveBag(label, answers, results);
    trackEvent("results_bag_saved", { totalPrice: results.totalPrice });
    setActionMessage(t("actions.saved"));
  };

  const handleDownloadReport = () => {
    const reportText = buildFitterReportText({
      createdAt: new Date().toISOString(),
      title: "GolfFit AI Fitter Report",
      answers,
      results,
    });
    downloadTextFile(
      `golf-fit-report-${new Date().toISOString().slice(0, 10)}.txt`,
      reportText
    );
    trackEvent("results_report_downloaded", { totalPrice: results.totalPrice });
    setActionMessage(t("actions.downloaded"));
  };

  const handleCopyShareLink = async () => {
    const reportId = createSharedReport({
      createdAt: new Date().toISOString(),
      title: "GolfFit AI Shared Report",
      answers,
      results,
    });

    const shareUrl = `${window.location.origin}/report/${reportId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      trackEvent("results_share_link_copied");
      setActionMessage(t("actions.linkCopied"));
    } catch {
      setActionMessage(shareUrl);
    }
  };

  return (
    <div className="results-page">
      <div className="results-header">
        <h1>{t("title")}</h1>
        <p>
          {variants.recommendation_copy === "confidence_first"
            ? t("subtitleConfidence", {
                defaultValue:
                  "Confidence-first recommendation view with source-backed scoring.",
              })
            : t("subtitle")}
        </p>
        <div className="results-total">
          <strong>{t("totalCost")}:</strong>{" "}
          <span className="total-price">
            ${results.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rec-grid">
        <ClubRecommendation
          label={t("clubCategories.driver")}
          scored={results.driver}
          answers={answers}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.fairwayWood")}
          scored={results.fairwayWood}
          answers={answers}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.hybrid")}
          scored={results.hybrid}
          answers={answers}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.ironSet")}
          scored={results.ironSet}
          answers={answers}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.wedge")}
          scored={results.wedge}
          answers={answers}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.putter")}
          scored={results.putter}
          answers={answers}
          t={t}
          tc={tc}
          tr={t}
        />
      </div>

      <div className="results-actions">
        <Link to="/quiz" className="btn btn-secondary">
          {tc("buttons.retakeQuiz")}
        </Link>
        <button className="btn btn-secondary" onClick={handleSaveBag}>
          {t("actions.saveBag")}
        </button>
        <button className="btn btn-secondary" onClick={handleDownloadReport}>
          {t("actions.downloadReport")}
        </button>
        <button className="btn btn-secondary" onClick={handleCopyShareLink}>
          {t("actions.copyLink")}
        </button>
        <Link to="/catalog" className="btn btn-primary">
          {tc("buttons.browseAll")}
        </Link>
      </div>
      {actionMessage && <p className="results-action-message">{actionMessage}</p>}
      {bundleOffers && (
        <div className="bundle-offers">
          <h3>{tc("commerce.bundleTitle", { defaultValue: "Bundle Pricing" })}</h3>
          <p>
            {tc("commerce.bestBundle", {
              defaultValue: "Best total: {{retailer}} (${{total}})",
              retailer: bundleOffers.bestBundle.retailer,
              total: bundleOffers.bestBundle.total.toFixed(2),
            })}
          </p>
          <div className="bundle-offer-list">
            {bundleOffers.retailerTotals.map((entry) => (
              <div key={entry.retailer} className="bundle-offer-item">
                <strong>{entry.retailer}</strong>
                <span>${entry.total.toFixed(2)}</span>
                <span>
                  {entry.allInStock
                    ? tc("commerce.inStock", { defaultValue: "In Stock" })
                    : tc("commerce.partial", { defaultValue: "Partial Stock" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

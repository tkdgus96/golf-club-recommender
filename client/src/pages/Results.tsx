import { useLocation, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { RecommendationSet, ScoredClub, QuizAnswers, ReasonItem } from "../types";

function ClubRecommendation({
  label,
  scored,
  t,
  tc,
  tr,
}: {
  label: string;
  scored: ScoredClub | null;
  t: (key: string) => string;
  tc: (key: string) => string;
  tr: (key: string, params?: Record<string, unknown>) => string;
}) {
  if (!scored) return null;

  const { club, score, reasons } = scored;

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
        <span className="rec-score">{score.toFixed(1)} / 100</span>
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

  const state = location.state as {
    results: RecommendationSet;
    answers: QuizAnswers;
  } | null;

  if (!state) {
    return <Navigate to="/quiz" replace />;
  }

  const { results, answers } = state;

  return (
    <div className="results-page">
      <div className="results-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
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
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.fairwayWood")}
          scored={results.fairwayWood}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.hybrid")}
          scored={results.hybrid}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.ironSet")}
          scored={results.ironSet}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.wedge")}
          scored={results.wedge}
          t={t}
          tc={tc}
          tr={t}
        />
        <ClubRecommendation
          label={t("clubCategories.putter")}
          scored={results.putter}
          t={t}
          tc={tc}
          tr={t}
        />
      </div>

      <div className="results-actions">
        <Link to="/quiz" className="btn btn-secondary">
          {tc("buttons.retakeQuiz")}
        </Link>
        <Link to="/catalog" className="btn btn-primary">
          {tc("buttons.browseAll")}
        </Link>
      </div>
    </div>
  );
}

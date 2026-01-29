import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { GolfClub } from "../types";
import { getClub } from "../services/api";

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("clubDetail");
  const { t: tc, i18n } = useTranslation("common");
  const [club, setClub] = useState<GolfClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClub(parseInt(id))
      .then(setClub)
      .catch(() => setError(tc("errors.clubNotFound")))
      .finally(() => setLoading(false));
  }, [id, i18n.language, tc]);

  if (loading) return <div className="loading">{tc("labels.loading")}</div>;
  if (error || !club)
    return (
      <div className="error-page">
        <h2>{t("notFound")}</h2>
        <p>{t("notFoundMessage")}</p>
        <Link to="/catalog" className="btn btn-primary">
          {t("backToCatalog")}
        </Link>
      </div>
    );

  return (
    <div className="club-detail-page">
      <Link to="/catalog" className="back-link">
        &larr; {t("backToCatalog")}
      </Link>

      <div className="club-detail">
        <div className="club-detail-header">
          <div>
            <span className="club-type-badge large">
              {tc(`clubTypes.${club.clubType}`)}
            </span>
            <h1>
              {club.brand} {club.name}
            </h1>
            <p className="club-detail-price">
              ${Number(club.price).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="club-detail-body">
          <div className="club-detail-section">
            <h3>{t("specifications")}</h3>
            <p>{club.description}</p>
          </div>

          <div className="club-detail-specs">
            <div className="spec-group">
              <h3>{t("specifications")}</h3>
              <dl>
                <dt>{tc("labels.loft")}</dt>
                <dd>{club.loft}</dd>
                <dt>{t("availableShafts")}</dt>
                <dd>
                  {club.shaftFlex.map((f) => tc(`shaftFlex.${f}`)).join(", ")}
                </dd>
                <dt>{t("swingSpeedRange")}</dt>
                <dd>
                  {club.swingSpeedRange.map((s) => tc(`swingSpeed.${s}`)).join(", ")}
                </dd>
              </dl>
            </div>

            <div className="spec-group">
              <h3>{t("ratings")}</h3>
              <div className="rating-bars">
                <div className="rating-bar">
                  <span>{tc("ratings.forgiveness")}</span>
                  <div className="bar">
                    <div
                      className="bar-fill forgiveness"
                      style={{ width: `${club.forgivenessRating * 10}%` }}
                    />
                  </div>
                  <span>{club.forgivenessRating}{t("outOf")}</span>
                </div>
                <div className="rating-bar">
                  <span>{tc("ratings.distance")}</span>
                  <div className="bar">
                    <div
                      className="bar-fill distance"
                      style={{ width: `${club.distanceRating * 10}%` }}
                    />
                  </div>
                  <span>{club.distanceRating}{t("outOf")}</span>
                </div>
                <div className="rating-bar">
                  <span>{tc("ratings.accuracy")}</span>
                  <div className="bar">
                    <div
                      className="bar-fill accuracy"
                      style={{ width: `${club.accuracyRating * 10}%` }}
                    />
                  </div>
                  <span>{club.accuracyRating}{t("outOf")}</span>
                </div>
              </div>
            </div>

            <div className="spec-group">
              <h3>{t("suitableFor")}</h3>
              <div className="skill-badges">
                {club.skillLevels.map((sl) => (
                  <span key={sl} className="skill-badge large">
                    {tc(`skillLevels.${sl}`)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

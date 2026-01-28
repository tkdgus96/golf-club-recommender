import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import type { GolfClub } from "../types";
import { CLUB_TYPE_LABELS } from "../types";
import { getClub } from "../services/api";

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const [club, setClub] = useState<GolfClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClub(parseInt(id))
      .then(setClub)
      .catch(() => setError("Club not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error || !club)
    return (
      <div className="error-page">
        <h2>Club not found</h2>
        <Link to="/catalog" className="btn btn-primary">
          Back to Catalog
        </Link>
      </div>
    );

  const skillLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const flexLabel = (s: string) =>
    s
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <div className="club-detail-page">
      <Link to="/catalog" className="back-link">
        &larr; Back to Catalog
      </Link>

      <div className="club-detail">
        <div className="club-detail-header">
          <div>
            <span className="club-type-badge large">
              {CLUB_TYPE_LABELS[club.clubType]}
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
            <h3>Description</h3>
            <p>{club.description}</p>
          </div>

          <div className="club-detail-specs">
            <div className="spec-group">
              <h3>Specifications</h3>
              <dl>
                <dt>Loft</dt>
                <dd>{club.loft}</dd>
                <dt>Shaft Flex Options</dt>
                <dd>{club.shaftFlex.map(flexLabel).join(", ")}</dd>
                <dt>Swing Speed</dt>
                <dd>{club.swingSpeedRange.map(flexLabel).join(", ")}</dd>
              </dl>
            </div>

            <div className="spec-group">
              <h3>Ratings</h3>
              <div className="rating-bars">
                <div className="rating-bar">
                  <span>Forgiveness</span>
                  <div className="bar">
                    <div
                      className="bar-fill forgiveness"
                      style={{ width: `${club.forgivenessRating * 10}%` }}
                    />
                  </div>
                  <span>{club.forgivenessRating}/10</span>
                </div>
                <div className="rating-bar">
                  <span>Distance</span>
                  <div className="bar">
                    <div
                      className="bar-fill distance"
                      style={{ width: `${club.distanceRating * 10}%` }}
                    />
                  </div>
                  <span>{club.distanceRating}/10</span>
                </div>
                <div className="rating-bar">
                  <span>Accuracy</span>
                  <div className="bar">
                    <div
                      className="bar-fill accuracy"
                      style={{ width: `${club.accuracyRating * 10}%` }}
                    />
                  </div>
                  <span>{club.accuracyRating}/10</span>
                </div>
              </div>
            </div>

            <div className="spec-group">
              <h3>Suitable For</h3>
              <div className="skill-badges">
                {club.skillLevels.map((sl) => (
                  <span key={sl} className="skill-badge large">
                    {skillLabel(sl)}
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

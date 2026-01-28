import { useLocation, Link, Navigate } from "react-router-dom";
import type { RecommendationSet, ScoredClub, QuizAnswers } from "../types";

function ClubRecommendation({
  label,
  scored,
}: {
  label: string;
  scored: ScoredClub | null;
}) {
  if (!scored) return null;

  const { club, score, reasons } = scored;

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
          <span>Forgiveness: {club.forgivenessRating}/10</span>
          <span>Distance: {club.distanceRating}/10</span>
          <span>Accuracy: {club.accuracyRating}/10</span>
        </div>
        <div className="rec-reasons">
          <strong>Why this club:</strong>
          <ul>
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
        <Link to={`/clubs/${club.id}`} className="btn btn-sm btn-secondary">
          View Details
        </Link>
      </div>
    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const state = location.state as {
    results: RecommendationSet;
    answers: QuizAnswers;
  } | null;

  if (!state) {
    return <Navigate to="/quiz" replace />;
  }

  const { results, answers } = state;

  const skillLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="results-page">
      <div className="results-header">
        <h1>Your Recommended Set</h1>
        <p>
          Based on your profile: {skillLabel(answers.skillLevel)} player,{" "}
          {answers.swingSpeed.replace("_", " ")} swing speed, ${answers.budgetMin}-$
          {answers.budgetMax} per club budget.
        </p>
        <div className="results-total">
          <strong>Estimated Total Set Price:</strong>{" "}
          <span className="total-price">
            ${results.totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rec-grid">
        <ClubRecommendation label="Driver" scored={results.driver} />
        <ClubRecommendation label="Fairway Wood" scored={results.fairwayWood} />
        <ClubRecommendation label="Hybrid" scored={results.hybrid} />
        <ClubRecommendation label="Iron Set" scored={results.ironSet} />
        <ClubRecommendation label="Wedge" scored={results.wedge} />
        <ClubRecommendation label="Putter" scored={results.putter} />
      </div>

      <div className="results-actions">
        <Link to="/quiz" className="btn btn-secondary">
          Retake Quiz
        </Link>
        <Link to="/catalog" className="btn btn-primary">
          Browse Full Catalog
        </Link>
      </div>
    </div>
  );
}

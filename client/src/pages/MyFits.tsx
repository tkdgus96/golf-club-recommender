import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProfile } from "../contexts/ProfileContext";

function averageConfidence(results: {
  driver: { confidence: { score: number } } | null;
  fairwayWood: { confidence: { score: number } } | null;
  hybrid: { confidence: { score: number } } | null;
  ironSet: { confidence: { score: number } } | null;
  wedge: { confidence: { score: number } } | null;
  putter: { confidence: { score: number } } | null;
}) {
  const parts = [
    results.driver,
    results.fairwayWood,
    results.hybrid,
    results.ironSet,
    results.wedge,
    results.putter,
  ].filter(Boolean) as Array<{ confidence: { score: number } }>;

  if (parts.length === 0) return 0;
  return parts.reduce((sum, part) => sum + part.confidence.score, 0) / parts.length;
}

export default function MyFits() {
  const { t } = useTranslation("common");
  const { t: tr } = useTranslation("results");
  const { t: tc } = useTranslation("compare");
  const { savedBags, compareHistory, bestBag, removeBag, clearCompareHistory } = useProfile();

  return (
    <div className="my-fits-page">
      <div className="catalog-header">
        <h1>{t("myFits.title")}</h1>
        <p>{t("myFits.subtitle")}</p>
      </div>

      {bestBag && (
        <section className="my-fits-highlight">
          <h3>{t("myFits.bestBag")}</h3>
          <p>
            {bestBag.label} • {new Date(bestBag.createdAt).toLocaleDateString()} • $
            {bestBag.results.totalPrice.toFixed(2)}
          </p>
          <Link
            to="/results"
            state={{ results: bestBag.results, answers: bestBag.answers }}
            className="btn btn-primary btn-sm"
          >
            {t("myFits.openBag")}
          </Link>
        </section>
      )}

      <section className="my-fits-section">
        <h3>{t("myFits.savedBags")}</h3>
        {savedBags.length === 0 ? (
          <p>{t("myFits.noSavedBags")}</p>
        ) : (
          <div className="my-fits-list">
            {savedBags.map((bag) => (
              <div key={bag.id} className="my-fit-card">
                <div>
                  <strong>{bag.label}</strong>
                  <p>
                    {new Date(bag.createdAt).toLocaleString()} • $
                    {bag.results.totalPrice.toFixed(2)} • {Math.round(averageConfidence(bag.results) * 100)}%
                  </p>
                </div>
                <div className="my-fit-actions">
                  <Link
                    to="/results"
                    state={{ results: bag.results, answers: bag.answers }}
                    className="btn btn-secondary btn-sm"
                  >
                    {t("myFits.openBag")}
                  </Link>
                  <button className="btn btn-secondary btn-sm" onClick={() => removeBag(bag.id)}>
                    {t("myFits.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="my-fits-section">
        <div className="my-fits-header-row">
          <h3>{t("myFits.compareHistory")}</h3>
          {compareHistory.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={clearCompareHistory}>
              {t("myFits.clearHistory")}
            </button>
          )}
        </div>
        {compareHistory.length === 0 ? (
          <p>{t("myFits.noCompareHistory")}</p>
        ) : (
          <div className="my-fits-list">
            {compareHistory.map((item) => (
              <div key={item.id} className="my-fit-card">
                <div>
                  <strong>
                    {item.currentShaftName} → {item.targetShaftName}
                  </strong>
                  <p>
                    {new Date(item.createdAt).toLocaleString()} • {tc(`applications.${item.application}`)}
                  </p>
                </div>
                <div className="my-fit-metrics">
                  <span>
                    {tc("strokes.delta")}: {item.expectedStrokesDelta > 0 ? "+" : ""}
                    {item.expectedStrokesDelta.toFixed(2)}
                  </span>
                  <span>
                    {tr("confidence.title")}: {Math.round(item.modelConfidence * 100)}%
                  </span>
                  <span>
                    {tc("metrics.carry")}: {item.carryChange > 0 ? "+" : ""}
                    {Math.round(item.carryChange)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

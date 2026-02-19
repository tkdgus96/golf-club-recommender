import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Shaft } from "../types";
import { getShaft } from "../services/api";
import DataTrustBadge from "../components/common/DataTrustBadge";

const CATEGORY_KEYS: Record<number, string> = {
  2: "driverWood",
  3: "hybrid",
  4: "iron",
  5: "putter",
};

export default function ShaftDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("shafts");
  const { t: tc } = useTranslation("common");

  const [shaft, setShaft] = useState<Shaft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getShaft(id)
      .then(setShaft)
      .catch(() => setError(tc("errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [id, tc]);

  if (loading) {
    return <div className="loading">{tc("labels.loading")}</div>;
  }

  if (error || !shaft) {
    return (
      <div className="error-page">
        <h2>{t("errors.notFound")}</h2>
        <Link to="/shafts" className="btn btn-primary">
          {tc("buttons.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="shaft-detail-page">
      <Link to="/shafts" className="back-link">
        ← {t("backToFitting")}
      </Link>

      <div className="shaft-detail">
        <div className="shaft-detail-header">
          <div className="shaft-meta">
            <span className="shaft-vendor-badge">{shaft.vendor}</span>
            <span className="shaft-category-badge">
              {t(`categories.${CATEGORY_KEYS[shaft.category] || "driverWood"}`)}
            </span>
            <span className="shaft-type-badge">{shaft.type}</span>
          </div>
          <h1>{shaft.title}</h1>
        </div>

        <div className="shaft-detail-body">
          <div className="shaft-detail-specs">
            <div className="spec-group">
              <h3>{t("detail.specifications")}</h3>
              <dl>
                <dt>{t("specs.weight")}</dt>
                <dd>{shaft.weight}g</dd>
                <dt>{t("specs.flex")}</dt>
                <dd>{shaft.flex}</dd>
                <dt>{t("specs.torque")}</dt>
                <dd>{shaft.torque}°</dd>
                <dt>{t("specs.tip")}</dt>
                <dd>{shaft.tip}</dd>
                <dt>{t("specs.butt")}</dt>
                <dd>{shaft.butt}</dd>
                <dt>{t("specs.launch")}</dt>
                <dd>{shaft.launch}</dd>
                <dt>{t("specs.spin")}</dt>
                <dd>{shaft.spin}</dd>
              </dl>
            </div>

            <div className="spec-group">
              <h3>{t("detail.characteristics")}</h3>
              <div className="characteristic-bars">
                <div className="char-bar">
                  <span className="char-label">{t("chart.xAxis")}</span>
                  <div className="bar">
                    <div
                      className="bar-fill feel"
                      style={{ width: `${shaft.x}%` }}
                    />
                  </div>
                  <span className="char-value">{Number(shaft.x).toFixed(1)}</span>
                </div>
                <div className="char-bar">
                  <span className="char-label">{t("chart.yAxis")}</span>
                  <div className="bar">
                    <div
                      className="bar-fill trajectory"
                      style={{ width: `${shaft.y}%` }}
                    />
                  </div>
                  <span className="char-value">{Number(shaft.y).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
          <DataTrustBadge
            sourceName={shaft.sourceName}
            sourceUrl={shaft.sourceUrl}
            dataConfidence={shaft.dataConfidence}
          />
        </div>
      </div>
    </div>
  );
}

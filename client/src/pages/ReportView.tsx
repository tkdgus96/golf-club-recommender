import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSharedReport } from "../utils/reporting";

export default function ReportView() {
  const { t } = useTranslation("common");
  const { t: tr } = useTranslation("results");
  const { reportId } = useParams<{ reportId: string }>();

  if (!reportId) {
    return (
      <div className="error-page">
        <h2>{t("errors.generic")}</h2>
        <Link to="/" className="btn btn-primary">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  const report = getSharedReport(reportId);
  if (!report) {
    return (
      <div className="error-page">
        <h2>{t("report.notFound")}</h2>
        <p>{t("report.notFoundHint")}</p>
        <Link to="/" className="btn btn-primary">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <h1>{report.title}</h1>
        <p>{new Date(report.createdAt).toLocaleString()}</p>
        <div className="results-total">
          <strong>{tr("totalCost")}: </strong>
          <span className="total-price">${report.results.totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <div className="rec-grid">
        {[
          report.results.driver,
          report.results.fairwayWood,
          report.results.hybrid,
          report.results.ironSet,
          report.results.wedge,
          report.results.putter,
        ]
          .filter(Boolean)
          .map((item) => (
            <div className="rec-card" key={item!.club.id}>
              <div className="rec-card-header">
                <span className="rec-category">{item!.club.clubType}</span>
                <span className="rec-score">{item!.score.toFixed(1)} / 100</span>
              </div>
              <div className="rec-card-body">
                <h3>
                  {item!.club.brand} {item!.club.name}
                </h3>
                <p className="rec-price">${Number(item!.club.price).toFixed(2)}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

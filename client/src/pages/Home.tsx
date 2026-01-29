import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");

  return (
    <div className="home-page">
      <section className="hero">
        <h1>{t("hero.title")}</h1>
        <p>{t("hero.subtitle")}</p>
        <div className="hero-actions">
          <Link to="/quiz" className="btn btn-primary btn-lg">
            {t("hero.cta")}
          </Link>
          <Link to="/catalog" className="btn btn-secondary btn-lg">
            {tc("buttons.browseAll")}
          </Link>
        </div>
      </section>

      <section className="features">
        <h2>{t("features.title")}</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>{t("features.personalized.title")}</h3>
            <p>{t("features.personalized.description")}</p>
          </div>
          <div className="feature-card">
            <h3>{t("features.comprehensive.title")}</h3>
            <p>{t("features.comprehensive.description")}</p>
          </div>
          <div className="feature-card">
            <h3>{t("features.expert.title")}</h3>
            <p>{t("features.expert.description")}</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>{t("howItWorks.title")}</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">{t("howItWorks.step1.number")}</div>
            <h4>{t("howItWorks.step1.title")}</h4>
            <p>{t("howItWorks.step1.description")}</p>
          </div>
          <div className="step">
            <div className="step-number">{t("howItWorks.step2.number")}</div>
            <h4>{t("howItWorks.step2.title")}</h4>
            <p>{t("howItWorks.step2.description")}</p>
          </div>
          <div className="step">
            <div className="step-number">{t("howItWorks.step3.number")}</div>
            <h4>{t("howItWorks.step3.title")}</h4>
            <p>{t("howItWorks.step3.description")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

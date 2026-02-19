import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProfile } from "../contexts/ProfileContext";
import { useExperiment } from "../contexts/ExperimentContext";

export default function Home() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const {
    hasQuizDraft,
    lastCompletedQuizAt,
    onboardingVariant,
    bestBag,
    compareHistory,
  } = useProfile();
  const { variants, trackEvent } = useExperiment();
  const activeVariant = variants.onboarding_flow || onboardingVariant;
  const lastDate = lastCompletedQuizAt
    ? new Date(lastCompletedQuizAt).toLocaleDateString()
    : null;
  const daysSinceFit = lastCompletedQuizAt
    ? Math.floor((Date.now() - new Date(lastCompletedQuizAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const lastCompareAt = compareHistory[0]?.createdAt;
  const daysSinceCompare = lastCompareAt
    ? Math.floor((Date.now() - new Date(lastCompareAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="home-page">
      <section className="hero">
        <h1>{t(`heroVariants.${activeVariant}.title`, { defaultValue: t("hero.title") })}</h1>
        <p>
          {t(`heroVariants.${activeVariant}.subtitle`, {
            defaultValue: t("hero.subtitle"),
          })}
        </p>
        {lastDate && (
          <p className="hero-profile-note">
            {t("hero.lastSession", { date: lastDate })}
          </p>
        )}
        <div className="hero-actions">
          <Link
            to="/quiz"
            className="btn btn-primary btn-lg"
            onClick={() => trackEvent("home_quiz_cta_clicked", { variant: activeVariant })}
          >
            {hasQuizDraft ? t("hero.resumeCta") : t("hero.cta")}
          </Link>
          <Link
            to="/catalog"
            className="btn btn-secondary btn-lg"
            onClick={() => trackEvent("home_catalog_clicked")}
          >
            {tc("buttons.browseAll")}
          </Link>
          <Link
            to="/my-fits"
            className="btn btn-secondary btn-lg"
            onClick={() => trackEvent("home_myfits_clicked")}
          >
            {tc("nav.myFits")}
          </Link>
        </div>
        {bestBag && (
          <div className="hero-best-bag">
            <strong>{tc("myFits.bestBag")}:</strong> {bestBag.label} • $
            {bestBag.results.totalPrice.toFixed(2)}
          </div>
        )}
        <div className="retention-cards">
          {hasQuizDraft && (
            <div className="retention-card">
              <strong>Resume fitting</strong>
              <span>Your draft is saved. Finish to get current-season recommendations.</span>
            </div>
          )}
          {daysSinceFit !== null && daysSinceFit >= 14 && (
            <div className="retention-card">
              <strong>Time for a re-fit</strong>
              <span>It has been {daysSinceFit} days since your last fitting.</span>
            </div>
          )}
          {daysSinceCompare !== null && daysSinceCompare >= 7 && (
            <div className="retention-card">
              <strong>Re-check dispersion</strong>
              <span>Your last shaft compare was {daysSinceCompare} days ago.</span>
            </div>
          )}
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

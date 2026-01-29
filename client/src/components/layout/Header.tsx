import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../common/LanguageSelector";
import UnitToggle from "../common/UnitToggle";

export default function Header() {
  const location = useLocation();
  const { t } = useTranslation("common");

  const isActive = (path: string) =>
    location.pathname === path ? "active" : "";

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          {t("nav.logo")}
        </Link>
        <nav className="nav">
          <Link to="/" className={`nav-link ${isActive("/")}`}>
            {t("nav.home")}
          </Link>
          <Link to="/quiz" className={`nav-link ${isActive("/quiz")}`}>
            {t("nav.quiz")}
          </Link>
          <Link to="/catalog" className={`nav-link ${isActive("/catalog")}`}>
            {t("nav.catalog")}
          </Link>
        </nav>
        <div className="header-controls">
          <UnitToggle />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}

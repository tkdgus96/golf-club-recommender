import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./Header";

export default function Layout() {
  const { t } = useTranslation("common");

  return (
    <div className="app">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>{t("footer.copyright")}</p>
      </footer>
    </div>
  );
}

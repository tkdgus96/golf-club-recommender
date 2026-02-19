import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import { UnitProvider } from "./contexts/UnitContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { ExperimentProvider } from "./contexts/ExperimentContext";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import { ensureGlobalMonitoring } from "./utils/monitoring";
import App from "./App.tsx";

ensureGlobalMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UnitProvider>
      <ExperimentProvider>
        <ProfileProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </ProfileProvider>
      </ExperimentProvider>
    </UnitProvider>
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

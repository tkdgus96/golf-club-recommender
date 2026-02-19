import { useState } from "react";

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DataPrivacy() {
  const [message, setMessage] = useState("");

  const exportData = () => {
    const payload: Record<string, unknown> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("golf-") || key.startsWith("shared-report:")) {
        payload[key] = window.localStorage.getItem(key);
      }
    }

    downloadJson(
      `golffit-data-export-${new Date().toISOString().slice(0, 10)}.json`,
      payload
    );
    setMessage("Data export downloaded.");
  };

  const deleteAllData = () => {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("golf-") || key.startsWith("shared-report:")) {
        keys.push(key);
      }
    }

    keys.forEach((key) => window.localStorage.removeItem(key));
    setMessage("All local product data deleted. Refresh to start clean.");
  };

  return (
    <div className="privacy-page">
      <div className="catalog-header">
        <h1>Data & Privacy</h1>
        <p>Control your local data, exports, and deletion rights.</p>
      </div>

      <div className="quiz-step">
        <h2>Privacy Policy (MVP)</h2>
        <p>
          This app stores fitting profiles, reports, experiment analytics, and compare history on
          your device storage to personalize recommendations and improve product quality.
        </p>
        <p>
          Data categories: profile inputs, recommendation outputs, comparison metrics, optional
          shared reports, and anonymous product events.
        </p>
        <p>
          You can export or delete this data at any time from this page. Deletion removes all
          local records immediately.
        </p>
      </div>

      <div className="results-actions">
        <button className="btn btn-secondary" onClick={exportData}>
          Export My Data
        </button>
        <button className="btn btn-secondary" onClick={deleteAllData}>
          Delete My Data
        </button>
      </div>

      {message && <p className="results-action-message">{message}</p>}
    </div>
  );
}

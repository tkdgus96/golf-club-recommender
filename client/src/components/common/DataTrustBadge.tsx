import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface DataTrustBadgeProps {
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceUpdatedAt?: string | Date | null;
  dataConfidence?: number | null;
  compact?: boolean;
  className?: string;
}

function getConfidenceClass(value: number): "high" | "medium" | "low" {
  if (value >= 0.8) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}

export default function DataTrustBadge({
  sourceName,
  sourceUrl,
  sourceUpdatedAt,
  dataConfidence,
  compact = false,
  className,
}: DataTrustBadgeProps) {
  const { t } = useTranslation("common");

  const normalizedDate = useMemo(() => {
    if (!sourceUpdatedAt) return null;
    const date =
      typeof sourceUpdatedAt === "string"
        ? new Date(sourceUpdatedAt)
        : sourceUpdatedAt;
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
  }, [sourceUpdatedAt]);

  if (!sourceName && !sourceUrl && !normalizedDate && typeof dataConfidence !== "number") {
    return null;
  }

  const confidence =
    typeof dataConfidence === "number"
      ? Math.max(0, Math.min(1, Number(dataConfidence)))
      : null;

  return (
    <div className={`data-trust ${compact ? "compact" : ""} ${className ?? ""}`.trim()}>
      {confidence !== null && (
        <span className={`data-trust-confidence ${getConfidenceClass(confidence)}`}>
          {t("trust.confidence", {
            defaultValue: "Confidence {{value}}%",
            value: Math.round(confidence * 100),
          })}
        </span>
      )}

      <div className="data-trust-meta">
        {sourceName && (
          <span>
            {t("trust.source", { defaultValue: "Source" })}: {sourceName}
          </span>
        )}
        {normalizedDate && (
          <span>
            {t("trust.updated", { defaultValue: "Updated {{date}}", date: normalizedDate })}
          </span>
        )}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            {t("trust.verify", { defaultValue: "Verify" })}
          </a>
        )}
      </div>
    </div>
  );
}

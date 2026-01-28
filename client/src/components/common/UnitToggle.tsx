import { useTranslation } from "react-i18next";
import { useUnits } from "../../hooks/useUnits";

export default function UnitToggle() {
  const { t } = useTranslation("common");
  const { unitSystem, toggleUnit } = useUnits();

  return (
    <button
      className="unit-toggle"
      onClick={toggleUnit}
      aria-label="Toggle unit system"
      title={
        unitSystem === "imperial"
          ? t("units.metric")
          : t("units.imperial")
      }
    >
      {unitSystem === "imperial"
        ? t("units.imperial")
        : t("units.metric")}
    </button>
  );
}

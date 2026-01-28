import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { UnitContext } from "../contexts/UnitContext";
import type { UnitSystem } from "../contexts/UnitContext";

export function useUnits() {
  const { unitSystem, setUnitSystem, toggleUnit } = useContext(UnitContext);
  const { t } = useTranslation("units");

  const isMetric = unitSystem === "metric";

  const getSpeedUnit = () => (isMetric ? t("speed.ms") : t("speed.mph"));

  const getDistanceUnit = () =>
    isMetric ? t("distance.meters") : t("distance.yards");

  const getHeightLabel = (category: string) => {
    const system = isMetric ? "metric" : "imperial";
    return t(`height.${system}.${category}`);
  };

  const getSwingSpeedDescription = (
    level: "slow" | "moderate" | "fast" | "very_fast"
  ) => {
    const system = isMetric ? "metric" : "imperial";
    const values = {
      slow: t(`swingSpeedValues.${system}.slow`),
      moderateLow: t(`swingSpeedValues.${system}.moderateLow`),
      moderateHigh: t(`swingSpeedValues.${system}.moderateHigh`),
      fastLow: t(`swingSpeedValues.${system}.fastLow`),
      fastHigh: t(`swingSpeedValues.${system}.fastHigh`),
      veryFast: t(`swingSpeedValues.${system}.veryFast`),
    };

    switch (level) {
      case "slow":
        return values.slow;
      case "moderate":
        return `${values.moderateLow} - ${values.moderateHigh}`;
      case "fast":
        return `${values.fastLow} - ${values.fastHigh}`;
      case "very_fast":
        return values.veryFast;
    }
  };

  return {
    unitSystem,
    setUnitSystem,
    toggleUnit,
    isMetric,
    getSpeedUnit,
    getDistanceUnit,
    getHeightLabel,
    getSwingSpeedDescription,
  };
}

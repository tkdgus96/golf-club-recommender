import { createContext, useState, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type UnitSystem = "imperial" | "metric";

interface UnitContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnit: () => void;
}

export const UnitContext = createContext<UnitContextType>({
  unitSystem: "imperial",
  setUnitSystem: () => {},
  toggleUnit: () => {},
});

const METRIC_DEFAULT_LANGS = ["ko", "zh", "es", "ja"];

export function UnitProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    const saved = localStorage.getItem("unitSystem");
    if (saved === "imperial" || saved === "metric") return saved;
    const lang = i18n.language?.substring(0, 2) || "en";
    return METRIC_DEFAULT_LANGS.includes(lang) ? "metric" : "imperial";
  });

  useEffect(() => {
    localStorage.setItem("unitSystem", unitSystem);
  }, [unitSystem]);

  const toggleUnit = () => {
    setUnitSystem((prev) => (prev === "imperial" ? "metric" : "imperial"));
  };

  return (
    <UnitContext.Provider value={{ unitSystem, setUnitSystem, toggleUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

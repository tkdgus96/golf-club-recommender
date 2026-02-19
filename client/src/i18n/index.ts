import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enQuiz from "./locales/en/quiz.json";
import enCatalog from "./locales/en/catalog.json";
import enClubDetail from "./locales/en/clubDetail.json";
import enResults from "./locales/en/results.json";
import enUnits from "./locales/en/units.json";
import enShafts from "./locales/en/shafts.json";
import enSimulator from "./locales/en/simulator.json";
import enCompare from "./locales/en/compare.json";

import koCommon from "./locales/ko/common.json";
import koHome from "./locales/ko/home.json";
import koQuiz from "./locales/ko/quiz.json";
import koCatalog from "./locales/ko/catalog.json";
import koClubDetail from "./locales/ko/clubDetail.json";
import koResults from "./locales/ko/results.json";
import koUnits from "./locales/ko/units.json";
import koShafts from "./locales/ko/shafts.json";
import koSimulator from "./locales/ko/simulator.json";
import koCompare from "./locales/ko/compare.json";

import zhCommon from "./locales/zh/common.json";
import zhHome from "./locales/zh/home.json";
import zhQuiz from "./locales/zh/quiz.json";
import zhCatalog from "./locales/zh/catalog.json";
import zhClubDetail from "./locales/zh/clubDetail.json";
import zhResults from "./locales/zh/results.json";
import zhUnits from "./locales/zh/units.json";
import zhShafts from "./locales/zh/shafts.json";
import zhSimulator from "./locales/zh/simulator.json";
import zhCompare from "./locales/zh/compare.json";

import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esQuiz from "./locales/es/quiz.json";
import esCatalog from "./locales/es/catalog.json";
import esClubDetail from "./locales/es/clubDetail.json";
import esResults from "./locales/es/results.json";
import esUnits from "./locales/es/units.json";
import esShafts from "./locales/es/shafts.json";
import esSimulator from "./locales/es/simulator.json";
import esCompare from "./locales/es/compare.json";

import jaCommon from "./locales/ja/common.json";
import jaHome from "./locales/ja/home.json";
import jaQuiz from "./locales/ja/quiz.json";
import jaCatalog from "./locales/ja/catalog.json";
import jaClubDetail from "./locales/ja/clubDetail.json";
import jaResults from "./locales/ja/results.json";
import jaUnits from "./locales/ja/units.json";
import jaShafts from "./locales/ja/shafts.json";
import jaSimulator from "./locales/ja/simulator.json";
import jaCompare from "./locales/ja/compare.json";

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    quiz: enQuiz,
    catalog: enCatalog,
    clubDetail: enClubDetail,
    results: enResults,
    units: enUnits,
    shafts: enShafts,
    simulator: enSimulator,
    compare: enCompare,
  },
  ko: {
    common: koCommon,
    home: koHome,
    quiz: koQuiz,
    catalog: koCatalog,
    clubDetail: koClubDetail,
    results: koResults,
    units: koUnits,
    shafts: koShafts,
    simulator: koSimulator,
    compare: koCompare,
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    quiz: zhQuiz,
    catalog: zhCatalog,
    clubDetail: zhClubDetail,
    results: zhResults,
    units: zhUnits,
    shafts: zhShafts,
    simulator: zhSimulator,
    compare: zhCompare,
  },
  es: {
    common: esCommon,
    home: esHome,
    quiz: esQuiz,
    catalog: esCatalog,
    clubDetail: esClubDetail,
    results: esResults,
    units: esUnits,
    shafts: esShafts,
    simulator: esSimulator,
    compare: esCompare,
  },
  ja: {
    common: jaCommon,
    home: jaHome,
    quiz: jaQuiz,
    catalog: jaCatalog,
    clubDetail: jaClubDetail,
    results: jaResults,
    units: jaUnits,
    shafts: jaShafts,
    simulator: jaSimulator,
    compare: jaCompare,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "home", "quiz", "catalog", "clubDetail", "results", "units", "shafts", "simulator", "compare"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;

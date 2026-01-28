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

import koCommon from "./locales/ko/common.json";
import koHome from "./locales/ko/home.json";
import koQuiz from "./locales/ko/quiz.json";
import koCatalog from "./locales/ko/catalog.json";
import koClubDetail from "./locales/ko/clubDetail.json";
import koResults from "./locales/ko/results.json";
import koUnits from "./locales/ko/units.json";

import zhCommon from "./locales/zh/common.json";
import zhHome from "./locales/zh/home.json";
import zhQuiz from "./locales/zh/quiz.json";
import zhCatalog from "./locales/zh/catalog.json";
import zhClubDetail from "./locales/zh/clubDetail.json";
import zhResults from "./locales/zh/results.json";
import zhUnits from "./locales/zh/units.json";

import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esQuiz from "./locales/es/quiz.json";
import esCatalog from "./locales/es/catalog.json";
import esClubDetail from "./locales/es/clubDetail.json";
import esResults from "./locales/es/results.json";
import esUnits from "./locales/es/units.json";

import jaCommon from "./locales/ja/common.json";
import jaHome from "./locales/ja/home.json";
import jaQuiz from "./locales/ja/quiz.json";
import jaCatalog from "./locales/ja/catalog.json";
import jaClubDetail from "./locales/ja/clubDetail.json";
import jaResults from "./locales/ja/results.json";
import jaUnits from "./locales/ja/units.json";

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    quiz: enQuiz,
    catalog: enCatalog,
    clubDetail: enClubDetail,
    results: enResults,
    units: enUnits,
  },
  ko: {
    common: koCommon,
    home: koHome,
    quiz: koQuiz,
    catalog: koCatalog,
    clubDetail: koClubDetail,
    results: koResults,
    units: koUnits,
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    quiz: zhQuiz,
    catalog: zhCatalog,
    clubDetail: zhClubDetail,
    results: zhResults,
    units: zhUnits,
  },
  es: {
    common: esCommon,
    home: esHome,
    quiz: esQuiz,
    catalog: esCatalog,
    clubDetail: esClubDetail,
    results: esResults,
    units: esUnits,
  },
  ja: {
    common: jaCommon,
    home: jaHome,
    quiz: jaQuiz,
    catalog: jaCatalog,
    clubDetail: jaClubDetail,
    results: jaResults,
    units: jaUnits,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "home", "quiz", "catalog", "clubDetail", "results", "units"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;

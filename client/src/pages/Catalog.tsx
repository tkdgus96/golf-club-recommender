import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { GolfClub, ClubFilters } from "../types";
import { getClubs, getBrands } from "../services/api";

export default function Catalog() {
  const { t } = useTranslation("catalog");
  const { t: tc } = useTranslation("common");
  const { i18n } = useTranslation();

  const [clubs, setClubs] = useState<GolfClub[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ClubFilters>({ page: 1, limit: 20 });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    getBrands().then(setBrands).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    getClubs(filters)
      .then((res) => {
        setClubs(res.clubs);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, i18n.language]);

  const updateFilter = (key: keyof ClubFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleSearch = () => {
    updateFilter("search", searchInput);
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setSearchInput("");
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1>{t("title")}</h1>
        <p>{t("results.showing", { count: total })}</p>
      </div>

      <div className="catalog-layout">
        <aside className="filters-sidebar">
          <h3>{t("filters.title")}</h3>

          <div className="filter-group">
            <label>{tc("buttons.search")}</label>
            <div className="search-input">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t("filters.search")}
              />
              <button className="btn btn-sm" onClick={handleSearch}>
                {tc("buttons.search")}
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>{t("filters.type")}</label>
            <select
              value={filters.type || ""}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">{tc("labels.all")}</option>
              <option value="driver">{tc("clubTypes.driver")}</option>
              <option value="fairway_wood">{tc("clubTypes.fairway_wood")}</option>
              <option value="hybrid">{tc("clubTypes.hybrid")}</option>
              <option value="iron_set">{tc("clubTypes.iron_set")}</option>
              <option value="wedge">{tc("clubTypes.wedge")}</option>
              <option value="putter">{tc("clubTypes.putter")}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t("filters.brand")}</label>
            <select
              value={filters.brand || ""}
              onChange={(e) => updateFilter("brand", e.target.value)}
            >
              <option value="">{tc("labels.all")}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t("filters.skillLevel")}</label>
            <select
              value={filters.skillLevel || ""}
              onChange={(e) => updateFilter("skillLevel", e.target.value)}
            >
              <option value="">{tc("labels.all")}</option>
              <option value="beginner">{tc("skillLevels.beginner")}</option>
              <option value="intermediate">{tc("skillLevels.intermediate")}</option>
              <option value="advanced">{tc("skillLevels.advanced")}</option>
              <option value="professional">{tc("skillLevels.professional")}</option>
            </select>
          </div>

          <div className="filter-group">
            <label>{t("filters.priceRange")}</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder={t("filters.minPrice")}
                value={filters.minPrice || ""}
                onChange={(e) =>
                  updateFilter("minPrice", parseInt(e.target.value) || undefined)
                }
                min={0}
              />
              <span>-</span>
              <input
                type="number"
                placeholder={t("filters.maxPrice")}
                value={filters.maxPrice || ""}
                onChange={(e) =>
                  updateFilter("maxPrice", parseInt(e.target.value) || undefined)
                }
                min={0}
              />
            </div>
          </div>

          <button className="btn btn-secondary btn-block" onClick={clearFilters}>
            {t("filters.clearAll")}
          </button>
        </aside>

        <div className="club-grid-area">
          {loading ? (
            <div className="loading">{tc("labels.loading")}</div>
          ) : clubs.length === 0 ? (
            <div className="empty-state">
              <h3>{t("results.noResults")}</h3>
              <p>{t("results.noResultsHint")}</p>
            </div>
          ) : (
            <>
              <div className="club-grid">
                {clubs.map((club) => (
                  <Link
                    to={`/clubs/${club.id}`}
                    key={club.id}
                    className="club-card"
                  >
                    <div className="club-card-header">
                      <span className="club-type-badge">
                        {tc(`clubTypes.${club.clubType}`)}
                      </span>
                      <span className="club-brand">{club.brand}</span>
                    </div>
                    <h3 className="club-name">{club.name}</h3>
                    <p className="club-price">${Number(club.price).toFixed(2)}</p>
                    <div className="club-ratings">
                      <span title={tc("ratings.forgiveness")}>
                        {tc("ratings.forgiveness")}: {club.forgivenessRating}/10
                      </span>
                      <span title={tc("ratings.distance")}>
                        {tc("ratings.distance")}: {club.distanceRating}/10
                      </span>
                      <span title={tc("ratings.accuracy")}>
                        {tc("ratings.accuracy")}: {club.accuracyRating}/10
                      </span>
                    </div>
                    <div className="club-skills">
                      {club.skillLevels.map((sl) => (
                        <span key={sl} className="skill-badge">
                          {tc(`skillLevels.${sl}`)}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-sm"
                    disabled={filters.page === 1}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: (prev.page || 1) - 1,
                      }))
                    }
                  >
                    {t("pagination.prev")}
                  </button>
                  <span>
                    {t("pagination.page", { current: filters.page, total: totalPages })}
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={filters.page === totalPages}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: (prev.page || 1) + 1,
                      }))
                    }
                  >
                    {t("pagination.next")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

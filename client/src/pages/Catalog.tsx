import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { GolfClub, ClubFilters } from "../types";
import { CLUB_TYPE_LABELS } from "../types";
import { getClubs, getBrands } from "../services/api";

export default function Catalog() {
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
  }, [filters]);

  const updateFilter = (key: keyof ClubFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handleSearch = () => {
    updateFilter("search", searchInput);
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setSearchInput("");
  };

  const skillLabel = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1>Golf Club Catalog</h1>
        <p>{total} clubs available</p>
      </div>

      <div className="catalog-layout">
        <aside className="filters-sidebar">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Search</label>
            <div className="search-input">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search clubs..."
              />
              <button className="btn btn-sm" onClick={handleSearch}>
                Search
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>Club Type</label>
            <select
              value={filters.type || ""}
              onChange={(e) => updateFilter("type", e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(CLUB_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Brand</label>
            <select
              value={filters.brand || ""}
              onChange={(e) => updateFilter("brand", e.target.value)}
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Skill Level</label>
            <select
              value={filters.skillLevel || ""}
              onChange={(e) => updateFilter("skillLevel", e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Price Range</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ""}
                onChange={(e) =>
                  updateFilter("minPrice", parseInt(e.target.value) || undefined)
                }
                min={0}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ""}
                onChange={(e) =>
                  updateFilter("maxPrice", parseInt(e.target.value) || undefined)
                }
                min={0}
              />
            </div>
          </div>

          <button className="btn btn-secondary btn-block" onClick={clearFilters}>
            Clear Filters
          </button>
        </aside>

        <div className="club-grid-area">
          {loading ? (
            <div className="loading">Loading clubs...</div>
          ) : clubs.length === 0 ? (
            <div className="empty-state">
              <h3>No clubs found</h3>
              <p>Try adjusting your filters.</p>
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
                        {CLUB_TYPE_LABELS[club.clubType]}
                      </span>
                      <span className="club-brand">{club.brand}</span>
                    </div>
                    <h3 className="club-name">{club.name}</h3>
                    <p className="club-price">${Number(club.price).toFixed(2)}</p>
                    <div className="club-ratings">
                      <span title="Forgiveness">
                        Forgive: {club.forgivenessRating}/10
                      </span>
                      <span title="Distance">
                        Distance: {club.distanceRating}/10
                      </span>
                      <span title="Accuracy">
                        Accuracy: {club.accuracyRating}/10
                      </span>
                    </div>
                    <div className="club-skills">
                      {club.skillLevels.map((sl) => (
                        <span key={sl} className="skill-badge">
                          {skillLabel(sl)}
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
                    Previous
                  </button>
                  <span>
                    Page {filters.page} of {totalPages}
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
                    Next
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

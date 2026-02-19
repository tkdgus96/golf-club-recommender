import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Shaft } from "../../types";
import { getShafts, getShaftVendors } from "../../services/api";

interface ShaftSelectorProps {
  label: string;
  selectedShaft: Shaft | null;
  onSelect: (shaft: Shaft | null) => void;
  categoryFilter?: number;
  applicationFilter?: string;
}

export default function ShaftSelector({
  label,
  selectedShaft,
  onSelect,
  categoryFilter,
  applicationFilter,
}: ShaftSelectorProps) {
  const { t } = useTranslation("compare");
  const { t: tc } = useTranslation("common");
  const { t: ts } = useTranslation("shafts");

  const [shafts, setShafts] = useState<Shaft[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    Promise.all([getShafts({ limit: 500, application: applicationFilter }), getShaftVendors()])
      .then(([shaftsRes, vendorsRes]) => {
        setShafts(shaftsRes.shafts);
        setVendors(vendorsRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [applicationFilter]);

  const filteredShafts = useMemo(() => {
    return shafts.filter((shaft) => {
      const matchesCategory = !categoryFilter || shaft.category === categoryFilter;
      const matchesApplication =
        !applicationFilter || shaft.applications?.includes(applicationFilter);
      const matchesVendor = !vendorFilter || shaft.vendor === vendorFilter;
      const matchesSearch =
        !search ||
        shaft.title.toLowerCase().includes(search.toLowerCase()) ||
        shaft.vendor.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesApplication && matchesVendor && matchesSearch;
    });
  }, [shafts, vendorFilter, search, categoryFilter, applicationFilter]);

  const handleSelect = (shaft: Shaft) => {
    onSelect(shaft);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onSelect(null);
    setSearch("");
  };

  return (
    <div className="shaft-selector">
      <label className="selector-label">{label}</label>

      {selectedShaft ? (
        <div className="selected-shaft">
          <div className="selected-shaft-header">
            <span className="shaft-vendor-sm">{selectedShaft.vendor}</span>
            <button className="clear-btn" onClick={handleClear} title={t("clear")}>
              &times;
            </button>
          </div>
          <h4>{selectedShaft.title}</h4>
          <div className="shaft-applications-mini">
            {(selectedShaft.applications || []).map((app) => (
              <span key={app} className="shaft-application-chip">
                {t(`applications.${app}`)}
              </span>
            ))}
          </div>
          <dl className="shaft-specs-mini">
            <dt>{ts("specs.weight")}</dt>
            <dd>{selectedShaft.weight}g</dd>
            <dt>{ts("specs.flex")}</dt>
            <dd>{selectedShaft.flex}</dd>
            <dt>{ts("specs.torque")}</dt>
            <dd>{selectedShaft.torque}°</dd>
            <dt>{ts("specs.launch")}</dt>
            <dd>{selectedShaft.launch}</dd>
            <dt>{ts("specs.spin")}</dt>
            <dd>{selectedShaft.spin}</dd>
          </dl>
        </div>
      ) : (
        <div className="shaft-dropdown">
          <div
            className="dropdown-trigger"
            onClick={() => setIsOpen(!isOpen)}
          >
            {loading ? tc("labels.loading") : t("selectShaft")}
            <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
          </div>

          {isOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-filters">
                <input
                  type="text"
                  placeholder={t("searchShafts")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="dropdown-search"
                  autoFocus
                />
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="dropdown-vendor"
                >
                  <option value="">{tc("labels.all")} {ts("filters.vendor")}</option>
                  {vendors.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="dropdown-list">
                {filteredShafts.length === 0 ? (
                  <div className="dropdown-empty">{tc("labels.noResults")}</div>
                ) : (
                  filteredShafts.slice(0, 50).map((shaft) => (
                    <div
                      key={shaft.id}
                      className="dropdown-item"
                      onClick={() => handleSelect(shaft)}
                    >
                      <span className="item-vendor">{shaft.vendor}</span>
                      <span className="item-title">{shaft.title}</span>
                      <span className="item-specs">
                        {shaft.weight}g | {shaft.flex} |{" "}
                        {(shaft.applications || [])
                          .map((app) => t(`applications.${app}`))
                          .join(", ")}
                      </span>
                    </div>
                  ))
                )}
                {filteredShafts.length > 50 && (
                  <div className="dropdown-more">
                    {t("moreResults", { count: filteredShafts.length - 50 })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

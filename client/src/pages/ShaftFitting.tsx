import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Shaft, ShaftFilters } from "../types";
import { getShafts, getShaftVendors, getShaftFlexOptions } from "../services/api";
import DataTrustBadge from "../components/common/DataTrustBadge";

const CATEGORY_KEYS: Record<number, string> = {
  2: "driverWood",
  3: "hybrid",
  4: "iron",
  5: "putter",
};

const CATEGORY_COLORS: Record<number, string> = {
  2: "#3498db",
  3: "#2ecc71",
  4: "#9b59b6",
  5: "#e67e22",
};

export default function ShaftFitting() {
  const { t } = useTranslation("shafts");
  const { t: tc } = useTranslation("common");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [shafts, setShafts] = useState<Shaft[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [flexOptions, setFlexOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ShaftFilters>({ limit: 500 });
  const [selectedShaft, setSelectedShaft] = useState<Shaft | null>(null);
  const [hoveredShaft, setHoveredShaft] = useState<Shaft | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 500 });

  useEffect(() => {
    Promise.all([getShaftVendors(), getShaftFlexOptions()])
      .then(([v, f]) => {
        setVendors(v);
        setFlexOptions(f);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    getShafts(filters)
      .then((res) => setShafts(res.shafts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(400, rect.width - 40),
          height: Math.max(350, Math.min(500, rect.width * 0.6)),
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 50;
    const chartWidth = canvasSize.width - padding * 2;
    const chartHeight = canvasSize.height - padding * 2;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(padding, padding, chartWidth, chartHeight);

    // Draw grid
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth * i) / 10;
      const y = padding + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#333";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("chart.xAxis"), padding + chartWidth / 2, canvasSize.height - 10);
    ctx.save();
    ctx.translate(15, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(t("chart.yAxis"), 0, 0);
    ctx.restore();

    // Scale labels
    ctx.fillStyle = "#666";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(t("chart.soft"), padding, padding + chartHeight + 15);
    ctx.textAlign = "right";
    ctx.fillText(t("chart.firm"), padding + chartWidth, padding + chartHeight + 15);
    ctx.textAlign = "left";
    ctx.fillText(t("chart.low"), padding - 35, padding + chartHeight);
    ctx.fillText(t("chart.high"), padding - 35, padding + 10);

    // Draw data points
    shafts.forEach((shaft) => {
      const x = padding + (Number(shaft.x) / 100) * chartWidth;
      const y = padding + chartHeight - (Number(shaft.y) / 100) * chartHeight;
      const color = CATEGORY_COLORS[shaft.category] || "#666";
      const isSelected = selectedShaft?.id === shaft.id;
      const isHovered = hoveredShaft?.id === shaft.id;

      ctx.beginPath();
      ctx.arc(x, y, isSelected || isHovered ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#1a6b3c" : color;
      ctx.fill();
      if (isSelected || isHovered) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [shafts, selectedShaft, hoveredShaft, canvasSize, t]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const padding = 50;
    const chartWidth = canvasSize.width - padding * 2;
    const chartHeight = canvasSize.height - padding * 2;

    let closest: Shaft | null = null;
    let minDist = 20;

    shafts.forEach((shaft) => {
      const x = padding + (Number(shaft.x) / 100) * chartWidth;
      const y = padding + chartHeight - (Number(shaft.y) / 100) * chartHeight;
      const dist = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = shaft;
      }
    });

    setSelectedShaft(closest);
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const moveY = e.clientY - rect.top;

    const padding = 50;
    const chartWidth = canvasSize.width - padding * 2;
    const chartHeight = canvasSize.height - padding * 2;

    let closest: Shaft | null = null;
    let minDist = 15;

    shafts.forEach((shaft) => {
      const x = padding + (Number(shaft.x) / 100) * chartWidth;
      const y = padding + chartHeight - (Number(shaft.y) / 100) * chartHeight;
      const dist = Math.sqrt((moveX - x) ** 2 + (moveY - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = shaft;
      }
    });

    setHoveredShaft(closest);
    canvas.style.cursor = closest ? "pointer" : "default";
  };

  const updateFilter = (key: keyof ShaftFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({ limit: 500 });
  };

  return (
    <div className="shaft-fitting-page">
      <div className="shaft-fitting-header">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <div className="shaft-fitting-layout">
        <aside className="filters-sidebar">
          <h3>{t("filters.title")}</h3>

          <div className="filter-group">
            <label>{t("filters.vendor")}</label>
            <select
              value={filters.vendor || ""}
              onChange={(e) => updateFilter("vendor", e.target.value)}
            >
              <option value="">{tc("labels.all")}</option>
              {vendors.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t("filters.flex")}</label>
            <select
              value={filters.flex || ""}
              onChange={(e) => updateFilter("flex", e.target.value)}
            >
              <option value="">{tc("labels.all")}</option>
              {flexOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t("filters.category")}</label>
            <select
              value={filters.category ?? ""}
              onChange={(e) =>
                updateFilter("category", e.target.value ? parseInt(e.target.value) : undefined)
              }
            >
              <option value="">{tc("labels.all")}</option>
              {Object.entries(CATEGORY_KEYS).map(([k, key]) => (
                <option key={k} value={k}>{t(`categories.${key}`)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{t("filters.weightRange")}</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder={t("filters.min")}
                value={filters.minWeight || ""}
                onChange={(e) =>
                  updateFilter("minWeight", parseFloat(e.target.value) || undefined)
                }
                min={0}
              />
              <span>-</span>
              <input
                type="number"
                placeholder={t("filters.max")}
                value={filters.maxWeight || ""}
                onChange={(e) =>
                  updateFilter("maxWeight", parseFloat(e.target.value) || undefined)
                }
                min={0}
              />
            </div>
          </div>

          <button className="btn btn-secondary btn-block" onClick={clearFilters}>
            {t("filters.clearAll")}
          </button>

          <div className="chart-legend">
            <h4>{t("legend.title")}</h4>
            {Object.entries(CATEGORY_KEYS).map(([k, key]) => (
              <div key={k} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: CATEGORY_COLORS[parseInt(k)] }}
                />
                {t(`categories.${key}`)}
              </div>
            ))}
          </div>
        </aside>

        <div className="chart-area" ref={containerRef}>
          {loading ? (
            <div className="loading">{tc("labels.loading")}</div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
                onMouseLeave={() => setHoveredShaft(null)}
              />
              <p className="chart-hint">{t("chart.hint")}</p>
            </>
          )}
        </div>

        {(selectedShaft || hoveredShaft) && (
          <aside className="shaft-preview">
            <ShaftPreviewCard shaft={selectedShaft || hoveredShaft!} t={t} tc={tc} />
          </aside>
        )}
      </div>
    </div>
  );
}

function ShaftPreviewCard({
  shaft,
  t,
  tc,
}: {
  shaft: Shaft;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  return (
    <div className="shaft-preview-card">
      <div className="shaft-preview-header">
        <span className="shaft-vendor">{shaft.vendor}</span>
        <span
          className="category-badge"
          style={{ backgroundColor: CATEGORY_COLORS[shaft.category] }}
        >
          {t(`categories.${CATEGORY_KEYS[shaft.category] || "driverWood"}`)}
        </span>
      </div>
      <h3>{shaft.title}</h3>
      <dl className="shaft-specs">
        <dt>{t("specs.weight")}</dt>
        <dd>{shaft.weight}g</dd>
        <dt>{t("specs.flex")}</dt>
        <dd>{shaft.flex}</dd>
        <dt>{t("specs.torque")}</dt>
        <dd>{shaft.torque}°</dd>
        <dt>{t("specs.tip")}</dt>
        <dd>{shaft.tip}</dd>
        <dt>{t("specs.butt")}</dt>
        <dd>{shaft.butt}</dd>
      </dl>
      <DataTrustBadge
        compact
        sourceName={shaft.sourceName}
        sourceUrl={shaft.sourceUrl}
        dataConfidence={shaft.dataConfidence}
      />
      <Link to={`/shafts/${shaft.id}`} className="btn btn-primary btn-sm">
        {tc("buttons.viewDetails")}
      </Link>
    </div>
  );
}

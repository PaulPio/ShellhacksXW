import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabaseClient";
import type { Facility } from "../lib/types";

const FIU_MMC_CENTER: [number, number] = [25.7565, -80.3753];
const REFRESH_MS = 25_000;

/*
 * The fullness ramp is lightness-ordered as well as hue-ordered, so the three
 * states stay distinguishable for red/green colour blindness and in greyscale.
 */
const FILL_OK = "#1f7a4d";
const FILL_WARN = "#d99400";
const FILL_BUSY = "#b3261e";
const FILL_UNRELIABLE = "#6d28d9";
const FILL_NODATA = "#8b95a5";

const LEGEND = [
  { color: FILL_OK, label: "Under 60% full" },
  { color: FILL_WARN, label: "60–85% full" },
  { color: FILL_BUSY, label: "Over 85% full" },
  { color: FILL_UNRELIABLE, label: "Unreliable reading" },
  { color: FILL_NODATA, label: "No data" },
];

/**
 * Leaflet measures its container's pixel size once at mount. In a flex
 * layout (needed so the map fills whatever space is left under a NavBar
 * that can wrap to two lines on narrow screens), that size isn't always
 * settled in the same paint -- Leaflet can init against a 0-height
 * container. Re-measuring after mount and on resize fixes it reliably.
 */
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timeoutId = setTimeout(invalidate, 0);
    window.addEventListener("resize", invalidate);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}

function colorForPct(pct: number | null, isUnreliable: boolean): string {
  if (isUnreliable) return FILL_UNRELIABLE;
  if (pct === null) return FILL_NODATA;
  if (pct < 60) return FILL_OK;
  if (pct < 85) return FILL_WARN;
  return FILL_BUSY;
}

async function fetchFacilities(includeHidden: boolean): Promise<Facility[]> {
  let query = supabase.from("pantherpark_facilities").select("*");
  if (!includeHidden) {
    query = query.eq("display_hidden", false);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Failed to load facilities:", error.message);
    return [];
  }
  return data as Facility[];
}

export default function MapView() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const rows = await fetchFacilities(showHidden);
      if (!cancelled) setFacilities(rows);
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showHidden]);

  return (
    <div className="map-wrap">
      <div className="map-panel">
        <div className="map-panel-head">Lot fullness</div>
        <div className="map-legend">
          {LEGEND.map((item) => (
            <div key={item.label} className="map-legend-item">
              <span
                className="map-legend-swatch"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </div>
          ))}
        </div>
        <label className="map-panel-foot">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          Show hidden facilities
        </label>
      </div>

      <MapContainer center={FIU_MMC_CENTER} zoom={16} style={{ flex: 1, width: "100%" }}>
        <MapResizeHandler />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {facilities
          .filter((f) => f.latitude !== null && f.longitude !== null)
          .map((f) => {
            const displayPct = f.current_pct !== null ? Math.min(f.current_pct, 100) : null;
            return (
              <CircleMarker
                key={f.id}
                center={[f.latitude as number, f.longitude as number]}
                radius={f.display_hidden ? 8 : 12}
                pathOptions={{
                  color: f.display_hidden ? "#6b7280" : colorForPct(displayPct, f.is_unreliable),
                  weight: 2,
                  fillColor: colorForPct(displayPct, f.is_unreliable),
                  fillOpacity: f.display_hidden ? 0.4 : 0.8,
                  dashArray: f.display_hidden ? "4 3" : undefined,
                }}
              >
                <Popup>
                  <span className="lot-popup-name">{f.full_name ?? f.name}</span>
                  <span className="lot-popup-fill">
                    {displayPct !== null ? `${displayPct.toFixed(0)}% full` : "No data"} ·{" "}
                    {f.current_total ?? "?"} / {f.max_occupancy_total ?? "?"} spaces
                  </span>
                  {f.is_unreliable && (
                    <span className="lot-popup-note" style={{ color: FILL_UNRELIABLE }}>
                      Unreliable / event-day reading
                    </span>
                  )}
                  {f.display_hidden && (
                    <span className="lot-popup-note" style={{ color: FILL_NODATA }}>
                      Hidden from the default view
                    </span>
                  )}
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}

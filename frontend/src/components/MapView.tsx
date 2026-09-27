import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabaseClient";
import type { Facility } from "../lib/types";

const FIU_MMC_CENTER: [number, number] = [25.7565, -80.3753];
const REFRESH_MS = 25_000;

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
  if (isUnreliable) return "#8b5cf6"; // purple = flagged unreliable/event-day
  if (pct === null) return "#9ca3af"; // gray = no data
  if (pct < 60) return "#22c55e"; // green
  if (pct < 85) return "#eab308"; // yellow
  return "#ef4444"; // red
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
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 400,
        width: "100%",
      }}
    >
      <label
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          background: "white",
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 13,
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }}
      >
        <input
          type="checkbox"
          checked={showHidden}
          onChange={(e) => setShowHidden(e.target.checked)}
        />{" "}
        Show hidden facilities (debug)
      </label>

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
                  fillColor: colorForPct(displayPct, f.is_unreliable),
                  fillOpacity: f.display_hidden ? 0.4 : 0.8,
                  dashArray: f.display_hidden ? "4 3" : undefined,
                }}
              >
                <Popup>
                  <strong>{f.full_name ?? f.name}</strong>
                  <br />
                  {displayPct !== null ? `${displayPct.toFixed(0)}% full` : "No data"}
                  {f.is_unreliable && (
                    <>
                      <br />
                      <span style={{ color: "#8b5cf6" }}>⚠ unreliable / event-day reading</span>
                    </>
                  )}
                  {f.display_hidden && (
                    <>
                      <br />
                      <em>hidden from default view</em>
                    </>
                  )}
                  <br />
                  {f.current_total ?? "?"} / {f.max_occupancy_total ?? "?"} spaces
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}

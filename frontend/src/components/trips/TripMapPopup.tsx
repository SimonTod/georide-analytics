/**
 * Shared map-preview popup and helpers used by TripRow and RouteComparison.
 * Renders via createPortal into document.body so it is never clipped by
 * an ancestor's overflow:hidden.
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function formatCoord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`
}

function FitBoundsToRoute({ start, end }: { start: [number, number]; end: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds([start, end], { padding: [28, 28], maxZoom: 14 })
  }, [map, start, end])
  return null
}

// ---------------------------------------------------------------------------
// MapPinIcon
// ---------------------------------------------------------------------------
export function MapPinIcon() {
  return (
    <svg
      width="14" height="14"
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// TripMapPopup
// ---------------------------------------------------------------------------
const POPUP_W = 300
const POPUP_H = 200

type Props = {
  startLat: number; startLon: number
  endLat:   number; endLon:   number
  triggerRect: DOMRect
}

export function TripMapPopup({ startLat, startLon, endLat, endLon, triggerRect }: Props) {
  const vw   = window.innerWidth
  const vh   = window.innerHeight
  let   left = triggerRect.right - POPUP_W
  let   top  = triggerRect.bottom + 8

  if (left < 8)                 left = 8
  if (left + POPUP_W > vw - 8) left = vw - POPUP_W - 8
  if (top  + POPUP_H > vh - 8) top  = triggerRect.top - POPUP_H - 8

  const start: [number, number] = [startLat, startLon]
  const end:   [number, number] = [endLat,   endLon]

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top:    `${top}px`,
        left:   `${left}px`,
        width:  `${POPUP_W}px`,
        height: `${POPUP_H}px`,
        zIndex: 9999,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        border: '1px solid #e5e7eb',
        pointerEvents: 'none',
      }}
    >
      <MapContainer
        key={`${startLat},${startLon}||${endLat},${endLon}`}
        center={[(startLat + endLat) / 2, (startLon + endLon) / 2]}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBoundsToRoute start={start} end={end} />
        <Polyline
          positions={[start, end]}
          pathOptions={{ color: '#4f46e5', dashArray: '6 5', weight: 2, opacity: 0.65 }}
        />
        <CircleMarker
          center={start} radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1 }}
        />
        <CircleMarker
          center={end} radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }}
        />
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 6, left: 8,
        display: 'flex', gap: 8,
        background: 'rgba(255,255,255,0.85)',
        borderRadius: 6, padding: '2px 6px',
        fontSize: 10, color: '#374151', zIndex: 1000,
      }}>
        <span style={{ color: '#10b981', fontWeight: 700 }}>● Départ</span>
        <span style={{ color: '#ef4444', fontWeight: 700 }}>● Arrivée</span>
      </div>

      {/* OSM attribution */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        background: 'rgba(255,255,255,0.7)',
        fontSize: 9, padding: '1px 4px', zIndex: 1000,
      }}>
        © OpenStreetMap
      </div>
    </div>,
    document.body
  )
}

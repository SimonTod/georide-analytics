import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { GeoRideTrackerTrip, GeoRideTrackerPosition } from '../../types/georide'
import { useTripPositions } from '../../hooks/useTripPositions'
import { groupPositionsByTrip } from '../../utils/stats'
import styles from './RouteHeatmap.module.css'

type Props = {
  trackerId: number | null
  from: string
  to: string
  trips: GeoRideTrackerTrip[]
}

// Fits the map to all positions after they load
function FitBounds({ positions }: { positions: GeoRideTrackerPosition[] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    const bounds = positions.map((p) => [p.latitude, p.longitude] as [number, number])
    map.fitBounds(bounds, { padding: [20, 20] })
  }, [map, positions])
  return null
}

export default function RouteHeatmap({ trackerId, from, to, trips }: Props) {
  const [showMap, setShowMap] = useState(false)

  const { data: positions, isLoading, progress } = useTripPositions(trackerId, from, to, showMap)

  const tripLines = positions && trips.length > 0
    ? groupPositionsByTrip(positions, trips)
    : []

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Carte des routes empruntées</h3>
        <button
          className={`${styles.toggle} ${showMap ? styles.active : ''}`}
          onClick={() => setShowMap((v) => !v)}
        >
          {showMap ? 'Masquer' : 'Afficher la carte'}
        </button>
      </div>

      {showMap && (
        <div className={styles.mapWrapper}>
          {isLoading && (
            <div className={styles.loading}>
              {progress && progress.total > 1 ? (
                <div className={styles.progressWrapper}>
                  <span className={styles.progressLabel}>
                    Chargement des positions… {progress.loaded} / {progress.total}
                  </span>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                'Chargement des positions…'
              )}
            </div>
          )}
          {!isLoading && positions?.length === 0 && (
            <div className={styles.empty}>Aucune position disponible pour cette période.</div>
          )}
          {!isLoading && positions && positions.length > 0 && (
            <MapContainer
              center={[46.5, 2.5]}
              zoom={6}
              className={styles.map}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds positions={positions} />
              {tripLines
                .filter(([, pts]) => pts.length > 1)
                .map(([tripId, pts]) => (
                  <Polyline
                    key={tripId}
                    positions={pts.map((p) => [p.latitude, p.longitude])}
                    pathOptions={{ color: '#4f46e5', weight: 3, opacity: 0.45 }}
                  />
                ))
              }
            </MapContainer>
          )}
        </div>
      )}
    </div>
  )
}

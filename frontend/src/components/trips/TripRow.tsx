import { useState, useEffect } from 'react'
import type { GeoRideTrackerTrip, TripMetadata, TripTag } from '../../types/georide'
import { formatDuration } from '../../utils/stats'
import TagPicker from './TagPicker'
import { TripMapPopup, MapPinIcon, formatCoord } from './TripMapPopup'
import styles from './TripRow.module.css'

export type EnrichedTrip = GeoRideTrackerTrip & { metadata: TripMetadata | null }

type Props = {
  trip: EnrichedTrip
  onSave: (tripId: number, tag: TripTag | null, note: string | null) => void
  isSaving?: boolean
}

export default function TripRow({ trip, onSave, isSaving }: Props) {
  const currentTag  = trip.metadata?.tag  ?? null
  const currentNote = trip.metadata?.note ?? null

  const [noteEditing, setNoteEditing] = useState(false)
  const [noteValue,   setNoteValue]   = useState(currentNote ?? '')
  const [mapRect,     setMapRect]     = useState<DOMRect | null>(null)

  const hasCoords =
    trip.start_lat != null && trip.start_lon != null &&
    trip.end_lat   != null && trip.end_lon   != null

  // Sync noteValue when metadata arrives/changes from outside
  useEffect(() => {
    if (!noteEditing) setNoteValue(currentNote ?? '')
  }, [currentNote, noteEditing])

  function handleTagChange(tag: TripTag | null) {
    onSave(trip.trip_id, tag, currentNote)
  }

  function handleNoteBlur() {
    setNoteEditing(false)
    const trimmed = noteValue.trim() || null
    if (trimmed !== currentNote) {
      onSave(trip.trip_id, currentTag, trimmed)
    }
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      setNoteEditing(false)
      setNoteValue(currentNote ?? '')
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const date       = new Date(trip.start_time)
  const distanceKm = (trip.distance / 1000).toFixed(1)

  return (
    <div className={`${styles.row} ${isSaving ? styles.saving : ''}`}>

      {/* Date */}
      <div className={styles.date}>
        <span className={styles.weekday}>
          {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
        </span>
        <span className={styles.dayMonth}>
          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </span>
        <span className={styles.time}>
          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <span className={styles.distance}>{distanceKm} km</span>
        <span className={styles.duration}>{formatDuration(trip.duration)}</span>
        <div className={styles.speeds}>
          <span>{trip.average_speed} km/h moy.</span>
          <span className={styles.separator}>·</span>
          <span>{trip.max_speed} km/h max</span>
        </div>
      </div>

      {/* Addresses + coordinates + map icon */}
      <div className={styles.addresses}>
        <div className={styles.addrBlock}>
          <span className={styles.addr}>{trip.start_address || '—'}</span>
          {trip.start_lat != null && trip.start_lon != null && (
            <span className={styles.coords}>
              {formatCoord(trip.start_lat, trip.start_lon)}
            </span>
          )}
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.addrBlock}>
          <span className={styles.addr}>{trip.end_address || '—'}</span>
          {trip.end_lat != null && trip.end_lon != null && (
            <span className={styles.coords}>
              {formatCoord(trip.end_lat, trip.end_lon)}
            </span>
          )}
        </div>
        {hasCoords && (
          <button
            className={styles.mapBtn}
            title="Aperçu carte"
            onMouseEnter={(e) => setMapRect(e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => setMapRect(null)}
          >
            <MapPinIcon />
          </button>
        )}
      </div>

      {mapRect && hasCoords && (
        <TripMapPopup
          startLat={trip.start_lat!}
          startLon={trip.start_lon!}
          endLat={trip.end_lat!}
          endLon={trip.end_lon!}
          triggerRect={mapRect}
        />
      )}

      {/* Tag */}
      <div className={styles.tagCol}>
        <TagPicker value={currentTag} onChange={handleTagChange} />
      </div>

      {/* Note */}
      <div className={styles.noteCol}>
        {noteEditing ? (
          <textarea
            className={styles.noteInput}
            value={noteValue}
            rows={2}
            autoFocus
            onChange={(e) => setNoteValue(e.target.value)}
            onBlur={handleNoteBlur}
            onKeyDown={handleNoteKeyDown}
          />
        ) : (
          <span
            className={`${styles.noteText} ${!currentNote ? styles.notePlaceholder : ''}`}
            onClick={() => setNoteEditing(true)}
            title="Cliquer pour modifier"
          >
            {currentNote || 'Ajouter une note…'}
          </span>
        )}
      </div>

    </div>
  )
}

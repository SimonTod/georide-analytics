import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import TagBadge from './TagBadge'
import type { TripTag } from '../../types/georide'
import styles from './SuggestionModal.module.css'

type Props = {
  tag: TripTag
  similarCount: number
  tripLabel: string
  hasExistingRule: boolean
  isApplying: boolean
  isCreatingRule: boolean
  onApplyToAll: () => void
  onCreateRule: () => void
  onDismiss: () => void
}

export default function SuggestionModal({
  tag,
  similarCount,
  tripLabel,
  hasExistingRule,
  isApplying,
  isCreatingRule,
  onApplyToAll,
  onCreateRule,
  onDismiss,
}: Props) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onDismiss])

  return createPortal(
    <div className={styles.overlay} onClick={onDismiss}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeBtn}
          onClick={onDismiss}
          title="Ignorer"
          aria-label="Ignorer"
        >
          ✕
        </button>

        <div className={styles.header}>
          <span className={styles.icon}>💡</span>
          <h3 id="suggestion-title" className={styles.title}>
            {similarCount > 0 ? 'Trajets similaires détectés' : 'Auto-tag pour cette route ?'}
          </h3>
        </div>

        {similarCount > 0 ? (
          <p className={styles.body}>
            <strong>{similarCount}</strong> autre{similarCount > 1 ? 's' : ''}{' '}
            trajet{similarCount > 1 ? 's' : ''} sur la route{' '}
            <em>{tripLabel}</em>{' '}
            n&apos;{similarCount > 1 ? 'ont' : 'a'} pas encore le tag&nbsp;:
          </p>
        ) : (
          <p className={styles.body}>
            Voulez-vous appliquer automatiquement le tag{' '}
            aux futurs trajets sur la route <em>{tripLabel}</em>&nbsp;?
          </p>
        )}

        <div className={styles.tagLine}>
          <TagBadge tag={tag} size="sm" />
        </div>

        <div className={styles.actions}>
          {similarCount > 0 && (
            <button
              className={styles.btnPrimary}
              onClick={onApplyToAll}
              disabled={isApplying}
            >
              {isApplying
                ? 'Application…'
                : `Appliquer à ${similarCount} trajet${similarCount > 1 ? 's' : ''}`}
            </button>
          )}

          {!hasExistingRule && (
            <button
              className={similarCount > 0 ? styles.btnSecondary : styles.btnPrimary}
              onClick={onCreateRule}
              disabled={isCreatingRule}
            >
              {isCreatingRule ? 'Création…' : 'Créer une règle auto-tag pour cette route'}
            </button>
          )}

          <button className={styles.btnGhost} onClick={onDismiss}>
            Ignorer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

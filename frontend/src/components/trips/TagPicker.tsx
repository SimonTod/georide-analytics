import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TagBadge from './TagBadge'
import type { TripTag } from '../../types/georide'
import styles from './TagPicker.module.css'

const TAGS: TripTag[] = ['commute', 'leisure', 'sport', 'track', 'other']

type Props = {
  value: TripTag | null
  onChange: (tag: TripTag | null) => void
}

export default function TagPicker({ value, onChange }: Props) {
  const [open,    setOpen]    = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Position the portal dropdown under the trigger button
  function openDropdown() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropPos({ top: rect.bottom + 6, left: rect.left })
    setOpen(true)
  }

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return
    function close() { setOpen(false) }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', close, true)
    }

    function onMouseDown(e: MouseEvent) {
      // keep open if clicking inside the portal dropdown
      const portal = document.getElementById('tag-picker-portal')
      if (portal?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      close()
    }
  }, [open])

  function select(tag: TripTag | null) {
    onChange(tag)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        title="Modifier le tag"
      >
        {value ? <TagBadge tag={value} /> : <span className={styles.empty}>+ tag</span>}
      </button>

      {open && dropPos && createPortal(
        <div
          id="tag-picker-portal"
          className={styles.dropdown}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left }}
        >
          <button className={styles.none} onClick={() => select(null)}>
            Aucun
          </button>
          {TAGS.map((tag) => (
            <button
              key={tag}
              className={`${styles.option} ${value === tag ? styles.selected : ''}`}
              onClick={() => select(tag)}
            >
              <TagBadge tag={tag} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

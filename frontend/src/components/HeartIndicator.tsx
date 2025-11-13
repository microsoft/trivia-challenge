/**
 * Heart Indicator Component
 *
 * Renders the player's remaining hearts with partial fillings for half hearts.
 */

import { useId, useMemo } from 'react'

interface HeartIndicatorProps {
  heartsRemaining: number
  maxHearts: number
}

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.01 4.02 4 6.5 4c1.54 0 3.04 0.81 4 2.09C11.46 4.81 12.96 4 14.5 4 16.98 4 19 6.01 19 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
const HEART_SIZE = 24

function formatHearts(value: number): string {
  if (Number.isNaN(value)) {
    return '0'
  }
  if (Number.isInteger(value)) {
    return value.toFixed(0)
  }
  return value.toFixed(1)
}

function HeartGlyph({ fillFraction }: { fillFraction: number }) {
  const id = useId()
  const safeFraction = Math.max(0, Math.min(1, fillFraction))
  const clipId = `${id}-clip`
  const gradientId = `${id}-gradient`
  const fillWidth = HEART_SIZE * safeFraction

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={HEART_PATH} />
        </clipPath>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      <rect
        width={HEART_SIZE}
        height={HEART_SIZE}
        fill="rgba(255,255,255,0.18)"
        clipPath={`url(#${clipId})`}
      />
      {safeFraction > 0 && (
        <rect
          width={fillWidth}
          height={HEART_SIZE}
          fill={`url(#${gradientId})`}
          clipPath={`url(#${clipId})`}
        />
      )}
      <path
        d={HEART_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={1.4}
      />
    </svg>
  )
}

export default function HeartIndicator({ heartsRemaining, maxHearts }: HeartIndicatorProps) {
  const totalSlots = Math.max(1, Math.floor(maxHearts))
  const normalizedHearts = Math.min(totalSlots, Math.max(0, heartsRemaining))

  const heartFillFractions = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, index) => {
      const heartValue = normalizedHearts - index
      if (heartValue >= 1) {
        return 1
      }
      if (heartValue <= 0) {
        return 0
      }
      return Math.round(heartValue * 2) / 2
    })
  }, [normalizedHearts, totalSlots])

  const formattedRemaining = formatHearts(normalizedHearts)
  const formattedMax = formatHearts(totalSlots)

  return (
    <div className="flex flex-col items-end gap-1" aria-live="polite">
      <span className="sr-only">{formattedRemaining} hearts remaining out of {formattedMax}</span>
      <div className="flex gap-1.5" aria-hidden="true">
        {heartFillFractions.map((fill, index) => (
          <HeartGlyph key={index} fillFraction={fill} />
        ))}
      </div>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-rose-200/80">
        {formattedRemaining} / {formattedMax} hearts
      </span>
    </div>
  )
}

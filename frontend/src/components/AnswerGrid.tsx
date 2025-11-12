/**
 * Answer Grid Component
 * 
 * Displays 4 answer buttons in a 2x2 grid with keyboard shortcuts
 */

import { useMemo } from 'react'

interface AnswerGridProps {
  answers: string[]
  onAnswerSelect: (index: number) => void
  disabled?: boolean
  keyLabels?: string[]
}

const answerColors = [
  { bg: '#dc2626', fg: '#ffffff', key: 'A' }, // Red
  { bg: '#facc15', fg: '#111827', key: 'K' }, // Yellow
  { bg: '#16a34a', fg: '#ffffff', key: 'S' }, // Green
  { bg: '#2563eb', fg: '#ffffff', key: 'L' }, // Blue
]

export default function AnswerGrid({
  answers,
  onAnswerSelect,
  disabled = false,
  keyLabels,
}: AnswerGridProps) {
  const paddedAnswers = useMemo(() => {
    // Ensure we always have 4 answers
    return [...answers, ...Array(4 - answers.length).fill('')].slice(0, 4)
  }, [answers])

  const handleClick = (index: number) => {
    if (!disabled && paddedAnswers[index]) {
      onAnswerSelect(index)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paddedAnswers.map((answer, index) => {
          const color = answerColors[index]
          const label = keyLabels?.[index] ?? color.key
          return (
            <button
              key={index}
              onClick={() => handleClick(index)}
              disabled={disabled || !answer}
              className={`
                relative p-6 rounded-2xl text-left font-medium text-lg
                transition-all duration-200 transform hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-background
              `}
              style={{
                backgroundColor: color.bg,
                color: color.fg,
                boxShadow: `0 4px 14px 0 ${color.bg}80`,
              }}
            >
              {/* Keyboard shortcut indicator */}
              <div className="absolute top-3 left-3 w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{label}</span>
              </div>

              {/* Answer text */}
              <div className="pl-14 pr-4">
                {answer || <span style={{ color: `${color.fg}80` }}>No answer</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type HaloVariant = 'correct' | 'incorrect'

export interface AnswerChoiceStyle {
  bg: string
  fg: string
  key: string
}

export const ANSWER_CHOICE_STYLES: AnswerChoiceStyle[] = [
  { bg: '#dc2626', fg: '#ffffff', key: 'A' },
  { bg: '#facc15', fg: '#111827', key: 'K' },
  { bg: '#16a34a', fg: '#ffffff', key: 'S' },
  { bg: '#2563eb', fg: '#ffffff', key: 'L' },
]

export const HALO_BOX_SHADOWS: Record<HaloVariant, string> = {
  correct: '0 0 0 6px rgba(16, 185, 129, 0.9), 0 0 30px rgba(16, 185, 129, 0.45)',
  incorrect: '0 0 0 6px rgba(244, 63, 94, 0.9), 0 0 30px rgba(244, 63, 94, 0.45)',
}

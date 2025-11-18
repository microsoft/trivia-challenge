export type HaloVariant = 'correct' | 'incorrect'

export interface AnswerChoiceStyle {
  bg: string
  fg: string
  key: string
}

export const ANSWER_CHOICE_STYLES: AnswerChoiceStyle[] = [
  { bg: '#B8303E', fg: '#ffffff', key: 'A' },
  { bg: '#1A553B', fg: '#ffffff', key: 'K' },
  { bg: '#1D61BD', fg: '#ffffff', key: 'S' },
  { bg: '#E16D40', fg: '#ffffff', key: 'L' },
]

export const HALO_BOX_SHADOWS: Record<HaloVariant, string> = {
  correct: '0 0 0 6px rgba(16, 185, 129, 0.9), 0 0 30px rgba(16, 185, 129, 0.45)',
  incorrect: '0 0 0 6px rgba(244, 63, 94, 0.9), 0 0 30px rgba(244, 63, 94, 0.45)',
}

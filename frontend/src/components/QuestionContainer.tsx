/**
 * Question Container Component
 * 
 * Displays the current question with orange border
 */

interface QuestionContainerProps {
  questionText: string
  questionNumber?: number
  category?: string
}

export default function QuestionContainer({
  questionText,
  questionNumber,
  category,
}: QuestionContainerProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-8">
      <div
        className="relative p-8 rounded-2xl backdrop-blur-sm"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '3px solid #FFA500',
        }}
      >
        {questionNumber && (
          <div className="absolute -top-3 left-6 bg-[#FFA500] px-4 py-1 rounded-full">
            <span className="text-black font-bold text-sm">Question {questionNumber}</span>
          </div>
        )}
        {category && (
          <div className="mb-4 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {category}
          </div>
        )}
        <p className="text-xl md:text-2xl text-center text-foreground font-medium leading-relaxed">
          {questionText}
        </p>
      </div>
    </div>
  )
}

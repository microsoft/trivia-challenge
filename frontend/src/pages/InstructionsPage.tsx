import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'

const instructionCards = [
  {
    icon: '🕒',
    title: '60 Second Quest',
    description: 'Answer as many questions as you can before the hourglass runs dry!',
  },
  {
    icon: '✨',
    title: 'Magical Streak Bonus',
    description: 'Gather 5 correct answers in a row to summon +15 bonus seconds to your timer.'
  },
  {
    icon: '🎯',
    title: 'Choose Wisely',
    description: 'Pick the right answer from four mystical options. Wrong turns chip away at your streak.'
  },
  {
    icon: '⚡',
    title: 'Instant Revelation',
    description: 'Stay calm—when a mistake happens, the correct path is revealed so you can learn fast.'
  }
]

export default function InstructionsPage() {
  const navigate = useNavigate()
  const { player, resetGame, setIsPlaying } = useGame()

  useEffect(() => {
    if (!player) {
      navigate('/signin', { replace: true })
      return
    }

    resetGame()
  }, [player, navigate, resetGame])

  const handleBegin = () => {
    setIsPlaying(true)
    navigate('/playing')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040406]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#040406_70%)]" aria-hidden="true" />
        <div className="absolute -top-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/25 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 -right-28 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl" aria-hidden="true" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-[34px] border border-amber-200/20 bg-white/5 p-[1.5px] shadow-[0_32px_64px_rgba(0,0,0,0.65)] backdrop-blur-sm">
            <div className="relative rounded-4xl bg-neutral-950/80 px-10 pb-12 pt-14">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,215,128,0.35)_0%,rgba(17,17,17,0)_70%)]" aria-hidden="true" />

              <div className="relative flex flex-col items-center text-center">
                <img
                  src="/fabriclogo.png"
                  alt="Microsoft Fabric"
                  className="mb-6 h-16 w-16 drop-shadow-[0_20px_45px_rgba(255,184,0,0.4)]"
                />
                <h1 className="text-2xl font-semibold text-white md:text-3xl">
                  The Ancient Scrolls of Knowledge
                </h1>
                <p className="mt-2 text-base text-white/70 md:text-lg">
                  Master these secrets before you begin your quest
                </p>
              </div>

              <div className="relative mt-10 grid gap-y-10 gap-x-7 sm:grid-cols-2 sm:gap-x-9 lg:gap-x-12">
                {instructionCards.map(card => (
                  <article
                    key={card.title}
                    className="relative flex h-full cursor-default flex-col rounded-[32px] border border-amber-200/45 bg-gradient-to-b from-[#fff0c2]/95 via-[#f3dcb0]/90 to-[#debc81]/90 px-7 pb-8 pt-10 text-left text-[#2f1809] shadow-[0_26px_60px_rgba(0,0,0,0.32)]"
                  >
                    <div
                      className="pointer-events-none absolute left-1/2 top-0 h-9 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff7d6] opacity-90 shadow-[0_14px_28px_rgba(0,0,0,0.28)]"
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute bottom-0 left-1/2 h-9 w-[82%] -translate-x-1/2 translate-y-1/2 rounded-full bg-[#e6c790] opacity-80 shadow-[0_-12px_24px_rgba(0,0,0,0.22)]"
                      aria-hidden="true"
                    />
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2f1809]/10 text-2xl shadow-inner" aria-hidden="true">
                        {card.icon}
                      </span>
                      <div>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#7c5517]/70">
                          Adventurer Tip
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-[#2f1809] md:text-[1.35rem]">
                          {card.title}
                        </h2>
                      </div>
                    </div>
                    <p className="mt-6 text-base leading-7 text-[#3c2812]/80 md:text-lg">
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>

              <div className="relative mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={handleBegin}
                  className="w-full max-w-xs rounded-2xl py-3.5 text-lg font-semibold text-[#2b1800] shadow-[0_18px_40px_rgba(245,158,11,0.45)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 hover:brightness-[1.08] hover:shadow-[0_22px_48px_rgba(245,158,11,0.55)] active:brightness-[0.96]"
                  style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 55%, #b45309 100%)' }}
                >
                  Begin Your Quest
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

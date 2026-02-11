import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { getStationLockdownMessage, isStationLockdownActive } from '../lib/stationLockdown'

const instructionItems = [
  {
    icon: '🕒',
    title: '60 Second Quest',
    description: 'Answer as many questions as you can before the hourglass runs dry!',
  },
  {
    icon: '✨',
    title: 'Magical Streak Bonus',
    description: 'Gather 5 correct answers in a row to summon +10 bonus seconds.',
  },
  {
    icon: '🎯',
    title: 'Choose Wisely',
    description: 'Wrong answers chip away at your streak. Get 10 wrong and your quest is history!',
  },
  {
    icon: '⚡',
    title: 'Instant Revelation',
    description: 'Incorrect answers pause the timer so you can study the facts for next time.',
  },
]

export default function InstructionsPage() {
  const navigate = useNavigate()
  const { player, resetGame, setIsPlaying } = useGame()
  const isLockdownActive = isStationLockdownActive()
  const lockdownMessage = getStationLockdownMessage()

  useEffect(() => {
    if (!player) {
      navigate('/signin', { replace: true })
      return
    }

    resetGame()
  }, [player, navigate, resetGame])

  const handleBegin = () => {
    if (isLockdownActive) {
      return
    }
    setIsPlaying(true)
    navigate('/playing')
  }

  return (
    <div className="relative min-h-screen bg-[#040406]">
      <div className="absolute inset-0 overflow-hidden">
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
                  How to Play
                </h1>
                <p className="mt-2 text-base text-white/70 md:text-lg">
                  Master these rules before you begin
                </p>
              </div>

              <div className="relative mt-10 space-y-0">
                {instructionItems.map((item, index) => (
                  <div key={item.title}>
                    <div className="flex items-start gap-4 py-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white md:text-lg">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-white/60 md:text-base">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {index < instructionItems.length - 1 && (
                      <div className="border-t border-white/5" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>

              <div className="relative mt-10 flex flex-col items-center space-y-4">
                <button
                  type="button"
                  onClick={handleBegin}
                  disabled={isLockdownActive}
                  className="w-full max-w-xs rounded-2xl py-3.5 text-lg font-semibold text-[#2b1800] shadow-[0_18px_40px_rgba(245,158,11,0.45)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 hover:brightness-[1.08] hover:shadow-[0_22px_48px_rgba(245,158,11,0.55)] active:brightness-[0.96]"
                  style={{ background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 55%, #b45309 100%)' }}
                >
                  Begin Your Quest
                </button>
                {isLockdownActive && (
                  <p className="max-w-md text-center text-sm font-medium text-red-300" role="alert">
                    {lockdownMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

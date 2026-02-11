import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { sessionService } from '../services/sessionService'
import { analytics } from '../services/analyticsService'
import { getStationLockdownMessage, isStationLockdownActive } from '../lib/stationLockdown'
import type { QuestionPool } from '../types/api'

export default function PoolSelectionPage() {
  const navigate = useNavigate()
  const { player, setSelectedPool } = useGame()
  const isLockdownActive = isStationLockdownActive()
  const lockdownMessage = getStationLockdownMessage()
  const [pools, setPools] = useState<QuestionPool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const displayedError = isLockdownActive ? lockdownMessage : error

  useEffect(() => {
    if (!player) {
      navigate('/signin', { replace: true })
      return
    }

    analytics.track('pageview.select-pool', { path: '/select-pool' })

    const loadPools = async () => {
      try {
        setIsLoading(true)
        const fetchedPools = await sessionService.getPools()
        setPools(fetchedPools)
        
        // If only one pool exists, auto-select it and navigate
        if (fetchedPools.length === 1) {
          setSelectedPool(fetchedPools[0])
          navigate('/instructions')
          return
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load question pools.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadPools()
  }, [player, navigate, setSelectedPool])

  const handlePoolSelect = (pool: QuestionPool) => {
    if (isLockdownActive) {
      setError(lockdownMessage)
      return
    }

    analytics.track('pool.selected', {
      poolId: pool.id,
      poolName: pool.name,
    })

    setSelectedPool(pool)
    navigate('/instructions')
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#040406]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0%,#040406_70%)]" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400/30 border-t-amber-400" />
            <p className="text-lg text-white/70">Loading question pools...</p>
          </div>
        </div>
      </div>
    )
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
            <div className="relative overflow-hidden rounded-4xl bg-neutral-950/80 px-10 pb-12 pt-14">
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(255,215,128,0.35)_0%,rgba(17,17,17,0)_70%)]" aria-hidden="true" />

              <div className="relative flex flex-col items-center text-center">
                <img
                  src="/fabriclogo.png"
                  alt="Microsoft Fabric"
                  className="mb-6 h-16 w-16 drop-shadow-[0_20px_45px_rgba(255,184,0,0.4)]"
                />
                <h1 className="text-2xl font-semibold text-white md:text-3xl">
                  Choose Your Challenge
                </h1>
                <p className="mt-2 text-base text-white/70 md:text-lg">
                  Select a question pool to test your knowledge
                </p>
              </div>

              {displayedError && (
                <div className="relative mt-8 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
                  {displayedError}
                </div>
              )}

              {pools.length === 0 ? (
                <div className="relative mt-10 text-center">
                  <p className="text-lg text-white/70">No question pools are available at this time.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/signin')}
                    className="mt-6 rounded-2xl bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/20"
                  >
                    Go Back
                  </button>
                </div>
              ) : (
                <div className="relative mt-10 flex flex-wrap justify-center gap-6">
                  {pools.map(pool => (
                    <button
                      key={pool.id}
                      type="button"
                      onClick={() => handlePoolSelect(pool)}
                      disabled={isLockdownActive}
                      className="group relative flex w-full max-w-[280px] flex-col items-center rounded-3xl border border-amber-200/30 bg-gradient-to-b from-amber-900/20 via-amber-800/10 to-transparent p-6 text-center transition hover:border-amber-400/50 hover:bg-amber-900/30 hover:shadow-[0_18px_40px_rgba(245,158,11,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-amber-400/20 to-amber-600/10 shadow-inner">
                        <img
                          src={pool.iconPath}
                          alt=""
                          className="h-12 w-12 object-contain drop-shadow-[0_4px_12px_rgba(255,184,0,0.4)] transition group-hover:scale-110"
                          onError={(e) => {
                            // Fallback to a default icon if the image fails to load
                            const target = e.target as HTMLImageElement
                            target.src = '/pools/default.svg'
                          }}
                        />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-white group-hover:text-amber-200">
                        {pool.name}
                      </h2>
                      {pool.description && (
                        <p className="mt-2 text-sm text-white/60 group-hover:text-white/80">
                          {pool.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

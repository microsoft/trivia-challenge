import { useEffect, useState } from 'react'
import { getStationId } from '../lib/stationLockdown'

const avatarSources: Record<string, string> = {
  dashboarddruid: '/avatars/dashboarddruid.png',
  insightsalchemist: '/avatars/insightsalchemist.png',
  quantumqueryist: '/avatars/quantumqueryist.png',
}

export function StationAvatar() {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)

  useEffect(() => {
    const stationId = getStationId()
    if (!stationId) {
      setAvatarSrc(null)
      return
    }

  const normalizedId = stationId.trim().toLowerCase()
  setAvatarSrc(avatarSources[normalizedId] ?? null)
  }, [])

  if (!avatarSrc) {
    return null
  }

  return (
    <div className="pointer-events-none w-48 fixed bottom-0 right-0 z-11 flex justify-end pb-4 pr-4 sm:pb-8 sm:pr-8">
      <img
        src={avatarSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="max-h-[55vh] w-auto select-none"
      />
    </div>
  )
}

export default StationAvatar

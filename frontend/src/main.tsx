import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { analytics } from './services/analyticsService'
import { getCookie, setCookie } from './lib/utils'
import { gameConfig } from './config/gameConfig'

// Extract and store station ID from URL query parameter
const urlParams = new URLSearchParams(window.location.search)
const stationIdParam = urlParams.get('stationId')
let stationId: string | null = null

if (stationIdParam && stationIdParam.trim().length > 0) {
  // Store station ID in cookie for persistence
  setCookie('stationId', stationIdParam)
  stationId = stationIdParam
} else {
  // Check if we already have a station ID in a cookie
  const existingStationId = getCookie('stationId')
  stationId = existingStationId
}

if (!stationId) {
  if (gameConfig.lockdown.requireStationId) {
    console.warn('Access to the experience is currently restricted.')
  } else {
    console.info('No station ID provided. Station tracking will be disabled.')
  }
}

if (typeof document !== 'undefined') {
  document.documentElement.dataset.stationLockdown = String(
    gameConfig.lockdown.requireStationId && !stationId,
  )
}

analytics.initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { analytics } from './services/analyticsService'
import { getCookie, setCookie } from './lib/utils'

// Extract and store station ID from URL query parameter
const urlParams = new URLSearchParams(window.location.search)
const stationIdParam = urlParams.get('stationId')

if (stationIdParam) {
  // Store station ID in cookie for persistence
  setCookie('stationId', stationIdParam)
} else {
  // Check if we already have a station ID in a cookie
  const existingStationId = getCookie('stationId')
  if (!existingStationId) {
    // No station ID from URL or cookie - this is fine, station is optional
    console.info('No station ID provided. Station tracking will be disabled.')
  }
}

analytics.initialize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

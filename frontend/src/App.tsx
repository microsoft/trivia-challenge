import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { DevModeProvider } from './context/DevModeContext'
import SignInPage from './pages/SignInPage'
import PoolSelectionPage from './pages/PoolSelectionPage'
import InstructionsPage from './pages/InstructionsPage'
import PlayingPage from './pages/PlayingPage'
import ResultsPage from './pages/ResultsPage'
import StationAvatar from './components/StationAvatar'
import DebugPanel from './components/DebugPanel'

function App() {
  return (
    <GameProvider>
      <DevModeProvider>
        <Router>
          <StationAvatar />
          <div className="relative z-10 min-h-screen bg-blue-500">
            <Routes>
              <Route path="/" element={<Navigate to="/signin" replace />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/select-pool" element={<PoolSelectionPage />} />
              <Route path="/instructions" element={<InstructionsPage />} />
              <Route path="/playing" element={<PlayingPage />} />
              <Route path="/results" element={<ResultsPage />} />
            </Routes>
          </div>
          <DebugPanel />
        </Router>
      </DevModeProvider>
    </GameProvider>
  )
}

export default App

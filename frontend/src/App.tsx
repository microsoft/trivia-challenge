import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import SignInPage from './pages/SignInPage'
import InstructionsPage from './pages/InstructionsPage'
import PlayingPage from './pages/PlayingPage'
import ResultsPage from './pages/ResultsPage'

function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="/playing" element={<PlayingPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </Router>
    </GameProvider>
  )
}

export default App

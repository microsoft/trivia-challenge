# Microsoft Trivia Challenge - TODO

## MVP Features

### Core Game Infrastructure
- [x] Create .NET 10 Minimal API with user session management and question serving endpoints
- [x] Set up React + TypeScript + Tailwind with Kahoot/Duolingo-inspired design
- [x] Implement randomized question loading from JSON file (no difficulty filtering)
- [x] Design Cosmos DB collections for users, sessions, questions, and scores

### Game Mechanics
- [x] Implement 1-minute base timer with 15-second streak bonuses (up to 2 minutes total, max 4 streaks)
- [x] Implement simplified scoring (10 points per correct answer)

### User Interface & Experience
- [x] Build waiting screen, registration, gameplay, and results screens
- [x] Implement touch, mouse, and keyboard controls (Z/C/B/M)

### Analytics & Telemetry
- [x] Implement comprehensive event tracking (clicks, mouse movements at 10 points/sec, game events)
- [x] Set up real-time telemetry streaming to Microsoft Fabric

## Additional Features

## Technical Specifications

### Timer System
- Base game time: 1 minute (60 seconds)
- Streak bonus: +15 seconds per completed streak (5 correct answers)
- Maximum streaks: 4 streaks (60 seconds total bonus)
- Maximum total time: 2 minutes (120 seconds)

### Scoring Algorithm
- Simplified: 10 points per correct answer
- No difficulty or time bonuses
- Principle: More correct answers always beats faster completion

### Telemetry Requirements
- Mouse movements: Maximum 10 data points per second
- All user interactions: clicks, touches, keyboard inputs
- Game events: start, end, question answered, streak changes
- Session tracking: sessionId, userId, timestamps

### Scaling Requirements
- Initial: 10 concurrent players
- Future: 80,000 simultaneous players
- Leaderboards: Both daily and cumulative persistence

### Input Methods
- Touch: Full touch screen support
- Mouse: Click interactions and movement tracking
- Keyboard: Z/C/B/M keys for answer selection (A/B/C/D alternatives)
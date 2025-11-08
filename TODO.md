# Microsoft Fabric IQ Challenge - TODO

## MVP Features

### Core Game Infrastructure
- [x] Create .NET 10 Minimal API with user session management and question serving endpoints
- [x] Set up React + TypeScript + Tailwind with Kahoot/Duolingo-inspired design
- [x] Implement randomized question loading from JSON file (no difficulty filtering)
- [x] Design Cosmos DB collections for users, sessions, questions, and scores

### Game Mechanics
- [x] Implement 1-minute base timer with 15-second streak bonuses (up to 2 minutes total, max 4 streaks)
- [ ] Build forgiving streak system (wrong answer steps back one level)
- [x] Implement simplified scoring (10 points per correct answer)
- [ ] Create time pressure and varying answer choice counts for difficulty

### User Interface & Experience
- [ ] Build waiting screen, registration, gameplay, and results screens
- [ ] Implement touch, mouse, and keyboard controls (Z/C/B/M)
- [ ] Design and implement real-time leaderboard updates (daily and cumulative)

### Analytics & Telemetry
- [ ] Implement comprehensive event tracking (clicks, mouse movements at 10 points/sec, game events)
- [ ] Set up real-time telemetry streaming to Microsoft Fabric

## Additional Features

### Deployment & Infrastructure
- [ ] Configure Azure Static Web Apps and App Service Container deployment
- [ ] Set up GitHub Actions for automated testing and deployment
- [ ] Implement proper scaling for 10-80K concurrent users

### Performance & Monitoring
- [ ] Add application performance and error tracking
- [ ] Test the application under Microsoft Ignite booth conditions
- [ ] UI/UX refinements and performance optimizations

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
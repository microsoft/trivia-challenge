# Microsoft Fabric Trivia Challenge - Technical Specifications

## Game Overview

The Microsoft Fabric Trivia Challenge is a React-based trivia game built with TypeScript, Vite, and modern UI libraries. The game features a fantasy/magical theme with a default 60-second time limit and streak-based bonus mechanics.

## Game mechanics

- **Time Limit**: Players have 60 seconds to answer as many questions as possible.
- **Streak Bonus**: Players earn bonus time for consecutive correct answers. Gather 5 correct answers to summon +5 bonus seconds!
- **Question Pool**: The game includes a diverse set of trivia questions related to Microsoft Fabric and general knowledge. Each question has 4 multiple-choice answers, with only one correct answer.
- **Scoring System**: Points are awarded based on the speed and accuracy of answers, and number of completed streak.

## Game Session flow

1. **SignIn Screen** (`signin`) → Collects player registration data
2. **Instructions Screen** (`instructions`) → Displays game rules
3. **Game Screen** (`playing`) → Active gameplay
4. **Results Screen** (`results`) → Shows final score and QR codes


### Registration System

The registration process captures three required fields:
- **Name**: Player identification
- **Email**: Contact information  
- **Phone**: Additional contact method (optional)

Validation is performed to ensure all required fields are filled before proceeding to the next screen.

**Data Flow**: Player data is stored globally and accessible to subsequent screens. It is also sent to backend services for analytics and follow-up.

### Instructions Screen

The instructions screen provides players with a clear overview of the game rules, scoring system, and bonus mechanics. It includes visual aids and examples to ensure players understand how to play effectively.

### Game Screen

The game screen is the core of the application where players answer trivia questions. Key features include:


### Timer Features

1. **Initial Duration**: 60 seconds
2. **Countdown Delay**: 3-second animated countdown before timer starts
3. **Pause Conditions**: Timer pauses during:
   - Initial countdown (3 seconds)
   - Wrong answer modal display (5 seconds)
4. **End Condition**: Game ends when timer reaches 0
5. **Visual Indicators**:
   - Progress bar shows time remaining
   - Color changes to red when ≤5 seconds remain
   - Numerical display shows `Math.floor(timeLeft)`

### Dynamic Timer Extension

The timer can be extended through streak bonuses:
- When bonus is awarded: `setTimeLeft((prev) => prev + 5.5)`
- `maxTime` is also updated to maintain progress bar accuracy
- Extra 0.5 seconds account for animation timing

### Streak Logic

#### Streak Counter System

#### Correct Answer Behavior:
1. **Increment**: `bonusCounter + 1`
2. **Threshold Check**: If counter reaches 5:
   - Award +5.5 seconds to timer
   - Reset counter to 0
   - Show bonus popup animation
   - Update maxTime for progress bar

#### Wrong Answer Behavior:
1. **Decrement**: `Math.max(0, bonusCounter - 1)`
2. **Minimum**: Counter cannot go below 0
3. **5-Second Learning Modal**: Shows correct answer

#### Visual Streak Indicators

- **Flask Icons**: 5 flask-shaped containers
- **Fill Logic**: Flasks fill based on `bonusCounter % 5`
- **Visual States**:
  - Filled: Golden color (`#fbbf24`) with glow effect
  - Empty: Gray color (`#64748b`)
- **Reset**: All flasks empty when bonus is awarded

The number of completed streaks is tracked and displayed along the visual streak indicators and on the results screen.


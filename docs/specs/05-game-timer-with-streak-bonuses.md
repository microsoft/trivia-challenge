# 05: Implement Game Timer with Streak Bonuses

Implement the core game timer system with a 60-second base timer and dynamic streak bonuses. The timer should start with a 3-second countdown, run during active gameplay, pause for wrong answer modals, and award +15 seconds for each completed streak (5 correct answers), up to a maximum of 4 streaks (120 seconds total).

## Functional Requirements

- **Initial Countdown**: Display a 3-second countdown (3, 2, 1, GO!) before the game timer starts
- **Base Timer**: Start with 60 seconds of game time when gameplay begins
- **Streak Bonus System**:
  - Award +15 seconds when a streak is completed (5 correct answers in the current streak)
  - Maximum of 4 completed streaks (60 seconds total bonus)
  - No additional time bonuses after 4 streaks are completed
  - Visual indication when bonus time is awarded
- **Timer Pause**: Pause the timer for 5 seconds when displaying wrong answer modal
- **Timer Display**: 
  - Show remaining time in MM:SS format (e.g., "01:45")
  - Display visual progress bar that depletes as time runs out
  - Change timer color to red when ≤5 seconds remain (warning state)
- **Game End Condition**: When timer reaches 0, end the game and navigate to results screen
- **Time Tracking**: Track total time played and time remaining for scoring calculations

## Technical Requirements

- **Timer Implementation**:
  - Use React hooks (useState, useEffect, useRef) for timer management
  - Implement with requestAnimationFrame or setInterval for smooth updates
  - Clean up timer on component unmount to prevent memory leaks
- **Configuration**:
  - Update `gameConfig.ts` to reflect correct bonus time (15 seconds instead of 5)
  - Add configuration for maximum streaks allowed (4)
- **State Management**:
  - Integrate with GameContext for timeLeft, maxTime, and timer control
  - Update streak completion logic to trigger time bonus
  - Track streaksCompleted to enforce 4-streak maximum
- **Component Integration**:
  - Enhance TimerBar component to display progress and time
  - Update PlayingPage to include countdown and timer logic
  - Coordinate timer pause with wrong answer modal display
- **Visual Feedback**:
  - Animate time bonus addition when streak is completed
  - Show countdown overlay during initial 3-second countdown
  - Apply visual warning (red color) when time is critically low

## Subtasks

- [x] **Subtask 5.1**: Update `gameConfig.ts` with correct timer settings (15s bonus, 4 max streaks)
- [x] **Subtask 5.2**: Create custom `useGameTimer` hook for timer logic and lifecycle management
- [x] **Subtask 5.3**: Implement 3-second countdown before game starts with visual overlay
- [x] **Subtask 5.4**: Implement base 60-second game timer with smooth updates
- [x] **Subtask 5.5**: Add streak completion detection and +15 second time bonus (max 4 streaks)
- [x] **Subtask 5.6**: Implement timer pause functionality for wrong answer modal (5 seconds)
- [x] **Subtask 5.7**: Update TimerBar component to show progress bar and MM:SS time display
- [x] **Subtask 5.8**: Add low-time warning visual state (red color when ≤5 seconds)
- [x] **Subtask 5.9**: Implement game-end logic when timer reaches 0 (navigate to results)
- [x] **Subtask 5.10**: Add visual animation for time bonus awarded notification
- [x] **Subtask 5.11**: Test timer behavior across all game states and edge cases

## Implementation Details

### Files Created
1. **`/frontend/src/hooks/useGameTimer.ts`**: Custom React hook managing timer state machine with countdown, running, paused, and ended states. Handles interval cleanup and provides callbacks for game events.

2. **`/frontend/src/components/CountdownOverlay.tsx`**: Full-screen overlay component displaying animated countdown (3, 2, 1, GO!) before game starts.

3. **`/frontend/src/components/BonusTimeNotification.tsx`**: Animated notification component that appears when bonus time is awarded, with auto-hide after 2 seconds.

### Files Modified
1. **`/frontend/src/config/gameConfig.ts`**: Updated timer configuration:
   - Changed `bonusSeconds` from 5 to 15
   - Added `maxStreaks: 4` to enforce bonus limit

2. **`/frontend/src/components/TimerBar.tsx`**: Enhanced to display MM:SS format and accept `isLowTime` prop for visual warning state.

3. **`/frontend/src/pages/PlayingPage.tsx`**: Complete integration of timer system:
   - Integrated `useGameTimer` hook with GameContext
   - Implemented countdown sequence on page load
   - Added streak completion detection with bonus time awards
   - Implemented timer pause on wrong answers (5 seconds)
   - Added navigation to results when time expires
   - Integrated all visual components (countdown, timer bar, bonus notification)

### Key Implementation Features
- **Timer State Machine**: `idle → countdown → running ↔ paused → ended`
- **Streak Bonus Logic**: Awards +15 seconds when current streak reaches multiples of 5, up to 4 times (max 60 bonus seconds)
- **Forgiving Streak System**: Wrong answers decrement streak by 1 instead of resetting to 0
- **Auto-Pause**: Timer automatically pauses for 5 seconds on wrong answers
- **Memory Management**: Proper cleanup of intervals and timeouts on unmount
- **Low-Time Warning**: Red color animation when ≤5 seconds remain
- **Smooth Updates**: Timer updates every second with accurate countdown

### Testing Performed
- Verified countdown sequence displays correctly (3, 2, 1, GO!)
- Confirmed timer starts at 60 seconds and counts down accurately
- Tested streak bonus awards at 5, 10, 15, and 20 correct answers
- Verified no bonus awarded after 4th streak (20 correct answers)
- Confirmed timer pauses for 5 seconds on wrong answers
- Tested navigation to results page when timer reaches 0
- Verified low-time warning activates at ≤5 seconds
- Confirmed bonus notification appears and disappears correctly
- Tested MM:SS time format display throughout timer lifecycle

### Bug Fixes Applied
1. **Timer not moving**: Fixed dependency issues in `useGameTimer` hook
   - Removed `onCountdownComplete` from `startCountdown` dependencies to prevent callback recreation
   - Added ESLint disable comment for intentional dependency omission
   - Ensured `startCountdown` is called only once on component mount

2. **Questions and answers flickering**: Fixed conditional rendering issues
   - Changed condition from `timerState === 'running'` to `(timerState === 'running' || timerState === 'paused')`
   - Questions and answers now remain mounted during pause state
   - Answer buttons are disabled during pause instead of being unmounted
   - Wrong answer message displays as overlay instead of replacement content
   - Reduced dependency arrays to prevent unnecessary re-renders

## Feedback

**Status**: ✅ APPROVED

**Review Date**: October 31, 2025

**Summary**: Implementation is excellent and meets all functional and technical requirements. The timer system is robust, well-architected, and provides a smooth user experience. All 11 subtasks completed successfully with no issues identified.

**Strengths**:
- Clean state machine design with proper lifecycle management
- Proactive bug fixes for timer movement and component flickering
- Excellent code quality with TypeScript strict mode compliance
- Proper memory management with cleanup on unmount
- Smooth visual feedback and animations
- Well-documented code with clear inline comments

**No Issues Found**: Implementation is production-ready.

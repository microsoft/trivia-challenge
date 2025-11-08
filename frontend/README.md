# Microsoft Fabric IQ Challenge - Frontend

React + TypeScript + Vite frontend application with Tailwind CSS and shadcn/ui for the Microsoft Fabric IQ Challenge quiz game.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:5000` (optional for development)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.development

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   ├── Header.tsx
│   ├── TimerBar.tsx
│   ├── QuestionContainer.tsx
│   ├── AnswerGrid.tsx
│   └── StreakIndicator.tsx
├── pages/           # Route pages
│   ├── SignInPage.tsx
│   ├── InstructionsPage.tsx
│   ├── PlayingPage.tsx
│   └── ResultsPage.tsx
├── context/         # React Context for state management
│   └── GameContext.tsx
├── services/        # API client and services
│   ├── apiClient.ts
│   └── sessionService.ts
├── config/          # Configuration files
│   └── gameConfig.ts
├── types/           # TypeScript type definitions
│   └── api.ts
├── lib/             # Utility functions
│   └── utils.ts
└── hooks/           # Custom React hooks
```

## 🎮 Game Flow

1. **Sign In** (`/signin`) - Player registration
2. **Instructions** (`/instructions`) - Game rules and how to play
3. **Playing** (`/playing`) - Active gameplay with questions and timer
4. **Results** (`/results`) - Final score and QR codes

## 🛠️ Available Scripts

### Development

```bash
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint and auto-fix issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # Run TypeScript type checking
```

## 🎨 Design System

### Colors

- **Background**: Dark (#0a0a0a)
- **Timer Bar**: Orange (#FFA500)
- **Timer Border**: Navy (#1e293b)
- **Answer Buttons**:
  - Green: #10b981 (A key)
  - Blue: #3b82f6 (K key)
  - Purple: #a855f7 (S key)
  - Orange: #f97316 (L key)
- **Streak Flasks**:
  - Filled: Golden (#fbbf24)
  - Empty: Gray (#64748b)

### Keyboard Controls

The game supports keyboard input for answer selection. Default mappings (configurable in `src/config/gameConfig.ts`):

- **A** - First answer (green, top-left)
- **K** - Second answer (blue, top-right)
- **S** - Third answer (purple, bottom-left)
- **L** - Fourth answer (orange, bottom-right)

## ⚙️ Configuration

### Environment Variables

Create a `.env.development` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:5000
VITE_ENABLE_TELEMETRY=false
VITE_ENABLE_DEBUG_LOGGING=true
```

### Game Settings

Modify `src/config/gameConfig.ts` to adjust:

- Timer settings (base time, bonuses, countdown)
- Streak system (threshold, decrement on wrong answer)
- Scoring (10 points per correct answer)
- Keyboard mappings
- API endpoints
- Telemetry configuration

## 🧩 Key Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

## 🎯 Game Mechanics

### Timer System

- **Base Time**: 60 seconds
- **Countdown**: 3-second animated countdown before start
- **Streak Bonus**: +5 seconds for every 5 correct answers
- **Pause**: Timer pauses for 5 seconds on wrong answer
- **Warning**: Timer turns red when ≤5 seconds remain

### Streak System

- **Threshold**: 5 correct answers = +5 seconds bonus
- **Visual**: 5 flask indicators (fill up as you answer correctly)
- **Forgiving**: Wrong answer decreases streak by 1 (not reset to 0)
- **Tracking**: Number of completed streaks displayed

### Scoring

- **Simplified**: 10 points per correct answer
- **No time or difficulty bonuses**

## 🔧 Development Tips

### Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

### Path Aliases

Import using `@/` prefix:

```typescript
import { gameConfig } from '@/config/gameConfig'
import { useGame } from '@/context/GameContext'
import { cn } from '@/lib/utils'
```

### State Management

Use the `useGame` hook to access global state:

```typescript
import { useGame } from '@/context/GameContext'

function MyComponent() {
  const { player, session, timeLeft, currentStreak } = useGame()
  // ...
}
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This project is part of the Microsoft Fabric IQ Challenge demonstration at Microsoft Ignite.

# 02: React Frontend Setup with Kahoot/Duolingo-inspired Design

Set up a React + TypeScript + Vite frontend application with Tailwind CSS and shadcn/ui components. Implement the custom dark theme with vibrant answer button colors based on the provided mockup, and establish the foundation for the quiz game interface following the documented game mechanics.

## Functional Requirements

- Initialize React 18+ project with TypeScript and Vite for fast development
- Set up Tailwind CSS with custom color palette matching the mockup design
- Install and configure shadcn/ui component library for UI consistency
- Create responsive layout that works on desktop, tablet, and touch devices
- Implement custom theme with dark background and vibrant answer button colors
- Set up routing for game screens: signin → instructions → playing → results
- Configure development environment with hot module replacement
- Establish project structure with organized folders for components, pages, hooks, and utilities
- Create configurable keyboard mappings that can be easily modified
- Support 4 multiple-choice answers per question (A/B/C/D format)

## Technical Requirements

- **Build Tool**: Vite (latest stable version) for fast builds and HMR
- **React**: Version 18+ with TypeScript strict mode
- **Styling**: Tailwind CSS v3+ with custom configuration
- **UI Library**: shadcn/ui for accessible, customizable components
- **Routing**: React Router v6+ for navigation between game screens (signin, instructions, playing, results)
- **State Management**: React Context API or Zustand for global state (player data, game session, timer state)
- **HTTP Client**: Axios or Fetch API with TypeScript types for backend communication
- **Code Quality**: ESLint + Prettier configured for TypeScript and React
- **Custom Theme Colors**:
  - Background: Dark/black (#000000 or #0a0a0a)
  - Timer bar: Orange/amber (#FFA500)
  - Timer border: Dark navy (#1e293b)
  - Question box: Dark with orange border
  - Answer buttons: Green (#10b981), Blue (#3b82f6), Purple (#a855f7), Orange (#f97316)
  - Text: White/light for high contrast
  - Streak flasks: Filled golden (#fbbf24), Empty gray (#64748b)
- **Configuration**: Create config file for:
  - Keyboard mappings (flexible for different key layouts)
  - Game settings (initial timer: 60s, streak threshold: 5, bonus time: +5s)
  - API endpoints
- **Game Mechanics Support**:
  - 60-second base timer with visual countdown
  - 3-second animated countdown before game starts
  - Streak bonus system (5 correct answers = +5 seconds)
  - Wrong answer modal with 5-second pause
  - Timer color changes (red when ≤5 seconds)
  - 5 flask-shaped streak indicators with fill animations
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation support
- **Performance**: Code splitting, lazy loading for optimal load times

## Subtasks

- [ ] Initialize Vite + React + TypeScript project in `/frontend` directory
- [ ] Install and configure Tailwind CSS with custom theme colors
- [ ] Install and set up shadcn/ui component library
- [ ] Create Tailwind custom color palette matching mockup (dark theme, vibrant buttons)
- [ ] Set up React Router with routes: `/signin`, `/instructions`, `/playing`, `/results`
- [ ] Create project folder structure (components, pages, hooks, utils, services, types, config)
- [ ] Configure ESLint and Prettier for code quality
- [ ] Create configuration file for keyboard mappings, game settings, and API endpoints
- [ ] Set up axios/fetch service layer with TypeScript types for API communication
- [ ] Create basic layout components:
  - Header with game title
  - Timer bar with progress indicator
  - Question container with orange border
  - Answer grid (4 buttons in 2x2 layout)
  - Streak indicator (5 flask icons)
- [ ] Implement responsive design breakpoints for mobile, tablet, desktop
- [ ] Set up global state management for player data and game session
- [ ] Add development scripts and environment variable configuration (.env files)
- [ ] Create README with setup instructions and development commands
- [ ] Test touch, mouse, and keyboard input handling setup

## Implementation Details

*To be filled during the execute step*

## Feedback

*To be filled during the review step*

# Microsoft Fabric IQ Challenge

A Kahoot/Duolingo-inspired quiz web app where players have a base 1 minute to answer randomized Microsoft Fabric questions, with the ability to earn up to 1 additional minute through completed streaks (maximum 2 minutes total). Difficulty is controlled by time pressure and number of answer choices. Features forgiving streak system and comprehensive telemetry including all user interactions.

> **MISSION**: Create an engaging quiz game that helps people assess their Microsoft Fabric knowledge while demonstrating Azure and Fabric technologies at Microsoft Ignite

## Overview

- **Purpose**: Help Microsoft Ignite attendees assess their knowledge about Microsoft Fabric
- **Audience**: Microsoft Ignite attendees and Microsoft Fabric learners  
- **Format**: Interactive quiz game with Kahoot/Duolingo-inspired UX
- **Use Cases**: 
  1. Knowledge assessment for Microsoft Fabric learners
  2. Technology demonstration at Microsoft Ignite booth
  3. Booth animation and engagement tool
- **Architecture**: React frontend + .NET API + Azure Cosmos DB + Microsoft Fabric analytics

## Key Technologies and Frameworks

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: .NET 10 Minimal API
- **Database**: Azure Cosmos DB
- **Hosting**: Azure Static Web Apps (frontend) + Azure App Service Container (backend)
- **Analytics**: Microsoft Fabric for real-time telemetry processing
- **CI/CD**: GitHub Actions

## Constraints and Requirements

- **Input Methods**: Touch, mouse and keyboard only (Z/C/B/M for answer choices)
- **Timing**: Base 1 minute timer with streak bonuses up to 2 minutes total (20-second bonuses)
- **Telemetry**: Comprehensive tracking of all clicks, mouse movements (max 10 points/sec), game events
- **Real-time Data**: Telemetry capture to Microsoft Fabric in real-time
- **Concurrency**: Support for 10 concurrent players initially, scalable to 80K
- **Leaderboards**: Both daily and cumulative leaderboards
- **Difficulty System**: Three levels (easy/medium/hard) with forgiving streak progression
- **Scoring**: Points weighted by difficulty level + proportional time bonuses

## Challenges and Mitigation Strategies

- **Real-time telemetry performance**: Use batching and asynchronous processing to avoid impacting game performance
- **High concurrent users at Ignite**: Implement proper scaling with Azure App Service and connection pooling for Cosmos DB
- **Touch vs mouse interaction differences**: Thorough testing across devices and input methods with responsive design
- **Network latency affecting game experience**: Implement offline-capable question caching and optimistic UI updates
- **Dynamic timer complexity**: Careful testing of streak-based time bonus calculations and UI updates
- **Telemetry data volume**: Use efficient data schemas and consider sampling strategies for mouse movement data

## Development Workflow

- **Frontend Dev Server**: `npm run dev` (React with Vite)
- **Backend Dev Server**: `dotnet run` (.NET 10 Minimal API)
- **Database**: Azure Cosmos DB (local emulator for development)
- **Testing**: Jest for frontend, xUnit for backend
- **Build**: `npm run build` for frontend, `dotnet publish` for backend
- **Deployment**: GitHub Actions to Azure Static Web Apps + App Service Container

## Coding Guidelines

- **TypeScript**: Strict mode enabled, comprehensive type definitions
- **React**: Functional components with hooks, proper state management
- **API Design**: RESTful endpoints with OpenAPI documentation
- **Error Handling**: Comprehensive error boundaries and API error responses
- **Performance**: Optimize for high concurrency and real-time interactions
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design

## Security Considerations

- **API Security**: Proper input validation and rate limiting
- **Data Privacy**: Minimize PII collection, secure telemetry transmission
- **Authentication**: Session-based user management without requiring login
- **CORS**: Proper configuration for frontend-backend communication
- **Environment Secrets**: Secure configuration management for Azure services
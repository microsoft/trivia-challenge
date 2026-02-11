---
title: Product Overview
description: Overview of the Microsoft Fabric Trivia Challenge product
---

# Product Overview

The **Microsoft Fabric Trivia Challenge** is a Kahoot/Duolingo-inspired quiz web application where players assess their Microsoft Fabric knowledge through a time-pressured, streak-based game. It was originally designed for Microsoft Ignite booth engagement and can also serve as a standalone learning tool.

## Key Features

- **Time Pressure**: 60-second base timer with up to 60 seconds of streak bonuses (max 120 seconds)
- **Streak System**: 5 correct answers = 1 completed streak = +15 seconds bonus (max 4 streaks)
- **Heart System**: Start with 5 hearts; lose half a heart per wrong answer; game ends at 0
- **Leaderboards**: Daily and cumulative rankings
- **Comprehensive Telemetry**: Every click, touch, and keyboard press is captured for analytics
- **Station Tracking**: Physical kiosk identification for event deployments

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | .NET 10 Minimal API |
| Database | Azure Cosmos DB (with Cosmos DB Emulator for local development) |
| Analytics | Microsoft Fabric — Real-Time Intelligence + Event Hubs |
| Hosting | Azure App Service (container-based) + Azure Container Registry |

## Game Flow

1. **Sign In** — Collect player name, email, and optional phone number
2. **Instructions** — Show rules, scoring, and streak mechanics
3. **Playing** — Answer multiple-choice questions under time pressure
4. **Results** — Display final score, streaks completed, and leaderboard position

## Use Cases

- **Knowledge assessment** for Microsoft Fabric learners
- **Booth engagement** at Microsoft Ignite and similar events
- **Technology demonstration** of Azure and Microsoft Fabric capabilities

## Further Reading

- [Game Logic & Timer System](game_logic.md)
- [Development Setup](../../development-setup.md)
- [Telemetry Events Reference](../../telemetry-events.md)

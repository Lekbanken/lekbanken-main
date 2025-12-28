# Legendary Escape Room Toolkit - Documentation

Welcome to the documentation for the Legendary Escape Room Toolkit. This guide covers everything from initial setup to advanced customization.

## Quick Links

- [Getting Started](./getting-started/README.md)
- [Host Guide](./host-guide/README.md)
- [Developer Guide](./developer-guide/README.md)
- [API Reference](./api-reference/README.md)

---

## Documentation Structure

```
docs/toolkit/
├── README.md                    # This file
├── getting-started/
│   ├── README.md               # Quick start guide
│   ├── installation.md         # Setup and configuration
│   ├── first-game.md           # Create your first game
│   └── concepts.md             # Core concepts explained
├── host-guide/
│   ├── README.md               # Host overview
│   ├── creating-games.md       # Game authoring
│   ├── running-sessions.md     # Session management
│   ├── managing-participants.md # Participant handling
│   ├── triggers-automation.md  # Trigger system
│   ├── artifacts-content.md    # Content management
│   └── analytics.md            # Understanding analytics
├── developer-guide/
│   ├── README.md               # Developer overview
│   ├── architecture.md         # System architecture
│   ├── database-schema.md      # Database documentation
│   ├── api-integration.md      # API integration
│   ├── webhooks.md             # Webhook configuration
│   ├── customization.md        # Customizing the toolkit
│   └── contributing.md         # Contributing guide
├── api-reference/
│   ├── README.md               # API overview
│   ├── authentication.md       # Auth endpoints
│   ├── games.md                # Games API
│   ├── sessions.md             # Sessions API
│   ├── participants.md         # Participants API
│   └── analytics.md            # Analytics API
└── troubleshooting/
    ├── README.md               # Common issues
    ├── faq.md                  # Frequently asked questions
    └── support.md              # Getting help
```

---

## Overview

The Legendary Escape Room Toolkit is a comprehensive platform for creating, managing, and running interactive escape room experiences. It supports both in-person and virtual sessions with real-time participant interaction.

### Key Features

- **Game Builder**: Visual editor for creating escape room games
- **Session Management**: Run multiple sessions simultaneously
- **Real-time Updates**: Live synchronization between host and participants
- **Trigger System**: Automated actions based on time, signals, or events
- **Time Bank**: Flexible time management with penalties and bonuses
- **Analytics**: Detailed session statistics and insights
- **Multi-tenant**: Support for multiple organizations

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Dashboard                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Game Builder │  │  Sessions   │  │   Analytics     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │   API     │
                    └─────┬─────┘
                          │
┌─────────────────────────┼─────────────────────────────┐
│                         │                              │
│  ┌─────────────┐  ┌─────┴─────┐  ┌─────────────────┐ │
│  │  Host View  │  │ Supabase  │  │ Participant View │ │
│  └─────────────┘  │ Database  │  └─────────────────┘ │
│                    └───────────┘                       │
│                    Play Runtime                        │
└───────────────────────────────────────────────────────┘
```

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/your-org/lekbanken/issues)
- **Discussions**: [Community discussions](https://github.com/your-org/lekbanken/discussions)
- **Email**: support@example.com

---

## Version

Current version: **1.0.0**

Last updated: 2025-01-15

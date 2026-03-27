# WA1Link V2

WhatsApp Bulk Messaging Desktop Application built with Electron, React, and Baileys.

## Features

- **Multi-Account Support**: Connect and manage multiple WhatsApp accounts
- **Bulk Messaging**: Send personalized messages to multiple contacts
- **Template Variables**: Use `{{Name}}`, `{{Number}}`, and custom fields
- **Contact Extraction**: Extract contacts from WhatsApp groups and personal chats
- **Message Scheduling**: Schedule campaigns to run at specific times
- **Smart Delays**: Configurable delays to avoid rate limiting
- **Multi-Country Support**: Phone number normalization for 20+ countries
- **Excel Import/Export**: Import targets from Excel, export extracted contacts

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Install dependencies
npm install

# Start development
npm start

# Build for production
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── database/      # SQLite database & repositories
│   ├── ipc/           # IPC handlers
│   └── services/      # Core business logic
├── renderer/          # React frontend
│   ├── components/    # UI components
│   ├── pages/         # Page components
│   └── stores/        # Zustand state management
├── shared/            # Shared types & constants
└── preload/           # Electron preload script
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Electron, Better-SQLite3
- **WhatsApp**: @whiskeysockets/baileys
- **Build**: electron-builder, GitHub Actions

## License

This project requires a valid license key to operate. Contact support for licensing information.

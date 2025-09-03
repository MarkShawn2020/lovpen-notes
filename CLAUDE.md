# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri v2 + React + TypeScript application called "lovpen-notes". It uses:
- **Frontend**: React 19 with TypeScript, built with Vite
- **Backend**: Rust with Tauri v2 framework  
- **Package Manager**: pnpm
- **Build System**: Vite for frontend, Cargo for Rust backend

## Essential Commands

### Development
```bash
# Start the Tauri app in development mode
pnpm tauri dev

# Start only the frontend dev server (Vite)
pnpm dev

# Build the application for production
pnpm tauri build
```

### Building and Type Checking
```bash
# Type check TypeScript and build frontend
pnpm build

# Build only the Rust backend
cd src-tauri && cargo build

# Run Rust tests
cd src-tauri && cargo test
```

## Project Architecture

### Frontend Structure
- **src/**: React TypeScript application
  - `main.tsx`: Application entry point
  - `App.tsx`: Main React component
  - Frontend runs on http://localhost:1420 in dev mode

### Backend Structure  
- **src-tauri/**: Rust Tauri backend
  - `src/lib.rs`: Main Tauri application logic and command handlers
  - `src/main.rs`: Binary entry point
  - `Cargo.toml`: Rust dependencies
  - `tauri.conf.json`: Tauri configuration

### Communication Between Frontend and Backend
- Frontend invokes Rust commands using `@tauri-apps/api/core`'s `invoke()` function
- Commands are defined in `src-tauri/src/lib.rs` with `#[tauri::command]` attribute
- Commands must be registered in the `invoke_handler` in `lib.rs`

## Key Configuration Files
- **tsconfig.json**: TypeScript strict mode enabled with bundler module resolution
- **tauri.conf.json**: Defines app identifier, window settings, and build configuration
- **vite.config.ts**: Frontend build configuration

## Development Tools

### Code Inspector
The project includes `code-inspector-plugin` for enhanced debugging experience:
- **Purpose**: Click DOM elements in the browser to automatically open the IDE at the exact source code location
- **Activation**: Press `Option + Shift` (Mac) or `Alt + Shift` (Windows) then click any element
- **Configuration**: Located in `vite.config.ts`, enabled only in development mode
- **Supported Editors**: VSCode, Cursor, Windsurf, WebStorm, and others

## Development Notes
- The app identifier is `dev.neurora.lovpen-notes`
- Default window size is 800x600
- The Tauri opener plugin is included for file/URL opening capabilities
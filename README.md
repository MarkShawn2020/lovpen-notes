# LovPen Notes

A lightweight, always-on-top floating note-taking app with Markdown support and version management. Built with Tauri for native performance and React for a modern UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![React](https://img.shields.io/badge/React-v19-61dafb)

## ✨ Features

- **📝 Markdown Editor** - Full Markdown support with live preview
- **🎯 Floating Window** - Always-on-top design for quick note access
- **⌨️ Global Hotkey** - Press `Cmd+N` (macOS) or `Ctrl+N` (Windows/Linux) to toggle the app
- **🔄 Version Management** - Resume and branch your notes with built-in versioning
- **🏷️ Smart Tagging** - Automatic title and tag generation
- **👁️ View Modes** - Switch between Edit, Split, and Preview modes
- **💾 Local Storage** - All notes stored securely on your device

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)
- [Rust](https://www.rust-lang.org/) (latest stable)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lovpen-notes.git
cd lovpen-notes

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## 📖 Usage

1. **Launch the app** - The app starts minimized. Press `Cmd+N` to open
2. **Write notes** - Use Markdown syntax for formatting
3. **Submit notes** - Press `Cmd+Enter` or click Submit
4. **Resume notes** - Click the ▶ button on any note to continue editing
5. **Switch views** - Toggle between Edit, Split, and Preview modes

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+N` / `Ctrl+N` | Toggle app window |
| `Cmd+Enter` / `Ctrl+Enter` | Submit note |
| `Tab` | Insert indentation in editor |

## 🛠️ Development

```bash
# Start development server
pnpm tauri dev

# Run frontend only
pnpm dev

# Build for release
pnpm tauri build

# Type checking
pnpm tsc
```

### Project Structure

```
lovpen-notes/
├── src/                 # React frontend
│   ├── App.tsx         # Main application component
│   ├── App.css         # Application styles
│   └── main.tsx        # Entry point
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── lib.rs      # Tauri commands and logic
│   │   └── main.rs     # Application entry
│   └── tauri.conf.json # Tauri configuration
└── package.json        # Node dependencies
```

## 🔧 Configuration

The app configuration can be modified in `src-tauri/tauri.conf.json`:

- Window size and position
- Always-on-top behavior
- App metadata and versioning

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) - Build smaller, faster, and more secure desktop applications
- UI powered by [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Markdown rendering by [react-markdown](https://github.com/remarkjs/react-markdown)

## 📬 Support

For issues and questions, please [open an issue](https://github.com/yourusername/lovpen-notes/issues) on GitHub.

---

Made with ❤️ for better note-taking
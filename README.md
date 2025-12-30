# 📺 TIPTV

A modern, cross-platform IPTV streaming application. Built with Astro, Tauri, and Tailwind CSS.

## ✨ Features

- 🌐 **Web & Desktop**: Works both in web browsers and as a desktop application
- 📱 **Mobile Support**: Build support for iOS and Android platforms
- ⚡ **Fast and Lightweight**: Optimized performance with Astro's static site generation
- 🎨 **Modern UI**: Elegant and responsive design with Tailwind CSS 4
- 🔥 **Firebase Hosting**: Automatic deployment and hosting
- 🖥️ **Cross-Platform**: Windows, macOS, and Linux support

## 🚀 Installation

### Requirements

- Node.js (v18 or higher)
- npm or yarn
- Rust (for Tauri)
- Firebase CLI (for deployment)

### Clone the Project

```bash
git clone <repository-url>
cd tiptv
npm install
```

## 💻 Development

### Web Development

```bash
# Start development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

### Desktop Application (Tauri)

```bash
# Run desktop app in development mode
npm run tauri:dev

# Build desktop app
npm run tauri:build
```

### Platform-Specific Builds

```bash
# Build for Windows
npm run tauri:build:windows

# Build for macOS
npm run tauri:build:macos

# Build for Linux
npm run tauri:build:linux
```

### Mobile Development

```bash
# iOS development
npm run tauri:dev:ios

# iOS build
npm run tauri:build:ios

# Android development
npm run tauri:dev:android

# Android build
npm run tauri:build:android
```

## 🧪 Testing

```bash
npm test
```

## 🚢 Deployment

### GitHub Release System

The project is equipped with an automatic GitHub release system. All platforms (Windows, macOS, Linux, Android) are automatically built for each release.

#### Automatic Release Creation

```bash
# Create release using version from package.json
npm run release
```

This command:
1. Gets the current version from package.json
2. Creates a Git tag (e.g., v1.0.1)
3. Pushes the tag to GitHub
4. GitHub Actions automatically triggers and builds for all platforms

#### Manual Release

Alternatively, you can create a manual tag:

```bash
git tag v1.0.1
git push origin v1.0.1
```

#### Release Contents

Each release includes:
- **Windows**: `.msi` installer
- **macOS**: `.dmg` file (Apple Silicon and Intel)
- **Linux**: `.AppImage` file
- **Android**: `.apk` file

### Firebase Deployment

For web application Firebase hosting:

```bash
npm run deploy
```

### Manual Build

If you want to build for specific platforms only:

```bash
# Web build only
npm run build

# Build all packages
npm run build:packages

# Copy packages
npm run copy:packages

# Specific platform only
npm run build:android
npm run build:windows
npm run build:macos
npm run build:linux
```

### Download Links

After deployment, download links for all platforms automatically appear on the application's login page:

- **Android APK**: `/downloads/tiptv-android.apk`
- **Windows MSI**: `/downloads/tiptv-windows.msi`
- **macOS DMG**: `/downloads/tiptv-macos.dmg`
- **Linux AppImage**: `/downloads/tiptv-linux.AppImage`

## 🛠️ Technologies

- **[Astro](https://astro.build/)** - Modern web framework
- **[Tauri](https://tauri.app/)** - Cross-platform desktop application framework
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Firebase](https://firebase.google.com/)** - Hosting and backend services
- **[Vitest](https://vitest.dev/)** - Test framework

## 📁 Project Structure

```
tiptv/
├── src/
│   ├── components/     # Astro components
│   ├── layouts/        # Page layouts
│   ├── pages/          # Page files
│   ├── scripts/        # JavaScript/TypeScript files
│   ├── styles/         # CSS files
│   └── types/          # TypeScript type definitions
├── src-tauri/          # Tauri application source code
├── public/             # Static files
├── dist/               # Build outputs
└── tests/              # Test files
```

## 🌐 Live Demo

The application is live at: [https://topraktv-dc925.web.app/](https://topraktv-dc925.web.app/)

## 📝 License

This is a private project.

## 🤝 Contributing

We welcome your contributions! Feel free to submit pull requests.

---

Enjoy watching with **TIPTV**! 🎬

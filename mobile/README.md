# Digipod Mobile App

A React Native companion app for Digipod, your AI-powered productivity platform.

## Features

- **Authentication**: Google Sign-In integration
- **Dashboard**: Overview of tasks, projects, and AI activity
- **Tasks**: View and filter all tasks (AI-extracted and Co-Pilot added)
- **Co-Pilot**: Chat interface with your AI assistant
- **Real-time Updates**: Pull-to-refresh and live data sync

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for routing
- **Firebase** for authentication and backend
- **Expo Vector Icons** for UI icons

## Setup

### Prerequisites

- Node.js (v18+)
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on iOS:**
   ```bash
   npm run ios
   ```

4. **Run on Android:**
   ```bash
   npm run android
   ```

## Project Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx      # Authentication screen
│   │   ├── DashboardScreen.tsx  # Main dashboard
│   │   ├── TasksScreen.tsx      # Task management
│   │   └── CoPilotScreen.tsx    # AI chat interface
│   ├── components/              # Reusable components
│   └── lib/                     # Utilities and helpers
├── App.tsx                      # Main app component
└── package.json
```

## API Integration

The mobile app connects to the same backend as the web app:

- **Authentication**: Firebase Auth
- **Tasks**: `/api/client-todos`
- **Co-Pilot**: `/api/copilot`
- **Dashboard**: `/api/dashboard/summary`

## Development

### Adding New Screens

1. Create a new screen in `src/screens/`
2. Add the screen to `App.tsx` navigation
3. Update the `RootStackParamList` type

### Styling

The app uses a dark theme with:
- Background: `#111827`
- Cards: `#1F2937`
- Primary: `#3B82F6`
- Success: `#10B981`

### State Management

- Local state with React hooks
- Firebase for authentication
- API calls for data fetching

## Building for Production

### iOS

1. **Build the app:**
   ```bash
   eas build --platform ios
   ```

2. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```

### Android

1. **Build the app:**
   ```bash
   eas build --platform android
   ```

2. **Submit to Play Store:**
   ```bash
   eas submit --platform android
   ```

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   ```

2. **iOS Simulator not working:**
   ```bash
   xcrun simctl boot "iPhone 15"
   ```

3. **Android emulator issues:**
   - Open Android Studio
   - Start AVD Manager
   - Launch an emulator

### Debugging

- Use React Native Debugger
- Enable remote debugging in simulator
- Check Metro bundler logs

## Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Test on both iOS and Android
4. Update this README for new features

## License

Same as the main Digipod project. 
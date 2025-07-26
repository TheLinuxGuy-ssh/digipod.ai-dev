# Digipod Mobile - iOS App

A native iOS application built with SwiftUI for the Digipod platform.

## Features

### Tab Navigation
The app features 5 main tabs:

1. **Home** - Dashboard with stats, recent activity, and overview
2. **Projects** - View and manage your projects with progress tracking
3. **Pip** - AI assistant chat interface
4. **Notes** - Create and manage notes
5. **Settings** - App preferences and account management

### Design
- Dark theme with Digipod branding colors
- Native iOS design patterns
- SF Symbols for consistent iconography
- Smooth animations and transitions

## Technical Stack

- **Framework**: SwiftUI
- **Language**: Swift
- **Target**: iOS 17.0+
- **Architecture**: MVVM with SwiftUI
- **Navigation**: TabView with NavigationView

## Project Structure

```
DigipodMobile/
├── DigipodMobileApp.swift      # App entry point
├── ContentView.swift           # Main tab navigation
├── Assets.xcassets/           # App icons and colors
└── Preview Content/           # SwiftUI previews
```

## Getting Started

### Prerequisites
- Xcode 15.0 or later
- iOS 17.0+ deployment target
- macOS 14.0+ for development

### Installation
1. Open `DigipodMobile.xcodeproj` in Xcode
2. Select your development team in project settings
3. Build and run on simulator or device

### Development
- The app uses SwiftUI's declarative syntax
- All views are built with native iOS components
- Dark mode is enforced throughout the app
- Tab navigation uses SF Symbols for icons

## Features in Detail

### Home Tab
- Welcome message with user personalization
- Statistics cards showing key metrics
- Recent activity feed
- Quick access to important actions

### Projects Tab
- List of all user projects
- Project status indicators (Active/Pending)
- Progress bars for project completion
- Project management capabilities

### Pip Tab
- Chat interface with AI assistant
- Message bubbles with user/AI distinction
- Real-time message sending
- Conversation history

### Notes Tab
- List of user notes
- Note preview with title and content
- Date stamps for organization
- Quick note creation

### Settings Tab
- App preferences (notifications, dark mode)
- Account management
- API key configuration
- Support and help resources

## Design System

### Colors
- **Primary**: Digipod Yellow (#FFD600)
- **Background**: Black (#000000)
- **Text**: White (#FFFFFF)
- **Secondary Text**: Gray (#9CA3AF)

### Typography
- **Headlines**: Large title, bold
- **Body**: Regular, medium weight
- **Captions**: Small, light weight

### Icons
- SF Symbols for consistency
- Custom colors applied to match brand
- Appropriate sizing for touch targets

## Future Enhancements

- Firebase integration for authentication
- Real-time data synchronization
- Push notifications
- Offline support
- Advanced project management features
- Enhanced AI assistant capabilities

## Testing

The app includes SwiftUI previews for rapid development and testing. Use Xcode's preview canvas to see changes in real-time.

## Deployment

1. Configure code signing in Xcode
2. Set up App Store Connect for distribution
3. Archive and upload to App Store
4. Configure TestFlight for beta testing

## Contributing

1. Follow SwiftUI best practices
2. Maintain consistent code style
3. Add previews for new views
4. Test on multiple device sizes
5. Ensure accessibility compliance

## License

This project is part of the Digipod platform and follows the same licensing terms. 
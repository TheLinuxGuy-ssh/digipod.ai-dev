//
//  digipodApp.swift
//  digipod
//
//  Created by Kashish Sharma on 26/07/25.
//

import SwiftUI
import FirebaseCore
import FirebaseAppCheck
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        
        // Completely disable App Check for development to avoid simulator issues
        #if DEBUG
        // Don't set any App Check provider - this disables it completely
        #endif
        
        return true
    }
    
    // Handle push notification registration
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("📱 Device Token: \(token)")
        
        // Store the device token
        PushNotificationService.shared.deviceToken = token
        PushNotificationService.shared.isRegistered = true
        
        // TODO: Send token to your backend
        sendDeviceTokenToBackend(token)
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register for remote notifications: \(error)")
    }
    
    private func sendDeviceTokenToBackend(_ token: String) {
        Task {
            do {
                let apiService = APIService()
                let success = try await apiService.registerDeviceToken(token)
                if success {
                    print("✅ Device token successfully registered with backend")
                } else {
                    print("❌ Failed to register device token with backend")
                }
            } catch {
                print("❌ Error registering device token: \(error)")
            }
        }
    }
}

@main
struct DigipodMobileApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

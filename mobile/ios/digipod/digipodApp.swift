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
import FirebaseMessaging

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        
        // Completely disable App Check for development to avoid simulator issues
        #if DEBUG
        // Don't set any App Check provider - this disables it completely
        #endif
        
        // Set Messaging delegate to receive FCM token refreshes
        Messaging.messaging().delegate = self
        
        // Register for remote notifications
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
            if let error = error { print("❌ Notification permission error: \(error)") }
        }
        
        // Do NOT fetch FCM token here; wait until APNs token is set in didRegisterForRemoteNotifications
        
        return true
    }
    
    // APNs device token received
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let apnsToken = tokenParts.joined()
        print("📱 APNs Device Token: \(apnsToken)")
        
        // Provide APNs token to FCM so it can map to FCM token
        Messaging.messaging().apnsToken = deviceToken
        
        // Now that APNs token is set, fetch FCM token
        fetchAndRegisterFCMToken()
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register for remote notifications: \(error)")
    }
    
    private func fetchAndRegisterFCMToken() {
        guard Messaging.messaging().apnsToken != nil else {
            print("ℹ️ Skipping FCM token fetch until APNs token is available")
            return
        }
        Messaging.messaging().token { token, error in
            if let error = error {
                print("❌ Error fetching FCM registration token: \(error)")
                return
            }
            guard let fcmToken = token else {
                print("❌ FCM token is nil")
                return
            }
            print("✅ FCM registration token: \(fcmToken.prefix(24))…")
            
            // Store and send to backend
            PushNotificationService.shared.deviceToken = fcmToken
            PushNotificationService.shared.isRegistered = true
            self.sendDeviceTokenToBackend(fcmToken)
        }
    }
    
    private func sendDeviceTokenToBackend(_ token: String) {
        Task {
            do {
                let apiService = APIService()
                let success = try await apiService.registerDeviceToken(token)
                if success { print("✅ FCM token registered with backend") }
                else { print("❌ Failed to register FCM token with backend") }
            } catch {
                print("❌ Error registering FCM token: \(error)")
            }
        }
    }
}

extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        print("🔄 FCM token refreshed: \(fcmToken.prefix(24))…")
        PushNotificationService.shared.deviceToken = fcmToken
        PushNotificationService.shared.isRegistered = true
        sendDeviceTokenToBackend(fcmToken)
    }
}

extension AppDelegate {
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("📥 Received remote notification (background): \(userInfo)")
        completionHandler(.newData)
    }
}

@main
struct DigipodMobileApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var authViewModel = AuthViewModel()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
        }
    }
}

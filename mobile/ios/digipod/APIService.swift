import Foundation
import SwiftUI
import FirebaseAuth
#if canImport(UIKit)
import UIKit
#endif
    
// MARK: - API Service
class APIService: ObservableObject {
    private let baseURL = "https://app.digipod.tech/api"
    
    // MARK: - Authentication
    func authenticateUser(email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/google")!
        let request = URLRequest(url: url)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError
            }
            
            if httpResponse.statusCode == 200 {
                return try JSONDecoder().decode(AuthResponse.self, from: data)
            } else {
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                throw APIError.serverUnavailable
            }
            throw error
        }
    }
    
    // MARK: - Dashboard Data
    func fetchDashboardSummary() async throws -> DashboardSummary {
        let url = URL(string: "\(baseURL)/dashboard/summary")!
        print("🔍 Fetching dashboard summary from: \(url)")
        
        let request = try await createAuthenticatedRequest(url: url)
        print("🔍 Request headers: \(request.allHTTPHeaderFields ?? [:])")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type")
                throw APIError.networkError
            }
            
            print("🔍 Response status: \(httpResponse.statusCode)")
            print("🔍 Response headers: \(httpResponse.allHeaderFields)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔍 Response body: \(responseString)")
            }
            
            if httpResponse.statusCode == 200 {
                let decoded = try JSONDecoder().decode(DashboardSummary.self, from: data)
                print("✅ Successfully decoded DashboardSummary")
                return decoded
            } else if httpResponse.statusCode == 401 {
                print("❌ Unauthorized - authentication failed")
                throw APIError.authenticationFailed
            } else {
                print("❌ Invalid response status: \(httpResponse.statusCode)")
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                print("❌ Server unavailable")
                throw APIError.serverUnavailable
            }
            print("❌ Error fetching dashboard summary: \(error)")
            throw error
        }
    }
    
    // MARK: - Upcoming Todos
    func fetchUpcomingTodos() async throws -> [Todo] {
        let url = URL(string: "\(baseURL)/client-todos")!
        let request = try await createAuthenticatedRequest(url: url);
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError
            }
            if httpResponse.statusCode == 200 {
                let response = try JSONDecoder().decode(TodosResponse.self, from: data)
                return response.todos
            } else {
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                throw APIError.serverUnavailable
            }
            throw error
        }
    }
    
    // MARK: - AI Drafts
    func fetchAIDrafts() async throws -> [AIDraft] {
        let url = URL(string: "\(baseURL)/ai-drafts?status=draft&limit=10")!
        print("🔍 Fetching AI drafts from: \(url)")
        
        let request = try await createAuthenticatedRequest(url: url)
        print("🔍 Request headers: \(request.allHTTPHeaderFields ?? [:])")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type")
                throw APIError.networkError
            }
            
            print("🔍 Response status: \(httpResponse.statusCode)")
            print("🔍 Response headers: \(httpResponse.allHeaderFields)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔍 Response body: \(responseString)")
            }
            
            if httpResponse.statusCode == 200 {
                // Try to decode as array first
                do {
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    let drafts = try decoder.decode([AIDraft].self, from: data)
                    print("✅ Successfully decoded AI drafts as array: \(drafts.count)")
                    return drafts
                } catch {
                    print("❌ Failed to decode as array, trying as object with drafts property")
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    let response = try decoder.decode(AIDraftsResponse.self, from: data)
                    print("✅ Successfully decoded AI drafts from object: \(response.drafts.count)")
                    return response.drafts
                }
            } else if httpResponse.statusCode == 401 {
                print("❌ Unauthorized - authentication failed")
                throw APIError.authenticationFailed
            } else {
                print("❌ Invalid response status: \(httpResponse.statusCode)")
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                print("❌ Server unavailable")
                throw APIError.serverUnavailable
            }
            print("❌ Error fetching AI drafts: \(error)")
            throw error
        }
    }
    
    // MARK: - Calendar Events
    func fetchCalendarEvents() async throws -> [CalendarEvent] {
        let url = URL(string: "\(baseURL)/calendar-events")!
        let request = try await createAuthenticatedRequest(url: url)
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError
            }
            if httpResponse.statusCode == 200 {
                return try JSONDecoder().decode([CalendarEvent].self, from: data)
            } else {
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                throw APIError.serverUnavailable
            }
            throw error
        }
    }
    
    // MARK: - Projects
    func fetchProjects() async throws -> [Project] {
        let url = URL(string: "\(baseURL)/projects")!
        let request = try await createAuthenticatedRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let responseString = String(data: data, encoding: .utf8) {
            print("🔍 [fetchProjects] Raw response: \(responseString)")
        }
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("❌ [fetchProjects] Invalid response status")
            throw APIError.invalidResponse
        }
        let projects = try JSONDecoder().decode([Project].self, from: data)
        print("✅ [fetchProjects] Decoded projects count: \(projects.count)")
        return projects
    }

    func createProject(name: String, clientEmail: String) async throws -> Project {
        let url = URL(string: "\(baseURL)/projects")!
        var request = try await createAuthenticatedRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["name": name, "clientEmail": clientEmail]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        return try JSONDecoder().decode(Project.self, from: data)
    }
    
    func fetchProject(id: String) async throws -> Project {
        let url = URL(string: "\(baseURL)/projects/\(id)")!
        let request = try await createAuthenticatedRequest(url: url)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let responseString = String(data: data, encoding: .utf8) {
            print("🔍 [fetchProject] Raw response: \(responseString)")
        }
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            print("❌ [fetchProject] Invalid response status")
            throw APIError.invalidResponse
        }
        let project = try JSONDecoder().decode(Project.self, from: data)
        print("✅ [fetchProject] Decoded project: \(project.name)")
        return project
    }
    
    // MARK: - Todos
    func fetchTodos() async throws -> [Todo] {
        let url = URL(string: "\(baseURL)/client-todos")!
        let request = try await createAuthenticatedRequest(url: url)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError
            }
            
            if httpResponse.statusCode == 200 {
                let response = try JSONDecoder().decode(TodosResponse.self, from: data)
                return response.todos
            } else {
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                throw APIError.serverUnavailable
            }
            throw error
        }
    }
    
    func addTodo(task: String, projectId: String = "general", projectName: String = "General") async throws {
        let url = URL(string: "\(baseURL)/todos")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add Firebase ID token
        if let user = Auth.auth().currentUser {
            let token = try await user.getIDToken()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let todoData = TodoRequest(task: task, projectId: projectId, projectName: projectName)
        request.httpBody = try JSONEncoder().encode(todoData)
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                throw APIError.serverUnavailable
            }
            throw error
        }
    }
    
    // MARK: - Copilot
    func sendCopilotMessage(message: String) async throws -> CopilotResponse {
        // Check for simple commands that can be handled locally
        let lowerMessage = message.lowercased()
        if lowerMessage.contains("help") || lowerMessage.contains("what can you do") {
            return CopilotResponse(reply: "I can help you add to-dos, fetch project statuses, get metrics, and more! Try asking: 'Add a to-do', 'Show my project status', or 'Get my metrics'.")
        }
        
        // Let the server handle all messages now that we're testing locally
        
        // Use production URL
        let url = URL(string: "https://app.digipod.tech/api/copilot")!
        print("🔍 Sending Copilot message to: \(url)")
        
        var request = try await createAuthenticatedRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let messageData = CopilotRequest(message: message)
        request.httpBody = try JSONEncoder().encode(messageData)
        
        print("🔍 Copilot request body: \(message)")
        print("🔍 Copilot request headers: \(request.allHTTPHeaderFields ?? [:])")
        
        // Add timeout to prevent hanging requests
        request.timeoutInterval = 30
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type for Copilot")
                throw APIError.networkError
            }
            
            print("🔍 Copilot response status: \(httpResponse.statusCode)")
            print("🔍 Copilot response headers: \(httpResponse.allHeaderFields)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔍 Copilot response body: \(responseString)")
            }
            
            if httpResponse.statusCode == 200 {
                // Try to decode as CopilotResponse first
                do {
                    let decoded = try JSONDecoder().decode(CopilotResponse.self, from: data)
                    print("✅ Copilot response decoded successfully")
                    return decoded
                } catch {
                    print("❌ Failed to decode CopilotResponse: \(error)")
                    // If decoding fails, try to extract error message
                    if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                        throw APIError.invalidResponse
                    }
                    throw APIError.decodingError
                }
            } else if httpResponse.statusCode == 401 {
                print("❌ Copilot unauthorized - authentication failed")
                throw APIError.authenticationFailed
            } else if httpResponse.statusCode == 500 {
                print("❌ Copilot server error - providing fallback response")
                // Return a more helpful fallback response for server errors
                return CopilotResponse(reply: "The server is being updated right now. Please try again in a few minutes or use the web app which is working perfectly!")
            } else {
                print("❌ Copilot invalid response status: \(httpResponse.statusCode)")
                throw APIError.invalidResponse
            }
        } catch {
            if (error as NSError).code == -1004 {
                print("❌ Copilot server unavailable")
                throw APIError.serverUnavailable
            }
            print("❌ Copilot error: \(error)")
            // Return a fallback response instead of throwing
            return CopilotResponse(reply: "I'm having trouble connecting to the server right now. Please check your internet connection and try again.")
        }
    }
    
    // MARK: - Project Phase Methods
    func advancePhase(projectId: String) async throws -> Bool {
        let url = URL(string: "\(baseURL)/projects/\(projectId)/phase/next")!
        var request = try await createAuthenticatedRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["force": true]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        print("🔍 Phase advance response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode == 200 {
            let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            print("🔍 Phase advance success: \(responseData?["success"] ?? false)")
            return responseData?["success"] as? Bool ?? false
        } else {
            print("❌ Phase advance failed with status: \(httpResponse.statusCode)")
            throw APIError.invalidResponse
        }
    }
    
    func updateProjectPhase(projectId: String, newPhase: String) async throws -> Bool {
        let url = URL(string: "\(baseURL)/projects/\(projectId)")!
        var request = try await createAuthenticatedRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["currentPhase": newPhase]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        print("🔍 Update phase response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode == 200 {
            let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            print("🔍 Phase update success: \(responseData?["currentPhase"] ?? "unknown")")
            return true
        } else {
            print("❌ Phase update failed with status: \(httpResponse.statusCode)")
            throw APIError.invalidResponse
        }
    }
    
    // MARK: - Connectivity Test
    func testBackendConnection() async throws -> Bool {
        let url = URL(string: "\(baseURL)/dashboard/summary")!
        print("🔍 Testing backend connection to: \(url)")
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type")
                return false
            }
            
            print("🔍 Connection test response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode == 401 {
                print("✅ Backend is reachable but requires authentication")
                return true
            } else if httpResponse.statusCode == 200 {
                print("✅ Backend is reachable and responding")
                return true
            } else {
                print("❌ Backend responded with unexpected status: \(httpResponse.statusCode)")
                return false
            }
        } catch {
            print("❌ Backend connection test failed: \(error)")
            return false
        }
    }
    
    // MARK: - Test Copilot Connection
    func testCopilotConnection() async throws -> Bool {
        let url = URL(string: "\(baseURL)/copilot")!
        print("🔍 Testing Copilot connection to: \(url)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10
        
        let testMessage = CopilotRequest(message: "test")
        request.httpBody = try JSONEncoder().encode(testMessage)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ Invalid response type for Copilot test")
                return false
            }
            
            print("🔍 Copilot test response status: \(httpResponse.statusCode)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔍 Copilot test response body: \(responseString)")
            }
            
            if httpResponse.statusCode == 401 {
                print("✅ Copilot endpoint is reachable but requires authentication")
                return true
            } else if httpResponse.statusCode == 200 {
                print("✅ Copilot endpoint is reachable and responding")
                return true
            } else {
                print("❌ Copilot endpoint responded with unexpected status: \(httpResponse.statusCode)")
                return false
            }
        } catch {
            print("❌ Copilot connection test failed: \(error)")
            return false
        }
    }
    
    // MARK: - Push Notification Methods
    func registerDeviceToken(_ token: String) async throws -> Bool {
        let url = URL(string: "\(baseURL)/push-notifications/register")!
        var request = try await createAuthenticatedRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["deviceToken": token]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        print("🔍 Device token registration response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode == 200 {
            let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            print("🔍 Device token registered successfully")
            return responseData?["success"] as? Bool ?? false
        } else {
            print("❌ Device token registration failed with status: \(httpResponse.statusCode)")
            throw APIError.invalidResponse
        }
    }
    
    func sendTestNotification() async throws -> Bool {
        let url = URL(string: "\(baseURL)/push-notifications/test")!
        var request = try await createAuthenticatedRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        print("🔍 Test notification response status: \(httpResponse.statusCode)")
        
        if httpResponse.statusCode == 200 {
            let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            print("🔍 Test notification sent successfully")
            return responseData?["success"] as? Bool ?? false
        } else {
            print("❌ Test notification failed with status: \(httpResponse.statusCode)")
            throw APIError.invalidResponse
        }
    }
    
    // MARK: - Helper Methods
    func createAuthenticatedRequest(url: URL) async throws -> URLRequest {
        var request = URLRequest(url: url)
        
        // Add Firebase ID token to headers (same as web app)
        if let user = Auth.auth().currentUser {
            print("🔍 Firebase user found: \(user.email ?? "unknown")")
            print("🔍 User ID: \(user.uid)")
            print("🔍 User is email verified: \(user.isEmailVerified)")
            print("🔍 User provider data: \(user.providerData.map { $0.providerID })")
            
            do {
                let token = try await user.getIDToken()
#if DEBUG
                print("🔑 Firebase ID token (full): \(token)")
                #if canImport(UIKit)
                UIPasteboard.general.string = token
                print("✅ Copied ID token to clipboard")
                #endif
#else
                print("🔍 Firebase token generated: \(token.prefix(20))...")
#endif
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                print("🔍 Authorization header set")
            } catch {
                print("❌ Failed to get Firebase ID token: \(error)")
                throw APIError.authenticationFailed
            }
        } else {
            print("❌ No Firebase user found - user not authenticated")
            print("❌ Auth.auth().currentUser is nil")
            throw APIError.authenticationFailed
        }
        
        return request
    }
}

// MARK: - Models

struct AuthResponse: Codable {
    let success: Bool
    let token: String?
    let user: APIUser?
}

struct APIUser: Codable {
    let id: String
    let email: String
    let name: String?
}

struct DashboardSummary: Codable {
    let changes: [AIChange]?
    let summary: SummaryMetrics?
    let summaryText: String?
    let lastUpdated: String?
    
    // Computed properties for backward compatibility
    var totalProjects: Int { summary?.totalChanges ?? 0 }
    var activeProjects: Int { summary?.newTodos ?? 0 }
    var pendingTasks: Int { summary?.newTodos ?? 0 }
    var aiResponses: Int { summary?.aiActivities ?? 0 }
    var timeSaved: String { "0 minutes" } // Not provided by API
    var recentActivity: [Activity] { [] } // Not provided by API
}

struct SummaryMetrics: Codable {
    let totalChanges: Int
    let phaseAdvances: Int
    let newDrafts: Int
    let newTodos: Int
    let processedEmails: Int
    let aiActivities: Int
    let highImpactChanges: Int
    let mediumImpactChanges: Int
    let lowImpactChanges: Int
}

struct AIChange: Codable, Identifiable {
    let type: AIChangeType
    let projectId: String?
    let projectName: String?
    let description: String
    let timestamp: String
    let impact: AIChangeImpact
    
    // Generate a unique ID for Identifiable conformance
    var id: String {
        return "\(type.rawValue)_\(timestamp)_\(description.prefix(20))"
    }
}

enum AIChangeType: String, Codable {
    case phase_advance = "phase_advance"
    case new_todo = "new_todo"
    case new_draft = "new_draft"
    case email_processed = "email_processed"
    case ai_activity = "ai_activity"
}

enum AIChangeImpact: String, Codable {
    case high = "high"
    case medium = "medium"
    case low = "low"
}

struct Activity: Codable, Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let timestamp: Date
}

struct Project: Codable, Identifiable {
    let id: String
    let name: String
    let clientEmail: String?
    let clientName: String?
    let emailSignature: String?
    let userId: String?
    let currentPhase: String?
    let createdAt: FirestoreTimestamp
    let updatedAt: FirestoreTimestamp
    let paymentStatus: String?
    let advancePaid: Double?
    let totalAmount: Double?
    let paymentDueDate: String?
    let amountLeft: Double?
    let phaseHistory: [ProjectPhaseHistoryItem]?
    let phases: [String]?
    
    // Computed property for status
    var status: String {
        paymentStatus ?? currentPhase ?? "Unknown"
    }
}

struct ProjectPhaseHistoryItem: Codable {
    let phase: String
    let timestamp: Date
}

struct FirestoreTimestamp: Codable {
    let _seconds: Int
    let _nanoseconds: Int
    var date: Date {
        Date(timeIntervalSince1970: TimeInterval(_seconds) + TimeInterval(_nanoseconds) / 1_000_000_000)
    }
}

struct Todo: Codable, Identifiable {
    let id: String
    let task: String
    let projectId: String
    let projectName: String
    let status: String
    let confidence: Double?
    let createdAt: Date
    let dueDate: Date?
}

struct TodosResponse: Codable {
    let todos: [Todo]
}

struct TodoRequest: Codable {
    let task: String
    let projectId: String
    let projectName: String
}

struct CopilotRequest: Codable {
    let message: String
}

struct CopilotResponse: Codable {
    let reply: String
}

struct ErrorResponse: Codable {
    let error: String
}

struct AIDraft: Codable, Identifiable {
    let id: String
    let projectId: String?
    let projectName: String?
    let clientEmail: String?
    let from: String?
    let subject: String // Use as title
    let body: String // Use as content
    let closing: String?
    let signature: String?
    let status: String
    let createdAt: Date
    let parentId: String?
    let trigger: String?
    let gmailId: String?
    
    // Computed properties for display
    var displayTitle: String { subject }
    var displayContent: String { body }
}

struct AIDraftsResponse: Codable {
    let drafts: [AIDraft]
    let error: String?
}

struct CalendarEvent: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let startDate: Date
    let endDate: Date?
    let location: String?
    let projectId: String?
}



// MARK: - Errors
enum APIError: Error, LocalizedError {
    case invalidResponse
    case authenticationFailed
    case networkError
    case decodingError
    case serverUnavailable
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .authenticationFailed:
            return "Authentication failed"
        case .networkError:
            return "Network error occurred"
        case .decodingError:
            return "Failed to decode response"
        case .serverUnavailable:
            return "Server is not available. Please check your connection."
        }
    }
} 

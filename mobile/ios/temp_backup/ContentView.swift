//
//  ContentView.swift
//  digipod
//
//  Created by Kashish Sharma on 26/07/25.
//

import SwiftUI
import FirebaseAuth
import UserNotifications


struct ContentView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var notificationService = PushNotificationService.shared
    
    var body: some View {
        Group {
            if authViewModel.isLoading {
                LoadingView()
            } else if authViewModel.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
        .onAppear {
            // Request notification permissions when app starts
            notificationService.requestPermission()
        }
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var body: some View {
        VStack {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .purple))
                .scaleEffect(1.5)
            Text("Checking authentication...")
                .foregroundColor(.gray)
                .padding(.top)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

// MARK: - Authentication View
struct AuthView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @State private var isSignUp = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Logo
                VStack {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 60))
                        .foregroundColor(.yellow)
                    Text("Digipod")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("Your AI-powered productivity companion")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 50)
                
                // Auth Form
                VStack(spacing: 20) {
                    if isSignUp {
                        TextField("Name", text: $authViewModel.name)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .foregroundColor(.white)
                    }
                    
                    TextField("Email", text: $authViewModel.email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .foregroundColor(.white)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Password", text: $authViewModel.password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .foregroundColor(.white)
                    
                    if let error = authViewModel.error {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                            .multilineTextAlignment(.center)
                    }
                    
                    Button(action: {
                        if isSignUp {
                            authViewModel.signUp()
                        } else {
                            authViewModel.signIn()
                        }
                    }) {
                        HStack {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .black))
                                    .scaleEffect(0.8)
                            }
                            Text(isSignUp ? "Sign Up" : "Sign In")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
        .padding()
                        .background(Color.purple)
                        .foregroundColor(.black)
                        .cornerRadius(10)
                    }
                    .disabled(authViewModel.isLoading || authViewModel.email.isEmpty || authViewModel.password.isEmpty)
                }
                .padding(.horizontal, 30)
                
                // Toggle Sign In/Sign Up
                Button(action: {
                    isSignUp.toggle()
                    authViewModel.error = nil
                }) {
                    Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                        .foregroundColor(.yellow)
                        .underline()
                }
                
                Spacer()
            }
            .background(Color.black)
            .navigationBarHidden(true)
        }
    }
}

// MARK: - Main Tab View
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house")
                    Text("Home")
                }
            NavigationView { ProjectsTabView() }
                .tabItem { Label("Projects", systemImage: "folder") }
            
            PipTabView()
                .tabItem {
                    Image(systemName: "message")
                    Text("Pip")
                }
            
            NotesTabView()
                .tabItem {
                    Image(systemName: "note.text")
                    Text("Notes")
                }
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear")
                    Text("Settings")
                }
        }
        .accentColor(Color.purple) // Digipod yellow
        .preferredColorScheme(.dark)
    }
}

// MARK: - Auth View Model
class AuthViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""
    @Published var isLoading = true
    @Published var isAuthenticated = false
    @Published var error: String?
    
    private var authStateListener: AuthStateDidChangeListenerHandle?
    
    init() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                self?.isAuthenticated = (user != nil)
                self?.isLoading = false
            }
        }
    }
    
    deinit {
        if let listener = authStateListener {
            Auth.auth().removeStateDidChangeListener(listener)
        }
    }
    
    func signIn() {
        isLoading = true
        error = nil
        print("Attempting to sign in with: \(email)")
        
        Auth.auth().signIn(withEmail: email, password: password) { [weak self] result, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                if let error = error {
                    print("Sign in error: \(error.localizedDescription)")
                    self?.error = error.localizedDescription
                } else {
                    print("Sign in successful!")
                }
            }
        }
    }
    
    func signUp() {
        isLoading = true
        error = nil
        print("Attempting to sign up with: \(email)")
        
        Auth.auth().createUser(withEmail: email, password: password) { [weak self] result, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                if let error = error {
                    print("Sign up error: \(error.localizedDescription)")
                    self?.error = error.localizedDescription
                } else if let user = result?.user {
                    print("Sign up successful! User: \(user.email ?? "unknown")")
                    // Save user data to Firestore (similar to web app)
                    self?.saveUserData(user: user)
                }
            }
        }
    }
    
    private func saveUserData(user: FirebaseAuth.User) {
        // This would save to Firestore like in the web app
        // For now, we'll just handle the auth
        print("User signed up: \(user.email ?? "unknown")")
    }
    
    func signOut() {
        do {
            try Auth.auth().signOut()
            print("User signed out")
            isAuthenticated = false
        } catch {
            print("Error signing out: \(error)")
        }
    }
}

// MARK: - Home ViewModel
class HomeViewModel: ObservableObject {
    @Published var dashboardSummary: DashboardSummary?
    @Published var upcomingTodos: [Todo] = []
    @Published var aiDrafts: [AIDraft] = []
    @Published var calendarEvents: [CalendarEvent] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService()
    private let changeDetectionService = ChangeDetectionService.shared
    
    func loadDashboardData() {
        isLoading = true
        error = nil
        Task {
            do {
                async let drafts = apiService.fetchAIDrafts()
                async let events = apiService.fetchCalendarEvents()
                async let summary = apiService.fetchDashboardSummary()
                let (draftsResult, eventsResult, summaryResult) = await (try? drafts, try? events, try? summary)
                
                await MainActor.run {
                    self.aiDrafts = draftsResult ?? []
                    self.calendarEvents = eventsResult ?? []
                    self.dashboardSummary = summaryResult
                    
                    // Extract todos from the dashboard summary changes
                    if let summary = summaryResult {
                        let todoChanges = summary.changes?.filter { $0.type == .new_todo } ?? []
                        self.upcomingTodos = todoChanges.map { change in
                            Todo(
                                id: change.id,
                                task: change.description.replacingOccurrences(of: "New AI-extracted todo: \"", with: "").replacingOccurrences(of: "\"", with: ""),
                                projectId: change.projectId ?? "general",
                                projectName: change.projectName ?? "General",
                                status: "pending",
                                confidence: change.impact == .high ? 0.9 : change.impact == .medium ? 0.7 : 0.5,
                                createdAt: Date(),
                                dueDate: nil
                            )
                        }
                        
                        // Check for new changes and send notifications
                        self.changeDetectionService.checkForNewChanges(summary.changes)
                    }
                    
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Home View (Modified to use HomeViewModel and display cards)
struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var showingWhatsChangedDetail = false
    @State private var showingUpcomingTodosDetail = false
    @State private var showingCalendarEventsDetail = false
    @State private var showingAIDraftsDetail = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Dashboard")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        Text("Welcome back! Here's what's happening with your projects.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    
                    // Dashboard Cards
                    VStack(spacing: 16) {
                        // Upcoming To-Dos Card
                        DashboardCard(
                            title: "Upcoming To-Dos",
                            icon: "checklist",
                            color: .blue,
                            count: viewModel.upcomingTodos.count
                        ) {
                            if viewModel.upcomingTodos.isEmpty {
                                Text("No upcoming todos")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            } else {
                                UpcomingTodosView(todos: viewModel.upcomingTodos)
                            }
                        }
                        .onTapGesture {
                            showingUpcomingTodosDetail = true
                        }
                        
                        // What's Changed Card
                        DashboardCard(
                            title: "What's Changed",
                            icon: "sparkles",
                            color: .yellow,
                            count: viewModel.dashboardSummary == nil ? 0 : 1
                        ) {
                            if let summary = viewModel.dashboardSummary {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Total Projects: \(summary.totalProjects)")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                    Text("Active Projects: \(summary.activeProjects)")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                    Text("Pending Tasks: \(summary.pendingTasks)")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                    Text("AI Responses: \(summary.aiResponses)")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                    Text("Time Saved: \(summary.timeSaved)")
                                        .font(.caption)
                                        .foregroundColor(.white)
                                    if !summary.recentActivity.isEmpty {
                                        Text("Recent Activity:")
                                            .font(.caption2)
                                            .foregroundColor(.yellow)
                                        ForEach(Array(summary.recentActivity.prefix(3))) { activity in
                                            Text("- \(activity.title)")
                                                .font(.caption2)
                                                .foregroundColor(.gray)
                                        }
                                    }
                                }
                            } else {
                                Text("No recent changes")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        .onTapGesture {
                            showingWhatsChangedDetail = true
                        }
                        
                        // AI Drafts Card
                        DashboardCard(
                            title: "AI Drafts",
                            icon: "brain.head.profile",
                            color: .purple,
                            count: viewModel.aiDrafts.count
                        ) {
                            if viewModel.aiDrafts.isEmpty {
                                Text("No AI drafts")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            } else {
                                AIDraftsView(drafts: viewModel.aiDrafts)
                            }
                        }
                        .onTapGesture {
                            showingAIDraftsDetail = true
                        }
                        
                        // Calendar Events Card
                        DashboardCard(
                            title: "Calendar Events",
                            icon: "calendar",
                            color: .green,
                            count: viewModel.calendarEvents.count
                        ) {
                            if viewModel.calendarEvents.isEmpty {
                                Text("No calendar events")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            } else {
                                CalendarEventsView(events: viewModel.calendarEvents)
                            }
                        }
                        .onTapGesture {
                            showingCalendarEventsDetail = true
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("Home")
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showingWhatsChangedDetail) {
            WhatsChangedDetailView()
        }
        .sheet(isPresented: $showingUpcomingTodosDetail) {
            UpcomingTodosDetailView()
        }
        .sheet(isPresented: $showingCalendarEventsDetail) {
            CalendarEventsDetailView()
        }
        .sheet(isPresented: $showingAIDraftsDetail) {
            AIDraftsDetailView()
        }
    }
}

// MARK: - Dashboard Card
struct DashboardCard<Content: View>: View {
    let title: String
    let icon: String
    let color: Color
    let count: Int
    let content: Content
    
    init(title: String, icon: String, color: Color, count: Int, @ViewBuilder content: () -> Content) {
        self.title = title
        self.icon = icon
        self.color = color
        self.count = count
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title2)
                
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
                
                Spacer()
                
                Text("\(count)")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(color.opacity(0.2))
                    .foregroundColor(color)
                    .cornerRadius(8)
            }
            
            content
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Upcoming Todos View
struct UpcomingTodosView: View {
    let todos: [Todo]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if todos.isEmpty {
                Text("No upcoming todos")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                ForEach(todos.prefix(3), id: \.id) { todo in
                    HStack {
                        Circle()
                            .fill(todo.confidence != nil && todo.confidence! < 1 ? Color.blue : Color.yellow)
                            .frame(width: 8, height: 8)
                        
                        Text(todo.task)
                            .font(.caption)
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text(todo.projectName)
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
                
                if todos.count > 3 {
                    Text("+\(todos.count - 3) more")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

// MARK: - What's Changed View
struct WhatsChangedView: View {
    let drafts: [AIDraft]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if drafts.isEmpty {
                Text("No recent changes")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                ForEach(Array(drafts.prefix(3)), id: \.id) { draft in
                    HStack {
                        Image(systemName: "sparkles")
                            .foregroundColor(.yellow)
                            .font(.caption)
                        
                        Text(draft.displayTitle)
                            .font(.caption)
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text(draft.status)
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
                
                if drafts.count > 3 {
                    Text("+\(drafts.count - 3) more")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

// MARK: - AI Drafts View
struct AIDraftsView: View {
    let drafts: [AIDraft]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if drafts.isEmpty {
                Text("No AI drafts")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                ForEach(Array(drafts.prefix(3)), id: \.id) { draft in
                    HStack {
                        Image(systemName: "brain.head.profile")
                            .foregroundColor(.purple)
                            .font(.caption)
                        
                        Text(draft.displayTitle)
                            .font(.caption)
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text(draft.status)
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }
                
                if drafts.count > 3 {
                    Text("+\(drafts.count - 3) more")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

// MARK: - Calendar Events View
struct CalendarEventsView: View {
    let events: [CalendarEvent]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if events.isEmpty {
                Text("No calendar events")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                ForEach(Array(events.prefix(3)), id: \.id) { event in
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(.green)
                            .font(.caption)
                        
                        Text(event.title)
                            .font(.caption)
                            .foregroundColor(.white)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        // Add more event info if needed
                    }
                }
                
                if events.count > 3 {
                    Text("+\(events.count - 3) more")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

// MARK: - Projects View
struct ProjectsView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    
    var body: some View {
        NavigationView {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .yellow))
                        .scaleEffect(1.5)
                } else if let error = viewModel.error {
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.orange)
                            .font(.largeTitle)
                        Text("Connection Error")
                            .font(.headline)
                            .foregroundColor(.white)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                        Button("Retry") {
                            viewModel.loadProjects()
                        }
                        .foregroundColor(.yellow)
                        .padding()
                    }
                } else if !viewModel.projects.isEmpty {
                    List {
                        ForEach(viewModel.projects) { project in
                            ProjectRow(project: project)
                        }
                    }
                } else {
                    VStack {
                        Image(systemName: "folder")
                            .foregroundColor(.gray)
                            .font(.largeTitle)
                        Text("No Projects")
                            .font(.headline)
                            .foregroundColor(.white)
                        Text("Your projects will appear here")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            .navigationTitle("Projects")
            .background(Color.black)
            .onAppear {
                viewModel.loadProjects()
            }
            .refreshable {
                viewModel.loadProjects()
            }
        }
    }
}

// MARK: - Pip Tab View
struct PipTabView: View {
    @StateObject private var viewModel = PipViewModel()
    @State private var messageInput = ""
    @State private var showingPrompts = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        PipAvatarView()
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Hi, I'm Pip!")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Text("Your AI assistant")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                }
                .padding(.horizontal)
                .padding(.top)
                
                // Chat Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.messages) { message in
                                ChatMessageView(message: message)
                                    .id(message.id)
                            }
                            
                            if viewModel.isLoading {
                                HStack {
                                    TypingIndicator()
                                    Spacer()
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 16)
                    }
                    .onChange(of: viewModel.messages.count) { oldCount, newCount in
                        if let lastMessage = viewModel.messages.last {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }
                
                // Input Area
                VStack(spacing: 12) {
                    // Quick Prompts
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(quickPrompts, id: \.label) { prompt in
                                Button(action: {
                                    messageInput = prompt.message
                                }) {
                                    Text(prompt.label)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.blue)
                                        .cornerRadius(16)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Message Input
                    HStack(spacing: 12) {
                        TextField("Type a task or question...", text: $messageInput)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .disabled(viewModel.isLoading)
                        
                        Button(action: {
                            viewModel.sendMessage(messageInput)
                            messageInput = ""
                        }) {
                            Image(systemName: "paperplane.fill")
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color.blue)
                                .cornerRadius(8)
                        }
                        .disabled(messageInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isLoading)
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom)
                .background(Color(.systemGray6))
            }
            .navigationBarHidden(true)
        }
    }
    
    private let quickPrompts = [
        QuickPrompt(label: "Add To-Do", message: "Add 'Follow up with client' to my to-do list"),
        QuickPrompt(label: "List To-Dos", message: "Show my to-do list"),
        QuickPrompt(label: "Create Project", message: "Create project called 'Website Redesign'"),
        QuickPrompt(label: "List Projects", message: "List all projects"),
        QuickPrompt(label: "Project Status", message: "Show project status for 'Website Redesign'"),
        QuickPrompt(label: "Advance Phase", message: "Advance phase for project 'Website Redesign'"),
        QuickPrompt(label: "List AI Drafts", message: "Show my AI drafts"),
        QuickPrompt(label: "Approve Draft", message: "Approve the latest AI draft"),
        QuickPrompt(label: "List Clients", message: "List all clients"),
        QuickPrompt(label: "Add Filter", message: "Add john@client.com to my client filters"),
        QuickPrompt(label: "Show Payments", message: "Show all pending payments"),
        QuickPrompt(label: "Get Metrics", message: "Get my metrics"),
        QuickPrompt(label: "Help", message: "What can you do?")
    ]
}

struct QuickPrompt {
    let label: String
    let message: String
}

// MARK: - Pip Avatar View
struct PipAvatarView: View {
    @State private var minutesSaved = 0
    @State private var focusMode = false
    
    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(Color.purple)
                    .frame(width: 48, height: 48)
                    .shadow(color: .purple.opacity(0.3), radius: 4)
                
                Text(pipEmoji)
                    .font(.title2)
            }
            
            Text(pipMessage)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 80)
        }
        .onAppear {
            loadPipState()
        }
    }
    
    private var pipEmoji: String {
        if focusMode { return "🧢" }
        if minutesSaved > 600 { return "🤖" }
        if minutesSaved >= 180 { return "😎" }
        return "😴"
    }
    
    private var pipMessage: String {
        if focusMode { return "Focus Mode" }
        if minutesSaved > 600 { return "You're basically retired" }
        if minutesSaved >= 180 { return "That's a lot of admin dodged!" }
        return "Let's delete more work"
    }
    
    private func loadPipState() {
        // Load from UserDefaults (simplified version)
        minutesSaved = UserDefaults.standard.integer(forKey: "digipod-minutes-saved")
        focusMode = UserDefaults.standard.string(forKey: "digipod-focus-mode") == "on"
    }
}

// MARK: - Chat Message View
struct ChatMessageView: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isUser {
                Spacer()
                Text(message.text)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(16)
                    .frame(maxWidth: UIScreen.main.bounds.width * 0.7, alignment: .trailing)
            } else {
                Text(message.text)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(.systemGray5))
                    .foregroundColor(.primary)
                    .cornerRadius(16)
                    .frame(maxWidth: UIScreen.main.bounds.width * 0.7, alignment: .leading)
                Spacer()
            }
        }
    }
}

// MARK: - Typing Indicator
struct TypingIndicator: View {
    @State private var animationOffset = 0.0
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color.gray)
                    .frame(width: 6, height: 6)
                    .scaleEffect(1.0 + 0.3 * sin(animationOffset + Double(index) * 0.5))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemGray5))
        .cornerRadius(16)
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                animationOffset = 2.0
            }
        }
    }
}

// MARK: - Pip ViewModel
class PipViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    
    private let apiService = APIService()
    
    init() {
        // Add welcome message
        messages.append(ChatMessage(text: "Hi! I'm Pip, your Digipod Co-Pilot. How can I help you today?", isUser: false))
    }
    
    func sendMessage(_ text: String) {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else { return }
        
        // Add user message
        let userMessage = ChatMessage(text: trimmedText, isUser: true)
        messages.append(userMessage)
        
        isLoading = true
        
        Task {
            do {
                let response = try await apiService.sendCopilotMessage(message: trimmedText)
                await MainActor.run {
                    let aiMessage = ChatMessage(text: response.reply, isUser: false)
                    self.messages.append(aiMessage)
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    let errorText: String
                    if let apiError = error as? APIError {
                        switch apiError {
                        case .authenticationFailed:
                            errorText = "Authentication failed. Please sign in again."
                        case .serverUnavailable:
                            errorText = "Server is unavailable. Please check your connection."
                        case .networkError:
                            errorText = "Network error. Please check your internet connection."
                        case .invalidResponse:
                            errorText = "Server returned an invalid response."
                        case .decodingError:
                            errorText = "Failed to process server response."
                        }
                    } else {
                        errorText = "Error: \(error.localizedDescription)"
                    }
                    
                    let errorMessage = ChatMessage(text: errorText, isUser: false)
                    self.messages.append(errorMessage)
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Notes Tab View
struct NotesTabView: View {
    @StateObject private var viewModel = NotesViewModel()
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Notes")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text("What are you thinking today?")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.top)
                
                // Notes Editor Container
                VStack(spacing: 0) {
                    // Toolbar
                    HStack(spacing: 16) {
                        Button(action: { viewModel.toggleBold() }) {
                            Image(systemName: "bold")
                                .foregroundColor(viewModel.isBold ? .blue : .primary)
                                .font(.system(size: 16, weight: .medium))
                        }
                        
                        Button(action: { viewModel.toggleItalic() }) {
                            Image(systemName: "italic")
                                .foregroundColor(viewModel.isItalic ? .blue : .primary)
                                .font(.system(size: 16, weight: .medium))
                        }
                        
                        Button(action: { viewModel.toggleUnderline() }) {
                            Image(systemName: "underline")
                                .foregroundColor(viewModel.isUnderline ? .blue : .primary)
                                .font(.system(size: 16, weight: .medium))
                        }
                        
                        Divider()
                            .frame(height: 20)
                        
                        Button(action: { viewModel.addBulletPoint() }) {
                            Image(systemName: "list.bullet")
                                .foregroundColor(.primary)
                                .font(.system(size: 16, weight: .medium))
                        }
                        
                        Button(action: { viewModel.addNumberedList() }) {
                            Image(systemName: "list.number")
                                .foregroundColor(.primary)
                                .font(.system(size: 16, weight: .medium))
                        }
                        
                        Spacer()
                        
                        Button(action: { viewModel.saveNotes() }) {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 12, weight: .bold))
                                Text("Save")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue)
                            .cornerRadius(6)
                        }
                        .disabled(viewModel.isSaving)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(.systemGray6))
                    
                    // Text Editor
                    TextEditor(text: $viewModel.notes)
                        .font(.body)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color(.systemBackground))
                        .frame(minHeight: 300)
                }
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)
                .padding(.top, 16)
                
                Spacer()
                
                // Save Status
                if viewModel.showSavedMessage {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Notes saved!")
                            .foregroundColor(.green)
                            .font(.subheadline)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
            }
            .navigationBarHidden(true)
            .onAppear {
                viewModel.loadNotes()
            }
        }
    }
}

// MARK: - Notes ViewModel
class NotesViewModel: ObservableObject {
    @Published var notes: String = ""
    @Published var isBold: Bool = false
    @Published var isItalic: Bool = false
    @Published var isUnderline: Bool = false
    @Published var isSaving: Bool = false
    @Published var showSavedMessage: Bool = false
    
    private let userDefaults = UserDefaults.standard
    private let notesKey = "digipod-user-notes-rich"
    
    func loadNotes() {
        if let savedNotes = userDefaults.string(forKey: notesKey) {
            notes = savedNotes
        }
    }
    
    func saveNotes() {
        isSaving = true
        
        // Save to UserDefaults
        userDefaults.set(notes, forKey: notesKey)
        
        // Show saved message
        showSavedMessage = true
        
        // Hide message after 1.5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.showSavedMessage = false
        }
        
        isSaving = false
    }
    
    func toggleBold() {
        isBold.toggle()
        applyFormatting()
    }
    
    func toggleItalic() {
        isItalic.toggle()
        applyFormatting()
    }
    
    func toggleUnderline() {
        isUnderline.toggle()
        applyFormatting()
    }
    
    func addBulletPoint() {
        let bulletPoint = "• "
        notes += bulletPoint
    }
    
    func addNumberedList() {
        let numberedPoint = "1. "
        notes += numberedPoint
    }
    
    private func applyFormatting() {
        // This is a simplified version - in a real app you'd want to use NSAttributedString
        // for rich text formatting, but for now we'll just track the state
        // The actual formatting would be applied when displaying the text
    }
}

// MARK: - Settings View
struct SettingsView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var apiService = APIService()
    @State private var notificationsEnabled = true
    @State private var darkModeEnabled = true
    @State private var isTestingNotification = false
    @State private var displayName = ""
    @State private var user: FirebaseAuth.User?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Header with Logout button
                    HStack {
                        Text("Profile Details")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Button(action: {
                            authViewModel.signOut()
                        }) {
                            Text("Logout")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color(.systemGray5))
                                .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top)
                    
                    // Profile Card
                    VStack(spacing: 24) {
                        // Avatar Section
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Avatar")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            HStack(spacing: 16) {
                                // Avatar Circle
                                ZStack {
                                    Circle()
                                        .fill(Color.green)
                                        .frame(width: 64, height: 64)
                                    
                                    Text(avatarInitial)
                                        .font(.title)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        // Profile Details Section
                        VStack(spacing: 20) {
                            // Display Name
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Display Name")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.secondary)
                                
                                TextField("Enter display name", text: $displayName)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                            }
                            
                            // Email
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.secondary)
                                
                                Text(user?.email ?? "")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                            }
                        }
                    }
                    .padding(24)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .padding(.top, 16)
                    
                    // Notifications Section
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notifications")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            VStack(spacing: 12) {
                                Toggle(isOn: $notificationsEnabled) {
                                    HStack {
                                        Image(systemName: "bell.fill")
                                            .foregroundColor(.blue)
                                        Text("Push Notifications")
                                            .font(.body)
                                    }
                                }
                                
                                                                       Button(action: {
                                           testPushNotification()
                                       }) {
                                           HStack {
                                               Image(systemName: "bell.badge")
                                                   .foregroundColor(.green)
                                               Text("Test Push Notification")
                                                   .font(.body)
                                               Spacer()
                                               if isTestingNotification {
                                                   ProgressView()
                                                       .scaleEffect(0.8)
                                               }
                                           }
                                       }
                                       .disabled(isTestingNotification)
                                       
                                       Button(action: {
                                           testBackendConnection()
                                       }) {
                                           HStack {
                                               Image(systemName: "network")
                                                   .foregroundColor(.blue)
                                               Text("Test Backend Connection")
                                                   .font(.body)
                                               Spacer()
                                           }
                                       }
                                       
                                       Button(action: {
                                           testAuthenticationStatus()
                                       }) {
                                           HStack {
                                               Image(systemName: "person.circle")
                                                   .foregroundColor(.orange)
                                               Text("Test Authentication Status")
                                                   .font(.body)
                                               Spacer()
                                           }
                                       }
                                       
                                       Button(action: {
                                           testCopilotConnection()
                                       }) {
                                           HStack {
                                               Image(systemName: "message.circle")
                                                   .foregroundColor(.purple)
                                               Text("Test Copilot Connection")
                                                   .font(.body)
                                               Spacer()
                                           }
                                       }
                            }
                        }
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.top, 16)
                    
                    // Preferences Section
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Preferences")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            Toggle(isOn: $darkModeEnabled) {
                                HStack {
                                    Image(systemName: "moon.fill")
                                        .foregroundColor(.purple)
                                    Text("Dark Mode")
                                        .font(.body)
                                }
                            }
                        }
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.top, 16)
                    
                    // Support Section
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Support")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            VStack(spacing: 12) {
                                HStack {
                                    Image(systemName: "questionmark.circle.fill")
                                        .foregroundColor(.yellow)
                                    Text("Help & Support")
                                        .font(.body)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.gray)
                                }
                                
                                HStack {
                                    Image(systemName: "info.circle.fill")
                                        .foregroundColor(.yellow)
                                    Text("About")
                                        .font(.body)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.gray)
                                }
                            }
                        }
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationBarHidden(true)
            .onAppear {
                loadUserData()
            }
        }
    }
    
    private var avatarInitial: String {
        if let user = user {
            let emailInitial = user.email?.first?.uppercased() ?? ""
            let displayInitial = displayName.first?.uppercased() ?? ""
            return emailInitial.isEmpty ? (displayInitial.isEmpty ? "U" : displayInitial) : emailInitial
        }
        return "U"
    }
    
    private func loadUserData() {
        if let currentUser = Auth.auth().currentUser {
            user = currentUser
            displayName = currentUser.displayName ?? ""
        }
    }
    
               private func testPushNotification() {
               isTestingNotification = true
               
               Task {
                   do {
                       let success = try await apiService.sendTestNotification()
                       await MainActor.run {
                           isTestingNotification = false
                           if success {
                               print("✅ Test notification sent successfully")
                           } else {
                               print("❌ Test notification failed")
                           }
                       }
                   } catch {
                       await MainActor.run {
                           isTestingNotification = false
                           print("❌ Error sending test notification: \(error)")
                       }
                   }
               }
           }
           
           private func testBackendConnection() {
               Task {
                   do {
                       let success = try await apiService.testBackendConnection()
                       await MainActor.run {
                           if success {
                               print("✅ Backend connection test successful")
                           } else {
                               print("❌ Backend connection test failed")
                           }
                       }
                   } catch {
                       await MainActor.run {
                           print("❌ Error testing backend connection: \(error)")
                       }
                   }
               }
           }
           
           private func testAuthenticationStatus() {
               if let currentUser = Auth.auth().currentUser {
                   print("✅ User is authenticated:")
                   print("   - Email: \(currentUser.email ?? "unknown")")
                   print("   - UID: \(currentUser.uid)")
                   print("   - Email verified: \(currentUser.isEmailVerified)")
                   print("   - Provider data: \(currentUser.providerData.map { $0.providerID })")
               } else {
                   print("❌ No user is currently authenticated")
               }
           }
           
           private func testCopilotConnection() {
               Task {
                   do {
                       let success = try await apiService.testCopilotConnection()
                       await MainActor.run {
                           if success {
                               print("✅ Copilot connection test successful")
                           } else {
                               print("❌ Copilot connection test failed")
                           }
                       }
                   } catch {
                       await MainActor.run {
                           print("❌ Error testing Copilot connection: \(error)")
                       }
                   }
               }
           }
}

// MARK: - Supporting Views

// MARK: - What's Changed Detail View
struct WhatsChangedDetailView: View {
    @StateObject private var viewModel = WhatsChangedDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Debug section
                    VStack(spacing: 8) {
                        Text("Debug Info")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Button("Test Authentication") {
                            Task {
                                if let user = Auth.auth().currentUser {
                                    print("🔍 Current user: \(user.email ?? "unknown")")
                                    do {
                                        let token = try await user.getIDToken()
                                        print("🔍 Token: \(token.prefix(50))...")
                                    } catch {
                                        print("❌ Token error: \(error)")
                                    }
                                } else {
                                    print("❌ No current user")
                                }
                            }
                        }
                        .buttonStyle(.bordered)
                        
                        Button("Test API Call") {
                            viewModel.loadChanges()
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    
                    if viewModel.isLoading {
                        ProgressView("Loading changes...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let summary = viewModel.dashboardSummary {
                        // Summary Statistics
                        VStack(spacing: 12) {
                            Text("AI Activity Summary")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            if let summaryMetrics = summary.summary {
                                LazyVGrid(columns: [
                                    GridItem(.flexible()),
                                    GridItem(.flexible())
                                ], spacing: 12) {
                                    StatCard(title: "Phase Advances", value: "\(summaryMetrics.phaseAdvances)", color: .green)
                                    StatCard(title: "New Drafts", value: "\(summaryMetrics.newDrafts)", color: .blue)
                                    StatCard(title: "New Todos", value: "\(summaryMetrics.newTodos)", color: .orange)
                                    StatCard(title: "Processed Emails", value: "\(summaryMetrics.processedEmails)", color: .purple)
                                    StatCard(title: "AI Activities", value: "\(summaryMetrics.aiActivities)", color: .cyan)
                                    StatCard(title: "High Impact", value: "\(summaryMetrics.highImpactChanges)", color: .red)
                                }
                            } else {
                                // Fallback to basic stats
                                LazyVGrid(columns: [
                                    GridItem(.flexible()),
                                    GridItem(.flexible())
                                ], spacing: 12) {
                                    StatCard(title: "Total Projects", value: "\(summary.totalProjects)", color: .blue)
                                    StatCard(title: "Active Projects", value: "\(summary.activeProjects)", color: .green)
                                    StatCard(title: "Pending Tasks", value: "\(summary.pendingTasks)", color: .orange)
                                    StatCard(title: "AI Responses", value: "\(summary.aiResponses)", color: .purple)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        
                        // Summary Text
                        if let summaryText = summary.summaryText {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Summary")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                
                                Text(summaryText)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                        }
                        
                        // Recent Changes List
                        if !viewModel.changes.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Recent Changes")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                
                                ForEach(viewModel.changes) { change in
                                    ChangeItemView(change: change)
                                }
                            }
                        } else {
                            VStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 40))
                                    .foregroundColor(.gray)
                                Text("No recent changes")
                                    .font(.headline)
                                    .foregroundColor(.gray)
                                Text("AI hasn't made any changes in the last 24 hours")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding()
                        }
                        
                        if let lastUpdated = summary.lastUpdated {
                            Text("Last updated: \(formatDate(lastUpdated))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 40))
                                .foregroundColor(.orange)
                            Text("Failed to load changes")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("Please try again later")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            if let error = viewModel.error {
                                Text("Error: \(error)")
                                    .font(.caption)
                                    .foregroundColor(.red)
                                    .padding()
                            }
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("What's Changed")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadChanges()
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let date = formatter.date(from: dateString) {
            formatter.dateStyle = .medium
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return dateString
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .shadow(radius: 2)
    }
}

// MARK: - Change Item View
struct ChangeItemView: View {
    let change: AIChange
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconForType(change.type))
                    .foregroundColor(colorForType(change.type))
                    .font(.system(size: 16, weight: .medium))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(change.description)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    if let projectName = change.projectName {
                        Text(projectName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                Text(formatTimestamp(change.timestamp))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Text(change.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(colorForType(change.type).opacity(0.2))
                    .foregroundColor(colorForType(change.type))
                    .cornerRadius(4)
                
                Spacer()
                
                Text(change.impact.rawValue.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(impactColor(change.impact).opacity(0.2))
                    .foregroundColor(impactColor(change.impact))
                    .cornerRadius(4)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    private func iconForType(_ type: AIChangeType) -> String {
        switch type {
        case .phase_advance: return "arrow.up.circle"
        case .new_todo: return "checklist"
        case .new_draft: return "doc.text"
        case .email_processed: return "envelope"
        case .ai_activity: return "brain.head.profile"
        }
    }
    
    private func colorForType(_ type: AIChangeType) -> Color {
        switch type {
        case .phase_advance: return .green
        case .new_todo: return .orange
        case .new_draft: return .blue
        case .email_processed: return .purple
        case .ai_activity: return .cyan
        }
    }
    
    private func impactColor(_ impact: AIChangeImpact) -> Color {
        switch impact {
        case .high: return .red
        case .medium: return .orange
        case .low: return .green
        }
    }
    
    private func formatTimestamp(_ timestamp: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        if let date = formatter.date(from: timestamp) {
            formatter.dateStyle = .none
            formatter.timeStyle = .short
            return formatter.string(from: date)
        }
        return timestamp
    }
}

// MARK: - What's Changed Detail ViewModel
class WhatsChangedDetailViewModel: ObservableObject {
    @Published var dashboardSummary: DashboardSummary?
    @Published var changes: [AIChange] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService()
    
    func loadChanges() {
        print("🔄 Loading changes...")
        isLoading = true
        error = nil
        
        Task {
            do {
                print("🔄 Calling fetchDashboardSummary...")
                let summary = try await apiService.fetchDashboardSummary()
                print("✅ Successfully fetched dashboard summary")
                await MainActor.run {
                    self.dashboardSummary = summary
                    self.changes = summary.changes ?? []
                    self.isLoading = false
                    print("✅ Updated UI with dashboard data")
                }
            } catch {
                print("❌ Error in loadChanges: \(error)")
                print("❌ Error type: \(type(of: error))")
                if let apiError = error as? APIError {
                    print("❌ API Error: \(apiError)")
                }
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                    print("❌ Set error in UI: \(error.localizedDescription)")
                }
            }
        }
    }
}

// MARK: - Supporting Views

struct ActivityRow: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24, height: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.white)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Project Row
struct ProjectRow: View {
    let project: Project
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(project.name)
                .font(.headline)
                .foregroundColor(.primary)
            HStack(spacing: 12) {
                Text(project.status.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(statusColor(project.status).opacity(0.2))
                    .foregroundColor(statusColor(project.status))
                    .cornerRadius(6)
                Text("Created: \(formatDate(project.createdAt.date))")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "active": return .green
        case "pending": return .orange
        case "completed": return .blue
        case "archived": return .gray
        default: return .gray
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}





// MARK: - Models

struct ChatMessage: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
}

// MARK: - Projects ViewModel
class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService()
    
    func loadProjects() {
        isLoading = true
        error = nil
        Task {
            do {
                let projects = try await apiService.fetchProjects()
                print("✅ [ProjectsViewModel] Loaded projects count: \(projects.count)")
                await MainActor.run {
                    self.projects = projects
                    self.isLoading = false
                }
            } catch {
                print("❌ [ProjectsViewModel] Error loading projects: \(error)")
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func addProject(name: String, clientEmail: String) {
        isLoading = true
        error = nil
        Task {
            do {
                let newProject = try await apiService.createProject(name: name, clientEmail: clientEmail)
                await MainActor.run {
                    self.projects.append(newProject)
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Upcoming Todos Detail View
struct UpcomingTodosDetailView: View {
    @StateObject private var viewModel = UpcomingTodosDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView("Loading todos...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if !viewModel.todos.isEmpty {
                        // Summary Statistics
                        VStack(spacing: 12) {
                            Text("Todo Summary")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: 12) {
                                StatCard(title: "Total Todos", value: "\(viewModel.todos.count)", color: .blue)
                                StatCard(title: "High Priority", value: "\(viewModel.highPriorityCount)", color: .red)
                                StatCard(title: "Medium Priority", value: "\(viewModel.mediumPriorityCount)", color: .orange)
                                StatCard(title: "Low Priority", value: "\(viewModel.lowPriorityCount)", color: .green)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        
                        // Todos List
                        VStack(alignment: .leading, spacing: 12) {
                            Text("All Todos")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            ForEach(viewModel.todos) { todo in
                                TodoItemView(todo: todo)
                            }
                        }
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "checklist")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("No upcoming todos")
                                .font(.headline)
                                .foregroundColor(.gray)
                            Text("You're all caught up!")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Upcoming To-Dos")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadTodos()
        }
    }
}

// MARK: - Todo Item View
struct TodoItemView: View {
    let todo: Todo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconForConfidence(todo.confidence))
                    .foregroundColor(colorForConfidence(todo.confidence))
                    .font(.system(size: 16, weight: .medium))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(todo.task)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text(todo.projectName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if let dueDate = todo.dueDate {
                    Text(formatDate(dueDate))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            HStack {
                Text(todo.status.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(statusColor(todo.status).opacity(0.2))
                    .foregroundColor(statusColor(todo.status))
                    .cornerRadius(4)
                
                Spacer()
                
                if let confidence = todo.confidence {
                    Text("\(Int(confidence * 100))%")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(confidenceColor(confidence).opacity(0.2))
                        .foregroundColor(confidenceColor(confidence))
                        .cornerRadius(4)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    private func iconForConfidence(_ confidence: Double?) -> String {
        guard let confidence = confidence else { return "circle" }
        if confidence > 0.8 { return "exclamationmark.circle.fill" }
        if confidence > 0.6 { return "clock.circle" }
        return "checkmark.circle"
    }
    
    private func colorForConfidence(_ confidence: Double?) -> Color {
        guard let confidence = confidence else { return .gray }
        if confidence > 0.8 { return .red }
        if confidence > 0.6 { return .orange }
        return .green
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "completed": return .green
        case "in_progress": return .orange
        case "pending": return .blue
        default: return .gray
        }
    }
    
    private func confidenceColor(_ confidence: Double) -> Color {
        if confidence > 0.8 { return .red }
        if confidence > 0.6 { return .orange }
        return .green
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Upcoming Todos Detail ViewModel
class UpcomingTodosDetailViewModel: ObservableObject {
    @Published var todos: [Todo] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService()
    
    var highPriorityCount: Int {
        todos.filter { $0.confidence ?? 0 > 0.8 }.count
    }
    
    var mediumPriorityCount: Int {
        todos.filter { ($0.confidence ?? 0) > 0.6 && ($0.confidence ?? 0) <= 0.8 }.count
    }
    
    var lowPriorityCount: Int {
        todos.filter { ($0.confidence ?? 0) <= 0.6 }.count
    }
    
    func loadTodos() {
        print("🔄 Loading todos...")
        isLoading = true
        error = nil
        
        Task {
            do {
                print("🔄 Calling fetchDashboardSummary...")
                let summary = try await apiService.fetchDashboardSummary()
                print("✅ Successfully fetched dashboard summary")
                
                // Extract todos from the changes array
                let todoChanges = summary.changes?.filter { $0.type == .new_todo } ?? []
                let extractedTodos = todoChanges.map { change in
                    Todo(
                        id: change.id,
                        task: change.description.replacingOccurrences(of: "New AI-extracted todo: \"", with: "").replacingOccurrences(of: "\"", with: ""),
                        projectId: change.projectId ?? "general",
                        projectName: change.projectName ?? "General",
                        status: "pending",
                        confidence: change.impact == .high ? 0.9 : change.impact == .medium ? 0.7 : 0.5,
                        createdAt: Date(),
                        dueDate: nil
                    )
                }
                
                await MainActor.run {
                    self.todos = extractedTodos
                    self.isLoading = false
                    print("✅ Updated UI with todos data: \(extractedTodos.count) todos")
                }
            } catch {
                print("❌ Error in loadTodos: \(error)")
                print("❌ Error type: \(type(of: error))")
                if let apiError = error as? APIError {
                    print("❌ API Error: \(apiError)")
                }
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                    print("❌ Set error in UI: \(error.localizedDescription)")
                }
            }
        }
    }
}

// MARK: - Calendar Events Detail View
struct CalendarEventsDetailView: View {
    @StateObject private var viewModel = CalendarEventsDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var selectedDate = Date()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView("Loading calendar events...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if !viewModel.events.isEmpty {
                        // Calendar View
                        VStack(spacing: 12) {
                            Text("Calendar View")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            CalendarView(events: viewModel.events, selectedDate: $selectedDate)
                                .frame(height: 300)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        
                        // Summary Statistics
                        VStack(spacing: 12) {
                            Text("Calendar Summary")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: 12) {
                                StatCard(title: "Total Events", value: "\(viewModel.events.count)", color: .green)
                                StatCard(title: "Today", value: "\(viewModel.todayEventsCount)", color: .blue)
                                StatCard(title: "This Week", value: "\(viewModel.thisWeekEventsCount)", color: .orange)
                                StatCard(title: "This Month", value: "\(viewModel.thisMonthEventsCount)", color: .purple)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        
                        // Events for Selected Date
                        if let selectedDateEvents = viewModel.eventsForDate(selectedDate) {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Events for \(formatSelectedDate(selectedDate))")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                
                                ForEach(selectedDateEvents) { event in
                                    CalendarEventItemView(event: event)
                                }
                            }
                        }
                        
                        // All Events List
                        VStack(alignment: .leading, spacing: 12) {
                            Text("All Events")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            ForEach(viewModel.events) { event in
                                CalendarEventItemView(event: event)
                            }
                        }
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "calendar")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("No calendar events")
                                .font(.headline)
                                .foregroundColor(.gray)
                            Text("Your calendar is clear!")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Calendar Events")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadEvents()
        }
    }
    
    private func formatSelectedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

// MARK: - Custom Calendar View
struct CalendarView: View {
    let events: [CalendarEvent]
    @Binding var selectedDate: Date
    
    private let calendar = Calendar.current
    private let daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    var body: some View {
        VStack(spacing: 8) {
            // Month and Year Header
            HStack {
                Button(action: previousMonth) {
                    Image(systemName: "chevron.left")
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                Text(monthYearString)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button(action: nextMonth) {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)
            
            // Days of Week Header
            HStack(spacing: 0) {
                ForEach(daysInWeek, id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .foregroundColor(.secondary)
                }
            }
            
            // Calendar Grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 4) {
                ForEach(calendarDays, id: \.self) { date in
                    if let date = date {
                        DayCell(
                            date: date,
                            isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
                            hasEvents: hasEvents(for: date),
                            isToday: calendar.isDateInToday(date)
                        )
                        .onTapGesture {
                            selectedDate = date
                        }
                    } else {
                        Color.clear
                            .frame(height: 40)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
    
    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: selectedDate)
    }
    
    private var calendarDays: [Date?] {
        let startOfMonth = calendar.dateInterval(of: .month, for: selectedDate)?.start ?? selectedDate
        let firstWeekday = calendar.component(.weekday, from: startOfMonth)
        let daysInMonth = calendar.range(of: .day, in: .month, for: selectedDate)?.count ?? 0
        
        var days: [Date?] = []
        
        // Add empty cells for days before the first day of the month
        for _ in 1..<firstWeekday {
            days.append(nil)
        }
        
        // Add all days in the month
        for day in 1...daysInMonth {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: startOfMonth) {
                days.append(date)
            }
        }
        
        return days
    }
    
    private func hasEvents(for date: Date) -> Bool {
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        return events.contains { event in
            event.startDate >= startOfDay && event.startDate < endOfDay
        }
    }
    
    private func previousMonth() {
        if let newDate = calendar.date(byAdding: .month, value: -1, to: selectedDate) {
            selectedDate = newDate
        }
    }
    
    private func nextMonth() {
        if let newDate = calendar.date(byAdding: .month, value: 1, to: selectedDate) {
            selectedDate = newDate
        }
    }
}

// MARK: - Day Cell
struct DayCell: View {
    let date: Date
    let isSelected: Bool
    let hasEvents: Bool
    let isToday: Bool
    
    private let calendar = Calendar.current
    
    var body: some View {
        VStack(spacing: 2) {
            Text("\(calendar.component(.day, from: date))")
                .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                .foregroundColor(textColor)
                .frame(width: 32, height: 32)
                .background(backgroundColor)
                .clipShape(Circle())
            
            if hasEvents {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 4, height: 4)
            } else {
                Color.clear
                    .frame(width: 4, height: 4)
            }
        }
        .frame(height: 40)
    }
    
    private var textColor: Color {
        if isSelected {
            return .white
        } else if isToday {
            return .blue
        } else {
            return .primary
        }
    }
    
    private var backgroundColor: Color {
        if isSelected {
            return .blue
        } else if isToday {
            return .blue.opacity(0.2)
        } else {
            return .clear
        }
    }
}

// MARK: - Calendar Event Item View
struct CalendarEventItemView: View {
    let event: CalendarEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconForEventType(event.title))
                    .foregroundColor(colorForEventType(event.title))
                    .font(.system(size: 16, weight: .medium))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    if let description = event.description, !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatDate(event.startDate))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    if let endDate = event.endDate {
                        Text("to \(formatTime(endDate))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            HStack {
                if let location = event.location, !location.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "location")
                            .font(.caption)
                            .foregroundColor(.blue)
                        Text(location)
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                Spacer()
                
                if let projectId = event.projectId, !projectId.isEmpty {
                    Text("Project")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.2))
                        .foregroundColor(.orange)
                        .cornerRadius(4)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    private func iconForEventType(_ title: String) -> String {
        let lowercased = title.lowercased()
        if lowercased.contains("meeting") || lowercased.contains("call") {
            return "phone.circle"
        } else if lowercased.contains("deadline") || lowercased.contains("due") {
            return "exclamationmark.circle"
        } else if lowercased.contains("review") || lowercased.contains("check") {
            return "checkmark.circle"
        } else if lowercased.contains("presentation") || lowercased.contains("demo") {
            return "display"
        } else {
            return "calendar.circle"
        }
    }
    
    private func colorForEventType(_ title: String) -> Color {
        let lowercased = title.lowercased()
        if lowercased.contains("meeting") || lowercased.contains("call") {
            return .blue
        } else if lowercased.contains("deadline") || lowercased.contains("due") {
            return .red
        } else if lowercased.contains("review") || lowercased.contains("check") {
            return .green
        } else if lowercased.contains("presentation") || lowercased.contains("demo") {
            return .purple
        } else {
            return .orange
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Calendar Events Detail ViewModel
class CalendarEventsDetailViewModel: ObservableObject {
    @Published var events: [CalendarEvent] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService()
    
    var todayEventsCount: Int {
        let today = Calendar.current.startOfDay(for: Date())
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
        return events.filter { event in
            event.startDate >= today && event.startDate < tomorrow
        }.count
    }
    
    var thisWeekEventsCount: Int {
        let today = Calendar.current.startOfDay(for: Date())
        let nextWeek = Calendar.current.date(byAdding: .weekOfYear, value: 1, to: today)!
        return events.filter { event in
            event.startDate >= today && event.startDate < nextWeek
        }.count
    }
    
    var thisMonthEventsCount: Int {
        let today = Calendar.current.startOfDay(for: Date())
        let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: today)!
        return events.filter { event in
            event.startDate >= today && event.startDate < nextMonth
        }.count
    }
    
    func loadEvents() {
        print("🔄 Loading calendar events...")
        isLoading = true
        error = nil
        
        Task {
            do {
                print("🔄 Calling fetchCalendarEvents...")
                let events = try await apiService.fetchCalendarEvents()
                print("✅ Successfully fetched calendar events: \(events.count)")
                await MainActor.run {
                    self.events = events
                    self.isLoading = false
                    print("✅ Updated UI with calendar events data")
                }
            } catch {
                print("❌ Error in loadEvents: \(error)")
                print("❌ Error type: \(type(of: error))")
                if let apiError = error as? APIError {
                    print("❌ API Error: \(apiError)")
                }
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                    print("❌ Set error in UI: \(error.localizedDescription)")
                }
            }
        }
    }
    
    func eventsForDate(_ date: Date) -> [CalendarEvent]? {
        let startOfDay = Calendar.current.startOfDay(for: date)
        let endOfDay = Calendar.current.date(byAdding: .day, value: 1, to: startOfDay)!
        
        return events.filter { event in
            event.startDate >= startOfDay && event.startDate < endOfDay
        }
    }
}

// MARK: - AI Drafts Detail View
struct AIDraftsDetailView: View {
    @StateObject private var viewModel = AIDraftsDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView("Loading AI drafts...")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if !viewModel.drafts.isEmpty {
                        // Summary Statistics
                        VStack(spacing: 12) {
                            Text("AI Drafts Summary")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            LazyVGrid(columns: [
                                GridItem(.flexible()),
                                GridItem(.flexible())
                            ], spacing: 12) {
                                StatCard(title: "Total Drafts", value: "\(viewModel.drafts.count)", color: .purple)
                                StatCard(title: "Recent", value: "\(viewModel.recentDraftsCount)", color: .blue)
                                StatCard(title: "This Week", value: "\(viewModel.thisWeekDraftsCount)", color: .green)
                                StatCard(title: "This Month", value: "\(viewModel.thisMonthDraftsCount)", color: .orange)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        
                        // Drafts List
                        VStack(alignment: .leading, spacing: 12) {
                            Text("All AI Drafts")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            ForEach(viewModel.drafts) { draft in
                                AIDraftItemView(draft: draft)
                            }
                        }
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "brain.head.profile")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("No AI drafts")
                                .font(.headline)
                                .foregroundColor(.gray)
                            Text("AI hasn't generated any drafts yet")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("AI Drafts")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadDrafts()
        }
    }
}

// MARK: - AI Draft Item View
struct AIDraftItemView: View {
    let draft: AIDraft
    @State private var isExpanded = false
    @State private var isEditing = false
    @State private var editedSubject: String = ""
    @State private var editedBody: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var status: String = ""
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "envelope")
                    .foregroundColor(.purple)
                    .font(.system(size: 16, weight: .medium))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(isEditing ? editedSubject : draft.displayTitle)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(isExpanded ? nil : 1)
                    
                    Text(status.isEmpty ? draft.status.capitalized : status.capitalized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatDate(draft.createdAt))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    Text(status.isEmpty ? draft.status.capitalized : status.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(statusColor((status.isEmpty ? draft.status : status)).opacity(0.2))
                        .foregroundColor(statusColor((status.isEmpty ? draft.status : status)))
                        .cornerRadius(4)
                }
            }
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    Divider()
                    
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    
                    if isEditing {
                        Text("Subject")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        TextField("Subject", text: $editedSubject)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        
                        Text("Content")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        TextEditor(text: $editedBody)
                            .frame(minHeight: 80, maxHeight: 200)
                            .background(Color(.systemGray5))
                            .cornerRadius(6)
                        
                        HStack {
                            Button("Save") {
                                // TODO: Call API to save changes
                                isEditing = false
                                // Optionally update local state
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(isLoading)
                            
                            Button("Cancel") {
                                isEditing = false
                                editedSubject = draft.displayTitle
                                editedBody = draft.displayContent
                            }
                            .buttonStyle(.bordered)
                        }
                    } else {
                        Text("Content Preview")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        
                        Text(draft.displayContent)
                            .font(.caption)
                            .foregroundColor(.primary)
                            .lineLimit(6)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .background(Color(.systemGray5))
                            .cornerRadius(6)
                        
                        HStack(spacing: 12) {
                            Button("Approve") {
                                approveDraft()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                            .disabled(isLoading)
                            
                            Button("Reject") {
                                rejectDraft()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.red)
                            .disabled(isLoading)
                            
                            Button("Edit") {
                                isEditing = true
                                editedSubject = draft.displayTitle
                                editedBody = draft.displayContent
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    
                    HStack {
                        Text("Created: \(formatFullDate(draft.createdAt))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Button(action: {
                            // Copy to clipboard functionality could be added here
                        }) {
                            Image(systemName: "doc.on.doc")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.2)) {
                isExpanded.toggle()
            }
        }
        .onAppear {
            status = draft.status
        }
    }
    
    private func approveDraft() {
        isLoading = true
        errorMessage = nil
        // TODO: Call approve API
        // Example: /api/emails/[id]/approve
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            status = "approved"
            isLoading = false
        }
    }
    
    private func rejectDraft() {
        isLoading = true
        errorMessage = nil
        // TODO: Call reject API
        // Example: /api/emails/[id]/decline
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            status = "rejected"
            isLoading = false
        }
    }
    
    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "approved", "sent": return .green
        case "pending", "draft": return .orange
        case "rejected", "declined": return .red
        case "review": return .blue
        default: return .gray
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    private func formatFullDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - AI Drafts Detail ViewModel
class AIDraftsDetailViewModel: ObservableObject {
    @Published var drafts: [AIDraft] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiService = APIService()
    
    var recentDraftsCount: Int {
        let oneDayAgo = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        return drafts.filter { $0.createdAt >= oneDayAgo }.count
    }
    
    var thisWeekDraftsCount: Int {
        let oneWeekAgo = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: Date())!
        return drafts.filter { $0.createdAt >= oneWeekAgo }.count
    }
    
    var thisMonthDraftsCount: Int {
        let oneMonthAgo = Calendar.current.date(byAdding: .month, value: -1, to: Date())!
        return drafts.filter { $0.createdAt >= oneMonthAgo }.count
    }
    
    func loadDrafts() {
        print("🔄 Loading AI drafts...")
        isLoading = true
        error = nil
        
        Task {
            do {
                print("🔄 Calling fetchAIDrafts...")
                let drafts = try await apiService.fetchAIDrafts()
                print("✅ Successfully fetched AI drafts: \(drafts.count)")
                await MainActor.run {
                    self.drafts = drafts
                    self.isLoading = false
                    print("✅ Updated UI with AI drafts data")
                }
            } catch {
                print("❌ Error in loadDrafts: \(error)")
                print("❌ Error type: \(type(of: error))")
                if let apiError = error as? APIError {
                    print("❌ API Error: \(apiError)")
                }
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                    print("❌ Set error in UI: \(error.localizedDescription)")
                }
            }
        }
    }
}

// MARK: - Projects Tab View
struct ProjectsTabView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showingAddProject = false
    
    var body: some View {
        VStack {
            if viewModel.isLoading {
                ProgressView("Loading projects...")
                    .padding()
            } else if viewModel.projects.isEmpty {
                VStack(spacing: 16) {
                    Text("No projects yet")
                        .font(.headline)
                        .foregroundColor(.gray)
                    Button(action: { showingAddProject = true }) {
                        Label("Add Project", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }
            } else {
                List {
                    ForEach(viewModel.projects) { project in
                        NavigationLink(destination: ProjectDetailView(projectId: project.id)) {
                            ProjectRow(project: project)
                        }
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    viewModel.loadProjects()
                }
                Button(action: { showingAddProject = true }) {
                    Label("Add Project", systemImage: "plus")
                }
                .buttonStyle(.borderedProminent)
                .padding()
            }
        }
        .navigationTitle("Projects")
        .sheet(isPresented: $showingAddProject) {
            AddProjectSheet(isPresented: $showingAddProject, onAdd: { name, email in
                viewModel.addProject(name: name, clientEmail: email)
            })
        }
        .onAppear {
            viewModel.loadProjects()
        }
    }
}

// MARK: - Project Detail View
struct ProjectDetailView: View {
    let projectId: String
    @StateObject private var viewModel = ProjectDetailViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if let project = viewModel.project {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text(project.name)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                        
                        Text("Current Phase: \(project.currentPhase ?? "Unknown")")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    
                    // Phase Stepper
                    if let phases = project.phases, !phases.isEmpty {
                        PhaseStepperView(
                            phases: phases,
                            currentPhase: project.currentPhase ?? phases.first ?? "",
                            onAdvance: {
                                viewModel.advancePhase(projectId: project.id)
                            },
                            onBack: {
                                viewModel.moveBackPhase(projectId: project.id, currentPhase: project.currentPhase ?? "", phases: phases)
                            },
                            isLoading: viewModel.isLoading
                        )
                        .padding(.horizontal)
                    } else {
                        // Default phases if none are set
                        let defaultPhases = ["DISCOVERY", "DESIGN", "REVISIONS", "DELIVERY"]
                        PhaseStepperView(
                            phases: defaultPhases,
                            currentPhase: project.currentPhase ?? "DISCOVERY",
                            onAdvance: {
                                viewModel.advancePhase(projectId: project.id)
                            },
                            onBack: {
                                viewModel.moveBackPhase(projectId: project.id, currentPhase: project.currentPhase ?? "DISCOVERY", phases: defaultPhases)
                            },
                            isLoading: viewModel.isLoading
                        )
                        .padding(.horizontal)
                    }
                    
                    // Phase History
                    if let phaseHistory = project.phaseHistory, !phaseHistory.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Phase History")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            ForEach(phaseHistory, id: \.timestamp) { history in
                                HStack {
                                    Text(history.phase)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    
                                    Spacer()
                                    
                                    Text(history.timestamp, style: .date)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Project Details
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Project Details")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        VStack(spacing: 8) {
                            DetailRow(title: "Client", value: project.clientName ?? "Not specified")
                            DetailRow(title: "Client Email", value: project.clientEmail ?? "Not specified")
                            DetailRow(title: "Status", value: project.status)
                            DetailRow(title: "Created", value: "", dateValue: project.createdAt.date, isDate: true)
                        }
                    }
                    .padding(.horizontal)
                } else if viewModel.isLoading {
                    ProgressView("Loading project...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.error {
                    VStack {
                        Text("Error: \(error)")
                            .foregroundColor(.red)
                        Button("Retry") {
                            viewModel.loadProject(id: projectId)
                        }
                    }
                }
            }
            .padding(.vertical)
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("Project Details")
        .onAppear {
            print("Navigated to ProjectDetailView for id: \(projectId)")
            viewModel.loadProject(id: projectId)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Project Detail ViewModel
class ProjectDetailViewModel: ObservableObject {
    @Published var project: Project?
    @Published var phaseHistory: [ProjectPhaseHistoryItem]?
    @Published var isLoading = false
    @Published var error: String?
    private let apiService = APIService()
    
    func loadProject(id: String) {
        isLoading = true
        error = nil
        Task {
            do {
                let project = try await apiService.fetchProject(id: id)
                await MainActor.run {
                    self.project = project
                    self.phaseHistory = project.phaseHistory
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func advancePhase(projectId: String) {
        isLoading = true
        
        Task {
            do {
                let success = try await apiService.advancePhase(projectId: projectId)
                await MainActor.run {
                    self.isLoading = false
                    if success {
                        // Reload the project to get updated data
                        self.loadProject(id: projectId)
                    }
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    print("Error advancing phase: \(error)")
                }
            }
        }
    }
    
    func moveBackPhase(projectId: String, currentPhase: String, phases: [String]) {
        guard let currentIndex = phases.firstIndex(of: currentPhase), currentIndex > 0 else { return }
        
        isLoading = true
        
        Task {
            do {
                let success = try await apiService.updateProjectPhase(projectId: projectId, newPhase: phases[currentIndex - 1])
                await MainActor.run {
                    self.isLoading = false
                    if success {
                        // Reload the project to get updated data
                        self.loadProject(id: projectId)
                    }
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    print("Error moving back phase: \(error)")
                }
            }
        }
    }
}

struct DetailRow: View {
    let title: String
    let value: String
    var dateValue: Date?
    var isDate: Bool = false
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            if isDate, let date = dateValue {
                Text(date, style: .date)
                    .font(.subheadline)
                    .fontWeight(.medium)
            } else {
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Add Project Sheet
struct AddProjectSheet: View {
    @Binding var isPresented: Bool
    @State private var name: String = ""
    @State private var clientEmail: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    var onAdd: (String, String) -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Project Details")) {
                    TextField("Project Name", text: $name)
                    TextField("Client Email", text: $clientEmail)
                        .keyboardType(.emailAddress)
                }
                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
            .navigationTitle("Add Project")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        guard !name.isEmpty, !clientEmail.isEmpty else {
                            errorMessage = "Please enter all fields."
                            return
                        }
                        isLoading = true
                        errorMessage = nil
                        onAdd(name, clientEmail)
                        isPresented = false
                    }
                    .disabled(isLoading)
                }
            }
        }
    }
}

// MARK: - Phase Stepper View
struct PhaseStepperView: View {
    let phases: [String]
    let currentPhase: String
    let onAdvance: () -> Void
    let onBack: () -> Void
    let isLoading: Bool
    
    var body: some View {
        VStack(spacing: 20) {
            // Phase Stepper
            HStack(spacing: 0) {
                ForEach(Array(phases.enumerated()), id: \.offset) { idx, phase in
                    let isActive = phase == currentPhase
                    let isCompleted = phases.firstIndex(of: currentPhase) ?? 0 > idx
                    
                    VStack(spacing: 8) {
                        ZStack {
                            let circleColor = isActive ? Color.purple : isCompleted ? Color.green : Color.gray.opacity(0.3)
                            let circleSize = isActive ? 56.0 : 44.0
                            let shadowColor = isActive ? Color.purple.opacity(0.5) : Color.clear
                            let shadowRadius = isActive ? 8.0 : 0.0
                            
                            Circle()
                                .fill(circleColor)
                                .frame(width: circleSize, height: circleSize)
                                .shadow(color: shadowColor, radius: shadowRadius)
                            
                            let iconSize = isActive ? 24.0 : 20.0
                            Image(systemName: iconForPhase(idx))
                                .foregroundColor(.white)
                                .font(.system(size: iconSize, weight: .bold))
                        }
                        
                        let textColor = isActive ? Color.purple : isCompleted ? Color.green : Color.gray
                        let textWeight = isActive ? Font.Weight.bold : Font.Weight.regular
                        
                        Text(phase)
                            .font(.caption)
                            .fontWeight(textWeight)
                            .foregroundColor(textColor)
                            .multilineTextAlignment(.center)
                    }
                    
                    // Connector line
                    if idx < phases.count - 1 {
                        Rectangle()
                            .fill(isCompleted ? Color.green : Color.gray.opacity(0.3))
                            .frame(width: 32, height: 4)
                            .padding(.horizontal, 8)
                    }
                }
            }
            .padding(.horizontal)
            
            // Navigation Buttons
            HStack(spacing: 20) {
                Button(action: onBack) {
                    HStack {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Color.purple)
                    .cornerRadius(8)
                }
                .disabled(phases.firstIndex(of: currentPhase) == 0 || isLoading)
                .opacity(phases.firstIndex(of: currentPhase) == 0 || isLoading ? 0.5 : 1.0)
                
                Spacer()
                
                Button(action: onAdvance) {
                    HStack {
                        Text("Advance")
                        Image(systemName: "chevron.right")
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Color.purple)
                    .cornerRadius(8)
                }
                .disabled(phases.firstIndex(of: currentPhase) == phases.count - 1 || isLoading)
                .opacity(phases.firstIndex(of: currentPhase) == phases.count - 1 || isLoading ? 0.5 : 1.0)
            }
            .padding(.horizontal)
        }
    }
    
    private func iconForPhase(_ idx: Int) -> String {
        switch idx {
        case 0: return "bolt.fill"
        case 1: return "bubble.left.and.bubble.right.fill"
        case 2: return "clock.fill"
        case 3: return "checkmark.circle.fill"
        default: return "circle"
        }
    }
}

// MARK: - Push Notification Service
class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()
    
    @Published var isRegistered = false
    @Published var deviceToken: String?
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    self.registerForRemoteNotifications()
                }
            }
            if let error = error {
                print("❌ Push notification permission error: \(error)")
            }
        }
    }
    
    func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
    
    func sendLocalNotification(title: String, body: String, userInfo: [String: Any] = [:]) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.userInfo = userInfo
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ Error sending local notification: \(error)")
            }
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension PushNotificationService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("📱 Notification tapped with userInfo: \(userInfo)")
        completionHandler()
    }
}

// MARK: - Change Detection Service
class ChangeDetectionService: ObservableObject {
    static let shared = ChangeDetectionService()
    
    private var lastChangeCount = 0
    private var lastChangeTimestamp: Date?
    private let notificationService = PushNotificationService.shared
    private let apiService = APIService()
    
    func checkForNewChanges(_ changes: [AIChange]?) {
        guard let changes = changes else { return }
        
        let currentChangeCount = changes.count
        let hasNewChanges = currentChangeCount > lastChangeCount
        
        if hasNewChanges {
            let newChanges = changes.suffix(currentChangeCount - lastChangeCount)
            notifyAboutNewChanges(newChanges)
            
            lastChangeCount = currentChangeCount
            lastChangeTimestamp = Date()
        }
    }
    
    private func notifyAboutNewChanges(_ changes: ArraySlice<AIChange>) {
        for change in changes {
            let title = "New Activity Detected"
            let body = getNotificationBody(for: change)
            let userInfo = [
                "changeType": change.type.rawValue,
                "projectId": change.projectId ?? "",
                "projectName": change.projectName ?? "",
                "description": change.description
            ]
            
            // Send local notification
            notificationService.sendLocalNotification(
                title: title,
                body: body,
                userInfo: userInfo
            )
            
            // Send push notification to backend
            sendPushNotificationToBackend(change: change, title: title, body: body)
        }
    }
    
               private func sendPushNotificationToBackend(change: AIChange, title: String, body: String) {
               Task {
                   do {
                       let url = URL(string: "https://app.digipod.tech/api/push-notifications/send")!
                       var request = URLRequest(url: url)
                       request.httpMethod = "POST"
                       request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                       
                       // Get Firebase ID token
                       guard let user = Auth.auth().currentUser else {
                           print("❌ No authenticated user found")
                           return
                       }
                       
                       let token = try await user.getIDToken()
                       request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                       
                       let notificationData = [
                           "title": title,
                           "body": body,
                           "changeType": change.type.rawValue,
                           "projectId": change.projectId ?? "",
                           "projectName": change.projectName ?? "",
                           "description": change.description
                       ]
                       
                       request.httpBody = try JSONSerialization.data(withJSONObject: notificationData)
                       
                       let (data, response) = try await URLSession.shared.data(for: request)
                       
                       guard let httpResponse = response as? HTTPURLResponse else {
                           print("❌ Invalid response from push notification API")
                           return
                       }
                       
                       if httpResponse.statusCode == 200 {
                           let responseData = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                           print("✅ Push notification sent to backend successfully")
                       } else {
                           print("❌ Push notification failed with status: \(httpResponse.statusCode)")
                       }
                   } catch {
                       print("❌ Error sending push notification to backend: \(error)")
                   }
               }
           }
    
    private func getNotificationBody(for change: AIChange) -> String {
        switch change.type {
        case .new_todo:
            return "New to-do item added: \(change.description)"
        case .new_draft:
            return "New AI draft created: \(change.description)"
        case .phase_advance:
            return "Project phase advanced: \(change.description)"
        case .email_processed:
            return "Email processed: \(change.description)"
        case .ai_activity:
            return "AI activity: \(change.description)"
        }
    }
    
    func resetChangeCount() {
        lastChangeCount = 0
        lastChangeTimestamp = nil
    }
}

#Preview {
    ContentView()
}

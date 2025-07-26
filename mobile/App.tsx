import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TasksScreen from './src/screens/TasksScreen';
import CoPilotScreen from './src/screens/CoPilotScreen';

// Firebase config (same as web app)
const firebaseConfig = {
  apiKey: "AIzaSyAgIrQDbK1Bah5G8aIyI7ZAMVuffdstJNA",
  authDomain: "digipod-ai.firebaseapp.com",
  projectId: "digipod-ai",
  storageBucket: "digipod-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Tasks: undefined;
  CoPilot: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Digipod...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1F2937',
          },
          headerTintColor: '#E5E7EB',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {user ? (
          // Authenticated screens
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ title: 'Digipod Dashboard' }}
            />
            <Stack.Screen 
              name="Tasks" 
              component={TasksScreen}
              options={{ title: 'Tasks' }}
            />
            <Stack.Screen 
              name="CoPilot" 
              component={CoPilotScreen}
              options={{ title: 'Co-Pilot' }}
            />
          </>
        ) : (
          // Login screen
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#E5E7EB',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
});

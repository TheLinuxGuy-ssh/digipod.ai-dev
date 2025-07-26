import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

interface Task {
  id: string;
  task: string;
  projectName: string;
  dueDate?: string;
  source: 'AI' | 'CoPilot';
  status: 'pending' | 'completed';
}

interface ApiTask {
  id?: string;
  task: string;
  projectName?: string;
  dueDate?: string;
  confidence?: number;
  status?: string;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const auth = getAuth();

  const fetchTasks = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('http://localhost:3000/api/client-todos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const processedTasks = (data.todos || []).map((task: ApiTask) => ({
          id: task.id || Math.random().toString(),
          task: task.task,
          projectName: task.projectName || 'General',
          dueDate: task.dueDate,
          source: typeof task.confidence === 'number' && task.confidence < 1 ? 'AI' : 'CoPilot',
          status: task.status || 'pending',
        }));
        setTasks(processedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const recentTasks = tasks.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CoPilot')}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Co-Pilot</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Tasks')}
          >
            <Ionicons name="list" size={24} color="#10B981" />
            <Text style={styles.actionText}>Tasks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentTasks.length > 0 ? (
          recentTasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskContent}>
                <Text style={styles.taskText}>{task.task}</Text>
                <Text style={styles.projectText}>{task.projectName}</Text>
              </View>
              <View style={styles.taskMeta}>
                <View style={[
                  styles.sourceBadge,
                  { backgroundColor: task.source === 'AI' ? '#3B82F6' : '#10B981' }
                ]}>
                  <Text style={styles.sourceText}>{task.source}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Add tasks via Co-Pilot or email</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {tasks.filter(t => t.source === 'AI').length}
            </Text>
            <Text style={styles.statLabel}>AI Tasks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {tasks.filter(t => t.source === 'CoPilot').length}
            </Text>
            <Text style={styles.statLabel}>Co-Pilot Tasks</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  userEmail: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  signOutButton: {
    padding: 8,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  taskItem: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  projectText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    color: '#3B82F6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
}); 
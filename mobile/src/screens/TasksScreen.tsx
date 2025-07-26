import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';



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

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSource, setFilterSource] = useState<'all' | 'AI' | 'CoPilot'>('all');
  const [filterProject] = useState<string>('all');
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

  const filteredTasks = tasks.filter(task => {
    const sourceMatch = filterSource === 'all' || task.source === filterSource;
    const projectMatch = filterProject === 'all' || task.projectName === filterProject;
    return sourceMatch && projectMatch;
  });



  const groupedTasks = filteredTasks.reduce((groups, task) => {
    const project = task.projectName;
    if (!groups[project]) {
      groups[project] = [];
    }
    groups[project].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filterSource === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterSource('all')}
          >
            <Text style={[styles.filterText, filterSource === 'all' && styles.filterTextActive]}>
              All Sources
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterSource === 'AI' && styles.filterButtonActive]}
            onPress={() => setFilterSource('AI')}
          >
            <Text style={[styles.filterText, filterSource === 'AI' && styles.filterTextActive]}>
              AI Tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, filterSource === 'CoPilot' && styles.filterButtonActive]}
            onPress={() => setFilterSource('CoPilot')}
          >
            <Text style={[styles.filterText, filterSource === 'CoPilot' && styles.filterTextActive]}>
              Co-Pilot Tasks
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.keys(groupedTasks).length > 0 ? (
          Object.entries(groupedTasks).map(([project, projectTasks]) => (
            <View key={project} style={styles.projectGroup}>
              <Text style={styles.projectTitle}>{project}</Text>
              {projectTasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskContent}>
                    <Text style={styles.taskText}>{task.task}</Text>
                    {task.dueDate && (
                      <Text style={styles.dueDateText}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.taskMeta}>
                    <View style={[
                      styles.sourceBadge,
                      { backgroundColor: task.source === 'AI' ? '#3B82F6' : '#10B981' }
                    ]}>
                      <Text style={styles.sourceText}>{task.source}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: task.status === 'completed' ? '#10B981' : '#F59E0B' }
                    ]}>
                      <Text style={styles.statusText}>
                        {task.status === 'completed' ? 'Done' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>
              {filterSource !== 'all' || filterProject !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Add tasks via Co-Pilot or email'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  projectGroup: {
    marginBottom: 24,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 20,
  },
  taskItem: {
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
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
  dueDateText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  taskMeta: {
    alignItems: 'flex-end',
    gap: 8,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 
// Test script for dashboard summary API
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust if your backend runs on a different port

async function testDashboardAPI() {
  console.log('🧪 Testing dashboard summary API...\n');

  try {
    // Test the dashboard summary endpoint
    console.log('1. Testing dashboard summary endpoint...');
    const response = await fetch(`${BASE_URL}/api/dashboard/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('Dashboard summary endpoint status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dashboard summary response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Validate the response structure
      if (data.changes && Array.isArray(data.changes)) {
        console.log(`\n✅ Found ${data.changes.length} changes`);
        
        if (data.changes.length > 0) {
          const firstChange = data.changes[0];
          console.log('\n📋 Sample change structure:');
          console.log('- type:', firstChange.type);
          console.log('- projectId:', firstChange.projectId);
          console.log('- projectName:', firstChange.projectName);
          console.log('- description:', firstChange.description);
          console.log('- timestamp:', firstChange.timestamp);
          console.log('- impact:', firstChange.impact);
          
          // Validate timestamp format
          if (typeof firstChange.timestamp === 'string') {
            console.log('✅ Timestamp is a string (correct format)');
          } else {
            console.log('❌ Timestamp is not a string:', typeof firstChange.timestamp);
          }
        }
      } else {
        console.log('❌ No changes array in response');
      }
      
      if (data.summary) {
        console.log('\n📊 Summary metrics:');
        console.log('- totalChanges:', data.summary.totalChanges);
        console.log('- phaseAdvances:', data.summary.phaseAdvances);
        console.log('- newTodos:', data.summary.newTodos);
        console.log('- newDrafts:', data.summary.newDrafts);
        console.log('- processedEmails:', data.summary.processedEmails);
        console.log('- aiActivities:', data.summary.aiActivities);
      }
      
    } else {
      const errorData = await response.json();
      console.log('❌ Error response:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error testing dashboard API:', error.message);
  }
}

// Run the test
testDashboardAPI(); 
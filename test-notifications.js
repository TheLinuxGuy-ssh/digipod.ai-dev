// Test script for push notifications
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust if your backend runs on a different port

async function testNotificationEndpoints() {
  console.log('🧪 Testing notification endpoints...\n');

  try {
    // Test 1: Check if the register endpoint exists
    console.log('1. Testing register endpoint...');
    const registerResponse = await fetch(`${BASE_URL}/api/push-notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        deviceToken: 'test-device-token-123'
      })
    });

    console.log('Register endpoint status:', registerResponse.status);
    const registerData = await registerResponse.json();
    console.log('Register response:', registerData);
    console.log('');

    // Test 2: Check if the test endpoint exists
    console.log('2. Testing test endpoint...');
    const testResponse = await fetch(`${BASE_URL}/api/push-notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('Test endpoint status:', testResponse.status);
    const testData = await testResponse.json();
    console.log('Test response:', testData);
    console.log('');

    // Test 3: Check if the send endpoint exists
    console.log('3. Testing send endpoint...');
    const sendResponse = await fetch(`${BASE_URL}/api/push-notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Test Notification',
        body: 'This is a test notification',
        userId: 'test-user-id'
      })
    });

    console.log('Send endpoint status:', sendResponse.status);
    const sendData = await sendResponse.json();
    console.log('Send response:', sendData);
    console.log('');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

// Run the test
testNotificationEndpoints(); 
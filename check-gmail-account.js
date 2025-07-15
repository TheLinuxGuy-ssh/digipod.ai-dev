// Script to check which Gmail account is connected for mailbox functionality
// Run this in your browser console when logged into your app

async function checkConnectedGmailAccount() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log('Please log in first');
    return;
  }
  
  const token = await user.getIdToken();
  
  // Check the gmail-user endpoint to see what's connected
  const res = await fetch('/api/gmail-user', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log('Gmail connection status:', data);
    
    if (data.gmailConnected) {
      console.log('✅ Gmail is connected');
      console.log('📧 Connected Gmail account:', data.email);
      console.log('👤 Firebase user:', user.email);
      
      if (data.email !== user.email) {
        console.log('⚠️  Different accounts!');
        console.log('   - Firebase auth:', user.email);
        console.log('   - Gmail connected:', data.email);
      } else {
        console.log('✅ Same account for both Firebase and Gmail');
      }
    } else {
      console.log('❌ Gmail is not connected');
    }
  } else {
    console.log('Failed to check Gmail connection');
  }
}

// Run this function
checkConnectedGmailAccount(); 
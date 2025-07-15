const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function checkConnectedGmailAccounts() {
  try {
    console.log('Checking connected Gmail accounts in Firestore...\n');
    
    // Get all users with Gmail tokens
    const usersSnap = await db.collection('users').get();
    
    console.log(`Found ${usersSnap.docs.length} users in Firestore`);
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`\nUser ID: ${userId}`);
      console.log(`Firebase Email: ${userData.email || 'Not set'}`);
      console.log(`Gmail Connected: ${userData.gmailToken ? 'YES' : 'NO'}`);
      
      if (userData.gmailToken) {
        try {
          const tokens = JSON.parse(userData.gmailToken);
          console.log(`Gmail Token Type: ${tokens.token_type || 'Unknown'}`);
          console.log(`Gmail Token Expires: ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'Unknown'}`);
          
          // Try to extract email from ID token if available
          if (tokens.id_token) {
            const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
            console.log(`Connected Gmail Account: ${payload.email || 'Could not extract'}`);
          } else {
            console.log(`Connected Gmail Account: Could not determine (no ID token)`);
          }
        } catch (err) {
          console.log(`Error parsing Gmail tokens: ${err.message}`);
        }
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error checking Gmail accounts:', error);
  } finally {
    process.exit(0);
  }
}

checkConnectedGmailAccounts(); 
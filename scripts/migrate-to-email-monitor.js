const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function migrateToEmailMonitor() {
  try {
    console.log('Starting migration to Email Monitor system...\n');
    
    // 1. Migrate existing Gmail users to emailSettings
    console.log('1. Migrating Gmail users to emailSettings...');
    const usersSnap = await db.collection('users').get();
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      if (userData.gmailToken) {
        console.log(`  - Migrating user: ${userData.email || userId}`);
        
        // Check if email setting already exists
        const existingSettingSnap = await db.collection('emailSettings')
          .where('userId', '==', userId)
          .where('provider', '==', 'gmail')
          .get();
        
        if (existingSettingSnap.empty) {
          // Create new email setting
          await db.collection('emailSettings').add({
            userId,
            provider: 'gmail',
            email: userData.email || 'unknown@gmail.com',
            gmailToken: userData.gmailToken,
            isActive: true,
            checkInterval: 5, // Default 5 minutes
            lastChecked: new Date(),
            createdAt: new Date()
          });
          console.log(`    ✓ Created Gmail email setting`);
        } else {
          console.log(`    ⚠ Email setting already exists, skipping`);
        }
      }
    }
    
    // 2. Migrate existing IMAP mailboxes to emailSettings
    console.log('\n2. Migrating IMAP mailboxes to emailSettings...');
    const mailboxesSnap = await db.collection('mailboxes').get();
    
    for (const mailboxDoc of mailboxesSnap.docs) {
      const mailboxData = mailboxDoc.data();
      const userId = mailboxData.userId;
      
      if (mailboxData.provider === 'imap') {
        console.log(`  - Migrating IMAP mailbox: ${mailboxData.email}`);
        
        // Check if email setting already exists
        const existingSettingSnap = await db.collection('emailSettings')
          .where('userId', '==', userId)
          .where('provider', '==', 'imap')
          .get();
        
        if (existingSettingSnap.empty) {
          // Create new email setting
          await db.collection('emailSettings').add({
            userId,
            provider: 'imap',
            email: mailboxData.email,
            imapHost: mailboxData.imapHost,
            imapPort: mailboxData.imapPort,
            imapSecure: mailboxData.imapSecure,
            username: mailboxData.username,
            passwordEnc: mailboxData.passwordEnc,
            isActive: true,
            checkInterval: 5, // Default 5 minutes
            lastChecked: new Date(),
            createdAt: new Date()
          });
          console.log(`    ✓ Created IMAP email setting`);
        } else {
          console.log(`    ⚠ Email setting already exists, skipping`);
        }
      }
    }
    
    // 3. Migrate project client emails to clientEmailFilters
    console.log('\n3. Migrating project client emails to clientEmailFilters...');
    const projectsSnap = await db.collection('projects').get();
    
    for (const projectDoc of projectsSnap.docs) {
      const projectData = projectDoc.data();
      const projectId = projectDoc.id;
      const userId = projectData.userId;
      const clientEmail = projectData.clientEmail;
      
      if (clientEmail && userId) {
        console.log(`  - Migrating project: ${projectData.name} (${clientEmail})`);
        
        // Check if client filter already exists
        const existingFilterSnap = await db.collection('clientEmailFilters')
          .where('userId', '==', userId)
          .where('emailAddress', '==', clientEmail.toLowerCase())
          .get();
        
        if (existingFilterSnap.empty) {
          // Create new client filter
          await db.collection('clientEmailFilters').add({
            userId,
            emailAddress: clientEmail.toLowerCase(),
            projectId,
            isActive: true,
            createdAt: new Date()
          });
          console.log(`    ✓ Created client filter`);
        } else {
          console.log(`    ⚠ Client filter already exists, skipping`);
        }
      }
    }
    
    // 4. Create Firestore indexes for the new collections
    console.log('\n4. Creating Firestore indexes...');
    console.log('  Note: You may need to create these indexes manually in the Firebase Console:');
    console.log('  - emailSettings: userId (ascending)');
    console.log('  - emailSettings: isActive (ascending)');
    console.log('  - clientEmailFilters: userId (ascending), createdAt (descending)');
    console.log('  - clientEmailFilters: userId (ascending), emailAddress (ascending)');
    console.log('  - processedEmails: userId (ascending), status (ascending)');
    console.log('  - processedEmails: userId (ascending), processedAt (descending)');
    console.log('  - aiDrafts: processedEmailId (ascending), status (ascending)');
    console.log('  - aiDrafts: createdAt (descending)');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the email monitoring service');
    console.log('2. Test the new dashboard at /email-monitor');
    console.log('3. Configure your email settings and client filters');
    console.log('4. Monitor the processing status');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run migration
migrateToEmailMonitor(); 
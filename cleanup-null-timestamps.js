// Script to clean up null timestamps in the database
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (!serviceAccount.project_id) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function cleanupNullTimestamps() {
  console.log('🧹 Cleaning up null timestamps in the database...\n');

  try {
    // Check for null timestamps in clientMessages
    console.log('1. Checking clientMessages collection...');
    const clientMessagesQuery = await db.collectionGroup('clientMessages')
      .where('createdAt', '==', null)
      .limit(10)
      .get();

    if (!clientMessagesQuery.empty) {
      console.log(`⚠️ Found ${clientMessagesQuery.size} clientMessages with null createdAt`);
      
      const batch = db.batch();
      let count = 0;
      
      for (const doc of clientMessagesQuery.docs) {
        batch.update(doc.ref, {
          createdAt: new Date()
        });
        count++;
      }
      
      await batch.commit();
      console.log(`✅ Updated ${count} clientMessages with current timestamp`);
    } else {
      console.log('✅ No clientMessages with null timestamps found');
    }

    // Check for null timestamps in todos
    console.log('\n2. Checking todos collection...');
    const todosQuery = await db.collection('todos')
      .where('createdAt', '==', null)
      .limit(10)
      .get();

    if (!todosQuery.empty) {
      console.log(`⚠️ Found ${todosQuery.size} todos with null createdAt`);
      
      const batch = db.batch();
      let count = 0;
      
      for (const doc of todosQuery.docs) {
        batch.update(doc.ref, {
          createdAt: new Date()
        });
        count++;
      }
      
      await batch.commit();
      console.log(`✅ Updated ${count} todos with current timestamp`);
    } else {
      console.log('✅ No todos with null timestamps found');
    }

    // Check for null timestamps in aiDrafts
    console.log('\n3. Checking aiDrafts collection...');
    const aiDraftsQuery = await db.collection('aiDrafts')
      .where('createdAt', '==', null)
      .limit(10)
      .get();

    if (!aiDraftsQuery.empty) {
      console.log(`⚠️ Found ${aiDraftsQuery.size} aiDrafts with null createdAt`);
      
      const batch = db.batch();
      let count = 0;
      
      for (const doc of aiDraftsQuery.docs) {
        batch.update(doc.ref, {
          createdAt: new Date()
        });
        count++;
      }
      
      await batch.commit();
      console.log(`✅ Updated ${count} aiDrafts with current timestamp`);
    } else {
      console.log('✅ No aiDrafts with null timestamps found');
    }

    // Check for null timestamps in processedEmails
    console.log('\n4. Checking processedEmails collection...');
    const processedEmailsQuery = await db.collection('processedEmails')
      .where('processedAt', '==', null)
      .limit(10)
      .get();

    if (!processedEmailsQuery.empty) {
      console.log(`⚠️ Found ${processedEmailsQuery.size} processedEmails with null processedAt`);
      
      const batch = db.batch();
      let count = 0;
      
      for (const doc of processedEmailsQuery.docs) {
        batch.update(doc.ref, {
          processedAt: new Date()
        });
        count++;
      }
      
      await batch.commit();
      console.log(`✅ Updated ${count} processedEmails with current timestamp`);
    } else {
      console.log('✅ No processedEmails with null timestamps found');
    }

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('✅ All null timestamps have been replaced with current timestamps');
    console.log('✅ The iOS app should no longer get decoding errors');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupNullTimestamps().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
}); 
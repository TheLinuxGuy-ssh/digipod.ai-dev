// Simple script to update project client email
// Run this in your browser console when logged into your app

async function updateClientEmail() {
  // Get your Firebase auth token
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log('Please log in first');
    return;
  }
  
  const token = await user.getIdToken();
  
  // First, get your projects to find the one with ib.creation@tcs.com
  const projectsRes = await fetch('/api/projects', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!projectsRes.ok) {
    console.log('Failed to fetch projects');
    return;
  }
  
  const projects = await projectsRes.json();
  const project = projects.find(p => p.clientEmail === 'ib.creation@tcs.com');
  
  if (!project) {
    console.log('No project found with client email ib.creation@tcs.com');
    return;
  }
  
  console.log('Found project:', project);
  
  // Update the client email to test with an existing email
  const newClientEmail = 'services@custcomm.icicibank.com'; // This email exists in your inbox
  
  const updateRes = await fetch(`/api/projects/${project.id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ clientEmail: newClientEmail })
  });
  
  if (updateRes.ok) {
    console.log(`Updated project ${project.id} client email to ${newClientEmail}`);
    console.log('Now refresh your dashboard to see AI drafts!');
  } else {
    console.log('Failed to update project');
  }
}

// Run this function
updateClientEmail(); 
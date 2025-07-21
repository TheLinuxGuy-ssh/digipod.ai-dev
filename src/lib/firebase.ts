import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAgIrQDbK1Bah5G8aIyI7ZAMVuffdstJNA",
  authDomain: "digipod-fae08.firebaseapp.com",
  projectId: "digipod-fae08",
  storageBucket: "digipod-fae08.appspot.com",
  messagingSenderId: "1091899157986",
  appId: "1:1091899157986:web:f1e9d10277ccd06e18ddbb",
  measurementId: "G-WXCKNJ2LPV"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, app, db };
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "window.__ENV__?.MAIN_API_KEY || """,
  authDomain: "code-vibe-df610.firebaseapp.com",
  projectId: "code-vibe-df610",
  storageBucket: "code-vibe-df610.firebasestorage.app",
  messagingSenderId: "747762490655",
  appId: "1:747762490655:web:125516814620784cf3a42a",
  measurementId: "G-3QE6F8LWZ1",
  databaseURL: "https://code-vibe-df610-default-rtdb.firebaseio.com"  // Sizning URL
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjTR_DuMhORfycBLMCa7Yd6c-5BYj2kOA",
  authDomain: "financeironepdev.firebaseapp.com",
  projectId: "financeironepdev",
  storageBucket: "financeironepdev.firebasestorage.app",
  messagingSenderId: "517106473897",
  appId: "1:517106473897:web:a5954492b26b67600102b8",
  measurementId: "G-FZBS3KYBPM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCOTjE1Yfm5qPNn5vEoKYegkQ-yC2ElLok",
  authDomain: "nepdev-38834.firebaseapp.com",
  projectId: "nepdev-38834",
  storageBucket: "nepdev-38834.firebasestorage.app",
  messagingSenderId: "1001606538081",
  appId: "1:1001606538081:web:a9be4458428fb133ad9b20"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

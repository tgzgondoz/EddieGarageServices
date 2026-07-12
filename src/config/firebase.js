import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, remove, update } from 'firebase/database';


const firebaseConfig = {
  apiKey: "AIzaSyAaM4MsPxBOCcSdiU_4xYotxB1dHAas2pY",
  authDomain: "eddiesgaragepos.firebaseapp.com",
  projectId: "eddiesgaragepos",
  storageBucket: "eddiesgaragepos.firebasestorage.app",
  messagingSenderId: "1089907198908",
  appId: "1:1089907198908:web:22259f21c4fc52c6b439b9",
  measurementId: "G-S04E1M17FV",
  databaseURL: "https://eddiesgaragepos-default-rtdb.firebaseio.com"
};

let app = null;
let database = null;

export const initializeFirebase = () => {
  try {
    if (!app) {
      console.log('Initializing Firebase...');
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      console.log('Firebase initialized successfully');
    }
    return { app, database };
  } catch (error) {
    console.error('Firebase initialization error details:', error);
    throw error;
  }
};

export const getDatabaseInstance = () => {
  if (!database) {
    initializeFirebase();
  }
  return database;
};

// Export all the functions you need
export { ref, set, push, onValue, remove, update };
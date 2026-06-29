import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase, ref, set, get, child, update, remove } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAaM4MsPxBOCcSdiU_4xYotxB1dHAas2pY",
  authDomain: "eddiesgaragepos.firebaseapp.com",
  projectId: "eddiesgaragepos",
  storageBucket: "eddiesgaragepos.firebasestorage.app",
  messagingSenderId: "1089907198908",
  appId: "1:1089907198908:web:22259f21c4fc52c6b439b9",
  measurementId: "G-S04E1M17FV",
  databaseURL: "https://eddiesgaragepos-default-rtdb.firebaseio.com" // Add your Realtime Database URL
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
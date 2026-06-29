import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAaM4MsPxBOCcSdiU_4xYotxB1dHAas2pY",
  authDomain: "eddiesgaragepos.firebaseapp.com",
  projectId: "eddiesgaragepos",
  storageBucket: "eddiesgaragepos.firebasestorage.app",
  messagingSenderId: "1089907198908",
  appId: "1:1089907198908:web:22259f21c4fc52c6b439b9",
  measurementId: "G-S04E1M17FV"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Using import.meta.env is the correct way to access variables in Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
};

const app = initializeApp(firebaseConfig);

// Safely initialize analytics to prevent crashes from adblockers or missing config
export let analytics: any = null;
isSupported().then((yes) => {
  if (yes) {
    try {
      analytics = getAnalytics(app);
    } catch (err) {
      console.warn("Analytics initialization failed:", err);
    }
  }
}).catch(() => {});

export const storage = getStorage(app);
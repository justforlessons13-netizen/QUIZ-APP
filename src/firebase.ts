
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getStorage } from "firebase/storage";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD4eJW9n9ygH2h5S6P3H7SFxMTLFnbnqBA",
  authDomain: "my-app-e17be.firebaseapp.com",
  databaseURL: "https://my-app-e17be-default-rtdb.firebaseio.com",
  projectId: "my-app-e17be",
  storageBucket: "my-app-e17be.firebasestorage.app",
  messagingSenderId: "679812602133",
  appId: "1:679812602133:web:06c3069b74265d2dbdb11c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app);
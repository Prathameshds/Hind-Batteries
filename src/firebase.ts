import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDpM2kwLn2kV6sawIlvvW_Gu_-B-Epv2kA",
  authDomain: "hind-battery.firebaseapp.com",
  databaseURL: "https://hind-battery-default-rtdb.firebaseio.com",
  projectId: "hind-battery",
  storageBucket: "hind-battery.firebasestorage.app",
  messagingSenderId: "1086655927938",
  appId: "1:1086655927938:web:efea724b016e485809069b",
  measurementId: "G-QN840SWDJM"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, database, auth, storage };

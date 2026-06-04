// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAn3ONqOJ5wYD2WFLZRkBtdhl1-SBExFtc",
  authDomain: "la-relativite.firebaseapp.com",
  databaseURL: "https://la-relativite-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "la-relativite",
  storageBucket: "la-relativite.firebasestorage.app",
  messagingSenderId: "293644537461",
  appId: "1:293644537461:web:d983a77c7f6292d33b323c",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

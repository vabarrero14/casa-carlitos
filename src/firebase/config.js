import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Usa TU configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCA4prNauSsGbDcUh-EjJUjws3Oj54l1Y4",
  authDomain: "casacarlitos-fc994.firebaseapp.com",
  projectId: "casacarlitos-fc994",
  storageBucket: "casacarlitos-fc994.firebasestorage.app",
  messagingSenderId: "217776229699",
  appId: "1:217776229699:web:106c996163fe7dc7aff3f6",
  measurementId: "G-BXP7NL6WNK"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios que necesitamos
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
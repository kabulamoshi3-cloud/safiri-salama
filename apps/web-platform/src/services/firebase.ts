/**
 * Firebase — Google Sign-In for SkyRex Web Platform
 * Reads config from VITE_ env vars, falls back to hardcoded values.
 * Wrapped in try/catch so Firebase init failure never crashes the app.
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyBkDgINXZ6talT1JByhytoTsiUNv8JVoo8',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'safiri-salama-838eb.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'safiri-salama-838eb',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'safiri-salama-838eb.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '820851879376',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:820851879376:web:e45eff1a284bc5cf0f5dd5',
};

let fbApp: FirebaseApp | null = null;
let fbAuth: Auth | null = null;

try {
  fbApp  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  fbAuth = getAuth(fbApp);
} catch (e) {
  console.warn('[firebase] init failed:', e);
}

export const auth = fbAuth;

// ── Google Sign-In ─────────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export async function signInWithGoogle(): Promise<string> {
  if (!fbAuth) throw new Error('Firebase is not configured. Please contact support.');
  const result = await signInWithPopup(fbAuth, googleProvider);
  return result.user.getIdToken();
}

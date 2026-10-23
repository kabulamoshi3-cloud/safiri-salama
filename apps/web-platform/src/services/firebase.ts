/**
 * Firebase Phone Auth — SafiriSalama
 * Uses invisible reCAPTCHA anchored to a persistent body-level div
 * so React re-renders never remove the element.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyBkDgINXZ6talT1JByhytoTsiUNv8JVoo8',
  authDomain:        'safiri-salama-838eb.firebaseapp.com',
  projectId:         'safiri-salama-838eb',
  storageBucket:     'safiri-salama-838eb.firebasestorage.app',
  messagingSenderId: '820851879376',
  appId:             '1:820851879376:web:e45eff1a284bc5cf0f5dd5',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ── Persistent reCAPTCHA container ───────────────────────────────────────────
// Appended to <body> once, never removed, so React re-renders can't destroy it.
const CONTAINER_ID = 'firebase-recaptcha-root';

function ensureContainer(): void {
  if (!document.getElementById(CONTAINER_ID)) {
    const div = document.createElement('div');
    div.id = CONTAINER_ID;
    div.style.cssText = 'position:fixed;bottom:0;right:0;z-index:9999;';
    document.body.appendChild(div);
  }
}

let verifier: RecaptchaVerifier | null = null;
let verifierReady = false;

function resetVerifier(): void {
  if (verifier) {
    try { verifier.clear(); } catch { /* ignore */ }
    verifier = null;
    verifierReady = false;
  }
}

async function getVerifier(): Promise<RecaptchaVerifier> {
  ensureContainer();

  if (!verifier || !verifierReady) {
    resetVerifier();
    verifier = new RecaptchaVerifier(auth, CONTAINER_ID, {
      size: 'invisible',
      callback: () => { verifierReady = true; },
      'expired-callback': resetVerifier,
    });
    await verifier.render();
    verifierReady = true;
  }
  return verifier;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
  const v = await getVerifier();
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, v);
  } catch (err) {
    resetVerifier(); // force fresh verifier on next attempt
    throw err;
  }
}

export async function verifyOTP(
  confirmation: ConfirmationResult,
  otp: string,
): Promise<string> {
  const result = await confirmation.confirm(otp);
  return result.user.getIdToken();
}

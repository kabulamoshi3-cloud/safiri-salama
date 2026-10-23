/**
 * Firebase Phone Auth — SafiriSalama
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

const CONTAINER_ID = 'firebase-recaptcha-root';
let verifier: RecaptchaVerifier | null = null;

function getContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    document.body.appendChild(el);
  }
  return el;
}

function clearVerifier(): void {
  if (verifier) {
    try { verifier.clear(); } catch { /* ignore */ }
    verifier = null;
  }
  // Also clear the container innerHTML so reCAPTCHA can re-render
  const el = document.getElementById(CONTAINER_ID);
  if (el) el.innerHTML = '';
}

export async function sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
  // Always start fresh
  clearVerifier();
  getContainer();

  verifier = new RecaptchaVerifier(auth, CONTAINER_ID, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': clearVerifier,
  });

  try {
    const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return result;
  } catch (err) {
    clearVerifier();
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

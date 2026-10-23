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

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let recaptchaVerifier: RecaptchaVerifier | null = null;

export async function sendOTP(
  phoneNumber: string,
  buttonId: string
): Promise<ConfirmationResult> {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { recaptchaVerifier = null; },
  });
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

export async function verifyOTP(
  confirmation: ConfirmationResult,
  otp: string
): Promise<string> {
  const result = await confirmation.confirm(otp);
  return result.user.getIdToken();
}

/**
 * Firebase Admin SDK — verifies Firebase ID tokens from clients
 */
import * as admin from 'firebase-admin';

let initialized = false;

export function getFirebaseAdmin(): admin.app.App {
  if (!initialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID   || 'safiri-salama-838eb',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@safiri-salama-838eb.iam.gserviceaccount.com',
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
  return admin.app();
}

export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  const app = getFirebaseAdmin();
  return app.auth().verifyIdToken(idToken);
}

/**
 * Firebase token verification without firebase-admin SDK
 * Uses jsonwebtoken + Google public keys (lightweight, no heavy dependency)
 */
import * as https from 'https';
import * as jwt from 'jsonwebtoken';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'safiri-salama-838eb';

// Cache certs for 1 hour
let certsCache: Record<string, string> = {};
let certsCacheTime = 0;

function fetchCerts(): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    if (Date.now() - certsCacheTime < 3600000 && Object.keys(certsCache).length > 0) {
      return resolve(certsCache);
    }
    https.get(GOOGLE_CERTS_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          certsCache = JSON.parse(data);
          certsCacheTime = Date.now();
          resolve(certsCache);
        } catch { reject(new Error('Failed to parse Google certs')); }
      });
    }).on('error', reject);
  });
}

export interface DecodedToken {
  uid:          string;
  email?:       string;
  name?:        string;
  phone_number?: string;
  picture?:     string;
  sub:          string;
  aud:          string;
  iss:          string;
}

export async function verifyFirebaseToken(idToken: string): Promise<DecodedToken> {
  const certs = await fetchCerts();

  // Decode header to get key id
  const header = JSON.parse(
    Buffer.from(idToken.split('.')[0], 'base64').toString()
  );
  const cert = certs[header.kid];
  if (!cert) throw new Error('Invalid token: key not found');

  const decoded = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience:   PROJECT_ID,
    issuer:     `https://securetoken.google.com/${PROJECT_ID}`,
  }) as any;

  return {
    uid:          decoded.uid || decoded.sub,
    email:        decoded.email,
    name:         decoded.name,
    phone_number: decoded.phone_number,
    picture:      decoded.picture,
    sub:          decoded.sub,
    aud:          decoded.aud,
    iss:          decoded.iss,
  };
}

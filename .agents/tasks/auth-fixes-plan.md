# Auth Fixes Implementation Plan

> Generated after reading every listed source file.  
> Status: CONFIRMED BROKEN | ALREADY CORRECT | PARTIALLY BROKEN  
> Coder must act on every item that is not ALREADY CORRECT.

---

## Fix 1 — Public website: broken /forgot-password link

**Status: CONFIRMED BROKEN**

**Findings:**
- `LoginPage.tsx` line ~109: `<a href="/forgot-password">` — this is an `<a>` tag (hard reload), not a React Router `<Link>`.
- `App.tsx` has no `<Route path="/forgot-password" …>` at all.
- The backend has **no** forgot-password route in `auth.ts`. The OTP routes (`otp.ts`) exist at `/otp/send` and `/otp/verify` but there is no password-reset flow that uses them.
- There is no `ForgotPasswordPage.tsx` anywhere in the public-website.

**What to do:**
1. Create `apps/public-website/src/pages/ForgotPasswordPage.tsx`.  
   - Step 1: Phone input → calls `POST /otp/send` with `{ phone }`.  
   - Step 2 (shown after OTP sent): OTP code input + new password + confirm password → calls `POST /otp/verify` to confirm code, then calls `PATCH /auth/me` or a new `POST /auth/reset-password` endpoint. Use the OTP verify endpoint first; if `verified: true`, submit `{ phone, new_password }` to the backend. For now, wire to a stub `POST /auth/reset-password` (see Fix 22 note below).
   - Actually, since the backend lacks a reset-password endpoint, the immediate deliverable for the **frontend** is: a page that calls `/otp/send`, shows the 6-digit OTP field, and on verify calls `POST /auth/reset-password` and displays a "check back soon" message if the endpoint 404s. The backend endpoint will be added in Fix 22.
2. Add the route to `App.tsx`:
   ```tsx
   import ForgotPasswordPage from './pages/ForgotPasswordPage';
   // inside <Routes>:
   <Route path="/forgot-password" element={<ForgotPasswordPage />} />
   ```
3. Change the `<a href="/forgot-password">` in `LoginPage.tsx` to `<Link to="/forgot-password">` and add `Link` to the react-router-dom import at the top (it is already imported).

**Files:**
- `apps/public-website/src/pages/ForgotPasswordPage.tsx` — CREATE
- `apps/public-website/src/App.tsx` — add route + import
- `apps/public-website/src/pages/LoginPage.tsx` — replace `<a>` with `<Link>`

**Verify:** `npm run build` in `apps/public-website` completes without TypeScript errors. Navigate to `/forgot-password` in the browser — page renders instead of redirecting to `/`.

---

## Fix 2 — Public website: driver post-login redirect

**Status: CONFIRMED BROKEN**

**Findings:**
- `LoginPage.tsx` `handleSubmit` line ~54:
  ```ts
  if (data.user?.userType === 'driver') navigate('/become-a-driver');
  else navigate('/');
  ```
  After a successful driver login, the user is sent to `/become-a-driver` (the marketing registration page), which makes no sense for an already-registered driver. A driver should go to a driver dashboard or at minimum the home page.

**What to do:**
In `LoginPage.tsx`, change the post-login redirect for drivers. Since there is no separate driver web-dashboard at this time, redirect drivers to `/` (home) with a welcome state, or to a `/driver-dashboard` stub if one exists. Check for `/driver-dashboard` first; if absent, redirect to `/`.

Change:
```ts
if (data.user?.userType === 'driver') navigate('/become-a-driver');
else navigate('/');
```
To:
```ts
navigate('/');
```
(One redirect for all user types until a driver-specific web page exists.)

**Files:**
- `apps/public-website/src/pages/LoginPage.tsx`

**Verify:** Log in with a driver account → redirected to `/`, not `/become-a-driver`.

---

## Fix 3 — Public website: Firebase config hardcoded in source

**Status: CONFIRMED BROKEN**

**Findings:**
- `LoginPage.tsx` lines 21–29: hard-coded `firebaseConfig` object with real `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` literals in source code. The `.env.example` has only `VITE_API_URL`; no `VITE_FIREBASE_*` variables exist.

**What to do:**
1. Add to `apps/public-website/.env.example`:
   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```
2. In `LoginPage.tsx`, replace the hardcoded object with:
   ```ts
   const firebaseConfig = {
     apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId:             import.meta.env.VITE_FIREBASE_APP_ID,
   };
   ```
3. Wrap `initializeApp` in a try/catch so a missing env var does not crash the page:
   ```ts
   let fbApp: any = null;
   let auth: any = null;
   try {
     if (firebaseConfig.apiKey) {
       fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
       auth = getAuth(fbApp);
       googleProvider.addScope('email');
       googleProvider.addScope('profile');
     }
   } catch (e) {
     console.warn('Firebase init failed:', e);
   }
   ```
4. Guard `handleGoogle` to show an error if Firebase is not configured:
   ```ts
   if (!auth) { setError('Google sign-in is not configured.'); return; }
   ```

**Files:**
- `apps/public-website/.env.example`
- `apps/public-website/src/pages/LoginPage.tsx`

**Verify:** `npm run build` passes. Remove `VITE_FIREBASE_API_KEY` from local `.env` → clicking "Continue with Google" shows the config error message instead of crashing the app.

---

## Fix 4 — Public website: generic catch-all errors

**Status: CONFIRMED BROKEN**

**Findings:**
- `LoginPage.tsx` `handleSubmit` catch:
  ```ts
  setError(err.response?.data?.error || err.response?.data?.message || pubI18n.t('login_error'));
  ```
  This passes the raw backend string but never distinguishes network errors (no `err.response`) from 401 vs 409.
- `RegisterPage.tsx` catch:
  ```ts
  setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
  ```
  Same issue — generic fallback.

**What to do:**
Replace both catch blocks with specific per-status messages.

**LoginPage.tsx `handleSubmit` catch:**
```ts
} catch (err: any) {
  const status = err.response?.status;
  if (!err.response) {
    setError('Cannot connect to server. Check your internet connection.');
  } else if (status === 401) {
    setError('Incorrect phone number or password.');
  } else if (status === 403) {
    setError('Your account has been suspended. Contact support.');
  } else {
    setError(err.response?.data?.error || pubI18n.t('login_error'));
  }
}
```

**RegisterPage.tsx `handleSubmit` catch:**
```ts
} catch (err: any) {
  const status = err.response?.status;
  if (!err.response) {
    setError('Cannot connect to server. Check your internet connection.');
  } else if (status === 409 || (status === 400 && err.response?.data?.error?.toLowerCase().includes('already exists'))) {
    setError('An account with this phone number already exists. Try logging in.');
  } else if (status === 400) {
    setError(err.response?.data?.error || 'Please check your inputs and try again.');
  } else {
    setError('Registration failed. Please try again.');
  }
}
```

**Files:**
- `apps/public-website/src/pages/LoginPage.tsx`
- `apps/public-website/src/pages/RegisterPage.tsx`

**Verify:** `npm run build` passes. Manual test: submit login with wrong password → specific 401 message shown.

---

## Fix 5 — Public website: register missing role redirect after success

**Status: CONFIRMED BROKEN**

**Findings:**
- `RegisterPage.tsx` `handleSubmit` on success:
  ```ts
  navigate('/login?registered=true');
  ```
  This is the same for both passenger and driver. Drivers who just registered should be shown a "pending review" message rather than silently landing on the login page, which then redirects them to `/` (see Fix 2). The backend returns `user.userType` in the 201 response, so the role is available.

**What to do:**
After `await register(payload)` returns (it already returns `{ token, user }`), check the role:
```ts
const result = await register(payload);
if (role === 'driver') {
  navigate('/login?registered=true&role=driver');
} else {
  navigate('/login?registered=true');
}
```
In `LoginPage.tsx`, add a second banner for `role=driver` query param:
```tsx
{registered === 'true' && searchParams.get('role') === 'driver' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
    <p className="text-yellow-800 text-center">
      Registration received! Your driver account is under review. You will be notified once approved.
    </p>
  </div>
)}
{registered === 'true' && !searchParams.get('role') && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
    <p className="text-green-800 text-center">{pubI18n.t('login_success')}</p>
  </div>
)}
```

**Files:**
- `apps/public-website/src/pages/RegisterPage.tsx`
- `apps/public-website/src/pages/LoginPage.tsx`

**Verify:** Register as a driver → redirected to `/login?registered=true&role=driver` → yellow "pending review" banner is shown.

---

## Fix 6 — Admin panel: VITE_API_URL missing warning banner

**Status: CONFIRMED BROKEN**

**Findings:**
- `Login.tsx` has no banner or any reference to `import.meta.env.VITE_API_URL`.
- The `api.ts` falls back to `'http://localhost:3000/api/v1'` silently.
- If `VITE_API_URL` is not set in production, all requests silently go to localhost and every action fails with a network error.

**What to do:**
At the top of `Login.tsx` (after the existing imports), add a warning banner that is only shown when `VITE_API_URL` is not set:
```tsx
const apiUrlMissing = !import.meta.env.VITE_API_URL;
// …inside the returned JSX, above the form card:
{apiUrlMissing && (
  <div style={{
    background: '#fef3c7', border: '1px solid #f59e0b',
    borderRadius: '8px', padding: '12px', marginBottom: '16px',
    fontSize: '13px', color: '#92400e',
  }}>
    ⚠️ <strong>VITE_API_URL</strong> is not set. Requests will go to{' '}
    <code>localhost:3000</code>. Set it in your <code>.env</code> file.
  </div>
)}
```

**Files:**
- `apps/admin-panel/src/pages/Login.tsx`

**Verify:** `npm run build` in `apps/admin-panel` passes. With `VITE_API_URL` absent, the banner is visible on the login page.

---

## Fix 7 — Admin panel: distinguish 401 vs 403 vs network error

**Status: CONFIRMED BROKEN**

**Findings:**
- `Login.tsx` catch block:
  ```ts
  } catch {
    setError(t('login_error'));
  }
  ```
  The `api.ts` `request()` function throws `new Error(err.error || 'HTTP 401')` — a plain `Error` with no `status` property. However, the message string contains the HTTP status.
- `api.ts` line: `throw new Error(err.error || \`HTTP ${response.status}\`);`

**What to do:**
Update `api.ts` `request()` to include the status on the thrown error:
```ts
const thrownErr: any = new Error(err.error || `HTTP ${response.status}`);
thrownErr.status = response.status;
throw thrownErr;
```

Update `Login.tsx` catch to read `.status`:
```ts
} catch (err: any) {
  if (!err.status) {
    setError('Cannot reach the server. Check your network.');
  } else if (err.status === 401) {
    setError('Wrong phone number or password.');
  } else if (err.status === 403) {
    setError('Account suspended or not authorised. Contact your administrator.');
  } else {
    setError(t('login_error'));
  }
}
```

Also add the `userType` guard (overlaps with admin-panel intent): the admin panel's `Login.tsx` already checks `data.user.userType !== 'admin'` and calls `setError(t('login_error'))`. Change that to a distinct message:
```ts
if (data.user.userType !== 'admin') {
  setError('This account does not have admin access.');
  return;
}
```

**Files:**
- `apps/admin-panel/src/services/api.ts`
- `apps/admin-panel/src/pages/Login.tsx`

**Verify:** `npm run build` passes. Submit login with wrong password → "Wrong phone number or password." Submit with a non-admin account → "does not have admin access." Disconnect network → "Cannot reach the server."

---

## Fix 8 — Admin panel: create Setup.tsx page at /setup

**Status: CONFIRMED BROKEN**

**Findings:**
- `App.tsx` has no `/setup` route.
- There is no `Setup.tsx` file anywhere in `apps/admin-panel/src/pages/`.
- The backend **already has** `POST /auth/admin-register` with `X-Setup-Secret` header guard (confirmed in `auth.ts`).

**What to do:**
1. Create `apps/admin-panel/src/pages/Setup.tsx`:
   - Form fields: Name, Phone (+255 prefix), Password, Confirm Password, Setup Secret (password input).
   - On submit: calls `fetch(BASE_URL + '/auth/admin-register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Setup-Secret': setupSecret }, body: JSON.stringify({ name, phone, password }) })`.
   - On 201: show success message + link to `/login`.
   - On 403: "Invalid setup secret."
   - On 400: show `error` from response body.
   - The `BASE_URL` is read from `import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'` (copy the pattern from `api.ts`).
   - The page must NOT require authentication (sits outside `RequireAuth`).

2. Add to `App.tsx`:
   ```tsx
   import Setup from './pages/Setup';
   // in router array, before the protected route:
   { path: '/setup', element: <Setup /> },
   ```

**Files:**
- `apps/admin-panel/src/pages/Setup.tsx` — CREATE
- `apps/admin-panel/src/App.tsx` — add route + import

**Verify:** `npm run build` passes. Navigate to `/setup` → form renders. Submit with a valid `SETUP_SECRET` and new credentials → 201 response shown, redirected to `/login`.

---

## Fix 9 — Operator dashboard: field label says 'Email' but expects phone

**Status: CONFIRMED BROKEN**

**Findings:**
- `Login.tsx` line ~35: `{t('login_email')}` — this renders "Email" (confirmed in `en.json`: `"login_email": "Email"`) and "Barua Pepe" in Swahili.
- The placeholder is `+255 7xx xxx xxx` and `name="phone"`, so the field is clearly a phone input.
- Both `en.json` and `sw.json` have `login_email` as the label key but the i18n value says "Email".

**What to do:**
1. In `apps/operator-dashboard/src/i18n/en.json`, change:
   ```json
   "login_email": "Phone Number"
   ```
2. In `apps/operator-dashboard/src/i18n/sw.json`, change:
   ```json
   "login_email": "Nambari ya Simu"
   ```
3. In `Login.tsx`, the `htmlFor` attribute is `"email"` and the input `id` is `"email"`. Rename both to `"phone"` for correct label–input association (accessibility):
   - `htmlFor="email"` → `htmlFor="phone"`
   - `id="email"` → `id="phone"`

**Files:**
- `apps/operator-dashboard/src/i18n/en.json`
- `apps/operator-dashboard/src/i18n/sw.json`
- `apps/operator-dashboard/src/pages/Login.tsx`

**Verify:** `npm run build` in `apps/operator-dashboard` passes. Login page shows "Phone Number" label, not "Email".

---

## Fix 10 — Operator dashboard: userType check after login

**Status: CONFIRMED BROKEN**

**Findings:**
- `store/auth.ts` `login()` sets state from `res.data.user` without checking `userType`. Any user (passenger, driver) can log in with their credentials and access the operator dashboard.
- The admin panel `Login.tsx` already demonstrates the correct pattern: check `data.user.userType !== 'admin'` and throw/error if wrong.

**What to do:**
In `store/auth.ts`, after getting `res.data`, add a guard:
```ts
const userType = res.data.user?.userType;
if (userType !== 'operator' && userType !== 'admin') {
  set({ loading: false });
  throw new Error('ACCESS_DENIED');
}
```

In `Login.tsx`, update the catch to produce a meaningful message for this case:
```ts
} catch (err: any) {
  if (err?.message === 'ACCESS_DENIED') {
    setError('This account does not have operator access.');
  } else {
    setError(t('login_error'));
  }
}
```

**Files:**
- `apps/operator-dashboard/src/store/auth.ts`
- `apps/operator-dashboard/src/pages/Login.tsx`

**Verify:** Log in with a passenger phone/password → "This account does not have operator access." Log in with an operator account → proceeds to dashboard.

---

## Fix 11 — Operator dashboard: VITE_API_URL warning banner

**Status: CONFIRMED BROKEN** (same pattern as Fix 6)

**Findings:**
- `api.ts` falls back to `'http://localhost:3000/api/v1'` with no warning.
- `Login.tsx` has no banner.

**What to do:**
Add the same warning banner used in Fix 6, adapted to the operator dashboard's Tailwind styles:
```tsx
{!import.meta.env.VITE_API_URL && (
  <div className="mb-4 px-3 py-2 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm rounded-lg">
    ⚠️ <strong>VITE_API_URL</strong> is not set — requests go to localhost:3000.
    Set it in your <code>.env</code> file.
  </div>
)}
```
Add this just above the `<form>` element in `Login.tsx`.

**Files:**
- `apps/operator-dashboard/src/pages/Login.tsx`

**Verify:** `npm run build` passes. With `VITE_API_URL` absent, banner appears on login page.

---

## Fix 12 — Operator dashboard: better error messages (401, 403, network)

**Status: CONFIRMED BROKEN**

**Findings:**
- `Login.tsx` catch only distinguishes `ACCESS_DENIED` (after Fix 10). All other failures show generic `t('login_error')`.
- The axios interceptor in `api.ts` handles global 401 (redirects to `/login`), but the login form itself needs granular messages.

**What to do:**
In `Login.tsx` `handleSubmit` catch, expand the error handling after Fix 10's `ACCESS_DENIED` check:
```ts
} catch (err: any) {
  if (err?.message === 'ACCESS_DENIED') {
    setError('This account does not have operator access.');
  } else if (!err?.response) {
    setError('Cannot connect to server. Check your network.');
  } else if (err.response?.status === 401) {
    setError('Wrong phone number or password.');
  } else if (err.response?.status === 403) {
    setError('Account suspended. Contact your administrator.');
  } else {
    setError(t('login_error'));
  }
}
```

**Files:**
- `apps/operator-dashboard/src/pages/Login.tsx`

**Verify:** `npm run build` passes. Wrong password → 401 message. Suspended account → 403 message. No network → network message.

---

## Fix 13 — Passenger app: centralize hardcoded API URL into src/config.ts

**Status: CONFIRMED BROKEN**

**Findings:**
- `screens/LoginScreen.tsx` line 10: `const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';`
- This is a raw string directly in the screen. The driver app does the same in `src/services/api/client.ts`. If the URL changes, every file must be updated independently.

**What to do:**
1. Create `apps/passenger-app/src/config.ts`:
   ```ts
   export const API_BASE_URL =
     process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';
   ```
   Note: `src/` may not exist yet in passenger-app — check; if the file structure puts screens at the root level, create `config.ts` at the root of `apps/passenger-app/`.

2. In `screens/LoginScreen.tsx`, replace:
   ```ts
   const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';
   ```
   with:
   ```ts
   import { API_BASE_URL } from '../config';
   const API = API_BASE_URL;
   ```
   (Adjust relative path based on actual file placement.)

**Files:**
- `apps/passenger-app/config.ts` — CREATE (at passenger-app root alongside `App.tsx`)
- `apps/passenger-app/screens/LoginScreen.tsx`

**Verify:** `npx expo export --platform web 2>&1 | grep -i error` — no TypeScript errors. The import resolves correctly.

---

## Fix 14 — Passenger app: registration success feedback message

**Status: CONFIRMED BROKEN**

**Findings:**
- `screens/LoginScreen.tsx` `handleAuth()` on success (when `isRegister === true`):
  ```ts
  navigation.reset({ index: 0, routes: [{ name: authenticatedRole === 'driver' ? 'DriverMain' : 'MainTabs' }] });
  ```
  There is no success message or toast before navigation. The user just silently transitions to the main screen with no confirmation that registration worked.

**What to do:**
After a successful register, show a brief toast/Alert before navigating:
```ts
if (isRegister) {
  Alert.alert(
    i18n.t('success'),
    authenticatedRole === 'driver'
      ? 'Driver account created! Pending review before you can accept trips.'
      : 'Account created successfully! Welcome to SkyRex.',
    [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: authenticatedRole === 'driver' ? 'DriverMain' : 'MainTabs' }] }) }]
  );
} else {
  navigation.reset({ index: 0, routes: [{ name: authenticatedRole === 'driver' ? 'DriverMain' : 'MainTabs' }] });
}
```
Add `'success'` as a key to the i18n `en.json` / `sw.json` if it is missing (check `apps/passenger-app/i18n/` for the JSON file).

**Files:**
- `apps/passenger-app/screens/LoginScreen.tsx`

**Verify:** Register a new passenger account → Alert appears with welcome message before proceeding to MainTabs.

---

## Fix 15 — Passenger app: specific error messages in handleAuth catch block

**Status: CONFIRMED BROKEN**

**Findings:**
- `screens/LoginScreen.tsx` catch:
  ```ts
  Alert.alert(i18n.t('error'), err.response?.data?.error || i18n.t('auth_failed'));
  ```
  Network errors where `err.response` is undefined show a generic `auth_failed` string.

**What to do:**
Replace the catch body:
```ts
} catch (err: any) {
  const status = err.response?.status;
  let message: string;
  if (!err.response) {
    message = 'Cannot connect to server. Check your internet connection.';
  } else if (status === 401) {
    message = isRegister ? 'Registration failed. Invalid data.' : 'Wrong phone number or password.';
  } else if (status === 409 || (status === 400 && err.response?.data?.error?.toLowerCase().includes('already exists'))) {
    message = 'An account with this phone already exists. Try logging in.';
  } else if (status === 403) {
    message = 'Your account has been suspended. Contact support.';
  } else {
    message = err.response?.data?.error || i18n.t('auth_failed');
  }
  Alert.alert(i18n.t('error'), message);
}
```

**Files:**
- `apps/passenger-app/screens/LoginScreen.tsx`

**Verify:** Build passes. Attempt login with wrong password → specific "Wrong phone number or password" alert.

---

## Fix 16 — Passenger app: phone input guard — prevent deleting +255 prefix

**Status: CONFIRMED BROKEN**

**Findings:**
- `screens/LoginScreen.tsx`: `<TextInput ... value={phone} onChangeText={setPhone} keyboardType="phone-pad" />`
- `phone` initial state is `'+255'` but `onChangeText={setPhone}` directly replaces the value with whatever the user types. The user can delete the entire value including `+255`, causing the backend phone normalizer to fail or produce garbage.

**What to do:**
Replace `onChangeText={setPhone}` with a guarded handler:
```ts
const handlePhoneChange = (value: string) => {
  if (!value.startsWith('+255')) {
    // Restore prefix if deleted
    setPhone('+255');
  } else {
    setPhone(value);
  }
};
```
And in the JSX: `onChangeText={handlePhoneChange}`.

**Files:**
- `apps/passenger-app/screens/LoginScreen.tsx`

**Verify:** In the app, backspace all digits including `+255` prefix → the input snaps back to `+255` and cannot go below it.

---

## Fix 17 — Driver app: verify login() calls backend correctly, errors surface to UI

**Status: ALREADY CORRECT (with minor gap)**

**Findings:**
- `src/contexts/AuthContext.tsx` `login()`:
  ```ts
  const response = await APIClient.post<AuthResponse>('/auth/login', { phone: phoneNumber.trim(), password });
  ```
  This correctly calls `POST /auth/login` with the expected body.
- `APIClient.request()` in `src/services/api/client.ts` throws a plain `Error` with the message from `error.message || error.error || \`HTTP ${response.status}\`` when `!response.ok`.
- `src/screens/auth/LoginScreen.tsx` `handleLogin()`:
  ```ts
  Alert.alert(t('common.error'), error.message || 'Login failed');
  ```
  The `error.message` is set by `APIClient`, so the backend error message does surface.

**Gap (PARTIALLY BROKEN):** There is no `userType` guard in `AuthContext.login()`. A passenger can log in to the driver app using their credentials and reach the driver home screen.

**What to do:**
In `src/contexts/AuthContext.tsx`, inside the `login` function, after `normalizeUser`:
```ts
if (normalizedUser.type !== 'driver') {
  // Clean up storage since saveAuth already wrote
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
  throw new Error('This account is not registered as a driver.');
}
```

**Files:**
- `apps/driver-app/src/contexts/AuthContext.tsx`

**Verify:** Log in with a passenger phone/password → Alert shows "This account is not registered as a driver." Log in with a driver account → proceeds to driver home.

---

## Fix 18 — Driver app: RegisterScreen.tsx — verify fields

**Status: ALREADY CORRECT**

**Findings:**
- `src/screens/auth/RegisterScreen.tsx` **already exists** (confirmed by file listing).
- Fields present: Full Name, Phone Number (`vehicleNumber` → plate), License Number, Vehicle Type (car/bajaji/boda-boda), Password, Confirm Password.
- `handleRegister()` calls `useAuth().register(fullName, phoneNumber, password, licenseNumber, vehicleNumber, vehicleType)`.
- `AuthContext.register()` sends `{ name, phone, password, user_type: 'driver', license_number, plate_number, vehicle_type }` — matches backend exactly.
- All required driver fields are present.

**What to do:** No changes needed.

---

## Fix 19 — Driver app: userType guard — after login throw if not 'driver'

**Status: CONFIRMED BROKEN** (covered by Fix 17 above)

This fix is addressed as part of Fix 17. The guard in `AuthContext.login()` throws if `normalizedUser.type !== 'driver'`. No separate changes beyond Fix 17.

---

## Fix 20 — Backend: driver registration — verify creates driver_profiles AND vehicles records

**Status: ALREADY CORRECT**

**Findings:**
In `services/api-gateway/src/routes/auth.ts` `POST /auth/register`, inside the transaction:
```ts
const driverResult = await client.query(
  `INSERT INTO drivers (user_id, name, phone, email, license_number, status) VALUES …`,
  [user.id, user.name, user.phone, user.email, license.trim()]
);
await client.query(
  `INSERT INTO vehicles (driver_id, plate_number, vehicle_type) VALUES …`,
  [driverResult.rows[0].id, plate.trim(), normalizedVehicleType]
);
```
Both `drivers` and `vehicles` rows are created in the same transaction. The existing test `creates driver and vehicle profiles in the account transaction` also covers this.

**What to do:** No changes needed.

---

## Fix 21 — Backend: error message improvements — 409 for duplicate phone, 401 for wrong password, 403 for suspended

**Status: PARTIALLY BROKEN**

**Findings:**
- `POST /auth/login`: returns `401` for wrong password ✅, `403` for suspended ✅, `401` for user not found ✅. **Correct.**
- `POST /auth/register` duplicate phone: returns `400` with message `'Account already exists with this phone number'`. The HTTP spec calls for `409 Conflict` for resource conflicts. This is **incorrect** per the task requirement.

**What to do:**
In `POST /auth/register`, find the duplicate check:
```ts
if (existing.rows.length > 0) {
  await client.query('ROLLBACK');
  return res.status(400).json({ error: 'Account already exists with this phone number' });
}
```
Change `400` to `409`:
```ts
return res.status(409).json({ error: 'Account already exists with this phone number' });
```

**Files:**
- `services/api-gateway/src/routes/auth.ts`

**Verify:** Run `cd services/api-gateway && npm test -- --testPathPattern="auth"` — the existing test "returns 400 when the phone number is already registered" must be updated to expect `409` first, then the backend test passes. Also update the test expectation:
```ts
// In __tests__/routes/auth.test.ts:
expect(res.status).toBe(409); // was 400
```

**Files also changed:**
- `services/api-gateway/src/__tests__/routes/auth.test.ts` — update the duplicate-phone test expectation to `409`

---

## Fix 22 — Backend: admin-register endpoint — verify or add POST /auth/admin-register

**Status: ALREADY CORRECT**

**Findings:**
`services/api-gateway/src/routes/auth.ts` already contains `POST /auth/admin-register` (bottom of the file):
- Checks `process.env.SETUP_SECRET` is set; returns `403` if absent.
- Validates `req.headers['x-setup-secret'] === setupSecret`; returns `403` on mismatch.
- Requires `phone`, `password`, `name`; returns `400` if missing.
- Inserts into `users` with `user_type = 'admin'`.
- Returns `201` with `{ message, token, user }`.

**What to do:** No changes needed. Ensure `SETUP_SECRET` is documented in the API gateway `.env.example`. Check:

```bash
grep -i SETUP_SECRET /home/masalago/projects/daladala/services/api-gateway/.env.example
```

If absent, add `SETUP_SECRET=` to that file.

**Files:**
- `services/api-gateway/.env.example` — add `SETUP_SECRET=` line if missing

**Verify:** `npm test -- --testPathPattern="auth"` in `services/api-gateway` — all auth tests pass. POST to `/auth/admin-register` with correct header → 201. Without header → 403.

---

## Summary Table

| # | App | Status | Action |
|---|-----|--------|--------|
| 1 | Public website | BROKEN | Create ForgotPasswordPage, add route, fix `<a>` → `<Link>` |
| 2 | Public website | BROKEN | Remove broken driver redirect (was → `/become-a-driver`) |
| 3 | Public website | BROKEN | Move Firebase config to VITE_FIREBASE_* env vars, wrap in try/catch |
| 4 | Public website | BROKEN | Specific 401/403/network error messages in login + register |
| 5 | Public website | BROKEN | Differentiate passenger vs driver post-register redirect |
| 6 | Admin panel | BROKEN | Add VITE_API_URL warning banner to Login.tsx |
| 7 | Admin panel | BROKEN | Add status to thrown error in api.ts; 401/403/network messages in Login.tsx |
| 8 | Admin panel | BROKEN | Create Setup.tsx page at /setup for admin-register |
| 9 | Operator dash | BROKEN | Fix "Email" label → "Phone Number" in en.json, sw.json, and Login.tsx `htmlFor` |
| 10 | Operator dash | BROKEN | Add userType guard in auth store (throw if not operator/admin) |
| 11 | Operator dash | BROKEN | Add VITE_API_URL warning banner to Login.tsx |
| 12 | Operator dash | BROKEN | Specific 401/403/network messages in Login.tsx |
| 13 | Passenger app | BROKEN | Create config.ts with API_BASE_URL; import in LoginScreen.tsx |
| 14 | Passenger app | BROKEN | Alert after successful registration before navigation |
| 15 | Passenger app | BROKEN | Specific error messages in handleAuth catch block |
| 16 | Passenger app | BROKEN | Guard phone input against deleting +255 prefix |
| 17 | Driver app | BROKEN | Add userType guard in AuthContext.login() — throw if not 'driver' |
| 18 | Driver app | CORRECT | RegisterScreen.tsx exists with all required fields |
| 19 | Driver app | BROKEN | Covered by Fix 17 |
| 20 | Backend | CORRECT | driver_profiles AND vehicles both created in transaction |
| 21 | Backend | BROKEN | Change duplicate-phone response from 400 → 409; update test |
| 22 | Backend | CORRECT | /auth/admin-register endpoint exists; add SETUP_SECRET to .env.example |

---

## Build & Test Commands

| App | Build | Test |
|-----|-------|------|
| `apps/public-website` | `cd apps/public-website && npm run build` | No test framework (TypeScript compile via build) |
| `apps/admin-panel` | `cd apps/admin-panel && npm run build` | No test framework |
| `apps/operator-dashboard` | `cd apps/operator-dashboard && npm run build` | No test framework |
| `apps/passenger-app` | `cd apps/passenger-app && npx expo export --platform web` | No dedicated test |
| `apps/driver-app` | `cd apps/driver-app && npx tsc --noEmit` | `cd apps/driver-app && npm test` (if configured) |
| `services/api-gateway` | `cd services/api-gateway && npm run build` | `cd services/api-gateway && npm test -- --testPathPattern="auth"` |

After all fixes are applied, run the full backend test suite:
```
cd services/api-gateway && npm test
```
Expected: all auth tests pass including the updated `409` expectation for duplicate phone.

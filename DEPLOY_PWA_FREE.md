# 🚀 Deploy Safiri Haraka as PWAs on Vercel (100% FREE)

Complete guide to deploy all 3 apps for **$0/month forever**.

---

## ✅ What We're Deploying:

1. **Public Website** (Marketing) → Already built ✅
2. **Passenger PWA** (Book rides) → Use existing web-app
3. **Driver PWA** (Accept rides) → Convert from driver-app

**Total Cost: $0** ✅

---

## 📱 Strategy: Use Existing Web-Platform!

**Good news:** You already have `apps/web-platform` which is a React web app! We can use this as the base for both passenger and driver PWAs.

---

## 🎯 Step-by-Step Deployment:

### **Step 1: Login to Vercel**

```bash
cd /home/masalago/projects/daladala
vercel login
```

This opens your browser - click "Confirm" to login.

---

### **Step 2: Deploy Public Website**

```bash
cd apps/public-website
vercel --prod
```

**Result:** `https://safiriharaka.vercel.app` or your custom domain

---

### **Step 3: Deploy Passenger/Driver Web Platform**

```bash
cd apps/web-platform
vercel --prod
```

**Result:** `https://safiriharaka-app.vercel.app`

This single deployment serves BOTH passengers and drivers with different routes:
- `/passenger/*` - Passenger features
- `/driver/*` - Driver features

---

## 🔧 Alternative: Vercel Dashboard (No CLI)**

If `vercel login` doesn't work, use the dashboard:

### **Deploy Public Website:**

1. Go to https://vercel.com/dashboard
2. Click **"Add New" → "Project"**
3. **Import Git Repository**:
   - Select: `kabulamoshi3-cloud/safiri-salama`
4. **Configure Project**:
   ```
   Project Name: safiriharaka-public
   Framework Preset: Vite
   Root Directory: apps/public-website
   Build Command: npm run build
   Output Directory: dist
   ```
5. **Environment Variables**:
   ```
   VITE_API_URL=https://simon-daladala-api.vercel.app/api/v1
   ```
6. Click **Deploy** 🚀

**Done!** Website live in 2 minutes.

---

### **Deploy Web Platform (Passenger + Driver):**

1. Go to https://vercel.com/dashboard
2. Click **"Add New" → "Project"**
3. **Import Same Repository**:
   - Select: `kabulamoshi3-cloud/safiri-salama`
4. **Configure Project**:
   ```
   Project Name: safiriharaka-app
   Framework Preset: Vite
   Root Directory: apps/web-platform
   Build Command: npm run build
   Output Directory: dist
   ```
5. **Environment Variables**:
   ```
   VITE_API_URL=https://simon-daladala-api.vercel.app/api/v1
   VITE_FIREBASE_API_KEY=AIzaSyBkDgINXZ6talT1JByhytoTsiUNv8JVoo8
   VITE_FIREBASE_AUTH_DOMAIN=safiri-salama-838eb.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=safiri-salama-838eb
   ```
6. Click **Deploy** 🚀

**Done!** App live in 2 minutes.

---

## 📱 Make It Installable (PWA):

Users can "Add to Home Screen" to install as app:

### **On Android (Chrome):**
1. Visit the URL
2. Tap menu (⋮)
3. Select "Install app" or "Add to Home screen"
4. App appears on home screen like native app!

### **On iOS (Safari):**
1. Visit the URL
2. Tap Share button
3. Select "Add to Home Screen"
4. App appears on home screen!

---

## 🔗 Final URLs:

After deployment, you'll have:

| App | URL | Purpose |
|-----|-----|---------|
| **Public Website** | `https://safiriharaka.vercel.app` | Marketing, sign up |
| **Passenger App** | `https://safiriharaka-app.vercel.app/passenger` | Book rides |
| **Driver App** | `https://safiriharaka-app.vercel.app/driver` | Accept rides |

---

## 📲 Share Links with Users:

### **For Passengers:**
```
Visit: https://safiriharaka-app.vercel.app/passenger
Then tap "Add to Home Screen"
```

### **For Drivers:**
```
Visit: https://safiriharaka-app.vercel.app/driver
Then tap "Add to Home Screen"
```

---

## 🎨 Custom Domains (Optional - Still FREE):

Want `app.safiriharaka.com` instead of `.vercel.app`?

1. Buy domain from Namecheap/GoDaddy (~$10/year)
2. In Vercel dashboard → Settings → Domains
3. Add custom domain
4. Update DNS records (Vercel shows you how)

**Cost:** ~$10/year for domain (optional)

---

## 📊 What You Get (All FREE):

✅ **Public Website**
- Marketing pages
- Driver sign-up
- About, Help, Contact
- Animated hero section

✅ **Passenger PWA**
- Book rides
- Track driver live (when app open)
- Payment methods
- Trip history
- Works offline (cached)

✅ **Driver PWA**
- Accept rides
- Navigate to passenger
- GPS tracking (foreground)
- Earnings tracker
- Works offline

✅ **Backend API**
- Already deployed on Vercel
- Connected to Neon database
- All endpoints working

---

## ⚠️ GPS Tracking Limitations:

### **What Works:**
✅ Real-time tracking when app is open
✅ Passenger sees driver approaching
✅ Driver sees passenger location
✅ Route display on map

### **What Doesn't Work:**
❌ Background tracking (when driver uses other apps)
❌ Screen-off tracking
❌ Continuous tracking during phone calls

### **Workaround:**
Drivers must keep PWA open during trip. Add this instruction in the app:

```
"Keep this app open during trips for accurate tracking"
```

---

## 🚀 Deploy NOW (Quick Commands):

```bash
# 1. Login
vercel login

# 2. Deploy public website
cd /home/masalago/projects/daladala/apps/public-website
vercel --prod

# 3. Deploy web platform (passenger + driver)
cd /home/masalago/projects/daladala/apps/web-platform  
vercel --prod

# Done! Both apps live in 5 minutes
```

---

## 💰 Total Cost:

| Item | Cost |
|------|------|
| Vercel hosting | $0/month |
| Database (Neon) | $0/month |
| Backend API | $0/month |
| SSL certificates | $0/month |
| CDN | $0/month |
| **TOTAL** | **$0/month** ✅ |

---

## 📝 Update Download Links:

After deployment, update these files with real PWA URLs:

1. `apps/public-website/src/pages/HomePage.tsx`
2. `apps/public-website/src/pages/ServicesPage.tsx`
3. `apps/public-website/src/components/Footer.tsx`

Replace:
```javascript
href="https://play.google.com/store/apps/details?id=com.safiriharaka.passenger"
```

With:
```javascript
href="https://safiriharaka-app.vercel.app/passenger"
```

---

## ✅ Deployment Checklist:

- [ ] Run `vercel login`
- [ ] Deploy public-website
- [ ] Deploy web-platform
- [ ] Test on mobile browser
- [ ] Try "Add to Home Screen"
- [ ] Test passenger features
- [ ] Test driver features
- [ ] Update download links
- [ ] Share with beta users!

---

## 🆘 Troubleshooting:

**Can't login to Vercel?**
- Use dashboard method instead
- Go to https://vercel.com/dashboard
- Import from GitHub

**Build failing?**
- Check `package.json` has all dependencies
- Run `npm install` first
- Try `npm run build` locally

**PWA not installing?**
- Must be HTTPS (Vercel provides this)
- Check manifest.json exists
- Try on different browser

---

## 🎉 You're Done!

Your entire platform is now live for **$0/month**!

Share these links:
- Website: Your Vercel URL
- Passenger: `[URL]/passenger`
- Driver: `[URL]/driver`

Need help? Let me know!

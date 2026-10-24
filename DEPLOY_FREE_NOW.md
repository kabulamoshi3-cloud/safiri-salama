# 🚀 Deploy Safiri Haraka Platform (100% FREE)

All components ready to deploy at zero cost!

## ✅ What You Have

### 1. **Database** (Already Live)
- **Provider**: Neon PostgreSQL (Free tier)
- **URL**: `postgresql://neondb_owner:npg_IqCnj7AV6BFy@ep-blue-firefly-zak4q38h-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Status**: ✅ LIVE & CONNECTED

### 2. **Backend API** (Already Live)
- **Provider**: Vercel
- **URL**: https://simon-daladala-api.vercel.app/api/v1
- **Status**: ✅ LIVE & WORKING

### 3. **Vercel Account** (Ready)
- **Project ID**: `prj_PkFDtBkGLVFHRYD1sKgavPWTLGGK`
- **Org ID**: `team_qyjPGWX8Ue0PozrtNvajZd70`
- **Project**: `safiri-salama`

### 4. **Firebase** (Ready for Mobile Apps)
- **Project**: `safiri-salama-838eb`
- **API Key**: `AIzaSyBkDgINXZ6talT1JByhytoTsiUNv8JVoo8`
- **Status**: ✅ CONFIGURED

---

## 🌐 Deploy Public Website (FREE)

### Option A: Vercel CLI (Recommended)
```bash
# Login to Vercel (opens browser)
cd /home/masalago/projects/daladala/apps/public-website
vercel login

# Deploy to production
vercel --prod
```

### Option B: Vercel Dashboard (No CLI needed)
1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select GitHub repo: `kabulamoshi3-cloud/safiri-salama`
4. Root Directory: `apps/public-website`
5. Framework: Vite
6. Build Command: `npm run build`
7. Output Directory: `dist`
8. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://simon-daladala-api.vercel.app/api/v1`
9. Click **Deploy**

**Result**: Website will be live at `https://safiri-salama-public.vercel.app`

---

## 🏢 Deploy Staff Portal (FREE)

### Option A: Vercel CLI
```bash
cd /home/masalago/projects/daladala/apps/staff-portal
vercel --prod
```

### Option B: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select same GitHub repo
4. Root Directory: `apps/staff-portal`
5. Framework: Vite
6. Build Command: `npm run build`
7. Output Directory: `dist`
8. Add Environment Variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://simon-daladala-api.vercel.app/api/v1`
9. Click **Deploy**

**Result**: Staff portal at `https://safiri-salama-staff.vercel.app`

---

## 📱 Deploy Mobile Apps (FREE)

### Prerequisites
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login
```

### Deploy Passenger App
```bash
cd /home/masalago/projects/daladala/apps/passenger-app

# Configure EAS
eas build:configure

# Build for Android (FREE)
eas build --platform android --profile production

# Build for iOS (FREE - requires Apple Developer account)
eas build --platform ios --profile production

# Submit to stores (after builds complete)
eas submit --platform android
eas submit --platform ios
```

### Deploy Driver App
```bash
cd /home/masalago/projects/daladala/apps/driver-app

# Build for Android (FREE)
eas build --platform android --profile production

# Build for iOS (FREE)
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

**Result**: Apps available on Google Play & App Store

---

## 🎯 Quick Deploy Everything NOW

### Step 1: Login to Vercel
```bash
vercel login
```
This opens your browser - just click "Confirm"

### Step 2: Deploy Public Website
```bash
cd /home/masalago/projects/daladala/apps/public-website
vercel --prod --yes
```

### Step 3: Deploy Staff Portal
```bash
cd /home/masalago/projects/daladala/apps/staff-portal
vercel --prod --yes
```

### Step 4: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 5: Build Mobile Apps
```bash
# Passenger app
cd /home/masalago/projects/daladala/apps/passenger-app
eas build --platform android --profile production

# Driver app
cd /home/masalago/projects/daladala/apps/driver-app
eas build --platform android --profile production
```

---

## 📝 Update App Store Links

After deployment, update these files with real URLs:

1. **apps/public-website/src/pages/HomePage.tsx**
2. **apps/public-website/src/pages/ServicesPage.tsx**
3. **apps/public-website/src/components/Footer.tsx**

Replace placeholder links:
- `https://play.google.com/store/apps/details?id=com.safiriharaka.passenger`
- `https://play.google.com/store/apps/details?id=com.safiriharaka.driver`

---

## 💰 Cost Breakdown

| Service | Provider | Cost |
|---------|----------|------|
| Database | Neon PostgreSQL | **$0/month** (0.5GB limit) |
| Backend API | Vercel | **$0/month** (100GB bandwidth) |
| Public Website | Vercel | **$0/month** |
| Staff Portal | Vercel | **$0/month** |
| Mobile Builds | Expo EAS | **$0/month** (30 builds/month) |
| **TOTAL** | | **$0/month** ✅ |

---

## 🔗 Final URLs (After Deployment)

- 🌐 **Public Website**: https://safiri-salama-public.vercel.app
- 🏢 **Staff Portal**: https://safiri-salama-staff.vercel.app
- 🔧 **Backend API**: https://simon-daladala-api.vercel.app/api/v1
- 📱 **Passenger App**: Google Play + App Store
- 🚗 **Driver App**: Google Play + App Store

---

## ✅ Deployment Checklist

- [ ] Login to Vercel (`vercel login`)
- [ ] Deploy public website
- [ ] Deploy staff portal
- [ ] Install EAS CLI
- [ ] Build passenger app
- [ ] Build driver app
- [ ] Submit to Google Play
- [ ] Submit to App Store
- [ ] Update app store links in website
- [ ] Test all deployments
- [ ] Share links with users!

---

## 🆘 Need Help?

**Vercel not logging in?**
```bash
vercel login --token YOUR_VERCEL_TOKEN
```

**EAS build failing?**
Check `app.json` has correct `eas.projectId`

**Apps not connecting to API?**
Verify `.env` files have correct `EXPO_PUBLIC_API_URL`

---

Ready to deploy? Start with: `vercel login`

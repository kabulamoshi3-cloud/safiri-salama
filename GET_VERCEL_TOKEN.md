# 🔑 Get Your Vercel Token & Deploy

## Step 1: Get Vercel Token (Takes 1 minute)

1. Go to: https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name it: `safiriharaka-deployment`
4. Scope: **Full Account**
5. Click **"Create"**
6. **Copy the token** (it looks like: `v1_xxxxxxxxx...`)

---

## Step 2: Set Token & Deploy

Once you have the token, run these commands:

```bash
# Set the token as environment variable
export VERCEL_TOKEN="YOUR_TOKEN_HERE"

# Or login directly
vercel login
```

---

## Step 3: Deploy All Apps (Using Token)

### Option A: Using Token Directly

```bash
# Deploy Public Website
cd /home/masalago/projects/daladala/apps/public-website
vercel --prod --token=$VERCEL_TOKEN

# Deploy Web Platform (Passenger + Driver)
cd /home/masalago/projects/daladala/apps/web-platform
vercel --prod --token=$VERCEL_TOKEN
```

### Option B: Interactive Login (Easier)

```bash
# Just login once
vercel login

# Then deploy
cd /home/masalago/projects/daladala/apps/public-website
vercel --prod

cd /home/masalago/projects/daladala/apps/web-platform
vercel --prod
```

---

## 🎯 Quick Commands (Copy & Paste)

After you get the token:

```bash
# 1. Login
vercel login

# 2. Deploy public website
cd /home/masalago/projects/daladala/apps/public-website && vercel --prod

# 3. Deploy web platform
cd /home/masalago/projects/daladala/apps/web-platform && vercel --prod
```

Done! 🚀

---

## Alternative: Use Vercel Dashboard (No Token Needed)

If you can't get CLI working, use the dashboard:

1. Go to: https://vercel.com/new
2. Import: `kabulamoshi3-cloud/safiri-salama`
3. Root Directory: `apps/public-website`
4. Click Deploy

Repeat for `apps/web-platform`

---

**Ready?** Get your token from https://vercel.com/account/tokens then tell me!

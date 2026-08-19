# Manual Setup Guide for DalaSmart

## Current Situation

✅ **Good news**: All code is implemented and npm dependencies are installed!  
⚠️ **Issue**: Your Anaconda PostgreSQL installation is incomplete (missing `psql.exe`)

## Option 1: Use Full PostgreSQL Installation (Recommended)

### Step 1: Install PostgreSQL

Download and install full PostgreSQL from:
**https://www.postgresql.org/download/windows/**

- Choose version 15 or 16
- Use default settings
- **Important**: Remember the password you set for `postgres` user

### Step 2: Create Database

Open **SQL Shell (psql)** from Start Menu or Command Prompt:

```sql
-- Connect (press Enter for defaults, then enter password)
CREATE DATABASE dalasmart;
\q
```

### Step 3: Configure Environment

Create file: `services\api-gateway\.env`

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dalasmart
JWT_SECRET=change-this-random-secret-key
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

### Step 4: Run Migrations

```powershell
cd "c:\project\INF 319\dalasmart\services\api-gateway"
npm run migrate
npm run seed
```

### Step 5: Start Services

**Terminal 1:**
```powershell
cd "c:\project\INF 319\dalasmart\services\api-gateway"
npm run dev
```

**Terminal 2:**
```powershell
cd "c:\project\INF 319\dalasmart\apps\driver-dashboard"
npm run dev
```

**Terminal 3:**
```powershell
cd "c:\project\INF 319\dalasmart\apps\web-platform"
npm run dev
```

---

## Option 2: Use Docker PostgreSQL

If you have Docker installed:

```powershell
# Start PostgreSQL container
docker run --name dalasmart-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 5432:5432 `
  -d postgres:15

# Wait 5 seconds for startup
Start-Sleep 5

# Create database
docker exec -it dalasmart-postgres psql -U postgres -c "CREATE DATABASE dalasmart;"
```

Then follow steps 3-5 from Option 1.

---

## Option 3: Use pgAdmin (GUI Tool)

If you prefer a graphical interface:

1. Download **pgAdmin** from https://www.pgadmin.org/download/
2. Connect to your PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name it `dalasmart`
5. Follow steps 3-5 from Option 1

---

## Quick Verification

Once setup is complete:

```powershell
# Test backend API
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}

# Test features endpoint
curl http://localhost:3000/api/v1/features

# Should return:
# {"status":"ok","features":{...}}
```

Open in browser:
- Backend API: http://localhost:3000/health
- Driver Dashboard: http://localhost:5173
- Web Platform: http://localhost:5174

---

## What's Already Done ✅

- ✅ All 7 backend features implemented
- ✅ Frontend apps (Driver Dashboard & Web Platform)
- ✅ Database schema (20 tables)
- ✅ Migration scripts
- ✅ Seed data (promos, plans, restaurants)
- ✅ npm dependencies installed
- ✅ Documentation

**Only missing**: PostgreSQL server setup and database creation!

---

## Troubleshooting

### "Cannot connect to database"
- Ensure PostgreSQL is running
- Check password in `.env` matches postgres user password
- Verify port 5432 is not blocked

### "Migration failed"
- Database must be empty for first migration
- Check DATABASE_URL in `.env` is correct
- Ensure postgres user has CREATE privileges

### "Port 3000 already in use"
- Change PORT in `.env` to 3001
- Or kill process using port: `netstat -ano | findstr :3000`

---

## Need Help?

Check these files:
- `QUICKSTART.md` - Detailed setup guide
- `DEPLOYMENT_GUIDE.md` - Production deployment
- `IMPLEMENTATION_STATUS.md` - What's built

Or search for your error message online - PostgreSQL setup is well-documented!

---

**You're almost there! Just need to setup PostgreSQL properly.** 🚀

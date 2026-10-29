# SkyRex Quick Start Guide

## 🚀 Getting Started

This guide will get SkyRex running locally in under 10 minutes.

---

## Prerequisites

- **Node.js** v18+ and npm
- **PostgreSQL** 14+
- **Git**

---

## Step 1: Clone & Install

```bash
cd "c:\project\INF 319\skyrex"

# Install API Gateway dependencies
cd services/api-gateway
npm install

# Install Driver Dashboard dependencies
cd ../../apps/driver-dashboard
npm install

# Install Web Platform dependencies
cd ../web-platform
npm install
```

---

## Step 2: Database Setup

### Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE skyrex;
\q
```

### Configure Connection

Create `.env` in `services/api-gateway`:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/skyrex

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=3000
NODE_ENV=development

# CORS (allow web apps to connect)
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# WhatsApp (optional - Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+1234567890
```

### Run Migrations & Seed Data

```bash
cd services/api-gateway

# Run all migrations
npm run migrate

# Seed initial data (promo codes, subscription plans, restaurants)
npm run seed

# Or do both at once
npm run db:setup
```

**Expected Output:**
```
✓ Connected to database
✓ Migration tracking table ready
✓ Found 0 previously executed migrations

→ Running 1 pending migration(s)...

  [008] 008_add_features.sql
  ✓ Applied successfully

✓ All migrations applied successfully!

→ Seeding promo codes...
  ✓ Seeded 4 promo codes
→ Seeding subscription plans...
  ✓ Seeded 3 subscription plans
→ Seeding restaurants...
  ✓ Seeded 4 restaurants
→ Seeding support agents...
  ✓ Seeded 4 support agents

✓ Database seeded successfully!
```

---

## Step 3: Start Backend API

```bash
cd services/api-gateway
npm run dev
```

**Expected Output:**
```
[api-gateway] API Gateway running on port 3000
[api-gateway] Environment: development
```

**Test it:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-19T...",
  "uptime": 5.234
}
```

---

## Step 4: Start Driver Dashboard

```bash
cd apps/driver-dashboard
npm run dev
```

**Access:** http://localhost:5173

---

## Step 5: Start Web Platform

```bash
cd apps/web-platform
npm run dev
```

**Access:** http://localhost:5174

---

## 🎯 Quick Test Checklist

### Backend API
- [ ] Health check: `curl http://localhost:3000/health`
- [ ] Features endpoint: `curl http://localhost:3000/api/v1/features`

### Database
- [ ] Migrations applied (check `schema_migrations` table)
- [ ] Promo codes seeded (check `promo_codes` table)
- [ ] Subscription plans seeded (check `subscription_plans` table)

### Driver Dashboard
- [ ] Opens at http://localhost:5173
- [ ] Shows login screen
- [ ] Can navigate to pages

### Web Platform
- [ ] Opens at http://localhost:5174
- [ ] Shows login screen
- [ ] Responsive on mobile

---

## 🧪 Test Accounts & Data

### Promo Codes (already seeded)
- `WELCOME2024` - 30% off first 3 rides
- `HOLIDAY50` - 50% off
- `FLAT500` - Sh500 discount
- `NEWUSER` - 40% off first ride

### Subscription Plans
- **SkyRex Plus**: Sh10,000/month (10% discount)
- **SkyRex Pro**: Sh20,000/month (15% discount)
- **SkyRex Business**: Sh100,000/month (20% discount)

### Restaurants (Food Delivery)
- Mama Oliech Restaurant
- Java House
- KFC Kenya
- Artcaffe

---

## 📡 API Endpoints

### Promo Codes
```
POST   /api/v1/promo/validate        - Validate promo code
POST   /api/v1/promo/redeem          - Redeem code for trip
GET    /api/v1/promo/available       - List available promos
POST   /api/v1/promo/create          - Admin: Create promo
GET    /api/v1/promo/stats           - Admin: Get statistics
```

### Referral Program
```
POST   /api/v1/referral/generate-link       - Generate referral link
POST   /api/v1/referral/register-with-code  - Sign up with referral
POST   /api/v1/referral/claim-bonus         - Claim referrer bonus
GET    /api/v1/referral/stats               - Get stats
GET    /api/v1/referral/list                - List referrals
```

### Driver Incentives
```
POST   /api/v1/driver-incentives/track-trip  - Track trip & calculate bonuses
POST   /api/v1/driver-incentives/set-target  - Admin: Set target
GET    /api/v1/driver-incentives/stats       - Get driver stats
GET    /api/v1/driver-incentives/history     - Get history
GET    /api/v1/driver-incentives/leaderboard - Top drivers
```

### Subscriptions
```
GET    /api/v1/subscription/plans       - Get available plans
POST   /api/v1/subscription/subscribe   - Subscribe to plan
GET    /api/v1/subscription/status      - Get subscription status
GET    /api/v1/subscription/benefits    - Get plan benefits
POST   /api/v1/subscription/cancel      - Cancel subscription
POST   /api/v1/subscription/upgrade     - Upgrade plan
```

### Support System
```
POST   /api/v1/support/create-ticket         - Create ticket
POST   /api/v1/support/send-message          - Send message
GET    /api/v1/support/tickets               - Get user tickets
GET    /api/v1/support/tickets/:id/messages  - Get messages
POST   /api/v1/support/whatsapp-webhook      - Receive WhatsApp
POST   /api/v1/support/resolve-ticket        - Admin: Resolve
GET    /api/v1/support/stats                 - Admin: Stats
```

### Corporate Accounts
```
POST   /api/v1/corporate/register        - Register company
GET    /api/v1/corporate/account         - Get account details
POST   /api/v1/corporate/add-employee    - Add employee
GET    /api/v1/corporate/employees       - List employees
GET    /api/v1/corporate/my-allowance    - Employee allowance
POST   /api/v1/corporate/book-trip       - Book with allowance
GET    /api/v1/corporate/billing-history - Billing history
```

### Food Delivery
```
GET    /api/v1/food/restaurants              - Get nearby restaurants
GET    /api/v1/food/restaurants/:id/menu    - Get menu
POST   /api/v1/food/orders                  - Place order
GET    /api/v1/food/orders                  - Get orders
GET    /api/v1/food/orders/:id/track        - Track order
POST   /api/v1/food/orders/:id/rate         - Rate order
POST   /api/v1/food/restaurants/register    - Admin: Register restaurant
GET    /api/v1/food/stats                   - Admin: Stats
```

---

## 🔧 Common Commands

### Database
```bash
# Run migrations
npm run migrate

# Seed data
npm run seed

# Reset database (caution!)
psql -U postgres -d skyrex < migrations/008_add_features.sql
```

### Development
```bash
# Start API Gateway (backend)
cd services/api-gateway && npm run dev

# Start Driver Dashboard
cd apps/driver-dashboard && npm run dev

# Start Web Platform
cd apps/web-platform && npm run dev

# Build for production
npm run build

# Run tests
npm test
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `pg_isready`
- Verify connection string in `.env`
- Check database exists: `psql -U postgres -l | grep skyrex`

### "Port 3000 already in use"
- Change PORT in `.env` to 3001 or another available port
- Kill existing process: `lsof -ti:3000 | xargs kill` (Mac/Linux)

### "Migration failed"
- Check PostgreSQL version (need 14+)
- Ensure database is empty or run: `DROP DATABASE skyrex; CREATE DATABASE skyrex;`
- Re-run: `npm run migrate`

### "API returns 401 Unauthorized"
- Check JWT_SECRET is set in `.env`
- Verify token is included in Authorization header: `Bearer <token>`

### Frontend can't connect to API
- Check CORS_ORIGIN in backend `.env` includes frontend URL
- Verify API is running on expected port
- Check browser console for CORS errors

---

## 📚 Documentation

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Features README**: `FEATURES_README.md`
- **API Tests**: `services/api-gateway/tests/features.test.ts`
- **Database Schema**: `services/api-gateway/migrations/008_add_features.sql`

---

## 🎉 What's Working

✅ **7 Complete Features**
- Promo Code System
- Referral Program
- Driver Incentive Program
- Subscription Service
- Support System (WhatsApp + Live Chat)
- Corporate Accounts (B2B)
- Food Delivery Service

✅ **Frontend Apps**
- Driver Dashboard (React + TypeScript + Tailwind)
- Web Platform (React + TypeScript + Tailwind)

✅ **Backend**
- RESTful API with JWT auth
- PostgreSQL database with migrations
- Rate limiting & error handling
- Comprehensive test suite

---

## 🚧 What's Next

**Phase 1** (This Week):
- Mobile UI integration (React Native apps)
- Payment gateway integration (M-Pesa, Stripe)
- Real-time features (WebSockets for live tracking)

**Phase 2** (Next 2 Weeks):
- Integration testing
- Performance optimization
- Security audit
- Load testing

**Phase 3** (Month 2):
- Production deployment
- Monitoring & analytics
- User onboarding
- Marketing launch

---

## 💡 Tips

1. **Use Postman/Insomnia** to test API endpoints
2. **Check logs** in terminal for debugging
3. **Use pgAdmin** to inspect database
4. **Enable React DevTools** for frontend debugging
5. **Read error messages carefully** - they're descriptive!

---

## 🆘 Need Help?

- Check `DEPLOYMENT_GUIDE.md` for detailed setup
- Review test suite in `tests/features.test.ts`
- Inspect database schema in `migrations/008_add_features.sql`
- Open an issue with error logs and steps to reproduce

---

**Happy coding! 🚀**

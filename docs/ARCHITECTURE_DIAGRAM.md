# 🔗 API Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BUSINESS SAAS PLATFORM                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│   FRONTEND       │────────▶│    BACKEND       │────────▶│   DATABASE       │
│   (Next.js)      │         │    (NestJS)      │         │  (PostgreSQL)    │
│                  │         │                  │         │                  │
│   Port 3000      │         │   Port 3001      │         │   Port 5432      │
│                  │         │                  │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        │                            │                             │
        │                            │                             │
        ▼                            ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│  3 USER TYPES    │         │  12 API MODULES  │         │   15 TABLES      │
│                  │         │                  │         │                  │
│  • User          │         │  • Auth          │         │  • users         │
│  • Vendor        │         │  • Users         │         │  • vendors       │
│  • Admin         │         │  • Vendors       │         │  • businesses    │
│                  │         │  • Businesses    │         │  • categories    │
│                  │         │  • Categories    │         │  • reviews       │
│                  │         │  • Reviews       │         │  • leads         │
│                  │         │  • Leads         │         │  • favorites     │
│                  │         │  • Subscriptions │         │  • subscriptions │
│                  │         │  • Search        │         │  • transactions  │
│                  │         │  • Admin         │         │  • notifications │
│                  │         │  • Notifications │         │  • amenities     │
│                  │         │  • Stripe        │         │  • ...           │
│                  │         │                  │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

---

## User Type Flows

### 👤 USER SIDE FLOW

```
User Browser
    │
    ├─▶ Browse Businesses ──▶ api.user.searchBusinesses() ──▶ GET /businesses/search
    │                                                              │
    ├─▶ View Details ──────▶ api.user.getBusinessById() ────▶ GET /businesses/:id
    │                                                              │
    ├─▶ Write Review ──────▶ api.user.createReview() ────────▶ POST /reviews
    │                                                              │
    ├─▶ Save Favorite ─────▶ api.user.addFavorite() ─────────▶ POST /users/favorites
    │                                                              │
    └─▶ Contact Business ──▶ api.user.createLead() ──────────▶ POST /leads
                                                                   │
                                                                   ▼
                                                            PostgreSQL Database
                                                            (businesses, reviews,
                                                             favorites, leads)
```

### 🏢 VENDOR SIDE FLOW

```
Business Dashboard
    │
    ├─▶ View Stats ────────▶ api.vendor.getDashboardStats() ──▶ GET /vendors/dashboard-stats
    │                                                               │
    ├─▶ Manage Businesses ─▶ api.vendor.getMyBusinesses() ─────▶ GET /businesses/my-businesses
    │                                                               │
    ├─▶ Create Business ───▶ api.vendor.createBusiness() ───────▶ POST /businesses
    │                                                               │
    ├─▶ View Leads ────────▶ api.vendor.getMyLeads() ───────────▶ GET /leads/my-leads
    │                                                               │
    ├─▶ Manage Subscription▶ api.vendor.subscribeToPlan() ──────▶ POST /subscriptions/subscribe
    │                                                               │
    └─▶ Update Profile ────▶ api.vendor.updateProfile() ─────────▶ PATCH /vendors/profile
                                                                    │
                                                                    ▼
                                                            PostgreSQL Database
                                                            (vendors, businesses,
                                                             leads, subscriptions)
```

### ⚡ ADMIN SIDE FLOW

```
Admin Dashboard
    │
    ├─▶ View Global Stats ─▶ api.admin.getGlobalStats() ────────▶ GET /admin/stats
    │                                                                │
    ├─▶ Manage Users ──────▶ api.admin.getAllUsers() ────────────▶ GET /admin/users
    │                                                                │
    ├─▶ Moderate Business ─▶ api.admin.moderateBusiness() ───────▶ PATCH /admin/business/:id/moderate
    │                                                                │
    ├─▶ Moderate Review ───▶ api.admin.moderateReview() ─────────▶ PATCH /admin/review/:id/moderate
    │                                                                │
    ├─▶ Verify Vendor ─────▶ api.admin.verifyVendor() ───────────▶ POST /admin/vendor/:id/verify
    │                                                                │
    └─▶ Manage Categories ─▶ api.admin.createCategory() ─────────▶ POST /categories
                                                                     │
                                                                     ▼
                                                            PostgreSQL Database
                                                            (all tables - full access)
```

---

## Data Flow

```
┌─────────────┐
│   USER      │
│   ACTION    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   FRONTEND (Next.js)            │
│   • React Components            │
│   • Custom Hooks (useApi.ts)    │
│   • API Client (api.ts)         │
└──────┬──────────────────────────┘
       │
       │ HTTP Request
       │ (JSON + JWT Token)
       │
       ▼
┌─────────────────────────────────┐
│   BACKEND (NestJS)              │
│   • Controllers                 │
│   • Services                    │
│   • Guards (Auth, Roles)        │
│   • Validators                  │
└──────┬──────────────────────────┘
       │
       │ SQL Query
       │ (TypeORM)
       │
       ▼
┌─────────────────────────────────┐
│   DATABASE (PostgreSQL)         │
│   • 15 Tables                   │
│   • Relationships               │
│   • Indexes                     │
│   • Constraints                 │
└──────┬──────────────────────────┘
       │
       │ Result Set
       │
       ▼
┌─────────────────────────────────┐
│   RESPONSE                      │
│   • JSON Data                   │
│   • Status Code                 │
│   • Error Messages              │
└─────────────────────────────────┘
```

---

## Authentication Flow

```
┌──────────────┐
│  User Login  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│  POST /auth/login               │
│  { email, password }            │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Backend Validates              │
│  • Check credentials            │
│  • Verify user exists           │
│  • Check password hash          │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Generate JWT Token             │
│  • Include user ID              │
│  • Include role (user/vendor/admin)
│  • Set expiration               │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Return Response                │
│  { token, user }                │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Frontend Stores Token          │
│  localStorage.setItem('token')  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Subsequent Requests            │
│  Authorization: Bearer <token>  │
└─────────────────────────────────┘
```

---

## File Structure

```
business-saas/
│
├── apps/
│   ├── web/                          # Frontend (Next.js)
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── api.ts           ✅ API Client (50+ functions)
│   │   │   ├── hooks/
│   │   │   │   └── useApi.ts        ✅ React Hooks (15+ hooks)
│   │   │   └── components/
│   │   │       ├── user/            # User components
│   │   │       ├── vendor/          # Vendor components
│   │   │       └── admin/           # Admin components
│   │   └── .env                     ✅ Frontend config
│   │
│   └── api/                          # Simple API (Port 3000)
│       └── src/
│           └── app.controller.ts    ✅ Landing page
│
├── backend/                          # Backend (NestJS)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                ✅ Authentication
│   │   │   ├── users/               ✅ User management
│   │   │   ├── vendors/             ✅ Business management
│   │   │   ├── businesses/          ✅ Business CRUD
│   │   │   ├── categories/          ✅ Categories
│   │   │   ├── reviews/             ✅ Reviews & ratings
│   │   │   ├── leads/               ✅ Lead generation
│   │   │   ├── subscriptions/       ✅ Subscriptions
│   │   │   ├── search/              ✅ Search
│   │   │   ├── admin/               ✅ Admin operations
│   │   │   ├── notifications/       ✅ Notifications
│   │   │   └── stripe/              ✅ Payments
│   │   └── entities/                ✅ 15 database entities
│   └── .env                         ✅ Backend config
│
├── docs/                             # Documentation
│   ├── API_INTEGRATION_GUIDE.md     ✅ Complete guide
│   ├── API_LINKING_COMPLETE.txt     ✅ Summary
│   ├── ARCHITECTURE_DIAGRAM.md      ✅ This file
│   └── ...
│
└── database/                         # PostgreSQL
    └── webapp                        ✅ 15 tables with data
```

---

## Quick Reference

### Start Commands

```bash
# 1. Database (already running)
# Port 5432

# 2. Backend
cd backend
npm run start:dev
# Port 3001

# 3. Frontend
cd apps/web
npm run dev
# Port 3000
```

### API URLs

- **Frontend:** http://localhost:3000
- **Backend:** http://process.env.NEXT_PUBLIC_API_URL
- **API Docs:** http://process.env.NEXT_PUBLIC_API_URL/api/docs
- **Database:** localhost:5432/webapp

### Test Endpoints

```bash
# Public endpoints
curl `${process.env.NEXT_PUBLIC_API_URL}`/categories
curl `${process.env.NEXT_PUBLIC_API_URL}`/subscriptions/plans

# Auth required
curl -H "Authorization: Bearer TOKEN" \
  `${process.env.NEXT_PUBLIC_API_URL}`/vendors/dashboard-stats
```

---

**✅ All three user types (User, Vendor, Admin) are now fully integrated!**


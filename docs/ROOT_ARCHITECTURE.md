# Hyperlocal Business Discovery Platform - Technical Design Document

## 1️⃣ SYSTEM ARCHITECTURE

### High-Level Architecture
The system follows a modular, microservices-ready monolithic architecture (Modular Monolith) initially, split into a frontend application (Web) and a backend API (Server).

**Data Flow:**
1.  **Client (Web/Next.js):** Handles UI, SSR for SEO, and client-side interactions. Communicates with the Backend via REST APIs.
2.  **API Gateway / Backend (NestJS):** Handles business logic, authentication, request validation, and orchestrates data from DB and Search Engine.
3.  **Database (PostgreSQL + PostGIS):** Primary source of truth for relational data (Users, Businesses, Reviews) and geospatial queries.
4.  **Search Engine (Elasticsearch):** Optimized for complex search queries, full-text search, and ranking. Synced with PostgreSQL.
5.  **Auth & Notifications (Firebase):** Handles identity management (Auth) and push notifications (FCM).
6.  **Map Provider Abstraction:** A service layer in NestJS that abstracts the underlying map provider (Google Maps, Mapbox, or OpenStreetMap) to prevent vendor lock-in.

**Diagram Flow:**
`Next.js (SSR/CSR)` <--> `NestJS API` <--> `PostgreSQL (Primary Data)`
                                     ^--> `Elasticsearch (Search Index)`
                                     ^--> `Firebase (Auth/FCM)`
                                     ^--> `Redis (Caching)`

---

## 2️⃣ DATABASE SCHEMA (PostgreSQL)

### Users (`users`)
*   `id` (UUID, PK)
*   `email` (VARCHAR, Unique, Indexed)
*   `firebase_uid` (VARCHAR, Unique, Indexed)
*   `full_name` (VARCHAR)
*   `role` (ENUM: 'GUEST', 'VENDOR', 'ADMIN')
*   `profile_picture` (TEXT)
*   `created_at` (TIMESTAMP)
*   `updated_at` (TIMESTAMP)

### Vendors (`vendors`)
*   `id` (UUID, PK)
*   `user_id` (UUID, FK -> users.id, Unique)
*   `business_name` (VARCHAR)
*   `tax_id` (VARCHAR)
*   `is_verified` (BOOLEAN)
*   `subscription_tier` (ENUM: 'FREE', 'PREMIUM', 'ENTERPRISE')

### Categories (`categories`)
*   `id` (UUID, PK)
*   `name` (VARCHAR, Indexed)
*   `slug` (VARCHAR, Unique, Indexed)
*   `parent_id` (UUID, FK -> categories.id, Nullable for subcategories)
*   `icon_url` (TEXT)

### Businesses (`businesses`)
*   `id` (UUID, PK)
*   `vendor_id` (UUID, FK -> vendors.id)
*   `name` (VARCHAR, Indexed)
*   `slug` (VARCHAR, Unique, Indexed)
*   `description` (TEXT)
*   `phone_number` (VARCHAR)
*   `website` (VARCHAR)
*   `category_id` (UUID, FK -> categories.id)
*   `rating_avg` (DECIMAL, Default 0)
*   `review_count` (INT, Default 0)
*   `is_published` (BOOLEAN)
*   `is_sponsored` (BOOLEAN)
*   `created_at` (TIMESTAMP)

### Locations (`locations`)
*   `id` (UUID, PK)
*   `business_id` (UUID, FK -> businesses.id)
*   `address` (TEXT)
*   `city` (VARCHAR, Indexed)
*   `state` (VARCHAR)
*   `zip_code` (VARCHAR)
*   `coordinates` (GEOGRAPHY(POINT, 4326)) -- PostGIS Field
*   **Indexes:** GIST index on `coordinates` for fast spatial queries.

### Reviews (`reviews`)
*   `id` (UUID, PK)
*   `business_id` (UUID, FK -> businesses.id, Indexed)
*   `user_id` (UUID, FK -> users.id)
*   `rating` (INT, Check 1-5)
*   `comment` (TEXT)
*   `is_moderated` (BOOLEAN)
*   `created_at` (TIMESTAMP)

### Subscriptions (`subscriptions`)
*   `id` (UUID, PK)
*   `vendor_id` (UUID, FK -> vendors.id)
*   `plan_type` (ENUM)
*   `status` (ENUM: 'ACTIVE', 'CANCELED', 'EXPIRED')
*   `start_date` (TIMESTAMP)
*   `end_date` (TIMESTAMP)
*   `auto_renew` (BOOLEAN)

### Leads (`leads`)
*   `id` (UUID, PK)
*   `business_id` (UUID, FK -> businesses.id)
*   `user_id` (UUID, FK -> users.id, Nullable)
*   `type` (ENUM: 'CALL', 'WEBSITE_CLICK', 'MESSAGE')
*   `created_at` (TIMESTAMP)

---

## 3️⃣ API DESIGN (REST) - Versioned `/api/v1`

**Auth APIs**
*   `POST /auth/login` - Verify Firebase token, return JWT.
*   `POST /auth/register` - Create user profile after Firebase auth.
*   `POST /auth/refresh` - Refresh JWT.

**User APIs**
*   `GET /users/profile` - Get current user profile (Auth required).
*   `PUT /users/profile` - Update profile.

**Vendor APIs**
*   `POST /vendors/onboard` - Convert User to Vendor.
*   `GET /vendors/dashboard` - Get vendor stats.
*   `POST /vendors/businesses` - Create a listing.
*   `PUT /vendors/businesses/:id` - Update listing.
*   `GET /vendors/leads` - Get leads for owned businesses.

**Business & Search APIs (Public)**
*   `GET /businesses` - Search businesses (Query params: `q`, `lat`, `lng`, `category`, `radius`).
*   `GET /businesses/:slug` - Get details.
*   `GET /categories` - List categories.

**Reviews APIs**
*   `GET /businesses/:id/reviews` - List reviews.
*   `POST /businesses/:id/reviews` - Add review (User Auth).

**Admin APIs**
*   `GET /admin/users` - List all users.
*   `PATCH /admin/businesses/:id/status` - Approve/Reject listing.
*   `GET /admin/stats` - Platform analytics.

---

## 4️⃣ WEB ROUTES (Next.js)

**Public**
*   `/` - Home (Search bar, Top categories, Sponsored).
*   `/search?q=...` - Search results listing.
*   `/category/[slug]` - Category listing.
*   `/biz/[slug]` - Business Detail Page (SEO Optimized).
*   `/login`, `/register` - Auth pages.

**Business Dashboard (`/dashboard`)**
*   `/dashboard` - Overview.
*   `/dashboard/listings` - Manage businesses.
*   `/dashboard/add-listing` - Add business.
*   `/dashboard/leads` - View interactions.
*   `/dashboard/subscription` - Manage plan.

**Admin Panel (`/admin`)**
*   `/admin/dashboard` - Stats.
*   `/admin/users` - User management.
*   `/admin/businesses` - Moderation.
*   `/admin/reviews` - Review moderation.

---

## 5️⃣ SEARCH & RANKING LOGIC (Elasticsearch)

**Ranking Formula:**
`Score = (KeywordMatch * 0.4) + (DistanceScore * 0.3) + (RatingScore * 0.2) + (SponsoredBoost * 0.1)`

1.  **Keyword Matching:** Multi-match query on `name`, `description`, `category`.
2.  **Distance Scoring:** Decay function (Gaussian) based on user's geo-location vs business location.
3.  **Rating Weight:** Logarithmic boost based on `rating_avg` and `review_count`.
4.  **Sponsored Boost:** Boolean flag `is_sponsored` adds a static boost factor to push to top.

---

## 6️⃣ PAYMENT & SUBSCRIPTION FLOW

1.  **Free Tier:** Basic listing, no leads view.
2.  **Premium Tier:** Priority ranking, see leads, verified badge.
3.  **Gateway Abstraction:** Adapter pattern (`PaymentService`) to support Stripe/Razorpay.
4.  **Flow:**
    *   Vendor selects plan -> API creates session -> Frontend redirects to Gateway.
    *   Gateway Webhook -> API verifies -> Updates `subscriptions` table -> Triggers `vendor_updated` event.
    *   Cron job checks `end_date` for expiration/auto-renew.

---

## 7️⃣ SEO & PERFORMANCE

*   **SSR (Next.js):** All public pages (`/biz/[slug]`, `/category/[slug]`) rendered on server.
*   **Metadata:** Dynamic `generateMetadata` in Next.js for OpenGraph tags (Title, Description, Image).
*   **Caching:**
    *   Redis for API response caching (e.g., Categories list, Top businesses).
    *   Next.js `revalidate` for static pages (ISR).
*   **Images:** Next.js `<Image/>` with optimization and lazy loading.
*   **CDN:** Assets served via CloudFront/Vercel Edge.

---

## 8️⃣ SECURITY

*   **Authentication:** Firebase ID Token verified on Backend -> Exchange for custom Session JWT (HttpOnly cookie).
*   **RBAC:** Guards in NestJS (`@Roles('ADMIN')`) and Middleware in Next.js (`middleware.ts`).
*   **Input Validation:** Zod (Frontend) + Class Validator (Backend DTOs).
*   **Rate Limiting:** `ThrottlerModule` in NestJS (e.g., 100 req/min).
*   **Secure Headers:** Helmet in NestJS.
*   **Secrets:** Managed via `.env` (dotenv), never committed.

---

## 9️⃣ ERROR HANDLING & LOGGING

*   **Global Exception Filter (NestJS):** Catches all errors, formats standard JSON response:
    ```json
    {
      "statusCode": 400,
      "message": "Validation failed",
      "error": "Bad Request",
      "timestamp": "..."
    }
    ```
*   **Client-Side:** React Error Boundaries for UI crashes. Toast notifications for API errors.
*   **Logging:** Winston logger in NestJS. Structured logging (JSON) for production.

---

## 🔟 DEVELOPMENT RULES

*   **Config:** `ConfigService` (NestJS) and `process.env` (Next.js). No hardcoded strings.
*   **Linting:** ESLint + Prettier enforced via CI.
*   **Testing:** Jest for Unit/Integration tests.
*   **Monorepo:** Organized workspace for shared types/utils.


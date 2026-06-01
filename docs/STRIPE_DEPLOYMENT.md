# Stripe Integration & Deployment Guide

This document outlines how to map your Stripe dashboard data to the application and the final steps for going live.

## 1. Stripe Dashboard Mapping

To link your database plans to Stripe, you must create **Products** and **Prices** in your Stripe Dashboard.

| Plan Name | Stripe Product Name | Stripe Price ID (Example) | Database `plan_type` |
|-----------|--------------------|---------------------------|----------------------|
| Free Starter | Aura Free | (N/A or $0 Price) | `free` |
| Professional | Aura Professional | `price_1P2x...` | `basic` |
| Enterprise | Aura Enterprise | `price_1P3z...` | `premium` |

### How to get Price IDs:
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com).
2. Go to **Product Catalog** > **Add Product**.
3. Create "Professional" product, set price to $49 monthly.
4. Save product. Copy the **API ID** that starts with `price_...`.
5. Repeat for "Enterprise".

---

## 2. Environment Configuration

Add these to your production `.env` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Seeding (Set to true once, then false)
SEED_DATABASE=true
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...

# URLs
FRONTEND_URL=https://yourdomain.com
API_PREFIX=api/v1
```

---

## 3. Go-Live Checklist 🚀

- [ ] **Stripe Production Keys**: Toggle "Test Mode" off in Stripe and copy LIVE keys.
- [ ] **Webhook Endpoint**: Register your production webhook URL in Stripe: `https://api.yourdomain.com/api/v1/subscriptions/webhook`.
- [ ] **Webhook Events**: Enable these specific events during setup:
    - `checkout.session.completed`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.paid` (Optional but recommended)
- [ ] **SSL/TLS**: Ensure your Nginx configuration is using valid SSL certificates (Certbot/Let's Encrypt).
- [ ] **Domain Verification**: Add your domain to Stripe settings for Apple Pay/Google Pay support.
- [ ] **Email Testing**: Verify that the SMTP configuration is working for sending payment receipts (Stripe handles this, but your system should handle welcome emails).

---

## 4. Production Verification Steps

Once deployed, perform these tests:

1. **Plan Sync**: Start the backend and verify the `subscription_plans` table is populated correctly with your live Price IDs.
2. **Checkout Flow**: 
    - Log in as a test vendor.
    - Go to `/pricing`.
    - Select a plan.
    - Verify you are redirected to `checkout.stripe.com`.
3. **Webhook Pulse**:
    - Use a test card (`4242...`) if in test mode, or a real card for 1 cent if live.
    - Complete the purchase.
    - Check the `subscriptions` table in the database to see if the record was created automatically via the webhook.
4. **WebSocket Pulse**:
    - Open the business dashboard in two browser windows.
    - Submit a lead on an owned business listing.
    - Verify a toast notification appears instantly in the other window.
5. **Logs**: Check `docker logs aura-nginx` and `docker logs aura-api` for any 403 or 500 errors during traffic proxying.


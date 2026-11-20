# Orchiva: Orchard to Door

Orchiva is an online mango shop that connects customers in Bangladesh directly with orchards. Sellers list each day's harvest, customers order by the kilogram, and every box is checked by an AI model at packing. Customers can watch that check before their mangoes arrive.

**Live site:** https://orchard-to-door.vercel.app

## Features

### Customers
- Browse orchards: photos, varieties on sale, lowest price per kg, ratings and harvest videos. Search by name, place or variety.
- Order mangoes:
  - choose kg, a gift box, the delivery area (each area has its own charge), address and landmark;
  - pick a delivery day 2 or 3 days ahead, with an optional "when are you available" note;
  - pay cash on delivery.
- Track each order: Placed → Approved → Packed → Dispatched → Delivered.
- Cancel while the order waits for the seller's approval.
- Confirm delivery, rate the order (1–5 stars) or report a problem.
- Watch the **AI check of your box**: the packing video with boxes drawn around each mango, the share of healthy and diseased mangoes, and a warning if disease was found.

### Sellers
- Accounts are created by the admin. The seller sets their own password with a one-time link.
- Create orchard profiles, each with a cover photo.
- List harvest batches: variety (or a new one), price per kg, kg available, harvest date, and 2, 3 or 5 days on sale. Change the price, update stock or stop selling at any time.
- Approve or decline new orders within 24 hours. The ordered kg are held straight away, and orders nobody approves in 24 hours are cancelled automatically, returning their kg to stock.
- Pack, dispatch and deliver orders. Cancel before packing, with a reason.
- **AI inspection:** record or upload a short video (or photo) of each box at packing.
- Carry out the refunds and replacements the admin approves.

### Admin
- Add sellers, change user roles and create password-reset links.
- Oversee orchard quality. An orchard is flagged after 3 approved reports in 30 days or if its rating falls below 3. Pause or resume orchards.
- Decide problem reports: refund, replacement or rejection. Admins see only the customer's first name and never handle orders.
- Rename or merge mango varieties that sellers add, and manage delivery areas and charges.

### Everyone
- Log in with phone number or email. Reset a forgotten password.
- On-site notifications with an unread count.

## AI inspection

- **Model:** YOLOv8n, trained on the MangoFruitBD dataset by Islam et al. (1,310 orchard photos from Natore and Rajshahi; licence CC BY-NC 4.0). It recognises 4 classes: Alternaria, Anthracnose, Healthy and Scab.
- **Results on the test set:**
  - mAP50 0.89, mAP50-95 0.82;
  - 94% of diseased mangoes flagged, 3.4% of healthy mangoes wrongly flagged.
- **Where it runs:** the model is exported to ONNX (12.7 MB) and runs **in the seller's browser** with ONNX Runtime Web, so no paid GPU server is needed.
- **Videos:**
  - the app checks about 4 frames per second;
  - it follows each mango across frames so it's counted only once.
- **Storage:** videos are kept on Cloudinary; the result (about 3 KB of JSON) is saved with the order.
- **Disease is a warning only.** The seller makes the final decision.

## Tech stack

| Part | Technology |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database | PostgreSQL on Supabase, through Prisma 5 |
| Login | NextAuth (phone or email + password, bcrypt) |
| Orchard photos | Supabase Storage |
| Inspection videos | Cloudinary |
| AI | YOLOv8n (Ultralytics, trained on Kaggle) → ONNX Runtime Web |
| Email | Nodemailer (any SMTP server) |
| Hosting | Vercel |

## Contributions by Sayida Parvin ([@Sayida24](https://github.com/Sayida24))

A day-by-day record of this work is in [JOURNAL.md](JOURNAL.md).

- **Project setup and database:** created the Next.js project; designed the database (users, orchards, varieties, batches, orders, boxes, reports, reviews, notifications, delivery areas) and wrote every migration; set up Supabase and the Vercel deployment.
- **Accounts:** phone-or-email login, roles (customer, seller, admin), the new login page design, and forgotten-password reset by email or an admin's one-time link.
- **Admin panel:** user management and adding sellers, orchard quality and pause/resume, problem reports (first names only, filtered by orchard), variety rename and merge, delivery areas, and the overview. Removed the admin's access to orders, for customer privacy.
- **Seller side:**
  - orchard profiles with photo upload;
  - harvest batches;
  - the full order flow: 24-hour approval with stock held, automatic cancellation, decline or cancel with reasons, pack, dispatch, deliver;
  - finishing approved reports, and the overview.
- **Customer side:**
  - ordering with delivery day, availability, gift box, delivery charge and a price-change check;
  - order tracking, cancelling, delivery confirmation, reviews, problem reports and the notification bell;
  - the redesign of the customer pages.
- **AI inspection:** trained the YOLOv8n model on Kaggle and evaluated it; built in-browser detection for photos and videos with mango tracking, Cloudinary video storage, and the "AI check of your box" view for customers and admins.

## Getting started

1. Install packages:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project folder with these settings. Ask a teammate for the values, and never commit this file.
   ```
   DATABASE_URL=            # Supabase pooled connection
   DIRECT_URL=              # Supabase direct connection
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=http://localhost:3000
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   SMTP_HOST=               # optional: for password-reset emails
   SMTP_PORT=
   SMTP_USER=
   SMTP_PASS=
   MAIL_FROM=
   ```
3. Generate the Prisma client. Run this again after every `git pull`. The schema lives in `supabase/schema.prisma`.
   ```bash
   npx prisma generate
   ```
4. Start the site and open http://localhost:3000:
   ```bash
   npm run dev
   ```

> **The team shares one database.** Don't run `prisma migrate dev`, `prisma db push` or `prisma db seed` against it. Schema changes are agreed first and applied once.

## Not built yet
- **QR verification:** scan the code on a box to see its AI check.
- **Orchard media:** sellers upload their daily harvest videos. The site shows sample videos for now.
- **My account page:** change name, phone or password from inside the app.

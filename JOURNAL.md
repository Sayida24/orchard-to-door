# Development Journal: Sayida Parvin

Project: **Orchiva: Orchard to Door** (https://orchard-to-door.vercel.app)

A day-by-day record of my work on this project. Times are Bangladesh time (UTC+6), and work done after midnight is listed under the date it happened. Codes in brackets are the Git commits in this repository. Entries marked **(Kaggle)** were done in Kaggle notebooks, outside this repository.

---

## Fri, 6 Nov 2026: Project start, database and login
- Created the Next.js project (`6d239b9`).
- Designed the database with Prisma on Supabase PostgreSQL and wrote the first migration (`cf75250`):
  - **tables:** User, Orchard, Variety, Batch, Order, Box, Complaint, DeliveryArea, Notification;
  - **status lists:** user roles, order status, payment method, AI status and report status;
  - **sample data** (seed) for testing.
- Built registration and login with phone number or email and password, with three roles (customer, seller, admin), page protection for logged-in areas, and the first admin users page (`cf75250`).
- Made Vercel generate the Prisma client during every build (`51979c7`).
- Designed the new login page with orchard and mango images (`cd7d21a`).

## Sat, 7 Nov 2026: Admin panel
- Built the admin panel: navigation, orchards, varieties and delivery areas (with a delivery charge per area), plus shared form helpers and a submit button (`d9ce2b6`).
- Stopped tracking AI-tool folders in Git, which removed about 4,900 unneeded lines (`c6ae3f1`).

## Sun, 8 Nov 2026: AI model preparation (Kaggle)
- Downloaded the **MangoFruitBD** dataset: 1,310 orchard photos with 4 classes (Alternaria, Anthracnose, Healthy, Scab).
- Started the YOLOv8 training notebook.

## Fri, 13 Nov 2026: Password reset and the customer side
- **Forgotten password** (`78b594f`):
  - reset by email (SMTP) with a one-time link;
  - for users without email, the admin creates a link and shares it;
  - new PasswordResetToken table.
- **Customer dashboard** (`0ca6eac`, `5087451`, `be8ff2f`):
  - logged-in customers go straight to their dashboard;
  - orchard list, and orchard pages with harvest videos;
  - **ordering:** choose kg, delivery area, address, gift box;
  - "My orders" and the order status page;
  - **reviews** (1–5 stars) and **problem reports**;
  - new tables: HarvestVideo and Review.
- Merged the day's work on `secondary` (`e77b5ef`).

## Sat, 14 Nov 2026: Model training (Kaggle)
- Trained **YOLOv8n** (pre-trained on COCO) on MangoFruitBD: 640×640 images, batch 16, up to 100 epochs, early stopping after 25 epochs without improvement.
- Ran and improved the training notebook several times.

## Sun, 15 Nov 2026: Model results, admin oversight and the seller side
- **(Kaggle)** Training finished, with the best model at epoch 90. Evaluated it on the test set:
  - mAP50 0.89, mAP50-95 0.82;
  - 94% of diseased mangoes flagged, 3.4% of healthy mangoes wrongly flagged.

  Tested the trained model in a separate notebook.
- **Admin problem reports:** a page to approve a refund or replacement, or reject with a note (`6312b59`).
- **Orchard quality:**
  - added "pause orchard" and "variety added by" to the database (`0b1f953`);
  - built an orchard quality summary, flagged after 3 approved reports in 30 days or a rating below 3, and pause/resume for orchards (`e78452f`).
- **Customer privacy:**
  - problem reports show only the customer's first name and can be filtered by orchard (`7420cb4`);
  - removed the admin's access to orders, so the admin overview shows totals only (`705e2e9`).
- **Varieties:** made them view-only for the admin, with rename and merge (`19e83f3`).
- Released to `main` through pull request #1 (`70544b1`).
- **Seller side** (`09dd8c1`):
  - harvest batches: list, edit price and stock, stop selling;
  - orders and packing: pack, dispatch, cancel with a reason;
  - delivery confirmation by the customer;
  - the notifications page and bell with unread count;
  - the seller menu and overview.
- Released to `main` (`810ebba`).

## Mon, 16 Nov 2026: Sellers own their orchards, 24-hour approval and customer redesign
- **Orchard creation moved from the admin to sellers** (`b56b782`, `443e32b`):
  - the admin adds sellers, who get a one-time 24-hour setup link to choose their password;
  - sellers create orchard profiles with a required photo, uploaded to Supabase Storage.
- **24-hour approval** (`1e13440`):
  - the ordered kg are held straight away;
  - the seller approves or declines within 24 hours, and orders not approved in time are cancelled automatically, returning their kg to stock;
  - customers can cancel while waiting;
  - new APPROVED order status.
- Package settings: allowed the install scripts Prisma needs with npm 11 (`b593ee2`).
- Released to `main` through pull request #2 (`5b70f32`).
- **Customer pages redesign, "Orchard Morning" style** (`af3f348`):
  - new colours and display font, and a "Hello, {name}" greeting;
  - headline "From the Orchard to Your Doorstep";
  - delivery day 2 or 3 days after ordering, with an optional "when are you available" note;
  - restyled orchard, order and notification pages.
- Released to `main` (`63d430e`).

## Wed, 18 Nov 2026: Model export (Kaggle)
- Tested the trained model again.
- Exported it to **ONNX** (12.7 MB) so it can run in a web browser.

## Thu, 19 Nov 2026: AI inspection in the app
- **AI inspection for sellers** (`702afa9`):
  - the seller uploads a video (up to 20 seconds) or a photo of each order's box at packing;
  - the YOLOv8n model runs **in the browser** with ONNX Runtime Web;
  - it follows each mango across video frames so each one is counted once;
  - the video is stored on **Cloudinary**, and the result is saved with the order;
  - customers see "AI check of your box", and admins see the result in problem reports.
- Set up the Cloudinary account and added its settings to Vercel. Tested a video upload.
- Released to `main` (`fa1eb95`).
- Renamed the database folder from `prisma/` to `supabase/` and pointed Prisma to the new location (`aa6ba4f`, `02491b3`).
- AI inspection uploads are now filed in a folder per order in Cloudinary (`597f31f`).
- Released to `main` (`75d0f46`).

## Fri, 20 Nov 2026: Documentation
- Wrote the project README: overview, features, AI results, tech stack, setup steps and my contributions (`c023970`).
- Released to `main` (`91c11dd`).
- Started this development journal.

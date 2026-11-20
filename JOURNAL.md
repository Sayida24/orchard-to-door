# 📒 Development Journal

**Sayida Parvin** · Orchiva: Orchard to Door · 6 to 20 November 2026
Live site: https://orchard-to-door.vercel.app

---

## At a glance

| Date | What I worked on |
|---|---|
| Fri, 6 Nov | 🚀 Project setup, database and login |
| Sat, 7 Nov | 🛡️ Admin panel |
| Sun, 8 Nov | 🤖 AI: dataset and training notebook |
| Fri, 13 Nov | 🛒 Customer side and password reset |
| Sat, 14 Nov | 🤖 AI: training the model |
| Sun, 15 Nov | 📦 Seller side and admin reports |
| Mon, 16 Nov | 🎨 Seller orchards, order approval, new customer design |
| Wed, 18 Nov | 🤖 AI: preparing the model for the website |
| Thu, 19 Nov | 🔍 AI inspection in the app |
| Fri, 20 Nov | 📝 README and journal |

🤖 = AI model work, done on Kaggle.

---

## Daily log

### 🚀 Fri, 6 Nov · Project setup, database and login
- Created the project and connected it to the database
- Designed the database tables (users, orchards, mangoes, orders and more)
- Built sign-up and login with phone number or email
- Added three roles: customer, seller and admin
- Designed the login page

### 🛡️ Sat, 7 Nov · Admin panel
- Built admin pages for orchards, mango varieties and delivery areas
- Added a delivery charge for each area

### 🤖 Sun, 8 Nov · AI: getting ready
- Downloaded the MangoFruitBD dataset: 1,310 mango photos in 4 classes (Healthy, Alternaria, Anthracnose, Scab)
- Started the training notebook on Kaggle

### 🛒 Fri, 13 Nov · Customer side and password reset
- Customers can browse orchards and watch harvest videos
- Customers can order mangoes: choose kg, delivery area, address and gift box
- Added "My orders", order tracking, reviews and problem reports
- Added "Forgot password": reset by email, or with a link from the admin

### 🤖 Sat, 14 Nov · AI: training the model
- Trained the YOLOv8n model on Kaggle (up to 100 epochs)
- Improved the notebook over several runs

### 📦 Sun, 15 Nov · Seller side and admin reports
- 🤖 Training finished. On the test photos, the model scored **0.89 mAP50** and caught **94%** of diseased mangoes
- Sellers can list their harvests, and manage and pack orders
- Customers confirm delivery, and everyone gets notifications
- The admin decides problem reports: refund, replacement or reject
- The admin can see each orchard's quality and pause an orchard
- Protected privacy: the admin sees only customers' first names and never their orders

### 🎨 Mon, 16 Nov · Seller orchards, order approval, new customer design
- The admin creates seller accounts, and sellers set their own password
- Sellers create their orchard profiles with a photo
- Sellers must approve each order within 24 hours, or it is cancelled automatically
- Redesigned the customer pages with a fresh new look

### 🤖 Wed, 18 Nov · AI: preparing the model for the website
- Tested the model again
- Converted it to ONNX so it can run inside a web browser

### 🔍 Thu, 19 Nov · AI inspection in the app
- Sellers record a short video of each box while packing
- The AI checks every mango in the video, right in the browser
- Videos are saved on Cloudinary, and customers can watch their box's check
- Renamed the database folder to `supabase/`

### 📝 Fri, 20 Nov · Documentation
- Wrote the project README
- Started this journal

---

*The Git history of this repository has the full details of each day's work.*

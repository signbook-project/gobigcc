# GoBig.cc — Developer Setup & Deployment Guide

## Stack
| Layer | Tech | Hosting |
|-------|------|---------|
| Frontend + API | Next.js 14 App Router | Vercel |
| Database | PostgreSQL | Supabase (free) or Hetzner VPS |
| File storage | Supabase Storage | Supabase |
| Auth | NextAuth.js v5 | Vercel |
| Email | Resend | SaaS (free 3k/mo) |
| Payments | Razorpay | SaaS |
| Realtime | Supabase Realtime | Supabase |

---

## Local development

### 1. Clone & install
```bash
git clone https://github.com/your-org/gobig-cc.git
cd gobig-cc
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### 3. Database (Supabase)
1. Create a free project at https://supabase.com
2. Copy the connection strings into `.env.local`
3. Run migrations:
```bash
npm run db:push      # push schema to DB
npm run db:seed      # create admin + sample data
```

### 4. Start dev server
```bash
npm run dev
# → http://localhost:3000
```

### 5. Admin panel
```
http://localhost:3000/admin
Email:    admin@gobig.cc
Password: Billionapp@100!
```

---

## Vercel deployment

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/your-org/gobig-cc
git push -u origin main
```

### 2. Import on Vercel
- Go to https://vercel.com/new
- Import your repo
- Framework: Next.js (auto-detected)

### 3. Environment variables on Vercel
Add all variables from `.env.example` in the Vercel dashboard under:
`Project → Settings → Environment Variables`

Critical ones:
```
DATABASE_URL
DATABASE_URL_UNPOOLED
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AUTH_SECRET          # openssl rand -base64 32
AUTH_URL             # https://gobig.cc
RESEND_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_APP_URL  # https://gobig.cc
```

### 4. Custom domain
- Vercel: `Project → Settings → Domains → Add gobig.cc`
- Add A/CNAME records in your DNS provider

---

## Database (self-hosted VPS alternative)

If using Hetzner VPS instead of Supabase:

```bash
# On VPS (Ubuntu 22.04)
apt install postgresql-15
sudo -u postgres createdb gobigcc
sudo -u postgres createuser gobig --pwprompt

# Update DATABASE_URL:
# postgresql://gobig:PASSWORD@YOUR_VPS_IP:5432/gobigcc
```

For file storage without Supabase, use MinIO:
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=Billionapp@100! \
  -v /data/minio:/data \
  minio/minio server /data --console-address ":9001"
```

---

## Module build order

- [x] Auth (login, register, NextAuth)
- [x] Admin panel + settings
- [ ] Module A: Open Design (publish, detail, fork, like)
- [ ] Module B: Open Problems (challenges, submissions)
- [ ] Module C: Open Jobs (listings, applications)
- [ ] Profiles (designer + corporate)
- [ ] Messaging (real-time chat)
- [ ] Editorial (admin-managed articles)
- [ ] Payments (Razorpay + escrow)
- [ ] Notifications

---

## Admin credentials
```
Email:    admin@gobig.cc
Password: Billionapp@100!
```
All platform config (email, DB, storage, payments, auth) is editable at:
`/admin/settings`

# Deploying Weekly Company Reporting (WCR) OpsHub to Vercel

This repository is configured to deploy both the **Vite React Frontend** and the **Express API Backend** directly onto Vercel in a unified deployment.

---

## 1. Prerequisites & Environment Variables

Before deploying, ensure you have your **Supabase credentials** ready. You will need to add the following **Environment Variables** in Vercel:

| Variable Key | Required Value / Source |
| :--- | :--- |
| `DATABASE_URL` | Supabase PostgreSQL Connection String (e.g. `postgresql://postgres:pass@db.ref.supabase.co:5432/postgres`) |
| `SUPABASE_URL` | Supabase Project API URL (e.g. `https://ref.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |

---

## 2. Deployment Method A: Vercel Dashboard (Recommended)

1. Push this repository to **GitHub / GitLab / Bitbucket**.
2. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Import your repository.
4. Vercel will automatically detect `vercel.json`:
   - **Build Command**: `pnpm run build` *(auto-detected)*
   - **Output Directory**: `artifacts/opshub/dist/public` *(auto-detected)*
5. Open **Environment Variables** section and paste the 4 environment variables from step 1 above.
6. Click **Deploy**.

---

## 3. Deployment Method B: Vercel CLI

If you have Vercel CLI installed on your computer:

```bash
# 1. Login to Vercel CLI
npx vercel login

# 2. Deploy Preview Build
npx vercel

# 3. Add Environment Variables (when prompted or via command)
npx vercel env add DATABASE_URL
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY

# 4. Deploy Production Build
npx vercel --prod
```

---

## 4. How Routing Works on Vercel

- **`/api/*`**: Dynamically routed to the Vercel Serverless Function at `api/index.ts` (Express API backend).
- **`/*`**: All standard web paths are served by the Vite single page app build (`artifacts/opshub/dist/public`).
- **Database Seeding**: Runs asynchronously on serverless cold starts.

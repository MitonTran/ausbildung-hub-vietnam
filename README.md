# Ausbildung Hub Vietnam

> **Cơ hội đào tạo nghề – Sự nghiệp bền vững tại Đức**
> Nền tảng số 1 về du học nghề Đức dành cho người Việt Nam.

A production-ready Next.js 14 SaaS scaffold for a Vietnamese-first marketplace
+ info platform around German vocational training (**Ausbildung**) — built to
be picked up and extended by a non-technical founder in Cursor / Antigravity /
GitHub.

---

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + custom dark/light glassmorphism theme
- **shadcn/ui-style** components (hand-rolled, no extra dependencies)
- **next-themes** for dark/light persistence
- **lucide-react** icons
- **Recharts** for analytics dashboards
- **Framer Motion** (available, used sparingly for micro-interactions)
- **Supabase** for auth + Postgres + storage + RLS (schema + policies included)
- **Vercel**-ready deployment

---

## Project structure

```
src/
  app/                  # App Router pages (Vietnamese as primary language)
    page.tsx            # /  — landing / dashboard-style home
    news/               # /news, /news/[slug]
    centers/            # /centers, /centers/[slug]
    companies/          # /companies
    jobs/               # /jobs, /jobs/[slug]
    community/          # /community
    pricing/            # /pricing
    login, register/    # /login, /register
    quiz/               # /quiz — AI eligibility placeholder
    dashboard/
      student, center, employer/
    admin/              # /admin
    layout.tsx          # root layout with theme + header + mobile tabs
    globals.css         # design tokens (light + dark)
  components/
    ui/                 # button, card, input, badge, tabs, ...
    cards/              # news/center/company/job/post cards
    charts/             # line, bar, donut (Recharts)
    eligibility-quiz.tsx
    site-header.tsx, mobile-tabs.tsx, site-footer.tsx
  lib/
    utils.ts            # cn(), date/currency helpers
    supabase.ts         # browser-safe client; null if env vars missing
    mock-data.ts        # 8 articles · 8 centers · 8 companies · 12 jobs · 10 posts
  types/index.ts        # shared TypeScript types
supabase/
  schema.sql            # 14 tables + enums + indexes
  policies.sql          # RLS policies (student / center / employer / admin)
  seed.sql              # minimal sample rows
```

Mock data is the source of truth for the UI today. When you wire up Supabase,
swap each page's data import for `getSupabaseClient()` queries — the schema and
the mock data have **identical column shapes**.

---

## 1. Install & run locally

```bash
npm install
cp .env.example .env.local   # optional — only needed once you add Supabase
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

The app works **out of the box without any environment variables** — it falls
back to `src/lib/mock-data.ts`. You can ship a static deployment to Vercel
right away and add Supabase later.

---

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Pick a region (Singapore for VN audience).
3. Copy the **Project URL** and **anon key** from *Settings → API*.

## 3. Run the SQL schema

Open the SQL editor in Supabase and run, in order:

1. `supabase/schema.sql` — creates enums, all 14 tables, indexes, and turns on
   row-level security on every table.
2. `supabase/policies.sql` — installs RLS policies:
   - **Students** can edit their own profile + applications.
   - **Centers** can edit only their own center profile, class intakes, and
     teachers.
   - **Employers** can edit only their own company profile and job orders.
   - **Admins** (`profiles.role = 'admin'`) can read and manage everything.
   - **Public users** can read verified centers, verified companies, open
     jobs, and approved articles / posts / reviews.
3. *(Optional)* `supabase/seed.sql` for a few starter rows.

## 4. Add env variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, keep out of the client
```

Restart `npm run dev`. The app will continue to render mock data until you
swap individual pages over to Supabase queries.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → New Project → Import the repo.
3. Framework: **Next.js** (auto-detected).
4. Add the same env variables under *Settings → Environment Variables*.
5. Deploy.

A free Vercel deployment is enough for the MVP. Preview deployments are
automatic for every PR.

---

## 6. Continuing development in Cursor / Antigravity / GitHub

The codebase is intentionally kept **small and readable**:

- All copy is in Vietnamese — see the strings in `src/app/**/page.tsx`.
- Design tokens live in `src/app/globals.css` (`:root` and `.dark`).
- Components are colocated next to where they're used.
- Mock data lives in **one** file (`src/lib/mock-data.ts`) — replace it
  table-by-table as you build out Supabase queries.
- New pages: drop a `page.tsx` under `src/app/<route>/`.
- New shadcn-style components: drop them under `src/components/ui/`.

Common follow-up tasks (good first tickets for an AI assistant):

- Replace `mock-data.ts` calls in `app/jobs/page.tsx` with a Supabase query.
- Add `app/dashboard/employer/jobs/[id]/page.tsx` for job-order editing.
- Wire `Login` / `Register` forms to `supabase.auth.signInWithPassword` and
  `supabase.auth.signUp`.
- Add Stripe / VNPay payment provider in `src/app/api/checkout/route.ts`.
- Localize VI / DE / EN with `next-intl` (the language switcher already
  persists `localStorage["ahv-lang"]`).

---

## Brand & visual system

- **Tagline:** *Cơ hội đào tạo nghề – Sự nghiệp bền vững tại Đức*
- **Dark mode:** deep navy (`#020617`, `#07111f`, `#0b1220`) + neon cyan (`#22d3ee`)
- **Light mode:** soft white/blue (`#f8fbff`, `#eef7ff`) + cyan (`#06b6d4`)
- Cards use `glass` / `glass-strong` utilities for backdrop-blur + translucent
  surfaces; backgrounds combine an aurora gradient with a subtle grid overlay.

---

## Not included by design

The brief explicitly noted MVP-level scope. The following are intentionally
left as scaffolds rather than fully wired up:

- Real-time chat / messaging.
- Payment processing (Stripe / VNPay) — schema is ready, route is not wired.
- File uploads — Supabase Storage buckets are referenced but not configured.
- AI eligibility (`/quiz`) currently uses a deterministic scoring function;
  swap in a model call when ready.

Everything else is wired enough for a real founder to demo to investors or
partner trung tâm tomorrow.

# Testing — Ausbildung Hub Vietnam

Vietnamese-first React 19 + Vite + TypeScript + Tailwind app. Fully client-side; mock data in `src/data/mockData.ts`. No backend yet.

## Devin Secrets Needed
None. App is fully client-side and uses local-storage simulated auth.

## Local dev
```
npm install
npm run dev -- --port 5173 --host    # serves at http://localhost:5173/
npm run lint
npm run build
npm run preview -- --port 5173 --host  # static preview from dist/
```
A public deployment of the merged main branch typically lives at a `*.devinapps.com` URL — check the PR description for the live preview link before spinning up local.

## Roles & login
`/login` → click any role card OR change the role select, then click `Đăng nhập`. No real password; auth is simulated via `src/store/auth.tsx` and persisted to localStorage. After login you land on:
- student → `/dashboard/student`
- center → `/dashboard/center`
- employer → `/dashboard/employer`
- admin → `/admin`

## v1 mock-only constraint (important for testing)
Most "mutations" (review submission, admin verify/reject, moderation flags, applications) live in `useState` inside the page component. They visibly update the UI but reset on page reload. Don't write tests that assume persistence across reload — that's a backend feature for v2.

## Adversarial test flows
These are the highest-signal tests; each is designed so a broken implementation produces visibly different output.

### 1. Center review moderation gate
`/centers` → click any center → fill the "Viết đánh giá" form → submit.
- New review must be prepended (not appended) and show `Đang chờ kiểm duyệt` (NOT `Đã duyệt`).
- Review count `(N)` must increment by 1.
- Source: `src/pages/CenterDetail.tsx` lines around 24, 112.

### 2. Eligibility quiz scoring
Student dashboard quiz uses this formula in `src/pages/StudentDashboard.tsx` (`scoreQuiz`):
- Age: 18–24=25, 25–30=20, 31–35=12, 36+=5
- German: A1=5, A2=10, B1=30, B2=35, C1=38, C2=40
- Education: THCS=5, THPT=18, TC/CĐ=22, ĐH+=25
- Budget (triệu VND): ≥250→10, ≥150→7, ≥80→4, else 1
- Total capped at 100; bands at <40 (rose, "Thấp"), 40–59 (orange, "Trung bình"), 60–79 (amber, "Tốt"), 80+ (emerald, "Rất cao — Sẵn sàng Ausbildung").

Test two opposite configs (e.g. 40/A1/THCS/30 → 16; 22/B2/ĐH+/30 → 86). Score must change between submissions and band label/color must match the table above.

### 3. Admin verify queue
`/admin` → Xác minh tab → click `Duyệt` on a pending row.
- Header counter `(N pending)` must decrement by 1.
- That row's pill flips `pending` → `verified`.
- That row's `Duyệt`/`Từ chối` buttons disappear (they only render while `status === 'pending'`).
- Other rows untouched.
- Source: `src/pages/AdminPanel.tsx` lines around 13–14, 53–58.

### 4. VI/EN + theme persistence
Header has language toggle (`VI`↔`EN` button) and theme toggle (sun/moon icon). Both write to localStorage in `src/store/i18n.tsx` and `src/store/theme.tsx`. After toggling and Ctrl+R, the page must come back in the same language and theme.

## Don't bother re-testing
- News Hub article rendering (mostly static).
- Center / Employer dashboards (static layouts).
- Pricing page (static tier cards).
- Community feed (basic rendering, no real persistence).
- Job application form (same shape as review form — covered by review test).

## Evidence to capture
For each adversarial test, capture before/after screenshots at the moment of mutation. Screen recording is preferred for the full walkthrough but screenshots alone are acceptable when recording tools are unavailable.

## Common pitfalls
- The `<select>` dropdowns are native HTML — clicking them via computer-use opens the OS-level menu which can be flaky. Easiest workaround: focus the select with a click, then use `key=Home`/`End`/arrow keys to pick options, or `key=Return` to confirm.
- Don't expect score to change purely from typing in the age input — submit (`Tính điểm`) is required to update the displayed score block, but the dashboard "Điểm đủ điều kiện" stat reflects the current `score` state continuously.
- The dev server uses port 5173. If the live preview URL is reachable, prefer it over local dev — saves install time.

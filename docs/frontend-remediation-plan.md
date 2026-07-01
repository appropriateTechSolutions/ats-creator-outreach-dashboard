# Frontend Remediation Plan

A phased roadmap to take `ats-creator-outreach-dashboard` from a polished MVP to a
production-grade, multi-tenant SaaS frontend. Derived from the full-repo review
(Principal FE / React Performance pass).

## Decisions locked

| Decision | Choice | Consequence |
|---|---|---|
| Backend scope | **Full-stack** — API changes allowed | Server-side pagination (C1), stats endpoint (H2), cookie auth (H4) are first-class phases |
| Data layer | **TanStack Query (React Query)** | Retire the hand-rolled axios cache; fixes H5, M4, and most fetch-into-state plumbing |
| Accessible primitives | **Radix UI** (behavior only, keep Tailwind styling) | Fixes M3; standardizes bespoke dropdowns/modals |

## Working principles

1. **Always shippable.** Every phase leaves `main` deployable. No long-lived mega-branches.
2. **Guardrails before surgery.** Lint + types + tests land first so later refactors are safe.
3. **Measure, don't guess.** Capture a perf baseline (bundle size, Creators TTI, render counts) before Phase 3/4 and compare after.
4. **One phase = one milestone = a stack of small PRs**, each independently reviewable and revertible.
5. **Findings traceability.** Every review finding (C/H/M/L) maps to exactly one phase — see the matrix at the bottom. Nothing is dropped.

## Phases at a glance

| Phase | Theme | Findings | Rough effort | Depends on |
|---|---|---|---|---|
| 0 | Guardrails & tooling | C4, L5, L8 (partial) | 2–3 d | — |
| 1 | Type safety & shared utils | C3, M2, L3, L4, L1 | 4–6 d | 0 |
| 2 | Design-system hardening (Radix) | M3, M5, M6, L6 | 5–8 d | 1 |
| 3 | Data layer + server-side data | C1, H2, H5, M4 | 10–15 d (full-stack) | 1 |
| 4 | Rendering performance | C2, H3, Perf#4/#7 | 5–7 d | 3 |
| 5 | Component decomposition | H1 | 8–12 d | 1,2,4 |
| 6 | Security, UX consistency & a11y | H4, M1, L2 | 5–7 d | 2,3 |
| 7 | Testing depth, observability, polish | C4 (depth), L7, L8 | 4–6 d | all |

_Rough total: ~43–64 dev-days solo (~9–13 wks); less with 2 devs. Phases 3-backend, 6-security, and 0/1 can overlap across two people._

---

## Phase 0 — Guardrails & Tooling

**Goal:** A working quality gate so nothing in later phases regresses silently.

**Tasks**
- [ ] Add `eslint.config.js` (flat config): `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` (enable `react-hooks/exhaustive-deps` as **warn** initially), `eslint-plugin-jsx-a11y`.
- [ ] Make `npm run lint` actually run; triage output, fix trivial, ratchet the rest to warnings with a burn-down list.
- [ ] Add Prettier + `lint-staged` + Husky pre-commit (format + lint changed files).
- [ ] Add Vitest + React Testing Library + jsdom; a smoke test that the app renders.
- [ ] Wire CI (GitHub Actions): `tsc --noEmit`, `lint`, `test`, `build` on PR.
- [ ] Hygiene: `git rm --cached public/.DS_Store`, confirm `.gitignore` covers it; add a `logger` util that no-ops `console.*` in prod (wire fully in Phase 7).

**Exit criteria:** CI green on `lint`, `test`, `tsc`, `build`. Every future PR blocked on these.
**Risk:** Low. **Effort:** 2–3 d.

---

## Phase 1 — Type Safety & Shared Utilities

**Goal:** Restore the value of `strict` mode and kill duplicated logic before it multiplies through refactors.

**Tasks**
- [ ] **C3** — Type the entire API layer with existing `types.ts` interfaces. Replace every `Promise<any>` in `lib/api.ts` (`getPartnerships`, `getShipments`, `getContents`, `getActivities`, etc.).
- [ ] Add missing interfaces to `types.ts`: `Shipment`, `Activity`, `DashboardStats`, `Paginated<T> = { data: T[]; total: number }`.
- [ ] **M2** — Make `lib/formatters.ts` the single source for `getErRating` (the `(followers, er)` signature), `formatFollowers`, `getPlatformHandle`, `getRelativeTime`, `cleanMessageText`. Delete the 4–6 local copies each and import. (Note: current copies have *diverged* — reconcile to one correct implementation.)
- [ ] **L3** — Centralize magic strings: `ROLES`, `REVIEW_STATUS`, `LIFECYCLE_STATUS`, `PARTNERSHIP_STATUS` as `const`/union types in `types.ts` or `constants.ts`. Replace inline role arrays in `Sidebar`, `Creators`, `Dashboard`.
- [ ] **L4** — Single brand-name source: drive `index.html` title + `constants.APP_NAME` from one place (build-time env for white-labeling).
- [ ] **L1** — Delete dead code: unused `API_POLL_INTERVAL`, discarded `campaign` state + fetch in `CreatorDetail`.
- [ ] Flip `@typescript-eslint/no-explicit-any` to **warn**; start the burn-down (target: 0 in `lib/`).

**Exit criteria:** No `Promise<any>` in `api.ts`; each shared helper defined once; role/status strings referenced from constants.
**Risk:** Low–Med (touches many imports). **Effort:** 4–6 d.

---

## Phase 2 — Design-System Hardening (Radix)

**Goal:** Accessible, standardized primitives ready to drop into the decomposition phase.

**Tasks**
- [ ] Add Radix. Build styled wrappers keeping current Tailwind look: `<Select>`/`<Dropdown>` (Radix `Select`/`DropdownMenu`), `<Popover>`, and migrate `<Modal>` onto Radix `Dialog` (fixes focus-trap + Escape correctly, resolves **L6**).
- [ ] **M3** — Replace the hand-rolled `div`/`button` dropdowns on `Creators` (status/followers/engagement/campaign/sort), `Dashboard` (campaign selector), `Shipments` (filters + action menus) with the accessible `<Select>`/`<Dropdown>`.
- [ ] Standardize bespoke inline modals onto the shared Dialog: `Creators` feedback modal, `DiscoveryContext` start/completion popups, and the mobile filter sheet.
- [ ] **M5** — Add a route-level `<ErrorBoundary>` around `<Suspense>` that catches lazy-chunk load failures and offers a soft retry (keep the global boundary as backstop).
- [ ] **M6** — Add `useMediaQuery` hook; replace one-shot `window.innerWidth` reads in `MainLayout`/`Sidebar`.

**Exit criteria:** No bespoke dropdown/modal markup remains; keyboard + screen-reader operable filters (`jsx-a11y` clean); resize updates layout.
**Risk:** Med (visual regressions) — snapshot/visual check each swap. **Effort:** 5–8 d.

---

## Phase 3 — Data Layer + Server-Side Data ⭐ (largest, full-stack)

**Goal:** Stop shipping whole datasets to the browser; make caching/invalidation correct by construction.

### 3a — Backend (API)
- [ ] **C1** — Add server-side pagination + filter + search + sort to `GET /creators` and list endpoints (`/partnerships`, `/shipments`, `/content`). Return `{ data, total, page, pageSize }`.
- [ ] **H2** — Extend `GET /stats/dashboard` to return bucket counts (discovered/pending/approved/contacted/rejected/not_responsive) **and** the top-N leads, so the frontend never downloads all creators to count.
- [ ] Move the shared bucket logic (`creatorFilters.ts`) definitions server-side (or expose them) to keep parity.

### 3b — Frontend (TanStack Query)
- [ ] Install `@tanstack/react-query`; wrap app in `QueryClientProvider`; add Devtools in dev.
- [ ] Define a typed query-key factory and thin `useXxxQuery` hooks over the typed fetchers from Phase 1.
- [ ] Migrate reads page-by-page to `useQuery` (start with `Creators`, `Dashboard`, then detail pages). **Retire** the hand-rolled cache/in-flight map in `api.ts`.
- [ ] **C1** — `Creators` requests one page; feed server `total` to `<Pagination>`; drop `getAllCreators` full-walk. Search/filter/sort become query params (debounced — see Phase 4).
- [ ] **H2** — `Dashboard` drops `getAllCreators`; reads counts from stats.
- [ ] **H5 / M4** — Convert writes to `useMutation` with **optimistic updates** + **targeted `invalidateQueries`** (a partnership write invalidates `['partnerships']` *and* `['creators']`). Removes refetch-all and cross-resource staleness.

**Exit criteria:** No endpoint returns the full dataset to the client; Creators/Dashboard load in O(page); acting on one page reflects on others without stale windows; `api.ts` cache code deleted.
**Risk:** High (data flow rewrite, backend contract) — do behind a feature flag per page; keep old path until parity verified.
**Effort:** 10–15 d (split 3a/3b across two people if possible).

---

## Phase 4 — Rendering Performance

**Goal:** Smooth interaction on the new data paths; smaller, better-cached bundle.

**Tasks**
- [ ] **C2** — Memoize derived data with `useMemo`; build `Map` lookups once (`partnershipByCreatorId`, `shipmentByCreatorId`, `contentByCreatorId`) instead of `.find()`/`.filter()` per row. (~4 lookups × 50 rows every render today.)
- [ ] **C2** — Extract `<CreatorRow>` / `<ShipmentRow>` etc. and wrap in `React.memo`; pass stable `useCallback` handlers.
- [ ] **Perf#7** — Debounce search inputs (300 ms) before firing the server query.
- [ ] **Perf#4** — Virtualize any list that can still be long (`@tanstack/react-virtual`) — Conversations, Review Queue, Content, activity feeds.
- [ ] Memoize context values (`DiscoveryContext` provider `value`) to avoid re-rendering all consumers.
- [ ] **H3** — Add `build.rollupOptions.manualChunks` (react/router vendor split); run `rollup-plugin-visualizer`; confirm `lucide-react`/`date-fns` tree-shake; set a bundle baseline.

**Exit criteria:** No per-render O(rows×records) work; typing/scrolling smooth under React Profiler; vendor chunk present; documented bundle baseline.
**Risk:** Low–Med. **Effort:** 5–7 d.
_Note: server-side pagination (Phase 3) already shrinks row counts, so treat lookup-maps + memoized rows as the must-do subset; virtualization applies only to still-unbounded lists._

---

## Phase 5 — Component Decomposition

**Goal:** Make the four 1,000+ LOC files reviewable, testable, and cheap to re-render. Safe now that types (P1), primitives (P2), and query hooks (P3) exist.

**Tasks**
- [ ] **H1** — `CreatorDetail.tsx` (2,497 LOC, ~60 `useState`) → `CreatorProfileHeader` (exists), + `PartnershipsTab`, `ContentTab`, `ShipmentsTab`, `ActivityTab`; extract the ~6 modals; collapse the offer/edit/content form clusters into `useReducer`. Tab state co-located so a content edit doesn't re-render the header.
- [ ] **H1** — `Creators.tsx` (1,209) → `<CreatorsFilters>`, `<MobileFiltersSheet>`, `<CreatorRow>`; **unify** the near-duplicate desktop (L545–700) and mobile (L705–838) row markup.
- [ ] **H1** — `Shipments.tsx` (1,247) → row + create/edit/email modals as components.
- [ ] **H1** — `CreatorPreviewDrawer.tsx` (1,150): extract a shared `<CreatorProfileSummary>` reused by `CreatorDetail` (removes cross-file duplication).

**Exit criteria:** No page/component file > ~400 LOC (target, not dogma); each tab/section is its own memoized component.
**Risk:** Med (behavioral drift) — lean on Phase 0/7 tests + manual QA per split.
**Effort:** 8–12 d.

---

## Phase 6 — Security, UX Consistency & Accessibility

**Goal:** Close the security gaps and make feedback/interaction consistent and accessible. (Backend-coordinated items; H4 can be pulled forward in parallel with Phase 3 since it's independent.)

**Tasks**
- [ ] **H4** — Move the session to **httpOnly, Secure, SameSite cookies** (backend); stop storing the JWT in `localStorage`. Remove the raw token from the SSE query string in `DiscoveryContext` (use a short-lived signed token or an auth-capable fetch stream).
- [ ] Add SSE reconnect/backoff to `DiscoveryContext`; replace its `alert()` error path.
- [ ] **M1** — Replace all **84** `alert()` calls with `showToast(..., 'error')`; destructive confirmations → `useConfirm()`.
- [ ] **L2** — Monotonic toast IDs (ref counter) instead of `Math.random()`.
- [ ] Full accessibility pass: focus management on route change, visible focus rings, color-contrast audit on badges/muted text, `aria-live` for toasts.

**Exit criteria:** No token in `localStorage` or URLs; zero `alert()`; `jsx-a11y` + manual keyboard/AT pass clean.
**Risk:** Med–High (auth change) — stage auth behind a rollout flag; test session refresh/expiry paths.
**Effort:** 5–7 d.

---

## Phase 7 — Testing Depth, Observability & Final Polish

**Goal:** Lock in the gains; make production observable.

**Tasks**
- [ ] **C4 (depth)** — Unit-test pure logic (`creatorFilters`, `formatters`, query-key factory); integration-test critical flows (review → approve → outreach, draft offer → accept, add shipment → deliver, content submit → publish) with RTL + MSW.
- [ ] **L8** — Wire error/perf observability (e.g. Sentry) into the global + route error boundaries; route `console.error` through the logger.
- [ ] **L7** — Replace `key={idx}` with stable IDs where lists can reorder.
- [ ] Enforce a **bundle-size budget** in CI (fail PRs that blow the baseline from Phase 4).
- [ ] Finish the `no-explicit-any` burn-down; flip the rule to **error**.

**Exit criteria:** Coverage targets met on critical flows; error monitoring live; bundle budget enforced; `no-explicit-any` = error.
**Risk:** Low. **Effort:** 4–6 d.

---

## Findings → Phase traceability

| Finding | Description | Phase |
|---|---|---|
| C1 | Whole-dataset client loading; no server pagination/filter/search | 3 |
| C2 | Per-row O(n) lookups in unmemoized render | 4 |
| C3 | `any` defeats strict TS; `Promise<any>` API | 1 |
| C4 | Non-functional lint; no tests | 0 (setup), 7 (depth) |
| H1 | God components (2.5k/1.2k LOC) | 5 |
| H2 | Dashboard downloads all creators to count | 3 |
| H3 | No chunking config; barrel imports | 4 |
| H4 | JWT in localStorage + token in SSE URL | 6 (parallelizable w/ 3) |
| H5 | Cross-resource-blind cache invalidation | 3 |
| M1 | 84 `alert()` vs toast/confirm system | 6 |
| M2 | Helpers duplicated across 4–6 files | 1 |
| M3 | Inaccessible custom dropdowns | 2 |
| M4 | Refetch-everything after mutations | 3 |
| M5 | No route-level error boundary for chunk loads | 2 |
| M6 | `window.innerWidth` read once; no resize | 2 |
| L1 | Dead code (`API_POLL_INTERVAL`, unused campaign state) | 1 |
| L2 | `Math.random()` toast IDs | 6 |
| L3 | Magic strings (roles/statuses) | 1 |
| L4 | Brand name has two sources | 1 |
| L5 | `.DS_Store` committed | 0 |
| L6 | Modal focus-trap cleanup null ref | 2 |
| L7 | `key={idx}` in reorderable lists | 7 |
| L8 | 69 `console.*` in prod | 0 (util), 7 (wire) |

## Execution mechanics

- **Branching:** one branch per PR, small and focused; phase = milestone label grouping its PRs. No cross-phase mega-branches.
- **Definition of done (per PR):** CI green (lint/tsc/test/build), no new `any`, no new `alert()`, manual QA note in the PR.
- **Feature flags:** gate the Phase 3 per-page query migration and the Phase 6 auth change so they can ship dark and roll back instantly.
- **Baseline to capture before Phase 3:** bundle size, Creators page payload + TTI, React Profiler render counts on search/sort. Re-measure after Phase 4.

## Suggested sequencing for two developers

- **Dev A (frontend track):** 0 → 1 → 2 → 4 → 5
- **Dev B (data/full-stack track):** 3a (backend) in parallel with A's 1–2, then 3b, then 6 (security)
- Converge for Phase 7.

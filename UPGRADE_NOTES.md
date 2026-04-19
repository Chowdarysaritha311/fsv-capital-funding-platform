# FSV Capital v2 — Upgrade Summary

## What Was Improved

---

### 1. UI/UX Refinement ✅

**Before:** Flat single-column layout, plain HTML inputs, basic styling.

**After:**
- **Sidebar navigation** with live step indicators, ✓ checkmarks for completed steps
- **Card-based sections** with header, eyebrow text, description, and hover elevation
- **Instrument Serif** display font paired with **Geist** body font — premium editorial feel
- **Progress rail** at page top with animated gold fill + glowing dot
- **Step transitions** — `stepIn` keyframe animation on every section change
- **Score reveal animation** — `scoreReveal` spring animation on score screen
- **Toast notifications** — slide-in with contextual color (error / warn / success)
- **Top bar** with step context and view toggle (Form ↔ Dashboard)
- **Fixed bottom nav** with step meta text and primary CTA

---

### 2. Form Experience ✅

**Before:** Basic inputs with minimal validation messages.

**After:**
- **Character counters** on all long-form text areas (problem, solution, USP, etc.)
- **User-friendly error messages** — specific, actionable, not "field required"
- **Inline error animation** — `fadeIn` keyframe on validation messages
- **File upload improvements**:
  - Drag-and-drop with visual drag state
  - PDF-only enforcement with helpful error message on wrong file type
  - Filename display after upload with green confirmation state
  - "Click to replace" affordance
- **Auto-save** to localStorage (debounced 1.2s) via `useFormStore` hook
- **Draft resume** — data loaded from localStorage on page load
- **Range slider** with live numeric display for growth rate
- **Mobile** — sidebar collapses, grids collapse to single column
- **Scroll to top** on step navigation

---

### 3. Backend Enhancement ✅

**Before:** Basic validation in route handler.

**After (`filterRules.js`):**
- Clear separation of **hard rejection** (blocks submission) vs **soft warning** (saves but flags)
- Hard rules: pitch deck, sector alignment, funding range, required consent
- Soft rules: traction gate for late-stage, content quality check (min lengths)
- `CORE_SECTORS` vs `ALLOWED_SECTORS` distinction — soft warn if not in core thesis

**After (`routes/startups.js`):**
- `express-validator` on submit endpoint
- Trim/sanitize all string inputs via `normalizeFormData()`
- 25MB file size limit with Multer error (was implicit)
- Duplicate submission detection (11000 error code)
- Audit log appended on status change via Mongoose pre-save hook
- `/stats` endpoint for dashboard aggregation
- Full-text search across name, founder, email, problem statement
- CSV export supports filtering by status, sector, min score

---

### 4. Scoring System ✅

**Before:** Simple score with basic tier thresholds.

**After (`scoring.js`):**
- **Granular sub-scoring** — each dimension broken into 2–4 sub-factors
- **Contextual signals** — regex scans for "exit", "granted patent", notable employers
- **Bonus point system** — up to 5 bonus pts for cross-dimension excellence
- **Score flags** — advisory messages for reviewers (team too thin, market sparse)
- **Grade bands**: A+/A/B+/B/C/D with recommended action per tier
- **Detail array** returned per dimension for breakdown UI

---

### 5. File Handling ✅

**Before:** Basic Multer with no type enforcement on pitch deck.

**After:**
- Pitch deck enforced as `.pdf` only — rejected at both frontend and backend
- File type map per field (`pitchDeck`, `financialModel`, `productDemo`)
- Friendly error messages for wrong file type
- Year-based upload subdirectory organization
- Safe filename sanitization (removes special chars, limits length)

---

### 6. Admin Dashboard ✅

**Added** (was not present before):
- **4 stat cards** — Total applications, Average deal score, Top sector, Shortlisted count
- **Pipeline table** with startup name, founder, sector badge, stage indicator, deal score bar, status badge
- **Filter pills** — All, AI, Fintech, Blockchain, DeepTech, Score ≥ 60
- **CSV export** button (downloads filtered pipeline)
- **View toggle** in top bar to switch between Form and Dashboard
- Empty state with helpful message

---

### 7. Code Quality ✅

**Before:** All logic in a single App.jsx / single route file.

**After:**
- `useFormStore.js` — centralized form state, auto-save, validation, scoring
- `components/ui/index.jsx` — reusable Field, Input, Textarea, Select, ChipSelect, RadioPills, UploadZone, RangeSlider, SectionCard, Alert, ScoreBar, Spinner
- `scoring.js` — pure functions, fully commented, no side effects
- `filterRules.js` — each rule isolated, documented with JSDoc
- `models/Startup.js` — compound indexes, audit log schema, static aggregate method, CRM export method
- All string inputs trimmed/sanitized in `normalizeFormData()`
- Async email sending uses `Promise.allSettled()` — one failure doesn't break the other

---

## How to Run

```bash
# Backend (no changes to startup command)
cd server
cp .env.example .env   # configure MONGO_URI
npm install && npm run dev

# Frontend
cd client
npm install && npm start
```

## API Changes in v2

| Method | Endpoint | What's new |
|--------|----------|-----------|
| GET | /api/startups/stats | NEW — pipeline aggregation for dashboard |
| GET | /api/startups | Added: maxScore, rejected filters; full-text search |
| POST | /api/startups/submit | Stricter validation, soft warnings in response |
| PATCH | /api/startups/:id/status | Now appends audit log entry |
| GET | /api/startups/export/csv | Supports filter params |

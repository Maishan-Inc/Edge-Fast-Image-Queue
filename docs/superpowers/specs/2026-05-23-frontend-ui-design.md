# Frontend UI Design — Edge-Fast-Image-Queue

Date: 2026-05-23

## Scope

Rewrite the two existing pages (`index.html`, `admin.html`) and their assets (`style.css`, `app.js`, `admin.js`) to implement the Uber-inspired black-and-white pill theme defined in `getdesign.md`. Add a backend image-serving endpoint so completed jobs render inline.

### In scope

- Complete CSS rewrite: dark glassmorphism → Uber black/white pill theme
- `index.html`: nav + hero + form card + result section + footer
- `admin.html`: nav + queue control + inline-editable settings table + secrets table + jobs table
- `GET /api/images/:jobId`: stream R2 PNG to browser, public access, immutable cache
- Image preview in result section when job completes
- Cancel button wired to existing `/api/queue/cancel/:jobId`
- Download link for completed images
- Mobile responsive (single column < 768px)

### Out of scope

- OAuth token exchange (buttons remain, link to `/api/auth/:provider/start`)
- Turnstile validation
- Bans enforcement
- Content moderation
- History page / SPA routing
- Unit tests for frontend

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Image access | Public via jobId | jobId is 16-byte random hex, unguessable; simplest CDN-friendly approach |
| Admin edit UX | Inline editing | Fastest to build; click value → input → Enter saves |
| Font | Inter via Google Fonts CDN | Closest open substitute to UberMove per getdesign.md |
| CSS strategy | Full rewrite | Current variables/naming conflict entirely with target theme |

## Design System (CSS Variables)

```css
:root {
  --color-primary: #000000;
  --color-on-primary: #ffffff;
  --color-ink: #000000;
  --color-body: #5e5e5e;
  --color-mute: #afafaf;
  --color-canvas: #ffffff;
  --color-canvas-soft: #efefef;
  --color-canvas-softer: #f3f3f3;
  --color-surface-pressed: #e2e2e2;
  --color-link: #0000ee;

  --radius-pill: 999px;
  --radius-xl: 16px;
  --radius-lg: 12px;
  --radius-md: 8px;

  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;

  --shadow-card: rgba(0,0,0,0.16) 0px 4px 16px 0px;
  --shadow-pill: rgba(0,0,0,0.16) 0px 2px 8px 0px;

  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
}
```

## Component Class Mapping

| getdesign.md component | CSS class | Usage |
|------------------------|-----------|-------|
| button-primary | `.btn-primary` | Submit, save |
| button-secondary | `.btn-secondary` | Cancel, back |
| button-subtle | `.btn-subtle` | Login buttons |
| card-content | `.card` | Generic card |
| card-elevated | `.card-elevated` | Form card with shadow |
| request-form-card | `.form-card` | Prompt form |
| request-form-input-row | `.form-input-row` | Form field rows |
| text-input | `.text-input` | All inputs |
| nav-bar | `.nav` | Top navigation |
| nav-link | `.nav-link` | Nav links |
| hero-band-light | `.hero` | Index hero |
| footer | `.footer` | Black footer |

## Page Layouts

### index.html

```
Nav: logo text left, login pills right
Hero (white band):
  Left 60%: eyebrow + h1 + lead + queue metrics
  Right 40%: form-card (elevated) with textarea + size/quality selects + submit pill
Result section (visible when job active):
  Card with status badge + jobId + rank
  States: queued (waiting animation), running (spinner), completed (img + download), failed (error + retry pill)
  Retry = re-populate form with same prompt, user must click submit again (not auto-resubmit)
  Cancel button visible when queued
Footer: black band, white text, project name + links
```

Mobile (< 768px): single column, form below hero text, full-width cards.

### admin.html

```
Nav: "Admin" title left, back-to-home pill right
Card: Queue control (pause/resume pills + status badge)
Card: Settings table (key | editable value | group | public)
Card: Secrets table (key | masked_value | edit button)
Card: Recent jobs table (id | provider | status | model | created_at)
```

## User Flows

### Generate flow (index)

1. Page load → poll `/api/queue/overview` every 5s → update metrics
2. If localStorage has `efi_current_job_id` → poll `/api/queue/status/:jobId` every 3s
3. User submits prompt → POST `/api/generate` → store jobId → start polling
4. Poll returns `completed` + `result_r2_key` → render `<img src="/api/images/${jobId}">`
5. User clicks cancel → POST `/api/queue/cancel/:jobId` → clear localStorage → hide result
6. User clicks download → `<a href="/api/images/${jobId}" download>`

### Admin inline edit flow

1. Page load → GET `/api/admin/settings` → render tables
2. Click value cell → replace with `<input>` (auto-focus)
3. Enter or blur → PUT `/api/admin/settings/:key` → success: green flash; fail: red flash
4. Esc → cancel edit, restore original value
5. Secrets: same but `type="password"`, PUT `/api/admin/secrets/:key`

## Backend Addition

### GET /api/images/:jobId

```typescript
// src/routes/images.ts
imagesRoutes.get('/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const job = await c.env.DB.prepare('SELECT result_r2_key FROM jobs WHERE id = ?')
    .bind(jobId).first();
  if (!job?.result_r2_key) return fail(c, 'NOT_FOUND', 'Image not found', 404);

  const object = await c.env.IMAGES.get(job.result_r2_key);
  if (!object) return fail(c, 'NOT_FOUND', 'Image file missing', 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
  });
});
```

Register in `src/index.ts` as `app.route('/api/images', imagesRoutes)`.

## Error Handling

- Generate submit fails → show error text below form, keep form filled
- Poll fails (network) → silently retry on next interval, no UI disruption
- Image 404 → show placeholder text "图片加载失败"
- Admin save fails → red border flash on input + toast with error message (auto-dismiss 3s)
- Admin page load fails (403) → show "需要管理员权限" full-page message

## Visual Rules (from getdesign.md)

- All buttons: `border-radius: var(--radius-pill)` (999px)
- All cards: `border-radius: var(--radius-xl)` (16px)
- Page background: pure white `#ffffff`, no gradients
- No third accent color; only black, white, grays
- Headlines: Inter 700, sentence-case, never all-caps
- Buttons: Inter 500
- Body: Inter 400
- Container: max-width 1200px, centered, 32px horizontal gutter
- Status badges: pill-shaped, thin semantic-color border, no fill

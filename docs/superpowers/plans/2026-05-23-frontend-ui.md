# Frontend UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the frontend to match the Uber-inspired black/white pill theme from `getdesign.md`, add image preview for completed jobs, and make admin settings inline-editable.

**Architecture:** Vanilla HTML/CSS/JS served via Cloudflare Workers static assets. One new backend route (`GET /api/images/:jobId`) streams R2 objects. CSS uses custom properties mapped 1:1 to design tokens. No build step, no framework.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla ES modules, Inter font via Google Fonts CDN, Hono backend route for image serving.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/routes/images.ts` | Serve R2 images by jobId, public access |
| Modify | `src/index.ts:14,30` | Import and mount images route |
| Rewrite | `public/assets/style.css` | Full design system CSS |
| Rewrite | `public/index.html` | User-facing page structure |
| Rewrite | `public/assets/app.js` | Generate form, polling, image preview, cancel |
| Rewrite | `public/admin.html` | Admin page structure |
| Rewrite | `public/assets/admin.js` | Inline-editable tables, queue control |

---

## Task 1: Image serving endpoint

**Files:**
- Create: `src/routes/images.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create the images route**

```typescript
// src/routes/images.ts
import { Hono } from 'hono';
import type { AppContext } from '../types';
import { fail } from '../utils/response';

export const imagesRoutes = new Hono<AppContext>();

imagesRoutes.get('/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  if (!/^job_[0-9a-f]{32}$/.test(jobId)) {
    return fail(c, 'BAD_REQUEST', 'Invalid job ID format.', 400);
  }

  const row = await c.env.DB.prepare('SELECT result_r2_key FROM jobs WHERE id = ?')
    .bind(jobId)
    .first<{ result_r2_key: string | null }>();

  if (!row?.result_r2_key) {
    return fail(c, 'NOT_FOUND', 'Image not found.', 404);
  }

  const object = await c.env.IMAGES.get(row.result_r2_key);
  if (!object) {
    return fail(c, 'NOT_FOUND', 'Image file missing from storage.', 404);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(object.size),
    },
  });
});
```

- [ ] **Step 2: Register the route in index.ts**

In `src/index.ts`, add the import after line 13:

```typescript
import { imagesRoutes } from './routes/images';
```

Add the route mount after line 30 (after `adminRoutes`):

```typescript
app.route('/api/images', imagesRoutes);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/routes/images.ts src/index.ts
git commit -m "feat: add GET /api/images/:jobId endpoint for R2 image serving"
```

---

## Task 2: CSS design system rewrite

**Files:**
- Rewrite: `public/assets/style.css`

- [ ] **Step 1: Write the complete CSS file**

Replace the entire contents of `public/assets/style.css` with the design system CSS. The file implements:

1. CSS custom properties (all design tokens from getdesign.md)
2. Reset and base typography
3. Layout utilities (`.shell`, `.grid`, `.hero`)
4. Navigation (`.nav`, `.nav-link`)
5. Buttons (`.btn-primary`, `.btn-secondary`, `.btn-subtle`, `.btn-danger`)
6. Cards (`.card`, `.card-elevated`, `.form-card`)
7. Form elements (`.text-input`, `.form-input-row`)
8. Badges (`.badge`, `.badge--queued`, `.badge--running`, `.badge--completed`, `.badge--failed`)
9. Result section (`.result-section`, `.result-image`)
10. Tables (`.data-table`)
11. Toast notifications (`.toast`)
12. Footer (`.footer`)
13. Responsive breakpoint (< 768px)

```css
/* === Design Tokens === */
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
  --color-success: #16a34a;
  --color-error: #dc2626;

  --radius-pill: 999px;
  --radius-xl: 16px;
  --radius-lg: 12px;
  --radius-md: 8px;

  --space-xs: 6px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;

  --shadow-card: 0px 4px 16px rgba(0, 0, 0, 0.16);
  --shadow-pill: 0px 2px 8px rgba(0, 0, 0, 0.16);

  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}

/* === Reset & Base === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--color-ink);
  background: var(--color-canvas);
  -webkit-font-smoothing: antialiased;
}

h1 { font-size: 52px; font-weight: 700; line-height: 64px; }
h2 { font-size: 24px; font-weight: 700; line-height: 32px; margin-bottom: var(--space-lg); }
h3 { font-size: 20px; font-weight: 700; line-height: 28px; }
p { color: var(--color-body); }

a { color: var(--color-link); text-decoration: none; }
a:hover { text-decoration: underline; }

code {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  font-size: 13px;
  background: var(--color-canvas-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

/* === Layout === */
.shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-3xl);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2xl);
  margin-top: var(--space-3xl);
}

/* === Navigation === */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg) var(--space-3xl);
  background: var(--color-canvas);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-logo {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-ink);
  text-decoration: none;
}

.nav-actions { display: flex; gap: var(--space-md); align-items: center; }

.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  text-decoration: none;
  padding: var(--space-sm) var(--space-md);
}

/* === Hero === */
.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: var(--space-3xl);
  align-items: start;
  padding: var(--space-3xl) 0;
}

.hero-content { padding-top: var(--space-3xl); }

.eyebrow {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-mute);
  margin-bottom: var(--space-md);
}

.lead {
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--color-body);
  margin-top: var(--space-lg);
}

.metrics {
  display: flex;
  gap: var(--space-3xl);
  margin-top: var(--space-2xl);
}

.metric-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-ink);
}

.metric-label {
  font-size: 14px;
  color: var(--color-mute);
  margin-top: var(--space-xs);
}

/* === Buttons === */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font);
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-pill);
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.85; text-decoration: none; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-family: var(--font);
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-surface-pressed);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-secondary:hover { background: var(--color-canvas-soft); text-decoration: none; }

.btn-subtle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas-soft);
  color: var(--color-ink);
  font-family: var(--font);
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-pill);
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-subtle:hover { background: var(--color-surface-pressed); text-decoration: none; }

.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-canvas);
  color: var(--color-error);
  font-family: var(--font);
  font-size: 14px;
  font-weight: 500;
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-error);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover { background: #fef2f2; }

/* === Cards === */
.card {
  background: var(--color-canvas);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
}

.card-elevated {
  background: var(--color-canvas);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-card);
}

/* === Form === */
.form-card {
  background: var(--color-canvas);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
}

.form-card label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: var(--space-sm);
}

.text-input {
  width: 100%;
  font-family: var(--font);
  font-size: 16px;
  color: var(--color-ink);
  background: var(--color-canvas-soft);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  outline: none;
  transition: box-shadow 0.15s;
  resize: vertical;
}
.text-input:focus { box-shadow: 0 0 0 2px var(--color-primary); }
.text-input::placeholder { color: var(--color-mute); }

select.text-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235e5e5e' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
}

.form-input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  margin: var(--space-md) 0;
}

.form-hint {
  font-size: 13px;
  color: var(--color-mute);
  margin-top: var(--space-md);
}

/* === Result Section === */
.result-section {
  margin-top: var(--space-3xl);
}

.result-card {
  background: var(--color-canvas);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  border: 1px solid var(--color-canvas-soft);
}

.result-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.result-meta {
  font-size: 14px;
  color: var(--color-body);
}

.result-meta code { font-size: 12px; }

.result-image {
  width: 100%;
  max-width: 512px;
  border-radius: var(--radius-lg);
  margin-top: var(--space-lg);
}

.result-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.result-error {
  color: var(--color-error);
  font-size: 14px;
  margin-top: var(--space-md);
}

.result-waiting {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--color-body);
  font-size: 14px;
  margin-top: var(--space-md);
}

@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-canvas-soft);
  border-top-color: var(--color-ink);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* === Badges === */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-surface-pressed);
  color: var(--color-body);
}

.badge--queued { color: #7c3aed; border-color: rgba(124, 58, 237, 0.3); }
.badge--running { color: #0369a1; border-color: rgba(3, 105, 161, 0.3); }
.badge--completed { color: var(--color-success); border-color: rgba(22, 163, 74, 0.3); }
.badge--failed { color: var(--color-error); border-color: rgba(220, 38, 38, 0.3); }

/* === Data Table === */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  text-align: left;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-mute);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-canvas-soft);
}

.data-table td {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-canvas-soft);
  color: var(--color-ink);
}

.data-table td.editable { cursor: pointer; }
.data-table td.editable:hover { background: var(--color-canvas-softer); }

.data-table .edit-input {
  font-family: var(--font);
  font-size: 14px;
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-canvas);
  width: 100%;
  outline: none;
}

.flash-success { animation: flashGreen 0.4s; }
.flash-error { animation: flashRed 0.4s; }

@keyframes flashGreen {
  0%, 100% { background: transparent; }
  50% { background: rgba(22, 163, 74, 0.1); }
}
@keyframes flashRed {
  0%, 100% { background: transparent; }
  50% { background: rgba(220, 38, 38, 0.1); }
}

/* === Toast === */
.toast {
  position: fixed;
  bottom: var(--space-2xl);
  right: var(--space-2xl);
  background: var(--color-canvas);
  border-radius: var(--radius-xl);
  padding: var(--space-md) var(--space-lg);
  box-shadow: var(--shadow-card);
  font-size: 14px;
  z-index: 1000;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.2s, transform 0.2s;
}
.toast.visible { opacity: 1; transform: translateY(0); }
.toast--error { border-left: 3px solid var(--color-error); }
.toast--success { border-left: 3px solid var(--color-success); }

/* === Footer === */
.footer {
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: var(--space-3xl);
  margin-top: var(--space-3xl);
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer a { color: var(--color-on-primary); opacity: 0.7; }
.footer a:hover { opacity: 1; }
.footer-brand { font-size: 14px; font-weight: 500; }
.footer-links { display: flex; gap: var(--space-lg); font-size: 14px; }

/* === Admin specific === */
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2xl);
}

.admin-cards { display: flex; flex-direction: column; gap: var(--space-2xl); }

.queue-controls { display: flex; gap: var(--space-md); align-items: center; }

/* === Responsive === */
@media (max-width: 768px) {
  .shell { padding: 0 var(--space-lg); }
  .nav { padding: var(--space-lg); }
  .hero { grid-template-columns: 1fr; gap: var(--space-2xl); }
  .hero-content { padding-top: var(--space-lg); }
  h1 { font-size: 36px; line-height: 44px; }
  .grid { grid-template-columns: 1fr; }
  .metrics { gap: var(--space-2xl); }
  .form-input-row { grid-template-columns: 1fr; }
  .footer-inner { flex-direction: column; gap: var(--space-lg); text-align: center; }
}
```

- [ ] **Step 2: Verify the file renders correctly**

Open `http://localhost:8787` after `pnpm dev` — page will look broken until HTML is updated in Task 3, but CSS should load without 404.

- [ ] **Step 3: Commit**

```bash
git add public/assets/style.css
git commit -m "feat: rewrite CSS to Uber black/white pill design system"
```

---

## Task 3: Rewrite index.html

**Files:**
- Rewrite: `public/index.html`

- [ ] **Step 1: Replace the entire index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edge-Fast-Image-Queue</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/style.css" />
  </head>
  <body>
    <nav class="nav">
      <a href="/" class="nav-logo">Edge-Fast-Image-Queue</a>
      <div class="nav-actions">
        <a href="/api/auth/linuxdo/start" class="btn-subtle">Linux.DO 登录</a>
        <a href="/api/auth/google/start" class="btn-subtle">Google 登录</a>
        <a href="/admin.html" class="nav-link">后台</a>
      </div>
    </nav>

    <main class="shell">
      <section class="hero">
        <div class="hero-content">
          <p class="eyebrow">Cloudflare Edge · GPT Image</p>
          <h1>AI 图片生成队列</h1>
          <p class="lead">运行在边缘节点上的图片生成排队系统。Linux.DO 用户优先，前 50 名保护区严格按序执行。</p>
          <div class="metrics">
            <div>
              <div class="metric-value" id="waitingCount">--</div>
              <div class="metric-label">等待中</div>
            </div>
            <div>
              <div class="metric-value" id="runningCount">--</div>
              <div class="metric-label">执行中</div>
            </div>
          </div>
        </div>

        <form id="generateForm" class="form-card">
          <label for="prompt">图片描述</label>
          <textarea id="prompt" name="prompt" class="text-input" rows="5" placeholder="例如：一只穿赛博朋克夹克的橘猫，站在东京雨夜霓虹街头"></textarea>
          <div class="form-input-row">
            <select id="size" name="size" class="text-input">
              <option value="1024x1024">1024 × 1024</option>
              <option value="1024x1536">1024 × 1536</option>
              <option value="1536x1024">1536 × 1024</option>
            </select>
            <select id="quality" name="quality" class="text-input">
              <option value="auto">auto</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
            </select>
          </div>
          <button class="btn-primary" type="submit" style="width:100%;margin-top:var(--space-md)">提交生成请求</button>
          <p class="form-hint">未登录用户默认不可生成。后台可开启游客模式。</p>
        </form>
      </section>

      <section id="resultSection" class="result-section" hidden>
        <div class="result-card">
          <div class="result-header">
            <span id="statusBadge" class="badge"></span>
            <span class="result-meta">任务 <code id="jobIdDisplay">-</code></span>
          </div>
          <div id="resultBody"></div>
          <div id="resultActions" class="result-actions"></div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-brand">Edge-Fast-Image-Queue</span>
        <div class="footer-links">
          <a href="/admin.html">管理后台</a>
        </div>
      </div>
    </footer>

    <script src="/assets/app.js" type="module"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat: rewrite index.html with Uber design system structure"
```

---

## Task 4: Rewrite app.js (generate + polling + image preview)

**Files:**
- Rewrite: `public/assets/app.js`

- [ ] **Step 1: Replace the entire app.js**

```javascript
const form = document.querySelector('#generateForm');
const resultSection = document.querySelector('#resultSection');
const statusBadge = document.querySelector('#statusBadge');
const jobIdDisplay = document.querySelector('#jobIdDisplay');
const resultBody = document.querySelector('#resultBody');
const resultActions = document.querySelector('#resultActions');
const waitingCount = document.querySelector('#waitingCount');
const runningCount = document.querySelector('#runningCount');

let currentJobId = localStorage.getItem('efi_current_job_id');
let pollTimer = null;

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

function getDeviceId() {
  let id = localStorage.getItem('efi_device_id');
  if (!id) {
    id = `dev_${crypto.randomUUID()}`;
    localStorage.setItem('efi_device_id', id);
  }
  return id;
}

// --- Generate form ---
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = form.querySelector('#prompt').value.trim();
  if (!prompt) return;

  const payload = {
    prompt,
    size: form.querySelector('#size').value,
    quality: form.querySelector('#quality').value,
    anonymousDeviceId: getDeviceId(),
  };

  setResult('submitting');
  try {
    const data = await api('/api/generate', { method: 'POST', body: JSON.stringify(payload) });
    currentJobId = data.jobId;
    localStorage.setItem('efi_current_job_id', currentJobId);
    showResult('queued', { rank: data.rank });
    startPolling();
  } catch (err) {
    showResult('error', { message: err.message });
  }
});

// --- Polling ---
function startPolling() {
  stopPolling();
  pollJob();
  pollTimer = setInterval(pollJob, 3000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function pollJob() {
  if (!currentJobId) { stopPolling(); return; }
  try {
    const data = await api(`/api/queue/status/${currentJobId}`);
    const job = data.job || {};
    const mem = data.memoryStatus || {};
    const status = job.status || mem.status || 'queued';

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      stopPolling();
    }

    showResult(status, {
      rank: mem.rank || job.rank,
      ahead: mem.ahead,
      resultKey: job.result_r2_key,
      errorMessage: job.error_message,
    });
  } catch {
    // Silently retry on next interval
  }
}

// --- Render result ---
function setResult(state) {
  resultSection.hidden = false;
  if (state === 'submitting') {
    statusBadge.className = 'badge';
    statusBadge.textContent = '提交中...';
    jobIdDisplay.textContent = '-';
    resultBody.innerHTML = '';
    resultActions.innerHTML = '';
  }
}

function showResult(status, opts = {}) {
  resultSection.hidden = false;
  jobIdDisplay.textContent = currentJobId || '-';

  const labels = { queued: '排队中', running: '生成中', completed: '已完成', failed: '失败', cancelled: '已取消' };
  statusBadge.className = `badge badge--${status}`;
  statusBadge.textContent = labels[status] || status;

  if (status === 'queued') {
    resultBody.innerHTML = `
      <div class="result-waiting">
        <span class="spinner"></span>
        <span>当前排名 #${opts.rank ?? '-'}，前方 ${opts.ahead ?? '-'} 人</span>
      </div>`;
    resultActions.innerHTML = `<button class="btn-secondary" id="cancelBtn">取消任务</button>`;
    document.querySelector('#cancelBtn')?.addEventListener('click', cancelJob);
  } else if (status === 'running') {
    resultBody.innerHTML = `
      <div class="result-waiting">
        <span class="spinner"></span>
        <span>正在生成图片...</span>
      </div>`;
    resultActions.innerHTML = '';
  } else if (status === 'completed' && opts.resultKey) {
    resultBody.innerHTML = `<img class="result-image" src="/api/images/${currentJobId}" alt="Generated image" />`;
    resultActions.innerHTML = `
      <a class="btn-primary" href="/api/images/${currentJobId}" download="image.png">下载图片</a>
      <button class="btn-secondary" id="newJobBtn">生成新图片</button>`;
    document.querySelector('#newJobBtn')?.addEventListener('click', clearJob);
  } else if (status === 'failed') {
    resultBody.innerHTML = `<p class="result-error">${escapeHtml(opts.errorMessage || '生成失败')}</p>`;
    resultActions.innerHTML = `<button class="btn-subtle" id="retryBtn">重新填写</button>`;
    document.querySelector('#retryBtn')?.addEventListener('click', () => {
      clearJob();
      form.querySelector('#prompt')?.focus();
    });
  } else if (status === 'error') {
    resultBody.innerHTML = `<p class="result-error">${escapeHtml(opts.message || '请求失败')}</p>`;
    resultActions.innerHTML = '';
  } else {
    resultBody.innerHTML = '';
    resultActions.innerHTML = '';
  }
}

async function cancelJob() {
  if (!currentJobId) return;
  try {
    await api(`/api/queue/cancel/${currentJobId}`, { method: 'POST' });
  } catch { /* ignore */ }
  clearJob();
}

function clearJob() {
  currentJobId = null;
  localStorage.removeItem('efi_current_job_id');
  stopPolling();
  resultSection.hidden = true;
}

// --- Overview polling ---
async function refreshOverview() {
  try {
    const data = await api('/api/queue/overview');
    waitingCount.textContent = data.waiting ?? '--';
    runningCount.textContent = data.running ?? '--';
  } catch {
    waitingCount.textContent = '--';
    runningCount.textContent = '--';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---
refreshOverview();
setInterval(refreshOverview, 5000);

if (currentJobId) {
  startPolling();
}
```

- [ ] **Step 2: Commit**

```bash
git add public/assets/app.js
git commit -m "feat: rewrite app.js with image preview, cancel, and polling"
```

---

## Task 5: Rewrite admin.html

**Files:**
- Rewrite: `public/admin.html`

- [ ] **Step 1: Replace the entire admin.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Admin · Edge-Fast-Image-Queue</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/style.css" />
  </head>
  <body>
    <nav class="nav">
      <span class="nav-logo">Admin</span>
      <div class="nav-actions">
        <a href="/" class="btn-subtle">返回首页</a>
      </div>
    </nav>

    <main class="shell">
      <div class="admin-cards">
        <section class="card">
          <div class="admin-header">
            <h2>队列控制</h2>
            <div class="queue-controls">
              <span id="queueStatus" class="badge">--</span>
              <button id="resumeBtn" class="btn-primary">恢复队列</button>
              <button id="pauseBtn" class="btn-danger">暂停队列</button>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>配置</h2>
          <div id="settingsContainer">
            <p style="color:var(--color-mute)">加载中...</p>
          </div>
        </section>

        <section class="card">
          <h2>密钥</h2>
          <div id="secretsContainer">
            <p style="color:var(--color-mute)">加载中...</p>
          </div>
        </section>

        <section class="card">
          <h2>最近任务</h2>
          <div id="jobsContainer">
            <p style="color:var(--color-mute)">加载中...</p>
          </div>
        </section>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-brand">Edge-Fast-Image-Queue</span>
        <div class="footer-links">
          <a href="/">首页</a>
        </div>
      </div>
    </footer>

    <div id="toast" class="toast"></div>
    <script src="/assets/admin.js" type="module"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/admin.html
git commit -m "feat: rewrite admin.html with design system structure"
```

---

## Task 6: Rewrite admin.js (inline editing + queue control)

**Files:**
- Rewrite: `public/assets/admin.js`

- [ ] **Step 1: Replace the entire admin.js**

```javascript
// --- Helpers ---
async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function showToast(message, type = 'error') {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.className = `toast toast--${type} visible`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// --- Queue control ---
document.querySelector('#pauseBtn')?.addEventListener('click', async () => {
  try {
    await api('/api/admin/queue/pause', { method: 'POST' });
    document.querySelector('#queueStatus').textContent = 'paused';
    showToast('队列已暂停', 'success');
  } catch (e) { showToast(e.message); }
});

document.querySelector('#resumeBtn')?.addEventListener('click', async () => {
  try {
    await api('/api/admin/queue/resume', { method: 'POST' });
    document.querySelector('#queueStatus').textContent = 'running';
    showToast('队列已恢复', 'success');
  } catch (e) { showToast(e.message); }
});

// --- Settings table with inline edit ---
async function loadSettings() {
  const container = document.querySelector('#settingsContainer');
  try {
    const data = await api('/api/admin/settings');
    const settings = data.settings || [];
    container.innerHTML = renderSettingsTable(settings);
    bindInlineEdit(container, 'settings');
  } catch (e) {
    container.innerHTML = `<p style="color:var(--color-error)">${escapeHtml(e.message)}</p>`;
  }
}

function renderSettingsTable(rows) {
  if (!rows.length) return '<p style="color:var(--color-mute)">暂无配置</p>';
  let html = `<table class="data-table"><thead><tr>
    <th>Key</th><th>Value</th><th>Group</th><th>Public</th>
  </tr></thead><tbody>`;
  for (const row of rows) {
    html += `<tr>
      <td>${escapeHtml(row.key)}</td>
      <td class="editable" data-key="${escapeHtml(row.key)}" data-type="settings">${escapeHtml(row.value)}</td>
      <td>${escapeHtml(row.group_name)}</td>
      <td>${row.is_public ? 'yes' : 'no'}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  return html;
}

// --- Secrets table with inline edit ---
async function loadSecrets() {
  const container = document.querySelector('#secretsContainer');
  try {
    const data = await api('/api/admin/settings');
    const secrets = data.secrets || [];
    container.innerHTML = renderSecretsTable(secrets);
    bindInlineEdit(container, 'secrets');
  } catch (e) {
    container.innerHTML = `<p style="color:var(--color-error)">${escapeHtml(e.message)}</p>`;
  }
}

function renderSecretsTable(rows) {
  if (!rows.length) return '<p style="color:var(--color-mute)">暂无密钥</p>';
  let html = `<table class="data-table"><thead><tr>
    <th>Key</th><th>Masked Value</th><th>操作</th>
  </tr></thead><tbody>`;
  for (const row of rows) {
    html += `<tr>
      <td>${escapeHtml(row.key)}</td>
      <td>${escapeHtml(row.masked_value || 'configured')}</td>
      <td class="editable" data-key="${escapeHtml(row.key)}" data-type="secrets">点击修改</td>
    </tr>`;
  }
  html += '</tbody></table>';
  return html;
}

// --- Inline edit binding ---
function bindInlineEdit(container, type) {
  container.querySelectorAll('td.editable').forEach((td) => {
    td.addEventListener('click', () => startEdit(td, type));
  });
}

function startEdit(td, type) {
  if (td.querySelector('input')) return;
  const key = td.dataset.key;
  const originalValue = type === 'secrets' ? '' : td.textContent;
  const inputType = type === 'secrets' ? 'password' : 'text';

  td.innerHTML = `<input class="edit-input" type="${inputType}" value="${escapeHtml(originalValue)}" placeholder="${type === 'secrets' ? '输入新密钥值' : ''}" />`;
  const input = td.querySelector('input');
  input.focus();
  input.select();

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveEdit(td, key, input.value, type);
    } else if (e.key === 'Escape') {
      cancelEdit(td, originalValue, type);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (td.querySelector('input')) cancelEdit(td, originalValue, type);
    }, 150);
  });
}

async function saveEdit(td, key, value, type) {
  try {
    if (type === 'secrets') {
      await api(`/api/admin/secrets/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
      td.textContent = '已更新';
    } else {
      await api(`/api/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
      td.textContent = value;
    }
    td.classList.add('flash-success');
    setTimeout(() => td.classList.remove('flash-success'), 500);
    showToast('保存成功', 'success');
  } catch (e) {
    td.classList.add('flash-error');
    setTimeout(() => td.classList.remove('flash-error'), 500);
    showToast(e.message);
  }
}

function cancelEdit(td, originalValue, type) {
  td.textContent = type === 'secrets' ? '点击修改' : originalValue;
}

// --- Jobs table ---
async function loadJobs() {
  const container = document.querySelector('#jobsContainer');
  try {
    const data = await api('/api/admin/jobs');
    const jobs = data.jobs || [];
    if (!jobs.length) { container.innerHTML = '<p style="color:var(--color-mute)">暂无任务</p>'; return; }
    let html = `<table class="data-table"><thead><tr>
      <th>ID</th><th>Provider</th><th>Status</th><th>Model</th><th>Created</th>
    </tr></thead><tbody>`;
    for (const j of jobs) {
      const time = j.created_at ? new Date(j.created_at * 1000).toLocaleString() : '-';
      html += `<tr>
        <td><code>${escapeHtml(j.id)}</code></td>
        <td>${escapeHtml(j.provider)}</td>
        <td><span class="badge badge--${j.status}">${j.status}</span></td>
        <td>${escapeHtml(j.model || '-')}</td>
        <td>${time}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--color-error)">${escapeHtml(e.message)}</p>`;
  }
}

// --- Init ---
loadSettings();
loadSecrets();
loadJobs();
```

- [ ] **Step 2: Commit**

```bash
git add public/assets/admin.js
git commit -m "feat: rewrite admin.js with inline editing and toast notifications"
```

---

## Task 7: Final integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Start dev server and verify index page**

Run: `pnpm dev`

Open `http://localhost:8787`:
- Nav renders with logo + login pills
- Hero section shows h1, lead text, metrics (-- / --)
- Form card has textarea, selects, submit button
- Footer is black with white text
- Mobile: resize to < 768px, verify single column

- [ ] **Step 3: Verify admin page**

Open `http://localhost:8787/admin.html`:
- Nav shows "Admin" + back pill
- Queue control card with pause/resume buttons
- Settings/secrets/jobs tables render (may show error if no admin session — expected)
- Toast appears on button click

- [ ] **Step 4: Verify image endpoint**

If a completed job exists in D1 with a valid `result_r2_key`:
- `GET /api/images/job_<hex>` returns PNG with correct headers
- Invalid jobId returns 404 JSON

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: integration fixups for frontend UI rewrite"
```

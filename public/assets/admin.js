async function api(path, options) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

const settingsTable = document.querySelector('#settingsTable');
const jobsTable = document.querySelector('#jobsTable');

document.querySelector('#pauseBtn')?.addEventListener('click', async () => {
  await api('/api/admin/queue/pause', { method: 'POST' });
  alert('队列已暂停');
});

document.querySelector('#resumeBtn')?.addEventListener('click', async () => {
  await api('/api/admin/queue/resume', { method: 'POST' });
  alert('队列已恢复');
});

async function loadSettings() {
  try {
    const data = await api('/api/admin/settings');
    settingsTable.innerHTML = table(['key', 'value/masked', 'group', 'public'], [
      ...data.settings.map((s) => [s.key, s.value, s.group_name, s.is_public ? 'yes' : 'no']),
      ...data.secrets.map((s) => [s.key, s.masked_value || 'configured', 'secret', 'no'])
    ]);
  } catch (error) {
    settingsTable.textContent = error.message;
  }
}

async function loadJobs() {
  try {
    const data = await api('/api/admin/jobs');
    jobsTable.innerHTML = table(['id', 'provider', 'status', 'rank', 'model'], data.jobs.map((j) => [j.id, j.provider, j.status, j.rank ?? '-', j.model]));
  } catch (error) {
    jobsTable.textContent = error.message;
  }
}

function table(head, rows) {
  return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

loadSettings();
loadJobs();

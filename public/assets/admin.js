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

loadSettings();
loadSecrets();
loadJobs();

const form = document.querySelector('#generateForm');
const jobStatus = document.querySelector('#jobStatus');
const waitingCount = document.querySelector('#waitingCount');
const runningCount = document.querySelector('#runningCount');
let currentJobId = localStorage.getItem('efi_current_job_id');

async function api(path, options) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fd = new FormData(form);
  const payload = {
    prompt: String(fd.get('prompt') || ''),
    size: String(fd.get('size') || '1024x1024'),
    quality: String(fd.get('quality') || 'auto'),
    anonymousDeviceId: getDeviceId()
  };
  jobStatus.textContent = '提交中...';
  try {
    const data = await api('/api/generate', { method: 'POST', body: JSON.stringify(payload) });
    currentJobId = data.jobId;
    localStorage.setItem('efi_current_job_id', currentJobId);
    renderStatus(data.status || { status: 'queued', rank: data.rank });
  } catch (error) {
    jobStatus.textContent = error.message;
  }
});

function getDeviceId() {
  let id = localStorage.getItem('efi_device_id');
  if (!id) {
    id = `dev_${crypto.randomUUID()}`;
    localStorage.setItem('efi_device_id', id);
  }
  return id;
}

async function refreshOverview() {
  try {
    const data = await api('/api/queue/overview');
    waitingCount.textContent = data.waiting;
    runningCount.textContent = data.running;
  } catch {
    waitingCount.textContent = '--';
    runningCount.textContent = '--';
  }
}

async function refreshJob() {
  if (!currentJobId) return;
  try {
    const data = await api(`/api/queue/status/${currentJobId}`);
    renderStatus(data);
  } catch (error) {
    jobStatus.textContent = error.message;
  }
}

function renderStatus(data) {
  const memory = data.memoryStatus || data;
  const job = data.job || {};
  const status = job.status || memory.status;
  const rank = memory.rank || job.rank;
  jobStatus.innerHTML = `
    <p><span class="badge ${status}">${status}</span></p>
    <p>任务：<code>${currentJobId || data.jobId || '-'}</code></p>
    <p>当前排名：<strong>${rank ?? '-'}</strong></p>
    <p>前方人数：<strong>${memory.ahead ?? '-'}</strong></p>
    ${job.result_r2_key ? `<p>结果已生成：<code>${job.result_r2_key}</code></p>` : ''}
    ${job.error_message ? `<p class="hint">错误：${job.error_message}</p>` : ''}
  `;
}

refreshOverview();
refreshJob();
setInterval(refreshOverview, 5000);
setInterval(refreshJob, 3000);

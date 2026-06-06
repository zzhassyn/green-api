'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const BASE_URL      = 'https://api.green-api.com';
const REQUEST_TIMEOUT_MS = 15_000;

/* ═══════════════════════════════════════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const dom = {
  idInstance:        $('idInstance'),
  apiTokenInstance:  $('apiTokenInstance'),
  phoneMessage:      $('phoneMessage'),
  messageText:       $('messageText'),
  phoneFile:         $('phoneFile'),
  fileUrl:           $('fileUrl'),
  outputArea:        $('outputArea'),
  statusDot:         $('statusDot'),
  statusLabel:       $('statusLabel'),
  btnGetSettings:    $('btnGetSettings'),
  btnGetStateInstance: $('btnGetStateInstance'),
  btnSendMessage:    $('btnSendMessage'),
  btnSendFileByUrl:  $('btnSendFileByUrl'),
  btnClear:          $('btnClear'),
};

/* ═══════════════════════════════════════════════════════════════════════════
   API CLIENT LAYER
═══════════════════════════════════════════════════════════════════════════ */
async function apiRequest(methodName, httpMethod, body = null) {
  const { idInstance, apiTokenInstance } = getCredentials();
  const url = `${BASE_URL}/waInstance${idInstance}/${methodName}/${apiTokenInstance}`;
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const options = {
    method:  httpMethod,
    signal:  controller.signal,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody = null;
      try { errorBody = await response.json(); } catch { errorBody = await response.text(); }
      throw buildError(`Ошибка сервера (Статус ${response.status})`, errorBody);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.__isApiError) throw err;
    if (err.name === 'AbortError') throw buildError('Время ожидания ответа истекло.');
    throw buildError('Network Error', err.message || 'Failed to fetch');
  }
}

function getCredentials() {
  return {
    idInstance:       dom.idInstance.value.trim(),
    apiTokenInstance: dom.apiTokenInstance.value.trim(),
  };
}

function buildError(message, details = undefined) {
  const obj = { error: message };
  if (details !== undefined) obj.details = details;
  obj.__isApiError = true;
  return obj;
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALIDATION LAYER
═══════════════════════════════════════════════════════════════════════════ */
function validateCredentials() {
  const { idInstance, apiTokenInstance } = getCredentials();
  if (!idInstance || !apiTokenInstance) {
    throw buildError('Не заполнены параметры подключения к GREEN-API.');
  }
}

function sanitizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    throw buildError('Некорректный номер телефона.');
  }
  return `${digits}@c.us`;
}

function validateUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw buildError('Некорректный URL файла.');
  }
}

function extractFileName(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts    = pathname.split('/').filter(Boolean);
    const last     = parts[parts.length - 1] || '';
    return last || 'file';
  } catch {
    return 'file';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI STATE MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */
function setButtonLoading(btn, loading) {
  const originalLabel = btn.dataset.label;

  if (loading) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    const badge = btn.querySelector('.btn-method');
    const badgeHtml = badge ? badge.outerHTML : '';
    btn.innerHTML = `${badgeHtml}<span class="btn-label">Loading</span>`;
  } else {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    const badge = btn.querySelector('.btn-method');
    const badgeHtml = badge ? badge.outerHTML : '';
    btn.innerHTML = `${badgeHtml}${originalLabel}`;
  }
}

function showResult(data, isError = false) {
  const serializable = typeof data === 'object'
    ? (({ __isApiError, ...rest }) => rest)(data)
    : data;

  dom.outputArea.value = JSON.stringify(serializable, null, 2);
  dom.outputArea.classList.toggle('is-error', isError);
}

function setStatus(state) {
  const dot   = dom.statusDot;
  const label = dom.statusLabel;

  dot.className = 'status-dot';

  if (state === 'active') {
    dot.classList.add('active');
    label.textContent = 'Подключено';
  } else if (state === 'error') {
    dot.classList.add('error');
    label.textContent = 'Ошибка';
  } else {
    label.textContent = 'Нет соединения';
  }
}


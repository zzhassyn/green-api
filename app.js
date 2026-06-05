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
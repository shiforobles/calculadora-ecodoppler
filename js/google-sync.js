/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 *
 * Uses a simple POST (text/plain, no preflight) and reads the script's JSON
 * acknowledgement to confirm the row was written. POST avoids the URL-length limit that
 * broke the previous GET approach with 64 columns of data.
 *
 * Key: do NOT set a Content-Type header manually (it would trigger a preflight).
 * The browser sets text/plain automatically for string bodies, which
 * is a CORS-safe header and goes through without a preflight.
 */
class GoogleSync {
    static URL_KEY        = 'ecodoppler_script_url';
    static SHEET_URL_KEY  = 'ecodoppler_sheet_url';
    static DOCTOR_KEY     = 'ecodoppler_doctor';
    static MATRICULA_KEY  = 'ecodoppler_matricula';
    static FIRMA_KEY      = 'ecodoppler_firma_enabled';

    static getUrl()          { return localStorage.getItem(this.URL_KEY) || ''; }
    static setUrl(url)       { localStorage.setItem(this.URL_KEY, url.trim()); }
    static isConfigured()    { return !!this.getUrl(); }

    static getSheetUrl()     { return localStorage.getItem(this.SHEET_URL_KEY) || ''; }
    static setSheetUrl(url)  { localStorage.setItem(this.SHEET_URL_KEY, url.trim()); }

    static getDoctor()       { return localStorage.getItem(this.DOCTOR_KEY) || ''; }
    static setDoctor(v)      { localStorage.setItem(this.DOCTOR_KEY, v.trim()); }
    static getMatricula()    { return localStorage.getItem(this.MATRICULA_KEY) || ''; }
    static setMatricula(v)   { localStorage.setItem(this.MATRICULA_KEY, v.trim()); }
    static isFirmaEnabled()  { return localStorage.getItem(this.FIRMA_KEY) === '1'; }
    static setFirmaEnabled(v){ localStorage.setItem(this.FIRMA_KEY, v ? '1' : '0'); }

    static INSTITUCIONES_KEY = 'ecodoppler_instituciones';
    static INSTITUCION_KEY   = 'ecodoppler_institucion_actual';
    /** Lista propia de instituciones (una por línea en ⚙️). Vive solo en el navegador. */
    static getInstituciones() {
        const seen = new Set();
        return (localStorage.getItem(this.INSTITUCIONES_KEY) || '').split('\n')
            .map(v => v.trim()).filter(v => v && !seen.has(v) && seen.add(v));
    }
    static setInstituciones(text) {
        localStorage.setItem(this.INSTITUCIONES_KEY, String(text || '').split('\n').map(v => v.trim()).filter(Boolean).join('\n'));
    }
    static getInstitucion() {
        const actual = localStorage.getItem(this.INSTITUCION_KEY) || '';
        return this.getInstituciones().includes(actual) ? actual : '';
    }
    static setInstitucion(v) { localStorage.setItem(this.INSTITUCION_KEY, v || ''); }

    static getOptional(key) { return localStorage.getItem(key) || ''; }
    static setOptional(key, value) { localStorage.setItem(key, value.trim()); }
    static safeWebUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
        } catch { return ''; }
    }

    static validScriptUrl(value) {
        if (!this.safeWebUrl(value)) return false;
        const url = new URL(value);
        return url.hostname === 'script.google.com' && /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname);
    }

    static getFirma() {
        if (!this.isFirmaEnabled()) return '';
        const name = this.getDoctor();
        const mat  = this.getMatricula();
        if (!name && !mat) return '';
        return (name ? name + '\n' : '') + (mat ? 'MN: ' + mat : '');
    }

    /** Identificador de un envío: reintentar con el mismo no duplica la fila. */
    static newStudyId() {
        const rnd = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2);
        return 'E-' + rnd;
    }

    /**
     * Envía una fila y espera el acuse del script.
     * Devuelve { confirmed: true } solo si el script respondió status ok después
     * de escribir. Si la respuesta no se puede leer devuelve { confirmed: false }:
     * la fila pudo haberse guardado o no. Lanza error si el script informó una falla.
     */
    static async send(row, studyId = '') {
        const base = this.getUrl();
        if (!base) throw new Error('URL del script no configurada');

        // Sin headers: el navegador usa text/plain, que no requiere preflight CORS.
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), 30000) : null;
        let data = null;
        try {
            const res = await fetch(base, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify({ action: 'save', row, studyId }),
                signal: ctrl ? ctrl.signal : undefined
            });
            data = await res.json();
        } catch (e) {
            return { confirmed: false };
        } finally {
            if (timer) clearTimeout(timer);
        }
        if (data && data.status === 'ok') return { confirmed: true, duplicate: !!data.duplicate };
        if (data && data.status === 'error') throw new Error(data.msg || 'el script informó un error');
        return { confirmed: false };
    }

    /** Returns a GET test URL to open directly in the browser */
    static testUrl() {
        const base = this.getUrl();
        if (!base) return null;
        return `${base}?action=test&_t=${Date.now()}`;
    }

    /** Apps Script source code — bound script (created from inside the Sheet) */
    static scriptCode() {
        const headers = [...(window.StudyStorage ? StudyStorage.HEADERS : []), 'ID Estudio'];
        const headersJson = JSON.stringify(headers, null, 2);

        return `// ─── IMPORTANTE: crear este script DESDE dentro del Google Sheet ──
// Abrí tu Google Sheet → Extensiones → Apps Script
// Borrá todo el código existente y pegá este
// Luego: Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
// Copiá la URL /exec y pegala en la app (⚙️)
// ─────────────────────────────────────────────────────────────────

const SHEET_NAME = 'Estudios';

const HEADERS = ${headersJson};

// Columnas que se guardan siempre como texto (no se convierten a número).
const TEXT_COLS = ['HC', 'Prot Modelo', 'Informe', 'Observaciones', 'Institución'].map(function (h) { return HEADERS.indexOf(h); });
const ID_COL = HEADERS.indexOf('ID Estudio') + 1;

// "22.6" llega como texto y la planilla puede leerlo como fecha (22 de junio).
// Convertirlo a número antes de escribir evita que los decimales se corrompan.
function aNumero_(v, i) {
  if (typeof v !== 'string' || TEXT_COLS.indexOf(i) !== -1) return v;
  const t = v.trim();
  return /^-?\\d+(\\.\\d+)?$/.test(t) ? Number(t) : v;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // dos guardados a la vez no se pisan
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#1a73e8')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // Reintento del mismo estudio: si el ID ya está en la planilla no se duplica.
    const id = String(data.studyId || '');
    if (id && sheet.getLastRow() > 1 && sheet.getLastColumn() >= ID_COL) {
      const found = sheet.getRange(2, ID_COL, sheet.getLastRow() - 1, 1)
        .createTextFinder(id).matchEntireCell(true).findNext();
      if (found) return json_({ status: 'ok', studyId: id, duplicate: true });
    }

    const row = data.row.map(aNumero_);
    if (id) {
      while (row.length < ID_COL - 1) row.push('');
      row[ID_COL - 1] = id;
      if (!sheet.getRange(1, ID_COL).getValue()) sheet.getRange(1, ID_COL).setValue('ID Estudio');
    }
    sheet.appendRow(row);
    SpreadsheetApp.flush(); // la respuesta ok sale recién con la fila escrita

    return json_({ status: 'ok', studyId: id, duplicate: false });
  } catch (err) {
    return json_({ status: 'error', msg: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'panel') return leerPanel_(p.key);
  return json_({ status: 'ok', message: 'Script activo ✓' });
}

// ─── Lectura para el panel (dashboard) ───────────────────────────
// Solo responde si recibe la clave guardada en las propiedades del script.
// Así el panel funciona online sin publicar la planilla en la web.
function leerPanel_(key) {
  const saved = PropertiesService.getScriptProperties().getProperty('PANEL_KEY');
  if (!saved || !key || String(key) !== saved) return json_({ status: 'denied' });
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() === 0) return json_({ status: 'ok', headers: [], rows: [] });
  const range  = sheet.getDataRange();
  const values = range.getDisplayValues();
  const raw    = range.getValues();
  const tz     = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  // La fecha viaja siempre como AAAA-MM-DD, sin depender del idioma de la planilla.
  for (let r = 1; r < values.length; r++) {
    if (Object.prototype.toString.call(raw[r][0]) === '[object Date]') {
      values[r][0] = Utilities.formatDate(raw[r][0], tz, 'yyyy-MM-dd');
    }
  }
  return json_({ status: 'ok', headers: values[0], rows: values.slice(1) });
}

// Ejecutar UNA vez desde el editor (elegir crearClavePanel → Ejecutar).
// La clave aparece en el "Registro de ejecución": copiala y pegala en la app
// (⚙️ → Clave del panel). Volver a ejecutarla crea una clave nueva y anula la anterior.
function crearClavePanel() {
  const key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('PANEL_KEY', key);
  Logger.log('Clave del panel: ' + key);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

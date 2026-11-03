/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 *
 * Uses POST + no-cors: the response is opaque; delivery and persistence
 * cannot be confirmed by the browser. POST avoids the URL-length limit that
 * broke the previous GET approach with 64 columns of data.
 *
 * Key: do NOT set Content-Type header manually in no-cors mode.
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

    /** Send a row; no-cors does not confirm that it was persisted. */
    static async send(row) {
        const base = this.getUrl();
        if (!base) throw new Error('URL del script no configurada');

        // No headers object → browser sets Content-Type: text/plain automatically
        // text/plain is a CORS-safe header = no preflight needed
        await fetch(base, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'save', row })
        });
    }

    /** Returns a GET test URL to open directly in the browser */
    static testUrl() {
        const base = this.getUrl();
        if (!base) return null;
        return `${base}?action=test&_t=${Date.now()}`;
    }

    /** Apps Script source code — bound script (created from inside the Sheet) */
    static scriptCode() {
        const headers = window.StudyStorage ? StudyStorage.HEADERS : [];
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

function doPost(e) {
  try {
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

    sheet.appendRow(data.row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', msg: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Script activo ✓' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

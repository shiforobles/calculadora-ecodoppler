/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 *
 * Uses POST + no-cors: the body is always delivered to doPost()
 * regardless of CORS headers. POST avoids the URL-length limit that
 * broke the previous GET approach with 64 columns of data.
 *
 * Key: do NOT set Content-Type header manually in no-cors mode.
 * The browser sets text/plain automatically for string bodies, which
 * is a CORS-safe header and goes through without a preflight.
 */
class GoogleSync {
    static URL_KEY = 'ecodoppler_script_url';

    static getUrl()       { return localStorage.getItem(this.URL_KEY) || ''; }
    static setUrl(url)    { localStorage.setItem(this.URL_KEY, url.trim()); }
    static isConfigured() { return !!this.getUrl(); }

    /** Send one study row via POST no-cors — body always reaches doPost() */
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

    /** Apps Script source code — uses doPost for saves, doGet for test */
    static scriptCode() {
        const headers = window.StudyStorage ? StudyStorage.HEADERS : [];
        const headersJson = JSON.stringify(headers, null, 2);

        return `// ─── Pegá este código en Google Apps Script ──────────────────────
// IMPORTANTE: crear implementación NUEVA (no editar la existente)
//   Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo
//   Quién tiene acceso: Cualquier usuario
//   → Copiar la URL que termina en /exec
// ─────────────────────────────────────────────────────────────────

const SHEET_NAME = 'Estudios';

const HEADERS = ${headersJson};

// Guardar fila — llamado desde la app vía POST
function doPost(e) {
  return _handle(e.postData ? e.postData.contents : null);
}

// Probar conexión — abrir en el navegador con ?action=test
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'test') {
    return _ok({ ok: true, message: 'Conexión exitosa ✓' });
  }
  return _ok({ ok: false, error: 'Usá doPost para guardar datos' });
}

function _handle(bodyStr) {
  try {
    if (!bodyStr) return _ok({ ok: false, error: 'Body vacío' });

    const data  = JSON.parse(bodyStr);
    const row   = data.row;
    if (!row)   return _ok({ ok: false, error: 'Falta campo row' });

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const rng = sheet.getRange(1, 1, 1, HEADERS.length);
      rng.setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(row);
    return _ok({ ok: true, fila: sheet.getLastRow() });

  } catch(err) {
    return _ok({ ok: false, error: err.message });
  }
}

function _ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

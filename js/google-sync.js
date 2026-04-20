/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 *
 * Uses GET + no-cors: the request always reaches Apps Script regardless
 * of CORS headers on the response. Data is written to the Sheet even
 * though we receive an opaque response.
 *
 * For testing, the user opens the test URL in a browser tab directly.
 */
class GoogleSync {
    static URL_KEY = 'ecodoppler_script_url';

    static getUrl()       { return localStorage.getItem(this.URL_KEY) || ''; }
    static setUrl(url)    { localStorage.setItem(this.URL_KEY, url.trim()); }
    static isConfigured() { return !!this.getUrl(); }

    /** Send one study row — fire-and-forget via no-cors GET */
    static async send(row) {
        const base = this.getUrl();
        if (!base) throw new Error('URL del script no configurada');

        const params = new URLSearchParams({
            action: 'save',
            row: JSON.stringify(row),
            _t: Date.now()
        });

        // no-cors GET: opaque response, but Apps Script always receives the request
        await fetch(`${base}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
    }

    /** Returns the test URL (to open in a browser tab for direct verification) */
    static testUrl() {
        const base = this.getUrl();
        if (!base) return null;
        return `${base}?action=test&_t=${Date.now()}`;
    }

    /** Apps Script source code shown in the setup modal */
    static scriptCode() {
        const headers = window.StudyStorage ? StudyStorage.HEADERS : [];
        const headersJson = JSON.stringify(headers, null, 2);

        return `// ─── Pegá este código en Google Apps Script ──────────────────────
// IMPORTANTE: Crear implementación NUEVA (no editar la existente)
//   Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo
//   Quién tiene acceso: Cualquier usuario
//   → Copiar la URL generada
// ─────────────────────────────────────────────────────────────────

const SHEET_NAME = 'Estudios';

const HEADERS = ${headersJson};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'save';

  const ok  = (obj) => ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  try {
    if (action === 'test') {
      return ok({ ok: true, message: 'Conexión exitosa ✓' });
    }

    const rowJson = e.parameter.row;
    if (!rowJson) return ok({ ok: false, error: 'Falta parámetro row' });

    const row   = JSON.parse(rowJson);
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
    return ok({ ok: true, fila: sheet.getLastRow() });

  } catch(err) {
    return ok({ ok: false, error: err.message });
  }
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 *
 * Apps Script GET responses include Access-Control-Allow-Origin: *,
 * so we use regular fetch (no no-cors) and can read the response.
 */
class GoogleSync {
    static URL_KEY = 'ecodoppler_script_url';

    static getUrl()       { return localStorage.getItem(this.URL_KEY) || ''; }
    static setUrl(url)    { localStorage.setItem(this.URL_KEY, url.trim()); }
    static isConfigured() { return !!this.getUrl(); }

    static async _get(params) {
        const base = this.getUrl();
        if (!base) throw new Error('URL del script no configurada');

        // Add cache-bust so browser doesn't cache identical requests
        params._t = Date.now();
        const url = `${base}?${new URLSearchParams(params).toString()}`;

        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status} — verificá que la URL sea correcta`);

        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error en el script');
        return data;
    }

    /** Test the connection without saving data */
    static async test() {
        return this._get({ action: 'test' });
    }

    /** Send one study row to Google Sheets */
    static async send(row) {
        return this._get({ action: 'save', row: JSON.stringify(row) });
    }

    /** Apps Script source code shown in the setup modal */
    static scriptCode() {
        const headers = window.StudyStorage ? StudyStorage.HEADERS : [];
        const headersJson = JSON.stringify(headers, null, 2);

        return `// ─── Pegá este código en Google Apps Script ─────────────────────
// Después: Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo
//   Quién tiene acceso: Cualquier usuario
// ─────────────────────────────────────────────────────────────

const SHEET_NAME = 'Estudios';

const HEADERS = ${headersJson};

function doGet(e) {
  const action = e.parameter.action || 'save';

  // CORS headers para que el browser pueda leer la respuesta
  const output = (obj) => ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  try {
    if (action === 'test') {
      return output({ ok: true, message: 'Conexión exitosa ✓' });
    }

    if (action === 'save') {
      const rowJson = e.parameter.row;
      if (!rowJson) return output({ ok: false, error: 'Parámetro "row" faltante' });

      const row  = JSON.parse(rowJson);
      const ss   = SpreadsheetApp.getActiveSpreadsheet();
      let sheet  = ss.getSheetByName(SHEET_NAME);
      if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        const h = sheet.getRange(1, 1, 1, HEADERS.length);
        h.setFontWeight('bold')
         .setBackground('#1e3a8a')
         .setFontColor('#ffffff');
        sheet.setFrozenRows(1);
      }

      sheet.appendRow(row);
      return output({ ok: true, fila: sheet.getLastRow() });
    }

    return output({ ok: false, error: 'Acción desconocida: ' + action });

  } catch(err) {
    return output({ ok: false, error: err.message });
  }
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

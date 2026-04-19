/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 *
 * Uses GET + URL params (not POST) because POST bodies can be lost
 * when Apps Script does authentication redirects. GET requests via
 * no-cors reach doGet() reliably without CORS or auth issues.
 */
class GoogleSync {
    static URL_KEY = 'ecodoppler_script_url';

    static getUrl()       { return localStorage.getItem(this.URL_KEY) || ''; }
    static setUrl(url)    { localStorage.setItem(this.URL_KEY, url.trim()); }
    static isConfigured() { return !!this.getUrl(); }

    /**
     * Send one study row to Apps Script via GET request.
     * @param {string[]} row - Data values array
     */
    static async send(row) {
        const base = this.getUrl();
        if (!base) throw new Error('URL del script no configurada');

        // Encode row as JSON in a URL param
        const params = new URLSearchParams({ row: JSON.stringify(row) });
        const url = `${base}?${params.toString()}`;

        // GET + no-cors = always reaches Apps Script, no preflight, no auth redirect
        await fetch(url, { method: 'GET', mode: 'no-cors' });
    }

    /** Apps Script source code shown in the setup modal */
    static scriptCode() {
        // Embed the column headers directly so the script is self-contained
        const headers = window.StudyStorage ? StudyStorage.HEADERS : [];
        const headersJson = JSON.stringify(headers, null, 2);

        return `// ─── Pegá este código en Google Apps Script ─────────────────────
// Después: Implementar → Nueva implementación → Aplicación web
//   Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
// ─────────────────────────────────────────────────────────────

const SHEET_NAME = 'Estudios';

const HEADERS = ${headersJson};

function doGet(e) {
  try {
    const rowJson = e.parameter.row;
    if (!rowJson) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Sin datos' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const row  = JSON.parse(rowJson);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    let sheet  = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // Encabezados en fila 1 (solo la primera vez)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const h = sheet.getRange(1, 1, 1, HEADERS.length);
      h.setFontWeight('bold')
       .setBackground('#1e3a8a')
       .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, fila: sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

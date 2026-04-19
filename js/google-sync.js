/**
 * GoogleSync — Send study rows to a Google Apps Script Web App
 * The script appends each row to a Google Sheet automatically.
 *
 * Setup instructions are shown in the settings modal inside the app.
 */
class GoogleSync {
    static URL_KEY = 'ecodoppler_script_url';

    static getUrl()        { return localStorage.getItem(this.URL_KEY) || ''; }
    static setUrl(url)     { localStorage.setItem(this.URL_KEY, url.trim()); }
    static isConfigured()  { return !!this.getUrl(); }

    /**
     * Send a study row to the Apps Script Web App.
     * Uses no-cors so data goes through even without CORS headers on the script response.
     * @param {string[]} headers - Column headers
     * @param {string[]} row     - Data row
     */
    static async send(headers, row) {
        const url = this.getUrl();
        if (!url) throw new Error('URL del script no configurada');

        // no-cors: opaque response but data IS received by Apps Script
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ headers, row })
        });
    }

    /**
     * Apps Script source code to show in the setup modal.
     */
    static scriptCode() {
        return `// ─── Pegá este código en Google Apps Script ─────────────────────────
const SHEET_NAME = 'Estudios';

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet  = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // Encabezados en fila 1 (solo la primera vez)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(data.headers);
      const h = sheet.getRange(1, 1, 1, data.headers.length);
      h.setFontWeight('bold')
       .setBackground('#1e3a8a')
       .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(data.row);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
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

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

    /** Apps Script source code — standalone script using Sheet URL */
    static scriptCode() {
        const headers = window.StudyStorage ? StudyStorage.HEADERS : [];
        const headersJson = JSON.stringify(headers, null, 2);

        return `// ─── Pegá este código en Google Apps Script ──────────────────────
// 1. Borrá todo el código existente y pegá este
// 2. IMPORTANTE: reemplazá la URL de abajo con la de TU Google Sheet
//    (la URL larga de tu planilla, ej: https://docs.google.com/spreadsheets/d/ABC.../edit)
// 3. Implementar → Nueva implementación → Aplicación web
//    Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
// 4. Copiá la URL /exec y pegala en la app (⚙️)
// ─────────────────────────────────────────────────────────────────

const SHEET_URL = 'PEGAR_URL_DE_TU_GOOGLE_SHEET_ACÁ';
const SHEET_NAME = 'Estudios';

const HEADERS = ${headersJson};

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.openByUrl(SHEET_URL);
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
}

// ─── EJECUTÁ ESTA FUNCIÓN UNA VEZ DESDE EL EDITOR ────────────────
// Seleccioná "setup" en el menú desplegable → ▶ Ejecutar
// Esto autoriza el acceso al Sheet y verifica que la URL sea correcta
function setup() {
  try {
    const ss    = SpreadsheetApp.openByUrl(SHEET_URL);
    const sheet = ss.getSheetByName('Estudios') || ss.getActiveSheet();
    Browser.msgBox('✅ Conexión OK con: ' + ss.getName() + '\\nHoja: ' + sheet.getName());
  } catch(err) {
    Browser.msgBox('❌ Error: ' + err.message + '\\n\\nVerificá que SHEET_URL sea correcta.');
  }
}`;
    }
}

if (typeof window !== 'undefined') window.GoogleSync = GoogleSync;

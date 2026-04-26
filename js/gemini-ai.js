/**
 * GeminiAI — Narrative report generation via Google Gemini API
 * Called directly from the browser (Gemini supports CORS).
 * API key stored in localStorage (single-user app).
 */
class GeminiAI {
    static KEY_STORAGE = 'ecodoppler_gemini_key';
    static MODEL       = 'gemini-2.0-flash';

    static getKey()      { return localStorage.getItem(this.KEY_STORAGE) || ''; }
    static setKey(k)     { localStorage.setItem(this.KEY_STORAGE, k.trim()); }
    static isConfigured(){ return !!this.getKey(); }

    static SYSTEM_PROMPT = `Eres un cardiólogo experto en ecocardiografía, especializado en la aplicación de las Guías ASE/EACVI 2016 en la práctica clínica diaria de Argentina.

Tu tarea es redactar la sección "IMPRESIÓN DIAGNÓSTICA" de un informe de ecocardiograma transtorácico, basándote en el JSON con los datos técnicos del estudio.

REGLAS CLÍNICAS OBLIGATORIAS:
1. Jerarquización por gravedad: el hallazgo más grave lidera el relato (ej. estenosis aórtica severa o FEy muy deprimida van primero).
2. Conectividad fisiopatológica: conecta causas con consecuencias (ej. "la estenosis aórtica justifica el remodelado concéntrico del VI").
3. BCRI: cualquier alteración de la motilidad septal se atribuye al trastorno de conducción, no a isquemia, salvo evidencia explícita.
4. MAC: el E/e' puede estar falsamente elevado; no usarlo como criterio aislado de presiones de llenado.
5. FA: la función diastólica se evalúa por LAVI e IT, no por la relación E/A (onda A ausente en FA).
6. Incluye los valores numéricos críticos entre paréntesis para respaldar cada conclusión.
7. Si hay datos inconsistentes (ej. gradiente bajo con AVA muy pequeña), agregá "Observación técnica:" al final del informe.
8. Hallazgos normales: mencionalos brevemente al final o intégralos como contexto.

FORMATO DE SALIDA:
- Texto plano, sin markdown, sin asteriscos, sin guiones de lista.
- Párrafos separados por temática: VI y función sistólica → Válvulas (si patológicas) → Hemodinámica y función diastólica → Cavidades derechas y HTP → Pericardio (solo si hay derrame).
- Sin saludos, sin "Estimado colega", sin introducción. Directo al primer párrafo clínico.
- Máximo 20 líneas.
- Idioma: español médico de Argentina.`;

    /**
     * Send clinical JSON to Gemini and return the narrative text
     * @param {string} clinicalJson - stringified clinical data
     * @returns {Promise<string>} AI-generated narrative
     */
    static async generateNarrative(clinicalJson) {
        const key = this.getKey();
        if (!key) throw new Error('API key de Gemini no configurada. Ingresala en ⚙️ Configuración.');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${key}`;

        const body = {
            system_instruction: { parts: [{ text: this.SYSTEM_PROMPT }] },
            contents: [{
                parts: [{ text: `Datos clínicos del ecocardiograma:\n${clinicalJson}` }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024
            }
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            let msg = `Error ${resp.status}`;
            try {
                const err = await resp.json();
                msg = err?.error?.message || msg;
            } catch (_) {}
            throw new Error(msg);
        }

        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini no devolvió contenido. Revisá la API key.');
        return text.trim();
    }
}

if (typeof window !== 'undefined') window.GeminiAI = GeminiAI;

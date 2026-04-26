/**
 * GeminiAI — Narrative report generation via Google Gemini API
 * Called directly from the browser (Gemini supports CORS).
 * API key stored in localStorage (single-user app).
 */
class GeminiAI {
    static KEY_STORAGE = 'ecodoppler_gemini_key';
    // Models tried in order — 1.5-flash has the most generous free quota
    static MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

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
     * Try one model — returns text or throws with the error message
     */
    static async _tryModel(model, key, clinicalJson) {
        // gemini-2.0-* only available in v1beta; 1.5-* stable in v1
        const apiVer = model.startsWith('gemini-2') ? 'v1beta' : 'v1';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`.replace('v1beta', apiVer);
        const body = {
            system_instruction: { parts: [{ text: this.SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: `Datos clínicos del ecocardiograma:\n${clinicalJson}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        };
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            let msg = `Error ${resp.status}`;
            try { const err = await resp.json(); msg = err?.error?.message || msg; } catch (_) {}
            throw new Error(msg);
        }
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Sin contenido en respuesta');
        return text.trim();
    }

    /**
     * Send clinical JSON to Gemini — tries each model in order until one works
     * @param {string} clinicalJson - stringified clinical data
     * @returns {Promise<string>} AI-generated narrative
     */
    static async generateNarrative(clinicalJson) {
        const key = this.getKey();
        if (!key) throw new Error('API key de Gemini no configurada. Ingresala en ⚙️ Configuración.');

        let lastError = null;
        for (const model of this.MODELS) {
            try {
                return await this._tryModel(model, key, clinicalJson);
            } catch (err) {
                lastError = err;
                // Only retry on quota/rate-limit errors; propagate auth errors immediately
                const isQuota = /quota|rate.limit|resource.exhausted|429/i.test(err.message);
                if (!isQuota) throw err;
            }
        }
        throw lastError;
    }
}

if (typeof window !== 'undefined') window.GeminiAI = GeminiAI;

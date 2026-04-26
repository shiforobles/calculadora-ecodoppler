/**
 * GeminiAI — Narrative report generation via Google Gemini API
 * Called directly from the browser (Gemini supports CORS).
 * API key stored in localStorage (single-user app).
 */
class GeminiAI {
    static KEY_STORAGE = 'ecodoppler_gemini_key';
    // Confirmed available models (from listAvailableModels), in preferred order
    static MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];

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
     * Fetch available models for this API key and return names that support generateContent
     */
    static async listAvailableModels(key) {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        );
        if (!resp.ok) return [];
        const data = await resp.json();
        return (data.models || [])
            .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
    }

    /**
     * Try one model — returns text or throws with the error message
     */
    static async _tryModel(model, key, clinicalJson) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const body = {
            contents: [{
                role: 'user',
                parts: [{ text: `${this.SYSTEM_PROMPT}\n\nDatos clínicos del ecocardiograma:\n${clinicalJson}` }]
            }]
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
     * Send clinical JSON to Gemini — auto-detects available models, tries each until one works
     * @param {string} clinicalJson - stringified clinical data
     * @returns {Promise<string>} AI-generated narrative
     */
    static async generateNarrative(clinicalJson) {
        const key = this.getKey();
        if (!key) throw new Error('API key de Gemini no configurada. Ingresala en ⚙️ Configuración.');

        // Use preferred order: 2.5-flash first, then fallbacks
        // autodetect verifies availability; preferred list drives order
        let available = await this.listAvailableModels(key);
        if (available.length > 0) {
            const preferred = this.MODELS;
            // Sort: preferred models first (in preferred order), then rest alphabetically
            available.sort((a, b) => {
                const pa = preferred.indexOf(a);
                const pb = preferred.indexOf(b);
                if (pa !== -1 && pb !== -1) return pa - pb;
                if (pa !== -1) return -1;
                if (pb !== -1) return 1;
                return a.localeCompare(b);
            });
            // Only keep gemini models (not gemma, lyria, robotics, deep-research, etc.)
            available = available.filter(m => m.startsWith('gemini-') && !m.includes('tts') && !m.includes('image') && !m.includes('computer-use'));
        } else {
            available = this.MODELS;
        }

        let lastError = null;
        for (const model of available) {
            try {
                return await this._tryModel(model, key, clinicalJson);
            } catch (err) {
                lastError = err;
                const isRetryable = /quota|rate.limit|resource.exhausted|not found|404|429/i.test(err.message);
                if (!isRetryable) throw err;
            }
        }
        throw lastError || new Error('No se encontró ningún modelo Gemini disponible con esta API key.');
    }
}

if (typeof window !== 'undefined') window.GeminiAI = GeminiAI;

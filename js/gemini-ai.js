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

REGLAS GENERALES:
1. Jerarquización por gravedad: el hallazgo más grave lidera el relato.
2. Conectividad fisiopatológica: conecta causas con consecuencias.
3. Incluí los valores numéricos críticos entre paréntesis para respaldar cada conclusión.
4. Hallazgos normales: mencionalos brevemente al final o intégralos como contexto.
5. Si hay datos inconsistentes, agregá "Observación técnica:" al final.

REGLAS PARA FUNCIÓN DIASTÓLICA (CRÍTICO — seguir al pie de la letra):
El JSON incluye el campo "funcion_diastolica" con el grado ya calculado por el algoritmo ASE/EACVI 2016. Tu tarea es narrar ese resultado, no recalcularlo.

Umbrales exactos del algoritmo (para justificar correctamente el grado):
- E/e' elevado: >14 (o >15 en MCP). Si E/e' ≤14, NO lo cites como criterio positivo de presiones elevadas.
- LAVI elevado: >34 ml/m². Si LAVI ≤34, las presiones no están elevadas por este criterio.
- IT elevada: velocidad >2.8 m/s.
- E/A: ≤0.8 → relajación prolongada; >2 → restrictivo; entre 0.8 y 2 → requiere criterios adicionales.
- Valsalva positivo: si E/A cae ≤0.8 con Valsalva, confirma patrón pseudonormal (Grado II).

Cómo narrar según el grado calculado:
- Grado Normal: "La función diastólica es normal, con presiones de llenado del VI conservadas."
- Grado I: "Se identifica disfunción diastólica grado I (patrón de relajación prolongada), con presiones de llenado normales, evidenciado por [mencionar solo los criterios que SÍ aplican]."
- Grado II: "Se identifica disfunción diastólica grado II (patrón pseudonormal), con presiones de llenado del VI elevadas, sustentado por [mencionar solo los criterios positivos: E/e' >14 si aplica, LAVI >34 si aplica, IT >2.8 si aplica, Valsalva positivo si aplica]."
- Grado III: "Se identifica disfunción diastólica grado III (patrón restrictivo), con presiones de llenado marcadamente elevadas."
- Indeterminado: "La evaluación de la función diastólica resulta indeterminada [explicar brevemente la razón: criterios contrapuestos, datos insuficientes, etc.]."

Condiciones especiales:
- BCRI en contexto_especial: la motilidad septal alterada es por conducción, no isquemia.
- MAC en contexto_especial: el E/e' no es válido; no citarlo como criterio de presiones.
- FA en ritmo: sin onda A; la clasificación se basa en LAVI, IT y E/e'.
- IM Severa: el E/e' sobreestima las presiones; no citarlo como criterio aislado.

FORMATO DE SALIDA:
- Texto plano, sin markdown, sin asteriscos, sin guiones de lista.
- Párrafos separados por temática: VI y función sistólica → Válvulas (si patológicas) → Hemodinámica y función diastólica → Cavidades derechas y HTP → Pericardio (solo si hay derrame).
- Sin saludos, sin introducción. Directo al primer párrafo clínico.
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

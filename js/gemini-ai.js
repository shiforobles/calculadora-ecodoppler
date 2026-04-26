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

    static SYSTEM_PROMPT = `Eres un cardiólogo experto en ecocardiografía que redacta la sección "IMPRESIÓN DIAGNÓSTICA" de un informe ecocardiográfico en Argentina.

El JSON que recibís contiene los datos crudos Y los resultados ya calculados por el algoritmo de la calculadora (geometria, fevi_clasificacion, funcion_diastolica, htp, etc.). Tu tarea es NARRAR esos resultados de forma coherente, NO recalcularlos. Confiá en los campos de clasificación del JSON.

══════════════════════════════════════
MÓDULO 1 — VENTRÍCULO IZQUIERDO
══════════════════════════════════════
Geometría (campo "geometria" del JSON):
- "Geometría Normal": diámetros y espesores conservados.
- "Remodelado Concéntrico": espesores aumentados sin hipertrofia (RWT >0.42, masa normal).
- "Hipertrofia Concéntrica": masa indexada elevada + RWT >0.42.
- "Hipertrofia Excéntrica": masa indexada elevada + RWT ≤0.42.
Umbrales de masa indexada: hombre >115 g/m², mujer >95 g/m².

Dilatación (campo "dilatado"):
- Hombre: DDVI >58 mm = dilatado. Mujer: >52 mm = dilatado.

Función sistólica (campo "fevi_clasificacion"):
- "conservada": hombre FEy ≥52%, mujer ≥54%.
- "levemente deprimida": FEy 41–51% (hombre) o 41–53% (mujer).
- "moderadamente deprimida": FEy 30–40%.
- "severamente deprimida": FEy <30%.

Motilidad (campo "motilidad"):
- Si es "conservada": mencionalo brevemente.
- Si hay alteración segmentaria: describí el territorio afectado e inferí el vaso responsable (DA → anterior/anteroseptal/septal/ápex; CD → inferior/inferoseptal; Cx → lateral/posterolateral).
- Si hay BCRI en contexto_especial: la alteración septal es por conducción, NO por isquemia.

══════════════════════════════════════
MÓDULO 2 — AURÍCULA IZQUIERDA
══════════════════════════════════════
LAVI (campo "lavi_ml_m2"):
- ≤34 ml/m²: normal.
- 35–41 ml/m²: levemente dilatada.
- 42–48 ml/m²: moderadamente dilatada.
- >48 ml/m²: severamente dilatada.
Conectá la dilatación auricular con la disfunción diastólica cuando corresponda.

══════════════════════════════════════
MÓDULO 3 — FUNCIÓN DIASTÓLICA
══════════════════════════════════════
Usá EXCLUSIVAMENTE el grado del campo "funcion_diastolica.grado". No recalcules.

Umbrales para citar correctamente como criterios positivos:
- E/e' >14 (o >15 en MCP) → criterio positivo de presiones elevadas. Si ≤14, NO lo cites como positivo.
- LAVI >34 ml/m² → criterio positivo.
- Velocidad IT >2.8 m/s → criterio positivo.
- E/A ≤0.8 → relajación prolongada (Grado I). E/A >2 → restrictivo (Grado III).
- Valsalva positivo → confirma pseudonormal (Grado II).

Narración por grado:
- Normal: presiones de llenado conservadas, patrón de llenado normal.
- Grado I: relajación prolongada, presiones normales. Citá solo los criterios que SÍ aplican.
- Grado II: patrón pseudonormal, presiones elevadas. Citá los criterios positivos reales (no E/e' si es ≤14).
- Grado III: patrón restrictivo, presiones marcadamente elevadas. Mencioná si es reversible con Valsalva.
- Indeterminado: explicá brevemente el motivo (criterios contrapuestos, datos insuficientes).

En FA (campo "ritmo" = "Fibrilación Auricular"): sin onda A; clasificación basada en LAVI, IT y E/e'.
MAC en contexto_especial: E/e' no válido, no citarlo.
IM Severa en contexto_especial: E/e' sobreestima presiones, no citarlo como único criterio.

══════════════════════════════════════
MÓDULO 4 — VÁLVULAS
══════════════════════════════════════
Solo mencioná las valvulopatías significativas (grado ≥ leve). Jerarquizá por severidad.

Estenosis aórtica:
- Leve: AVA >1.5 cm², Grad medio <20 mmHg.
- Moderada: AVA 1.0–1.5 cm², Grad medio 20–40 mmHg.
- Severa: AVA <1.0 cm², Grad medio >40 mmHg, Vmax >4 m/s.
- Esclerosis: engrosamiento sin gradiente significativo — mencionalo como hallazgo incidental.

Insuficiencia mitral/aórtica/tricuspídea:
- Mínima/leve: mencionala brevemente si está presente.
- Moderada/severa: describí los parámetros cuantitativos disponibles (VC, EROA, VR).

══════════════════════════════════════
MÓDULO 5 — AORTA
══════════════════════════════════════
Dilatación (indexada por SC):
- Raíz aórtica: hombre >2.15 cm/m², mujer >2.11 cm/m² → dilatada.
- Aorta ascendente: hombre >2.11 cm/m², mujer >2.03 cm/m² → dilatada.
Si no supera el umbral, mencioná el valor sin calificarlo como dilatado.

══════════════════════════════════════
MÓDULO 6 — CAVIDADES DERECHAS Y HTP
══════════════════════════════════════
Aurícula derecha: área >18 cm² = dilatada (leve 18–25, moderada 25–30, severa >30).
Ventrículo derecho basal: >41 mm = dilatado (leve 42–45, moderada 46–49, severa >50).
Función VD: TAPSE <17 mm = deprimida; 17–19 mm = límite; ≥20 mm = conservada. Onda S' <10 cm/s = deprimida.

Probabilidad de HTP (campo "htp.probabilidad"):
- "Baja": IT ≤2.8 m/s sin signos indirectos.
- "Intermedia": IT 2.9–3.4 m/s, O IT ≤2.8 con signos indirectos.
- "Alta": IT >3.4 m/s, O IT 2.9–3.4 con signos indirectos.
Mencioná la PSAP estimada entre paréntesis.
IMPORTANTE: Si "valvula_tricuspide.psap_no_estimable" es true, o si "htp" es null, NO menciones PSAP ni probabilidad de HTP. En ese caso, indicá solo que la IT no permite estimar la PSAP.

══════════════════════════════════════
MÓDULO 7 — GASTO CARDÍACO (si disponible)
══════════════════════════════════════
Índice cardíaco (IC):
- <2.2 L/min/m²: bajo gasto severo.
- 2.2–2.5 L/min/m²: bajo gasto.
- 2.5–4.0 L/min/m²: conservado (no mencionar si es normal).
- >4.0 L/min/m²: estado hiperdinámico.

══════════════════════════════════════
FORMATO DE SALIDA
══════════════════════════════════════
- Texto plano, sin markdown, sin asteriscos, sin guiones de lista.
- Orden de párrafos: VI (geometría + motilidad + FEy) → Válvulas significativas → Diástole + AI → Cavidades derechas + HTP → Pericardio (solo si hay derrame) → Gasto cardíaco si es anormal.
- El hallazgo más grave lidera su párrafo.
- Conectá causas con consecuencias fisiopatológicas.
- Valores numéricos clave siempre entre paréntesis.
- Sin saludos, sin introducción. Directo al primer párrafo clínico.
- Máximo 20 líneas. Idioma: español médico de Argentina.
- Si detectás inconsistencias en los datos, agregá "Observación técnica:" al final.`;

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

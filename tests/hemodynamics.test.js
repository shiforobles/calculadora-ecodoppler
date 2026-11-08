/**
 * Red de regresión de classifyDiastolicFunction() — hemodynamics.js.
 *
 * hemodynamics.js es donde vive TODA la lógica diastólica (el músculo clínico de
 * la app) y no tenía ninguna prueba. Esta batería caracteriza el comportamiento
 * ACTUAL de las dos ramas:
 *   - FA  : 3 criterios (E/e' septal ≥11, IT >2.8, Vol AI >34), umbral ≥2.
 *   - Sinusal 2025 (Figura 3): 3 criterios (e' bajo, E/e' alto, IT ≥2.8 o PSAP ≥35);
 *     solo "e' bajo" + E/A ≤0.8 da Grado I directo; el resto pasa a parámetros
 *     adicionales (≥1 positivo entre VP, LARS, LAVi; si no hay, TRIV; si no,
 *     Valsalva) y el grado sale de E/A (<2 → II, ≥2 → III).
 *   - Exclusiones ASE: prótesis/reparación mitral, estenosis mitral, MAC, IM severa,
 *     constricción, HP no cardíaca, trasplante, LVAD → "No valorable".
 *
 * No se cubre R9 (fallback inalcanzable: en sinusal E/A siempre es ≤0.8 o >0.8).
 * Correr con: node tests/hemodynamics.test.js
 */
const path = require('path');
const HemodynamicsCalculator = require(path.join(__dirname, '..', 'js', 'hemodynamics.js'));
const calc = new HemodynamicsCalculator();

// Baseline de ritmo sinusal con todo normal (edad 40-65: e' sept<6 / lat<8 / prom<7).
// ePrime se deriva como en ui-controller: promedio si hay sept+lat, si no el que haya.
function sinus(o = {}) {
    const p = Object.assign({ ritmo: 'sinusal', age: 50, E: 70, A: 70, eSeptal: 9, eLateral: 11, TRVel: 2.0, LAVolIndex: 28 }, o);
    if (p.ePrime === undefined) {
        if (!isNaN(p.eSeptal) && !isNaN(p.eLateral)) p.ePrime = (p.eSeptal + p.eLateral) / 2;
        else if (!isNaN(p.eSeptal))  p.ePrime = p.eSeptal;
        else if (!isNaN(p.eLateral)) p.ePrime = p.eLateral;
    }
    return p;
}

const casos = [
    // ─────────────────────────── FIBRILACIÓN AURICULAR ───────────────────────────
    { bloque: 'FA', nombre: '0 criterios → presiones normales',
      params: { ritmo: 'fa', E: 80, ePrime: 12, eSeptal: 12, TRVel: 2.0, LAVolIndex: 28 },
      grade: 'Normal', severity: 'green', incluye: ['normales', '0/3'] },
    { bloque: 'FA', nombre: '1 criterio (solo AI dilatada) → indeterminado, NO elevadas',
      params: { ritmo: 'fa', E: 90, ePrime: 12, eSeptal: 12, TRVel: 2.0, LAVolIndex: 40 },
      grade: 'Indeterminado', severity: 'yellow', incluye: ['1/3', 'Valorar en conjunto'] },
    { bloque: 'FA', nombre: '2 criterios (E/e\' septal ≥11 + IT) → presiones elevadas',
      params: { ritmo: 'fa', E: 120, ePrime: 10, eSeptal: 10, TRVel: 3.2, LAVolIndex: 28 },
      grade: 'II', severity: 'red', incluye: ['elevadas', '2/3'] },
    { bloque: 'FA', nombre: '<2 criterios medibles → datos insuficientes',
      params: { ritmo: 'fa', E: 90, ePrime: 11, eSeptal: 11 },
      grade: 'Indeterminado', severity: 'yellow', incluye: ['Datos insuficientes'] },
    { bloque: 'FA', nombre: 'BCRI · E/e\' no suma; elevadas por IT + Vol AI',
      params: { ritmo: 'fa', E: 140, ePrime: 10, eSeptal: 8, eLateral: 12, TRVel: 3.2, LAVolIndex: 40, context: { bcri: true } },
      grade: 'II', severity: 'red', incluye: ['elevadas', '2/2', 'no valorable por BCRI'] },
    { bloque: 'FA', nombre: 'FC >100 · advertencia de llenado acortado (no cambia el grado)',
      params: { ritmo: 'fa', E: 120, ePrime: 10, eSeptal: 10, TRVel: 3.2, LAVolIndex: 40, fc: 120 },
      grade: 'II', severity: 'red', incluye: ['elevadas', 'FC >100'] },
    { bloque: 'FA', nombre: 'IM severa · E/e\' excluido; elevadas por IT + Vol AI',
      params: { ritmo: 'fa', E: 140, ePrime: 10, eSeptal: 8, TRVel: 3.2, LAVolIndex: 40, context: { imSevera: true } },
      grade: 'II', severity: 'red', incluye: ['elevadas', '2/2', 'IM Severa'] },

    // ──────────────────────────── SINUSAL · GRADOS ───────────────────────────────
    { bloque: 'SINUSAL · GRADOS', nombre: '0 criterios → Normal',
      params: sinus({}), grade: 'Normal', severity: 'green', incluye: ['Función Diastólica Normal', 'normales'] },
    { bloque: 'SINUSAL · GRADOS', nombre: '1 criterio (e\' bajo) + E/A ≤0.8 → Grado I',
      params: sinus({ E: 50, A: 70, eSeptal: 5, eLateral: 11 }), grade: 'I', severity: 'green', incluye: ['Grado I', 'Relajación Prolongada'] },
    { bloque: 'SINUSAL · GRADOS', nombre: '3 criterios + E/A <2 → Grado II',
      params: sinus({ E: 110, A: 75, eSeptal: 5, eLateral: 7, TRVel: 3.0 }), grade: 'II', severity: 'red', incluye: ['Grado II', 'elevadas'] },
    { bloque: 'SINUSAL · GRADOS', nombre: '3 criterios + E/A ≥2 → Grado III',
      params: sinus({ E: 120, A: 50, eSeptal: 5, eLateral: 7, TRVel: 3.0 }), grade: 'III', severity: 'red', incluye: ['Grado III', 'marcadamente elevadas'] },
    { bloque: 'SINUSAL · GRADOS', nombre: 'Grado III + TD <160 → nota de patrón restrictivo',
      params: sinus({ E: 120, A: 50, eSeptal: 5, eLateral: 7, TRVel: 3.0, TD: 140 }), grade: 'III', severity: 'red', incluye: ['Grado III', 'TD acortado', 'restrictivo'] },
    { bloque: 'SINUSAL · GRADOS', nombre: '1 criterio · E/A >0.8 · sin parámetros 2º → Indeterminado',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, LAVolIndex: NaN }), grade: 'Indeterminado', severity: 'yellow', incluye: ['parámetros secundarios'] },
    { bloque: 'SINUSAL · GRADOS', nombre: 'Falta la onda A → No valorable (entrada)',
      params: sinus({ A: NaN }), grade: 'Indeterminado', severity: 'neutral', incluye: ['Esperando datos'] },
    { bloque: 'SINUSAL · GRADOS', nombre: 'E/A >2 con e\' ≥9 → Patrón Atleta (Normal)',
      params: sinus({ E: 120, A: 50, eSeptal: 9, eLateral: 11 }), grade: 'Normal', severity: 'green', incluye: ['Atleta'] },

    // ──────────────────────── SINUSAL · BORDES DE UMBRAL ──────────────────────────
    // e' septal <6
    { bloque: 'SINUSAL · BORDES', nombre: "e' septal 5.9 (<6) → Grado I",
      params: sinus({ E: 50, A: 70, eSeptal: 5.9, eLateral: 11 }), grade: 'I' },
    { bloque: 'SINUSAL · BORDES', nombre: "e' septal 6.0 (no <6) → Normal",
      params: sinus({ E: 50, A: 70, eSeptal: 6, eLateral: 11 }), grade: 'Normal' },
    // e' lateral <8
    { bloque: 'SINUSAL · BORDES', nombre: "e' lateral 7.9 (<8) → Grado I",
      params: sinus({ E: 50, A: 70, eSeptal: 9, eLateral: 7.9 }), grade: 'I' },
    { bloque: 'SINUSAL · BORDES', nombre: "e' lateral 8.0 (no <8) → Normal",
      params: sinus({ E: 50, A: 70, eSeptal: 9, eLateral: 8 }), grade: 'Normal' },
    // e' promedio <7 (solo cuando no hay septal ni lateral)
    { bloque: 'SINUSAL · BORDES', nombre: "e' promedio 6.9 (<7, solo prom) → Grado I",
      params: sinus({ eSeptal: NaN, eLateral: NaN, ePrime: 6.9, E: 50, A: 70 }), grade: 'I' },
    { bloque: 'SINUSAL · BORDES', nombre: "e' promedio 7.0 (no <7, solo prom) → Normal",
      params: sinus({ eSeptal: NaN, eLateral: NaN, ePrime: 7.0, E: 50, A: 70 }), grade: 'Normal' },
    // E/e' septal ≥15
    // Con LAVi 40: si el criterio cuenta, pasa a parámetros adicionales → Grado II
    { bloque: 'SINUSAL · BORDES', nombre: "E/e' septal 15.0 (≥15) → cuenta criterio (LAVi 40 → Grado II)",
      params: sinus({ E: 150, A: 90, eSeptal: 10, eLateral: 14, TRVel: 2.0, LAVolIndex: 40 }), grade: 'II' },
    { bloque: 'SINUSAL · BORDES', nombre: "E/e' septal 14.9 (no ≥15) → Normal",
      params: sinus({ E: 149, A: 90, eSeptal: 10, eLateral: 14, TRVel: 2.0, LAVolIndex: 40 }), grade: 'Normal' },
    // E/e' lateral ≥13
    { bloque: 'SINUSAL · BORDES', nombre: "E/e' lateral 13.0 (≥13) → cuenta criterio (LAVi 40 → Grado II)",
      params: sinus({ E: 130, A: 90, eSeptal: 14, eLateral: 10, TRVel: 2.0, LAVolIndex: 40 }), grade: 'II' },
    { bloque: 'SINUSAL · BORDES', nombre: "E/e' lateral 12.9 (no ≥13) → Normal",
      params: sinus({ E: 129, A: 90, eSeptal: 14, eLateral: 10, TRVel: 2.0, LAVolIndex: 40 }), grade: 'Normal' },
    // E/e' promedio ≥14 — solo alcanzable con UN e' cargado (redundante con sept/lat)
    { bloque: 'SINUSAL · BORDES', nombre: "E/e' promedio 14.0 (solo septal) → cuenta criterio (LAVi 40 → Grado II)",
      params: sinus({ eSeptal: 10, eLateral: NaN, ePrime: 10, E: 140, A: 90, TRVel: 2.0, LAVolIndex: 40 }), grade: 'II' },
    { bloque: 'SINUSAL · BORDES', nombre: "E/e' promedio 13.9 (solo septal) → Normal",
      params: sinus({ eSeptal: 10, eLateral: NaN, ePrime: 10, E: 139, A: 90, TRVel: 2.0, LAVolIndex: 40 }), grade: 'Normal' },
    // IT ≥2.8
    { bloque: 'SINUSAL · BORDES', nombre: 'IT 2.8 (≥2.8) → cuenta criterio (LAVi 40 → Grado II)',
      params: sinus({ E: 80, A: 60, eSeptal: 9, eLateral: 11, TRVel: 2.8, LAVolIndex: 40 }), grade: 'II' },
    { bloque: 'SINUSAL · BORDES', nombre: 'IT 2.79 (no ≥2.8, sin PSAP) → Normal',
      params: sinus({ E: 80, A: 60, eSeptal: 9, eLateral: 11, TRVel: 2.79, LAVolIndex: 40 }), grade: 'Normal' },
    // PSAP ≥35 (con PAD estimada) como alternativa a IT ≥2.8
    { bloque: 'SINUSAL · BORDES', nombre: 'IT 2.6 + PSAP 37 (≥35) → cuenta criterio (LAVi 40 → Grado II)',
      params: sinus({ E: 80, A: 60, eSeptal: 9, eLateral: 11, TRVel: 2.6, PSAP: 37, LAVolIndex: 40 }), grade: 'II' },
    { bloque: 'SINUSAL · BORDES', nombre: 'IT 2.6 + PSAP 34 (no ≥35) → Normal',
      params: sinus({ E: 80, A: 60, eSeptal: 9, eLateral: 11, TRVel: 2.6, PSAP: 34, LAVolIndex: 40 }), grade: 'Normal' },
    // E/A ≤0.8 (Grado I) vs >0.8
    { bloque: 'SINUSAL · BORDES', nombre: 'E/A 0.80 (≤0.8) → Grado I (relajación)',
      params: sinus({ E: 56, A: 70, eSeptal: 5, eLateral: 11 }), grade: 'I', incluye: ['Relajación'] },
    { bloque: 'SINUSAL · BORDES', nombre: 'E/A 0.81 (>0.8) · solo e\' bajo · adicionales negativos → Grado I + eco de esfuerzo',
      params: sinus({ E: 57, A: 70, eSeptal: 5, eLateral: 11 }), grade: 'I', incluye: ['eco de esfuerzo diastólico'] },
    // E/A ≥2 (Grado III) vs <2 (Grado II), con 3 criterios
    { bloque: 'SINUSAL · BORDES', nombre: 'E/A 2.00 (≥2) + 3 criterios → Grado III',
      params: sinus({ E: 100, A: 50, eSeptal: 5, eLateral: 7, TRVel: 3.0 }), grade: 'III' },
    { bloque: 'SINUSAL · BORDES', nombre: 'E/A 1.98 (<2) + 3 criterios → Grado II',
      params: sinus({ E: 99, A: 50, eSeptal: 5, eLateral: 7, TRVel: 3.0 }), grade: 'II' },
    // LAVi >34 como evidencia 2ª
    { bloque: 'SINUSAL · BORDES', nombre: 'LAVi 35 (>34) → evidencia (+) → Grado II',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, LAVolIndex: 35 }), grade: 'II', incluye: ['por LAVi'] },
    { bloque: 'SINUSAL · BORDES', nombre: 'LAVi 34 (no >34) → evidencia (−) → Grado I (e\' bajo)',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, LAVolIndex: 34 }), grade: 'I' },
    // PVSD ≤0.67
    { bloque: 'SINUSAL · BORDES', nombre: 'PVSD 0.67 (≤0.67) → evidencia (+) → Grado II',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, PVSD: 0.67 }), grade: 'II', incluye: ['Venas Pulmonares'] },
    { bloque: 'SINUSAL · BORDES', nombre: 'PVSD 0.68 (no ≤0.67) → evidencia (−) → Grado I (e\' bajo)',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, PVSD: 0.68 }), grade: 'I' },
    // LARS ≤18
    { bloque: 'SINUSAL · BORDES', nombre: 'LARS 18 (≤18) → evidencia (+) → Grado II',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, PVSD: NaN, LARS: 18 }), grade: 'II', incluye: ['LARS'] },
    { bloque: 'SINUSAL · BORDES', nombre: 'LARS 18.1 (no ≤18) → evidencia (−) → Grado I (e\' bajo)',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, PVSD: NaN, LARS: 18.1 }), grade: 'I' },
    // TRIV ≤70 (positivo) / ≥100 (negativo)
    { bloque: 'SINUSAL · BORDES', nombre: 'TRIV 70 (≤70) → evidencia (+) → Grado II',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, PVSD: NaN, LARS: NaN, LAVolIndex: NaN, TRIV: 70 }), grade: 'II', incluye: ['TRIV'] },
    { bloque: 'SINUSAL · BORDES', nombre: 'TRIV 100 (≥100) → evidencia (−) → Grado I (e\' bajo)',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, PVSD: NaN, LARS: NaN, LAVolIndex: NaN, TRIV: 100 }), grade: 'I' },
    // Atleta: e' ≥9
    { bloque: 'SINUSAL · BORDES', nombre: "Atleta e' 9.0 (≥9) → Normal (Atleta)",
      params: sinus({ E: 120, A: 50, eSeptal: 9, eLateral: 9 }), grade: 'Normal', incluye: ['Atleta'] },
    { bloque: 'SINUSAL · BORDES', nombre: "e' 8.9 (no ≥9) con E/A >2 → NO atleta (solo E/e' lat, LAVi normal → Normal)",
      params: sinus({ E: 120, A: 50, eSeptal: 8.9, eLateral: 8.9 }), grade: 'Normal', excluye: ['Atleta'] },

    // ──────────────── SINUSAL · FIGURA 3 ASE 2025 (correcciones 08/11) ────────────────
    { bloque: 'SINUSAL · FIGURA 3', nombre: "e' bajo + IT 3.0 con E/A 0.7 → NO va directo a Grado I; LAVi 45 → Grado II",
      params: sinus({ E: 56, A: 80, eSeptal: 5, eLateral: 6, TRVel: 3.0, LAVolIndex: 45 }), grade: 'II', incluye: ['por LAVi'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: "e' bajo + IT 3.0 con E/A 0.7 · adicionales negativos → Grado I",
      params: sinus({ E: 56, A: 80, eSeptal: 5, eLateral: 6, TRVel: 3.0, LAVolIndex: 28 }), grade: 'I', excluye: ['eco de esfuerzo'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'Solo E/e\' alto con E/A 0.7 → adicionales (LAVi 40) → Grado II',
      params: sinus({ E: 100, A: 130, eSeptal: 6.5, eLateral: 8.5, TRVel: 2.0, LAVolIndex: 40 }), grade: 'II' },
    { bloque: 'SINUSAL · FIGURA 3', nombre: '≥1 adicional positivo alcanza: S/D 0.9 (−) pero LAVi 45 (+) → Grado II',
      params: sinus({ E: 80, A: 67, eSeptal: 5.5, eLateral: 6.5, TRVel: 2.5, PVSD: 0.9, LAVolIndex: 45 }), grade: 'II', incluye: ['por LAVi'], excluye: ['Venas Pulmonares'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'Varios adicionales positivos → se nombran todos',
      params: sinus({ E: 80, A: 67, eSeptal: 5.5, eLateral: 6.5, TRVel: 2.5, LARS: 15, LAVolIndex: 45 }), grade: 'II', incluye: ['por LARS y LAVi'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'Presión elevada por adicionales con E/A ≥2 → Grado III',
      params: sinus({ E: 110, A: 48, eSeptal: 7, eLateral: 8, TRVel: 2.5, LAVolIndex: 45 }), grade: 'III', incluye: ['Grado III', 'por LAVi'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'Grado III por adicionales + TD <160 → nota restrictiva',
      params: sinus({ E: 110, A: 48, eSeptal: 7, eLateral: 8, TRVel: 2.5, LAVolIndex: 45, TD: 140 }), grade: 'III', incluye: ['TD acortado'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'TRIV solo se usa si no hay VP/LARS/LAVi',
      params: sinus({ E: 70, A: 60, eSeptal: 5, eLateral: 11, LAVolIndex: 28, TRIV: 60 }), grade: 'I', excluye: ['TRIV'] },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'Sin IT: e\' y E/e\' normales → Normal',
      params: sinus({ TRVel: NaN }), grade: 'Normal' },
    { bloque: 'SINUSAL · FIGURA 3', nombre: 'Sin IT: e\' y E/e\' alterados (2 de 2) → adicionales, no Grado III directo',
      params: sinus({ E: 110, A: 50, eSeptal: 5, eLateral: 7, TRVel: NaN, LAVolIndex: 28 }), grade: 'I' },

    // ──────────────────── SINUSAL · POBLACIONES ESPECIALES ────────────────────────
    // ASE 2025: con MAC moderado-severo o IM severa la Figura 3 no se aplica.
    // Antes se anulaban criterios y se contaban como normales (salía "Normal").
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'MAC · algoritmo no aplicable → No valorable [ASE 2025]',
      params: sinus({ E: 140, A: 70, eSeptal: 5, eLateral: 7, TRVel: 2.0, context: { mac: true } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['calcificación del anillo mitral'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'IM severa · algoritmo no aplicable → No valorable [ASE 2025]',
      params: sinus({ E: 140, A: 80, eSeptal: 5, eLateral: 7, TRVel: 3.0, PVSD: 0.6, context: { imSevera: true } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['insuficiencia mitral severa'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Estenosis mitral (cualquier grado) → No valorable [ASE 2025]',
      params: sinus({ E: 140, A: 70, eSeptal: 5, eLateral: 7, TRVel: 3.0, context: { estenosisMitral: true } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['estenosis mitral'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Constricción pericárdica → No valorable [ASE 2025]',
      params: sinus({ context: { exclusion: 'constriccion' } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['constricción pericárdica'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'HP no cardíaca → No valorable [ASE 2025]',
      params: sinus({ context: { exclusion: 'hp_no_cardiaca' } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['hipertensión pulmonar no cardíaca'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Trasplante cardíaco → No valorable también en FA [ASE 2025]',
      params: { ritmo: 'fa', E: 120, ePrime: 10, eSeptal: 10, TRVel: 3.2, LAVolIndex: 40, context: { exclusion: 'trasplante' } },
      grade: 'No valorable', severity: 'neutral', incluye: ['trasplante cardíaco'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Reparación mitral / TEER y LVAD → No valorable [ASE 2025]',
      params: sinus({ context: { exclusion: 'reparacion_mitral' } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['reparación mitral o TEER'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Exclusión desconocida → se ignora (Normal)',
      params: sinus({ context: { exclusion: 'otra_cosa' } }),
      grade: 'Normal', severity: 'green' },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'BCRI · e\' y E/e\' por lateral; II por evidencia VP',
      params: sinus({ E: 100, A: 70, eSeptal: 5, eLateral: 7, TRVel: 2.0, PVSD: 0.6, context: { bcri: true } }),
      grade: 'II', severity: 'red', incluye: ['septal excluido', 'elevadas'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'MCH · aviso veraz (no cambia el grado) [arreglo]',
      params: sinus({ context: { mcp: true } }),
      grade: 'Normal', severity: 'green', incluye: ['menor validez'], excluye: ['umbrales modificados'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Prótesis mitral · corta el algoritmo general [arreglo]',
      params: sinus({ E: 140, A: 70, eSeptal: 5, eLateral: 7, TRVel: 3.5, LAVolIndex: 50, context: { protesisMitral: true } }),
      grade: 'No valorable', severity: 'neutral', incluye: ['No valorable por el algoritmo general', 'prótesis mitral'] },
    { bloque: 'SINUSAL · POBLACIONES', nombre: 'Prótesis mitral · también corta en FA [arreglo]',
      params: { ritmo: 'fa', E: 140, ePrime: 5, eSeptal: 5, TRVel: 3.5, LAVolIndex: 50, context: { protesisMitral: true } },
      grade: 'No valorable', severity: 'neutral', incluye: ['prótesis mitral'] },
];

let ok = 0, fail = 0, bloqueActual = '';

casos.forEach(c => {
    if (c.bloque !== bloqueActual) {
        bloqueActual = c.bloque;
        console.log(`\n${'═'.repeat(78)}\nBLOQUE ${c.bloque}\n${'═'.repeat(78)}`);
    }

    const r = calc.classifyDiastolicFunction(c.params);
    const checks = [];
    if (c.grade !== undefined)    checks.push([`grade=${c.grade}`,  r.grade === c.grade]);
    if (c.severity !== undefined) checks.push([`sev=${c.severity}`, r.severity === c.severity]);
    (c.incluye || []).forEach(sub => checks.push([`"${sub}"`, (r.description || '').includes(sub)]));
    (c.excluye || []).forEach(sub => checks.push([`NO "${sub}"`, !(r.description || '').includes(sub)]));

    const pasa = checks.every(ch => ch[1]);
    pasa ? ok++ : fail++;

    console.log(`\n${pasa ? '✅' : '❌'} ${c.nombre}`);
    console.log(`   ${r.grade} · ${r.severity} — ${r.description}`);
    if (!pasa) checks.filter(ch => !ch[1]).forEach(ch => console.log(`      ✗ falló: ${ch[0]}`));
});

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);

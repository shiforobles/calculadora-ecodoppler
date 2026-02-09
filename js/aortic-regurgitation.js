/**
 * Aortic Regurgitation Module
 * Evaluates severity based on ASE Guidelines
 */

class AorticRegurgitationModule {
    constructor() {
        this.inputs = {
            vc: 'iao_vc',
            pht: 'iao_pht',
            jetWidth: 'iao_jet_width',
            rvol: 'iao_rvol',
            eroa: 'iao_eroa',
            alcance: 'iao_jet_alcance',
            flujoReverso: 'iao_flujo_reverso'
        };
        this.output = {
            badge: 'iao_severity_badge',
            summary: 'iao_summary_text'
        };

        // Presets for auto-fill based on ASE guidelines
        this.presets = {
            leve: {
                vc: 0.25,      // <0.3
                pht: 600,      // >500
                jetWidth: 20,  // <25
                rvol: 20,      // <30
                eroa: 0.08,    // <0.10
                alcance: 'tsvi',
                flujoReverso: false
            },
            moderada: {
                vc: 0.45,      // 0.3-0.6
                pht: 350,      // 200-500
                jetWidth: 45,  // 25-65
                rvol: 45,      // 30-60
                eroa: 0.20,    // 0.10-0.30
                alcance: 'mitral',
                flujoReverso: false
            },
            severa: {
                vc: 0.70,      // >0.6
                pht: 180,      // <200
                jetWidth: 70,  // >65
                rvol: 70,      // >60
                eroa: 0.40,    // >0.30
                alcance: 'apex',
                flujoReverso: true
            }
        };

        this.init();
    }

    init() {
        // Attach listeners to all inputs
        Object.values(this.inputs).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateState());
                el.addEventListener('change', () => this.updateState());
            }
        });

        // Listener for the main "ia_grado" select (External ID from index.html)
        const mainSelect = document.getElementById('ia_grado');
        if (mainSelect) {
            mainSelect.addEventListener('change', (e) => {
                const val = e.target.value; // 'leve', 'moderada', 'severa', 'no'
                if (this.presets[val]) {
                    this.fillPreset(val);
                } else if (val === 'no') {
                    this.fillPreset('clear');
                }
            });
        }

        // Initial update
        this.updateState();
    }

    fillPreset(severity) {
        if (severity === 'clear') {
            Object.values(this.inputs).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') el.checked = false;
                    else el.value = '';
                }
            });
            this.updateState();
            return;
        }

        const p = this.presets[severity];
        if (!p) return;

        if (document.getElementById(this.inputs.vc)) document.getElementById(this.inputs.vc).value = p.vc;
        if (document.getElementById(this.inputs.pht)) document.getElementById(this.inputs.pht).value = p.pht;
        if (document.getElementById(this.inputs.jetWidth)) document.getElementById(this.inputs.jetWidth).value = p.jetWidth;
        if (document.getElementById(this.inputs.rvol)) document.getElementById(this.inputs.rvol).value = p.rvol;
        if (document.getElementById(this.inputs.eroa)) document.getElementById(this.inputs.eroa).value = p.eroa;
        if (document.getElementById(this.inputs.alcance)) document.getElementById(this.inputs.alcance).value = p.alcance;
        if (document.getElementById(this.inputs.flujoReverso)) document.getElementById(this.inputs.flujoReverso).checked = p.flujoReverso;

        this.updateState();
    }

    getValues() {
        return {
            vc: parseFloat(document.getElementById(this.inputs.vc)?.value) || 0,
            pht: parseFloat(document.getElementById(this.inputs.pht)?.value) || 0,
            jetWidth: parseFloat(document.getElementById(this.inputs.jetWidth)?.value) || 0,
            rvol: parseFloat(document.getElementById(this.inputs.rvol)?.value) || 0,
            eroa: parseFloat(document.getElementById(this.inputs.eroa)?.value) || 0,
            alcance: document.getElementById(this.inputs.alcance)?.value || 'tsvi',
            flujoReverso: document.getElementById(this.inputs.flujoReverso)?.checked || false
        };
    }

    determineSeverity(data) {
        // A. CRITERIOS DE SEVERIDAD (SEVERA)
        // VC > 6 mm
        // PHT < 200 ms
        // Jet Width >= 65%
        // Alcance: "apex"
        // RVol >= 60 ml
        // EROA >= 0.30 cm2
        // Flujo Reverso: true

        // Count severe criteria? Or check if ANY severe criteria is met?
        // User prompt: "Si cumple CUALQUIERA de estos" -> Suggests Severity trigger.
        // However, guidelines usually require corroboration. User instruction is strict: "Cualquiera de estos".

        if (
            (data.vc > 0.6) ||
            (data.pht > 0 && data.pht < 200) ||
            (data.jetWidth >= 65) ||
            (data.alcance === 'apex') ||
            (data.rvol >= 60) ||
            (data.eroa >= 0.30) ||
            (data.flujoReverso)
        ) {
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        // B. CRITERIOS DE LEVEDAD (LEVE)
        // VC < 0.3 cm
        // PHT > 500 ms
        // Jet Width < 25%
        // Alcance: "tsvi"
        // RVol < 30 ml
        // EROA < 0.10 cm2

        // Logic: Checks for Mild conditions. 
        // If it's not Severe and meets Mild criteria (or most of them?), return Mild.
        // Let's check if it meets ANY Mild criteria and NO Severe/Moderate indicators?
        // Simplification: If not Severe, check Mild thresholds.

        if (
            (data.vc > 0 && data.vc < 0.3) ||
            (data.pht > 500) ||
            (data.jetWidth > 0 && data.jetWidth < 25) ||
            (data.rvol > 0 && data.rvol < 30) ||
            (data.eroa > 0 && data.eroa < 0.10)
        ) {
            // Need to be careful. A single "VC=0.2" shouldn't override "PHT=400" (Moderate).
            // But user prompt structure implies discrete checks.
            // Let's assume if it doesn't hit Severe, we check "Moderate" (Gray Zone).
            // Moderate is "Cualquier valor intermedio".
            // So logic: Check Severe -> if no, check Moderate -> if no, assume Mild?
            // Or Check Mild inputs?

            // To be safe with "Gray Zone", everything not Severe and not explicitly Mild is Moderate.
            // But what defines explicitly Mild? 
            // If ALL provided values are in Mild range?

            // Let's count indicators.
            let mildCount = 0;
            let modCount = 0;

            if (data.vc > 0) { data.vc < 0.3 ? mildCount++ : modCount++; }
            if (data.pht > 0) { data.pht > 500 ? mildCount++ : modCount++; }
            if (data.jetWidth > 0) { data.jetWidth < 25 ? mildCount++ : modCount++; }
            if (data.rvol > 0) { data.rvol < 30 ? mildCount++ : modCount++; }
            if (data.eroa > 0) { data.eroa < 0.10 ? mildCount++ : modCount++; }

            // Specific condition: Alcance 'mitral' is Moderate.
            if (data.alcance === 'mitral') modCount++;
            if (data.alcance === 'tsvi') mildCount++;

            if (modCount === 0 && mildCount > 0) {
                return { level: 'Leve', color: 'green', class: 'badge-mild' };
            } else if (modCount > 0 || mildCount > 0) {
                return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
            }
        }

        // Default if absolute zeros or logic fallthrough (should be covered above)
        // If data is empty/zero
        const hasData = Object.values(data).some(v => (typeof v === 'number' && v > 0) || (typeof v === 'boolean' && v === true));
        if (!hasData && data.alcance === 'tsvi') return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        // If we have some data but didn't trigger Severe, and logic above puts it in Moderate/Mild bucket.
        // Fallback for intermediate values without explicit checks above:
        return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
    }

    updateState() {
        const data = this.getValues();
        const severity = this.determineSeverity(data);

        // Update Badge UI
        const badgeEl = document.getElementById(this.output.badge);
        if (badgeEl) {
            badgeEl.textContent = severity.level;
            badgeEl.className = `severity-badge ${severity.class}`;

            // Apply specific styles if classes aren't in CSS yet
            if (severity.color === 'red') {
                badgeEl.style.backgroundColor = '#fecaca'; // red-200
                badgeEl.style.color = '#991b1b'; // red-800
                badgeEl.style.border = '1px solid #ef4444';
            } else if (severity.color === 'green') {
                badgeEl.style.backgroundColor = '#bbf7d0'; // green-200
                badgeEl.style.color = '#166534'; // green-800
                badgeEl.style.border = '1px solid #22c55e';
            } else if (severity.color === 'yellow') {
                badgeEl.style.backgroundColor = '#fef08a'; // yellow-200
                badgeEl.style.color = '#854d0e'; // yellow-800
                badgeEl.style.border = '1px solid #eab308';
            } else {
                badgeEl.style.backgroundColor = '#e5e7eb';
                badgeEl.style.color = '#374151';
                badgeEl.style.border = '1px solid #d1d5db';
            }
        }
    }

    // Generate only descriptive text (NO diagnosis)
    generateFindings() {
        const data = this.getValues();

        // Skip if empty
        const hasData = (data.vc > 0 || data.pht > 0 || data.jetWidth > 0 || data.rvol > 0 || data.eroa > 0 || data.flujoReverso || data.alcance !== 'tsvi');
        if (!hasData) return "";

        let report = "";

        // Mapeo
        let alcanceText = "tracto de salida del VI (subvalvular)";
        if (data.alcance === 'mitral') alcanceText = "borde libre de la valva mitral";
        if (data.alcance === 'apex') alcanceText = "tercio medio/apical del ventrículo izquierdo";

        // Start description
        report += `Insuficiencia aórtica con jet que alcanza ${alcanceText}. `;

        // Parametros
        const params = [];
        if (data.vc > 0) params.push(`vena contracta ${data.vc} cm`);
        if (data.pht > 0) params.push(`PHT ${data.pht} ms`);

        // RVol/EROA
        if (data.rvol > 0) params.push(`vol. regurgitante ${data.rvol} ml/lat`);
        if (data.eroa > 0) params.push(`EROA ${data.eroa} cm²`);

        if (data.jetWidth > 0) params.push(`ancho de jet/TSVI ${data.jetWidth}%`);

        if (params.length > 0) {
            report += `Parámetros cuantitativos: ${params.join(', ')}. `;
        }

        if (data.flujoReverso) {
            report += "Se observa flujo reverso holodiastólico en aorta descendente supradiafragmática.";
        }

        return report;
    }

    // Generate only diagnosis (Severity) for Conclusion
    generateConclusion() {
        const data = this.getValues();
        const severity = this.determineSeverity(data);
        const hasData = (data.vc > 0 || data.pht > 0 || data.jetWidth > 0 || data.rvol > 0 || data.eroa > 0 || data.flujoReverso || data.alcance !== 'tsvi');

        if (!hasData) return "";

        // If explicitly Mild/Moderate/Severe
        return `Insuficiencia Aórtica ${severity.level}.`;
    }
}

// Initialize globally
window.aorticRegurgitationModule = new AorticRegurgitationModule();

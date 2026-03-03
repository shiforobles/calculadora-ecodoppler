/**
 * Valvulopathy Modules
 * logic for Mitral Insufficiency, Mitral Stenosis, and Aortic Stenosis
 */

// ==========================================
// 1. MITRAL REGURGITATION (IM)
// ==========================================
class MitralRegurgitationModule {
    constructor() {
        this.inputs = {
            vc: 'im_vc',           // mm
            ore: 'im_ore',         // cm2
            vr: 'im_vr',           // ml
            areaJet: 'im_area_jet', // string (leve/moderada/severa)
            inversionVenas: 'im_inversion_venas' // bool
        };
        this.output = {
            badge: 'im_severity_badge'
        };

        this.presets = {
            leve: {
                vc: 2,       // < 3 mm
                ore: 0.10,   // < 0.20
                vr: 15,      // < 30
                areaJet: 'leve', // < 20%
                inversionVenas: false
            },
            moderada: {
                vc: 5,       // 3-6 mm
                ore: 0.30,   // 0.20-0.39
                vr: 45,      // 30-59
                areaJet: 'moderada', // 20-40%
                inversionVenas: false
            },
            severa: {
                vc: 8,       // >= 7 mm
                ore: 0.50,   // >= 0.40
                vr: 70,      // >= 60
                areaJet: 'severa', // > 40%
                inversionVenas: true
            }
        };

        this.init();
    }

    init() {
        // Validation listeners
        Object.values(this.inputs).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateState());
                el.addEventListener('change', () => this.updateState());
            }
        });

        // Preset buttons
        ['leve', 'moderada', 'severa'].forEach(severity => {
            const btn = document.getElementById(`btn_im_${severity}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault(); // Prevent form submit if inside form
                    this.fillPreset(severity);
                });
            }
        });

        // Initial update
        this.updateState();
    }

    fillPreset(severity) {
        const p = this.presets[severity];
        if (!p) return;

        if (document.getElementById(this.inputs.vc)) document.getElementById(this.inputs.vc).value = p.vc;
        if (document.getElementById(this.inputs.ore)) document.getElementById(this.inputs.ore).value = p.ore;
        if (document.getElementById(this.inputs.vr)) document.getElementById(this.inputs.vr).value = p.vr;
        if (document.getElementById(this.inputs.areaJet)) document.getElementById(this.inputs.areaJet).value = p.areaJet;
        if (document.getElementById(this.inputs.inversionVenas)) document.getElementById(this.inputs.inversionVenas).checked = p.inversionVenas;

        this.updateState();

        // Update main selector if present
        const mainSelect = document.getElementById('im_grado');
        if (mainSelect) {
            mainSelect.value = severity;
            // Trigger change event on main select to notify UIController
            mainSelect.dispatchEvent(new Event('change'));
        }
    }

    getValues() {
        return {
            vc: parseFloat(document.getElementById(this.inputs.vc)?.value) || 0,
            ore: parseFloat(document.getElementById(this.inputs.ore)?.value) || 0,
            vr: parseFloat(document.getElementById(this.inputs.vr)?.value) || 0,
            areaJet: document.getElementById(this.inputs.areaJet)?.value || '',
            inversionVenas: document.getElementById(this.inputs.inversionVenas)?.checked || false
        };
    }

    determineSeverity(data) {
        // Criterios ASE 2017

        // Severa
        if (
            (data.vc >= 7) ||
            (data.ore >= 0.40) ||
            (data.vr >= 60) ||
            (data.areaJet === 'severa') ||
            (data.inversionVenas)
        ) {
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        // Leve (Specific check for mild values)
        // VC < 3mm, ORE < 0.20, VR < 30, AreaJet < 20%
        // We assume Leve if mostly mild indicators
        let mildCount = 0;
        let modCount = 0;

        if (data.vc > 0) data.vc < 3 ? mildCount++ : modCount++;
        if (data.ore > 0) data.ore < 0.20 ? mildCount++ : modCount++;
        if (data.vr > 0) data.vr < 30 ? mildCount++ : modCount++;
        if (data.areaJet) data.areaJet === 'leve' ? mildCount++ : modCount++;

        if (mildCount > 0 && modCount === 0) {
            return { level: 'Leve', color: 'green', class: 'badge-mild' };
        }

        // Default / Intermediate
        const hasData = Object.values(data).some(v => (typeof v === 'number' && v > 0) || v === true || (typeof v === 'string' && v !== ''));
        if (!hasData) return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
    }

    updateState() {
        const data = this.getValues();
        const severity = this.determineSeverity(data);

        const badgeEl = document.getElementById(this.output.badge);
        if (badgeEl) {
            badgeEl.textContent = severity.level;
            badgeEl.className = `severity-badge ${severity.class}`;

            // Inline styles backup
            if (severity.color === 'red') {
                badgeEl.style.backgroundColor = '#fecaca'; badgeEl.style.color = '#991b1b'; badgeEl.style.border = '1px solid #ef4444';
            } else if (severity.color === 'green') {
                badgeEl.style.backgroundColor = '#bbf7d0'; badgeEl.style.color = '#166534'; badgeEl.style.border = '1px solid #22c55e';
            } else if (severity.color === 'yellow') {
                badgeEl.style.backgroundColor = '#fef08a'; badgeEl.style.color = '#854d0e'; badgeEl.style.border = '1px solid #eab308';
            } else {
                badgeEl.style.backgroundColor = '#e5e7eb'; badgeEl.style.color = '#374151'; badgeEl.style.border = '1px solid #d1d5db';
            }
        }
    }

    generateFindings() {
        const data = this.getValues();
        const params = [];

        if (data.vc > 0) params.push(`vena contracta ${data.vc} mm`);
        if (data.ore > 0) params.push(`ORE ${data.ore} cm²`);
        if (data.vr > 0) params.push(`vol. regurgitante ${data.vr} ml`);

        if (data.areaJet) {
            let areaText = "llega a 1/3 de AI";
            if (data.areaJet === 'moderada') areaText = "llega a 2/3 de AI";
            if (data.areaJet === 'severa') areaText = "llega a pared posterior de AI";
            params.push(`alcance del jet ${areaText}`);
        }

        let text = "";
        if (params.length > 0) {
            text += `Parámetros de insuficiencia mitral: ${params.join(', ')}.`;
        }
        if (data.inversionVenas) {
            text += " Se observa inversión del flujo sistólico en venas pulmonares.";
        }
        return text;
    }
}


// ==========================================
// 2. MITRAL STENOSIS (EM)
// ==========================================
class MitralStenosisModule {
    constructor() {
        this.inputs = {
            gradMedio: 'em_grad_medio', // mmHg
            areaPht: 'em_area_pht',    // cm2
            tiempoPht: 'em_tiempo_pht' // ms (optional helper)
        };
        this.output = {
            badge: 'em_severity_badge'
        };

        this.presets = {
            leve: {
                gradMedio: 3,
                areaPht: 2.0,
                tiempoPht: 110 // Area = 220/PHT -> PHT=110
            },
            moderada: {
                gradMedio: 7,
                areaPht: 1.2,
                tiempoPht: 183
            },
            severa: {
                gradMedio: 12,
                areaPht: 0.9,
                tiempoPht: 244
            }
        };

        this.init();
    }

    init() {
        Object.values(this.inputs).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateState());
            }
        });

        ['leve', 'moderada', 'severa'].forEach(severity => {
            const btn = document.getElementById(`btn_em_${severity}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.fillPreset(severity);
                });
            }
        });

        this.updateState();
    }

    fillPreset(severity) {
        const p = this.presets[severity];
        if (!p) return;

        if (document.getElementById(this.inputs.gradMedio)) document.getElementById(this.inputs.gradMedio).value = p.gradMedio;
        if (document.getElementById(this.inputs.areaPht)) document.getElementById(this.inputs.areaPht).value = p.areaPht;
        // Optional helper field if exists
        if (document.getElementById(this.inputs.tiempoPht)) document.getElementById(this.inputs.tiempoPht).value = p.tiempoPht;

        this.updateState();

        const mainSelect = document.getElementById('em_grado');
        if (mainSelect) {
            mainSelect.value = severity;
            mainSelect.dispatchEvent(new Event('change'));
        }
    }

    getValues() {
        return {
            gradMedio: parseFloat(document.getElementById(this.inputs.gradMedio)?.value) || 0,
            areaPht: parseFloat(document.getElementById(this.inputs.areaPht)?.value) || 0
        };
    }

    determineSeverity(data) {
        // Criterios:
        // Severa: Area <= 1.5 (Muy severa <= 1.0), GM > 5-10
        // Leve: Area > 1.5, GM < 5

        if (data.areaPht > 0 && data.areaPht <= 1.5) {
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }
        if (data.gradMedio >= 10) {
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        if (data.areaPht > 1.5 || (data.gradMedio > 0 && data.gradMedio < 5)) {
            return { level: 'Leve', color: 'green', class: 'badge-mild' };
        }

        const hasData = (data.areaPht > 0 || data.gradMedio > 0);
        if (!hasData) return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
    }

    updateState() {
        const data = this.getValues();
        const severity = this.determineSeverity(data);
        const badgeEl = document.getElementById(this.output.badge);
        if (badgeEl) {
            badgeEl.textContent = severity.level;
            badgeEl.className = `severity-badge ${severity.class}`;

            if (severity.color === 'red') {
                badgeEl.style.backgroundColor = '#fecaca'; badgeEl.style.color = '#991b1b'; badgeEl.style.border = '1px solid #ef4444';
            } else if (severity.color === 'green') {
                badgeEl.style.backgroundColor = '#bbf7d0'; badgeEl.style.color = '#166534'; badgeEl.style.border = '1px solid #22c55e';
            } else if (severity.color === 'yellow') {
                badgeEl.style.backgroundColor = '#fef08a'; badgeEl.style.color = '#854d0e'; badgeEl.style.border = '1px solid #eab308';
            } else {
                badgeEl.style.backgroundColor = '#e5e7eb'; badgeEl.style.color = '#374151'; badgeEl.style.border = '1px solid #d1d5db';
            }
        }
    }

    generateFindings() {
        const data = this.getValues();
        const params = [];
        if (data.gradMedio > 0) params.push(`gradiente medio ${data.gradMedio} mmHg`);
        if (data.areaPht > 0) params.push(`ávula ${data.areaPht} cm² (PHT)`);

        if (params.length > 0) {
            return `Estenosis mitral con ${params.join(' y ')}.`;
        }
        return "";
    }
}


// ==========================================
// 3. AORTIC STENOSIS (EA)
// ==========================================
class AorticStenosisModule {
    constructor() {
        this.inputs = {
            vmax: 'ea_vmax',           // m/s
            gradMedio: 'ea_grad_medio', // mmHg
            ava: 'ea_ava',             // cm2
            avaIndex: 'ea_ava_index',  // cm2/m2
            coef: 'ea_coef'            // adimensional
        };
        this.output = {
            badge: 'ea_severity_badge'
        };

        this.presets = {
            leve: {
                vmax: 2.5,
                gradMedio: 15,
                ava: 1.6,
                avaIndex: 0.9,
                coef: 0.60
            },
            moderada: {
                vmax: 3.5,
                gradMedio: 30,
                ava: 1.2,
                avaIndex: 0.7,
                coef: 0.40
            },
            severa: {
                vmax: 4.5,
                gradMedio: 50,
                ava: 0.8,
                avaIndex: 0.5,
                coef: 0.20
            }
        };

        this.init();
    }

    init() {
        Object.values(this.inputs).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateState());
            }
        });

        ['leve', 'moderada', 'severa'].forEach(severity => {
            const btn = document.getElementById(`btn_ea_${severity}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.fillPreset(severity);
                });
            }
        });

        this.updateState();
    }

    fillPreset(severity) {
        const p = this.presets[severity];
        if (!p) return;

        if (document.getElementById(this.inputs.vmax)) document.getElementById(this.inputs.vmax).value = p.vmax;
        if (document.getElementById(this.inputs.gradMedio)) document.getElementById(this.inputs.gradMedio).value = p.gradMedio;
        if (document.getElementById(this.inputs.ava)) document.getElementById(this.inputs.ava).value = p.ava;
        if (document.getElementById(this.inputs.avaIndex)) document.getElementById(this.inputs.avaIndex).value = p.avaIndex;
        if (document.getElementById(this.inputs.coef)) document.getElementById(this.inputs.coef).value = p.coef;

        this.updateState();

        const mainSelect = document.getElementById('ea_grado');
        if (mainSelect) {
            mainSelect.value = severity;
            mainSelect.dispatchEvent(new Event('change'));
        }
    }

    getValues() {
        return {
            vmax: parseFloat(document.getElementById(this.inputs.vmax)?.value) || 0,
            gradMedio: parseFloat(document.getElementById(this.inputs.gradMedio)?.value) || 0,
            ava: parseFloat(document.getElementById(this.inputs.ava)?.value) || 0,
            avaIndex: parseFloat(document.getElementById(this.inputs.avaIndex)?.value) || 0
        };
    }

    determineSeverity(data) {
        // Criterios ASE (Estenosis Aortica)
        // Severa: Vmax >= 4 m/s, GM >= 40 mmHg, AVA <= 1.0, AVAi <= 0.6
        // Leve: Vmax < 3 m/s, GM < 20 mmHg, AVA > 1.5

        if (
            (data.vmax >= 4) ||
            (data.gradMedio >= 40) ||
            (data.ava > 0 && data.ava <= 1.0) ||
            (data.avaIndex > 0 && data.avaIndex <= 0.6)
        ) {
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        if (
            (data.vmax > 0 && data.vmax < 3) ||
            (data.gradMedio > 0 && data.gradMedio < 20) ||
            (data.ava > 1.5)
        ) {
            // Check if others are moderate? 
            // Vmax 2.9 is Leve. Vmax 3.5 is Moderate.
            return { level: 'Leve', color: 'green', class: 'badge-mild' };
        }

        const hasData = Object.values(data).some(v => v > 0);
        if (!hasData) return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
    }

    updateState() {
        const data = this.getValues();
        const severity = this.determineSeverity(data);
        const badgeEl = document.getElementById(this.output.badge);
        if (badgeEl) {
            badgeEl.textContent = severity.level;
            badgeEl.className = `severity-badge ${severity.class}`;

            if (severity.color === 'red') {
                badgeEl.style.backgroundColor = '#fecaca'; badgeEl.style.color = '#991b1b'; badgeEl.style.border = '1px solid #ef4444';
            } else if (severity.color === 'green') {
                badgeEl.style.backgroundColor = '#bbf7d0'; badgeEl.style.color = '#166534'; badgeEl.style.border = '1px solid #22c55e';
            } else if (severity.color === 'yellow') {
                badgeEl.style.backgroundColor = '#fef08a'; badgeEl.style.color = '#854d0e'; badgeEl.style.border = '1px solid #eab308';
            } else {
                badgeEl.style.backgroundColor = '#e5e7eb'; badgeEl.style.color = '#374151'; badgeEl.style.border = '1px solid #d1d5db';
            }
        }
    }
}

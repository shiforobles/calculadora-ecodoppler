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

    classifyCriterion(key, value) {
        if (value === 0 || value === '' || value === false || value === null || isNaN(value)) return null;

        switch (key) {
            case 'vc':
                if (value >= 7) return { level: 'severa', weight: 3 };
                if (value >= 3) return { level: 'moderada', weight: 3 };
                return { level: 'leve', weight: 3 };
            case 'ore':
                if (value >= 0.40) return { level: 'severa', weight: 4 };
                if (value >= 0.20) return { level: 'moderada', weight: 4 };
                return { level: 'leve', weight: 4 };
            case 'vr':
                if (value >= 60) return { level: 'severa', weight: 2 };
                if (value >= 30) return { level: 'moderada', weight: 2 };
                return { level: 'leve', weight: 2 };
            case 'areaJet':
                if (value === 'severa') return { level: 'severa', weight: 1 };
                if (value === 'moderada') return { level: 'moderada', weight: 1 };
                if (value === 'leve') return { level: 'leve', weight: 1 };
                return null;
            case 'inversionVenas':
                if (value === true) return { level: 'severa', weight: 5, isQualitative: true };
                return null;
            default:
                return null;
        }
    }

    updateCriterionBadges(data) {
        const mapping = {
            vc: 'badge_im_vc',
            ore: 'badge_im_ore',
            vr: 'badge_im_vr',
            areaJet: 'badge_im_area_jet',
            inversionVenas: 'badge_im_inversion'
        };

        const classes = {
            'leve': 'cb-mild',
            'moderada': 'cb-moderate',
            'severa': 'cb-severe'
        };
        const labels = {
            'leve': 'Leve',
            'moderada': 'Mod',
            'severa': 'Sev'
        };

        Object.keys(mapping).forEach(key => {
            const badgeId = mapping[key];
            const badgeEl = document.getElementById(badgeId);
            if (!badgeEl) return;

            const inputEl = badgeEl.parentElement.querySelector('input, select');
            const result = this.classifyCriterion(key, data[key]);
            
            badgeEl.className = 'criterion-badge';
            if (inputEl) {
                inputEl.classList.remove('input-mild', 'input-moderate', 'input-severe');
            }
            
            if (result) {
                badgeEl.textContent = labels[result.level];
                badgeEl.classList.add(classes[result.level]);
                badgeEl.style.display = 'inline-flex';

                if (inputEl) {
                    if (result.level === 'leve') inputEl.classList.add('input-mild');
                    else if (result.level === 'moderada') inputEl.classList.add('input-moderate');
                    else if (result.level === 'severa') inputEl.classList.add('input-severe');
                }
            } else {
                badgeEl.textContent = '—';
                badgeEl.style.display = 'none';
            }
        });
    }

    resolveConflict(criteriaResults) {
        const validResults = criteriaResults.filter(r => r !== null);
        if (validResults.length === 0) return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        const levels = validResults.map(r => r.level);
        
        const hasSevera = validResults.some(r => r.level === 'severa');
        const hasModerada = validResults.some(r => r.level === 'moderada');
        const hasLeve = validResults.some(r => r.level === 'leve');

        const severeCount = levels.filter(l => l === 'severa').length;

        if (hasSevera) {
            // If 1 severe and rest are moderate -> Mod-Severa
            if (severeCount === 1 && validResults.length > 1 && hasModerada) {
                return { level: 'Mod-Severa', color: 'red-orange', class: 'badge-borderline-high' };
            }
            // If 1 severe and rest are leve -> Conflict, fallback to Moderada
            if (severeCount === 1 && validResults.length > 1 && hasLeve && !hasModerada) {
                 return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
            }
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        if (hasModerada && hasLeve) {
            return { level: 'Leve-Mod', color: 'orange', class: 'badge-borderline-low' };
        }

        if (hasModerada) {
            return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
        }

        if (hasLeve) {
            return { level: 'Leve', color: 'green', class: 'badge-mild' };
        }

        return { level: 'No evaluada', color: 'gray', class: 'badge-none' };
    }

    determineSeverity(data) {
        const results = [
            this.classifyCriterion('vc', data.vc),
            this.classifyCriterion('ore', data.ore),
            this.classifyCriterion('vr', data.vr),
            this.classifyCriterion('areaJet', data.areaJet),
            this.classifyCriterion('inversionVenas', data.inversionVenas)
        ];
        return this.resolveConflict(results);
    }

    updateState() {
        const data = this.getValues();
        this.updateCriterionBadges(data);
        const severity = this.determineSeverity(data);

        const badges = [
            document.getElementById(this.output.badge),
            document.getElementById(this.output.badge.replace('severity', 'conclusion'))
        ];

        badges.forEach(badgeEl => {
            if (badgeEl) {
                badgeEl.textContent = severity.level;
                badgeEl.className = `severity-badge ${severity.class}`;

                if (severity.color === 'red') {
                    badgeEl.style.backgroundColor = '#fecaca'; badgeEl.style.color = '#991b1b'; badgeEl.style.border = '1px solid #ef4444';
                } else if (severity.color === 'red-orange') {
                    badgeEl.style.backgroundColor = '#fca5a5'; badgeEl.style.color = '#7f1d1d'; badgeEl.style.border = '1px solid #f87171';
                } else if (severity.color === 'orange') {
                    badgeEl.style.backgroundColor = '#fed7aa'; badgeEl.style.color = '#9a3412'; badgeEl.style.border = '1px solid #fb923c';
                } else if (severity.color === 'green') {
                    badgeEl.style.backgroundColor = '#bbf7d0'; badgeEl.style.color = '#166534'; badgeEl.style.border = '1px solid #22c55e';
                } else if (severity.color === 'yellow') {
                    badgeEl.style.backgroundColor = '#fef08a'; badgeEl.style.color = '#854d0e'; badgeEl.style.border = '1px solid #eab308';
                } else {
                    badgeEl.style.backgroundColor = '#e5e7eb'; badgeEl.style.color = '#374151'; badgeEl.style.border = '1px solid #d1d5db';
                }
            }
        });

        // Sync with main select for report generation
        const mainSelectId = this.output.badge.split('_')[0] + '_grado';
        const mainSelect = document.getElementById(mainSelectId);
        if (mainSelect && severity) {
            let val = severity.level.toLowerCase();
            if (val === 'leve-mod') val = 'leve-moderada';
            if (val === 'mod-severa') val = 'moderada-severa';
            
            if (val !== 'no evaluada') {
                if (mainSelect.value !== val) {
                    mainSelect.value = val;
                }
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

    classifyCriterion(key, value) {
        if (value === 0 || value === '' || value === false || value === null || isNaN(value)) return null;

        switch (key) {
            case 'areaPht':
                // MVA <= 1.5 is severe MS by ASE/ESC
                if (value <= 1.5) return { level: 'severa', weight: 2 };
                if (value <= 2.0) return { level: 'moderada', weight: 2 };
                return { level: 'leve', weight: 2 };
            case 'gradMedio':
                if (value >= 10) return { level: 'severa', weight: 1 };
                if (value >= 5) return { level: 'moderada', weight: 1 };
                return { level: 'leve', weight: 1 };
            default:
                return null;
        }
    }

    updateCriterionBadges(data) {
        const mapping = {
            areaPht: 'badge_em_area_pht',
            gradMedio: 'badge_em_grad_medio'
        };

        const classes = {
            'leve': 'cb-mild',
            'moderada': 'cb-moderate',
            'severa': 'cb-severe'
        };
        const labels = {
            'leve': 'Leve',
            'moderada': 'Mod',
            'severa': 'Sev'
        };

        Object.keys(mapping).forEach(key => {
            const badgeId = mapping[key];
            const badgeEl = document.getElementById(badgeId);
            if (!badgeEl) return;

            const inputEl = badgeEl.parentElement.querySelector('input, select');
            const result = this.classifyCriterion(key, data[key]);
            
            badgeEl.className = 'criterion-badge';
            if (inputEl) {
                inputEl.classList.remove('input-mild', 'input-moderate', 'input-severe');
            }
            
            if (result) {
                badgeEl.textContent = labels[result.level];
                badgeEl.classList.add(classes[result.level]);
                badgeEl.style.display = 'inline-flex';

                if (inputEl) {
                    if (result.level === 'leve') inputEl.classList.add('input-mild');
                    else if (result.level === 'moderada') inputEl.classList.add('input-moderate');
                    else if (result.level === 'severa') inputEl.classList.add('input-severe');
                }
            } else {
                badgeEl.textContent = '—';
                badgeEl.style.display = 'none';
            }
        });
    }

    resolveConflict(criteriaResults) {
        const validResults = criteriaResults.filter(r => r !== null);
        if (validResults.length === 0) return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        const levels = validResults.map(r => r.level);
        
        const hasSevera = validResults.some(r => r.level === 'severa');
        const hasModerada = validResults.some(r => r.level === 'moderada');
        const hasLeve = validResults.some(r => r.level === 'leve');

        const severeCount = levels.filter(l => l === 'severa').length;

        if (hasSevera) {
            if (severeCount === 1 && validResults.length > 1 && hasModerada) {
                return { level: 'Mod-Severa', color: 'red-orange', class: 'badge-borderline-high' };
            }
            if (severeCount === 1 && validResults.length > 1 && hasLeve && !hasModerada) {
                 return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
            }
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        if (hasModerada && hasLeve) {
            return { level: 'Leve-Mod', color: 'orange', class: 'badge-borderline-low' };
        }

        if (hasModerada) {
            return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
        }

        if (hasLeve) {
            return { level: 'Leve', color: 'green', class: 'badge-mild' };
        }

        return { level: 'No evaluada', color: 'gray', class: 'badge-none' };
    }

    determineSeverity(data) {
        const results = [
            this.classifyCriterion('areaPht', data.areaPht),
            this.classifyCriterion('gradMedio', data.gradMedio)
        ];
        return this.resolveConflict(results);
    }

    updateState() {
        const data = this.getValues();
        this.updateCriterionBadges(data);
        const severity = this.determineSeverity(data);
        
        const badges = [
            document.getElementById(this.output.badge),
            document.getElementById(this.output.badge.replace('severity', 'conclusion'))
        ];

        badges.forEach(badgeEl => {
            if (badgeEl) {
                badgeEl.textContent = severity.level;
                badgeEl.className = `severity-badge ${severity.class}`;

                if (severity.color === 'red') {
                    badgeEl.style.backgroundColor = '#fecaca'; badgeEl.style.color = '#991b1b'; badgeEl.style.border = '1px solid #ef4444';
                } else if (severity.color === 'red-orange') {
                    badgeEl.style.backgroundColor = '#fca5a5'; badgeEl.style.color = '#7f1d1d'; badgeEl.style.border = '1px solid #f87171';
                } else if (severity.color === 'orange') {
                    badgeEl.style.backgroundColor = '#fed7aa'; badgeEl.style.color = '#9a3412'; badgeEl.style.border = '1px solid #fb923c';
                } else if (severity.color === 'green') {
                    badgeEl.style.backgroundColor = '#bbf7d0'; badgeEl.style.color = '#166534'; badgeEl.style.border = '1px solid #22c55e';
                } else if (severity.color === 'yellow') {
                    badgeEl.style.backgroundColor = '#fef08a'; badgeEl.style.color = '#854d0e'; badgeEl.style.border = '1px solid #eab308';
                } else {
                    badgeEl.style.backgroundColor = '#e5e7eb'; badgeEl.style.color = '#374151'; badgeEl.style.border = '1px solid #d1d5db';
                }
            }
        });

        // Sync with main select for report generation
        const mainSelectId = this.output.badge.split('_')[0] + '_grado';
        const mainSelect = document.getElementById(mainSelectId);
        if (mainSelect && severity) {
            let val = severity.level.toLowerCase();
            if (val === 'leve-mod') val = 'leve-moderada';
            if (val === 'mod-severa') val = 'moderada-severa';
            
            if (val !== 'no evaluada') {
                if (mainSelect.value !== val) {
                    mainSelect.value = val;
                }
            }
        }
    }

    generateFindings() {
        const data = this.getValues();
        const params = [];
        if (data.gradMedio > 0) params.push(`gradiente medio ${data.gradMedio} mmHg`);
        if (data.areaPht > 0) params.push(`válvula ${data.areaPht} cm² (PHT)`);

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
            esclerosis: {
                vmax: 2.2,
                gradMedio: 10,
                ava: 2.0,
                avaIndex: 1.1,
                coef: 0.70
            },
            leve: {
                vmax: 2.8,
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
            avaIndex: parseFloat(document.getElementById(this.inputs.avaIndex)?.value) || 0,
            coef: parseFloat(document.getElementById(this.inputs.coef)?.value) || 0
        };
    }

    classifyCriterion(key, value) {
        if (value === 0 || value === '' || value === false || value === null || isNaN(value)) return null;

        switch (key) {
            case 'vmax':
                if (value >= 4) return { level: 'severa', weight: 1 };
                if (value >= 3) return { level: 'moderada', weight: 1 };
                if (value >= 2.6) return { level: 'leve', weight: 1 };
                if (value >= 2.0 && value <= 2.5) return { level: 'esclerosis', weight: 0.5 };
                return null;
            case 'gradMedio':
                if (value >= 40) return { level: 'severa', weight: 1 };
                if (value >= 20) return { level: 'moderada', weight: 1 };
                return { level: 'leve', weight: 1 };
            case 'ava':
                if (value <= 1.0) return { level: 'severa', weight: 2 };
                if (value <= 1.5) return { level: 'moderada', weight: 2 };
                return { level: 'leve', weight: 2 };
            case 'avaIndex':
                if (value <= 0.6) return { level: 'severa', weight: 1 };
                if (value <= 0.85) return { level: 'moderada', weight: 1 };
                return { level: 'leve', weight: 1 };
            case 'coef':
                if (value <= 0.25) return { level: 'severa', weight: 1 };
                if (value <= 0.50) return { level: 'moderada', weight: 1 };
                return { level: 'leve', weight: 1 };
            default:
                return null;
        }
    }

    updateCriterionBadges(data) {
        const mapping = {
            vmax: 'badge_ea_vmax',
            gradMedio: 'badge_ea_grad_medio',
            ava: 'badge_ea_ava',
            avaIndex: 'badge_ea_ava_index',
            coef: 'badge_ea_coef'
        };

        const classes = {
            'esclerosis': 'cb-esclerosis',
            'leve': 'cb-mild',
            'moderada': 'cb-moderate',
            'severa': 'cb-severe'
        };
        const labels = {
            'esclerosis': 'Escl.',
            'leve': 'Leve',
            'moderada': 'Mod',
            'severa': 'Sev'
        };

        Object.keys(mapping).forEach(key => {
            const badgeId = mapping[key];
            const badgeEl = document.getElementById(badgeId);
            if (!badgeEl) return;

            const inputEl = badgeEl.parentElement.querySelector('input, select');
            const result = this.classifyCriterion(key, data[key]);
            
            badgeEl.className = 'criterion-badge';
            if (inputEl) {
                inputEl.classList.remove('input-mild', 'input-moderate', 'input-severe');
            }
            
            if (result) {
                badgeEl.textContent = labels[result.level];
                badgeEl.classList.add(classes[result.level]);
                badgeEl.style.display = 'inline-flex';

                if (inputEl) {
                    if (result.level === 'esclerosis') inputEl.classList.add('input-esclerosis');
                    else if (result.level === 'leve') inputEl.classList.add('input-mild');
                    else if (result.level === 'moderada') inputEl.classList.add('input-moderate');
                    else if (result.level === 'severa') inputEl.classList.add('input-severe');
                }
            } else {
                badgeEl.textContent = '—';
                badgeEl.style.display = 'none';
            }
        });
    }

    resolveConflict(criteriaResults) {
        const validResults = criteriaResults.filter(r => r !== null);
        if (validResults.length === 0) return { level: 'No evaluada', color: 'gray', class: 'badge-none' };

        const levels = validResults.map(r => r.level);
        
        const hasSevera = validResults.some(r => r.level === 'severa');
        const hasModerada = validResults.some(r => r.level === 'moderada');
        const hasLeve = validResults.some(r => r.level === 'leve');
        const hasEsclerosis = validResults.some(r => r.level === 'esclerosis');

        const severeCount = levels.filter(l => l === 'severa').length;

        if (hasSevera) {
            if (severeCount === 1 && validResults.length > 1 && hasModerada) {
                return { level: 'Mod-Severa', color: 'red-orange', class: 'badge-borderline-high' };
            }
            if (severeCount === 1 && validResults.length > 1 && (hasLeve || hasEsclerosis) && !hasModerada) {
                 return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
            }
            return { level: 'Severa', color: 'red', class: 'badge-severe' };
        }

        if (hasModerada && (hasLeve || hasEsclerosis)) {
            return { level: 'Leve-Mod', color: 'orange', class: 'badge-borderline-low' };
        }

        if (hasModerada) {
            return { level: 'Moderada', color: 'yellow', class: 'badge-moderate' };
        }

        if (hasLeve) {
            return { level: 'Leve', color: 'green', class: 'badge-mild' };
        }

        if (hasEsclerosis) {
            return { level: 'Esclerosis', color: 'teal', class: 'badge-esclerosis' };
        }

        return { level: 'No evaluada', color: 'gray', class: 'badge-none' };
    }

    determineSeverity(data) {
        const results = [
            this.classifyCriterion('vmax', data.vmax),
            this.classifyCriterion('gradMedio', data.gradMedio),
            this.classifyCriterion('ava', data.ava),
            this.classifyCriterion('avaIndex', data.avaIndex),
             this.classifyCriterion('coef', data.coef)
        ];
        return this.resolveConflict(results);
    }

    updateState() {
        const data = this.getValues();
        this.updateCriterionBadges(data);
        const severity = this.determineSeverity(data);
        
        const badges = [
            document.getElementById(this.output.badge),
            document.getElementById(this.output.badge.replace('severity', 'conclusion'))
        ];

        badges.forEach(badgeEl => {
            if (badgeEl) {
                badgeEl.textContent = severity.level;
                badgeEl.className = `severity-badge ${severity.class}`;

                if (severity.color === 'red') {
                    badgeEl.style.backgroundColor = '#fecaca'; badgeEl.style.color = '#991b1b'; badgeEl.style.border = '1px solid #ef4444';
                } else if (severity.color === 'red-orange') {
                    badgeEl.style.backgroundColor = '#fca5a5'; badgeEl.style.color = '#7f1d1d'; badgeEl.style.border = '1px solid #f87171';
                } else if (severity.color === 'orange') {
                    badgeEl.style.backgroundColor = '#fed7aa'; badgeEl.style.color = '#9a3412'; badgeEl.style.border = '1px solid #fb923c';
                } else if (severity.color === 'green') {
                    badgeEl.style.backgroundColor = '#bbf7d0'; badgeEl.style.color = '#166534'; badgeEl.style.border = '1px solid #22c55e';
                } else if (severity.color === 'yellow') {
                    badgeEl.style.backgroundColor = '#fef08a'; badgeEl.style.color = '#854d0e'; badgeEl.style.border = '1px solid #eab308';
                } else {
                    badgeEl.style.backgroundColor = '#e5e7eb'; badgeEl.style.color = '#374151'; badgeEl.style.border = '1px solid #d1d5db';
                }
            }
        });
    }
}

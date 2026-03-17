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

        // Preset buttons
        ['leve', 'moderada', 'severa'].forEach(severity => {
            const btn = document.getElementById(`btn_iao_${severity}`);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.fillPreset(severity);
                });
            }
        });

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

    classifyCriterion(key, value) {
        if (value === 0 || value === '' || value === false || value === null || isNaN(value)) return null;

        switch (key) {
            case 'vc':
                if (value > 0.6) return { level: 'severa', weight: 3 };
                if (value >= 0.3) return { level: 'moderada', weight: 3 };
                return { level: 'leve', weight: 3 };
            case 'pht':
                if (value < 200) return { level: 'severa', weight: 2 };
                if (value <= 500) return { level: 'moderada', weight: 2 };
                return { level: 'leve', weight: 2 };
            case 'jetWidth':
                if (value >= 65) return { level: 'severa', weight: 1 };
                if (value >= 25) return { level: 'moderada', weight: 1 };
                return { level: 'leve', weight: 1 };
            case 'rvol':
                if (value >= 60) return { level: 'severa', weight: 2 };
                if (value >= 30) return { level: 'moderada', weight: 2 };
                return { level: 'leve', weight: 2 };
            case 'eroa':
                if (value >= 0.30) return { level: 'severa', weight: 4 };
                if (value >= 0.10) return { level: 'moderada', weight: 4 };
                return { level: 'leve', weight: 4 };
            case 'alcance':
                if (value === 'apex') return { level: 'severa', weight: 1 };
                if (value === 'mitral') return { level: 'moderada', weight: 1 };
                if (value === 'tsvi') return { level: 'leve', weight: 1 };
                return null;
            case 'flujoReverso':
                if (value === true) return { level: 'severa', weight: 5, isQualitative: true };
                return null;
            default:
                return null;
        }
    }

    updateCriterionBadges(data) {
        const mapping = {
            vc: 'badge_iao_vc',
            pht: 'badge_iao_pht',
            jetWidth: 'badge_iao_jet_width',
            rvol: 'badge_iao_rvol',
            eroa: 'badge_iao_eroa',
            alcance: 'badge_iao_jet_alcance',
            flujoReverso: 'badge_iao_flujo_reverso'
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
            this.classifyCriterion('vc', data.vc),
            this.classifyCriterion('pht', data.pht),
            this.classifyCriterion('jetWidth', data.jetWidth),
            this.classifyCriterion('rvol', data.rvol),
            this.classifyCriterion('eroa', data.eroa),
            this.classifyCriterion('alcance', data.alcance),
            this.classifyCriterion('flujoReverso', data.flujoReverso)
        ];
        return this.resolveConflict(results);
    }

    updateState() {
        const data = this.getValues();
        // Since alcance 'tsvi' is default, to avoid showing Leve erroneously on new untouched form:
        const hasMetric = Object.values(data).some(v => typeof v === 'number' && v > 0);
        if (!hasMetric && !data.flujoReverso && data.alcance === 'tsvi') {
            data.alcance = null; // Ignore default when computing fresh state without metrics
        }
        
        this.updateCriterionBadges(data);
        const severity = this.determineSeverity(data);

        // Update Badge UI
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
        // Note: For Aortic Regurgitation, the main select ID is 'ia_grado'
        const mainSelect = document.getElementById('ia_grado');
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

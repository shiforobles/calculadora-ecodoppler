/**
 * Quality Control Module
 * Validates data consistency and clinical logic  
 */

class QualityControl {

    constructor() {
        this.alerts = [];
    }

    /**
     * Run all quality control checks on form data
     * @param {object} formData - Form data to validate
     * @returns {array} - Array of alerts
     */
    runChecks(formData) {
        this.alerts = [];

        const num = (v) => (v === null || v === undefined || v === '') ? null : parseFloat(v);

        // ============================================================
        // GRUPO A — CONSISTENCIA DE DATOS (errores que invalidan el informe)
        // ============================================================

        // A1: Motilidad conservada con FEy deprimida
        if (formData.motilidad === 'normal' && formData.fevi && formData.fevi < 50) {
            this.addAlert('error',
                'Incongruencia: motilidad conservada con FEy deprimida (<50%). Revise motilidad segmentaria.');
        }

        // A2: Estenosis aórtica severa vs AVA
        if (formData.ea_grado === 'severa' && num(formData.ea_ava) && num(formData.ea_ava) > 1.2) {
            this.addAlert('error',
                'AVA > 1.2 cm² no es compatible con estenosis aórtica severa (debe ser < 1.0 cm²).');
        }

        // A3: DSVI >= DDVI
        if (num(formData.dsvi) && num(formData.ddvi) && num(formData.dsvi) >= num(formData.ddvi)) {
            this.addAlert('error',
                'DSVI debe ser menor que DDVI. Verifique las mediciones.');
        }

        // A4: Geometría "normal" en VI dilatado (ASE 2025)
        if (formData.geometry === 'Geometría Normal' && formData.lvDilated) {
            this.addAlert('error',
                'Geometría reportada como normal en VI dilatado. Corresponde "remodelado excéntrico".');
        }

        // A5: PSAP elevada sin IT cargada para estimarla
        if (num(formData.psap) && num(formData.psap) > 35 && !formData.itLoaded) {
            this.addAlert('warning',
                'PSAP elevada informada sin velocidad de IT cargada. Verifique el origen de la estimación.');
        }

        // A6: E/e' elevado con diástole reportada como normal
        if (num(formData.ePrime) && num(formData.eVel) && formData.diastoleNormal) {
            const eePrime = num(formData.eVel) / num(formData.ePrime);
            if (eePrime > 14) {
                this.addAlert('warning',
                    'E/e\' > 14 (presiones de llenado elevadas) con función diastólica informada como normal. Revise el grado diastólico.');
            }
        }

        // ============================================================
        // GRUPO B — SUGERENCIAS CLÍNICAS (mejoran el informe, no bloquean)
        // ============================================================

        // B1: IM significativa funcional
        if (formData.fevi && formData.fevi < 40 && formData.lvDilated &&
            (formData.im_grado === 'moderada' || formData.im_grado === 'severa') &&
            !formData.mitralStructural) {
            this.addAlert('info',
                'IM significativa con válvula estructuralmente normal y VI dilatado: se describirá como funcional por tenting.');
        }

        // B2: Bajo gasto — limitación técnica del VS
        if (num(formData.ci) && num(formData.ci) < 2.2 && formData.lvDilated) {
            this.addAlert('info',
                'IC bajo estimado por eco: el VS puede subestimarse en VI dilatado. Se agregará la aclaración técnica.');
        }

        // B3: Disfunción diastólica grado 1 sintomática → sugerir eco estrés
        if (formData.diastolicGrade === 'I' && formData.symptomatic) {
            this.addAlert('info',
                'Disfunción diastólica grado 1 en paciente sintomático: considerar eco de estrés diastólico (ASE 2025).');
        }

        // B4: HTP con presiones elevadas → componente postcapilar
        if (num(formData.psap) && num(formData.psap) >= 35 &&
            (formData.diastolicGrade === 'II' || formData.diastolicGrade === 'III')) {
            this.addAlert('info',
                'HTP con presiones de llenado elevadas: se orientará a componente postcapilar.');
        }

        // B5: BCRI/MP — no usar e' septal
        if (formData.bcri || formData.pacemaker) {
            this.addAlert('info',
                'BCRI o marcapasos VD presente: usar e\' lateral para la evaluación diastólica (no septal).');
        }

        // ============================================================
        // GRUPO C — HALLAZGOS CRÍTICOS (resaltar en el informe — ASE 2025)
        // ============================================================

        // C1: FEVI severamente deprimida
        if (formData.fevi && formData.fevi < 30) {
            this.addAlert('critical',
                'FEVI severamente deprimida (<30%). Hallazgo significativo a resaltar.');
        }

        // C2: Estenosis aórtica severa
        if (formData.ea_grado === 'severa') {
            this.addAlert('critical',
                'Estenosis aórtica severa: hallazgo significativo. Considerar referencia según guías de valvulopatías.');
        }

        // C3: Derrame pericárdico con compromiso hemodinámico
        if (formData.peCompromise) {
            this.addAlert('critical',
                'Derrame pericárdico con signos de compromiso hemodinámico. Comunicar al equipo tratante.');
        }

        // C4: HTP severa
        if (num(formData.psap) && num(formData.psap) >= 60) {
            this.addAlert('critical',
                'Hipertensión pulmonar severa (PSAP ≥ 60 mmHg). Hallazgo significativo.');
        }

        // C5: Disfunción severa del VD
        if (num(formData.tapse) && num(formData.tapse) < 13) {
            this.addAlert('critical',
                'Disfunción sistólica severa del VD (TAPSE < 13 mm). Hallazgo significativo.');
        }

        return this.alerts;
    }

    /**
     * Add an alert to the list
     * @param {string} level - 'error', 'warning', or 'info'
     * @param {string} message - Alert message
     */
    addAlert(level, message) {
        this.alerts.push({ level, message });
    }

    /**
     * Check if there are any critical errors
     * @returns {boolean} - True if errors exist
     */
    hasErrors() {
        return this.alerts.some(alert => alert.level === 'error');
    }

    /**
     * Render alerts in the QC box
     */
    render() {
        const container = document.getElementById('qc_alerts');
        const box = document.getElementById('qc_box');

        if (!container || !box) return;

        // If no alerts, show OK status
        if (this.alerts.length === 0) {
            box.classList.add('qc-ok');
            container.innerHTML = '<p style="margin: 0; color: #059669; font-weight: 600;">✅ Todos los controles pasaron correctamente</p>';
            return;
        }

        // Remove OK status
        box.classList.remove('qc-ok');

        // Order: critical → error → warning → info
        const order = { critical: 0, error: 1, warning: 2, info: 3 };
        const sorted = [...this.alerts].sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));

        // Render each alert
        container.innerHTML = sorted.map(alert => {
            const icon = alert.level === 'critical' ? '🚨' :
                alert.level === 'error' ? '❌' :
                alert.level === 'warning' ? '⚠️' : 'ℹ️';
            return `<div class="qc-alert qc-alert-${alert.level}">
                ${icon} ${alert.message}
            </div>`;
        }).join('');
    }

    /**
     * Return only critical findings (for highlighting in the report summary)
     * @returns {array} - Array of critical alert messages
     */
    getCriticalFindings() {
        return this.alerts.filter(a => a.level === 'critical').map(a => a.message);
    }

    /**
     * Clear all alerts
     */
    clear() {
        this.alerts = [];
        const container = document.getElementById('qc_alerts');
        const box = document.getElementById('qc_box');
        if (container) container.innerHTML = '';
        if (box) box.classList.remove('qc-ok');
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.QualityControl = QualityControl;
}

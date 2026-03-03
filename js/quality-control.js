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

        // Rule 1: Motilidad vs FEy consistency
        if (formData.motilidad === 'normal' && formData.fevi && formData.fevi < 50) {
            this.addAlert('error',
                'Incongruencia: Motilidad conservada con FEy deprimida (<50%)');
        }

        // Rule 2: Estenosis Aórtica severa vs AVA
        if (formData.ea_grado === 'severa' && formData.ea_ava && parseFloat(formData.ea_ava) > 1.2) {
            this.addAlert('error',
                'AVA > 1.2 cm² no es compatible con estenosis aórtica severa (debe ser < 1.0)');
        }

        // Rule 3: DSVI >= DDVI (sanidad de datos)
        if (formData.dsvi && formData.ddvi && parseFloat(formData.dsvi) >= parseFloat(formData.ddvi)) {
            this.addAlert('error',
                'DSVI debe ser menor que DDVI. Verifique las mediciones.');
        }

        // Removed annoying live warnings about missing expected measurements 
        // (Rules 4, 6, 7) because they trigger prematurely before the user has a chance to type.

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

        // Render each alert
        container.innerHTML = this.alerts.map(alert => {
            const icon = alert.level === 'error' ? '❌' :
                alert.level === 'warning' ? '⚠️' : 'ℹ️';
            return `<div class="qc-alert qc-alert-${alert.level}">
                ${icon} ${alert.message}
            </div>`;
        }).join('');
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

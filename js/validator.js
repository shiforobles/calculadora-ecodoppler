/**
 * Input Validator Module
 * Clinical range validation for echocardiographic parameters
 */

class InputValidator {

    constructor() {
        // Clinical range definitions based on medical literature
        this.ranges = {
            edad: { min: 0, max: 120, unit: 'años' },
            peso: { min: 20, max: 300, unit: 'kg' },
            altura: { min: 100, max: 250, unit: 'cm' },

            // LV measurements
            siv: { min: 5, max: 25, unit: 'mm', optimal: { min: 7, max: 11 } },
            pp: { min: 5, max: 25, unit: 'mm', optimal: { min: 7, max: 11 } },
            ddvi: { min: 30, max: 75, unit: 'mm', optimal: { min: 42, max: 59 } },
            dsvi: { min: 20, max: 60, unit: 'mm', optimal: { min: 25, max: 40 } },
            fevi: { min: 10, max: 100, unit: '%', optimal: { min: 52, max: 72 } },

            // Diastolic parameters
            onda_e: { min: 20, max: 200, unit: 'cm/s', optimal: { min: 50, max: 120 } },
            onda_a: { min: 10, max: 150, unit: 'cm/s', optimal: { min: 30, max: 100 } },
            onda_e_prime: { min: 3, max: 25, unit: 'cm/s', optimal: { min: 8, max: 20 } },

            // Atrium
            vol_ai: { min: 10, max: 100, unit: 'ml/m²', optimal: { min: 16, max: 34 } },

            // Aorta
            ao_raiz: { min: 20, max: 60, unit: 'mm', optimal: { min: 27, max: 37 } },
            ao_asc: { min: 20, max: 70, unit: 'mm', optimal: { min: 27, max: 37 } },

            // Right heart
            tapse: { min: 5, max: 40, unit: 'mm', optimal: { min: 17, max: 27 } },
            vel_it: { min: 0.5, max: 5, unit: 'm/s', optimal: { min: 1.5, max: 2.5 } },
            pad: { min: 0, max: 20, unit: 'mmHg', optimal: { min: 5, max: 10 } }
        };
    }

    /**
     * Validate a single value against its clinical range
     * @param {string} fieldId - Field identifier
     * @param {number} value - Value to validate
     * @returns {Object} { valid, message, warning }
     */
    validate(fieldId, value) {
        const range = this.ranges[fieldId];

        if (!range) {
            return { valid: true, message: '', warning: false };
        }

        // Check if value is within absolute limits
        if (value < range.min || value > range.max) {
            return {
                valid: false,
                message: `Valor fuera de rango clínico (${range.min}-${range.max} ${range.unit})`,
                warning: false
            };
        }

        // Check if value is outside optimal range (warning only)
        if (range.optimal) {
            if (value < range.optimal.min || value > range.optimal.max) {
                return {
                    valid: true,
                    message: `Valor fuera del rango normal (${range.optimal.min}-${range.optimal.max} ${range.unit})`,
                    warning: true
                };
            }
        }

        return { valid: true, message: '', warning: false };
    }

    /**
     * Apply validation styling to input element
     * @param {HTMLElement} input - Input element
     * @param {Object} validationResult - Result from validate()
     */
    applyValidationStyle(input, validationResult) {
        // Remove existing validation classes
        input.classList.remove('valid', 'invalid', 'warning');

        if (!validationResult.valid) {
            input.classList.add('invalid');
            input.title = validationResult.message;
        } else if (validationResult.warning) {
            input.classList.add('warning');
            input.title = validationResult.message;
        } else if (input.value && input.value.trim() !== '') {
            input.classList.add('valid');
            input.title = '';
        }
    }

    /**
     * Validate all inputs in the form
     * @param {Array<string>} fieldIds - Array of field IDs to validate
     * @returns {boolean} True if all fields are valid
     */
    validateAll(fieldIds) {
        let allValid = true;

        fieldIds.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (!input) return;

            const value = parseFloat(input.value);
            if (isNaN(value) || input.value === '') return;

            const result = this.validate(fieldId, value);
            this.applyValidationStyle(input, result);

            if (!result.valid) {
                allValid = false;
            }
        });

        return allValid;
    }

    /**
     * Get warning message for specific clinical scenarios
     * @param {string} fieldId - Field identifier
     * @param {number} value - Current value
     * @returns {string} Warning message or empty string
     */
    getClinicalWarning(fieldId, value) {
        const warnings = {
            siv: (v) => v > 15 ? '⚠️ Hipertrofia septal severa' : '',
            pp: (v) => v > 15 ? '⚠️ Hipertrofia parietal severa' : '',
            ddvi: (v) => v > 59 ? '⚠️ Dilatación ventricular' : '',
            fevi: (v) => {
                if (v < 40) return '⚠️ Disfunción sistólica severa';
                if (v < 50) return '⚠️ Disfunción sistólica leve-moderada';
                if (v > 75) return '💡 Considerar: estado hiperdinámico';
                return '';
            },
            onda_e_prime: (v) => v < 8 ? '⚠️ Relajación alterada' : '',
            vol_ai: (v) => {
                if (v > 48) return '⚠️ Dilatación AI severa';
                if (v > 34) return '⚠️ Dilatación AI';
                return '';
            },
            tapse: (v) => v < 16 ? '⚠️ Disfunción VD' : '',
            ao_raiz: (v) => {
                if (v > 40) return '⚠️ Dilatación aorta (considerar indexar)';
                return '';
            },
            ao_asc: (v) => {
                if (v > 40) return '⚠️ Dilatación aorta ascendente';
                return '';
            }
        };

        const warningFn = warnings[fieldId];
        return warningFn ? warningFn(value) : '';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputValidator;
}

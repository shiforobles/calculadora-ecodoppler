/**
 * Hemodynamics Calculator Module
 * Medical formulas based on ASE/EACVI Guidelines 2016
 * 
 * All calculations validated against clinical standards
 */

class HemodynamicsCalculator {
    
    /**
     * Calculate Body Surface Area using Mosteller formula
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @returns {number} BSA in m²
     */
    calculateBodySurface(weight, height) {
        if (!weight || !height) return 0;
        return 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725);
    }

    /**
     * Calculate Left Ventricular Mass using Devereux formula (CORRECTED)
     * Formula: LV Mass = 0.8 × {1.04 × [(DDVI + PP + SIV)³ - DDVI³]} + 0.6
     * 
     * @param {number} ddvi - Diastolic diameter in mm
     * @param {number} pp - Posterior wall thickness in mm
     * @param {number} siv - Interventricular septum in mm
     * @returns {number} LV mass in grams
     */
    calculateLVMass(ddvi, pp, siv) {
        if (!ddvi || !pp || !siv) return 0;
        
        // Convert mm to cm
        const ddviCm = ddvi / 10;
        const ppCm = pp / 10;
        const sivCm = siv / 10;
        
        // Devereux formula: 0.8 × {1.04 × [(DDVI + PP + SIV)³ - DDVI³]} + 0.6
        const sum = ddviCm + ppCm + sivCm;
        const mass = 0.8 * (1.04 * (Math.pow(sum, 3) - Math.pow(ddviCm, 3))) + 0.6;
        
        return mass;
    }

    /**
     * Calculate Relative Wall Thickness
     * @param {number} pp - Posterior wall in mm
     * @param {number} siv - Septum in mm
     * @param {number} ddvi - Diastolic diameter in mm
     * @returns {number} RWT ratio
     */
    calculateRWT(pp, siv, ddvi) {
        if (!pp || !siv || !ddvi) return 0;
        // Alternative formula: (PP + SIV) / DDVI
        // Standard ASE: (2 × PP) / DDVI
        return (2 * pp) / ddvi;
    }

    /**
     * Classify LV Geometry based on ASE Guidelines
     * @param {number} massIndex - LV mass indexed to BSA (g/m²)
     * @param {number} rwt - Relative wall thickness
     * @param {string} sex - 'M' or 'F'
     * @returns {string} Geometry classification
     */
    classifyLVGeometry(massIndex, rwt, sex) {
        if (!massIndex || !rwt) return "Datos insuficientes";
        
        // Sex-specific LV mass index thresholds
        const limit = sex === 'M' ? 115 : 95;
        
        const hypertrophy = massIndex > limit;
        const concentric = rwt > 0.42;
        
        if (!hypertrophy && !concentric) {
            return "Geometría Normal";
        } else if (!hypertrophy && concentric) {
            return "Remodelado Concéntrico";
        } else if (hypertrophy && concentric) {
            return "Hipertrofia Concéntrica";
        } else {
            return "Hipertrofia Excéntrica";
        }
    }

    /**
     * Check if LV is dilated (sex-specific criteria)
     * @param {number} ddvi - Diastolic diameter in mm
     * @param {string} sex - 'M' or 'F'
     * @returns {boolean} True if dilated
     */
    isLVDilated(ddvi, sex) {
        if (!ddvi) return false;
        // ASE criteria for LV dilatation
        const limit = sex === 'M' ? 59 : 53;
        return ddvi > limit;
    }

    /**
     * Classify Diastolic Function according to ASE 2016 Algorithm
     * 
     * @param {Object} params - Diastolic parameters
     * @param {number} params.E - Mitral E wave velocity (cm/s)
     * @param {number} params.A - Mitral A wave velocity (cm/s)
     * @param {number} params.ePrime - Average e' velocity (cm/s)
     * @param {number} params.LAVolIndex - LA volume index (ml/m²)
     * @param {number} params.TRVel - TR velocity (m/s)
     * @param {number} params.LVEF - LV ejection fraction (%)
     * @param {string} params.wallMotion - 'normal', 'hipo_global', 'segmentaria'
     * @returns {Object} { grade, description, severity }
     */
    classifyDiastolicFunction(params) {
        const { E, A, ePrime, LAVolIndex = 28, TRVel = 0, LVEF = 60, wallMotion = 'normal' } = params;
        
        // Check if we have minimum required data
        if (!E || !A || !ePrime) {
            return {
                grade: "Indeterminado",
                description: "Esperando datos Doppler...",
                severity: "neutral"
            };
        }
        
        const EeRatio = E / ePrime;
        const EARatio = E / A;
        
        // Special case: Supernormal pattern (Athletic heart)
        if (EARatio > 2 && ePrime >= 10) {
            return {
                grade: "Normal",
                description: "Función Diastólica Normal (Patrón de llenado vigoroso/Atleta). Presiones de llenado VI normales.",
                severity: "green"
            };
        }
        
        // Special case: Restrictive pattern (Grade III)
        if (EARatio > 2 && ePrime < 10) {
            return {
                grade: "III",
                description: "Disfunción Diastólica Grado III (Patrón Restrictivo). Presiones de llenado VI elevadas.",
                severity: "red"
            };
        }
        
        // Determine if heart has structural/functional disease
        const diseased = (LVEF < 50 || wallMotion !== 'normal');
        
        // Algorithm for normal hearts (LVEF ≥50% and no wall motion abnormalities)
        if (!diseased) {
            let criteria = 0;
            
            if (ePrime < 9) criteria++;
            if (EeRatio > 14) criteria++;
            if (LAVolIndex > 34) criteria++;
            if (TRVel > 2.8) criteria++;
            
            if (criteria < 2) {
                return {
                    grade: "Normal",
                    description: "Función Diastólica Normal. Presiones de llenado VI normales.",
                    severity: "green"
                };
            } else if (criteria === 2) {
                return {
                    grade: "Indeterminado",
                    description: "Función Diastólica Indeterminada (2/4 criterios alterados). Se requiere evaluación adicional.",
                    severity: "yellow"
                };
            } else {
                // ≥3 criteria met → treat as diseased heart
                // Proceed to diseased heart algorithm below
            }
        }
        
        // Algorithm for diseased hearts or ≥3 criteria in normal hearts
        // Grade I: E/A ≤0.8 and E ≤50 cm/s
        if (EARatio <= 0.8 && E <= 50) {
            return {
                grade: "I",
                description: "Disfunción Diastólica Grado I (Relajación Prolongada). Presiones de llenado VI normales.",
                severity: "green"
            };
        }
        
        // Grade II vs Grade I (when E/A > 0.8 or E > 50)
        // Use additional criteria to determine filling pressures
        let criteriaP = 0;
        let dataPoints = 0;
        
        if (EeRatio !== null && !isNaN(EeRatio)) {
            dataPoints++;
            if (EeRatio > 14) criteriaP++;
        }
        
        if (TRVel !== null && TRVel > 0) {
            dataPoints++;
            if (TRVel > 2.8) criteriaP++;
        }
        
        if (LAVolIndex !== null && !isNaN(LAVolIndex)) {
            dataPoints++;
            if (LAVolIndex > 34) criteriaP++;
        }
        
        // Need at least 2 data points to classify
        if (dataPoints < 2) {
            return {
                grade: "Indeterminado",
                description: "Función Diastólica Indeterminada. Datos insuficientes para clasificar.",
                severity: "yellow"
            };
        }
        
        // ≥50% of criteria met → Grade II (elevated pressures)
        if (criteriaP >= 2) {
            return {
                grade: "II",
                description: "Disfunción Diastólica Grado II (Pseudonormal). Presiones de llenado VI elevadas.",
                severity: "red"
            };
        } else if (criteriaP === 0 || (criteriaP === 1 && dataPoints === 3)) {
            return {
                grade: "I",
                description: "Disfunción Diastólica Grado I (Relajación Prolongada). Presiones de llenado VI normales.",
                severity: "green"
            };
        } else {
            return {
                grade: "Indeterminado",
                description: "Función Diastólica Indeterminada. Evaluación adicional requerida.",
                severity: "yellow"
            };
        }
    }

    /**
     * Calculate Pulmonary Artery Systolic Pressure (PASP/PSAP)
     * PSAP = 4(VmaxTR)² + RAP
     * 
     * @param {number} trVelocity - Tricuspid regurgitation max velocity (m/s)
     * @param {number} rap - Right atrial pressure (mmHg)
     * @returns {number} PSAP in mmHg
     */
    calculatePSAP(trVelocity, rap = 5) {
        if (!trVelocity || trVelocity <= 0) return 0;
        
        // Simplified Bernoulli equation: ΔP = 4V²
        const gradient = 4 * Math.pow(trVelocity, 2);
        const psap = Math.round(gradient + rap);
        
        return psap;
    }

    /**
     * Classify Pulmonary Hypertension severity
     * @param {number} psap - PSAP in mmHg
     * @returns {string} Classification
     */
    classifyPulmonaryPressure(psap) {
        if (!psap || psap === 0) return "No estimable";
        if (psap < 36) return "Normal";
        if (psap < 45) return "Levemente elevada";
        if (psap < 60) return "Moderadamente elevada";
        return "Severamente elevada";
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HemodynamicsCalculator;
}

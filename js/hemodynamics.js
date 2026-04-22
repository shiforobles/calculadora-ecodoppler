/**
 * Hemodynamics Calculator Module
 * Medical formulas based on ASE/EACVI Guidelines 2016
 * 
 * All calculations validated against clinical standards
 */

class HemodynamicsCalculator {

    /**
     * Calculate Body Surface Area using DuBois formula (1916)
     * Formula: BSA = 0.007184 × W^0.425 × H^0.725
     * Note: NOT the Mosteller formula (sqrt(H × W / 3600))
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
        // ASE 2015 reference values:
        // Male: normal ≤58 mm (borderline 59–63, dilated ≥64)
        // Female: normal ≤52 mm (borderline 53–57, dilated ≥58)
        const limit = sex === 'M' ? 58 : 52;
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
        const { E, A, ePrime, eSeptal, eLateral, LAVolIndex = 28, TRVel = 0, LVEF = 60, wallMotion = 'conservada', ritmo = 'sinusal', context = {} } = params;
        const { bcri = false, mac = false, imSevera = false, mcp = false, valsalva = false } = context;

        // e' criterion per ASE 2016: septal < 7 OR lateral < 10
        // BCRI: septal e' unreliable → use lateral only
        // MAC: both e' unreliable → skip e' criterion entirely
        let ePrimeAbnormal = false;
        if (!mac) {
            if (bcri) {
                ePrimeAbnormal = !isNaN(eLateral) && eLateral < 10;
            } else {
                ePrimeAbnormal = (!isNaN(eSeptal) && eSeptal < 7) ||
                                 (!isNaN(eLateral) && eLateral < 10) ||
                                 (isNaN(eSeptal) && isNaN(eLateral) && !isNaN(ePrime) && ePrime < 8);
            }
        }

        // e' for E/e' ratio: BCRI → use lateral only; MAC → E/e' unreliable
        let ePrimeForRatio = ePrime;
        if (bcri && !isNaN(eLateral)) ePrimeForRatio = eLateral;

        // Warnings to append to description
        const warnings = [];
        if (bcri)     warnings.push('BCRI: e\' septal excluido');
        if (mac)      warnings.push('MAC: E/e\' no válido');
        if (imSevera) warnings.push('IM Severa: E/e\' sobreestima presiones');
        if (mcp)      warnings.push('MCP: umbrales E/e\' modificados');

        // Check if we have minimum required data
        // For FA, we don't need 'A' wave
        const isFA = (ritmo === 'fa' || ritmo === 'flutter');

        if (!E || (!isFA && !A) || !ePrime) {
            return {
                grade: "Indeterminado",
                description: "Esperando datos Doppler...",
                severity: "neutral"
            };
        }

        const EeRatio = E / ePrimeForRatio;
        // Only calculate E/A if not FA/Flutter and A is present
        const EARatio = (!isFA && A) ? E / A : null;

        // --- ATRIAL FIBRILLATION ALGORITHM (EACVI 2016) ---
        if (isFA) {
            if (LVEF >= 50) {
                // For preserved EF in FA
                // Simplified approach for this calculator based on E/e' and TR velocity
                if (EeRatio > 14 || TRVel > 2.8) {
                    return {
                        grade: "II", // Usually raised pressures in FA context with these markers
                        description: "FA: Presiones de llenado VI elevadas (E/e' > 14 o IT > 2.8).",
                        severity: "red"
                    };
                } else if (EeRatio < 11 && TRVel < 2.8) {
                    return {
                        grade: "Normal/I", // Normal pressures
                        description: "FA: Presiones de llenado VI normales.",
                        severity: "green"
                    };
                } else {
                    return {
                        grade: "Indeterminado",
                        description: "FA: Función Diastólica Indeterminada.",
                        severity: "yellow"
                    };
                }
            } else {
                // Reduced EF in FA usually implies dysfunction, check pressures
                if (EeRatio > 14 || TRVel > 2.8) {
                    return {
                        grade: "III", // Restrictive physiology likely
                        description: "FA + FEy Deprimida: Presiones de llenado elevadas.",
                        severity: "red"
                    };
                } else {
                    return {
                        grade: "I/II",
                        description: "FA + FEy Deprimida: Presiones de llenado no elevadas o indeterminadas.",
                        severity: "yellow"
                    };
                }
            }
        }

        // --- SINUS RHYTHM ALGORITHM (Standard) ---

        // Special case: Supernormal pattern (Athletic heart)
        // Using septal e' cutoff per ASE 2016: septal e' normal ≥ 8 cm/s
        if (EARatio > 2 && ePrime >= 8) {
            return {
                grade: "Normal",
                description: `Función Diastólica Normal (Patrón de llenado vigoroso/Atleta). Presiones de llenado VI normales.${warnings.length ? ' ⚠️ ' + warnings.join('; ') + '.' : ''}`,
                severity: "green"
            };
        }

        // Special case: Restrictive pattern (Grade III)
        if (EARatio > 2 && ePrime < 8) {
            return {
                grade: "III",
                description: `Disfunción Diastólica Grado III (Patrón Restrictivo). Presiones de llenado VI elevadas.${warnings.length ? ' ⚠️ ' + warnings.join('; ') + '.' : ''}`,
                severity: "red"
            };
        }

        // Determine if heart has structural/functional disease
        const diseased = (LVEF < 50 || wallMotion !== 'conservada' || LAVolIndex > 34 || TRVel > 2.8);

        // Algorithm for normal hearts (LVEF ≥50% and no wall motion abnormalities)
        if (!diseased) {
            let criteria = 0;

            if (ePrimeAbnormal) criteria++;
            if (!mac && !imSevera && EeRatio > 14) criteria++;
            if (LAVolIndex > 34) criteria++;
            if (TRVel > 2.8) criteria++;

            if (criteria < 2) {
                return {
                    grade: "Normal",
                    description: `Función Diastólica Normal. Presiones de llenado VI normales.${warnings.length ? ' ⚠️ ' + warnings.join('; ') + '.' : ''}`,
                    severity: "green"
                };
            } else if (criteria === 2) {
                return {
                    grade: "Indeterminado",
                    description: `Función Diastólica Indeterminada (2/4 criterios alterados). Se requiere evaluación adicional.${warnings.length ? ' ⚠️ ' + warnings.join('; ') + '.' : ''}`,
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
                description: `Disfunción Diastólica Grado I (Relajación Prolongada). Presiones de llenado VI normales.${warnings.length ? ' ⚠️ ' + warnings.join('; ') + '.' : ''}`,
                severity: "green"
            };
        }

        // Grade II vs Grade I (when E/A > 0.8 or E > 50)
        // 3 criteria per ASE 2016: E/e' > 14, TR > 2.8, LAVI > 34
        // MAC / IM Severa: E/e' excluded (unreliable)
        // Valsalva (+): E/A drops ≤0.8 → confirms pseudonormal → adds positive criterion
        let criteriaP = 0;
        let dataPoints = 0;

        const eeThreshold = mcp ? 15 : 14; // MCP uses slightly higher cutoff
        if (!mac && !imSevera && EeRatio !== null && !isNaN(EeRatio)) {
            dataPoints++;
            if (EeRatio > eeThreshold) criteriaP++;
        }

        if (TRVel !== null && TRVel > 0) {
            dataPoints++;
            if (TRVel > 2.8) criteriaP++;
        }

        if (LAVolIndex !== null && !isNaN(LAVolIndex)) {
            dataPoints++;
            if (LAVolIndex > 34) criteriaP++;
        }

        // Valsalva (+): E/A ≤ 0.8 during Valsalva unmasks pseudonormal → confirms Grade II
        if (valsalva) {
            dataPoints++;
            criteriaP++;
        }

        const warnSuffix = warnings.length ? ` ⚠️ ${warnings.join('; ')}.` : '';

        // Need at least 2 data points to classify
        if (dataPoints < 2) {
            return {
                grade: "Indeterminado",
                description: `Función Diastólica Indeterminada. Datos insuficientes para clasificar.${warnSuffix}`,
                severity: "yellow"
            };
        }

        // Majority of criteria positive → Grade II (elevated pressures)
        if (criteriaP > dataPoints / 2) {
            return {
                grade: "II",
                description: `Disfunción Diastólica Grado II (Pseudonormal). Presiones de llenado VI elevadas.${warnSuffix}`,
                severity: "red"
            };
        } else if (criteriaP === 0 || (criteriaP === 1 && dataPoints >= 3)) {
            return {
                grade: "I",
                description: `Disfunción Diastólica Grado I (Relajación Prolongada). Presiones de llenado VI normales.${warnSuffix}`,
                severity: "green"
            };
        } else {
            return {
                grade: "Indeterminado",
                description: `Función Diastólica Indeterminada. Evaluación adicional requerida.${warnSuffix}`,
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
     * Thresholds based on ASE/ERS 2015 TR velocity cut-points:
     *   VTR ≤ 2.8 m/s → PSAP ≤ 36 mmHg (Normal)
     *   VTR 2.9–3.4 m/s → PSAP 37–51 mmHg (Leve)
     *   VTR > 3.4 m/s → PSAP > 51 mmHg (Moderada-Severa)
     * @param {number} psap - PSAP in mmHg
     * @returns {string} Classification
     */
    classifyPulmonaryPressure(psap) {
        if (!psap || psap === 0) return "No estimable";
        if (psap < 36) return "Normal";
        if (psap <= 50) return "Leve";
        if (psap <= 70) return "Moderada";
        return "Severa";
    }
}

// Export for use in other modules or global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HemodynamicsCalculator;
} else {
    window.HemodynamicsCalculator = HemodynamicsCalculator;
}

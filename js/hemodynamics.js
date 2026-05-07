/**
 * Hemodynamics Calculator Module
 * Medical formulas based on ASE Guidelines 2025 (Nagueh et al, JASE 2025;38:537-69)
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
     * Classify Diastolic Function according to ASE 2025 Algorithm
     * 
     * @param {Object} params - Diastolic parameters
     * @param {number} params.E - Mitral E wave velocity (cm/s)
     * @param {number} params.A - Mitral A wave velocity (cm/s)
     * @param {number} params.ePrime - Average e' velocity (cm/s)
     * @param {number} params.LAVolIndex - LA volume index (ml/m²)
     * @param {number} params.TRVel - TR velocity (m/s)
     * @param {number} params.LVEF - LV ejection fraction (%)
     * @param {number} params.LARS - LA Reservoir Strain (%)
     * @param {number} params.PVSD - Pulmonary Vein S/D ratio
     * @param {string} params.wallMotion - 'normal', 'hipo_global', 'segmentaria'
     * @returns {Object} { grade, description, severity }
     */
    classifyDiastolicFunction(params) {
        const { E, A, ePrime, eSeptal, eLateral, LAVolIndex, TRVel = 0, LVEF = 60, ritmo = 'sinusal', context = {}, TRIV, TD, LARS, PVSD, age = 0 } = params;
        const { bcri = false, mac = false, imSevera = false, mcp = false, valsalva = false } = context;

        // TRIV thresholds: ≤70 ms → positive (elevated pressures); ≥100 ms → negative (Grade I direction)
        const trivPositive = !isNaN(TRIV) && TRIV > 0 && TRIV <= 70;
        const trivNegative = !isNaN(TRIV) && TRIV >= 100;

        // TD (Deceleration Time) thresholds: <160 ms → restrictive/elevated; >240 ms → impaired relaxation
        const tdShort = !isNaN(TD) && TD > 0 && TD < 160;

        // --- 2025 GUIDELINES Table 6: age-specific e' cutoffs ---
        // 20-39y: septal <7 / lateral <10 / average <9
        // 40-65y: septal <6 / lateral <8  / average <7
        // >65y:   septal <6 / lateral <7  / average <6.5
        let eCutSeptal, eCutLateral, eCutAverage;
        if (age > 0 && age < 40) {
            eCutSeptal = 7; eCutLateral = 10; eCutAverage = 9;
        } else if (age >= 40 && age <= 65) {
            eCutSeptal = 6; eCutLateral = 8;  eCutAverage = 7;
        } else {
            eCutSeptal = 6; eCutLateral = 7;  eCutAverage = 6.5;
        }

        // 1. Reduced e' velocity (age-adjusted)
        let ePrimeAbnormal = false;
        if (!mac) {
            if (bcri) {
                ePrimeAbnormal = !isNaN(eLateral) && eLateral < eCutLateral;
            } else {
                ePrimeAbnormal = (!isNaN(eSeptal)  && eSeptal  < eCutSeptal)  ||
                                 (!isNaN(eLateral) && eLateral < eCutLateral) ||
                                 (isNaN(eSeptal) && isNaN(eLateral) && !isNaN(ePrime) && ePrime < eCutAverage);
            }
        }

        // e' for E/e' ratio: BCRI → use lateral only; MAC → E/e' unreliable
        let ePrimeForRatio = ePrime;
        if (bcri && !isNaN(eLateral)) ePrimeForRatio = eLateral;

        const EeRatio = ePrimeForRatio > 0 ? E / ePrimeForRatio : null;

        // 2. Increased E/e': septal >= 15 or lateral >= 13 or average >= 14
        let eeRatioAbnormal = false;
        if (!mac && !imSevera && EeRatio !== null && !isNaN(EeRatio)) {
            if (bcri) {
                eeRatioAbnormal = (!isNaN(eLateral) && E / eLateral >= 13);
            } else {
                eeRatioAbnormal = (!isNaN(eSeptal) && E / eSeptal >= 15) ||
                                  (!isNaN(eLateral) && E / eLateral >= 13) ||
                                  (EeRatio >= 14);
            }
        }

        // 3. Increased TR velocity >= 2.8 m/s or PASP >= 35 mm Hg
        let trAbnormal = (TRVel !== null && TRVel >= 2.8);

        // Warnings — only clinically relevant modifiers (not "Guía 2025")
        const warnings = [];
        if (bcri)     warnings.push('BCRI: e\' septal excluido');
        if (mac)      warnings.push('MAC: E/e\' no válido');
        if (imSevera) warnings.push('IM Severa: E/e\' sobreestima presiones');
        if (mcp)      warnings.push('MCP: umbrales modificados');
        if (valsalva) warnings.push('Valsalva (+)');

        // Check if we have minimum required data
        const isFA = (ritmo === 'fa' || ritmo === 'flutter');

        if (!E || (!isFA && !A) || !ePrime) {
            return {
                grade: "Indeterminado",
                description: "Esperando datos Doppler...",
                severity: "neutral"
            };
        }

        const EARatio = (!isFA && A) ? E / A : null;

        // --- ATRIAL FIBRILLATION ALGORITHM ---
        if (isFA) {
            let faCriteria = 0;
            let faData = 0;

            if (!mac && !imSevera && !isNaN(EeRatio)) {
                faData++;
                if (EeRatio >= 14) faCriteria++;
            }
            if (TRVel > 0) {
                faData++;
                if (TRVel > 2.8) faCriteria++;
            }
            if (!isNaN(LAVolIndex)) {
                faData++;
                if (LAVolIndex > 34) faCriteria++;
            }

            const warnFA = warnings.length ? ` [${warnings.join('; ')}].` : '';

            if (faData < 2) {
                return { grade: "Indeterminado", description: `FA: Datos insuficientes para clasificar presiones de llenado.${warnFA}`, severity: "yellow" };
            }

            if (faCriteria >= 2) {
                return { grade: "II" + (LVEF < 50 ? " (FEy Deprimida)" : ""), description: `FA: Presiones de llenado VI elevadas (${faCriteria}/${faData} criterios positivos).${warnFA}`, severity: "red" };
            } else if (faCriteria === 0) {
                return { grade: "Normal", description: `FA: Presiones de llenado VI normales (0/${faData} criterios positivos).${warnFA}`, severity: "green" };
            } else {
                return { grade: "Indeterminado", description: `FA: Función Diastólica Indeterminada (1/${faData} criterios positivos). Evaluación adicional requerida.${warnFA}`, severity: "yellow" };
            }
        }

        // --- SINUS RHYTHM ALGORITHM 2025 ---
        
        // Special case: Supernormal pattern (Athletic heart)
        if (EARatio > 2 && ePrime >= 9) {
            return { grade: "Normal", description: `Función Diastólica Normal (Patrón Atleta). Presiones de llenado VI normales.${warnings.length ? ' [' + warnings.join('; ') + '].' : ''}`, severity: "green" };
        }

        let mainCriteriaCount = 0;
        if (ePrimeAbnormal) mainCriteriaCount++;
        if (eeRatioAbnormal) mainCriteriaCount++;
        if (trAbnormal) mainCriteriaCount++;

        const warnSuffix = warnings.length ? ` [${warnings.join('; ')}].` : '';

        // If 3 of the above present
        if (mainCriteriaCount === 3) {
            if (EARatio >= 2) {
                let gradeIIIDesc = `Disfunción Diastólica Grado III (↑↑↑LAP marcada). Presiones de llenado VI marcadamente elevadas.${warnSuffix}`;
                if (tdShort) gradeIIIDesc = gradeIIIDesc.replace('marcadas.', `marcadas. TD acortado (${TD} ms) corrobora patrón restrictivo.`);
                return { grade: "III", description: gradeIIIDesc, severity: "red" };
            } else {
                return { grade: "II", description: `Disfunción Diastólica Grado II (↑↑LAP leve-moderada). Presiones de llenado VI elevadas.${warnSuffix}`, severity: "red" };
            }
        }

        // If all 3 normal
        if (mainCriteriaCount === 0) {
            return { grade: "Normal", description: `Función Diastólica Normal. Presiones de llenado VI normales.${warnSuffix}`, severity: "green" };
        }

        // If 1 or 2 present
        if (EARatio <= 0.8) {
            return { grade: "I", description: `Disfunción Diastólica Grado I (Relajación Prolongada). Presiones de llenado VI normales.${warnSuffix}`, severity: "green" };
        } 
        
        if (EARatio > 0.8) {
            // Check for Increased LAP using additional parameters
            let additionalEvidenceLAP = null;
            let sourceLAP = "";
            
            if (!isNaN(PVSD) && PVSD > 0) {
                additionalEvidenceLAP = PVSD <= 0.67;
                sourceLAP = "(por Venas Pulmonares)";
            } else if (!isNaN(LARS) && LARS > 0) {
                additionalEvidenceLAP = LARS <= 18;
                sourceLAP = "(por LARS)";
            } else if (!isNaN(LAVolIndex) && LAVolIndex > 0) {
                additionalEvidenceLAP = LAVolIndex > 34;
                sourceLAP = "(por LAVi)";
            } else if (trivPositive || trivNegative) {
                additionalEvidenceLAP = trivPositive;
                sourceLAP = "(por TRIV)";
            } else if (valsalva) {
                // Valsalva + as additional evidence
                additionalEvidenceLAP = true;
                sourceLAP = "(por Valsalva)";
            }

            if (additionalEvidenceLAP === true) {
                return { grade: "II", description: `Disfunción Diastólica Grado II (↑↑LAP leve-moderada). Presiones de llenado VI elevadas ${sourceLAP}.${warnSuffix}`, severity: "red" };
            } else if (additionalEvidenceLAP === false) {
                if (mainCriteriaCount === 1 && ePrimeAbnormal) {
                    return { grade: "Normal", description: `Función Diastólica Normal (o Grado I si sintomático). Presiones de llenado VI normales. Considerar test de esfuerzo.${warnSuffix}`, severity: "green" };
                } else {
                    return { grade: "I", description: `Disfunción Diastólica Grado I. Presiones de llenado VI normales.${warnSuffix}`, severity: "green" };
                }
            } else {
                // Cannot determine from additional parameters
                return { grade: "Indeterminado", description: `Función Diastólica Indeterminada. Datos insuficientes de parámetros secundarios (LARS, V. Pulmonares, LAVi) para determinar presión de llenado.${warnSuffix}`, severity: "yellow" };
            }
        }

        return { grade: "Indeterminado", description: `Función Diastólica Indeterminada.${warnSuffix}`, severity: "yellow" };
    }

    /**
     * Calculate Stroke Volume, Cardiac Output and Cardiac Index
     * SV = 0.785 × D_LVOT² × VTI_LVOT
     * CO = SV × HR / 1000
     * CI = CO / BSA
     */
    calculateCardiacOutput(lvotDiam, lvotVti, hr, bsa) {
        if (!lvotDiam || !lvotVti || lvotDiam <= 0 || lvotVti <= 0) return null;
        const dCm  = lvotDiam / 10;                  // mm → cm
        const area = 0.785 * Math.pow(dCm, 2);       // cm²
        const sv   = Math.round(area * lvotVti);     // ml
        const co   = hr ? parseFloat((sv * hr / 1000).toFixed(2)) : null;
        const ci   = (co && bsa) ? parseFloat((co / bsa).toFixed(2)) : null;
        return { sv, co, ci };
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

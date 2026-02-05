/**
 * Mini Calculators Module
 * Provides hemodynamic calculation functions for advanced valve assessments
 */

class MiniCalculators {

    /**
     * Ecuación de Continuidad para calcular AVA (Aortic Valve Area)
     * @param {number} diamTSVI - Diámetro TSVI en mm
     * @param {number} vtiTSVI - VTI TSVI en cm
     * @param {number} vtiAo - VTI Aórtico en cm
     * @param {number} bsa - Superficie corporal en m²
     * @returns {object} - Results containing areaTSVI, ava, avaIndex
     */
    calculateContinuity(diamTSVI, vtiTSVI, vtiAo, bsa = 1) {
        if (!diamTSVI || !vtiTSVI || !vtiAo) return null;

        // Convert mm to cm and calculate radius
        const radio = diamTSVI / 20;

        //Area TSVI = π × r²
        const areaTSVI = Math.PI * Math.pow(radio, 2);

        // AVA = (Area_TSVI × VTI_TSVI) / VTI_Ao
        const ava = (areaTSVI * vtiTSVI) / vtiAo;

        // AVA indexada
        const avaIndex = bsa > 0 ? ava / bsa : 0;

        return {
            areaTSVI: areaTSVI.toFixed(2),
            ava: ava.toFixed(2),
            avaIndex: avaIndex.toFixed(2)
        };
    }

    /**
     * PISA (Proximal Isovelocity Surface Area) para cuantificación de IM
     * @param {number} radioPISA - Radio PISA en mm
     * @param {number} vAliasing - Velocidad de aliasing en cm/s
     * @param {number} vmaxIM - Velocidad máxima de IM en m/s
     * @param {number} vtiIM - VTI de IM en cm
     * @returns {object} - Results containing flow, ore (ORE), vr (VR)
     */
    calculatePISA(radioPISA, vAliasing, vmaxIM, vtiIM) {
        if (!radioPISA || !vAliasing || !vmaxIM || !vtiIM) return null;

        // Convert mm to cm
        const radioCm = radioPISA / 10;

        // Flujo = 2π × r² × v_aliasing
        const flow = 2 * Math.PI * Math.pow(radioCm, 2) * vAliasing;

        // ORE (Orificio Regurgitante Efectivo) = Flujo / (Vmax × 100)
        // Vmax en m/s, convertir a cm/s
        const ore = flow / (vmaxIM * 100);

        // VR (Volumen Regurgitante) = ORE × VTI
        const vr = ore * vtiIM;

        return {
            flow: flow.toFixed(1),
            ore: ore.toFixed(2),
            vr: vr.toFixed(0)
        };
    }

    /**
     * Calculate adimensional coefficient for aortic stenosis
     * @param {number} vtiTSVI - VTI TSVI
     * @param {number} vtiAo - VTI Ao
     * @returns {number} - Coefficient (VTI ratio)
     */
    calculateAdimensionalCoef(vtiTSVI, vtiAo) {
        if (!vtiTSVI || !vtiAo || vtiAo === 0) return null;
        return (vtiTSVI / vtiAo).toFixed(2);
    }

    /**
     * Z-Score para raíz aórtica (Nomograma simplificado)
     * @param {number} aoRoot - Diámetro raíz aórtica observado en mm
     * @param {number} bsa - Superficie corporal en m²
     * @returns {object} - Expected value, z-score, and interpretation
     */
    calculateAorticZScore(aoRoot, bsa) {
        if (!aoRoot || !bsa) return null;

        // Fórmula simplificada (Campens 2014)
        const expected = 15.2 * Math.sqrt(bsa) + 4.3;
        const sd = 2.5; // Standard deviation
        const zScore = (aoRoot - expected) / sd;

        let interpretation;
        if (zScore < 2) interpretation = "Normal";
        else if (zScore < 3) interpretation = "Levemente dilatada";
        else if (zScore < 4) interpretation = "Moderadamente dilatada";
        else interpretation = "Severamente dilatada";

        return {
            expected: expected.toFixed(1),
            zScore: zScore.toFixed(2),
            interpretation: interpretation
        };
    }
}

// Export to global scope
if (typeof window !== 'undefined') {
    window.MiniCalculators = MiniCalculators;
}

// Add Lanús method (v14.1)
/**
 * Método Lanús Monoplano para volumen de AI
 * Fórmula: Vol = (0.85 × Área²) / Longitud
 * @param {number} area4c - Área en vista 4 cámaras (cm²)
 * @param {number} longitudMm - Longitud eje mayor (mm)
 * @param {number} bsa - Superficie corporal (m²)
 * @returns {object} - {volumen, volumeIndexed, classification}
 */
MiniCalculators.prototype.calculateLanusAI = function (area4c, longitudMm, bsa) {
    if (!area4c || !longitudMm || !bsa) return null;

    // Convertir longitud de mm a cm
    const longitudCm = longitudMm / 10;

    // Fórmula Lanús Monoplano: Vol = (0.85 × Área²) / Longitud
    const volumen = (0.85 * Math.pow(area4c, 2)) / longitudCm;

    // Indexar por superficie corporal
    const volumeIndexed = volumen / bsa;

    // Clasificación automática según guías ASE/EACVI
    let classification;
    if (volumeIndexed < 34) {
        classification = "Normal";
    } else if (volumeIndexed <= 41) {
        classification = "Dilatación Leve";
    } else if (volumeIndexed <= 48) {
        classification = "Dilatación Moderada";
    } else {
        classification = "Dilatación Severa";
    }

    return {
        volumen: volumen.toFixed(1),
        volumeIndexed: volumeIndexed.toFixed(1),
        classification: classification
    };
};

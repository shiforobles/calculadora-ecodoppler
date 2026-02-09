/**
 * Motility Controller - Business Logic for Wall Motion Assessment
 * Handles state management, WMSI calculation, and report generation
 */

class MotilityController {
    constructor() {
        this.state = this.loadFromStorage() || this.getDefaultState();
        this.pattern = localStorage.getItem('motility-pattern') || 'none';
        this.listeners = [];
    }

    // Initialize with all segments normal
    getDefaultState() {
        const state = {};
        for (let i = 1; i <= 17; i++) {
            state[i] = 1; // All normal
        }
        return state;
    }

    // Get current state for a segment
    getSegmentState(segmentId) {
        return this.state[segmentId] || 1;
    }

    // Toggle segment state (1 → 2 → 3 → 4 → 1)
    toggleSegment(segmentId) {
        const current = this.state[segmentId];
        this.state[segmentId] = (current % 4) + 1;
        this.saveToStorage();
        this.notifyListeners(segmentId);
        this.updateUI();
        this.updatePreview();
    }

    // Set specific state for a segment
    setSegmentState(segmentId, state) {
        if (state >= 1 && state <= 4) {
            this.state[segmentId] = state;
            this.saveToStorage();
            this.notifyListeners(segmentId);
            this.updateUI();
        }
    }

    // Calculate Wall Motion Score Index
    calculateWMSI() {
        const sum = Object.values(this.state).reduce((a, b) => a + b, 0);
        return (sum / 17).toFixed(2);
    }

    // Get abnormal segments grouped by state
    getAbnormalSegments() {
        const abnormal = {
            hypokinetic: [],
            akinetic: [],
            dyskinetic: []
        };

        Object.entries(this.state).forEach(([id, state]) => {
            const segId = parseInt(id);
            if (state === 2) abnormal.hypokinetic.push(segId);
            if (state === 3) abnormal.akinetic.push(segId);
            if (state === 4) abnormal.dyskinetic.push(segId);
        });

        return abnormal;
    }

    // Determine affected coronary territory
    getAffectedTerritory() {
        const abnormalIds = Object.entries(this.state)
            .filter(([_, state]) => state > 1)
            .map(([id]) => parseInt(id));

        if (abnormalIds.length === 0) return null;

        // Count affected segments per territory
        const scores = {
            DA: 0,
            CD: 0,
            Cx: 0
        };

        abnormalIds.forEach(id => {
            const artery = MotilityModel.SEGMENTS[id].artery;
            if (artery === 'DA') scores.DA++;
            else if (artery === 'CD') scores.CD++;
            else if (artery === 'Cx') scores.Cx++;
        });

        // Return territory with most affected segments
        return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    }

    // Validate coherence between WMSI and EF
    validateCoherence(fey) {
        const wmsi = parseFloat(this.calculateWMSI());

        if (wmsi > 1.5 && fey > 55) {
            return {
                valid: false,
                message: "⚠️ WMSI elevado (>1.5) con FEy conservada (>55%). Revisar coherencia entre motilidad regional y función global."
            };
        }

        if (wmsi === 1.0 && fey < 50) {
            return {
                valid: false,
                message: "⚠️ WMSI normal pero FEy deprimida (<50%). Considerar disfunción global sin alteraciones regionales."
            };
        }

        return { valid: true };
    }

    // Estimate LVEF based on WMSI (clinical pocket rule)
    estimateLVEF() {
        const wmsi = parseFloat(this.calculateWMSI());

        // Clinical correlation (not a formula, just a reference)
        if (wmsi === 1.0) {
            return { min: 55, max: 65, text: "55-65%", category: "normal" };
        } else if (wmsi <= 1.2) {
            return { min: 45, max: 55, text: "45-55%", category: "levemente reducida" };
        } else if (wmsi <= 1.5) {
            return { min: 35, max: 45, text: "35-45%", category: "moderadamente reducida" };
        } else if (wmsi <= 2.0) {
            return { min: 25, max: 30, text: "25-30%", category: "severamente reducida" };
        } else {
            return { min: 0, max: 25, text: "<25%", category: "muy deprimida" };
        }
    }

    // Helper: Extract wall name from segment name (e.g., "Basal Anterior" -> "Anterior")
    getWallName(segmentId) {
        const name = MotilityModel.SEGMENTS[segmentId].name;
        // Remove "Basal", "Medio", "Apical", "Apex" to get wall name
        return name.replace(/^(Basal|Medio|Apical)\s+/, '').replace('Apex', 'Apical');
    }

    // Helper: Extract level from segment name (e.g., "Basal Anterior" -> "basal")
    getLevel(segmentId) {
        const name = MotilityModel.SEGMENTS[segmentId].name;
        if (name.startsWith('Basal')) return 'basal';
        if (name.startsWith('Medio')) return 'media';
        if (name.startsWith('Apical') || name === 'Apex') return 'apical';
        return 'apical'; // Apex
    }

    // Format wall description for Spanish
    formatWallName(wall) {
        const lowerWall = wall.toLowerCase();
        // Handle composite names
        if (lowerWall.includes('anteroseptal')) return 'anteroseptal';
        if (lowerWall.includes('inferoseptal')) return 'inferoseptal';
        if (lowerWall.includes('inferolateral')) return 'inferolateral';
        if (lowerWall.includes('anterolateral')) return 'anterolateral';
        return lowerWall;
    }

    // Generate motility report section (grouped by WALLS for clinical clarity)
    generateMotilityReport() {
        const abnormal = this.getAbnormalSegments();
        const totalAbnormal = abnormal.hypokinetic.length + abnormal.akinetic.length + abnormal.dyskinetic.length;
        const wmsi = this.calculateWMSI();

        if (totalAbnormal === 0) {
            return ""; // No output if normal
        }

        // Check if this is a diffuse pattern (for global description)
        const currentPattern = this.pattern !== 'none' ? MotilityModel.PATTERNS[this.pattern] : null;
        const isDiffuse = currentPattern && currentPattern.isDiffuse;

        // For diffuse patterns, use global description
        if (isDiffuse && totalAbnormal >= 12) {
            const parts = [];

            if (abnormal.akinetic.length > 0) {
                parts.push("aquinesia");
            }
            if (abnormal.hypokinetic.length > 0) {
                parts.push("hipoquinesia");
            }
            if (abnormal.dyskinetic.length > 0) {
                parts.push("disquinesia");
            }

            const severityText = parts.length === 1 ? parts[0] : parts.join(" y ");

            // Different wording based on pattern
            if (currentPattern.name.includes("Dilatada")) {
                return `Se observan trastornos segmentarios de la motilidad parietal: ${severityText} global difusa que no respeta un territorio coronario específico (WMSI: ${wmsi}).\n`;
            } else if (currentPattern.name.includes("Hipertensiva")) {
                return `Se observan trastornos segmentarios de la motilidad parietal: ${severityText} con predominio basal y medio ventricular (WMSI: ${wmsi}).\n`;
            } else {
                return `Se observan trastornos segmentarios de la motilidad parietal: ${severityText} difusa (WMSI: ${wmsi}).\n`;
            }
        }

        // Electrical/Dyssynchrony patterns: Use specific description, NOT segment list
        if (currentPattern && currentPattern.category === 'dyssynchrony') {
            let description = "";
            switch (this.pattern) {
                case 'bcri':
                    description = "Se observa alteración del patrón de contracción ventricular compatible con disincronía mecánica, caracterizada por movimiento septal anómalo (septal flash), en el contexto de bloqueo completo de rama izquierda";
                    break;
                case 'bcrd':
                    description = "Motilidad parietal del ventrículo izquierdo conservada. Se observa asincronía leve del septum, en relación a bloqueo completo de rama derecha";
                    break;
                case 'pacemaker':
                    description = "Se observa patrón de contracción disincrónico del ventrículo izquierdo, con movimiento septal paradójico, en relación a estimulación ventricular por marcapasos";
                    break;
                case 'post_surgery':
                    description = "Se observa movimiento septal anómalo, probablemente relacionado a antecedente de cirugía cardíaca";
                    break;
                default:
                    description = currentPattern.description;
            }
            return `${description} (WMSI: ${wmsi}).\n`;
        }

        // For combined/special patterns, use standard wall grouping but keep specific conclusion
        // REVERTED specific description per user request.
        // Falls through to standard grouping logic below.

        // For focal/territorial patterns, group by walls
        const groupedBySeverity = {
            aquinesia: {},
            hipoquinesia: {},
            disquinesia: {}
        };

        // Classify segments by severity and wall
        abnormal.akinetic.forEach(id => {
            const wall = this.getWallName(id);
            const level = this.getLevel(id);
            if (!groupedBySeverity.aquinesia[wall]) groupedBySeverity.aquinesia[wall] = [];
            groupedBySeverity.aquinesia[wall].push(level);
        });

        abnormal.hypokinetic.forEach(id => {
            const wall = this.getWallName(id);
            const level = this.getLevel(id);
            if (!groupedBySeverity.hipoquinesia[wall]) groupedBySeverity.hipoquinesia[wall] = [];
            groupedBySeverity.hipoquinesia[wall].push(level);
        });

        abnormal.dyskinetic.forEach(id => {
            const wall = this.getWallName(id);
            const level = this.getLevel(id);
            if (!groupedBySeverity.disquinesia[wall]) groupedBySeverity.disquinesia[wall] = [];
            groupedBySeverity.disquinesia[wall].push(level);
        });

        // Build description by severity
        const parts = [];

        ['aquinesia', 'hipoquinesia', 'disquinesia'].forEach(severity => {
            const walls = groupedBySeverity[severity];
            if (Object.keys(walls).length === 0) return;

            const wallDescriptions = [];
            Object.entries(walls).forEach(([wall, levels]) => {
                // Sort levels: basal, media, apical
                const sortedLevels = levels.sort((a, b) => {
                    const order = { basal: 0, media: 1, apical: 2 };
                    return order[a] - order[b];
                });

                // Remove duplicates
                const uniqueLevels = [...new Set(sortedLevels)];

                // Format levels text
                let levelsText = '';
                if (uniqueLevels.length === 3) {
                    levelsText = 'basal, media y apical';
                } else if (uniqueLevels.length === 2) {
                    levelsText = uniqueLevels.join(' y ');
                } else {
                    levelsText = uniqueLevels[0];
                }

                const wallName = this.formatWallName(wall);

                // Special handling for Apex to avoid "pared apical (apical)"
                if (wallName.toLowerCase() === 'apical' && levelsText === 'apical') {
                    wallDescriptions.push(`nivel apical`);
                } else {
                    wallDescriptions.push(`pared ${wallName} (${levelsText})`);
                }
            });

            // Join with commas and "y" for the last element
            let wallDescText = "";
            if (wallDescriptions.length === 1) {
                wallDescText = wallDescriptions[0];
            } else if (wallDescriptions.length === 2) {
                wallDescText = wallDescriptions.join(' y ');
            } else {
                const last = wallDescriptions.pop();
                wallDescText = wallDescriptions.join(', ') + ' y ' + last;
            }

            parts.push(`${severity} de ${wallDescText}`);
        });

        return `Se observan trastornos segmentarios de la motilidad parietal, con ${parts.join('; ')} (WMSI: ${this.calculateWMSI()}).\n`;
    }

    // Generate conclusion (smart format based on territories)
    generateConclusion() {
        const abnormal = this.getAbnormalSegments();
        const totalAbnormal = abnormal.hypokinetic.length + abnormal.akinetic.length + abnormal.dyskinetic.length;

        // If no alterations, don't add to conclusions
        if (totalAbnormal === 0) {
            return "";
        }

        // Check for specific combined/special pattern conclusion
        if (this.pattern !== 'none') {
            // DIRECT FIX: Prioritize special patterns to avoid category lookup failures
            if (this.pattern === 'dilated_cm') return "Patrón de hipoquinesia global, sugestivo de miocardiopatía dilatada.";
            if (this.pattern === 'post_surgery') return "Movimiento septal anómalo en relación a antecedentes quirúrgicos.";
            if (this.pattern === 'bcri') return "Patrón de contracción disincrónico con movimiento septal paradójico, en relación a BCRI.";
            if (this.pattern === 'pacemaker') return "Disincronía mecánica secundaria a estimulación ventricular por marcapasos.";
            if (this.pattern === 'bcrd') return "Asincronía septal leve en relación a BCRD.";

            const currentPattern = MotilityModel.PATTERNS[this.pattern];
            if (currentPattern && currentPattern.category === 'combined') {
                switch (this.pattern) {
                    case 'da_cx':
                        return "Patrón sugestivo de afectación combinada DA–Cx.";
                    case 'da_cd_wrap':
                        return "Patrón compatible con DA envolvente.";
                    case 'cx_cd':
                        return "Patrón sugestivo de afectación combinada Cx–CD.";
                    case 'multivessel':
                        return "Patrón sugestivo de enfermedad coronaria multivaso.";
                    case 'left_main':
                        return "Patrón sugestivo de afectación del Tronco de CI.";
                    case 'da_distal':
                        return "Patrón sugestivo de lesión de DA distal.";
                }
            } else if (currentPattern && currentPattern.category === 'dyssynchrony') {
                switch (this.pattern) {
                    case 'bcri':
                        return "Patrón de contracción disincrónico con movimiento septal paradójico, en relación a BCRI.";
                    case 'bcrd':
                        return "Asincronía septal leve en relación a BCRD.";
                    case 'pacemaker':
                        return "Disincronía mecánica secundaria a estimulación ventricular por marcapasos.";
                }
            } else if (currentPattern && currentPattern.category === 'cardiomyopathy') {
                switch (this.pattern) {
                    case 'dilated_cm':
                        return "Patrón de hipoquinesia global, sugestivo de miocardiopatía dilatada.";
                    case 'hypertensive_cm':
                        return "Patrón sugestivo de cardiopatía hipertensiva.";
                    case 'chagas':
                        return "Patrón sugestivo de miocardiopatía chagásica.";
                }
            } else if (currentPattern && currentPattern.category === 'takotsubo') {
                return "Patrón sugestivo de Miocardiopatía por Estrés (Takotsubo).";
            }
        }

        // Group by territory
        const byTerritory = {
            DA: { hipo: 0, aki: 0, dis: 0 },
            CD: { hipo: 0, aki: 0, dis: 0 },
            Cx: { hipo: 0, aki: 0, dis: 0 }
        };

        abnormal.hypokinetic.forEach(id => byTerritory[MotilityModel.SEGMENTS[id].artery].hipo++);
        abnormal.akinetic.forEach(id => byTerritory[MotilityModel.SEGMENTS[id].artery].aki++);
        abnormal.dyskinetic.forEach(id => byTerritory[MotilityModel.SEGMENTS[id].artery].dis++);

        // Count affected territories
        const affectedTerritories = Object.keys(byTerritory).filter(t =>
            byTerritory[t].hipo + byTerritory[t].aki + byTerritory[t].dis > 0
        );

        const wmsi = this.calculateWMSI();

        // SINGLE TERRITORY: Show only predominant severity
        if (affectedTerritories.length === 1) {
            const territory = affectedTerritories[0];
            const counts = byTerritory[territory];

            return `Trastornos de la motilidad Segmentaria en Territorio ${territory}.`;
        }

        // MULTIPLE TERRITORIES: Show each severity with its territory
        const parts = [];
        affectedTerritories.forEach(territory => {
            const counts = byTerritory[territory];
            const severities = [];

            if (counts.aki > 0) severities.push("Aquinesia");
            if (counts.hipo > 0) severities.push("Hipoquinesia");
            if (counts.dis > 0) severities.push("Discinesia");

            const severityText = severities.length === 1 ? severities[0] : severities.join(" e ");
            parts.push(`${severityText} en territorio de ${territory}`);
        });

        return parts.join(", ") + ".";
    }

    // Set special pattern
    setPattern(patternName) {
        this.pattern = patternName;
        localStorage.setItem('motility-pattern', patternName);

        // Apply pattern if not 'none'
        if (patternName !== 'none' && MotilityModel.PATTERNS[patternName]) {
            const pattern = MotilityModel.PATTERNS[patternName];
            if (pattern.affectedSegments.length > 0) {
                // Reset all to normal first
                for (let i = 1; i <= 17; i++) {
                    this.state[i] = 1;
                }
                // Set affected segments to pattern-specific severity
                const severity = pattern.severity || 3; // Default to akinetic if not specified
                pattern.affectedSegments.forEach(id => {
                    this.state[id] = severity;
                });
                this.saveToStorage();
                this.notifyListeners('all');
                this.updateUI();
                this.updatePreview();
            }
        }
    }

    // Reset all segments to normal
    reset() {
        this.state = this.getDefaultState();
        this.pattern = 'none';
        this.saveToStorage();
        localStorage.setItem('motility-pattern', 'none');
        this.notifyListeners('all');
        this.updateUI();
        this.updatePreview();
    }

    // Persistence
    saveToStorage() {
        localStorage.setItem('motility-state', JSON.stringify(this.state));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('motility-state');
        return saved ? JSON.parse(saved) : null;
    }

    // Observer pattern
    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(segmentId) {
        this.listeners.forEach(callback => callback(segmentId, this.state));
    }

    // Get suggested ECG leads based on pattern/territory
    getECGCorrelation() {
        // 1. Takotsubo
        if (this.pattern === 'takotsubo') {
            return "T negativas profundas en precordiales (V1-V6), QT prolongado.";
        }

        // 2. Dyssynchrony (LBBB/RBBB)
        if (this.pattern === 'bcri') return "QRS ancho (>120ms), patrón de BCRI (V1-V2 QS, V6 R empastada).";
        if (this.pattern === 'bcrd') return "QRS ancho (>120ms), patrón de BCRD (V1-V2 rSR').";
        if (this.pattern === 'pacemaker') return "Espiga de marcapasos, QRS ancho con imagen de BCRI.";

        // 3. Coronary Territories
        const territory = this.getAffectedTerritory();
        if (!territory) return null;

        if (territory === 'DA') {
            // Refine based on segments
            const abnormal = this.getAbnormalSegments();
            const allAbnormal = [...abnormal.hypokinetic, ...abnormal.akinetic, ...abnormal.dyskinetic];

            // Check for apical involvement
            const hasApical = allAbnormal.some(id => this.getLevel(id) === 'apical');
            const hasSeptal = allAbnormal.some(id => [2, 3, 8, 9].includes(id));

            if (hasSeptal && !hasApical) return "V1-V2 (Septal).";
            if (hasApical) return "V1-V4, posiblemente V5-V6 (Anterior extenso/Apical).";
            return "V1-V4 (Anterior).";
        }

        if (territory === 'CD') {
            // Right Coronary
            // Check for RV involvement (User didn't specify RV segments in standard 17-seg model, but standard CD is Inferior)
            // CD: DII, DIII, aVF
            return "DII, DIII, aVF (Inferior). Considerar V3R-V4R si hay compromiso de VD.";
        }

        if (territory === 'Cx') {
            // Circumflex
            return "DI, aVL, V5-V6 (Lateral).";
        }

        return null; // Mixed or defined
    }

    // Update preview panel with current alterations
    updatePreview() {
        const previewText = document.getElementById('preview-text');
        if (!previewText) return;

        const abnormal = this.getAbnormalSegments();
        const totalAbnormal = abnormal.hypokinetic.length + abnormal.akinetic.length + abnormal.dyskinetic.length;

        if (totalAbnormal === 0) {
            previewText.innerHTML = 'No hay alteraciones registradas.';
            return;
        }

        const wmsi = this.calculateWMSI();
        const parts = [];

        // Add WMSI at the top
        parts.push(`<strong>WMSI:</strong> <span style="font-size: 1.1em; color: ${wmsi > 2.0 ? '#ef4444' : wmsi > 1.5 ? '#f59e0b' : '#10b981'};">${wmsi}</span>`);

        // Add estimated LVEF based on WMSI (clinical correlation)
        const lvefEstimate = this.estimateLVEF();
        const lvefColor = lvefEstimate.category === 'normal' ? '#10b981' :
            lvefEstimate.category === 'levemente reducida' ? '#f59e0b' : '#ef4444';
        parts.push(`<strong>FEVI estimada:</strong> <span style="font-size: 1.0em; color: ${lvefColor};">${lvefEstimate.text}</span> <span style="font-size: 0.85em; color: #6b7280;">(referencia)</span>`);


        // Check for dyssynchrony pattern -> use specific description
        let isDyssynchrony = false;
        if (this.pattern !== 'none') {
            const currentPattern = MotilityModel.PATTERNS[this.pattern];
            if (currentPattern && currentPattern.category === 'dyssynchrony') {
                isDyssynchrony = true;
                // Get description from generateMotilityReport but strip "(WMSI: ...)" to avoid duplication
                let description = this.generateMotilityReport();
                // Remove the WMSI part: " (WMSI: 1.xx)."
                description = description.replace(/\s*\(WMSI:.*?\)\.?\s*$/, '');
                // Remove prefixes to make it cleaner in preview
                description = description.replace(/^Se observa(n)? /, '').replace(/^Motility /, 'Motilidad ');
                // Capitalize first letter
                description = description.charAt(0).toUpperCase() + description.slice(1);

                parts.push(`<strong>Patrón:</strong> ${description}`);
            }
        }

        // Standard segment listing (skipped for dyssynchrony)
        if (!isDyssynchrony) {
            if (abnormal.akinetic.length > 0) {
                const segNames = abnormal.akinetic.map(id => MotilityModel.SEGMENTS[id].name).join(', ');
                parts.push(`<strong>Aquinesia de:</strong> ${segNames}`);
            }

            if (abnormal.hypokinetic.length > 0) {
                const segNames = abnormal.hypokinetic.map(id => MotilityModel.SEGMENTS[id].name).join(', ');
                parts.push(`<strong>Hipoquinesia de:</strong> ${segNames}`);
            }

            if (abnormal.dyskinetic.length > 0) {
                const segNames = abnormal.dyskinetic.map(id => MotilityModel.SEGMENTS[id].name).join(', ');
                parts.push(`<strong>Disquinesia de:</strong> ${segNames}`);
            }
        }

        // Territory and ECG Correlation
        const territory = this.getAffectedTerritory();
        const ecgText = this.getECGCorrelation();

        let extraInfo = '';
        if (territory) {
            extraInfo += `<br><span class="territory-badge">${MotilityModel.getArteryName(territory, false)}</span>`;
        }

        if (ecgText) {
            extraInfo += `<br><div style="margin-top: 6px; padding: 4px 8px; background-color: #fce7f3; border-radius: 4px; border-left: 3px solid #db2777; font-size: 0.9em; color: #831843;">
                <strong>📉 ECG Sugerido:</strong> ${ecgText}
            </div>`;
        }

        previewText.innerHTML = parts.join('<br>') + extraInfo;
    }

    // Update UI elements
    updateUI() {
        // Update WMSI display
        const wmsiElement = document.getElementById('wmsi-value');
        if (wmsiElement) {
            const wmsi = this.calculateWMSI();
            wmsiElement.textContent = wmsi;

            // Color code based on severity
            let color = '#10b981'; // Green
            if (wmsi > 2.0) color = '#ef4444'; // Red
            else if (wmsi > 1.5) color = '#f59e0b'; // Orange
            else if (wmsi > 1.0) color = '#fbbf24'; // Yellow

            wmsiElement.style.color = color;
        }

        // Update validation warnings
        const feyInput = document.getElementById('fey_simpson');
        if (feyInput) {
            const fey = parseFloat(feyInput.value) || 0;
            const validation = this.validateCoherence(fey);

            const warningDiv = document.getElementById('motility-warning');
            if (warningDiv) {
                if (!validation.valid) {
                    warningDiv.textContent = validation.message;
                    warningDiv.style.display = 'block';
                } else {
                    warningDiv.style.display = 'none';
                }
            }
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotilityController;
}

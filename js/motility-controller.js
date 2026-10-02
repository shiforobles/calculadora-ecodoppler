/**
 * Motility Controller - Business Logic for Wall Motion Assessment
 * Handles state management, WMSI calculation, and report generation
 */

class MotilityController {
    /**
     * Etapas de un eco estrés. Por ahora sólo se usa 'reposo': la estructura queda
     * armada para que agregar las otras sea conectar un selector, sin tocar nada de
     * lo que hoy lee el estado.
     */
    static FASES = ['reposo', 'dosis_baja', 'pico', 'recuperacion'];

    static FASES_LABEL = {
        reposo: 'Reposo',
        dosis_baja: 'Dosis baja',
        pico: 'Pico',
        recuperacion: 'Recuperación',
    };

    constructor() {
        // Un mapa de segmentos POR FASE. `this.state` es la fase activa (ver el
        // getter de abajo), así que todo el código que ya existía sigue leyendo y
        // escribiendo lo mismo que antes.
        this.faseActiva = 'reposo';
        this.phases = { reposo: this.getDefaultState() };

        this.pattern = 'none';
        // Grado que se aplica al tocar un segmento. null = ciclado clásico.
        this.gradoActivo = null;
        this.listeners = [];

        // Clean up any lingering storage from previous versions to ensure it resets for new studies
        sessionStorage.removeItem('motility-state');
        sessionStorage.removeItem('motility-pattern');
    }

    /** Mapa de segmentos de la fase activa */
    get state() { return this.phases[this.faseActiva]; }
    set state(mapa) { this.phases[this.faseActiva] = mapa; }

    /**
     * Cambia de etapa. Una etapa nueva arranca en normal y NO hereda lo de reposo:
     * heredar haría que un defecto fijo se informe en el pico sin haberlo mirado.
     * Si al conectar el eco estrés se decide lo contrario, se cambia acá.
     */
    setFase(nombre) {
        if (!MotilityController.FASES.includes(nombre)) return this.faseActiva;
        if (!this.phases[nombre]) this.phases[nombre] = this.getDefaultState();
        this.faseActiva = nombre;
        this.notifyListeners('all');
        this.updateUI();
        this.updatePreview();
        return this.faseActiva;
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

    /**
     * Fija el grado que se aplica al tocar un segmento, o lo suelta si ya estaba.
     * @returns {number|null} el grado que quedó activo
     */
    setGradoActivo(grado) {
        const g = parseInt(grado);
        this.gradoActivo = (this.gradoActivo === g || !MotilityModel.STATES[g]) ? null : g;
        return this.gradoActivo;
    }

    /**
     * Toque sobre un segmento.
     *
     * Con un grado activo el toque lo aplica directo, y volver a tocar un segmento
     * que ya tiene ese grado lo devuelve a normal: así se corrige un error con el
     * mismo gesto, sin pasar por los otros dos grados.
     *
     * Sin grado activo se conserva el ciclado de siempre (1 → 2 → 3 → 4 → 1), que
     * es lo que tiene en la mano quien ya viene usando la app.
     */
    toggleSegment(segmentId) {
        const current = this.state[segmentId];
        this.state[segmentId] = this.gradoActivo
            ? (current === this.gradoActivo ? 1 : this.gradoActivo)
            : (current % 4) + 1;
        this.saveToStorage();
        this.notifyListeners(segmentId);
        this.updateUI();
        this.updatePreview();
    }

    /**
     * Marca un grupo anatómico completo (una pared, un anillo, un territorio).
     *
     * Suma sobre lo que ya está marcado en lugar de reemplazarlo, así se combinan
     * varios grupos. Si el grupo entero ya tiene el grado que se iba a aplicar, el
     * toque lo apaga: el mismo botón sirve para poner y para sacar.
     *
     * Sin grado activo aplica hipoquinesia, que es el grado con el que uno empieza
     * a describir y del que después baja o sube.
     *
     * @param {string|number[]} grupo clave "familia.nombre" o lista de segmentos
     */
    aplicarGrupo(grupo) {
        const ids = Array.isArray(grupo) ? grupo : MotilityModel.getGroupSegments(grupo);
        if (!ids || !ids.length) return;

        const grado = this.gradoActivo || 2;
        const yaEsta = ids.every(id => this.state[id] === grado);
        const destino = yaEsta ? 1 : grado;

        ids.forEach(id => { this.state[id] = destino; });
        this.saveToStorage();
        this.notifyListeners('all');
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
    //
    // Delega en WMSIEngine: segmentos 1-16 (el 17 nunca entra) y denominador de
    // segmentos evaluables. El cálculo anterior dividía por 17 fijo e incluía el
    // ápex, lo que diluía cualquier alteración (1.94 informado donde el real es 2.00).
    calculateWMSI() {
        if (typeof WMSIEngine !== 'undefined') {
            const r = WMSIEngine.calculate(this.state);
            return r.wmsi === null ? '—' : r.text;
        }
        // Fallback defensivo si el motor no llegó a cargar
        const segs = MotilityModel.ANALYZED_SEGMENTS;
        const sum = segs.reduce((acc, id) => acc + (this.state[id] || 1), 0);
        return (sum / segs.length).toFixed(2);
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
    /**
     * Interpretación cualitativa del WMSI.
     *
     * Reemplaza a la "FEVI estimada" que devolvía rangos como "45-55%". El WMSI mide
     * extensión de alteración regional, no volumen eyectado: mostrar un porcentaje al
     * lado de la FEy de Simpson sugiere una equivalencia que no existe y se presta a
     * informar un valor que nunca se midió.
     */
    interpretWMSI() {
        const wmsi = parseFloat(this.calculateWMSI());
        if (typeof WMSIEngine !== 'undefined') {
            return WMSIEngine.interpret(isNaN(wmsi) ? null : wmsi);
        }
        return { label: '', severity: 'none' };
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

    // Generate motility report section - NEW VERSION (Grouped by Complete/Partial Walls)
    _legacyGenerateMotilityReport() {
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
            if (currentPattern && currentPattern.name.includes("Dilatada")) {
                return `Se observan trastornos segmentarios de la motilidad parietal: ${severityText} global difusa que no respeta un territorio coronario específico (WMSI: ${wmsi}).\n`;
            } else if (currentPattern && currentPattern.name.includes("Hipertensiva")) {
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

        // For focal/territorial patterns, use smart wall grouping
        // Step 1: Group all affected segments by wall (regardless of severity initially)
        const wallData = {};

        [...abnormal.hypokinetic, ...abnormal.akinetic, ...abnormal.dyskinetic].forEach(id => {
            const wall = this.getWallName(id);
            const level = this.getLevel(id);
            const severity = abnormal.akinetic.includes(id) ? 'aquinesia' :
                abnormal.dyskinetic.includes(id) ? 'disquinesia' : 'hipoquinesia';

            if (!wallData[wall]) {
                wallData[wall] = { levels: new Set(), severity: severity };
            }
            wallData[wall].levels.add(level);
        });

        // Step 2: Identify complete walls (all 3 levels) vs partial walls
        const completeWalls = [];
        const partialWalls = [];

        Object.entries(wallData).forEach(([wall, data]) => {
            const levelArray = Array.from(data.levels);
            if (levelArray.length === 3) {
                completeWalls.push({ wall, severity: data.severity, levels: levelArray });
            } else {
                partialWalls.push({ wall, severity: data.severity, levels: levelArray });
            }
        });

        // Step 3: Build clinical description
        let description = "Se observan trastornos segmentarios de la motilidad parietal, con ";

        if (completeWalls.length > 0) {
            // Start with first complete wall
            const mainWall = completeWalls[0];
            const wallName = this.formatWallName(mainWall.wall);
            description += `${mainWall.severity} de la pared ${wallName} (basal, media y apical)`;

            // Add other complete walls
            for (let i = 1; i < completeWalls.length; i++) {
                const w = completeWalls[i];
                const wName = this.formatWallName(w.wall);
                description += ` y de la pared ${wName} (basal, media y apical)`;
            }

            // Add partial walls as extensions
            if (partialWalls.length > 0) {
                description += ", con extensión ";
                const extensions = partialWalls.map(w => {
                    const wName = this.formatWallName(w.wall);
                    const levels = this.formatLevels(Array.from(w.levels));

                    // Special handling: "septum" for septal walls
                    if (wName.includes('septal')) {
                        // Keep as "pared anteroseptal" etc.
                        return `a la pared ${wName} (${levels})`;
                    } else if (wName === 'apical') {
                        // "al ápex" instead of "a la pared apical"
                        return `al ápex`;
                    } else {
                        return `a la pared ${wName} (${levels})`;
                    }
                }).join(' y ');
                description += extensions;
            }
        } else {
            // Only partial walls - list them all
            const parts = partialWalls.map((w, idx) => {
                const wName = this.formatWallName(w.wall);
                const levels = this.formatLevels(Array.from(w.levels));

                if (idx === 0) {
                    return `${w.severity} de la pared ${wName} (${levels})`;
                } else {
                    return `de la pared ${wName} (${levels})`;
                }
            });
            description += parts.join(' y ');
        }

        return description + ` (WMSI: ${wmsi}).\n`;
    }

    // Helper function to format level arrays
    formatLevels(levels) {
        // Sort levels: basal, media, apical
        const order = { basal: 0, media: 1, apical: 2 };
        levels.sort((a, b) => order[a] - order[b]);

        if (levels.length === 3) {
            return 'basal, media y apical';
        } else if (levels.length === 2) {
            return levels.join(' y ');
        } else {
            return levels[0];
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SALIDA DE TEXTO — delega en los motores
    //
    // Los tres generadores de abajo (generateMotilityReport, generateSegmentListText
    // y generateConclusion) pasaron a ser formateadores: la redacción la produce el
    // Motor A y la interpretación de territorio el Motor C.
    //
    // Las implementaciones viejas quedan más abajo como _legacy*, sin uso, por si hay
    // que volver atrás. Arrastraban dos defectos que este cambio resuelve: perdían la
    // severidad (una aquinesia terminaba informada como hipoquinesia cuando compartía
    // pared con un segmento hipoquinético) e incluían el segmento 17 como "apex" en
    // las enumeraciones.
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Punto único de acceso a los motores para el informe.
     * @returns {{alterada: boolean, descripcion: string, descripcionMinuscula: string,
     *            territorio: string, wmsi: string}}
     */
    getMotilityTexts() {
        const hayMotores = typeof MotilityEngine !== 'undefined';
        const alterada = MotilityModel.ANALYZED_SEGMENTS.some(id => this.state[id] > 1);

        if (!hayMotores) {
            return { alterada, descripcion: '', descripcionMinuscula: '', territorio: '', wmsi: this.calculateWMSI() };
        }

        const descripcion = MotilityEngine.describe(this.state).replace(/\.$/, '');
        let territorio = '';
        if (alterada && typeof TerritoryEngine !== 'undefined') {
            const t = TerritoryEngine.interpret(this.state);
            // Dentro de la frase del ventrículo se usa la forma corta: el "distribución
            // compatible con..." es para cuando el dato va suelto.
            territorio = t.pattern || t.territory || '';
        }

        return {
            alterada,
            descripcion,
            descripcionMinuscula: descripcion.charAt(0).toLowerCase() + descripcion.slice(1),
            territorio,
            wmsi: this.calculateWMSI(),
        };
    }

    /** Descripción de motilidad (Motor A) con el WMSI */
    generateMotilityReport() {
        const t = this.getMotilityTexts();
        if (!t.descripcion) return '';
        return `${t.descripcion} (WMSI: ${t.wmsi}).\n`;
    }

    /** Frase de motilidad sin puntuación final, para encabezados */
    generateSegmentListText() {
        const t = this.getMotilityTexts();
        return t.alterada ? `${t.descripcion}.` : '';
    }

    /** Motilidad + territorio, para la conclusión */
    generateConclusion() {
        const t = this.getMotilityTexts();
        if (!t.alterada) return '';
        return t.territorio ? `${t.descripcion}, ${t.territorio}.` : `${t.descripcion}.`;
    }

    // ───────────────────── DEPRECADO — sin uso, conservado para referencia ─────

    // Generate explicit segment list (like in preview "ojo de buey")
    _legacyGenerateSegmentListText() {
        const abnormal = this.getAbnormalSegments();
        const totalAbnormal = abnormal.hypokinetic.length + abnormal.akinetic.length + abnormal.dyskinetic.length;
        if (totalAbnormal === 0) return "";

        // Patrones de disincronía y compromiso difuso: describir en bloque.
        // Enumerar los 16-17 segmentos no aporta nada cuando la alteración es global.
        if (this.pattern !== 'none') {
            const currentPattern = MotilityModel.PATTERNS[this.pattern];
            const esDifusoGlobal = currentPattern && currentPattern.isDiffuse && totalAbnormal >= 12;
            if (currentPattern && (currentPattern.category === 'dyssynchrony' || esDifusoGlobal)) {
                let description = this._legacyGenerateMotilityReport();
                description = description.replace(/\s*\(WMSI:.*?\)\.?\s*$/, '').trim();
                description = description.replace(/^Se observa(n)? trastornos segmentarios de la motilidad parietal:?\s*/i, '');
                description = description.replace(/^Se observa(n)?\s*/i, '');
                if (!description.endsWith('.')) description += '.';
                return description.charAt(0).toUpperCase() + description.slice(1);
            }
        }

        // Sin patrón elegido pero con los tres territorios y casi todo el ventrículo
        // comprometido: describir en bloque en lugar de listar segmento por segmento.
        const territorios = new Set([
            ...abnormal.hypokinetic, ...abnormal.akinetic, ...abnormal.dyskinetic,
        ].map(id => MotilityModel.SEGMENTS[id].artery));
        if (territorios.size === 3 && totalAbnormal >= 12) {
            const sev = [];
            if (abnormal.dyskinetic.length > 0)  sev.push('disquinesia');
            if (abnormal.akinetic.length > 0)    sev.push('aquinesia');
            if (abnormal.hypokinetic.length > 0) sev.push('hipoquinesia');
            const texto = sev.length > 1 ? `${sev.join(' y ')} globales` : `${sev[0]} global`;
            return `${texto.charAt(0).toUpperCase() + texto.slice(1)}, sin respetar un territorio coronario específico.`;
        }

        const parts = [];
        if (abnormal.akinetic.length > 0) {
            const segNames = abnormal.akinetic.map(id => MotilityModel.SEGMENTS[id].name.toLowerCase()).join(', ');
            parts.push(`Aquinesia de ${segNames}`);
        }
        if (abnormal.hypokinetic.length > 0) {
            const segNames = abnormal.hypokinetic.map(id => MotilityModel.SEGMENTS[id].name.toLowerCase()).join(', ');
            parts.push(`Hipoquinesia de ${segNames}`);
        }
        if (abnormal.dyskinetic.length > 0) {
            const segNames = abnormal.dyskinetic.map(id => MotilityModel.SEGMENTS[id].name.toLowerCase()).join(', ');
            parts.push(`Disquinesia de ${segNames}`);
        }

        return parts.join('; ') + '.';
    }

    // Generate conclusion (smart format based on territories)
    _legacyGenerateConclusion() {
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

        // COMPROMISO GLOBAL — los tres territorios afectados y la mayor parte del
        // ventrículo comprometido. Enumerar territorio por territorio sugeriría una
        // distribución coronaria que en realidad no existe.
        if (affectedTerritories.length === 3 && totalAbnormal >= 12) {
            const sev = [];
            if (abnormal.dyskinetic.length > 0) sev.push('disquinesia');
            if (abnormal.akinetic.length > 0)   sev.push('aquinesia');
            if (abnormal.hypokinetic.length > 0) sev.push('hipoquinesia');
            const texto = sev.length > 1 ? `${sev.join(' y ')} globales` : `${sev[0]} global`;
            return `${texto.charAt(0).toUpperCase() + texto.slice(1)}, sin respetar un territorio coronario específico.`;
        }

        // SINGLE TERRITORY
        if (affectedTerritories.length === 1) {
            const territory = affectedTerritories[0];
            const counts = byTerritory[territory];
            const sevParts = [];
            if (counts.dis > 0) sevParts.push('Disquinesia');
            if (counts.aki > 0) sevParts.push('Aquinesia');
            if (counts.hipo > 0) sevParts.push('Hipoquinesia');
            return `${sevParts.join(' y ')} en territorio ${territory}.`;
        }

        // MULTIPLE TERRITORIES
        const parts = [];
        affectedTerritories.forEach(territory => {
            const counts = byTerritory[territory];
            const severities = [];
            if (counts.dis > 0) severities.push("Disquinesia");
            if (counts.aki > 0) severities.push("Aquinesia");
            if (counts.hipo > 0) severities.push("Hipoquinesia");
            const severityText = severities.join(" y ");
            parts.push(`${severityText} en territorio ${territory}`);
        });

        return parts.join(", ") + ".";
    }

    // Set special pattern
    setPattern(patternName) {
        this.pattern = patternName;
        sessionStorage.setItem('motility-pattern', patternName);

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
                // Varios patrones listan el 17 por herencia del modelo de 17 segmentos.
                // Se saltea: no se pinta ni se analiza, así que marcarlo sólo dejaría un
                // estado invisible que no coincide con lo que muestra el bull's-eye.
                pattern.affectedSegments.forEach(id => {
                    if (id !== 17) this.state[id] = severity;
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
        // Se limpian TODAS las etapas y se suelta el pincel: un reset abre un estudio
        // nuevo, no una etapa nueva del mismo estudio.
        this.faseActiva = 'reposo';
        this.phases = { reposo: this.getDefaultState() };
        this.gradoActivo = null;
        this.pattern = 'none';
        this.saveToStorage();
        sessionStorage.setItem('motility-pattern', 'none');
        this.notifyListeners('all');
        this.updateUI();
        this.updatePreview();
    }

    // Persistence
    saveToStorage() {
        sessionStorage.setItem('motility-state', JSON.stringify(this.state));
    }

    loadFromStorage() {
        const saved = sessionStorage.getItem('motility-state');
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

        // Interpretación cualitativa del WMSI (sin rangos de FEVI: ver interpretWMSI)
        const interp = this.interpretWMSI();
        if (interp.label) {
            const interpColor = interp.severity === 'normal' ? '#10b981' :
                interp.severity === 'mild' ? '#f59e0b' : '#ef4444';
            parts.push(`<strong>Interpretación:</strong> <span style="color: ${interpColor};">${interp.label}</span>`);
        }


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

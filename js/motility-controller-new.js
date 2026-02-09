// NEW VERSION of generateMotilityReport() - to be integrated
// This version uses: primary complete wall + extensions to partial walls

generateMotilityReport() {
    const abnormal = this.getAbnormalSegments();
    const totalAbnormal = abnormal.hypokinetic.length + abnormal.akinetic.length + abnormal.dyskinetic.length;

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
            return `Se observan trastornos segmentarios de la motilidad parietal, con ${severityText} global difusa que no respeta un territorio coronario específico.\n`;
        } else if (currentPattern.name.includes("Hipertensiva")) {
            return `Se observan trastornos segmentarios de la motilidad parietal, con ${severityText} con predominio basal y medio ventricular.\n`;
        } else {
            return `Se observan trastornos segmentarios de la motilidad parietal, con ${severityText} difusa.\n`;
        }
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

    return description + ".\n";
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

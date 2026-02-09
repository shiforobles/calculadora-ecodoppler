/**
 * Motility Model - 17-Segment AHA/ASE Model
 * Defines segment structure, coronary territories, and motility states
 */

const MotilityModel = {
    // 17-Segment AHA/ASE Model
    SEGMENTS: {
        // BASAL (1-6)
        1: { name: "Basal Anterior", shortName: "1-BsAnt", views: ["A4C", "PSAX"], artery: "DA" },
        2: { name: "Basal Anteroseptal", shortName: "2-BsAntSep", views: ["A4C", "PSAX"], artery: "DA" },
        3: { name: "Basal Inferoseptal", shortName: "3-BsInfSep", views: ["A3C", "PSAX"], artery: "CD" },
        4: { name: "Basal Inferior", shortName: "4-BsInf", views: ["A2C", "PSAX"], artery: "CD" },
        5: { name: "Basal Inferolateral", shortName: "5-BsInfLat", views: ["A2C", "PSAX"], artery: "Cx" },
        6: { name: "Basal Anterolateral", shortName: "6-BsAntLat", views: ["A3C", "PSAX"], artery: "Cx" },

        // MEDIO (7-12)
        7: { name: "Medio Anterior", shortName: "7-MdAnt", views: ["A4C", "PSAX"], artery: "DA" },
        8: { name: "Medio Anteroseptal", shortName: "8-MdAntSep", views: ["A4C", "PSAX"], artery: "DA" },
        9: { name: "Medio Inferoseptal", shortName: "9-MdInfSep", views: ["A3C", "PSAX"], artery: "CD" },
        10: { name: "Medio Inferior", shortName: "10-MdInf", views: ["A2C", "PSAX"], artery: "CD" },
        11: { name: "Medio Inferolateral", shortName: "11-MdInfLat", views: ["A2C", "PSAX"], artery: "Cx" },
        12: { name: "Medio Anterolateral", shortName: "12-MdAntLat", views: ["A3C", "PSAX"], artery: "Cx" },

        // APICAL (13-16)
        13: { name: "Apical Anterior", shortName: "13-ApAnt", views: ["A4C"], artery: "DA" },
        14: { name: "Apical Septal", shortName: "14-ApSep", views: ["A4C"], artery: "DA" },
        15: { name: "Apical Inferior", shortName: "15-ApInf", views: ["A2C"], artery: "CD" },
        16: { name: "Apical Lateral", shortName: "16-ApLat", views: ["A2C"], artery: "Cx" },

        // APEX (17)
        17: { name: "Apex", shortName: "17-Apex", views: ["A4C", "A2C", "A3C"], artery: "DA" }
    },

    // Motility States
    STATES: {
        1: { label: "Normocinesia", shortLabel: "Normal", color: "#10b981", score: 1 },
        2: { label: "Hipoquinesia", shortLabel: "Hipo", color: "#fbbf24", score: 2 },
        3: { label: "Aquinesia", shortLabel: "A", color: "#ef4444", score: 3 },
        4: { label: "Disquinesia", shortLabel: "Dis", color: "#a855f7", score: 4 }
    },

    // Coronary Territories
    TERRITORIES: {
        DA: {
            name: "Descendente Anterior (DA)",
            shortName: "DA",
            segments: [1, 2, 7, 8, 13, 14, 17]
        },
        CD: {
            name: "Coronaria Derecha (CD)",
            shortName: "CD",
            segments: [3, 4, 9, 10, 15]
        },
        Cx: {
            name: "Circunfleja (Cx)",
            shortName: "Cx",
            segments: [5, 6, 11, 12, 16]
        }
    },

    // Special Patterns - Expanded Clinical Library
    PATTERNS: {
        // === ISQUÉMICOS TERRITORIALES ===
        ischemic_da: {
            name: "Isquémico DA",
            description: "Patrón isquémico territorial en descendente anterior",
            affectedSegments: [1, 2, 7, 8, 13, 14, 17],
            severity: 2, // Hipoquinesia - usuario marca aquinesia si necesario
            category: "ischemic"
        },
        ischemic_cd: {
            name: "Isquémico CD",
            description: "Patrón isquémico territorial en coronaria derecha",
            affectedSegments: [3, 4, 9, 10, 15],
            severity: 2,
            category: "ischemic"
        },
        ischemic_cx: {
            name: "Isquémico Cx",
            description: "Patrón isquémico territorial en circunfleja",
            affectedSegments: [5, 6, 11, 12, 16],
            severity: 2,
            category: "ischemic"
        },
        ischemic_multivessel: {
            name: "Isquemia Multivaso",
            description: "Patrón isquémico de múltiples territorios",
            affectedSegments: [1, 2, 4, 7, 8, 10, 13, 14, 15, 17], // DA + CD
            severity: 2,
            category: "ischemic"
        },

        // === TAKOTSUBO VARIANTES ===
        takotsubo_apical: {
            name: "Takotsubo Apical",
            description: "Patrón apical clásico (capuchón apical)",
            affectedSegments: [13, 14, 15, 16, 17],
            severity: 2,
            category: "takotsubo"
        },
        takotsubo_mid: {
            name: "Takotsubo Medioventricular",
            description: "Patrón medioventricular (rosquilla)",
            affectedSegments: [7, 8, 9, 10, 11, 12],
            severity: 2,
            category: "takotsubo"
        },
        takotsubo_inverted: {
            name: "Takotsubo Invertido",
            description: "Patrón basal (invertido)",
            affectedSegments: [1, 2, 3, 4, 5, 6],
            severity: 2,
            category: "takotsubo"
        },
        takotsubo_focal: {
            name: "Takotsubo Focal",
            description: "Patrón focal anterolateral",
            affectedSegments: [6, 12],
            severity: 2,
            category: "takotsubo"
        },

        // === MIOCARDIOPATÍAS ===
        dilated_cm: {
            name: "Miocardiopatía Dilatada",
            description: "Hipoquinesia difusa global",
            affectedSegments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            severity: 2, // Hipoquinesia
            category: "cardiomyopathy",
            isDiffuse: true // Flag para descripción global
        },
        hypertensive_cm: {
            name: "Cardiopatía Hipertensiva",
            description: "Compromiso basal predominante",
            affectedSegments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            severity: 2,
            category: "cardiomyopathy",
            isDiffuse: true
        },
        chagas: {
            name: "Chagas",
            description: "Patrón típico: aneurisma apical + compromiso inferobasal",
            affectedSegments: [4, 10, 17], // Inferior + ápex
            severity: 2, // Empieza con hipoquinesia, usuario marca disquinesia en ápex
            category: "cardiomyopathy"
        },

        // === TERRITORIOS COMBINADOS / SELECCIÓN ESPECIAL ===
        da_cx: {
            name: "DA + Cx (Anterolateral ext)",
            description: "Compromiso anterior y anterolateral",
            affectedSegments: [1, 6, 7, 12, 13, 16, 17], // Ant + Ant-Lat
            severity: 2,
            category: "combined"
        },
        da_cd_wrap: {
            name: "DA envolvente (Wrap-around)",
            description: "Compromiso anterior con extensión inferior apical",
            affectedSegments: [1, 2, 7, 8, 13, 14, 15, 17], // Ant + Sept + Inf-Apex
            severity: 2,
            category: "combined"
        },
        cx_cd: {
            name: "Cx + CD (Inferolateral)",
            description: "Compromiso inferior e inferolateral",
            affectedSegments: [4, 5, 10, 11, 15], // Inf + Inf-Lat
            severity: 2,
            category: "combined"
        },
        multivessel: {
            name: "Multivaso (DA+Cx+CD)",
            description: "Compromiso multiterritorial difuso",
            affectedSegments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // All or most
            severity: 2,
            category: "combined"
        },
        left_main: {
            name: "Tronco CI",
            description: "Compromiso extenso anterior y lateral (bases)",
            affectedSegments: [1, 2, 5, 6, 7, 8, 11, 12, 13, 14], // Ant + Sep + Lat (Basal/Mid) without Apex sometimes? User said "bases comprometidas + gran extension"
            severity: 2,
            category: "combined"
        },
        da_distal: {
            name: "DA Distal / Apical pura",
            description: "Compromiso apical anterior y septal, bases preservadas",
            affectedSegments: [13, 14, 15, 16, 17], // All apical + apex
            severity: 2,
            category: "combined"
        },
        bcri: {
            name: "BCRI / Disincronía",
            description: "Disincronía mecánica por bloqueo de rama izquierda",
            affectedSegments: [2, 3, 8, 9, 14], // Septum
            severity: 2,
            category: "dyssynchrony"
        },
        bcrd: {
            name: "BCRD (Rama Derecha)",
            description: "Asincronía septal leve por bloqueo de rama derecha",
            affectedSegments: [2, 8], // Septum basal/mid (mild)
            severity: 1, // Usually preserved or mild
            category: "dyssynchrony"
        },
        pacemaker: {
            name: "Marcapasos (MCP)",
            description: "Disincronía por estimulación ventricular",
            affectedSegments: [2, 3, 8, 9, 14], // Septum + Lateral delay
            severity: 2,
            category: "dyssynchrony"
        },
        post_surgery: {
            name: "Post Cirugía Cardíaca",
            description: "Movimiento septal anómalo post-quirúrgico",
            affectedSegments: [2, 3, 8, 9, 14], // Septum
            severity: 2, // Marked as abnormal but described as anomalous
            category: "dyssynchrony"
        },
        aneurysm_anterior: {
            name: "Aneurisma Anterior",
            description: "Disquinesia de pared anterior",
            affectedSegments: [1, 7, 13],
            severity: 4, // Disquinesia para aneurismas
            category: "special"
        },
        aneurysm_apical: {
            name: "Aneurisma Apical",
            description: "Disquinesia/aquinesia apical",
            affectedSegments: [13, 14, 15, 16, 17],
            severity: 4,
            category: "special"
        },
        aneurysm_inferior: {
            name: "Aneurisma Inferior",
            description: "Disquinesia de pared inferior",
            affectedSegments: [4, 10, 15],
            severity: 4,
            category: "special"
        }
    },

    // Get segments for a specific view
    getSegmentsForView(viewName) {
        return Object.entries(this.SEGMENTS)
            .filter(([_, seg]) => seg.views.includes(viewName))
            .map(([id, seg]) => ({ id: parseInt(id), ...seg }));
    },

    // Get artery name
    getArteryName(arteryCode, full = true) {
        return full ? this.TERRITORIES[arteryCode].name : this.TERRITORIES[arteryCode].shortName;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotilityModel;
}

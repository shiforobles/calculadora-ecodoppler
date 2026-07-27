/**
 * StudyStorage — Persistent local storage for echocardiogram studies
 * Records are saved as JSON in localStorage and exportable as CSV.
 */
class StudyStorage {
    static KEY = 'ecodoppler_studies';

    static HEADERS = [
        // Filiación (9)
        'Fecha', 'HC', 'Edad', 'Sexo', 'Peso', 'Altura', 'IMC', 'SC', 'Ritmo',
        // Antecedentes (7)
        'Conducción', 'HTA', 'C.Isquémica', 'CRM', 'EPOC', 'FA Previa', 'Marcapasos',
        // VI (7)
        'SIV', 'PP', 'DDVI', 'DSVI', 'Masa VI Index', 'RWT', 'Geometría',
        // Sistólica / Motilidad (3)
        'FEy', 'Motilidad Global', 'Motilidad Detalle',
        // Diastólica / AI (4)
        "Diástole", "E/e'", 'E/A', 'Vol AI',
        // Válvula Aórtica (12)
        'EAo Grado', 'EAo Vmax', 'EAo GM', 'AVA', 'Coef Adim',
        'IAo Grado', 'IAo VC', 'IAo PHT', 'IAo RVol', 'IAo EROA', 'IAo Alcance', 'IAo Reverso',
        // Válvula Mitral (6)
        'EM Grado', 'EM GM', 'EM Área', 'IM Grado', 'IM ORE', 'IM VR',
        // Cavidades Derechas (7)
        'AD Estado', 'AD Área', 'VD Estado', 'VD Basal', 'TAPSE', "S'", 'PSAP',
        // IT (5)
        'IT Grado', 'IT VC', 'IT ORE', 'IT VR', 'IT Flujo Hep',
        // Prótesis (9)
        'Prótesis', 'Prot Posición', 'Prot Tipo', 'Prot Modelo',
        'Prot Vmax', 'Prot GM', 'Prot DVI', 'Prot iEOA', 'Prot Insuf',
        // Especiales / Pericardio (4)
        'ASIA Excursión', 'ASIA Shunt', 'PE Tamaño', 'PE Compromiso',
        // Doppler Diastólico Extendido (7)
        'Onda E', 'Onda A', "e' Septal", "e' Lateral", 'TRIV', 'TD', 'LARS',
        // IM adicional (1)
        'IM VC',
        // IT velocidad (1)
        'IT Vmax',
        // Pericardio distribución (1)
        'PE Distribución',
        // Informe narrativo completo (1) — usado por el dashboard
        'Informe',
        // Antecedentes adicionales y observaciones (4)
        // Se agregan AL FINAL para no correr las columnas de las planillas ya cargadas.
        'ATC/Stent', 'Recambio Ao', 'Recambio Mitral', 'Observaciones',
    ];

    static getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch {
            return [];
        }
    }

    static save(row) {
        const studies = this.getAll();
        studies.push({ id: Date.now(), row });
        localStorage.setItem(this.KEY, JSON.stringify(studies));
        return studies.length;
    }

    static delete(id) {
        const filtered = this.getAll().filter(s => s.id !== id);
        localStorage.setItem(this.KEY, JSON.stringify(filtered));
    }

    static clear() {
        localStorage.removeItem(this.KEY);
    }

    static exportCSV() {
        const studies = this.getAll();
        if (!studies.length) return false;

        const escape = v => `"${String(v ?? '-').replace(/"/g, '""')}"`;
        const header = this.HEADERS.map(escape).join(';');
        const rows   = studies.map(s => s.row.map(escape).join(';'));
        const csv    = [header, ...rows].join('\r\n');

        // BOM so Excel reads UTF-8 correctly
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `ecodoppler_estudios_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
}

if (typeof window !== 'undefined') window.StudyStorage = StudyStorage;

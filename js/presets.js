/**
 * Presets clínicos — definiciones de datos + personalización del usuario.
 *
 * Los presets base viven acá como datos planos ({idDelCampo: valor}). El usuario puede
 * sobrescribirlos o crear los suyos: esas versiones se guardan en localStorage y ganan
 * sobre la base. "Restaurar" borra el override y vuelve a la definición original.
 *
 * Los datos filiatorios (sexo, edad, peso, altura) NO forman parte de los presets:
 * un preset completa el estudio, no reemplaza al paciente que ya cargaste.
 */

// Campos que un preset nunca pisa si ya tienen valor cargado
const CAMPOS_PACIENTE = ['sexo', 'edad', 'peso', 'altura'];

// Valores por defecto de paciente, usados sólo cuando el formulario está vacío
// (para que los presets sigan sirviendo como demo desde cero).
const PACIENTE_DEMO = {
    adolescente:           { sexo: 'F', edad: 17, peso: 52, altura: 160 },
    joven:                 { sexo: 'M', edad: 25, peso: 72, altura: 178 },
    adulto:                { sexo: 'M', edad: 50, peso: 80, altura: 172 },
    esclerosis_bivalvular: { sexo: 'M', edad: 68, peso: 75, altura: 168 },
    hta_remodelado:        { sexo: 'M', edad: 57, peso: 85, altura: 172 },
    hta_hvi:               { sexo: 'M', edad: 62, peso: 85, altura: 170 },
    im_iao_leve:           { sexo: 'M', edad: 60, peso: 78, altura: 170 },
    mcd_moderada:          { sexo: 'M', edad: 52, peso: 75, altura: 170 },
    mcd_severa:            { sexo: 'M', edad: 57, peso: 78, altura: 172 },
    iam_anterior:          { sexo: 'M', edad: 65, peso: 80, altura: 172 },
    falla_vd:              { sexo: 'M', edad: 62, peso: 75, altura: 168 },
};

const MORF_MITRAL_NORMAL   = 'Valvas finas y móviles, apertura conservada';
const MORF_MITRAL_FIBROSA  = 'Leve engrosamiento fibroso de las valvas sin restricción de apertura';
const MORF_AORTICA_NORMAL  = 'Válvula trivalva, sigmoideas finas y móviles';
const MORF_AORTICA_ESCLER  = 'Esclerosis valvular aórtica (engrosamiento focal) sin restricción de apertura';

const PRESETS_BASE = {
    adolescente: {
        label: 'Adolescente', grupo: 'normal',
        titulo: 'Adolescente sana, fisiológico puro',
        campos: {
            siv: 8, pp: 8, ddvi: 44, fevi: 68,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 100, onda_a: 50, onda_e_prime_septal: 15, onda_e_prime_lateral: 19,
            vol_ai: 20, ao_raiz: 24, ao_asc: 22,
            morf_mitral: MORF_MITRAL_NORMAL, morf_aortica: MORF_AORTICA_NORMAL,
            im_grado: 'no', ia_grado: 'no', ea_grado: 'no',
            tapse: 28, s_prima_vd: 16, it_grado: 'no_valorable',
        },
    },
    joven: {
        label: 'Joven', grupo: 'normal',
        titulo: 'Adulto joven sin patología estructural',
        campos: {
            siv: 8, pp: 8, ddvi: 48, fevi: 67,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 95, onda_a: 50, onda_e_prime_septal: 14, onda_e_prime_lateral: 17,
            vol_ai: 22, ao_raiz: 30, ao_asc: 28,
            morf_mitral: MORF_MITRAL_NORMAL, morf_aortica: MORF_AORTICA_NORMAL,
            im_grado: 'no', ia_grado: 'no', ea_grado: 'no',
            tapse: 26, s_prima_vd: 15, it_grado: 'no_valorable',
        },
    },
    adulto: {
        label: 'Adulto', grupo: 'normal',
        titulo: 'Adulto 50 años sin hallazgos estructurales',
        campos: {
            siv: 10, pp: 10, ddvi: 50, fevi: 62,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 80, onda_a: 65, onda_e_prime_septal: 9, onda_e_prime_lateral: 11,
            vol_ai: 26, ao_raiz: 32, ao_asc: 30,
            morf_mitral: MORF_MITRAL_NORMAL, morf_aortica: MORF_AORTICA_NORMAL,
            im_grado: 'no', ia_grado: 'no', ea_grado: 'no',
            tapse: 24, s_prima_vd: 13, it_grado: 'no_valorable',
        },
    },
    esclerosis_bivalvular: {
        label: 'Esclerosis', grupo: 'leve',
        titulo: 'Esclerosis bivalvular con IM leve e IT leve',
        campos: {
            siv: 10, pp: 10, ddvi: 50, fevi: 60,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 75, onda_a: 70, onda_e_prime_septal: 8, onda_e_prime_lateral: 10,
            vol_ai: 30, ao_raiz: 32, ao_asc: 30,
            morf_mitral: MORF_MITRAL_FIBROSA, morf_aortica: MORF_AORTICA_ESCLER,
            ea_grado: 'esclerosis', ea_vmax: 2.2, im_grado: 'leve', ia_grado: 'no',
            tapse: 22, s_prima_vd: 12, vel_it: 1.5, it_grado: 'leve',
            ant_hta: true,
        },
    },
    hta_remodelado: {
        label: 'HTA Remodelado', grupo: 'leve',
        titulo: 'HTA con remodelado concéntrico y DD Grado I',
        campos: {
            siv: 11, pp: 11, ddvi: 46, fevi: 62,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 65, onda_a: 90, onda_e_prime_septal: 7, onda_e_prime_lateral: 8,
            vol_ai: 34, ao_raiz: 34, ao_asc: 32,
            morf_mitral: MORF_MITRAL_FIBROSA, morf_aortica: MORF_AORTICA_ESCLER,
            ea_grado: 'esclerosis', im_grado: 'no', ia_grado: 'no',
            tapse: 22, s_prima_vd: 12, it_grado: 'no_valorable',
            ant_hta: true,
        },
    },
    hta_hvi: {
        label: 'HTA + HVI', grupo: 'leve',
        titulo: 'HTA con hipertrofia ventricular izquierda concéntrica',
        campos: {
            siv: 13, pp: 13, ddvi: 47, fevi: 60,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 70, onda_a: 100, onda_e_prime_septal: 7, onda_e_prime_lateral: 9,
            vol_ai: 38, ao_raiz: 34, ao_asc: 32,
            morf_mitral: MORF_MITRAL_FIBROSA, morf_aortica: MORF_AORTICA_ESCLER,
            ea_grado: 'esclerosis', im_grado: 'no', ia_grado: 'no',
            tapse: 23, s_prima_vd: 13, it_grado: 'no_valorable',
            ant_hta: true,
        },
    },
    im_iao_leve: {
        label: 'IM + IAo leve', grupo: 'leve',
        titulo: 'IM leve + IAo leve + AI levemente dilatada + DD Grado I',
        campos: {
            siv: 10, pp: 10, ddvi: 52, fevi: 60,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 65, onda_a: 87, onda_e_prime_septal: 7, onda_e_prime_lateral: 8,
            vol_ai: 36, ao_raiz: 34, ao_asc: 32,
            morf_mitral: 'Engrosamiento leve de valvas mitrales, apertura conservada',
            morf_aortica: 'Leve engrosamiento fibroso de sigmoideas, apertura conservada',
            ea_grado: 'no', im_grado: 'leve', ia_grado: 'leve',
            tapse: 22, s_prima_vd: 12, it_grado: 'no_valorable',
        },
    },
    mcd_moderada: {
        label: 'MCDi 40%', grupo: 'severo',
        titulo: 'Miocardiopatía dilatada FEy 40%, IM funcional moderada',
        campos: {
            siv: 8, pp: 8, ddvi: 62, fevi: 40,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 90, onda_a: 60, onda_e_prime_septal: 5, onda_e_prime_lateral: 7,
            vol_ai: 42, ao_raiz: 30, ao_asc: 28,
            morf_mitral: 'Valvas anatómicamente conservadas con Tenting sistólico secundario a dilatación/remodelado del VI',
            morf_aortica: MORF_AORTICA_NORMAL,
            ea_grado: 'no', im_grado: 'moderada', ia_grado: 'no',
            tapse: 20, s_prima_vd: 11, vel_it: 2.9, it_grado: 'leve',
            motilidad_global: 'alterada', 'pattern-selector': 'dilated_cm',
            im_vc: 5, im_ore: 0.30, im_vr: 45, im_area_jet: 'moderada',
        },
    },
    mcd_severa: {
        label: 'MCDi 30%', grupo: 'severo',
        titulo: 'Miocardiopatía dilatada severa FEy 28%, biventricular',
        campos: {
            siv: 7, pp: 7, ddvi: 68, fevi: 28,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 110, onda_a: 42, onda_e_prime_septal: 4, onda_e_prime_lateral: 5,
            vol_ai: 52, ao_raiz: 30, ao_asc: 28,
            morf_mitral: 'Valvas anatómicamente conservadas con Tenting sistólico severo secundario a dilatación y remodelado del VI',
            morf_aortica: MORF_AORTICA_NORMAL,
            ea_grado: 'no', im_grado: 'moderada', ia_grado: 'no',
            vd_basal: 48, vd_estado: 'dilatado',
            tapse: 14, s_prima_vd: 7, vel_it: 3.6, it_grado: 'leve',
            motilidad_global: 'alterada', 'pattern-selector': 'dilated_cm',
            im_vc: 5, im_ore: 0.30, im_vr: 45, im_area_jet: 'moderada',
        },
    },
    iam_anterior: {
        label: 'Post-IAM', grupo: 'severo',
        titulo: 'Post-IAM anterior con trastorno segmentario',
        campos: {
            siv: 9, pp: 10, ddvi: 55, fevi: 42,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 90, onda_a: 65, onda_e_prime_septal: 7, onda_e_prime_lateral: 9,
            vol_ai: 36, ao_raiz: 32, ao_asc: 30,
            morf_mitral: MORF_MITRAL_NORMAL, morf_aortica: MORF_AORTICA_ESCLER,
            ea_grado: 'esclerosis', ea_vmax: 2.0, im_grado: 'leve', ia_grado: 'no',
            tapse: 20, s_prima_vd: 11, vel_it: 2.7, it_grado: 'leve',
            motilidad_global: 'alterada', 'pattern-selector': 'ischemic_da',
            ant_isquemia: true,
        },
    },
    falla_vd: {
        label: 'Falla VD', grupo: 'severo',
        titulo: 'Dilatación de cavidades derechas con falla del VD',
        campos: {
            siv: 9, pp: 9, ddvi: 44, fevi: 58,
            ritmo: 'sinusal', conduccion: 'normal',
            onda_e: 80, onda_a: 70, onda_e_prime_septal: 8, onda_e_prime_lateral: 10,
            vol_ai: 32, ao_raiz: 28, ao_asc: 26,
            morf_mitral: MORF_MITRAL_NORMAL, morf_aortica: MORF_AORTICA_NORMAL,
            ea_grado: 'no', im_grado: 'leve', ia_grado: 'no',
            vd_basal: 46, vd_estado: 'dilatado',
            tapse: 13, s_prima_vd: 7, vel_it: 3.5, it_grado: 'leve',
            ant_epoc: true,
        },
    },
};

const PresetStore = {
    KEY: 'ecodoppler_presets_custom',

    /** Overrides y presets propios guardados por el usuario */
    getCustom() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '{}');
        } catch {
            return {};
        }
    },

    _setCustom(obj) {
        localStorage.setItem(this.KEY, JSON.stringify(obj));
    },

    /** Todos los presets efectivos: los del usuario ganan sobre los de fábrica */
    getAll() {
        return { ...PRESETS_BASE, ...this.getCustom() };
    },

    get(nombre) {
        return this.getAll()[nombre] || null;
    },

    /** true si el preset fue modificado o creado por el usuario */
    esPersonalizado(nombre) {
        return Object.prototype.hasOwnProperty.call(this.getCustom(), nombre);
    },

    esDeFabrica(nombre) {
        return Object.prototype.hasOwnProperty.call(PRESETS_BASE, nombre);
    },

    guardar(nombre, preset) {
        const custom = this.getCustom();
        custom[nombre] = preset;
        this._setCustom(custom);
    },

    /**
     * Borra el override. En un preset de fábrica lo devuelve a su definición original;
     * en uno creado por el usuario lo elimina por completo.
     */
    restaurar(nombre) {
        const custom = this.getCustom();
        delete custom[nombre];
        this._setCustom(custom);
    },

    exportar() {
        return JSON.stringify(this.getCustom(), null, 2);
    },

    /** Importa un JSON de presets. Devuelve la cantidad importada o lanza si es inválido. */
    importar(json, { reemplazarTodo = false } = {}) {
        const datos = JSON.parse(json);
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
            throw new Error('El archivo no contiene un conjunto de presets válido');
        }
        for (const [nombre, p] of Object.entries(datos)) {
            if (!p || typeof p !== 'object' || !p.campos || typeof p.campos !== 'object') {
                throw new Error(`El preset "${nombre}" no tiene un bloque de campos válido`);
            }
        }
        this._setCustom(reemplazarTodo ? datos : { ...this.getCustom(), ...datos });
        return Object.keys(datos).length;
    },
};

window.PRESETS_BASE     = PRESETS_BASE;
window.PresetStore      = PresetStore;
window.CAMPOS_PACIENTE  = CAMPOS_PACIENTE;
window.PACIENTE_DEMO    = PACIENTE_DEMO;

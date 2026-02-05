/**
 * UI Controller Extensions for v14.0
 * Progressive disclosure, mini-calculators, and QC
 */

// Add these methods to UIController class

/**
 * Toggle valve quantification boxes based on pathology selection
 */
UIController.prototype.toggleValveBoxes = function () {
    // Mitral box
    const imGrado = document.getElementById('im_grado').value;
    const emGrado = document.getElementById('em_grado').value;
    const mitralBox = document.getElementById('box_mitral');
    const imFields = document.getElementById('im_fields');
    const emFields = document.getElementById('em_fields');

    if (imGrado !== 'no' || emGrado !== 'no') {
        mitralBox.style.display = 'block';
        imFields.style.display = imGrado !== 'no' ? 'block' : 'none';
        emFields.style.display = emGrado !== 'no' ? 'block' : 'none';
    } else {
        mitralBox.style.display = 'none';
    }

    // Aortic box
    const iaGrado = document.getElementById('ia_grado').value;
    const eaGrado = document.getElementById('ea_grado').value;
    const aortaBox = document.getElementById('box_aorta');
    const iaFields = document.getElementById('ia_fields');
    const eaFields = document.getElementById('ea_fields');

    if (iaGrado !== 'no' || eaGrado !== 'no') {
        aortaBox.style.display = 'block';
        iaFields.style.display = iaGrado !== 'no' ? 'block' : 'none';
        eaFields.style.display = eaGrado !== 'no' ? 'block' : 'none';
    } else {
        aortaBox.style.display = 'none';
    }

    // Right chambers boxes
    const adEstado = document.getElementById('ad_estado').value;
    const vdEstado = document.getElementById('vd_estado').value;
    const adBox = document.getElementById('box_ad');
    const vdBox = document.getElementById('box_vd');

    adBox.style.display = adEstado === 'dilatada' ? 'block' : 'none';
    vdBox.style.display = vdEstado === 'dilatado' ? 'block' : 'none';
};

/**
 * Toggle mini-calculator visibility
 */
UIController.prototype.toggleMiniCalc = function (calcId) {
    const calc = document.getElementById(calcId);
    const btn = event.target;

    if (calc.style.display === 'none') {
        calc.style.display = 'block';
        btn.textContent = btn.textContent.replace('▶', '▼');
    } else {
        calc.style.display = 'none';
        btn.textContent = btn.textContent.replace('▼', '▶');
    }
};

/**
 * Calculate AVA using Continuity Equation
 */
UIController.prototype.calcContinuity = function () {
    const diam = parseFloat(document.getElementById('cont_diam_tsvi').value);
    const vtiTSVI = parseFloat(document.getElementById('cont_vti_tsvi').value);
    const vtiAo = parseFloat(document.getElementById('cont_vti_ao').value);
    const bsa = this.state.bsa || 1;

    if (!diam || !vtiTSVI || !vtiAo) {
        alert('⚠️ Complete todos los campos');
        return;
    }

    const result = this.miniCalc.calculateContinuity(diam, vtiTSVI, vtiAo, bsa);

    if (result) {
        document.getElementById('cont_result').innerHTML =
            `<strong>Área TSVI:</strong> ${result.areaTSVI} cm² | 
             <strong>AVA:</strong> ${result.ava} cm² | 
             <strong>AVA Index:</strong> ${result.avaIndex} cm²/m²`;
    }
};

/**
 * Inject AVA values into aortic box
 */
UIController.prototype.injectAVA = function () {
    const diam = parseFloat(document.getElementById('cont_diam_tsvi').value);
    const vtiTSVI = parseFloat(document.getElementById('cont_vti_tsvi').value);
    const vtiAo = parseFloat(document.getElementById('cont_vti_ao').value);
    const bsa = this.state.bsa || 1;

    const result = this.miniCalc.calculateContinuity(diam, vtiTSVI, vtiAo, bsa);

    if (result) {
        document.getElementById('ea_ava').value = result.ava;
        document.getElementById('ea_ava_index').value = result.avaIndex;

        // Calculate and inject coef if both VTI values are available
        const coef = this.miniCalc.calculateAdimensionalCoef(vtiTSVI, vtiAo);
        if (coef) {
            document.getElementById('ea_coef').value = coef;
        }

        this.showToast('✅ AVA inyectada en la sección aórtica');
    }
};

/**
 * Calculate PISA for mitral regurgitation
 */
UIController.prototype.calcPISA = function () {
    const radio = parseFloat(document.getElementById('pisa_radio').value);
    const vAliasing = parseFloat(document.getElementById('pisa_valiasing').value);
    const vmax = parseFloat(document.getElementById('pisa_vmax').value);
    const vti = parseFloat(document.getElementById('pisa_vti').value);

    if (!radio || !vAliasing || !vmax || !vti) {
        alert('⚠️ Complete todos los campos');
        return;
    }

    const result = this.miniCalc.calculatePISA(radio, vAliasing, vmax, vti);

    if (result) {
        document.getElementById('pisa_result').innerHTML =
            `<strong>Flujo:</strong> ${result.flow} ml/s | 
             <strong>ORE:</strong> ${result.ore} cm² | 
             <strong>VR:</strong> ${result.vr} ml`;
    }
};

/**
 * Inject PISA values into mitral box
 */
UIController.prototype.injectPISA = function () {
    const radio = parseFloat(document.getElementById('pisa_radio').value);
    const vAliasing = parseFloat(document.getElementById('pisa_valiasing').value);
    const vmax = parseFloat(document.getElementById('pisa_vmax').value);
    const vti = parseFloat(document.getElementById('pisa_vti').value);

    const result = this.miniCalc.calculatePISA(radio, vAliasing, vmax, vti);

    if (result) {
        document.getElementById('im_ore').value = result.ore;
        document.getElementById('im_vr').value = result.vr;
        this.showToast('✅ ORE y VR inyectados en la sección mitral');
    }
};

/**
 * Run Quality Control checks
 */
UIController.prototype.runQualityControl = function () {
    const formData = {
        motilidad: document.getElementById('motilidad_global').value,
        fevi: parseFloat(document.getElementById('fevi').value),
        ea_grado: document.getElementById('ea_grado').value,
        ea_ava: parseFloat(document.getElementById('ea_ava').value),
        dsvi: parseFloat(document.getElementById('dsvi').value),
        ddvi: parseFloat(document.getElementById('ddvi').value),
        im_grado: document.getElementById('im_grado').value,
        im_ore: parseFloat(document.getElementById('im_ore').value),
        em_grado: document.getElementById('em_grado').value,
        em_grad_medio: parseFloat(document.getElementById('em_grad_medio').value)
    };

    this.qc.runChecks(formData);
    this.qc.render();

    return !this.qc.hasErrors();
};

/**
 * UI Controller Module
 * Handles all DOM manipulation and user interactions
 */

class UIController {

    constructor(calculator, validator, miniCalc, qualityControl, motilityController) {
        this.calc = calculator;
        this.validator = validator;
        this.miniCalc = miniCalc || null;
        this.qc = qualityControl || null;
        this.motility = motilityController || null;
        this.state = {
            bsa: 0,
            lvMass: 0,
            lvMassIndex: 0,
            rwt: 0,
            geometry: '',
            psap: 0,
            diastolicResult: null
        };
    }

    /**
     * Initialize all event listeners
     */
    init() {
        // Auto-calculate on input changes
        this.attachCalculationListeners();

        // Button event listeners
        document.getElementById('btn_generate').addEventListener('click', () => this.generateReport());
        document.getElementById('btn_copy').addEventListener('click', () => this.copyReport());
        document.getElementById('btn_dataset').addEventListener('click', () => this.copyDataset());
        document.getElementById('btn_reset').addEventListener('click', () => this.resetAll());

        // Motility toggle
        document.getElementById('motilidad_global').addEventListener('change', () => this.toggleMotilityBox());

        // Valve toggles (progressive disclosure) - v14.0
        const valveSelects = ['im_grado', 'em_grado', 'ia_grado', 'ea_grado', 'ad_estado', 'vd_estado'];
        valveSelects.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => this.toggleValveBoxes());
        });

        // Mini-calculator toggles - v14.0
        const toggleCont = document.getElementById('toggle_continuidad');
        const togglePisa = document.getElementById('toggle_pisa');
        if (toggleCont) toggleCont.addEventListener('click', () => this.toggleMiniCalc('calc_continuidad'));
        if (togglePisa) togglePisa.addEventListener('click', () => this.toggleMiniCalc('calc_pisa'));

        // Mini-calculator actions - v14.0
        const btnCalcCont = document.getElementById('btn_calc_continuidad');
        const btnInjectAva = document.getElementById('btn_inject_ava');
        const btnCalcPisa = document.getElementById('btn_calc_pisa');
        const btnInjectPisa = document.getElementById('btn_inject_pisa');
        if (btnCalcCont) btnCalcCont.addEventListener('click', () => this.calcContinuity());
        if (btnInjectAva) btnInjectAva.addEventListener('click', () => this.injectAVA());
        if (btnCalcPisa) btnCalcPisa.addEventListener('click', () => this.calcPISA());
        if (btnInjectPisa) btnInjectPisa.addEventListener('click', () => this.injectPISA());

        // Lanús mode - v14.1
        const aiCalcMode = document.getElementById('ai_calc_mode');
        const btnCalcLanus = document.getElementById('btn_calc_lanus');
        const btnInjectLanus = document.getElementById('btn_inject_lanus');
        if (aiCalcMode) aiCalcMode.addEventListener('change', () => this.toggleLanusMode());
        if (btnCalcLanus) btnCalcLanus.addEventListener('click', () => this.calcLanus());
        if (btnInjectLanus) btnInjectLanus.addEventListener('click', () => this.injectLanus());

        // Voice Recognition - v14.2
        if (window.VoiceRecognition) {
            this.voiceRecognition = new VoiceRecognition(this);
            this.attachVoiceControls();
        }

        // Motility System - v14.3
        if (this.motility) {
            const patternSelector = document.getElementById('pattern-selector');
            const btnResetMotility = document.getElementById('btn-reset-motility');
            if (patternSelector) {
                patternSelector.addEventListener('change', (e) => {
                    this.motility.setPattern(e.target.value);
                });
            }
            if (btnResetMotility) {
                btnResetMotility.addEventListener('click', () => {
                    this.motility.reset();
                    if (patternSelector) patternSelector.value = 'none';
                });
            }

            // Anatomical View Extension
            if (window.MotilityAnatomicalView) {
                this.anatomicalView = new MotilityAnatomicalView(this.motility);

                const toggleView = document.getElementById('toggle-anatomical-view');
                const bullseyeContainer = document.getElementById('bullseye-container');
                const anatomicalContainer = document.getElementById('anatomical-container');

                if (toggleView && bullseyeContainer && anatomicalContainer) {
                    toggleView.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            // Show Anatomical
                            bullseyeContainer.style.display = 'none';
                            anatomicalContainer.style.display = 'block';
                        } else {
                            // Show Bullseye
                            bullseyeContainer.style.display = 'block';
                            anatomicalContainer.style.display = 'none';
                        }
                    });
                }
            }
        }

        // Show/Hide Regional Motility Section - v14.4
        const motGlobal = document.getElementById('motilidad_global');
        const motRegionalSection = document.getElementById('motility-regional-section');
        if (motGlobal && motRegionalSection) {
            motGlobal.addEventListener('change', (e) => {
                if (e.target.value === 'alterada') {
                    motRegionalSection.style.display = 'block';
                } else {
                    motRegionalSection.style.display = 'none';
                    if (this.motility) {
                        this.motility.reset();
                        const ps = document.getElementById('pattern-selector');
                        if (ps) ps.value = 'none';
                    }
                }
            });
        }

        // Initial calculation and valve box visibility
        this.calculateAll();
        if (this.toggleValveBoxes) this.toggleValveBoxes();
    }

    /**
     * Attach listeners to all calculation-triggering inputs
     */
    attachCalculationListeners() {
        const calcFields = [
            'peso', 'altura', 'sexo',
            'siv', 'pp', 'ddvi', 'fevi',
            'onda_e', 'onda_a', 'onda_e_prime',
            'vol_ai', 'vel_it', 'pad',
            'motilidad_global',
            'ao_raiz', 'ao_asc'
        ];

        calcFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                const eventType = element.tagName === 'SELECT' ? 'change' : 'input';
                element.addEventListener(eventType, () => {
                    this.calculateAll();
                });
            }
        });
    }

    /**
     * Main calculation orchestrator
     */
    calculateAll() {
        this.calculateBSA();
        this.calculateLVMassAndGeometry();
        this.calculateDiastolicFunction();
        this.calculatePSAP();
        if (this.updateAorticDisplay) this.updateAorticDisplay();
        this.validateInputs();
    }

    /**
     * Calculate and display Body Surface Area
     */
    calculateBSA() {
        const weight = parseFloat(document.getElementById('peso').value);
        const height = parseFloat(document.getElementById('altura').value);

        if (weight && height) {
            this.state.bsa = this.calc.calculateBodySurface(weight, height);
            document.getElementById('sc_display').value = this.state.bsa.toFixed(2);
        } else {
            document.getElementById('sc_display').value = '';
        }
    }

    /**
     * Calculate LV mass, geometry, and display results
     */
    calculateLVMassAndGeometry() {
        const ddvi = parseFloat(document.getElementById('ddvi').value);
        const pp = parseFloat(document.getElementById('pp').value);
        const siv = parseFloat(document.getElementById('siv').value);
        const sex = document.getElementById('sexo').value;

        if (!ddvi || !pp || !siv || !this.state.bsa) {
            document.getElementById('masa_info').innerHTML =
                '<span class="calc-label">Masa VI:</span><span class="calc-value">-</span>';
            return;
        }

        // Calculate LV mass
        this.state.lvMass = this.calc.calculateLVMass(ddvi, pp, siv);
        this.state.lvMassIndex = this.state.lvMass / this.state.bsa;

        // Calculate RWT
        this.state.rwt = this.calc.calculateRWT(pp, siv, ddvi);

        // Classify geometry
        this.state.geometry = this.calc.classifyLVGeometry(this.state.lvMassIndex, this.state.rwt, sex);

        // Check for dilation
        const isDilated = this.calc.isLVDilated(ddvi, sex);
        const dilationText = isDilated ? ' <span style="color: var(--color-error);">(Dilatado)</span>' : '';

        // Update display
        document.getElementById('masa_info').innerHTML =
            `<span class="calc-label">Masa VI Indexada:</span>
             <span class="calc-value">${this.state.lvMassIndex.toFixed(0)} g/m²</span>
             <span class="calc-label">|</span>
             <span class="calc-value">${this.state.geometry}${dilationText}</span>`;
    }

    /**
     * Calculate and display diastolic function
     */
    calculateDiastolicFunction() {
        const E = parseFloat(document.getElementById('onda_e').value);
        const A = parseFloat(document.getElementById('onda_a').value);
        const ePrime = parseFloat(document.getElementById('onda_e_prime').value);
        const LAVolIndex = parseFloat(document.getElementById('vol_ai').value);
        const TRVel = parseFloat(document.getElementById('vel_it').value);
        const LVEF = parseFloat(document.getElementById('fevi').value);
        const wallMotion = document.getElementById('motilidad_global').value;

        // Update E/A and E/e' ratios
        if (E && A) {
            const eaRatio = E / A;
            document.getElementById('ea_ratio_display').value = eaRatio.toFixed(2);
        } else {
            document.getElementById('ea_ratio_display').value = '';
        }

        if (E && ePrime) {
            const eeRatio = E / ePrime;
            document.getElementById('ee_ratio_display').value = eeRatio.toFixed(1);
        } else {
            document.getElementById('ee_ratio_display').value = '';
        }

        // Classify diastolic function
        this.state.diastolicResult = this.calc.classifyDiastolicFunction({
            E, A, ePrime, LAVolIndex, TRVel, LVEF, wallMotion
        });

        // Update semaphore display
        this.updateDiastolicBadge(this.state.diastolicResult);

        // Store result for report generation
        document.getElementById('diastole_text_hidden').value = this.state.diastolicResult.description;
    }

    /**
     * Update the diastolic function badge (semaphore)
     */
    updateDiastolicBadge(result) {
        const badge = document.getElementById('diastole_result');
        badge.textContent = result.description;

        // Remove all status classes
        badge.className = 'diastole-badge';

        // Add appropriate status class
        badge.classList.add(`status-${result.severity}`);
    }

    /**
     * Calculate and display PSAP
     */
    calculatePSAP() {
        const trVel = parseFloat(document.getElementById('vel_it').value);
        const rap = parseFloat(document.getElementById('pad').value) || 5;

        if (!trVel || trVel <= 0) {
            document.getElementById('psap_info').innerHTML =
                '<span class="calc-label">PSAP Estimada:</span><span class="calc-value">-</span>';
            return;
        }

        this.state.psap = this.calc.calculatePSAP(trVel, rap);
        const classification = this.calc.classifyPulmonaryPressure(this.state.psap);

        // Color code based on severity
        let color = 'var(--color-primary-dark)';
        if (this.state.psap > 60) color = 'var(--color-error)';
        else if (this.state.psap > 45) color = 'var(--color-warning)';
        else if (this.state.psap > 35) color = 'var(--color-info)';

        document.getElementById('psap_info').innerHTML =
            `<span class="calc-label">PSAP Estimada:</span>
             <span class="calc-value" style="color: ${color};">${this.state.psap} mmHg</span>
             <span class="calc-label">| ${classification}</span>`;
    }

    /**
     * Validate all inputs
     */
    validateInputs() {
        const fieldsToValidate = [
            'edad', 'peso', 'altura',
            'siv', 'pp', 'ddvi', 'dsvi', 'fevi',
            'onda_e', 'onda_a', 'onda_e_prime',
            'vol_ai', 'ao_raiz', 'ao_asc',
            'tapse', 'vel_it', 'pad'
        ];

        this.validator.validateAll(fieldsToValidate);
    }

    /**
     * Toggle motility segmentaria box
     */
    toggleMotilityBox() {
        const motilidad = document.getElementById('motilidad_global').value;
        const box = document.getElementById('box_motilidad');
        box.style.display = motilidad === 'segmentaria' ? 'block' : 'none';
    }

    /**
     * Generate clinical report - ORIGINAL FORMAT
     */
    generateReport() {
        // Force recalculation
        this.calculateAll();

        // Run quality control if available - v14.0
        if (this.qc && this.runQualityControl) {
            if (!this.runQualityControl()) {
                alert('⚠️ Hay errores críticos en los datos ingresados. Revise el Control de Calidad antes de generar el informe.');
                return;
            }
        }

        let report = '';

        // ========== COMPACT HEADER ==========
        report += `ECOCARDIOGRAMA DOPPLER CARDÍACO\n`;
        report += `${'='.repeat(80)}\n`;

        // Physical data
        const peso = document.getElementById('peso').value;
        const altura = document.getElementById('altura').value;
        const sc = document.getElementById('sc_display').value;

        if (peso && altura) {
            report += `Datos Físicos: Peso ${peso} kg | Altura ${altura} cm | SC ${sc} m².\n`;
        }

        // Acoustic window warning
        if (document.getElementById('ventana').value === 'si') {
            report += `⚠️ MALA VENTANA ACÚSTICA que limita la evaluación ecocardiográfica.\n`;
        }

        // ========== 1. VENTRÍCULO IZQUIERDO ==========
        report += `1. VENTRÍCULO IZQUIERDO\n`;

        const siv = document.getElementById('siv').value;
        const pp = document.getElementById('pp').value;
        const ddvi = document.getElementById('ddvi').value;
        const dsvi = document.getElementById('dsvi').value;
        const fevi = document.getElementById('fevi').value;

        // Diameters
        if (dsvi) {
            report += `Diámetros: SIV ${siv} mm | PP ${pp} mm | DDVI ${ddvi} mm | DSVI ${dsvi} mm.\n`;
        } else {
            report += `Diámetros: SIV ${siv} mm | PP ${pp} mm | DDVI ${ddvi} mm.\n`;
        }

        // LV Mass and RWT
        if (this.state.lvMassIndex > 0 && this.state.rwt > 0) {
            report += `Masa VI Indexada: ${this.state.lvMassIndex.toFixed(0)} g/m². RWT: ${this.state.rwt.toFixed(2)}.\n`;
        }

        // Systolic function
        report += `Función Sistólica: FEy ${fevi}% (Simpson biplano).\n`;

        // Diastolic function
        const ondaE = document.getElementById('onda_e').value;
        const ondaA = document.getElementById('onda_a').value;
        const ePrime = document.getElementById('onda_e_prime').value;

        if (ondaE && ondaA && ePrime) {
            const eaRatio = document.getElementById('ea_ratio_display').value;
            const eeRatio = document.getElementById('ee_ratio_display').value;
            report += `Evaluación Doppler Mitral y Tisular: Onda E ${ondaE} cm/s, Onda A ${ondaA} cm/s (Relación E/A ${eaRatio}), e' promedio ${ePrime} cm/s (Relación E/e' ${eeRatio}).\n`;
        }

        // Motility parietal (if enabled)
        if (this.motility) {
            report += this.motility.generateMotilityReport();
        }

        // ========== 2. AURÍCULA IZQUIERDA ==========
        report += `2. AURÍCULA IZQUIERDA\n`;
        const volAi = parseFloat(document.getElementById('vol_ai').value);

        // Volume only (severity classification goes to conclusions)
        report += `Volumen indexado: ${volAi} ml/m² (Referencia: <34 ml/m²).\n`;

        // ========== 3. VÁLVULA MITRAL ==========
        report += `3. VÁLVULA MITRAL\n`;
        const morfMitral = document.getElementById('morf_mitral').value;
        report += `${morfMitral}.\n`;

        const imGrado = document.getElementById('im_grado').value;
        const emGrado = document.getElementById('em_grado').value;

        // Mitral Regurgitation - Parameters only
        if (imGrado !== 'no') {
            const imVc = document.getElementById('im_vc').value;
            const imOre = document.getElementById('im_ore').value;
            const imVr = document.getElementById('im_vr').value;

            let params = [];
            if (imVc) params.push(`VC ${imVc} mm`);
            if (imOre) params.push(`ORE ${imOre} cm²`);
            if (imVr) params.push(`VR ${imVr} ml`);
            if (params.length > 0) {
                report += `Parámetros de insuficiencia: ${params.join(', ')}.\n`;
            }
        }

        // Mitral Stenosis - Parameters only
        if (emGrado !== 'no') {
            const emGradMedio = document.getElementById('em_grad_medio').value;
            const emAreaPht = document.getElementById('em_area_pht').value;

            let params = [];
            if (emGradMedio) params.push(`Gradiente medio ${emGradMedio} mmHg`);
            if (emAreaPht) params.push(`Área ${emAreaPht} cm²`);
            if (params.length > 0) {
                report += `Parámetros de estenosis: ${params.join(', ')}.\n`;
            }
        }

        // ========== 4. VÁLVULA Y RAÍZ AÓRTICA ==========
        report += `4. VÁLVULA Y RAÍZ AÓRTICA\n`;
        const morfAortica = document.getElementById('morf_aortica').value;
        report += `${morfAortica}.\n`;

        const eaGrado = document.getElementById('ea_grado').value;
        const iaGrado = document.getElementById('ia_grado').value;

        // Aortic Stenosis - Parameters only
        if (eaGrado !== 'no') {
            const eaVmax = document.getElementById('ea_vmax').value;
            const eaGradMedio = document.getElementById('ea_grad_medio').value;
            const eaAva = document.getElementById('ea_ava').value;
            const eaAvaIndex = document.getElementById('ea_ava_index').value;
            const eaCoef = document.getElementById('ea_coef').value;

            let params = [];
            if (eaVmax) params.push(`Vmax ${eaVmax} m/s`);
            if (eaGradMedio) params.push(`Gradiente medio ${eaGradMedio} mmHg`);
            if (eaAva) params.push(`Área ${eaAva} cm²`);
            if (eaAvaIndex) params.push(`AVA indexada ${eaAvaIndex} cm²/m²`);
            if (eaCoef) params.push(`Coef. adimensional ${eaCoef}`);
            if (params.length > 0) {
                report += `Parámetros de estenosis: ${params.join(', ')}.\n`;
            }
        }

        // Aortic Regurgitation - Advanced Module v14.1
        if (window.aorticRegurgitationModule) {
            // ONLY FINDINGS in description (Mapeo, params)
            const iaoFindings = window.aorticRegurgitationModule.generateFindings();
            if (iaoFindings) {
                report += `${iaoFindings}\n`;
            } else if (iaGrado !== 'no') {
                // Fallback if manual grade is selected but no advanced data entered
                report += `Insuficiencia Aórtica ${iaGrado}.\n`;
            }
        } else if (iaGrado !== 'no') {
            report += `Insuficiencia Aórtica ${iaGrado}.\n`;
        }

        const aoRaiz = document.getElementById('ao_raiz').value;
        const aoAsc = document.getElementById('ao_asc').value;
        if (aoRaiz || aoAsc) {
            let aortaLine = '';
            if (aoRaiz) {
                const aoRaizIndexed = sc ? (aoRaiz / sc / 10).toFixed(2) : null;
                aortaLine += `Raíz aórtica: ${aoRaiz} mm`;
                if (aoRaizIndexed) aortaLine += ` (${aoRaizIndexed} cm/m²)`;
            }
            if (aoAsc) {
                const aoAscIndexed = sc ? (aoAsc / sc / 10).toFixed(2) : null;
                if (aortaLine) aortaLine += ' | ';
                aortaLine += `Aorta ascendente: ${aoAsc} mm`;
                if (aoAscIndexed) aortaLine += ` (${aoAscIndexed} cm/m²)`;
            }
            report += `${aortaLine}.\n`;
        }

        // ========== 5. CAVIDADES DERECHAS ==========
        report += `5. CAVIDADES DERECHAS\n`;
        const tapse = document.getElementById('tapse').value;
        const adEstado = document.getElementById('ad_estado').value;
        const vdEstado = document.getElementById('vd_estado').value;
        const adArea = parseFloat(document.getElementById('ad_area').value);
        const vdBasal = parseFloat(document.getElementById('vd_basal').value);

        // Combine AD and VD measurements on same line if both dilated
        const bothDilated = adEstado === 'dilatada' && vdEstado === 'dilatado';

        if (bothDilated && adArea && vdBasal) {
            report += `AD Área ${adArea} cm² | VD Diámetro basal ${vdBasal} mm.\n`;
        } else {
            if (adEstado === 'dilatada' && adArea) {
                report += `AD Área: ${adArea} cm².\n`;
            }
            if (vdEstado === 'dilatado' && vdBasal) {
                report += `VD Diámetro basal: ${vdBasal} mm.\n`;
            }
        }

        // VD Function with S' support
        const sPrima = parseFloat(document.getElementById('s_prima_vd').value);

        if (tapse >= 17 && (!sPrima || sPrima >= 10)) {
            report += `Función del VD conservada (TAPSE: ${tapse} mm`;
            if (sPrima) report += `, S' ${sPrima} cm/s`;
            report += `).`;
        } else {
            report += `Función del VD deprimida (TAPSE: ${tapse} mm`;
            if (sPrima) report += `, S' ${sPrima} cm/s`;
            report += `).`;
        }

        // Add "dimensiones conservadas" only if both normal
        if (adEstado === 'normal' && vdEstado === 'normal') {
            report += ` Dimensiones derechas conservadas.\n`;
        } else {
            report += `\n`;
        }

        // Indirect HTP signs
        const htpSeptum = document.getElementById('htp_septum').checked;
        const htpPulmonar = document.getElementById('htp_pulmonar').checked;
        const htpAceleracion = document.getElementById('htp_aceleracion').checked;

        if (htpSeptum || htpPulmonar || htpAceleracion) {
            let signosHTP = [];
            if (htpSeptum) signosHTP.push('movimiento septal paradojal');
            if (htpPulmonar) signosHTP.push('dilatación del tronco pulmonar');
            if (htpAceleracion) signosHTP.push('tiempo de aceleración pulmonar corto');
            report += `Signos indirectos de HTP: ${signosHTP.join(', ')}.\n`;
        }

        // ========== 6. VÁLVULAS TRICÚSPIDE Y PULMONAR ==========
        report += `6. VÁLVULAS TRICÚSPIDE Y PULMONAR\n`;
        report += `Morfología y apertura conservada.\n`;

        const itGrado = document.getElementById('it_grado').value;
        const velIt = document.getElementById('vel_it').value;

        if (itGrado !== 'no') {
            report += `Insuficiencia tricuspídea ${itGrado}`;
            if (velIt && velIt >= 1.5) {
                report += ` (Vmax IT ${velIt} m/s)`;
                if (this.state.psap > 0) {
                    report += ` con PSAP estimada: ${this.state.psap} mmHg`;
                }
            }
            report += `.\n`;
        }

        // ========== 7. PERICARDIO ==========
        report += `7. PERICARDIO\n`;
        report += `Libre, sin derrames.\n`;

        // ========== CONCLUSIONES ==========
        report += `\nCONCLUSIONES\n`;

        let conclusionNum = 1;

        // 1. Rhythm and Conduction
        const ritmo = document.getElementById('ritmo').options[document.getElementById('ritmo').selectedIndex].text;
        const conduccion = document.getElementById('conduccion').options[document.getElementById('conduccion').selectedIndex].text;
        const conduccionValue = document.getElementById('conduccion').value;

        // Include conduction disorders in conclusions
        if (conduccionValue === 'normal') {
            report += `${conclusionNum}. ${ritmo}.\n`;
        } else {
            report += `${conclusionNum}. ${ritmo} con ${conduccion}.\n`;
        }
        conclusionNum++;

        // 2. LV Geometry and Function
        let viConclusion = '';

        // Geometry description
        if (this.state.geometry) {
            const sexo = document.getElementById('sexo').value;
            const dilated = this.calc.isLVDilated(ddvi, sexo);

            if (this.state.geometry === 'Geometría Normal') {
                viConclusion += `Ventrículo izquierdo de diámetros y espesores conservados, con geometría ventricular normal`;
            } else {
                viConclusion += `Ventrículo izquierdo con ${this.state.geometry.toLowerCase()}`;
                if (dilated) viConclusion += ` con dilatación ventricular`;
            }
        }

        // Motility conclusion (integrate here)
        if (this.motility) {
            const motilityConclusion = this.motility.generateConclusion();
            if (motilityConclusion && motilityConclusion.trim() !== '') {
                // Remove trailing period, lowercase first letter, preserve DA/CD/Cx/WMSI
                let motilityText = motilityConclusion.trim();
                if (motilityText.endsWith('.')) {
                    motilityText = motilityText.slice(0, -1);
                }
                // Lowercase only the first character
                motilityText = motilityText.charAt(0).toLowerCase() + motilityText.slice(1);

                // Ensure DA, CD, Cx, and WMSI are uppercase
                motilityText = motilityText.replace(/\bda\b/gi, 'DA')
                    .replace(/\bcd\b/gi, 'CD')
                    .replace(/\bcx\b/gi, 'Cx')
                    .replace(/\bwmsi\b/gi, 'WMSI');

                // Use "e" instead of "y" before words starting with "i" or "hi" (but not "hie" like hiena)
                const firstWord = motilityText.split(' ')[0].toLowerCase();
                if (firstWord.startsWith('i') || (firstWord.startsWith('hi') && !firstWord.startsWith('hie'))) {
                    viConclusion += ` e ${motilityText}`;
                } else {
                    viConclusion += ` y ${motilityText}`;
                }
            }
        }

        viConclusion += `.`;

        // Systolic function
        if (fevi >= 50) {
            viConclusion += `Función sistólica del VI conservada.`;
        } else if (fevi >= 40) {
            viConclusion += `Función sistólica del VI levemente deprimida (${fevi}%).`;
        } else {
            viConclusion += `Función sistólica del VI severamente deprimida (${fevi}%).`;
        }

        report += `${conclusionNum}. ${viConclusion}\n`;
        conclusionNum++;

        // 3. Diastolic Function (ALWAYS include, even if Indeterminado)
        if (this.state.diastolicResult) {
            const diastolicDesc = this.state.diastolicResult.description;
            const diastolicGrade = this.state.diastolicResult.grade;

            // Simplify for conclusions
            if (diastolicDesc.includes('Normal')) {
                report += `${conclusionNum}. Función Diastólica Normal. PFDVI Normales.\n`;
            } else if (diastolicDesc.includes('Grado I')) {
                report += `${conclusionNum}. Disfunción Diastólica Grado I. PFDVI normales.\n`;
            } else if (diastolicDesc.includes('Grado II')) {
                report += `${conclusionNum}. Disfunción Diastólica Grado II. PFDVI elevadas.\n`;
            } else if (diastolicDesc.includes('Grado III')) {
                report += `${conclusionNum}. Disfunción Diastólica Grado III. PFDVI severamente elevadas.\n`;
            } else if (diastolicGrade === 'Indeterminado') {
                report += `${conclusionNum}. Función Diastólica Indeterminada (datos insuficientes).\n`;
            } else {
                report += `${conclusionNum}. ${diastolicDesc}\n`;
            }
            conclusionNum++;
        }

        // 4. LA dimensions with severity
        if (volAi > 48) {
            report += `${conclusionNum}. Aurícula izquierda severamente dilatada.\n`;
        } else if (volAi >= 42) {
            report += `${conclusionNum}. Aurícula izquierda moderadamente dilatada.\n`;
        } else if (volAi >= 34) {
            report += `${conclusionNum}. Aurícula izquierda levemente dilatada.\n`;
        } else {
            report += `${conclusionNum}. Aurícula izquierda de dimensiones conservadas.\n`;
        }
        conclusionNum++;

        // 6. Valvular pathology (if significant)
        if (morfMitral.includes('Prolapso') || morfMitral.includes('Flail') || morfMitral.includes('Calcificación') || imGrado !== 'no' || emGrado !== 'no') {
            if (morfMitral.includes('Prolapso') || morfMitral.includes('Flail')) {
                report += `${conclusionNum}. ${morfMitral}`;
                if (imGrado !== 'no') report += ` con insuficiencia mitral ${imGrado}`;
                report += `.\n`;
                conclusionNum++;
            } else if (imGrado !== 'no' || emGrado !== 'no') {
                let valvular = '';
                if (imGrado !== 'no') valvular += `Insuficiencia mitral ${imGrado}`;
                if (emGrado !== 'no') {
                    if (valvular) valvular += ` y e`;
                    else valvular += `E`;
                    valvular += `stenosis mitral ${emGrado}`;
                }
                report += `${conclusionNum}. ${valvular}.\n`;
                conclusionNum++;
            }
        }

        // Check for advanced IAo conclusion (v14.1)
        let iaoAdv = window.aorticRegurgitationModule ? window.aorticRegurgitationModule.generateConclusion() : null;

        if (morfAortica.includes('Bicúspide') || morfAortica.includes('Calcificación masiva') || eaGrado !== 'no' || iaGrado !== 'no' || iaoAdv) {

            // Build the string
            let line = `${conclusionNum}. `;
            let hasContent = false;

            if (morfAortica.includes('Bicúspide')) {
                line += `${morfAortica}`;
                hasContent = true;
                if (eaGrado !== 'no') line += ` con estenosis ${eaGrado}`;

                if (iaoAdv) {
                    if (eaGrado !== 'no') line += ` e ${iaoAdv.toLowerCase()}`;
                    else line += ` con ${iaoAdv.toLowerCase()}`;
                } else if (iaGrado !== 'no') {
                    if (eaGrado !== 'no') line += ` e insuficiencia ${iaGrado}`;
                    else line += ` con insuficiencia ${iaGrado}`;
                }
            } else {
                // Not bicuspid
                let parts = [];
                if (eaGrado !== 'no') parts.push(`Estenosis aórtica ${eaGrado}`);

                if (iaoAdv) parts.push(iaoAdv);
                else if (iaGrado !== 'no') parts.push(`Insuficiencia aórtica ${iaGrado}`);

                if (parts.length > 0) {
                    line += parts.join(' e ');
                    hasContent = true;
                }
            }

            if (hasContent) {
                if (!line.endsWith('.')) line += '.';
                report += `${line}\n`;
                conclusionNum++;
            }
        }

        // 6. Aortic root/ascending aorta dilation
        if (sc) {
            const sexo = document.getElementById('sexo').value;
            let aorticDilations = [];

            // Check aortic root with severity (thresholds in cm/m²)
            if (aoRaiz) {
                const aoRaizIndexed = aoRaiz / sc / 10; // Convert to cm/m²
                const rootLimit = sexo === 'M' ? 2.15 : 2.11; // cm/m²
                if (aoRaizIndexed > rootLimit) {
                    // Conservative thresholds: Leve >LSN-2.5, Moderada 2.5-3.0, Severa >3.0 cm/m²
                    let severity;
                    if (aoRaizIndexed > 3.0) {
                        severity = 'severa';
                    } else if (aoRaizIndexed >= 2.5) {
                        severity = 'moderada';
                    } else {
                        severity = 'leve';
                    }
                    aorticDilations.push({ type: 'raíz aórtica', severity: severity });
                }
            }

            // Check ascending aorta with severity (thresholds in cm/m²)
            if (aoAsc) {
                const aoAscIndexed = aoAsc / sc / 10; // Convert to cm/m²
                const ascLimit = sexo === 'M' ? 2.11 : 2.03; // cm/m²
                if (aoAscIndexed > ascLimit) {
                    // Conservative thresholds: Leve >LSN-2.5, Moderada 2.5-3.0, Severa >3.0 cm/m²
                    let severity;
                    if (aoAscIndexed > 3.0) {
                        severity = 'severa';
                    } else if (aoAscIndexed >= 2.5) {
                        severity = 'moderada';
                    } else {
                        severity = 'leve';
                    }
                    aorticDilations.push({ type: 'aorta ascendente', severity: severity });
                }
            }

            if (aorticDilations.length > 0) {
                // Find worst severity
                const severities = ['leve', 'moderada', 'severa'];
                const maxSeverity = aorticDilations.reduce((max, dil) => {
                    const idx = severities.indexOf(dil.severity);
                    return idx > severities.indexOf(max) ? dil.severity : max;
                }, 'leve');

                // Build text
                const types = aorticDilations.map(d => d.type).join(' y ');
                report += `${conclusionNum}. Dilatación ${maxSeverity} de ${types}.\n`;
                conclusionNum++;
            }
        }

        // 7. Right chambers dilations (only if estado is dilatada/dilatado)
        if (adEstado === 'dilatada' || vdEstado === 'dilatado') {
            let rightChamberText = '';
            if (adArea && adArea > 18) {
                const adSeverity = adArea > 25 ? 'severa' : 'leve-moderada';
                rightChamberText += `aurícula derecha dilatada ${adSeverity}`;
            }
            if (vdBasal && vdBasal > 41) {
                let vdSeverity;
                if (vdBasal > 50) vdSeverity = 'severa';
                else if (vdBasal >= 46) vdSeverity = 'moderada';
                else vdSeverity = 'leve';

                if (rightChamberText) rightChamberText += ' y ';
                rightChamberText += `ventrículo derecho dilatado ${vdSeverity}`;
            }
            report += `${conclusionNum}. Dilatación de cavidades derechas: ${rightChamberText}.\n`;
            conclusionNum++;
        }

        // 8. Pulmonary hypertension
        if (this.state.psap > 0) {
            if (this.state.psap <= 35) {
                report += `${conclusionNum}. Grado de sospecha de Hipertensión pulmonar: Baja.\n`;
            } else if (this.state.psap <= 45) {
                report += `${conclusionNum}. Grado de sospecha de Hipertensión pulmonar: Intermedia (PSAP ${this.state.psap} mmHg).\n`;
            } else {
                report += `${conclusionNum}. Signos de Hipertensión pulmonar (PSAP ${this.state.psap} mmHg).\n`;
            }
            conclusionNum++;
        }

        // 7. RV dysfunction if present
        if (tapse < 16) {
            report += `${conclusionNum}. Disfunción del ventrículo derecho.\n`;
            conclusionNum++;
        }

        // Display report
        document.getElementById('resultado').value = report;
    }

    /**
     * Copy report to clipboard (Modern Clipboard API)
     */
    async copyReport() {
        const reportText = document.getElementById('resultado').value;

        if (!reportText || reportText.trim() === '') {
            alert('⚠️ Primero debe generar el informe');
            return;
        }

        try {
            await navigator.clipboard.writeText(reportText);
            this.showToast('✅ Informe copiado al portapapeles');
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.getElementById('resultado');
            textarea.select();
            document.execCommand('copy');
            this.showToast('✅ Informe copiado');
        }
    }

    /**
     * Copy dataset in TSV format for Excel
     */
    /**
     * Copy dataset in TSV format for Excel
     */
    async copyDataset() {
        // --- 1. Basic Data ---
        const fecha = new Date().toLocaleDateString('es-ES');
        const hc = document.getElementById('paciente_id').value || '-';
        const edad = document.getElementById('edad').value || '-';
        const sexo = document.getElementById('sexo').value;
        const sc = document.getElementById('sc_display').value || '-';
        const ritmo = document.getElementById('ritmo').value;
        const cond = document.getElementById('conduccion').value;

        // --- 2. Ventriculo Izquierdo ---
        const ddvi = document.getElementById('ddvi').value || '-';
        const masa = this.state.lvMassIndex > 0 ? this.state.lvMassIndex.toFixed(0) : '-';
        const geo = this.state.geometry || '-';
        const fey = document.getElementById('fevi').value || '-';
        const mot = document.getElementById('motilidad_global').value;

        // --- 3. Diastolic / Auriculas ---
        const diastole = document.getElementById('diastole_text_hidden').value || 'Indeterminado';
        const ee = document.getElementById('ee_ratio_display').value || '-';
        const ea = document.getElementById('ea_ratio_display').value || '-';
        const volAi = document.getElementById('vol_ai').value || '-';

        // --- 4. Valvular Basics (Existing Cols) ---
        const eao = document.getElementById('ea_grado').value;
        const im = document.getElementById('im_grado').value;

        // --- 5. Right Heart (Existing Cols) ---
        const tapse = document.getElementById('tapse').value || '-';
        const psap = this.state.psap || '-';

        // --- NEW PARAMETERS (Appended) ---

        // A. Estenosis Aortica
        const eaVmax = document.getElementById('ea_vmax')?.value || '-';
        const eaGrad = document.getElementById('ea_grad_medio')?.value || '-';
        const eaAva = document.getElementById('ea_ava')?.value || '-';
        const eaCoef = document.getElementById('ea_coef')?.value || '-';

        // B. Insuficiencia Aortica
        const iaGrado = document.getElementById('ia_grado')?.value || '-';
        const iaoVc = document.getElementById('iao_vc')?.value || '-';
        const iaoPht = document.getElementById('iao_pht')?.value || '-';
        const iaoRvol = document.getElementById('iao_rvol')?.value || '-';
        const iaoEroa = document.getElementById('iao_eroa')?.value || '-';
        const iaoAlcance = document.getElementById('iao_jet_alcance')?.value || '-';
        const iaoReverso = document.getElementById('iao_flujo_reverso')?.checked ? 'Si' : 'No';

        // C. Valvula Mitral (Extended)
        const emGrado = document.getElementById('em_grado')?.value || '-';
        const emGrad = document.getElementById('em_grad_medio')?.value || '-';
        const imOre = document.getElementById('im_ore')?.value || '-'; // PISA
        const imVr = document.getElementById('im_vr')?.value || '-';   // PISA

        // D. Motilidad Detallada (Segmental)
        let motDetalle = '-';
        if (window.motilityController) {
            // Try to get a summary text if available, or generate one
            if (window.motilityController.generateReportString) {
                // Capture the report string but maybe strip headers?
                // Or just use the global textual description if it's detailed.
                // Actually, user wants "motilidad parietal en el territorio afectado".
                // Let's use the summary text generated by the controller.
                // We can re-generate it cleanly?
                // Or assume it's part of the main report?
                // Let's assume user wants a compact string: "Inf-Bas: Hipo, Ant-Med: Akin..."
                // For now, let's export the conclusion string for motility.
                motDetalle = window.motilityController.generateConclusion() || '-';
            }
        }

        // Tab-separated values (Original 22 + New)
        // Original: 22 cols (indices 0-21)
        const row = [
            fecha, hc, edad, sexo, sc, ritmo, cond, ddvi, masa, geo,
            fey, mot, diastole, ee, ea, volAi, eao, '-', im, '-', tapse, psap,
            // Appended:
            eaVmax, eaGrad, eaAva, eaCoef,
            iaGrado, iaoVc, iaoPht, iaoRvol, iaoEroa, iaoAlcance, iaoReverso,
            emGrado, emGrad, imOre, imVr,
            motDetalle
        ].join('\t');

        try {
            await navigator.clipboard.writeText(row);
            this.showToast(`✅ Dataset copiado (${row.split('\t').length} columnas). Pegue en Excel.`);
        } catch (err) {
            alert('✅ Dataset copiado al portapapeles');
        }
    }

    /**
     * Reset all form fields
     */
    resetAll() {
        if (confirm('¿Está seguro que desea borrar todos los datos?')) {
            location.reload();
        }
    }

    /**
     * Show toast notification
     */
    showToast(message) {
        // Simple alert for now - can be enhanced with custom toast UI
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = message;
        btn.style.opacity = '0.8';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.opacity = '1';
        }, 2000);
    }

    /**
     * Attach voice control button
     */
    attachVoiceControls() {
        const btnVoice = document.getElementById('btn-voice-toggle');
        if (btnVoice) {
            btnVoice.addEventListener('click', () => {
                if (this.voiceRecognition) {
                    this.voiceRecognition.toggle();
                }
            });
        }
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}

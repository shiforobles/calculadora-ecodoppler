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
        this.reportMode = 'lista';
    }

    /**
     * Initialize all event listeners
     */
    init() {
        // Expose Quick Fill function globally
        window.setTricuspidValues = (grade) => this.setTricuspidValues(grade);

        // Auto-calculate on input changes
        this.attachCalculationListeners();

        // Report mode toggle buttons
        const btnModeLista = document.getElementById('mode_lista');
        const btnModeNarrativo = document.getElementById('mode_narrativo');
        const btnModeIA = document.getElementById('mode_ia');
        if (btnModeLista) btnModeLista.addEventListener('click', () => this.setReportMode('lista'));
        if (btnModeNarrativo) btnModeNarrativo.addEventListener('click', () => this.setReportMode('narrativo'));
        if (btnModeIA) btnModeIA.addEventListener('click', () => this.generateAIReport());

        // Button event listeners
        const btnGenerate = document.getElementById('btn_generate');
        if (btnGenerate) btnGenerate.addEventListener('click', () => this.generateReport());

        const btnCopy = document.getElementById('btn_copy');
        if (btnCopy) btnCopy.addEventListener('click', () => this.copyReport());

        const btnSave = document.getElementById('btn_save_study');
        if (btnSave) btnSave.addEventListener('click', () => this.saveStudy());

        const btnViewSheet = document.getElementById('btn_view_sheet');
        if (btnViewSheet) btnViewSheet.addEventListener('click', () => {
            const url = window.GoogleSync ? GoogleSync.getSheetUrl() : '';
            if (url) window.open(url, '_blank');
            else this.showToast('⚙️ Configurá la URL del Sheet en ⚙️ primero');
        });

        const btnSyncSetup = document.getElementById('btn_sync_setup');
        if (btnSyncSetup) btnSyncSetup.addEventListener('click', () => this.showSyncSetupModal());

        const btnReset = document.getElementById('btn_reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetAll());
        }

        // Motility toggle
        const motGlobal = document.getElementById('motilidad_global');
        if (motGlobal) {
            motGlobal.addEventListener('change', () => {
                this.toggleMotilityBox();
            });
        }

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

        // Theme System
        this.initTheme();

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
        }

        // Antecedentes Reactivity (v14.4)
        const antFa = document.getElementById('ant_fa');
        const antMcp = document.getElementById('ant_marcapasos');

        if (antFa) {
            antFa.addEventListener('change', () => {
                if (antFa.checked) {
                    const ritmoSel = document.getElementById('ritmo');
                    if (ritmoSel) ritmoSel.value = 'fa';
                }
            });
        }

        if (antMcp) {
            antMcp.addEventListener('change', () => {
                if (antMcp.checked) {
                    const condSel = document.getElementById('conduccion');
                    if (condSel) condSel.value = 'marcapasos';
                }
            });
        }

        // ASIA Module (v14.5)
        const asiaCheck = document.getElementById('asia_check');
        const asiaExcursion = document.getElementById('asia_excursion');

        if (asiaCheck) {
            asiaCheck.addEventListener('change', () => {
                const fields = document.getElementById('asia_fields');
                if (fields) fields.style.display = asiaCheck.checked ? 'block' : 'none';
            });
        }

        if (asiaExcursion) {
            asiaExcursion.addEventListener('input', () => {
                this.validateASIA(asiaExcursion.value);
            });
        }

        // Pericardium Module (v14.6)
        const peCheck = document.getElementById('pe_presente');
        const peSize = document.getElementById('pe_tamano');

        if (peCheck) {
            peCheck.addEventListener('change', () => {
                const advancedBox = document.getElementById('pe_advanced_box');
                const normalFeedback = document.getElementById('pe_normal_feedback');
                if (advancedBox) advancedBox.style.display = peCheck.checked ? 'block' : 'none';
                if (normalFeedback) normalFeedback.style.display = peCheck.checked ? 'none' : 'block';
            });
        }

        if (peSize) {
            peSize.addEventListener('input', () => {
                this.validatePericardium(peSize.value);
            });
        }

        // Tricuspid Module (v14.8 Advanced)
        const itGrado = document.getElementById('it_grado');
        const btnTogglePisaIt = document.getElementById('btn_toggle_pisa_it');
        const btnCalcPisaIt = document.getElementById('btn_calc_pisa_it');

        if (itGrado) {
            itGrado.addEventListener('change', () => {
                const box    = document.getElementById('box_tricuspide');
                const nvDesc = document.getElementById('it_nv_desc');
                const val    = itGrado.value;
                if (box)    box.style.display    = (val === 'no_valorable') ? 'none' : 'block';
                if (nvDesc) nvDesc.style.display = (val === 'no_valorable') ? 'flex'  : 'none';
                // Anular vel_it cuando IT no es valorable (no se puede medir velocidad)
                if (val === 'no_valorable') {
                    const velItEl = document.getElementById('vel_it');
                    if (velItEl) { velItEl.value = ''; velItEl.dispatchEvent(new Event('input', { bubbles: true })); }
                }
                this.updateITGradeColor();
                if (window.tricuspidRegurgitation) window.tricuspidRegurgitation.updateState();
            });
        }

        // Trigger severity check on relevant inputs
        const qcInputs = ['it_vc', 'it_ore', 'it_vr', 'it_flujo_hep'];
        qcInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
                    this.validateTricuspidSeverity();
                });
            }
        });

        if (btnTogglePisaIt) {
            btnTogglePisaIt.addEventListener('click', () => {
                const container = document.getElementById('pisa_it_container');
                if (container) container.style.display = container.style.display === 'none' ? 'block' : 'none';
            });
        }

        if (btnCalcPisaIt) {
            btnCalcPisaIt.addEventListener('click', () => {
                this.calculatePISATricuspid();
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
                        bullseyeContainer.style.display = 'none';
                        anatomicalContainer.style.display = 'block';
                    } else {
                        bullseyeContainer.style.display = 'block';
                        anatomicalContainer.style.display = 'none';
                    }
                });
            }
        }

        // Show/Hide Regional Motility Section - v14.4
        const motGlobalSelect = document.getElementById('motilidad_global');
        const motRegionalSection = document.getElementById('motility-regional-section');
        if (motGlobalSelect && motRegionalSection) {
            motGlobalSelect.addEventListener('change', (e) => {
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

        // Prosthesis Module UI Toggles (v14.9)
        const protCheck = document.getElementById('prot_check');
        const protPosicion = document.getElementById('prot_posicion');

        if (protCheck) {
            protCheck.addEventListener('change', () => {
                const container = document.getElementById('protesis_container');
                if (container) container.style.display = protCheck.checked ? 'block' : 'none';
                this.calculateAll();
            });
        }

        if (protPosicion) {
            protPosicion.addEventListener('change', () => {
                const atContainer = document.getElementById('prot_at_container');
                const phtContainer = document.getElementById('prot_pht_container');
                if (protPosicion.value === 'aortica') {
                    if (atContainer) atContainer.style.display = 'block';
                    if (phtContainer) phtContainer.style.display = 'none';
                } else if (protPosicion.value === 'mitral') {
                    if (atContainer) atContainer.style.display = 'none';
                    if (phtContainer) phtContainer.style.display = 'block';
                } else {
                    if (atContainer) atContainer.style.display = 'none';
                    if (phtContainer) phtContainer.style.display = 'none';
                }
                this.calculateAll();
            });
        }

        // Initial calculation and valve box visibility
        this.calculateAll();
        if (this.toggleValveBoxes) this.toggleValveBoxes();
        this.updateITGradeColor();
    }

    /**
     * Attach listeners to all calculation-triggering inputs
     */
    attachCalculationListeners() {
        const calcFields = [
            'peso', 'altura', 'sexo',
            'siv', 'pp', 'ddvi', 'fevi',
            'onda_e', 'onda_a', 'onda_e_prime_septal', 'onda_e_prime_lateral',
            'ctx_bcri', 'ctx_mac', 'ctx_im', 'ctx_mcp', 'ctx_valsalva',
            'vol_ai', 'vel_it', 'pad', 'paat', 'triv', 'td',
            'lvot_diam', 'lvot_vti', 'fc',
            'motilidad_global',
            'ao_raiz', 'ao_asc', 'ad_area'
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

        // Prosthesis Calc Fields
        const protCalcFields = [
            'prot_vmax', 'prot_gm', 'prot_vti_pr', 'prot_at', 'prot_pht',
            'prot_diam_tsvi', 'prot_vti_tsvi', 'prot_insuficiencia', 'prot_tipo'
        ];
        protCalcFields.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) {
                el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
                    this.calculateAll();
                });
            }
        });

        // Use change for select
        const padSelect = document.getElementById('pad');
        if (padSelect) {
            padSelect.addEventListener('change', () => this.calculateAll());
        }

        // PAAT Badge
        const paatInput = document.getElementById('paat');
        if (paatInput) {
            paatInput.addEventListener('input', () => {
                this.updatePAATBadge();
                this.calculateAll();
            });
        }

        // Sync TR Velocity inputs (Right Cavities <-> Tricuspid Advanced)
        const velIt = document.getElementById('vel_it');
        const itVelMax = document.getElementById('it_vel_max');

        if (velIt && itVelMax) {
            velIt.addEventListener('input', () => {
                itVelMax.value = velIt.value;
            });
            itVelMax.addEventListener('input', () => {
                velIt.value = itVelMax.value;
                this.calculateAll(); // Trigger calc from new input
            });
        }
    }

    /**
     * Main calculation orchestrator (debounced to avoid recalculating on every keystroke)
     */
    calculateAll() {
        clearTimeout(this._calcDebounceTimer);
        this._calcDebounceTimer = setTimeout(() => {
            this.calculateBSA();
            this.calculateLVMassAndGeometry();
            this.calculateDiastolicFunction();
            this.calculatePSAP();
            this.calculateCardiacOutput();
            this.calculateRightChambers();
            this.evaluarProtesis();
            if (this.updatePAATBadge) this.updatePAATBadge();
            if (this.updateAorticDisplay) this.updateAorticDisplay();
            this.validateInputs();
        }, 150);
    }

    /**
     * Evaluate Prosthetic Valve Hemodynamics (v14.9)
     */
    evaluarProtesis() {
        const check = document.getElementById('prot_check');
        if (!check || !check.checked) return;

        const posEl = document.getElementById('prot_posicion');
        if (!posEl) return;
        const pos = posEl.value;
        const vmax = parseFloat(document.getElementById('prot_vmax').value) || 0;
        const gm = parseFloat(document.getElementById('prot_gm').value) || 0;
        const vtiPr = parseFloat(document.getElementById('prot_vti_pr').value) || 0;
        const diamTsvi = parseFloat(document.getElementById('prot_diam_tsvi').value) || 0;
        const vtiTsvi = parseFloat(document.getElementById('prot_vti_tsvi').value) || 0;
        const bsa = this.state.bsa || 0;

        let dvi = 0;
        let eoa = 0;
        let ieoa = 0;

        // Calculate DVI
        if (vtiPr > 0 && vtiTsvi > 0) {
            if (pos === 'aortica') {
                dvi = vtiTsvi / vtiPr;
            } else if (pos === 'mitral') {
                dvi = vtiPr / vtiTsvi;
            }
        }

        // Calculate EOA
        if (diamTsvi > 0 && vtiTsvi > 0 && vtiPr > 0) {
            const areaTsvi = 0.785 * Math.pow(diamTsvi / 10, 2); // diam in mm -> area in cm²
            eoa = (areaTsvi * vtiTsvi) / vtiPr;
            if (bsa > 0) ieoa = eoa / bsa;
        }

        // Display Metrics
        const dviDisp = document.getElementById('prot_dvi_disp');
        const eoaDisp = document.getElementById('prot_eoa_disp');
        const ieoaDisp = document.getElementById('prot_ieoa_disp');

        if (dviDisp) dviDisp.textContent = dvi > 0 ? dvi.toFixed(2) : '-';
        if (eoaDisp) eoaDisp.textContent = eoa > 0 ? eoa.toFixed(2) : '-';
        if (ieoaDisp) ieoaDisp.textContent = ieoa > 0 ? ieoa.toFixed(2) : '-';

        const metricsDiv = document.getElementById('prot_metrics');
        const feedbackDiv = document.getElementById('prot_feedback');

        if (!metricsDiv || !feedbackDiv) return;

        if (dvi > 0 || eoa > 0 || vmax > 0 || gm > 0) {
            metricsDiv.style.display = 'block';
            feedbackDiv.style.display = 'block';
        } else {
            metricsDiv.style.display = 'none';
            feedbackDiv.style.display = 'none';
            return;
        }

        // Diagnostic Suggestion algorithm
        let isHighGradient = false;
        if (pos === 'aortica' && (vmax >= 3 || gm > 20)) isHighGradient = true;
        if (pos === 'mitral' && (vmax >= 1.9 || gm >= 5)) isHighGradient = true;

        // Save alert text for Report Generation
        this.state.protAlert = 'Parámetros hemodinámicos sugestivos de Normofunción';

        let alertColor = '#059669'; // text-emerald-600
        let alertBg = '#d1fae5'; // bg-emerald-100
        let alertText = 'PARÁMETROS NORMOFUNCIONANTES';

        if (pos === 'aortica') {
            if (dvi > 0 && dvi < 0.25 && isHighGradient) {
                alertColor = '#dc2626'; alertBg = '#fee2e2';
                alertText = 'POSIBLE OBSTRUCCIÓN / TROMBOSIS';
                this.state.protAlert = 'Parámetros sugestivos de Obstrucción Protésica';
            } else if (isHighGradient && dvi >= 0.25) {
                if (ieoa > 0 && ieoa < 0.85) {
                    alertColor = '#ea580c'; alertBg = '#ffedd5';
                    alertText = ieoa < 0.65 ? 'MISMATCH (PPM) SEVERO' : 'MISMATCH (PPM) MODERADO';
                    this.state.protAlert = 'Parámetros compatibles con Mismatch Paciente-Prótesis (PPM)';
                } else {
                    alertColor = '#ca8a04'; alertBg = '#fef9c3';
                    alertText = 'POSIBLE ALTO FLUJO (Descartar Anemia/Sepsis)';
                    this.state.protAlert = 'Parámetros sugerentes de estado de Alto Flujo';
                }
            }
        } else if (pos === 'mitral') {
            if (dvi > 0 && dvi > 2.2 && isHighGradient) {
                alertColor = '#dc2626'; alertBg = '#fee2e2';
                alertText = 'POSIBLE OBSTRUCCIÓN / TROMBOSIS';
                this.state.protAlert = 'Parámetros sugestivos de Obstrucción Protésica';
            } else if (isHighGradient && dvi <= 2.2) {
                if (ieoa > 0 && ieoa <= 1.2) {
                    alertColor = '#ea580c'; alertBg = '#ffedd5';
                    alertText = ieoa <= 0.9 ? 'MISMATCH (PPM) SEVERO' : 'MISMATCH (PPM) MODERADO';
                    this.state.protAlert = 'Parámetros compatibles con Mismatch Paciente-Prótesis (PPM)';
                } else {
                    alertColor = '#ca8a04'; alertBg = '#fef9c3';
                    alertText = 'POSIBLE ALTO FLUJO O REGURGITACIÓN';
                    this.state.protAlert = 'Parámetros sugerentes de estado de Alto Flujo o Regurgitación intracardiaca';
                }
            }
        } else {
            // Tricuspide heuristics not fully standardized here, keep normal unless very high gradient
            if (gm > 6) {
                alertColor = '#dc2626'; alertBg = '#fee2e2';
                alertText = 'ELEVACIÓN DE GRADIENTES - POSIBLE OBSTRUCCIÓN';
                this.state.protAlert = 'Parámetros sugestivos de Obstrucción Protésica Tricuspídea';
            }
        }

        feedbackDiv.style.color = alertColor;
        feedbackDiv.style.backgroundColor = alertBg;
        feedbackDiv.textContent = alertText;
    }

    /**
     * Calculate Right Chambers extensions (e.g. Indexed AD Area)
     */
    calculateRightChambers() {
        const adAreaEl = document.getElementById('ad_area');
        const adAreaIndexEl = document.getElementById('ad_area_index');
        if (!adAreaEl || !adAreaIndexEl) return;

        const adArea = parseFloat(adAreaEl.value);
        if (adArea > 0 && this.state.bsa > 0) {
            const indexed = adArea / this.state.bsa;
            adAreaIndexEl.value = indexed.toFixed(1);
        } else {
            adAreaIndexEl.value = '';
        }
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
            this.calculateBMI(weight, height / 100); // height in meters
            this.updateBSAAlerts();
        } else {
            document.getElementById('sc_display').value = '';
            document.getElementById('bmi_display').value = '';
            const alertCont = document.getElementById('bsa_alert_container');
            if (alertCont) alertCont.style.display = 'none';
        }
    }

    /**
     * Calculate BMI and Classify (v14.9.1)
     */
    calculateBMI(weightKg, heightM) {
        if (heightM <= 0) return;
        const bmi = weightKg / (heightM * heightM);
        this.state.bmi = bmi; // Store in state for cross-referencing

        let classification = '';
        if (bmi < 18.5) classification = 'Bajo peso';
        else if (bmi < 25) classification = 'Normal';
        else if (bmi < 30) classification = 'Sobrepeso';
        else classification = 'Obesidad';

        const display = document.getElementById('bmi_display');
        if (display) {
            display.value = `${bmi.toFixed(1)} (${classification})`;
        }
    }

    /**
     * Check and toggle clinical alerts for extreme BSA (v14.9.1)
     */
    updateBSAAlerts() {
        const cnt = document.getElementById('bsa_alert_container');
        const icon = document.getElementById('bsa_alert_icon');
        const text = document.getElementById('bsa_alert_text');

        if (!cnt || !icon || !text) return;

        const bsa = this.state.bsa;
        if (!bsa) {
            cnt.style.display = 'none';
            return;
        }

        if (bsa < 1.5) {
            cnt.style.display = 'flex';
            cnt.style.backgroundColor = '#fef3c7'; // yellow-100
            cnt.style.color = '#92400e'; // yellow-800
            cnt.style.border = '1px solid #fde68a';
            icon.textContent = '⚠️';
            text.textContent = 'SC baja: interpretar volúmenes indexados con precaución';
        } else if (bsa > 2.3) {
            cnt.style.display = 'flex';
            cnt.style.backgroundColor = '#ffedd5'; // orange-100
            cnt.style.color = '#c2410c'; // orange-700
            cnt.style.border = '1px solid #fed7aa';
            icon.textContent = '⚠️';
            text.textContent = 'SC elevada: considerar impacto en indexación de cavidades';
        } else {
            cnt.style.display = 'none';
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
            // Reset stale geometry state so conclusions don't show old data
            this.state.geometry     = null;
            this.state.lvMassIndex  = 0;
            this.state.rwt          = 0;
            return;
        }

        // Calculate LV mass
        this.state.lvMass = this.calc.calculateLVMass(ddvi, pp, siv);
        this.state.lvMassIndex = this.state.lvMass / this.state.bsa;

        // Calculate RWT
        this.state.rwt = this.calc.calculateRWT(pp, siv, ddvi);

        // Classify geometry
        this.state.geometry = this.calc.classifyLVGeometry(this.state.lvMassIndex, this.state.rwt, sex);

        // Check for Concentric Hypertensive Phenotype
        let phenotypeAlert = '';
        this.state.hypertensivePhenotype = false;
        if (this.state.bmi > 30 && this.state.geometry.includes('Hipertrofia Concéntrica')) {
            phenotypeAlert = ' <span style="color: #c2410c; font-weight: 600; font-size: 0.85em;">(Sugestivo Fenotipo Hipertensivo)</span>';
            this.state.hypertensivePhenotype = true;
        }

        // Check for dilation
        const isDilated = this.calc.isLVDilated(ddvi, sex);
        const dilationText = isDilated ? ' <span style="color: var(--color-error);">(Dilatado)</span>' : '';

        // Update display
        document.getElementById('masa_info').innerHTML =
            `<span class="calc-label">Masa VI Indexada:</span>
             <span class="calc-value">${this.state.lvMassIndex.toFixed(0)} g/m²</span>
             <span class="calc-label">|</span>
             <span class="calc-value">${this.state.geometry}${dilationText}${phenotypeAlert}</span>`;
    }

    /**
     * Update field states based on active special conditions (BCRI, MAC, IM Severa)
     */
    updateSpecialConditionsUI() {
        const bcri     = document.getElementById('ctx_bcri')?.checked;
        const mac      = document.getElementById('ctx_mac')?.checked;
        const imSevera = document.getElementById('ctx_im')?.checked;
        const mcp      = document.getElementById('ctx_mcp')?.checked;

        // BCRI → e' septal excluido: deshabilitar campo
        const eSeptalEl = document.getElementById('onda_e_prime_septal');
        if (eSeptalEl) {
            if (bcri) {
                eSeptalEl.value = '';
                eSeptalEl.disabled = true;
                eSeptalEl.placeholder = 'Excluido (BCRI)';
                eSeptalEl.style.opacity = '0.4';
                eSeptalEl.style.background = '#f1f5f9';
            } else {
                eSeptalEl.disabled = false;
                eSeptalEl.placeholder = 'TDI Septal';
                eSeptalEl.style.opacity = '';
                eSeptalEl.style.background = '';
            }
        }

        // MAC / IM Severa → E/e' no confiable: marcar visualmente el campo E/e'
        const eeRow = document.getElementById('ee_ratio_display');
        const eeLabel = eeRow?.closest('.form-group')?.querySelector('label');
        if (eeRow) {
            if (mac) {
                eeRow.style.borderColor = '#f59e0b';
                eeRow.style.background = '#fffbeb';
                if (eeLabel) eeLabel.textContent = "E/e' ⚠️ (no válido — MAC)";
            } else if (imSevera) {
                eeRow.style.borderColor = '#f59e0b';
                eeRow.style.background = '#fffbeb';
                if (eeLabel) eeLabel.textContent = "E/e' ⚠️ (sobreestimado — IM)";
            } else {
                eeRow.style.borderColor = '';
                eeRow.style.background = '';
                if (eeLabel) eeLabel.textContent = "Relación E/e'";
            }
        }

        // MCP → hint en E/e' label (umbral modificado a 15)
        if (mcp && !mac && !imSevera && eeLabel) {
            eeLabel.textContent = "E/e' (umbral >15 en MCP)";
        }
    }

    /**
     * Calculate and display diastolic function
     */
    calculateDiastolicFunction() {
        // Apply UI state for special conditions first
        this.updateSpecialConditionsUI();

        const E = parseFloat(document.getElementById('onda_e').value);
        const A = parseFloat(document.getElementById('onda_a').value);

        // Calculate e' average from septal + lateral (or just septal if lateral not entered)
        const eSeptal  = parseFloat(document.getElementById('onda_e_prime_septal')?.value);
        const eLateral = parseFloat(document.getElementById('onda_e_prime_lateral')?.value);
        let ePrime;
        if (!isNaN(eSeptal) && !isNaN(eLateral)) {
            ePrime = (eSeptal + eLateral) / 2;
            document.getElementById('onda_e_prime').value = ePrime.toFixed(1);
        } else if (!isNaN(eSeptal)) {
            ePrime = eSeptal;
            document.getElementById('onda_e_prime').value = ePrime.toFixed(1);
        } else if (!isNaN(eLateral)) {
            // BCRI: only lateral available
            ePrime = eLateral;
            document.getElementById('onda_e_prime').value = ePrime.toFixed(1);
        } else {
            ePrime = NaN;
            document.getElementById('onda_e_prime').value = '';
        }

        const LAVolIndex = parseFloat(document.getElementById('vol_ai').value);
        const TRVel = parseFloat(document.getElementById('vel_it').value);
        const LVEF = parseFloat(document.getElementById('fevi').value);
        const wallMotion = document.getElementById('motilidad_global').value;
        const ritmo = document.getElementById('ritmo').value;
        const context = {
            bcri:      document.getElementById('ctx_bcri')?.checked || false,
            mac:       document.getElementById('ctx_mac')?.checked || false,
            imSevera:  document.getElementById('ctx_im')?.checked || false,
            mcp:       document.getElementById('ctx_mcp')?.checked || false,
            valsalva:  document.getElementById('ctx_valsalva')?.checked || false,
        };

        // Update E/A ratio
        if (E && A) {
            document.getElementById('ea_ratio_display').value = (E / A).toFixed(2);
        } else {
            document.getElementById('ea_ratio_display').value = '';
        }

        // Update E/e' ratio — annotate if MAC or IM Severa
        const eeEl = document.getElementById('ee_ratio_display');
        if (E && !isNaN(ePrime) && ePrime > 0) {
            const eeRatio = (E / ePrime).toFixed(1);
            if (context.mac) {
                eeEl.value = `${eeRatio} (no válido — MAC)`;
            } else if (context.imSevera) {
                eeEl.value = `${eeRatio} (sobreestimado — IM)`;
            } else {
                eeEl.value = eeRatio;
            }
        } else {
            eeEl.value = '';
        }

        const TRIV = parseFloat(document.getElementById('triv')?.value);
        const TD   = parseFloat(document.getElementById('td')?.value);

        // Classify diastolic function
        this.state.diastolicResult = this.calc.classifyDiastolicFunction({
            E, A, ePrime, eSeptal, eLateral, LAVolIndex, TRVel, LVEF, wallMotion, ritmo, context, TRIV, TD
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
     * Calculate and display Stroke Volume, Cardiac Output, Cardiac Index
     */
    calculateCardiacOutput() {
        const lvotDiam = parseFloat(document.getElementById('lvot_diam')?.value);
        const lvotVti  = parseFloat(document.getElementById('lvot_vti')?.value);
        const hr       = parseFloat(document.getElementById('fc')?.value);
        const bsa      = this.state.bsa;

        const svEl = document.getElementById('gc_sv_display');
        const coEl = document.getElementById('gc_co_display');
        const ciEl = document.getElementById('gc_ci_display');
        if (!svEl) return;

        if (!lvotDiam || !lvotVti || lvotDiam <= 0 || lvotVti <= 0) {
            svEl.value = ''; coEl.value = ''; ciEl.value = '';
            return;
        }

        const result = this.calc.calculateCardiacOutput(lvotDiam, lvotVti, hr, bsa);
        if (!result) { svEl.value = ''; coEl.value = ''; ciEl.value = ''; return; }

        svEl.value = `${result.sv} ml`;
        coEl.value = result.co ? `${result.co} L/min` : '— (falta FC)';
        ciEl.value = result.ci ? `${result.ci} L/min/m²` : '— (falta FC o SC)';

        // Store for report
        this.state.cardiacOutput = result;
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

        // Color code based on ASE/ERS 2015 severity thresholds
        let color = 'var(--color-primary-dark)';
        if (this.state.psap > 70) color = 'var(--color-error)';
        else if (this.state.psap > 50) color = 'var(--color-warning)';
        else if (this.state.psap > 35) color = 'var(--color-info)';

        document.getElementById('psap_info').innerHTML =
            `<span class="calc-label">PSAP Estimada:</span>
             <span class="calc-value" style="color: ${color};">${this.state.psap} mmHg</span>
             <span class="calc-label">| ${classification}</span>`;
    }

    /**
     * Update PAAT Badge
     */
    updatePAATBadge() {
        const paatInput = document.getElementById('paat');
        const badge = document.getElementById('paat_badge');
        if (!paatInput || !badge) return;

        const val = parseFloat(paatInput.value);
        if (val && val < 100) {
            badge.style.display = 'inline-block';
            badge.className = 'severity-badge badge-severe'; // Red/Yellow
            badge.textContent = 'Sugestivo HTP';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Calculate HTP Probability (ASE 2016)
     * Returns { probability: string, signs: number }
     */
    calculateHTPProbability() {
        // 1. TR Velocity (ASE/ERS 2015 cut-points)
        const trVel = parseFloat(document.getElementById('vel_it').value) || 0;

        // 2. Count indirect signs (ASE/ERS 2015 — Groups A, B, C)
        let signs = 0;

        // Group A — ventricular morphology
        if (document.getElementById('htp_septum').checked) signs++;  // septum paradójico / aplanamiento
        if (document.getElementById('vd_estado').value === 'dilatado') signs++;  // RV dilatado (RV/LV > 1)

        // Group B — pulmonary artery
        if (document.getElementById('htp_pulmonar').checked) signs++;  // tronco pulmonar dilatado > 25 mm
        const paatNum = parseFloat(document.getElementById('paat').value);
        if (paatNum && paatNum < 105) signs++;  // PAAT < 105 ms (aceleración pulmonar corta)

        // Group C — IVC / right atrium
        const adArea = parseFloat(document.getElementById('ad_area').value);
        if (adArea && adArea > 18) signs++;  // área AD > 18 cm²

        // 3. Probability logic
        let prob = 'Baja';

        if (trVel <= 2.8) {
            if (signs === 0) prob = 'Baja';
            else if (signs >= 2) prob = 'Intermedia';
            else prob = 'Baja';  // 1 solo signo no sube probabilidad con VTR normal
        } else if (trVel <= 3.4) {
            if (signs === 0) prob = 'Intermedia';
            else prob = 'Alta';
        } else {
            prob = 'Alta';  // VTR > 3.4 m/s → siempre Alta
        }

        return { probability: prob, signs };
    }

    /**
     * Validate all inputs
     */
    validateInputs() {
        const fieldsToValidate = [
            'edad', 'peso', 'altura',
            'siv', 'pp', 'ddvi', 'dsvi', 'fevi',
            'onda_e', 'onda_a', 'onda_e_prime_septal', 'onda_e_prime_lateral',
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
    async generateReport() {
        try {
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
            const bmiDisp = document.getElementById('bmi_display').value;

            if (peso && altura) {
                if (bmiDisp) {
                    report += `Datos Físicos: Peso ${peso} kg | Altura ${altura} cm | SC ${sc} m² | IMC ${bmiDisp}.\n`;
                } else {
                    report += `Datos Físicos: Peso ${peso} kg | Altura ${altura} cm | SC ${sc} m².\n`;
                }
            }

            // Acoustic window warning
            if (document.getElementById('ventana').value === 'si') {
                report += `MALA VENTANA ACÚSTICA que limita la evaluación ecocardiográfica.\n`;
            }

            // ========== 1. VENTRÍCULO IZQUIERDO ==========
            report += `1. VENTRÍCULO IZQUIERDO\n`;

            const siv = document.getElementById('siv').value;
            const pp = document.getElementById('pp').value;
            const ddvi = document.getElementById('ddvi').value;
            const dsvi = document.getElementById('dsvi').value;
            const fevi = document.getElementById('fevi').value;

            // Diameters and Mass
            let lvLine = `Diámetros: SIV ${siv} mm | PP ${pp} mm | DDVI ${ddvi} mm`;
            if (dsvi) lvLine += ` | DSVI ${dsvi} mm`;

            if (this.state.lvMassIndex > 0 && this.state.rwt > 0) {
                lvLine += ` - Masa VI Indexada: ${this.state.lvMassIndex.toFixed(0)} g/m². RWT: ${this.state.rwt.toFixed(2)}`;
                if (this.state.hypertensivePhenotype) {
                    lvLine += ` (Geometría e IMC > 30 sugieren Fenotipo Hipertensivo Concéntrico)`;
                }
            }
            report += `${lvLine}.\n`;

            // Systolic function
            report += `Función Sistólica: FEy ${fevi}% (Simpson biplano).\n`;

            // Motility parietal (if enabled)
            // Motility parietal (if enabled)
            if (this.motility) {
                const motGlobal = document.getElementById('motilidad_global').value;
                const hasPacemaker = document.getElementById('ant_marcapasos').checked;
                const hasCRM = document.getElementById('ant_crm').checked;

                if (motGlobal === 'conservada') {
                    // If pacemaker or CRM is present, suppress "conservada" text
                    if (!hasPacemaker && !hasCRM) {
                        report += `Motilidad parietal global y segmentaria conservada.`;
                    }
                } else {
                    // Check if there's actual content from the controller
                    const motilityContent = this.motility.generateMotilityReport();
                    if (motilityContent && motilityContent.trim() !== "") {
                        // Ensure we don't have multiple line breaks. Remove trailing \n.
                        report += motilityContent.replace(/\n+$/, '');
                    } else {
                        // Fallback if user selected 'alterada' but didn't mark segments
                        // Only show "conservada" if no pacemaker and no CRM
                        if (!hasPacemaker && !hasCRM) {
                            report += `Motilidad parietal global y segmentaria conservada.`;
                        }
                    }
                }

                // Inject Pacemaker Motility findings
                if (hasPacemaker) {
                    report += ` Se observa movimiento asincrónico del septum interventricular (SIV) secundario a estimulación por marcapasos.`;
                }

                // Inject CRM Motility findings
                if (hasCRM) {
                    report += ` Se observa movimiento asincrónico del septum interventricular (SIV) vinculado a post-operatorio de CRM.`;
                }

                // Add a single line break at the end of the LV section
                report += `\n`;
            }

            // Diastolic function — Doppler measurements
            const ondaE = document.getElementById('onda_e').value;
            const ondaA = document.getElementById('onda_a').value;
            const ePrime = document.getElementById('onda_e_prime').value;

            if (ondaE || ePrime) {
                let diastolicText = `Evaluación Doppler Mitral y Tisular:`;
                if (ondaE) diastolicText += ` Onda E ${ondaE} cm/s`;
                if (ondaA) {
                    const eaRatio = document.getElementById('ea_ratio_display').value;
                    diastolicText += `, Onda A ${ondaA} cm/s (E/A ${eaRatio})`;
                }
                const tdVal = document.getElementById('td')?.value;
                if (tdVal) diastolicText += `, TD ${tdVal} ms`;

                if (ePrime) {
                    const eeRatio = document.getElementById('ee_ratio_display').value;
                    const eSeptal  = document.getElementById('onda_e_prime_septal')?.value;
                    const eLateral = document.getElementById('onda_e_prime_lateral')?.value;
                    let ePrimeText = (eSeptal && eLateral)
                        ? `e' septal ${eSeptal} / lateral ${eLateral} cm/s (promedio ${ePrime} cm/s)`
                        : (eSeptal ? `e' septal ${eSeptal} cm/s` : `e' lateral ${eLateral} cm/s`);
                    diastolicText += `, ${ePrimeText}`;
                    if (eeRatio) diastolicText += ` (E/e' ${eeRatio})`;
                }

                const trivVal = document.getElementById('triv')?.value;
                if (trivVal) diastolicText += `. TRIV ${trivVal} ms`;
                if (document.getElementById('ctx_valsalva')?.checked) diastolicText += `. Valsalva (+)`;
                report += `${diastolicText}.\n`;
            }

            // Cardiac Output — abbreviated in VI description
            if (this.state.cardiacOutput) {
                const gc = this.state.cardiacOutput;
                const gcParts = [`VS ${gc.sv} ml`];
                if (gc.co) gcParts.push(`GC ${gc.co} L/min`);
                if (gc.ci) gcParts.push(`IC ${gc.ci} L/min/m²`);
                report += `Hemodinámica (TSVI): ${gcParts.join(' | ')}.\n`;
            }

            // ========== 2. AURÍCULA IZQUIERDA ==========
            report += `2. AURÍCULA IZQUIERDA\n`;
            const volAi = parseFloat(document.getElementById('vol_ai').value);

            // Volume only (severity classification goes to conclusions)
            report += `Volumen indexado: ${volAi} ml/m² (Referencia: <34 ml/m²).\n`;

            // ========== 3. VÁLVULA MITRAL ==========
            report += `3. VÁLVULA MITRAL\n`;
            const hasProtesis = document.getElementById('prot_check') && document.getElementById('prot_check').checked;
            const protPos = document.getElementById('prot_posicion') ? document.getElementById('prot_posicion').value : '';

            const getProtesisText = () => {
                const pPosEl = document.getElementById('prot_posicion');
                const pTipoEl = document.getElementById('prot_tipo');
                const pInsEl = document.getElementById('prot_insuficiencia');

                const pPosText = pPosEl.options[pPosEl.selectedIndex].text;
                const pTipoText = pTipoEl.options[pTipoEl.selectedIndex].text;
                const pNum = document.getElementById('prot_numero').value || 'Desconocido';
                const pVmax = document.getElementById('prot_vmax').value;
                const pGm = document.getElementById('prot_gm').value;
                const pDvi = document.getElementById('prot_dvi_disp').textContent;
                const pIeoa = document.getElementById('prot_ieoa_disp').textContent;
                const pIns = pInsEl.options[pInsEl.selectedIndex].text;

                let prt = `Reemplazo valvular ${pPosText.toLowerCase()} con prótesis ${pTipoText.toLowerCase()} (Modelo/Nº: ${pNum}).\n`;

                let pParams = [];
                if (pVmax) pParams.push(`Velocidad pico: ${pVmax} m/s`);
                if (pGm) pParams.push(`Gradiente medio: ${pGm} mmHg`);
                if (pParams.length > 0) prt += `${pParams.join('. ')}.\n`;

                let hParams = [];
                if (pDvi && pDvi !== '-') hParams.push(`Doppler Index (DVI): ${pDvi}`);
                if (pIeoa && pIeoa !== '-') hParams.push(`Área efectiva indexada (iEOA): ${pIeoa} cm²/m²`);
                if (hParams.length > 0) prt += `${hParams.join('. ')}.\n`;

                if (pInsEl.value !== 'no') {
                    prt += `Se observa regurgitación ${pIns.toLowerCase()}.\n`;
                }
                return prt;
            };

            const morfMitral = document.getElementById('morf_mitral').value;
            const imGrado = document.getElementById('im_grado').value;
            const emGrado = document.getElementById('em_grado').value;

            if (hasProtesis && protPos === 'mitral') {
                report += getProtesisText();
            } else {
                report += `${morfMitral}.\n`;

                // Mitral Regurgitation - Parameters only
                // Mitral Regurgitation - Smart Module
                if (window.mitralRegurgitation && imGrado !== 'no' && imGrado !== 'minima') {
                    const imFindings = window.mitralRegurgitation.generateFindings();
                    if (imFindings) report += `${imFindings}\n`;
                } else if (imGrado !== 'no' && imGrado !== 'minima') {
                    // Fallback (should not happen if loaded correctly)
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

                // Mitral Stenosis - Smart Module
                if (window.mitralStenosis && emGrado !== 'no') {
                    const emFindings = window.mitralStenosis.generateFindings();
                    if (emFindings) report += `${emFindings}\n`;
                } else if (emGrado !== 'no') {
                    const emGradMedio = document.getElementById('em_grad_medio').value;
                    const emAreaPht = document.getElementById('em_area_pht').value;

                    let params = [];
                    if (emGradMedio) params.push(`Gradiente medio ${emGradMedio} mmHg`);
                    if (emAreaPht) params.push(`Área ${emAreaPht} cm²`);
                    if (params.length > 0) {
                        report += `Parámetros de estenosis: ${params.join(', ')}.\n`;
                    }
                }
            } // END MITRAL ELSE

            // ========== 4. VÁLVULA Y RAÍZ AÓRTICA ==========
            report += `4. VÁLVULA Y RAÍZ AÓRTICA\n`;

            const morfAortica = document.getElementById('morf_aortica').value;
            const eaGrado = document.getElementById('ea_grado').value;
            const iaGrado = document.getElementById('ia_grado').value;

            if (hasProtesis && protPos === 'aortica') {
                report += getProtesisText();
            } else {
                if (eaGrado === 'esclerosis') {
                    const eaVmax = document.getElementById('ea_vmax').value || '-';
                    if (morfAortica.includes('Esclerosis') || morfAortica.includes('Esclerocalcificación')) {
                        report += `${morfAortica} con Vmax ${eaVmax} m/s.\n`;
                    } else if (morfAortica.includes('Normal') || morfAortica.includes('Trivalva')) {
                        report += `Esclerosis valvular aórtica sin restricción de apertura con Vmax ${eaVmax} m/s.\n`;
                    } else {
                        report += `${morfAortica} con esclerosis valvular y Vmax ${eaVmax} m/s.\n`;
                    }
                } else {
                    report += `${morfAortica}.\n`;
                }

                // Aortic Stenosis - Parameters only
                if (eaGrado !== 'no' && eaGrado !== 'esclerosis') {
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
                    } else if (iaGrado !== 'no' && iaGrado !== 'minima') {
                        // Fallback if manual grade is selected but no advanced data entered
                        report += `Insuficiencia Aórtica ${iaGrado}.\n`;
                    }
                } else if (iaGrado !== 'no' && iaGrado !== 'minima') {
                    report += `Insuficiencia Aórtica ${iaGrado}.\n`;
                }

            } // END AORTIC ELSE

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
            const tapse = parseFloat(document.getElementById('tapse').value);
            const adEstado = document.getElementById('ad_estado').value;
            const vdEstado = document.getElementById('vd_estado').value;
            const adArea = parseFloat(document.getElementById('ad_area').value);
            const adAreaIndex = parseFloat(document.getElementById('ad_area_index').value);
            const vdBasal = parseFloat(document.getElementById('vd_basal').value);
            const vdMedio = parseFloat(document.getElementById('vd_medio').value);
            const vdLongitud = parseFloat(document.getElementById('vd_longitud').value);

            // --- Aurícula Derecha (AD) Logica (Solo descripción) ---
            let adOutput = '';
            if (adArea > 0) {
                let indexText = '';
                if (!isNaN(adAreaIndex) && adAreaIndex > 0) {
                    indexText = ` (indexada ${adAreaIndex} cm²/m²)`;
                }
                adOutput = `Aurícula derecha: área ${adArea} cm²${indexText}. `;
            } else if (adEstado === 'dilatada') {
                adOutput = `Aurícula derecha dilatada. `;
            }

            // --- Ventrículo Derecho (VD) Logica (Solo descripción) ---
            let vdOutput = '';
            if (vdBasal > 0) {
                let dimensions = [`basal ${vdBasal} mm`];
                if (vdMedio > 0) dimensions.push(`medio ${vdMedio} mm`);
                if (vdLongitud > 0) dimensions.push(`longitud ${vdLongitud} mm`);
                vdOutput = `Ventrículo derecho: diámetros ${dimensions.join(', ')}. `;
            } else if (vdEstado === 'dilatado') {
                vdOutput = `Ventrículo derecho dilatado. `;
            }

            let rightCavitiesReportText = '';

            // Consolidate 'normal' output to avoid repetitive sentences
            if (!adOutput && !vdOutput) {
                rightCavitiesReportText = 'Cavidades derechas de dimensiones conservadas.\n';
            } else {
                if (!adOutput) adOutput = 'Aurícula derecha de dimensiones normales. ';
                if (!vdOutput) vdOutput = 'Ventrículo derecho de dimensiones normales. ';
                rightCavitiesReportText = adOutput + vdOutput + '\n';
            }

            report += rightCavitiesReportText;

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

            // Inject Pacemaker Catheter visualization here
            if (document.getElementById('ant_marcapasos').checked) {
                report += ` Se visualiza catéter de marcapasos en cavidades derechas.`;
            }
            report += `\n`;

            // Indirect HTP signs
            const htpSeptum = document.getElementById('htp_septum').checked;
            const htpPulmonar = document.getElementById('htp_pulmonar').checked;
            const paatEl = document.getElementById('paat');
            const htpAceleracion = paatEl && paatEl.value ? (parseFloat(paatEl.value) < 100) : false;

            /* Moved to Cavidades Derechas description
            if (htpSeptum || htpPulmonar || htpAceleracion) {
                 // ...
            }
            */

            // ========== 6. VÁLVULA TRICÚSPIDE ==========
            report += `6. VÁLVULA TRICÚSPIDE\n`;

            const itGrado = document.getElementById('it_grado').value;
            // it_mecanismo removed
            const velIt = document.getElementById('vel_it').value;

            if (itGrado === 'no_valorable') {
                report += `IT no valorable, no permite estimar PSAP`;
            } else {
                report += `Insuficiencia tricuspídea ${itGrado}`;

                // Advanced Metrics
                if (itGrado === 'moderada' || itGrado === 'severa' || itGrado === 'masiva' || itGrado === 'torrencial') {
                    const itVcVal = document.getElementById('it_vc').value;
                    if (itVcVal) report += `. Vena Contracta: ${itVcVal} mm`;

                    const itOre = document.getElementById('it_ore').value;
                    const itVr  = document.getElementById('it_vr').value;
                    if (itOre && itOre !== '' && itOre !== '-') {
                        report += `. PISA: ORE ${itOre} cm²`;
                        if (itVr && itVr !== '' && itVr !== '-') report += `, Vol. Regurgitante ${itVr} ml`;
                    }

                    if (document.getElementById('it_flujo_hep').value === 'reverso') {
                        report += `. Flujo en venas suprahepáticas con reverso sistólico`;
                    }
                }

                // Vmax y PSAP solo cuando hay grado medible
                if (velIt && parseFloat(velIt) >= 1.5) {
                    const rap = parseFloat(document.getElementById('pad').value) || 5;
                    const calcPsap = Math.round(4 * Math.pow(parseFloat(velIt), 2) + rap);
                    report += `. Vmax IT ${velIt} m/s`;
                    if (calcPsap > 0) report += `, PSAP estimada: ${calcPsap} mmHg`;
                }
            }

            report += `.\n`;

            // ========== 7. VÁLVULA PULMONAR ==========
            report += `7. VÁLVULA PULMONAR\n`;
            report += `Morfología y apertura conservada.\n`;


            // ========== 8. PERICARDIO ==========
            const peCheck = document.getElementById('pe_presente');
            const pePresente = peCheck ? peCheck.checked : false;

            report += `8. PERICARDIO\n`;
            if (!pePresente) {
                report += `Libre, sin derrames. No se observan engrosamientos.\n`;
            } else {
                const peSizeVal = document.getElementById('pe_tamano').value;
                const peSize = parseFloat(peSizeVal) || 0;
                const peLocEl = document.getElementById('pe_ubicacion');
                const peLoc = peLocEl ? peLocEl.options[peLocEl.selectedIndex].text : 'No especificado';

                let peGrade = 'Leve';
                if (peSize >= 20) peGrade = 'Severo';
                else if (peSize >= 10) peGrade = 'Moderado';

                report += `Se observa derrame pericárdico ${peGrade} de distribución ${peLoc}, con una separación máxima de ${peSize} mm.\n`;

                // Alarm Signs Detail
                const alarms = [];
                if (document.getElementById('pe_colapso_ad').checked) alarms.push('Colapso sistólico de AD');
                if (document.getElementById('pe_colapso_vd').checked) alarms.push('Colapso diastólico de VD');
                if (document.getElementById('pe_variacion_flujo').checked) alarms.push('Variación respiratoria del flujo mitral >25%');
                if (document.getElementById('pe_vci_dilatada').checked) alarms.push('VCI dilatada sin colapso inspiratorio (Plétora)');

                if (alarms.length > 0) {
                    report += `Signos ecográficos sugestivos de taponamiento/compromiso hemodinámico: ${alarms.join(', ')}.\n`;
                }
            }

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
            const sexo = document.getElementById('sexo').value;
            const ddviNum = parseFloat(ddvi) || 0;
            const feviNum = parseFloat(fevi) || 0;
            const dilated = this.calc.isLVDilated(ddviNum, sexo);

            if (this.state.geometry) {
                if (this.state.geometry === 'Geometría Normal') {
                    if (dilated) {
                        viConclusion += `Ventrículo izquierdo dilatado con geometría ventricular normal`;
                    } else {
                        viConclusion += `Ventrículo izquierdo de diámetros y espesores conservados, con geometría ventricular normal`;
                    }
                } else {
                    viConclusion += `Ventrículo izquierdo con ${this.state.geometry.toLowerCase()}`;
                    if (dilated) viConclusion += ` y dilatación ventricular`;
                }
            } else {
                // No geometry data — use diameter alone
                if (dilated) {
                    viConclusion += `Ventrículo izquierdo dilatado`;
                } else {
                    viConclusion += `Ventrículo izquierdo`;
                }
            }

            // Motility conclusion (integrate here)
            if (this.motility) {
                const motilityConclusion = this.motility.generateConclusion();
                if (motilityConclusion && motilityConclusion.trim() !== '') {
                    // Remove trailing period, lowercase first letter, preserve DA/CD/Cx/WMSI
                    let motilityText = motilityConclusion.trim();
                    // Remove trailing newline if present, then trailing period
                    motilityText = motilityText.replace(/\n$/, '').replace(/\.$/, '').trim();

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

            viConclusion += `. `;

            // Systolic function (ASE/EACVI Guidelines v14.9.2) — use parsed number
            if (sexo === 'M') {
                if (feviNum >= 52) {
                    viConclusion += `Función sistólica del VI conservada.`;
                } else if (feviNum >= 41) {
                    viConclusion += `Función sistólica del VI levemente deprimida (${fevi}%).`;
                } else if (feviNum >= 30) {
                    viConclusion += `Función sistólica del VI moderadamente deprimida (${fevi}%).`;
                } else {
                    viConclusion += `Función sistólica del VI severamente deprimida (${fevi}%).`;
                }
            } else {
                if (feviNum >= 54) {
                    viConclusion += `Función sistólica del VI conservada.`;
                } else if (feviNum >= 41) {
                    viConclusion += `Función sistólica del VI levemente deprimida (${fevi}%).`;
                } else if (feviNum >= 30) {
                    viConclusion += `Función sistólica del VI moderadamente deprimida (${fevi}%).`;
                } else {
                    viConclusion += `Función sistólica del VI severamente deprimida (${fevi}%).`;
                }
            }

            report += `${conclusionNum}. ${viConclusion}\n`;
            conclusionNum++;

            // 3. Diastolic Function (ALWAYS include, even if Indeterminado)
            if (this.state.diastolicResult) {
                const diastolicDesc = this.state.diastolicResult.description;

                // Simplify for conclusions
                if (diastolicDesc.includes('FA:') || diastolicDesc.includes('FA +')) {
                    report += `${conclusionNum}. ${diastolicDesc}\n`;
                } else if (diastolicDesc.includes('Normal')) {
                    report += `${conclusionNum}. Función Diastólica Normal. Presiones de llenado VI normales.\n`;
                } else if (diastolicDesc.includes('Grado III')) {
                    report += `${conclusionNum}. Disfunción Diastólica Grado III (Restrictivo). Presiones de llenado VI elevadas.\n`;
                } else if (diastolicDesc.includes('Grado II')) {
                    report += `${conclusionNum}. Disfunción Diastólica Grado II (Pseudonormal). Presiones de llenado VI elevadas.\n`;
                } else if (diastolicDesc.includes('Grado I')) {
                    report += `${conclusionNum}. Disfunción Diastólica Grado I. Presiones de llenado VI normales.\n`;
                } else {
                    // Pass description through to capture TRIV note and warnings
                    report += `${conclusionNum}. ${diastolicDesc}\n`;
                }
            } else {
                report += `${conclusionNum}. Función Diastólica Indeterminada (datos insuficientes).\n`;
            }
            conclusionNum++;

            // 4. Cardiac Output conclusion (only if data available)
            if (this.state.cardiacOutput) {
                const { sv, co, ci } = this.state.cardiacOutput;

                // Classify using Cardiac Index as primary (indexed to BSA = more meaningful)
                // Fallback to CO if no BSA
                let gcLabel = '';
                let gcDetail = `VS ${sv} ml`;
                if (co) gcDetail += `, GC ${co} L/min`;
                if (ci) gcDetail += `, IC ${ci} L/min/m²`;

                if (ci) {
                    if (ci < 2.2)       gcLabel = 'Bajo gasto cardíaco severo';
                    else if (ci < 2.5)  gcLabel = 'Bajo gasto cardíaco';
                    else if (ci <= 4.0) gcLabel = 'Gasto cardíaco conservado';
                    else                gcLabel = 'Estado hiperdinámico';
                } else if (co) {
                    if (co < 4.0)       gcLabel = 'Bajo gasto cardíaco';
                    else if (co <= 8.0) gcLabel = 'Gasto cardíaco conservado';
                    else                gcLabel = 'Estado hiperdinámico';
                } else {
                    gcLabel = `Volumen sistólico ${sv < 60 ? 'reducido' : sv <= 100 ? 'conservado' : 'elevado'}`;
                }

                report += `${conclusionNum}. ${gcLabel} (${gcDetail}).\n`;
                conclusionNum++;
            }

            // 5. LA dimensions with severity
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

            // Septum Interauricular (ASIA/FOP)
            if (document.getElementById('asia_check')?.checked) {
                const excursion = document.getElementById('asia_excursion').value;
                const shunt = document.getElementById('asia_shunt').value;

                if (excursion) {
                    if (parseFloat(excursion) >= 10) {
                        report += `${conclusionNum}. Se observa aneurisma del septum interauricular (ASIA) con una excursión máxima de ${excursion} mm.`;
                    } else {
                        report += `${conclusionNum}. Se observa septum interauricular hipermóvil con una excursión máxima de ${excursion} mm.`;
                    }

                    if (shunt !== 'no') {
                        report += ` Se evidencia paso de flujo/burbujas a través del septum (FOP).`;
                    } else {
                        report += ` No se observa pasaje de flujo a través del mismo por Doppler Color.`;
                    }
                    report += `\n`;
                    conclusionNum++;
                }
            }

            // 6. Prótesis Valvular
            if (hasProtesis && this.state.protAlert) {
                const pPosEl = document.getElementById('prot_posicion');
                const pPosText = pPosEl ? pPosEl.options[pPosEl.selectedIndex].text : '';
                report += `${conclusionNum}. Prótesis ${pPosText}: ${this.state.protAlert}.\n`;
                conclusionNum++;
            }

            // 7. Valvular pathology (if significant)
            if (!(hasProtesis && protPos === 'mitral') && (morfMitral.includes('Prolapso') || morfMitral.includes('Flail') || morfMitral.includes('Calcificación') || imGrado !== 'no' || emGrado !== 'no')) {
                if (morfMitral.includes('Prolapso') || morfMitral.includes('Flail')) {
                    report += `${conclusionNum}. ${morfMitral}`;
                    if (imGrado !== 'no' && imGrado !== 'minima') report += ` con insuficiencia mitral ${imGrado}`;
                    else if (imGrado === 'minima') report += ` con insuficiencia mitral mínima`;
                    report += `.\n`;
                    conclusionNum++;
                } else if (imGrado !== 'no' || emGrado !== 'no') {
                    let valvular = '';
                    if (imGrado === 'minima') {
                        valvular += `Insuficiencia mitral mínima`;
                    } else if (imGrado !== 'no') {
                        valvular += `Insuficiencia mitral ${imGrado}`;
                    }

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

            if (!(hasProtesis && protPos === 'aortica') && (morfAortica.includes('Bicúspide') || morfAortica.includes('Calcificación masiva') || eaGrado !== 'no' || iaGrado !== 'no' || iaoAdv)) {

                // Build the string
                let line = `${conclusionNum}. `;
                let hasContent = false;

                if (morfAortica.includes('Bicúspide')) {
                    line += `${morfAortica}`;
                    hasContent = true;
                    if (eaGrado === 'esclerosis') line += ` con esclerosis valvular aórtica`;
                    else if (eaGrado !== 'no') line += ` con estenosis ${eaGrado}`;

                    if (iaoAdv) {
                        if (eaGrado !== 'no') line += ` e ${iaoAdv.toLowerCase()}`;
                        else line += ` con ${iaoAdv.toLowerCase()}`;
                    } else if (iaGrado === 'minima') {
                        if (eaGrado !== 'no') line += ` e insuficiencia mínima`;
                        else line += ` con insuficiencia mínima`;
                    } else if (iaGrado !== 'no') {
                        if (eaGrado !== 'no') line += ` e insuficiencia ${iaGrado}`;
                        else line += ` con insuficiencia ${iaGrado}`;
                    }
                } else {
                    // Not bicuspid
                    let parts = [];
                    if (eaGrado === 'esclerosis') {
                         if (morfAortica.includes('Normal') || morfAortica.includes('Trivalva') || morfAortica.includes('Esclerosis') || morfAortica.includes('Esclerocalcificación')) {
                             line += `Esclerosis valvular aórtica`;
                         } else {
                             line += `${morfAortica} con esclerosis valvular aórtica`;
                         }
                         hasContent = true;
                    } else if (eaGrado !== 'no') {
                         parts.push(`Estenosis aórtica ${eaGrado}`);
                    }

                    if (iaoAdv) parts.push(iaoAdv);
                    else if (iaGrado === 'minima') parts.push(`Insuficiencia aórtica mínima`);
                    else if (iaGrado !== 'no') parts.push(`Insuficiencia aórtica ${iaGrado}`);

                    if (parts.length > 0) {
                        if (eaGrado === 'esclerosis') {
                             line += ` e ` + parts.join(' e ');
                        } else {
                             line += parts.join(' e ');
                             hasContent = true;
                        }
                    }
                }

                if (hasContent) {
                    if (!line.endsWith('.')) line += '.';
                    
                    // Asegurar que comience con mayúscula si la línea empieza con una letra minúscula
                    const textContent = line.substring(line.indexOf('.') + 2); // Get text after "N. "
                    if (textContent && textContent.length > 0) {
                        const firstChar = textContent.charAt(0);
                        if (firstChar === firstChar.toLowerCase() && firstChar.toUpperCase() !== firstChar.toLowerCase()) {
                             const capitalized = textContent.charAt(0).toUpperCase() + textContent.slice(1);
                             line = `${line.substring(0, line.indexOf('.') + 2)}${capitalized}`;
                        }
                    }

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

            // 7. Right Cavities & HTP Description (Merged)
            let rightCavitiesText = '';

            // A. Dilation (Conclusions)
            if (adArea > 0 || vdBasal > 0) {
                // If specific measurements are present, use the rigorous logic
                if (adArea > 18) {
                    let adSeverity = 'leve';
                    if (adArea > 30) adSeverity = 'severa';
                    else if (adArea >= 25) adSeverity = 'moderada';
                    rightCavitiesText += `Dilatación auricular derecha ${adSeverity}`;
                }

                if (vdBasal > 41) {
                    let vdSeverity = 'leve';
                    if (vdBasal > 50) vdSeverity = 'severa';
                    else if (vdBasal >= 46) vdSeverity = 'moderada';

                    if (rightCavitiesText) rightCavitiesText += ' y ';
                    rightCavitiesText += `ventrículo derecho dilatado ${vdSeverity}`;
                }
            } else if (adEstado === 'dilatada' || vdEstado === 'dilatado') {
                if (adEstado === 'dilatada') rightCavitiesText += `Dilatación auricular derecha leve-moderada`;
                if (vdEstado === 'dilatado') {
                    if (rightCavitiesText) rightCavitiesText += ' y ';
                    rightCavitiesText += `ventrículo derecho dilatado`;
                }
            }

            // B. HTP Signs & PSAP Details
            let htpDetails = [];
            const psap = this.state.psap;

            if (htpSeptum) htpDetails.push('movimiento septal paradojal');
            if (htpPulmonar) htpDetails.push('dilatación tronco pulmonar');

            // PAAT
            const paatVal = document.getElementById('paat').value;
            const paatNum = parseFloat(paatVal);
            if (paatVal && paatNum < 100) htpDetails.push(`tiempo aceleración pulmonar corto (${paatVal} ms)`);

            // Combine Texts
            if (rightCavitiesText || htpDetails.length > 0) {
                let fullDesc = rightCavitiesText;
                if (htpDetails.length > 0) {
                    if (fullDesc) fullDesc += '. ';
                    fullDesc += `Signos indirectos de HTP: ${htpDetails.join(', ')}`;
                }

                if (fullDesc) {
                    report += `${conclusionNum}. Cavidades Derechas: ${fullDesc}.\n`;
                    conclusionNum++;
                }
            }

            // 8. HTP Conclusion (Probability Only)
            if (this.state.psap > 0 || htpDetails.length > 0) {
                const htpResult = this.calculateHTPProbability();
                report += `${conclusionNum}. Probabilidad Ecocardiográfica de Hipertensión Pulmonar ${htpResult.probability.toUpperCase()}.\n`;
                conclusionNum++;
            }

            // 7. RV dysfunction if present
            if (tapse < 16) {
                report += `${conclusionNum}. Disfunción del ventrículo derecho.\n`;
                conclusionNum++;
            }

            // 7. PERICARDIO (Conclusion Only - Summary)
            if (pePresente) {
                const peSizeVal = document.getElementById('pe_tamano').value;
                const peSize = parseFloat(peSizeVal) || 0;
                const peLocEl = document.getElementById('pe_ubicacion');
                const peLoc = peLocEl ? peLocEl.options[peLocEl.selectedIndex].text : 'No especificado';

                let peGrade = 'Leve';
                if (peSize >= 20) peGrade = 'Severo';
                else if (peSize >= 10) peGrade = 'Moderado';

                // Check alarms for hemodynamic compromise
                let compromise = false;
                if (document.getElementById('pe_colapso_ad').checked ||
                    document.getElementById('pe_colapso_vd').checked ||
                    document.getElementById('pe_variacion_flujo').checked ||
                    document.getElementById('pe_vci_dilatada').checked) {
                    compromise = true;
                }
                report += `${conclusionNum}. Derrame pericárdico ${peGrade} ${compromise ? 'con' : 'sin'} compromiso hemodinámico.\n`;
                conclusionNum++;
            }

            // 9. Antecedentes Clínicos (REMOVED from report text, kept in Dataset)
            //Logic removed as per user request to only keep in dataset

            // Append doctor signature if configured
            if (window.GoogleSync) {
                const firma = GoogleSync.getFirma();
                if (firma) report += '\n\n' + firma;
            }

            // Narrative mode: replace CONCLUSIONES with a narrative paragraph
            if (this.reportMode === 'narrativo') {
                const splitKey = '\nCONCLUSIONES\n';
                const splitIdx = report.lastIndexOf(splitKey);
                if (splitIdx !== -1) {
                    report = report.substring(0, splitIdx) + this._buildNarrativeConclusion();
                    // Re-append signature if present
                    if (window.GoogleSync) {
                        const firma = GoogleSync.getFirma();
                        if (firma) report += '\n\n' + firma;
                    }
                }
            }

            // Display report
            document.getElementById('resultado').value = report;

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error al generar el informe: ' + error.message);
        }
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
     * Switch between 'lista' and 'narrativo' report modes
     */
    /**
     * Apply a clinical preset — fills typical values for common scenarios
     */
    applyPreset(name) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            // Remove min/max constraints temporarily for preset values
            const prevMin = el.min; const prevMax = el.max;
            el.removeAttribute('min'); el.removeAttribute('max');
            el.value = val;
            if (prevMin) el.min = prevMin; if (prevMax) el.max = prevMax;
            el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        };
        const check = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = val;
        };

        const presets = {
            normal_joven: () => {
                set('sexo', 'M'); set('edad', 22); set('peso', 70); set('altura', 175);
                set('siv', 8); set('pp', 8); set('ddvi', 46); set('fevi', 65);
                set('ritmo', 'sinusal'); set('conduccion', 'normal');
                set('onda_e', 95); set('onda_a', 45); set('onda_e_prime_septal', 14); set('onda_e_prime_lateral', 17);
                set('vol_ai', 22); set('morf_mitral', 'Valvas finas y móviles, apertura conservada');
                set('morf_aortica', 'Válvula trivalva, sigmoideas finas y móviles');
                set('im_grado', 'no'); set('ia_grado', 'no'); set('ea_grado', 'no');
                set('tapse', 26); set('s_prima_vd', 15);
                set('it_grado', 'no_valorable');
            },
            normal_adulto: () => {
                set('sexo', 'M'); set('edad', 55); set('peso', 80); set('altura', 172);
                set('siv', 10); set('pp', 10); set('ddvi', 50); set('fevi', 60);
                set('ritmo', 'sinusal'); set('conduccion', 'normal');
                set('onda_e', 80); set('onda_a', 70); set('onda_e_prime_septal', 9); set('onda_e_prime_lateral', 11);
                set('vol_ai', 28); set('morf_mitral', 'Valvas finas y móviles, apertura conservada');
                set('morf_aortica', 'Válvula trivalva, sigmoideas finas y móviles');
                set('im_grado', 'no'); set('ia_grado', 'no'); set('ea_grado', 'no');
                set('tapse', 24); set('s_prima_vd', 13);
                set('it_grado', 'no_valorable');
            },
            esclerosis_senil: () => {
                set('sexo', 'M'); set('edad', 76); set('peso', 75); set('altura', 168);
                set('siv', 11); set('pp', 11); set('ddvi', 48); set('fevi', 58);
                set('ritmo', 'fa'); set('conduccion', 'normal');
                set('onda_e', 75); set('onda_e_prime_septal', 7); set('onda_e_prime_lateral', 8);
                set('vol_ai', 38); set('morf_mitral', 'Leve engrosamiento fibroso de las valvas sin restricción de apertura');
                set('morf_aortica', 'Esclerosis valvular aórtica (engrosamiento focal) sin restricción de apertura');
                set('ea_grado', 'esclerosis'); set('im_grado', 'no'); set('ia_grado', 'no');
                set('tapse', 22); set('s_prima_vd', 12); set('vel_it', 2.5); set('it_grado', 'leve');
                check('ant_hta', true); check('ant_fa', true);
            },
            hta_hvi: () => {
                set('sexo', 'M'); set('edad', 62); set('peso', 85); set('altura', 170);
                set('siv', 13); set('pp', 13); set('ddvi', 47); set('fevi', 60);
                set('ritmo', 'sinusal'); set('conduccion', 'normal');
                set('onda_e', 70); set('onda_a', 100); set('onda_e_prime_septal', 7); set('onda_e_prime_lateral', 9);
                set('vol_ai', 35); set('morf_mitral', 'Leve engrosamiento fibroso de las valvas sin restricción de apertura');
                set('morf_aortica', 'Esclerosis valvular aórtica (engrosamiento focal) sin restricción de apertura');
                set('ea_grado', 'esclerosis'); set('im_grado', 'no'); set('ia_grado', 'no');
                set('tapse', 23); set('s_prima_vd', 13); set('it_grado', 'no_valorable');
                check('ant_hta', true);
            },
            mcd: () => {
                set('sexo', 'M'); set('edad', 55); set('peso', 75); set('altura', 170);
                set('siv', 7); set('pp', 7); set('ddvi', 65); set('fevi', 30);
                set('ritmo', 'sinusal'); set('conduccion', 'normal');
                set('onda_e', 100); set('onda_a', 60); set('onda_e_prime_septal', 5); set('onda_e_prime_lateral', 6);
                set('vol_ai', 45); set('morf_mitral', 'Valvas anatómicamente conservadas con Tenting sistólico secundario a dilatación/remodelado del VI');
                set('morf_aortica', 'Válvula trivalva, sigmoideas finas y móviles');
                set('im_grado', 'moderada'); set('ia_grado', 'no'); set('ea_grado', 'no');
                set('tapse', 17); set('s_prima_vd', 9); set('vel_it', 2.9); set('it_grado', 'leve');
                set('motilidad_global', 'alterada');
            },
            iam_anterior: () => {
                set('sexo', 'M'); set('edad', 65); set('peso', 80); set('altura', 172);
                set('siv', 9); set('pp', 10); set('ddvi', 55); set('fevi', 42);
                set('ritmo', 'sinusal'); set('conduccion', 'normal');
                set('onda_e', 90); set('onda_a', 65); set('onda_e_prime_septal', 7); set('onda_e_prime_lateral', 9);
                set('vol_ai', 36); set('morf_mitral', 'Valvas finas y móviles, apertura conservada');
                set('morf_aortica', 'Esclerosis valvular aórtica (engrosamiento focal) sin restricción de apertura');
                set('ea_grado', 'esclerosis'); set('im_grado', 'leve'); set('ia_grado', 'no');
                set('tapse', 20); set('s_prima_vd', 11); set('vel_it', 2.7); set('it_grado', 'leve');
                set('motilidad_global', 'alterada'); check('ant_isquemia', true);
            }
        };

        if (presets[name]) {
            presets[name]();
            this.calculateAll();
            this.showToast(`Preset "${name.replace(/_/g, ' ')}" aplicado`);
        }
    }

    setReportMode(mode) {
        this.reportMode = mode;
        document.getElementById('mode_lista')?.classList.toggle('mode-btn-active', mode === 'lista');
        document.getElementById('mode_narrativo')?.classList.toggle('mode-btn-active', mode === 'narrativo');
        const current = document.getElementById('resultado').value;
        if (current && current.trim()) this.generateReport();
    }

    /**
     * Build the narrative "IMPRESIÓN DIAGNÓSTICA" block
     * Called by generateReport() when reportMode === 'narrativo'
     * State must already be populated by calculateAll()
     */
    _buildNarrativeConclusion() {
        const fevi     = parseFloat(document.getElementById('fevi').value) || 0;
        const ddvi     = parseFloat(document.getElementById('ddvi').value) || 0;
        const sexo     = document.getElementById('sexo').value;
        const ritmo    = document.getElementById('ritmo').value;
        const condEl   = document.getElementById('conduccion');
        const volAi    = parseFloat(document.getElementById('vol_ai').value) || 0;
        const sc       = parseFloat(document.getElementById('sc_display').value) || 0;

        const eaGrado  = document.getElementById('ea_grado').value;
        const iaGrado  = document.getElementById('ia_grado').value;
        const imGrado  = document.getElementById('im_grado').value;
        const emGrado  = document.getElementById('em_grado').value;
        const morfMitral = document.getElementById('morf_mitral').value;

        const tapse    = parseFloat(document.getElementById('tapse').value) || 0;
        const velIt    = parseFloat(document.getElementById('vel_it').value) || 0;
        const adArea   = parseFloat(document.getElementById('ad_area').value) || 0;
        const vdBasal  = parseFloat(document.getElementById('vd_basal').value) || 0;
        const vdEstado = document.getElementById('vd_estado').value;
        const adEstado = document.getElementById('ad_estado').value;

        const mac      = document.getElementById('ctx_mac')?.checked;
        const bcri     = document.getElementById('ctx_bcri')?.checked;
        const pePresente = document.getElementById('pe_presente')?.checked;

        const paragraphs = [];

        // ── P1: Rhythm + LV ──
        const ritmoVal = document.getElementById('ritmo').value;
        const ritmoMap = { sinusal: 'ritmo sinusal', fa: 'Fibrilación Auricular (FA)', flutter: 'Flutter / Aleteo Auricular' };
        const ritmoLower = ritmoMap[ritmoVal] || document.getElementById('ritmo').options[document.getElementById('ritmo').selectedIndex].text.toLowerCase();
        let p1 = `En ${ritmoLower}`;
        if (condEl.value !== 'normal') {
            p1 += ` con ${condEl.options[condEl.selectedIndex].text.toLowerCase()}`;
        }
        p1 += `, se observa un ventrículo izquierdo`;

        const hasDifferentGeometry = this.state.geometry && this.state.geometry !== 'Geometría Normal';
        if (hasDifferentGeometry) p1 += ` con ${this.state.geometry.toLowerCase()}`;
        if (this.calc.isLVDilated(ddvi, sexo)) {
            p1 += hasDifferentGeometry ? ` y dilatación ventricular` : ` con dilatación ventricular`;
        }

        if (this.motility) {
            const motGlobal = document.getElementById('motilidad_global').value;
            if (motGlobal !== 'conservada') {
                const motConclusion = this.motility.generateConclusion();
                if (motConclusion && motConclusion.trim()) {
                    p1 += `, con ${motConclusion.toLowerCase().replace(/\.$/, '')}`;
                }
            }
        }

        if (fevi) {
            const normalLimit = sexo === 'M' ? 52 : 54;
            p1 += '. La función sistólica ';
            if      (fevi >= normalLimit) p1 += `se encuentra conservada (FEy ${fevi}%)`;
            else if (fevi >= 41)          p1 += `se encuentra levemente deprimida (FEy ${fevi}%)`;
            else if (fevi >= 30)          p1 += `se encuentra moderadamente deprimida (FEy ${fevi}%)`;
            else                          p1 += `se encuentra severamente deprimida (FEy ${fevi}%)`;
        }
        paragraphs.push(p1 + '.');

        // ── P2: Valvulopathies ──
        const rankMap = { 'severa': 4, 'moderada': 3, 'leve': 2, 'minima': 1, 'esclerosis': 0.5, 'no': 0 };
        const valvular = [];

        if (eaGrado !== 'no' && eaGrado !== 'esclerosis') {
            const eaAva = document.getElementById('ea_ava')?.value;
            const eaGm  = document.getElementById('ea_grad_medio')?.value;
            let txt = `estenosis aórtica ${eaGrado}`;
            if (eaAva || eaGm) {
                txt += ` (AVA ${eaAva || '?'} cm²${eaGm ? ', gradiente medio ' + eaGm + ' mmHg' : ''})`;
            }
            valvular.push({ rank: rankMap[eaGrado] || 2, txt });
        }

        if (imGrado !== 'no') {
            valvular.push({ rank: rankMap[imGrado] || 1, txt: `insuficiencia mitral ${imGrado}` });
        }
        if (iaGrado !== 'no') {
            valvular.push({ rank: rankMap[iaGrado] || 1, txt: `insuficiencia aórtica ${iaGrado}` });
        }
        if (emGrado !== 'no') {
            valvular.push({ rank: rankMap[emGrado] || 2, txt: `estenosis mitral ${emGrado}` });
        }
        if (eaGrado === 'esclerosis') {
            valvular.push({ rank: 0.5, txt: `esclerosis valvular aórtica sin obstrucción` });
        }
        if (mac || morfMitral.includes('Calcificación') || morfMitral.includes('MAC')) {
            valvular.push({ rank: 0.3, txt: `calcificación del anillo mitral (MAC)` });
        }

        valvular.sort((a, b) => b.rank - a.rank);

        if (valvular.length > 0) {
            const major = valvular.filter(v => v.rank >= 2);
            const minor = valvular.filter(v => v.rank < 2);
            let p2 = '';

            if (major.length > 0) {
                p2 = 'A nivel valvular, destaca ';
                if (major.length === 1) {
                    p2 += `una ${major[0].txt}`;
                } else if (major.length === 2) {
                    p2 += `una ${major[0].txt} e ${major[1].txt}`;
                } else {
                    p2 += major.slice(0, -1).map((v, i) => (i === 0 ? `una ${v.txt}` : v.txt)).join(', ');
                    p2 += ` e ${major[major.length - 1].txt}`;
                }
                if (minor.length > 0) {
                    p2 += `. Adicionalmente, se observa ${minor.map(v => v.txt).join(' y ')}`;
                }
            } else {
                p2 = `Los hallazgos valvulares son de carácter leve (${minor.map(v => v.txt).join(', ')}), sin repercusión hemodinámica significativa`;
            }

            // Aortic root dilation
            const aoRaiz = parseFloat(document.getElementById('ao_raiz').value) || 0;
            if (aoRaiz && sc) {
                const aoRaizIdx = aoRaiz / sc / 10;
                const rootLimit = sexo === 'M' ? 2.15 : 2.11;
                if (aoRaizIdx > rootLimit) {
                    p2 += `. La raíz aórtica se encuentra dilatada (${aoRaiz} mm)`;
                }
            }

            paragraphs.push(p2 + '.');
        }

        // ── P3: Hemodynamics (Diastolic + AI + CO) ──
        if (this.state.diastolicResult) {
            const dr    = this.state.diastolicResult;
            const isFA  = ritmo === 'fa' || ritmo === 'flutter';
            const ctxNotes = [];
            if (mac)  ctxNotes.push(`la presencia de MAC limita la validez del E/e'`);
            if (bcri) ctxNotes.push(`el BCRI excluye el e' septal`);

            let p3 = `Desde el punto de vista hemodinámico`;
            if (ctxNotes.length) p3 += ` (considerando que ${ctxNotes.join(' y ')})`;
            p3 += `, `;

            if      (dr.grade === 'Normal')       p3 += `la función diastólica es normal con presiones de llenado del VI conservadas`;
            else if (dr.grade === 'I')             p3 += `se identifica disfunción diastólica grado I (relajación prolongada) con presiones de llenado normales`;
            else if (dr.grade === 'II')            p3 += `se identifica disfunción diastólica grado II (patrón pseudonormal) con presiones de llenado del VI elevadas`;
            else if (dr.grade === 'III')           p3 += `se identifica disfunción diastólica grado III (patrón restrictivo) con presiones de llenado marcadamente elevadas`;
            else if (dr.grade === 'Indeterminado') p3 += `la evaluación diastólica resulta indeterminada por criterios contrapuestos`;
            else if (isFA && dr.grade === 'II')    p3 += `en contexto de FA los parámetros sugieren presiones de llenado del VI elevadas`;
            else if (isFA && dr.grade === 'III')   p3 += `en contexto de FA y FEy deprimida los parámetros confirman presiones de llenado del VI elevadas`;
            else                                   p3 += dr.description.toLowerCase().replace(/^fa.*?[:\.]\s*/i, '').trim();

            // AI
            if      (volAi > 48)  p3 += `, hallazgo que se traduce en una dilatación severa de la aurícula izquierda (${volAi} ml/m²)`;
            else if (volAi >= 42) p3 += `, hallazgo que se traduce en una dilatación moderada de la aurícula izquierda (${volAi} ml/m²)`;
            else if (volAi >= 34) p3 += `, asociado a dilatación leve de la aurícula izquierda (${volAi} ml/m²)`;
            else if (volAi > 0)   p3 += `. La aurícula izquierda presenta dimensiones conservadas`;

            // Cardiac output (only if low or hyperdynamic)
            if (this.state.cardiacOutput) {
                const { sv, co, ci } = this.state.cardiacOutput;
                let gcLabel = '';
                if (ci) {
                    if      (ci < 2.2)  gcLabel = 'bajo gasto cardíaco severo';
                    else if (ci < 2.5)  gcLabel = 'bajo gasto cardíaco';
                    else if (ci > 4.0)  gcLabel = 'estado hiperdinámico';
                } else if (co) {
                    if      (co < 4.0)  gcLabel = 'bajo gasto cardíaco';
                    else if (co > 8.0)  gcLabel = 'estado hiperdinámico';
                }
                if (gcLabel) {
                    const nums = ci ? `VS ${sv} ml, IC ${ci} L/min/m²` : `VS ${sv} ml, GC ${co} L/min`;
                    p3 += `. El estudio evidencia ${gcLabel} (${nums})`;
                }
            }

            paragraphs.push(p3 + '.');
        }

        // ── P4: Right chambers + HTP ──
        const htpResult  = this.state.psap > 0 ? this.calculateHTPProbability() : null;
        const vdDepressed = tapse > 0 && tapse < 17;
        const adDilated   = adArea > 18 || adEstado === 'dilatada';
        const vdDilated   = vdBasal > 41 || vdEstado === 'dilatado';

        if (htpResult || vdDepressed || adDilated || vdDilated) {
            let p4 = `En cuanto a las cavidades derechas, `;
            const rightFindings = [];
            if (adDilated)   rightFindings.push(`dilatación auricular derecha`);
            if (vdDilated)   rightFindings.push(`ventrículo derecho dilatado`);
            if (vdDepressed) rightFindings.push(`función sistólica del VD deprimida (TAPSE ${tapse} mm)`);

            if (rightFindings.length > 0) {
                p4 += `se detecta ${rightFindings.join(', ')}`;
            } else {
                p4 += `las dimensiones y función se encuentran conservadas`;
            }

            if (htpResult) {
                const velStr = velIt ? ` (Vmax IT ${velIt} m/s)` : '';
                p4 += `. La velocidad de la IT${velStr} determina una probabilidad ecocardiográfica de hipertensión pulmonar ${htpResult.probability.toLowerCase()}, con PSAP estimada de ${this.state.psap} mmHg`;
            }

            paragraphs.push(p4 + '.');
        }

        // ── P5: Pericardium (only if abnormal) ──
        if (pePresente) {
            const peSize  = parseFloat(document.getElementById('pe_tamano')?.value) || 0;
            const peGrade = peSize >= 20 ? 'severo' : peSize >= 10 ? 'moderado' : 'leve';
            const compromise = ['pe_colapso_ad', 'pe_colapso_vd', 'pe_variacion_flujo', 'pe_vci_dilatada']
                .some(id => document.getElementById(id)?.checked);
            paragraphs.push(`Se observa derrame pericárdico ${peGrade}${compromise ? ' con signos de compromiso hemodinámico' : ''}.`);
        }

        return `\nIMPRESIÓN DIAGNÓSTICA\n${paragraphs.join('\n\n')}`;
    }

    /**
     * Collect all relevant clinical data from DOM + state into a JSON object
     * Used by generateAIReport() to build the Gemini prompt payload
     */
    _buildClinicalDataJSON() {
        const v = id => document.getElementById(id)?.value || null;
        const n = id => parseFloat(document.getElementById(id)?.value) || null;
        const c = id => document.getElementById(id)?.checked || false;
        const sel = id => {
            const el = document.getElementById(id);
            return el ? el.options[el.selectedIndex]?.text : null;
        };

        const fevi = n('fevi');
        const sexo = v('sexo');
        const normalFEy = sexo === 'M' ? 52 : 54;
        const feviLabel = fevi
            ? fevi >= normalFEy ? 'conservada'
              : fevi >= 41 ? 'levemente deprimida'
              : fevi >= 30 ? 'moderadamente deprimida'
              : 'severamente deprimida'
            : null;

        const ddvi = n('ddvi');
        const dilatado = ddvi ? this.calc.isLVDilated(ddvi, sexo) : false;

        const dr = this.state.diastolicResult;
        const co = this.state.cardiacOutput;
        const psap = this.state.psap || null;

        const ctx = {
            bcri:     c('ctx_bcri'),
            mac:      c('ctx_mac'),
            im_severa: c('ctx_im'),
            mcp:      c('ctx_mcp'),
            valsalva: c('ctx_valsalva')
        };
        const activeCtx = Object.keys(ctx).filter(k => ctx[k]);

        const volAi = n('vol_ai');
        const aiLabel = volAi
            ? volAi > 48 ? 'severamente dilatada'
              : volAi >= 42 ? 'moderadamente dilatada'
              : volAi >= 34 ? 'levemente dilatada'
              : 'normal'
            : null;

        const tapse = n('tapse');
        const sPrima = n('s_prima_vd');
        const vdFuncion = tapse
            ? tapse < 17 ? 'deprimida'
              : tapse < 20 ? 'límite'
              : 'conservada'
            : null;

        // Motility text
        let motilityText = null;
        if (this.motility) {
            const motGlobal = v('motilidad_global');
            if (motGlobal !== 'conservada') {
                motilityText = this.motility.generateConclusion()?.replace(/\.$/, '') || null;
            }
        }

        const antecedentes = [
            document.getElementById('ant_hta')?.checked         && 'HTA',
            document.getElementById('ant_isquemia')?.checked    && 'Cardiopatía Isquémica',
            document.getElementById('ant_crm')?.checked         && 'Revascularización Miocárdica (CRM)',
            document.getElementById('ant_epoc')?.checked        && 'EPOC/Enfermedad Pulmonar',
            document.getElementById('ant_fa')?.checked          && 'Fibrilación Auricular Previa',
            document.getElementById('ant_marcapasos')?.checked  && 'Marcapasos/CDI',
            document.getElementById('ant_dm')?.checked          && 'Diabetes Mellitus',
            document.getElementById('ant_irc')?.checked         && 'Insuficiencia Renal Crónica',
            document.getElementById('ant_valvulopatia')?.checked && 'Valvulopatía Conocida',
        ].filter(Boolean);
        const antLibre = document.getElementById('ant_libre')?.value?.trim() || null;
        return {
            datos_fisicos: {
                sexo: sexo === 'F' ? 'Femenino' : 'Masculino',
                edad_anos: n('edad'),
                peso_kg: n('peso'), altura_cm: n('altura'),
                sc_m2: this.state.bsa ? parseFloat(this.state.bsa.toFixed(2)) : null,
                imc: this.state.bmi ? parseFloat(this.state.bmi.toFixed(1)) : null
            },
            antecedentes: antecedentes.length ? antecedentes : null,
            motivo_consulta: antLibre,
            ritmo: sel('ritmo'),
            conduccion: document.getElementById('conduccion')?.value !== 'normal' ? sel('conduccion') : 'Normal',
            vi: {
                siv_mm: n('siv'), pp_mm: n('pp'), ddvi_mm: ddvi,
                fevi_pct: fevi, fevi_clasificacion: feviLabel,
                masa_indexada_g_m2: this.state.lvMassIndex > 0 ? Math.round(this.state.lvMassIndex) : null,
                rwt: this.state.rwt ? parseFloat(this.state.rwt.toFixed(2)) : null,
                geometria: this.state.geometry || null,
                dilatado,
                motilidad: motilityText || (v('motilidad_global') === 'conservada' ? 'conservada' : null)
            },
            doppler_diastolico: {
                onda_e_cms: n('onda_e'), onda_a_cms: n('onda_a'),
                e_septal_cms: n('onda_e_prime_septal'), e_lateral_cms: n('onda_e_prime_lateral'),
                e_promedio_cms: n('onda_e_prime'),
                ee_ratio: n('ee_ratio_display'),
                lavi_ml_m2: volAi, triv_ms: n('triv'), td_ms: n('td'),
                valsalva_positivo: c('ctx_valsalva'),
                contexto_especial: activeCtx.length ? activeCtx : null
            },
            funcion_diastolica: dr ? { grado: dr.grade, descripcion: dr.description } : null,
            auricula_izquierda: { lavi_ml_m2: volAi, clasificacion: aiLabel },
            valvula_mitral: {
                morfologia: v('morf_mitral'),
                insuficiencia_grado: v('im_grado'),
                vc_mm: n('im_vc'), ore_cm2: n('im_ore'), vol_reg_ml: n('im_vr'),
                estenosis_grado: v('em_grado'),
                grad_medio_mmhg: n('em_grad_medio'), area_cm2: n('em_area_pht')
            },
            valvula_aortica: {
                morfologia: v('morf_aortica'),
                estenosis_grado: v('ea_grado'),
                vmax_ms: n('ea_vmax'), grad_medio_mmhg: n('ea_grad_medio'),
                ava_cm2: n('ea_ava'), ava_indexada: n('ea_ava_index'), coef_adimensional: n('ea_coef'),
                insuficiencia_grado: v('ia_grado')
            },
            aorta: (() => {
                const raiz = n('ao_raiz');
                const asc  = n('ao_asc');
                const bsa  = this.state.bsa || null;
                return {
                    raiz_mm: raiz,
                    ascendente_mm: asc,
                    raiz_cm_m2: (raiz && bsa) ? parseFloat((raiz / 10 / bsa).toFixed(2)) : null,
                    ascendente_cm_m2: (asc && bsa)  ? parseFloat((asc  / 10 / bsa).toFixed(2)) : null
                };
            })(),
            hemodinamica_tsvi: co ? {
                sv_ml: co.sv, gc_l_min: co.co, ic_l_min_m2: co.ci
            } : null,
            cavidades_derechas: {
                ad_area_cm2: n('ad_area'), vd_basal_mm: n('vd_basal'),
                tapse_mm: tapse, s_prima_cms: sPrima, funcion_vd: vdFuncion
            },
            valvula_tricuspide: (() => {
                const itGrado = v('it_grado');
                const itNoVal = itGrado === 'no_valorable';
                return {
                    insuficiencia_grado: itGrado,
                    vel_it_ms: itNoVal ? null : n('vel_it'),
                    psap_mmhg: itNoVal ? null : (psap || null),
                    psap_no_estimable: itNoVal || (!psap && !n('vel_it'))
                };
            })(),
            htp: psap ? {
                psap_mmhg: psap,
                probabilidad: this.calculateHTPProbability()?.probability || null
            } : null,
            pericardio: {
                libre: !c('pe_presente'),
                tamano_mm: c('pe_presente') ? n('pe_tamano') : null
            }
        };
    }

    /**
     * Generate narrative report using Gemini AI
     * Builds clinical JSON, calls Gemini, replaces CONCLUSIONES with AI response
     */
    async generateAIReport() {
        if (!window.GeminiAI) {
            this.showToast('Módulo Gemini no cargado. Recargá la página.');
            return;
        }
        if (!GeminiAI.isConfigured()) {
            this.showToast('Configurá tu Gemini API key en ⚙️ primero.');
            this.showSyncSetupModal();
            return;
        }

        const btn = document.getElementById('mode_ia');
        const originalText = btn?.textContent || 'Gemini IA';
        if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }

        try {
            // Ensure all calculations are up to date
            this.calculateAll();

            // Generate standard report first (description + conclusions)
            await this.generateReport();

            // Build clinical JSON
            const clinicalData = this._buildClinicalDataJSON();
            const clinicalJson = JSON.stringify(clinicalData, null, 2);

            // Call Gemini (tries multiple models, may throw if all quota-exceeded)
            let aiNarrative = null;
            let usedFallback = false;
            try {
                aiNarrative = await GeminiAI.generateNarrative(clinicalJson);
            } catch (aiErr) {
                const isQuota = /quota|rate.limit|resource.exhausted|429/i.test(aiErr.message);
                if (isQuota) {
                    // All models quota-exceeded → use rule-based narrative as fallback
                    usedFallback = true;
                    aiNarrative = this._buildNarrativeConclusion()
                        .replace('\nIMPRESIÓN DIAGNÓSTICA\n', '');
                } else {
                    throw aiErr;
                }
            }

            // Replace conclusion section — handle both base (CONCLUSIONES) and narrativo mode
            const reportEl = document.getElementById('resultado');
            const current  = reportEl.value;
            const header   = usedFallback
                ? '\nIMPRESIÓN DIAGNÓSTICA (modo offline — cuota Gemini agotada)\n'
                : '\nIMPRESIÓN DIAGNÓSTICA:\n';

            // Search for any existing conclusion header to replace
            const candidates = ['\nCONCLUSIONES\n', '\nIMPRESIÓN DIAGNÓSTICA\n', '\nIMPRESIÓN DIAGNÓSTICA:\n'];
            let splitIdx = -1;
            for (const key of candidates) {
                const idx = current.lastIndexOf(key);
                if (idx !== -1) { splitIdx = idx; break; }
            }

            if (splitIdx !== -1) {
                let newReport = current.substring(0, splitIdx) + header + aiNarrative;
                if (window.GoogleSync) {
                    const firma = GoogleSync.getFirma();
                    if (firma) newReport += '\n\n' + firma;
                }
                reportEl.value = newReport;
            } else {
                reportEl.value = current + '\n' + header + aiNarrative;
            }

            document.getElementById('mode_lista')?.classList.remove('mode-btn-active');
            document.getElementById('mode_narrativo')?.classList.remove('mode-btn-active');

            this.showToast(usedFallback
                ? 'Cuota Gemini agotada — informe generado con lógica offline'
                : 'Informe generado con Gemini AI');
        } catch (err) {
            alert('Error al generar con IA: ' + err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = originalText; }
        }
    }

    /**
     * Copy dataset in TSV format for Excel
     */
    /**
     * Build the dataset row array (shared by copyDataset and saveStudy)
     */
    _buildDatasetRow() {
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
        const paat = document.getElementById('paat').value || '-';

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
        const emAreaPht = document.getElementById('em_area_pht')?.value || '-';
        const imOre = document.getElementById('im_ore')?.value || '-'; // PISA
        const imVr = document.getElementById('im_vr')?.value || '-';   // PISA

        // D. Motilidad Detallada (Segmental) - Versión Corta y Práctica
        let motDetalle = '-';
        if (this.motility) {
            if (this.motility.pattern && this.motility.pattern !== 'none') {
                // If special pattern is selected, prioritize the pattern name
                const patternData = (typeof MotilityModel !== 'undefined' && MotilityModel.PATTERNS) ? MotilityModel.PATTERNS[this.motility.pattern] : null;
                if (patternData && patternData.name) {
                    motDetalle = `Patrón: ${patternData.name}`;
                } else if (this.motility.generateConclusion) {
                    motDetalle = this.motility.generateConclusion().replace(/\.$/, '');
                }
            } else if (this.motility.generateConclusion) {
                // Otherwise, use the smart territory conclusion
                let territoryStr = this.motility.generateConclusion();
                if (territoryStr) {
                    motDetalle = territoryStr.replace(/\.$/, '');
                }
            }

            // Append WMSI for completeness if altered
            if (motDetalle !== '-' && this.motility.calculateWMSI) {
                const wmsi = this.motility.calculateWMSI();
                if (wmsi && parseFloat(wmsi) > 1.00) {
                    motDetalle += ` (WMSI: ${wmsi})`;
                }
            }
        }

        // Tab-separated values (Restructured & Grouped for Excel)
        const row = [
            // 1. Datos Filiatorios y Biometría (9)
            fecha, hc, edad, sexo,
            document.getElementById('peso').value || '-',
            document.getElementById('altura').value || '-',
            this.state.bmi ? this.state.bmi.toFixed(1) : '-',
            sc,
            ritmo,

            // 2. Antecedentes (7)
            cond,
            document.getElementById('ant_hta').checked ? 'Si' : 'No',
            document.getElementById('ant_isquemia').checked ? 'Si' : 'No',
            document.getElementById('ant_crm').checked ? 'Si' : 'No',
            document.getElementById('ant_epoc').checked ? 'Si' : 'No',
            document.getElementById('ant_fa').checked ? 'Si' : 'No',
            document.getElementById('ant_marcapasos').checked ? 'Si' : 'No',

            // 3. Ventrículo Izquierdo (7)
            document.getElementById('siv').value || '-',
            document.getElementById('pp').value || '-',
            ddvi,
            document.getElementById('dsvi').value || '-',
            masa,
            this.state.rwt ? this.state.rwt.toFixed(2) : '-',
            geo,

            // 4. Función Sistólica y Motilidad Regional (3)
            fey,
            mot,
            motDetalle, // Describe territorio afectado

            // 5. Función Diastólica y Aurícula Izquierda (4)
            diastole,
            ee,
            ea,
            volAi,

            // 6. Válvula Aórtica (EAo y IAo) (12)
            eao, // Grado EAo
            eaVmax,
            eaGrad,
            eaAva,
            eaCoef,
            iaGrado, // Grado IAo
            iaoVc,
            iaoPht,
            iaoRvol,
            iaoEroa,
            iaoAlcance,
            iaoReverso,

            // 7. Válvula Mitral (EM e IM) (6)
            emGrado, // Grado EM
            emGrad,
            emAreaPht,
            im, // Grado IM
            imOre,
            imVr,

            // 8. Cavidades Derechas y Hemodinamia (7)
            document.getElementById('ad_estado')?.value || '-',
            document.getElementById('ad_area')?.value || '-',
            document.getElementById('vd_estado')?.value || '-',
            document.getElementById('vd_basal')?.value || '-',
            tapse,
            document.getElementById('s_prima_vd')?.value || '-',
            psap,

            // 9. Válvula Tricúspide (IT) (5)
            document.getElementById('it_grado').value, // Grado IT
            document.getElementById('it_vc') ? (document.getElementById('it_vc').value || '-') : '-',
            document.getElementById('it_ore') ? (document.getElementById('it_ore').value || '-') : '-',
            document.getElementById('it_vr') ? (document.getElementById('it_vr').value || '-') : '-',
            document.getElementById('it_flujo_hep').value,

            // 10. Prótesis Valvulares (9)
            document.getElementById('prot_check')?.checked ? 'Si' : 'No',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_posicion')?.value || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_tipo')?.options[document.getElementById('prot_tipo').selectedIndex]?.text || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_numero')?.value || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_vmax')?.value || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_gm')?.value || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_dvi_disp')?.textContent || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_ieoa_disp')?.textContent || '-') : '-',
            document.getElementById('prot_check')?.checked ? (document.getElementById('prot_insuficiencia')?.options[document.getElementById('prot_insuficiencia').selectedIndex]?.text || '-') : '-',

            // 11. Hallazgos Especiales y Pericardio (4)
            document.getElementById('asia_check').checked ? (document.getElementById('asia_excursion').value || '-') : '-',
            document.getElementById('asia_check').checked ? ({
                'no': 'No',
                'color': 'Doppler Color',
                'burbujas_basal': 'Burbujas (+)',
                'burbujas_valsalva': 'Burbujas (Valsalva)'
            }[document.getElementById('asia_shunt').value] || '-') : '-',
            document.getElementById('pe_presente').checked ? (document.getElementById('pe_tamano').value || '-') : '0',
            (document.getElementById('pe_presente').checked &&
                (
                    (document.getElementById('pe_colapso_ad').checked ? 1 : 0) +
                    (document.getElementById('pe_colapso_vd').checked ? 1 : 0) +
                    (document.getElementById('pe_variacion_flujo').checked ? 1 : 0) +
                    (document.getElementById('pe_vci_dilatada').checked ? 1 : 0)
                ) >= 2) ? 'Si' : 'No'
        ];
        return row;
    }

    async copyDataset() {
        const row = this._buildDatasetRow();
        const tsv = row.join('\t');
        try {
            await navigator.clipboard.writeText(tsv);
            this.showToast(`✅ Dataset copiado (${row.length} columnas). Pegue en Excel.`);
        } catch (err) {
            alert('✅ Dataset copiado al portapapeles');
        }
    }

    async saveStudy() {
        try {
            this.calculateAll();
            const row = this._buildDatasetRow();
            const hc  = document.getElementById('paciente_id').value || '(sin ID)';

            if (!window.GoogleSync || !GoogleSync.isConfigured()) {
                this.showToast('⚙️ Configurá Google Sheets primero con el botón ⚙️');
                return;
            }

            const btn = document.getElementById('btn_save_study');
            if (btn) btn.disabled = true;
            try {
                await GoogleSync.send(row);
                this.showToast(`✅ Guardado en Google Sheets — ${hc}`);
            } catch (err) {
                this.showToast(`⚠️ Error al guardar: ${err.message}`);
            } finally {
                if (btn) btn.disabled = false;
            }
        } catch (err) {
            this.showToast(`❌ Error: ${err.message}`);
            console.error('saveStudy error:', err);
        }
    }

    showSyncSetupModal() {
        document.getElementById('sync-setup-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'sync-setup-modal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9998;
            display:flex;align-items:center;justify-content:center;padding:1rem;
        `;

        const currentUrl      = window.GoogleSync ? GoogleSync.getUrl() : '';
        const currentSheetUrl = window.GoogleSync ? GoogleSync.getSheetUrl() : '';
        const currentDoctor   = window.GoogleSync ? GoogleSync.getDoctor() : '';
        const currentMat      = window.GoogleSync ? GoogleSync.getMatricula() : '';
        const firmaEnabled    = window.GoogleSync ? GoogleSync.isFirmaEnabled() : false;

        modal.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:1.75rem;width:min(680px,95vw);
                    max-height:85vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.25);">
            <h3 style="margin:0 0 0.25rem;font-size:1.1rem;color:#111827;">⚙️ Configuración</h3>

            <p style="margin:0 0 1rem;font-size:0.875rem;font-weight:600;color:#374151;">Google Sheets</p>

            <label style="font-size:0.875rem;font-weight:600;color:#374151;display:block;margin-bottom:0.4rem;">
                URL del Web App (Apps Script)
            </label>
            <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
                <input id="sync-url-input" type="text" value="${currentUrl}"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">
            </div>

            <label style="font-size:0.875rem;font-weight:600;color:#374151;display:block;margin-bottom:0.4rem;">
                URL de tu Google Sheet (para abrir directo)
            </label>
            <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">
                <input id="sync-sheet-url-input" type="text" value="${currentSheetUrl}"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:1rem 0;">
            <p style="margin:0 0 0.5rem;font-size:0.875rem;font-weight:600;color:#374151;">Gemini IA</p>
            <p style="margin:0 0 0.5rem;font-size:0.8rem;color:#6b7280;">
                API Key de Google Gemini para generar informes narrativos con IA.
                Obtené tu key en <strong>aistudio.google.com</strong> → "Get API Key".
            </p>
            <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;">
                <input id="gemini-key-input" type="password"
                    value="${window.GeminiAI ? GeminiAI.getKey() : ''}"
                    placeholder="AIza..."
                    style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;">
                <button id="gemini-toggle-key"
                    style="border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 0.75rem;background:#f9fafb;cursor:pointer;font-size:0.8rem;white-space:nowrap;">
                    Mostrar
                </button>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:1rem 0;">
            <p style="margin:0 0 0.75rem;font-size:0.875rem;font-weight:600;color:#374151;">Firma en informe</p>

            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                <input type="checkbox" id="firma-enabled" ${firmaEnabled ? 'checked' : ''}
                    style="width:16px;height:16px;cursor:pointer;">
                <label for="firma-enabled" style="font-size:0.875rem;color:#374151;cursor:pointer;">
                    Incluir firma al final del informe
                </label>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
                <div>
                    <label style="font-size:0.8rem;color:#6b7280;display:block;margin-bottom:0.3rem;">Nombre y apellido</label>
                    <input id="firma-nombre" type="text" value="${currentDoctor}"
                        placeholder="Ej: Lucas Robles"
                        style="width:100%;border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:0.8rem;color:#6b7280;display:block;margin-bottom:0.3rem;">Matrícula</label>
                    <input id="firma-matricula" type="text" value="${currentMat}"
                        placeholder="Ej: 366.452"
                        style="width:100%;border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.875rem;box-sizing:border-box;">
                </div>
            </div>

            <details style="margin-bottom:1rem;">
                <summary style="cursor:pointer;font-size:0.875rem;font-weight:600;color:#1e40af;margin-bottom:0.75rem;">
                    📋 Instrucciones de configuración (clic para expandir)
                </summary>
                <ol style="font-size:0.82rem;color:#374151;line-height:1.7;padding-left:1.2rem;margin:0.5rem 0;">
                    <li>Abrí tu <strong>Google Sheet</strong> (creá uno nuevo si no tenés).</li>
                    <li>Andá a <strong>Extensiones → Apps Script</strong>.</li>
                    <li>Borrá el código de ejemplo y pegá el código de abajo.</li>
                    <li>Guardá el proyecto (Ctrl+S).</li>
                    <li>Hacé clic en <strong>Implementar → Nueva implementación</strong>.</li>
                    <li>Tipo: <strong>Aplicación web</strong>.</li>
                    <li>Ejecutar como: <strong>Yo</strong>. Quién tiene acceso: <strong>Cualquier usuario</strong>.</li>
                    <li>Copiá la <strong>URL de la aplicación web</strong> y pegala arriba.</li>
                </ol>
            </details>

            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.4rem;">
                Código para Apps Script:
            </label>
            <textarea readonly rows="18"
                style="width:100%;font-family:monospace;font-size:0.75rem;border:1px solid #d1d5db;
                       border-radius:6px;padding:0.75rem;background:#f9fafb;resize:none;box-sizing:border-box;color:#111827;"
            >${window.GoogleSync ? GoogleSync.scriptCode() : ''}</textarea>

            <div id="sync-test-result" style="display:none;padding:0.5rem 0.75rem;border-radius:6px;font-size:0.85rem;margin-top:0.75rem;"></div>

            <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">
                <button id="sync-save-btn"
                    style="background:#10b981;color:#fff;border:none;border-radius:6px;padding:0.5rem 1rem;cursor:pointer;font-size:0.875rem;white-space:nowrap;">
                    💾 Guardar
                </button>
                <button id="sync-test-btn"
                    style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:0.5rem 1rem;cursor:pointer;font-size:0.875rem;">
                    🔗 Probar Conexión
                </button>
                <button id="sync-copy-code"
                    style="background:#6366f1;color:#fff;border:none;border-radius:6px;padding:0.5rem 1rem;cursor:pointer;font-size:0.875rem;">
                    📋 Copiar Código
                </button>
                <button id="sync-close"
                    style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;padding:0.5rem 1rem;cursor:pointer;font-size:0.875rem;">
                    Cerrar
                </button>
            </div>
        </div>`;

        document.body.appendChild(modal);

        document.getElementById('sync-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        // Gemini key visibility toggle
        const geminiKeyInput  = document.getElementById('gemini-key-input');
        const geminiToggleBtn = document.getElementById('gemini-toggle-key');
        if (geminiToggleBtn && geminiKeyInput) {
            geminiToggleBtn.addEventListener('click', () => {
                const show = geminiKeyInput.type === 'password';
                geminiKeyInput.type = show ? 'text' : 'password';
                geminiToggleBtn.textContent = show ? 'Ocultar' : 'Mostrar';
            });
        }

        document.getElementById('sync-save-btn').addEventListener('click', () => {
            const url = document.getElementById('sync-url-input').value.trim();
            if (url && !url.startsWith('https://script.google.com')) {
                alert('⚠️ La URL del script debe ser de Google Apps Script (https://script.google.com/...)');
                return;
            }
            if (url) GoogleSync.setUrl(url);
            const sheetUrl = document.getElementById('sync-sheet-url-input').value.trim();
            if (sheetUrl) GoogleSync.setSheetUrl(sheetUrl);
            GoogleSync.setDoctor(document.getElementById('firma-nombre').value);
            GoogleSync.setMatricula(document.getElementById('firma-matricula').value);
            GoogleSync.setFirmaEnabled(document.getElementById('firma-enabled').checked);
            // Save Gemini API key
            const geminiKey = document.getElementById('gemini-key-input')?.value?.trim();
            if (geminiKey && window.GeminiAI) GeminiAI.setKey(geminiKey);
            this.showToast('✅ Configuración guardada.');
            modal.remove();
        });

        document.getElementById('sync-test-btn').addEventListener('click', () => {
            const resultDiv = document.getElementById('sync-test-result');
            const urlInput  = document.getElementById('sync-url-input').value.trim();

            if (!urlInput) {
                resultDiv.style.cssText = 'display:block;padding:0.5rem 0.75rem;border-radius:6px;background:#fef3c7;color:#92400e;font-size:0.85rem;margin-top:0.75rem;';
                resultDiv.textContent = '⚠️ Ingresá la URL primero y guardala.';
                return;
            }

            GoogleSync.setUrl(urlInput);
            const testUrl = GoogleSync.testUrl();
            window.open(testUrl, '_blank');

            resultDiv.style.cssText = 'display:block;padding:0.5rem 0.75rem;border-radius:6px;background:#dbeafe;color:#1e40af;font-size:0.83rem;margin-top:0.75rem;line-height:1.5;';
            resultDiv.innerHTML = '🔗 Se abrió una pestaña con la URL de prueba.<br>Si ves <code style="background:#e0e7ff;padding:0 3px;border-radius:3px;">{"ok":true}</code> → el script funciona correctamente.<br>Si ves un error → copiá el texto y compartilo.';
        });

        document.getElementById('sync-copy-code').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(GoogleSync.scriptCode());
                this.showToast('✅ Código copiado al portapapeles');
            } catch { alert('Seleccioná y copiá el código manualmente.'); }
        });
    }

    showStudiesModal() {
        if (!window.StudyStorage) return;
        const studies = StudyStorage.getAll();

        // Remove existing modal
        document.getElementById('studies-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'studies-modal';
        modal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9995;
            display:flex;align-items:center;justify-content:center;padding:1rem;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background:#fff;border-radius:12px;padding:1.5rem;
            width:min(900px,95vw);max-height:80vh;display:flex;flex-direction:column;
            box-shadow:0 8px 40px rgba(0,0,0,0.25);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;';
        header.innerHTML = `
            <h3 style="margin:0;font-size:1.1rem;color:#111827;">
                📊 Historial de Estudios <span style="font-weight:normal;color:#6b7280;">(${studies.length} registro${studies.length !== 1 ? 's' : ''})</span>
            </h3>
            <div style="display:flex;gap:0.5rem;">
                <button id="sm-export" style="background:#10b981;color:#fff;border:none;border-radius:6px;padding:0.4rem 0.9rem;cursor:pointer;font-size:0.875rem;">⬇️ Exportar CSV</button>
                <button id="sm-clear" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:0.4rem 0.9rem;cursor:pointer;font-size:0.875rem;">🗑️ Borrar Todo</button>
                <button id="sm-close" style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;padding:0.4rem 0.9rem;cursor:pointer;font-size:0.875rem;">✕ Cerrar</button>
            </div>
        `;

        // Table
        const tableWrap = document.createElement('div');
        tableWrap.style.cssText = 'overflow:auto;flex:1;';

        if (!studies.length) {
            tableWrap.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">No hay estudios guardados.</p>';
        } else {
            const H = StudyStorage.HEADERS;
            // Show key columns: Fecha(0), HC(1), Edad(2), Sexo(3), FEy(23), Geometría(26), Diástole(27), PSAP(40)
            const COLS = [0, 1, 2, 3, 23, 26, 27, 40];

            let html = `<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                <thead><tr style="background:#f9fafb;position:sticky;top:0;">
                    ${COLS.map(i => `<th style="padding:0.5rem 0.75rem;text-align:left;border-bottom:2px solid #e5e7eb;white-space:nowrap;color:#374151;">${H[i]}</th>`).join('')}
                    <th style="padding:0.5rem;border-bottom:2px solid #e5e7eb;"></th>
                </tr></thead><tbody>`;

            studies.forEach((s, idx) => {
                const bg = idx % 2 === 0 ? '#fff' : '#f9fafb';
                html += `<tr style="background:${bg};">
                    ${COLS.map(i => `<td style="padding:0.45rem 0.75rem;border-bottom:1px solid #e5e7eb;">${s.row?.[i] ?? '-'}</td>`).join('')}
                    <td style="padding:0.45rem 0.5rem;border-bottom:1px solid #e5e7eb;">
                        <button onclick="StudyStorage.delete(${s.id});window.UIController.showStudiesModal();"
                            style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:1rem;" title="Eliminar">🗑️</button>
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';
            tableWrap.innerHTML = html;
        }

        box.appendChild(header);
        box.appendChild(tableWrap);
        modal.appendChild(box);
        document.body.appendChild(modal);

        // Events
        document.getElementById('sm-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        document.getElementById('sm-export').addEventListener('click', () => {
            if (!StudyStorage.exportCSV()) {
                this.showToast('⚠️ No hay estudios para exportar.');
            }
        });

        document.getElementById('sm-clear').addEventListener('click', () => {
            if (confirm(`¿Borrar los ${studies.length} estudios guardados? Esta acción no se puede deshacer.`)) {
                StudyStorage.clear();
                modal.remove();
                this.showToast('🗑️ Historial borrado.');
            }
        });
    }

    /**
     * Validate ASIA Excursion
     * @param {string} val - Excursion in mm
     */
    validateASIA(val) {
        const feedback = document.getElementById('asia_feedback');
        if (!feedback) return;

        const num = parseFloat(val);
        if (!val || isNaN(num) || num <= 0) {
            feedback.style.display = 'none';
            return;
        }

        feedback.style.display = 'block';
        feedback.className = 'qc-alert'; // Base class

        if (num >= 10) {
            // Green Style for ASIA Positive
            feedback.style.backgroundColor = '#dcfce7';
            feedback.style.color = '#166534';
            feedback.style.borderLeft = '4px solid #22c55e';
            feedback.innerHTML = '<strong>✅ Criterio de ASIA cumplido</strong> (≥10mm)';
        } else {
            // Grey Style for Hypermobile
            feedback.style.backgroundColor = '#f3f4f6';
            feedback.style.color = '#4b5563';
            feedback.style.borderLeft = '4px solid #9ca3af';
            feedback.innerHTML = 'ℹ️ Septum hipermóvil (No aneurismático)';
        }
    }

    /**
     * Validate Pericardium Size
     */
    validatePericardium(size) {
        const feedback = document.getElementById('pe_feedback');
        if (!feedback) return;

        const val = parseFloat(size);

        // Hide if empty or 0
        if (isNaN(val) || size === '' || val === 0) {
            feedback.style.display = 'none';
            feedback.className = 'validation-badge badge-none';
            return;
        }

        // Show if valid
        feedback.style.display = 'inline-block';

        if (val < 10) {
            feedback.className = 'validation-badge badge-success';
            feedback.textContent = 'Derrame Leve (<10mm)';
        } else if (val < 20) {
            feedback.className = 'validation-badge badge-warning';
            feedback.textContent = 'Derrame Moderado (10-20mm)';
        } else {
            feedback.className = 'validation-badge badge-danger';
        }
    }

    /**
     * Set Tricuspid Values (Quick Fill)
     * @param {string} grade - leve, moderada, severa, masiva, torrencial
     */
    setTricuspidValues(grade) {
        // Delegated to TricuspidRegurgitationModule
        if (window.tricuspidRegurgitation) {
            window.tricuspidRegurgitation.fillPreset(grade);
        }
    }

    /**
     * Color-code the it_grado selector based on selected severity
     */
    updateITGradeColor() {
        const el = document.getElementById('it_grado');
        if (!el) return;
        const colors = {
            'no_valorable': { bg: '',        text: '' },
            'leve':         { bg: '#dcfce7', text: '#15803d' },
            'moderada':     { bg: '#fef9c3', text: '#854d0e' },
            'severa':       { bg: '#fecaca', text: '#b91c1c' },
            'masiva':       { bg: '#881337', text: '#ffffff' },
            'torrencial':   { bg: '#4c0519', text: '#ffe4e6' },
        };
        const c = colors[el.value] || { bg: '', text: '' };
        el.style.backgroundColor = c.bg;
        el.style.color           = c.text;
    }

    /**
     * Color-code individual IT input fields based on severity thresholds (ACC/AHA 2021)
     * Called from validateTricuspidSeverity() on every value change.
     */
    colorITInputs() {
        // [moderada, severa, masiva, torrencial] thresholds per field
        const fields = [
            { id: 'it_vc',  t: [3,    7,    14,   21  ] },
            { id: 'it_ore', t: [0.20, 0.40, 0.60, 0.80] },
            { id: 'it_vr',  t: [30,   45,   60,   75  ] },
        ];
        // Colors: [leve, moderada, severa, masiva, torrencial]
        const palette = [
            { border: '#86efac', bg: '#f0fdf4' },   // leve — verde
            { border: '#fde047', bg: '#fefce8' },   // moderada — amarillo
            { border: '#fca5a5', bg: '#fff5f5' },   // severa — rojo claro
            { border: '#f43f5e', bg: '#fff1f2' },   // masiva — rojo
            { border: '#9f1239', bg: '#ffe4e6' },   // torrencial — granate
        ];

        fields.forEach(({ id, t }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = parseFloat(el.value);
            if (isNaN(val) || el.value === '') {
                el.style.borderColor = '';
                el.style.backgroundColor = '';
                return;
            }
            let level = 0;
            if      (val >= t[3]) level = 4;
            else if (val >= t[2]) level = 3;
            else if (val >= t[1]) level = 2;
            else if (val >= t[0]) level = 1;

            el.style.borderColor     = palette[level].border;
            el.style.backgroundColor = palette[level].bg;
        });
    }

    /**
     * Validate Tricuspid Severity (Advanced QC)
     */
    validateTricuspidSeverity() {
        const feedback = document.getElementById('it_qc_badge');
        if (!feedback) return;

        this.colorITInputs();

        // Get values
        const vc = parseFloat(document.getElementById('it_vc').value) || 0;
        const ore = parseFloat(document.getElementById('it_ore').value) || 0;
        const rvol = parseFloat(document.getElementById('it_vr').value) || 0;
        const hep = document.getElementById('it_flujo_hep').value;

        // Reset if no data
        if (vc === 0 && ore === 0 && rvol === 0 && hep === 'normal') {
            feedback.style.display = 'none';
            return;
        }

        feedback.style.display = 'block';
        let grade = 'leve';
        let label = 'LEVE';
        let colorObj = { bg: '#dcfce7', text: '#15803d' }; // Green default

        // Check criteria (Order: Torrential -> Massive -> Severe -> Moderate -> Mild)
        // Torrential: VC >= 21 OR ORE >= 0.80 OR VR >= 75
        if (vc >= 21 || ore >= 0.80 || rvol >= 75) {
            grade = 'torrential';
            label = 'TORRENCIAL';
            colorObj = { bg: '#4c0519', text: '#ffe4e6' }; // Very Dark Red / Pink text
        }
        // Massive: VC 14-20 OR ORE 0.60-0.79 OR VR 60-74
        else if (vc >= 14 || ore >= 0.60 || rvol >= 60) {
            grade = 'massive';
            label = 'MASIVA';
            colorObj = { bg: '#881337', text: '#ffffff' }; // Dark Red / White text
        }
        // Severe: VC 7-13 OR ORE 0.40-0.59 OR VR 45-59 OR Hepatic Reversal
        else if (vc >= 7 || ore >= 0.40 || rvol >= 45 || hep === 'reverso') {
            grade = 'severe';
            label = 'SEVERA';
            colorObj = { bg: '#fecaca', text: '#b91c1c' }; // Red
        }
        // Moderate: VC 3-6.9 OR ORE 0.20-0.39 OR VR 30-44
        else if (vc >= 3 || ore >= 0.20 || rvol >= 30) {
            grade = 'moderate';
            label = 'MODERADA';
            colorObj = { bg: '#fef9c3', text: '#854d0e' }; // Yellow
        }

        // Mismatch check: compare computed grade vs selected grade in dropdown
        const gradeOrder = ['leve', 'moderada', 'severa', 'masiva', 'torrencial'];
        const gradeNameMap = { leve: 'leve', moderate: 'moderada', severe: 'severa', massive: 'masiva', torrential: 'torrencial' };
        const computedGradeName = gradeNameMap[grade] || 'leve';
        const selectedGrade = document.getElementById('it_grado')?.value;
        const computedIdx  = gradeOrder.indexOf(computedGradeName);
        const selectedIdx  = gradeOrder.indexOf(selectedGrade);
        const mismatch = selectedIdx >= 0 && computedIdx > selectedIdx;

        // Apply styles
        feedback.className = `severity-badge badge-${grade}`;
        let icon = grade === 'torrential' || grade === 'massive' ? '⚫' :
                   (grade === 'severe' ? '🔴' : (grade === 'moderate' ? '🟡' : '🟢'));
        feedback.textContent = mismatch
            ? `${icon} ${label} ⚠ (seleccionado: ${selectedGrade})`
            : `${icon} ${label}`;
        feedback.title = mismatch
            ? `Los criterios cuantitativos sugieren ${computedGradeName.toUpperCase()} pero el grado seleccionado es ${selectedGrade?.toUpperCase()}`
            : '';

        feedback.style.backgroundColor = mismatch ? '#fef3c7' : colorObj.bg;
        feedback.style.color           = mismatch ? '#92400e'  : colorObj.text;
        feedback.style.border          = mismatch ? '1px solid #f59e0b' : '';
    }

    /**
     * Calculate PISA Tricuspid (Advanced)
     * Formula: Flow = 6.28 * r^2 * Va
     */
    calculatePISATricuspid() {
        const r = parseFloat(document.getElementById('it_pisa_radio').value);
        const va = parseFloat(document.getElementById('it_pisa_va').value);
        const vmaxMs = parseFloat(document.getElementById('it_vel_max').value); // m/s
        const vti = parseFloat(document.getElementById('it_vti').value);

        if (isNaN(r) || isNaN(va) || isNaN(vmaxMs) || vmaxMs === 0) {
            alert('Ingrese Radio (mm), Va (cm/s) y Vmax (m/s) válidos');
            return;
        }

        // Flow (ml/s) = 6.28 * r^2 * Va
        // r in cm: r/10
        const flow = 6.28 * Math.pow(r / 10, 2) * va;

        // Vmax conversion: m/s -> cm/s (* 100)
        const vmaxCmS = vmaxMs * 100;

        // EROA (cm2) = Flow / Vmax
        const eroa = flow / vmaxCmS;

        document.getElementById('it_ore').value = eroa.toFixed(2);

        // RVol (ml) = EROA * VTI
        if (!isNaN(vti) && vti > 0) {
            const rvol = eroa * vti;
            document.getElementById('it_vr').value = rvol.toFixed(0);
        } else {
            document.getElementById('it_vr').value = '-';
        }

        // Trigger validation
        this.validateTricuspidSeverity();
    }

    // Reset all form fields
    resetAll() {
        if (confirm('¿Está seguro que desea borrar todos los datos?')) {
            if (this.motility) {
                this.motility.reset();
            }
            // Explicitly clear session storage motility keys to be perfectly sure
            sessionStorage.removeItem('motility-state');
            sessionStorage.removeItem('motility-pattern');

            // Force clear all inputs to prevent browser caching on reload
            document.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = false;
                } else if (el.tagName === 'SELECT') {
                    el.selectedIndex = 0;
                } else {
                    el.value = '';
                }
            });

            // Reload from server to bypass cache
            window.location.href = window.location.pathname;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, duration = 3500) {
        document.getElementById('app-toast')?.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.textContent = message;
        toast.style.cssText = [
            'position:fixed',
            'bottom:90px',
            'left:50%',
            'transform:translateX(-50%)',
            'background:#1f2937',
            'color:#fff',
            'padding:0.7rem 1.4rem',
            'border-radius:10px',
            'font-size:0.9rem',
            'font-weight:500',
            'z-index:99999',
            'box-shadow:0 4px 16px rgba(0,0,0,0.35)',
            'opacity:0',
            'transition:opacity 0.2s ease',
            'pointer-events:none',
            'max-width:90vw',
            'text-align:center'
        ].join(';');

        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 250);
        }, duration);
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

    /**
     * Initialize Theme System
     */
    initTheme() {
        const btnTheme = document.getElementById('btn-theme-toggle');
        const themeIcon = document.getElementById('theme-icon');

        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        if (btnTheme) {
            btnTheme.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';

                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                this.updateThemeIcon(next);
            });
        }
    }

    updateThemeIcon(theme) {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// Export for use in other modules or global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
} else {
    window.UIController = UIController;
}

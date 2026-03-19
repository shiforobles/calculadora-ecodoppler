/**
 * Clinical Voice Recognition System v2.0
 *
 * Mejoras de performance respecto a v1.0:
 * - interimResults = true  → feedback visual en tiempo real mientras se habla
 * - maxAlternatives = 3   → mejor matching usando hipótesis alternativas del motor
 * - Regex pre-compilados  → compilación única al iniciar, no en cada transcripción
 * - AudioContext reutilizable → evita leak de contextos de audio
 * - Reinicio instantáneo  → sin delay artificial entre sesiones
 * - Live transcript pill  → muestra qué está escuchando el motor en tiempo real
 */

class VoiceRecognition {
    constructor(uiController) {
        this.ui = uiController;
        this.recognition = null;
        this.isActive = false;
        this.manualStop = false;
        this.lastContext = null;
        this._audioContext = null;       // Reutilizable, creado una sola vez
        this._transcriptTimer = null;    // Timer para ocultar el live transcript
        this._compiledPatterns = [];     // Regex pre-compilados

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            return;
        }

        this.initRecognition();
        this.buildClinicalDictionary();
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;  // MEJORA: feedback en tiempo real
        this.recognition.lang = 'es-AR';
        this.recognition.maxAlternatives = 3;    // MEJORA: 3 hipótesis por resultado

        this.recognition.onstart = () => this.handleStart();
        this.recognition.onend   = () => this.handleEnd();
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror  = (event) => this.handleError(event);
    }

    buildClinicalDictionary() {
        this.dictionary = {
            // Datos del paciente
            pacienteId: {
                patterns: [
                    'id', 'i de', 'ide', 'identificación', 'identificacion',
                    'historia', 'hc', 'ha ce', 'historia clínica', 'historia clinica',
                    'número', 'numero', 'paciente'
                ],
                field: 'paciente_id',
                type: 'text'
            },
            peso: {
                patterns: ['peso', 'pe so', 'kilogramos', 'kilos', 'kg'],
                field: 'peso',
                type: 'number'
            },
            altura: {
                patterns: ['altura', 'al tura', 'talla', 'ta ya', 'centímetros', 'centimetros', 'cm'],
                field: 'altura',
                type: 'number'
            },
            edad: {
                patterns: ['edad', 'e dad', 'años', 'anios'],
                field: 'edad',
                type: 'number'
            },

            // Biometría VI
            septum: {
                patterns: [
                    'septum', 'sep', 'sept', 'se tum', 'ceptum',
                    'tabique', 'ta bique', 'interventricular', 'inter ventricular',
                    'siv', 'si vi', 'ese i be', 'esivi', 'septo'
                ],
                field: 'siv',
                type: 'number'
            },
            pared: {
                patterns: [
                    'pared posterior', 'pared', 'pa red', 'posterior',
                    'pos terior', 'pp', 'pe pe', 'doble pe', 'pared pos'
                ],
                field: 'pp',
                type: 'number'
            },
            ddvi: {
                patterns: [
                    'diámetro diastólico', 'diametro diastolico', 'diastólico', 'diastolico',
                    'ddvi', 'de de vi', 'de de be i', 'doble de vi',
                    'diámetro diástole', 'diametro diastole', 'dd'
                ],
                field: 'ddvi',
                type: 'number'
            },
            dsvi: {
                patterns: [
                    'diámetro sistólico', 'diametro sistolico', 'sistólico', 'sistolico',
                    'dsvi', 'de ese vi', 'de ese be i', 'de s vi',
                    'diámetro sístole', 'diametro sistole', 'ds'
                ],
                field: 'dsvi',
                type: 'number'
            },
            fevi: {
                patterns: [
                    'fey', 'fe', 'efe', 'fracción', 'fraccion', 'fevi',
                    'fe vi', 'efe vi', 'eyección', 'eyeccion', 'fracción eyección',
                    'fraccion eyeccion', 'simpson'
                ],
                field: 'fevi',
                type: 'number'
            },

            // Diástole
            ondaE: {
                patterns: [
                    'onda e', 'onda ele', 'on da e', 'on da ele',
                    'pico e', 'pico ele', 'pi co e', 'pi co ele',
                    'e mitral', 'ele mitral', 'e mi tral',
                    'velocidad e', 'velocidad ele', 'vel e', 'vel ele',
                    'e temprana', 'ele temprana', 'temprana',
                    'onda é', 'é', 'e diástole', 'e diastole'
                ],
                field: 'onda_e',
                type: 'number'
            },
            ondaA: {
                patterns: [
                    'onda a', 'on da a', 'onda ah',
                    'pico a', 'pi co a', 'pico ah',
                    'a mitral', 'ah mitral', 'a mi tral',
                    'velocidad a', 'vel a', 'velocidad ah',
                    'a tardía', 'a tardia', 'tardía', 'tardia',
                    'onda á', 'a auricular', 'auricular'
                ],
                field: 'onda_a',
                type: 'number'
            },
            ePrima: {
                patterns: [
                    'e prima', 'e prime', 'eprima', 'é prima',
                    'ele prima', 'e pri ma', 'tissue', 'tisular',
                    'e anular', 'e septal', 'e lateral'
                ],
                field: 'onda_e_prime',
                type: 'number'
            },

            // Aurícula Izquierda
            volAI: {
                patterns: [
                    'volumen indexado', 'volumen in dexado', 'vol indexado',
                    'volumen ai', 'vol ai', 'volumen a i',
                    'volumen aurícula', 'volumen auricula', 'vol aurícula'
                ],
                field: 'vol_ai',
                type: 'number'
            },
            areaAI: {
                patterns: [
                    'área ai', 'area ai', 'á rea ai', 'a rea ai',
                    'área aurícula', 'area auricula', 'área a i',
                    'área izquierda', 'area izquierda',
                    'área lanus', 'area lanus', 'área cuatro cámaras'
                ],
                field: 'lanus_area_4c',
                type: 'number'
            },
            largoAI: {
                patterns: [
                    'largo ai', 'lar go ai', 'largo a i',
                    'largo aurícula', 'largo auricula',
                    'longitud', 'longi tud', 'longitud ai',
                    'longitud aurícula', 'longitud lanus'
                ],
                field: 'lanus_longitud',
                type: 'number'
            },

            // Cavidades Derechas
            adArea: {
                patterns: [
                    'área derecha', 'area derecha', 'ad área', 'ad area',
                    'a de área', 'a de area', 'aurícula derecha área',
                    'auricula derecha area', 'área ad', 'area ad'
                ],
                field: 'ad_area',
                type: 'number'
            },
            vdBasal: {
                patterns: [
                    'ventrículo derecho', 'ventriculo derecho', 'vd', 've de',
                    'basal', 'ba sal', 'vd basal', 've de basal',
                    'diámetro basal', 'diametro basal', 'vd diámetro'
                ],
                field: 'vd_basal',
                type: 'number'
            },
            tapse: {
                patterns: [
                    'tapse', 'tap se', 'taps', 'ta pse', 'tapce',
                    'ta se', 'tricúspide', 'tricuspide', 'anular',
                    'excursión', 'excursion'
                ],
                field: 'tapse',
                type: 'number'
            },
            sPrimaVD: {
                patterns: [
                    's prima', 's prime', 's vd', 'ese prima',
                    's prima vd', 's prima derecho', 's tissue vd',
                    's prima tricúspide', 's prima tricuspide',
                    'ese prima vd', 'ese vd'
                ],
                field: 's_prima_vd',
                type: 'number'
            },
            velIT: {
                patterns: [
                    'it', 'i te',
                    'velocidad it', 'velocidad i te', 'it velocidad', 'i te velocidad',
                    'vel it', 'vel i te', 'vmax it', 've max it', 'ite',
                    'velocidad tricúspide', 'velocidad tricuspide',
                    'tricúspide velocidad', 'tricuspide velocidad',
                    'tri cuspide', 'vmax tricúspide', 'vmax tricuspide',
                    'it jet', 'jet it', 'jet tricúspide', 'jet tricuspide'
                ],
                field: 'vel_it',
                type: 'number'
            },
            pad: {
                patterns: [
                    'pad', 'pa de', 'pe a de', 'presión', 'presion',
                    'presión aurícula derecha', 'presion auricula derecha',
                    'presión ad', 'presion ad', 'presión a de'
                ],
                field: 'pad',
                type: 'number'
            },

            // Aorta
            aoRaiz: {
                patterns: [
                    'raíz aórtica', 'raiz aortica', 'raíz', 'ra iz',
                    'aorta raíz', 'aorta raiz', 'raíz aorta',
                    'ao raíz', 'ao raiz', 'a o raíz'
                ],
                field: 'ao_raiz',
                type: 'number'
            },
            aoAsc: {
                patterns: [
                    'ascendente', 'as cendente', 'aorta ascendente',
                    'ao ascendente', 'a o ascendente', 'asc',
                    'aorta asc', 'ao asc'
                ],
                field: 'ao_asc',
                type: 'number'
            }
        };

        // Válvulas
        this.valveMap = {
            mitral: {
                names: ['mitral', 'im', 'em'],
                insuf: 'im_grado',
                esten: 'em_grado'
            },
            aortica: {
                names: ['aórtica', 'aortica', 'ao', 'ea', 'ia'],
                insuf: 'ia_grado',
                esten: 'ea_grado'
            },
            tricuspide: {
                names: ['tricúspide', 'tricuspídea', 'tricuspide'],
                insuf: 'it_grado'
            }
        };

        this.gradeMap = {
            'no': 'no',
            'sin': 'no',
            'leve': 'leve',
            'uno': 'leve',
            '1': 'leve',
            'moderada': 'moderada',
            'dos': 'moderada',
            '2': 'moderada',
            'severa': 'severa',
            'tres': 'severa',
            '3': 'severa'
        };

        this.commands = {
            calcular: ['calcular volumen', 'calcular'],
            generar:  ['generar informe', 'generar'],
            borrar:   ['borrar', 'limpiar']
        };

        // MEJORA: Pre-compilar todos los patrones una sola vez
        // En lugar de crear RegExp en cada transcripción, se compilan aquí.
        this._compiledPatterns = [];
        for (const fieldData of Object.values(this.dictionary)) {
            for (const pattern of fieldData.patterns) {
                this._compiledPatterns.push({
                    regex: new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
                    fieldData
                });
            }
        }

        // Pre-compilar patterns de válvulas y grados
        this._compiledValveNames = [];
        for (const [valveName, valveData] of Object.entries(this.valveMap)) {
            for (const name of valveData.names) {
                this._compiledValveNames.push({
                    regex: new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'),
                    valveName,
                    valveData
                });
            }
        }

        this._compiledGrades = Object.entries(this.gradeMap).map(([gradeKey, gradeValue]) => ({
            regex: new RegExp('\\b' + gradeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'),
            gradeValue
        }));
    }

    start() {
        if (!this.recognition) {
            alert('Reconocimiento de voz no disponible en este navegador');
            return;
        }
        this.isActive = true;
        this.manualStop = false;
        try {
            this.recognition.start();
            this.updateUI(true);
        } catch (error) {
            // Ya iniciado, ignorar
        }
    }

    stop() {
        this.isActive = false;
        this.manualStop = true;
        if (this.recognition) {
            this.recognition.stop();
            this.updateUI(false);
        }
        this.hideLiveTranscript();
    }

    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }

    handleStart() {
        // Sin console.log en producción
    }

    handleEnd() {
        // MEJORA: Reinicio instantáneo sin delay artificial
        if (this.isActive && !this.manualStop) {
            try {
                this.recognition.start();
            } catch (error) {
                // Si falla (estado incorrecto), un tick mínimo es suficiente
                setTimeout(() => {
                    try { this.recognition.start(); } catch (_) {}
                }, 50);
            }
        }
    }

    handleResult(event) {
        let interimTranscript = '';
        let finalTranscript  = '';

        // MEJORA: Procesar tanto resultados intermedios como finales
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];

            if (result.isFinal) {
                // Intentar matching con las 3 alternativas antes de descartar
                let matched = false;
                for (let alt = 0; alt < result.length && !matched; alt++) {
                    const text = result[alt].transcript.toLowerCase().trim();
                    if (alt === 0) finalTranscript = text;
                    matched = this._tryProcess(text);
                }
                if (matched) {
                    this.updateLiveTranscript(finalTranscript, true);
                } else {
                    this.updateLiveTranscript(finalTranscript, false);
                }
            } else {
                // Resultado intermedio: solo mostrar visualmente, nunca llenar campo
                interimTranscript += result[0].transcript.toLowerCase().trim();
            }
        }

        if (interimTranscript) {
            this.updateLiveTranscript(interimTranscript, null); // null = en progreso
        }
    }

    handleError(event) {
        if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
        }
        if (this.isActive && !this.manualStop) {
            setTimeout(() => {
                try { this.recognition.start(); } catch (_) {}
            }, 300);
        }
    }

    // Intenta procesar un transcript, devuelve true si encontró match
    _tryProcess(transcript) {
        if (this.processCommand(transcript)) return true;
        if (this.processValve(transcript))   return true;
        if (this.processField(transcript))   return true;
        return false;
    }

    processTranscript(transcript) {
        this._tryProcess(transcript);
    }

    processCommand(transcript) {
        if (transcript.includes('calcular')) {
            if (this.ui.calcLanus) {
                this.ui.calcLanus();
                this.ui.showToast('✓ Volumen AI calculado', 'success');
            }
            return true;
        }
        if (transcript.includes('generar')) {
            this.ui.generateReport();
            this.ui.showToast('✓ Informe generado', 'success');
            return true;
        }
        if (transcript.includes('borrar') || transcript.includes('limpiar')) {
            this.ui.showToast('Borrar no implementado aún', 'warning');
            return true;
        }
        return false;
    }

    processValve(transcript) {
        if (transcript.includes('velocidad') || transcript.includes('vmax') || transcript.includes('gradiente')) {
            return false;
        }

        // MEJORA: Usar regex pre-compilados en lugar de crearlos aquí
        for (const { regex, valveName, valveData } of this._compiledValveNames) {
            if (regex.test(transcript)) {
                for (const { regex: gradeRx, gradeValue } of this._compiledGrades) {
                    if (gradeRx.test(transcript)) {
                        let fieldId = null;
                        if (transcript.includes('insuf') || valveName.startsWith('i')) {
                            fieldId = valveData.insuf;
                        } else if (transcript.includes('esten') || valveName.startsWith('e')) {
                            fieldId = valveData.esten;
                        } else {
                            fieldId = valveData.insuf;
                        }
                        if (fieldId) {
                            this.fillField(fieldId, gradeValue);
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    processField(transcript) {
        const numberMatch = transcript.match(/(\d+(?:[.,]\d+)?)/);
        const number = numberMatch ? numberMatch[1].replace(',', '.') : null;

        // MEJORA: Usar _compiledPatterns pre-compilados (O(n) con objetos ya creados)
        for (const { regex, fieldData } of this._compiledPatterns) {
            if (regex.test(transcript)) {
                if (fieldData.type === 'number' && number) {
                    this.fillField(fieldData.field, number);
                    return true;
                }
                if (fieldData.type === 'text') {
                    if (number) {
                        this.fillField(fieldData.field, number);
                    } else {
                        const parts = transcript.split(regex);
                        if (parts.length > 1) {
                            const val = parts[1].trim().split(' ')[0];
                            if (val) this.fillField(fieldData.field, val);
                        }
                    }
                    return true;
                }
            }
        }
        return false;
    }

    fillField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.value = value;
        field.dispatchEvent(new Event('input',  { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));

        this.highlightField(field);

        const label = field.previousElementSibling?.textContent || field.placeholder || fieldId;
        this.showLargeConfirmation(label, value);
        this.playBeep();
        this.ui.showToast(`✓ ${label}: ${value}`, 'success');
    }

    highlightField(field) {
        field.classList.add('field-highlight');
        setTimeout(() => field.classList.remove('field-highlight'), 600);
    }

    /**
     * MEJORA: Live transcript pill — muestra qué está escuchando el motor
     * en tiempo real antes de confirmar el resultado final.
     *
     * @param {string} text - Texto reconocido
     * @param {boolean|null} isFinal - true=confirmado, false=no encontrado, null=en progreso
     */
    updateLiveTranscript(text, isFinal) {
        let pill = document.getElementById('voice-live-transcript');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'voice-live-transcript';
            pill.style.cssText = [
                'position:fixed', 'bottom:72px', 'left:50%', 'transform:translateX(-50%)',
                'background:rgba(15,23,42,0.88)', 'color:#f1f5f9',
                'padding:6px 18px', 'border-radius:20px',
                'font-size:0.88em', 'font-family:inherit',
                'max-width:80vw', 'white-space:nowrap', 'overflow:hidden',
                'text-overflow:ellipsis', 'pointer-events:none',
                'z-index:9998', 'transition:opacity 0.25s ease',
                'border:1px solid rgba(255,255,255,0.12)'
            ].join(';');
            document.body.appendChild(pill);
        }

        clearTimeout(this._transcriptTimer);

        if (isFinal === null) {
            // En progreso: mostrar gris con cursor parpadeante
            pill.style.opacity = '1';
            pill.style.borderColor = 'rgba(148,163,184,0.4)';
            pill.textContent = `🎤 ${text}`;
        } else if (isFinal === true) {
            // Reconocido correctamente: mostrar verde brevemente
            pill.style.opacity = '1';
            pill.style.borderColor = 'rgba(34,197,94,0.6)';
            pill.textContent = `✓ ${text}`;
            this._transcriptTimer = setTimeout(() => this.hideLiveTranscript(), 1200);
        } else {
            // No encontró campo: mostrar amarillo y desaparecer
            pill.style.opacity = '1';
            pill.style.borderColor = 'rgba(234,179,8,0.5)';
            pill.textContent = `? ${text}`;
            this._transcriptTimer = setTimeout(() => this.hideLiveTranscript(), 1800);
        }
    }

    hideLiveTranscript() {
        const pill = document.getElementById('voice-live-transcript');
        if (pill) {
            pill.style.opacity = '0';
        }
    }

    showLargeConfirmation(label, value) {
        // Reutilizar overlay existente en lugar de recrearlo
        let overlay = document.getElementById('voice-confirmation-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'voice-confirmation-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="voice-confirm-content">
                <div class="voice-confirm-label">${label}</div>
                <div class="voice-confirm-value">${value}</div>
            </div>
        `;
        overlay.style.opacity = '1';

        clearTimeout(this._confirmTimer);
        this._confirmTimer = setTimeout(() => {
            overlay.style.opacity = '0';
        }, 1400);
    }

    /**
     * MEJORA: AudioContext reutilizable — se crea una sola vez y se reutiliza
     * para todos los beeps, evitando acumular contextos en memoria.
     */
    playBeep() {
        try {
            if (!this._audioContext) {
                this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = this._audioContext;

            // Reactivar si el navegador lo suspendió (política de autoplay)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const oscillator = ctx.createOscillator();
            const gainNode   = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.1);
        } catch (_) {
            // Silencioso: el beep es accesorio, no crítico
        }
    }

    updateUI(isActive) {
        const btnVoice      = document.getElementById('btn-voice-toggle');
        const voiceStatus   = document.getElementById('voice-status');
        const voiceIndicator = document.getElementById('voice-indicator');
        const voiceIcon     = document.getElementById('voice-icon');

        if (isActive) {
            btnVoice?.classList.add('active');
            if (voiceStatus)    voiceStatus.textContent   = 'Detener Dictado';
            if (voiceIndicator) voiceIndicator.style.display = 'flex';
            if (voiceIcon)      voiceIcon.textContent     = '🔴';
        } else {
            btnVoice?.classList.remove('active');
            if (voiceStatus)    voiceStatus.textContent   = 'Iniciar Dictado';
            if (voiceIndicator) voiceIndicator.style.display = 'none';
            if (voiceIcon)      voiceIcon.textContent     = '🎤';
        }
    }
}

if (typeof window !== 'undefined') {
    window.VoiceRecognition = VoiceRecognition;
}

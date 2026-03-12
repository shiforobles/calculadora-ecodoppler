/**
 * Clinical Voice Recognition System v1.0
 * Continuous speech recognition with semantic field mapping
 */

class VoiceRecognition {
    constructor(uiController) {
        this.ui = uiController;
        this.recognition = null;
        this.isActive = false;
        this.manualStop = false;
        this.lastContext = null;

        // Check browser support
        if (!('webkitSpeechRecognition' in window)) {
            console.warn('Speech Recognition not supported in this browser');
            return;
        }

        this.initRecognition();
        this.buildClinicalDictionary();
    }

    initRecognition() {
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'es-AR';
        this.recognition.maxAlternatives = 1;

        // Event handlers
        this.recognition.onstart = () => this.handleStart();
        this.recognition.onend = () => this.handleEnd();
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
    }

    buildClinicalDictionary() {
        this.dictionary = {
            // Patient data - EXPANDED
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

            // LV Biometry - MASSIVELY EXPANDED
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

            // Diastole - EXPANDED
            ondaE: {
                patterns: [
                    // E variations
                    'onda e', 'onda ele', 'on da e', 'on da ele',
                    'pico e', 'pico ele', 'pi co e', 'pi co ele',
                    // E mitral
                    'e mitral', 'ele mitral', 'e mi tral',
                    // Velocidad E
                    'velocidad e', 'velocidad ele', 'vel e', 'vel ele',
                    // E temprana
                    'e temprana', 'ele temprana', 'temprana',
                    // Phonetic
                    'onda é', 'é', 'e diástole', 'e diastole'
                ],
                field: 'onda_e',
                type: 'number'
            },
            ondaA: {
                patterns: [
                    // A variations
                    'onda a', 'on da a', 'onda ah',
                    'pico a', 'pi co a', 'pico ah',
                    // A mitral
                    'a mitral', 'ah mitral', 'a mi tral',
                    // Velocidad A
                    'velocidad a', 'vel a', 'velocidad ah',
                    // A tardía
                    'a tardía', 'a tardia', 'tardía', 'tardia',
                    // Phonetic
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

            // Left Atrium (Lanús) - EXPANDED
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

            // Right Chambers - MASSIVELY EXPANDED
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
                    // Standalone IT (prioritized for velocity)
                    'it', 'i te',
                    // IT variations
                    'velocidad it', 'velocidad i te', 'it velocidad', 'i te velocidad',
                    'vel it', 'vel i te', 'vmax it', 've max it', 'ite',
                    // Tricúspide variations
                    'velocidad tricúspide', 'velocidad tricuspide',
                    'tricúspide velocidad', 'tricuspide velocidad',
                    'tri cuspide', 'vmax tricúspide', 'vmax tricuspide',
                    // Insuficiencia tricúspide
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

            // Aorta - EXPANDED
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

        // Valve patterns
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
                // REMOVED 'it' to avoid confusion with IT velocity
                // User will select tricuspid grading manually
                names: ['tricúspide', 'tricuspídea', 'tricuspide'],
                insuf: 'it_grado'
            }
        };

        // Grade mapping
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

        // Commands
        this.commands = {
            calcular: ['calcular volumen', 'calcular'],
            generar: ['generar informe', 'generar'],
            borrar: ['borrar', 'limpiar']
        };
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
            console.error('Error starting recognition:', error);
            // Already started, ignore
        }
    }

    stop() {
        this.isActive = false;
        this.manualStop = true;

        if (this.recognition) {
            this.recognition.stop();
            this.updateUI(false);
        }
    }

    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }

    handleStart() {
        console.log('Voice recognition started');
    }

    handleEnd() {
        console.log('Voice recognition ended');

        // Auto-restart if not manually stopped
        if (this.isActive && !this.manualStop) {
            setTimeout(() => {
                try {
                    this.recognition.start();
                } catch (error) {
                    console.log('Restart failed, retrying...', error);
                }
            }, 100);
        }
    }

    handleResult(event) {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('Transcript:', transcript);

        // Process the transcript
        this.processTranscript(transcript);
    }

    handleError(event) {
        console.error('Recognition error:', event.error);

        // Ignore 'no-speech' and 'aborted' errors
        if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
        }

        // For other errors, try to restart if active
        if (this.isActive && !this.manualStop) {
            setTimeout(() => {
                try {
                    this.recognition.start();
                } catch (error) {
                    console.log('Error restart failed');
                }
            }, 500);
        }
    }

    processTranscript(transcript) {
        // Check for commands first
        if (this.processCommand(transcript)) {
            return;
        }

        // Check for valve patterns
        if (this.processValve(transcript)) {
            return;
        }

        // Check for field patterns
        this.processField(transcript);
    }

    processCommand(transcript) {
        // Calcular volumen
        if (transcript.includes('calcular')) {
            if (this.ui.calcLanus) {
                this.ui.calcLanus();
                this.ui.showToast('✓ Volumen AI calculado', 'success');
            }
            return true;
        }

        // Generar informe
        if (transcript.includes('generar')) {
            this.ui.generateReport();
            this.ui.showToast('✓ Informe generado', 'success');
            return true;
        }

        // Borrar
        if (transcript.includes('borrar') || transcript.includes('limpiar')) {
            // TODO: Clear last filled field
            this.ui.showToast('Borrar no implementado aún', 'warning');
            return true;
        }

        return false;
    }

    processValve(transcript) {
        // Skip if transcript contains keywords suggesting a measurement
        if (transcript.includes('velocidad') || transcript.includes('vmax') || transcript.includes('gradiente')) {
            return false;
        }

        // Look for valve + grade patterns with word boundaries
        for (const [valveName, valveData] of Object.entries(this.valveMap)) {
            for (const name of valveData.names) {
                // Use word boundary for name to avoid false matches
                const nameRegex = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
                if (nameRegex.test(transcript)) {
                    // Found valve, now look for grade with word boundaries
                    for (const [gradeKey, gradeValue] of Object.entries(this.gradeMap)) {
                        const gradeRegex = new RegExp('\\b' + gradeKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
                        if (gradeRegex.test(transcript)) {
                            // Determine if insuf or esten
                            let fieldId = null;

                            if (transcript.includes('insuf') || name.startsWith('i')) {
                                fieldId = valveData.insuf;
                            } else if (transcript.includes('esten') || name.startsWith('e')) {
                                fieldId = valveData.esten;
                            } else {
                                // Default to insuf
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
        }

        return false;
    }

    processField(transcript) {
        // Extract number if present
        const numberMatch = transcript.match(/(\d+(?:[.,]\d+)?)/);
        const number = numberMatch ? numberMatch[1].replace(',', '.') : null;

        // Look for field patterns with word boundaries
        for (const [key, fieldData] of Object.entries(this.dictionary)) {
            for (const pattern of fieldData.patterns) {
                // Use word boundary to prevent false matches (e.g., 'id' in 'velocidad')
                const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

                if (patternRegex.test(transcript)) {
                    // Number fields require a number
                    if (fieldData.type === 'number' && number) {
                        this.fillField(fieldData.field, number);
                        return true;
                    }

                    // Text fields can use numbers or text
                    if (fieldData.type === 'text') {
                        if (number) {
                            this.fillField(fieldData.field, number);
                        } else {
                            // Extract text after pattern
                            const words = transcript.split(pattern);
                            if (words.length > 1) {
                                const val = words[1].trim().split(' ')[0]; // Take first word
                                if (val) this.fillField(fieldData.field, val);
                            }
                        }
                        return true;
                    }
                }
            }
        }

        // NO context logic - if no field pattern found, ignore the transcript
        return false;
    }

    fillField(fieldId, value) {
        const field = document.getElementById(fieldId);

        if (!field) {
            console.warn(`Field ${fieldId} not found`);
            return;
        }

        field.value = value;

        // Trigger change events
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));

        // Highlight field
        this.highlightField(field);

        // Get field label
        const label = field.previousElementSibling?.textContent || field.placeholder || fieldId;

        // Show LARGE visual confirmation
        this.showLargeConfirmation(label, value);

        // Play confirmation beep
        this.playBeep();

        // Show toast (smaller)
        this.ui.showToast(`✓ ${label}: ${value}`, 'success');

        console.log(`Filled ${fieldId} with ${value}`);
    }

    highlightField(field) {
        field.classList.add('field-highlight');
        setTimeout(() => {
            field.classList.remove('field-highlight');
        }, 600);
    }

    /**
     * Show large visual confirmation overlay
     */
    showLargeConfirmation(label, value) {
        // Remove existing overlay if any
        const existing = document.getElementById('voice-confirmation-overlay');
        if (existing) {
            existing.remove();
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'voice-confirmation-overlay';
        overlay.innerHTML = `
            <div class="voice-confirm-content">
                <div class="voice-confirm-label">${label}</div>
                <div class="voice-confirm-value">${value}</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Auto-remove after 1.5 seconds
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }, 1500);
    }

    /**
     * Play confirmation beep
     */
    playBeep() {
        // Create audio context for beep
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // Higher pitch
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio beep not supported');
        }
    }

    updateUI(isActive) {
        const btnVoice = document.getElementById('btn-voice-toggle');
        const voiceStatus = document.getElementById('voice-status');
        const voiceIndicator = document.getElementById('voice-indicator');
        const voiceIcon = document.getElementById('voice-icon');

        if (isActive) {
            btnVoice?.classList.add('active');
            if (voiceStatus) voiceStatus.textContent = 'Detener Dictado';
            if (voiceIndicator) voiceIndicator.style.display = 'flex';
            if (voiceIcon) voiceIcon.textContent = '🔴';
        } else {
            btnVoice?.classList.remove('active');
            if (voiceStatus) voiceStatus.textContent = 'Iniciar Dictado';
            if (voiceIndicator) voiceIndicator.style.display = 'none';
            if (voiceIcon) voiceIcon.textContent = '🎤';
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.VoiceRecognition = VoiceRecognition;
}

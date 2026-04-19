/**
 * AI Clinical Assistant — Groq Integration
 * Floating chat widget connected to Groq API (Llama 3.1 70B)
 * Patient dataset is injected automatically as context on each session
 */

class AIAssistant {
    constructor() {
        this.apiKey    = localStorage.getItem('groq_api_key') || '';
        this.model     = 'llama-3.3-70b-versatile';
        this.history   = [];   // {role, text}[]
        this.isOpen    = false;
        this.isLoading = false;

        this._injectStyles();
        this._buildUI();
        this._attachEvents();
    }

    // ─── Patient Context ────────────────────────────────────────────────────

    _collectPatientData() {
        const get  = id => document.getElementById(id)?.value || '';
        const getT = id => document.getElementById(id)?.options[document.getElementById(id)?.selectedIndex]?.text || '';

        return {
            // Datos básicos
            id:      get('paciente_id'),
            edad:    get('edad'),
            sexo:    getT('sexo'),
            peso:    get('peso'),
            altura:  get('altura'),
            sc:      get('sc_display'),
            ritmo:   getT('ritmo'),

            // VI
            siv:     get('siv'),
            pp:      get('pp'),
            ddvi:    get('ddvi'),
            dsvi:    get('dsvi'),
            fevi:    get('fevi'),
            masaVI:  document.getElementById('masa_info')?.textContent || '',

            // Diástole
            ondaE:   get('onda_e'),
            ondaA:   get('onda_a'),
            ePrima:  get('onda_e_prime'),
            eaRatio: get('ea_ratio_display'),
            eeRatio: get('ee_ratio_display'),
            volAI:   get('vol_ai'),

            // Aorta
            aoRaiz:  get('ao_raiz'),
            aoAsc:   get('ao_asc'),

            // Válvulas
            imGrado: get('im_grado'),
            emGrado: get('em_grado'),
            iaGrado: get('ia_grado') || get('iao_grado'),
            eaGrado: get('ea_grado'),
            itGrado: get('it_grado'),

            // Estenosis aórtica
            eaVmax:  get('ea_vmax'),
            eaGm:    get('ea_grad_medio'),
            eaAva:   get('ea_ava'),
            eaAvaI:  get('ea_ava_index'),
            eaCoef:  get('ea_coef'),

            // IT / PSAP
            velIt:   get('vel_it'),
            pad:     get('pad'),
            psap:    document.getElementById('psap_info')?.textContent || '',

            // Cavidades derechas
            tapse:   get('tapse'),
            sPrima:  get('s_prima_vd'),
            vdBasal: get('vd_basal'),
            adArea:  get('ad_area'),
        };
    }

    _buildSystemPrompt() {
        const p = this._collectPatientData();

        const lines = [];
        if (p.id)    lines.push(`ID: ${p.id}`);
        if (p.edad)  lines.push(`Edad: ${p.edad} años | Sexo: ${p.sexo}`);
        if (p.peso)  lines.push(`Peso: ${p.peso} kg | Talla: ${p.altura} cm | SC: ${p.sc} m²`);
        if (p.ritmo) lines.push(`Ritmo: ${p.ritmo}`);

        if (p.siv || p.ddvi) {
            lines.push(`\nVI Biometría: SIV ${p.siv}mm | PP ${p.pp}mm | DDVI ${p.ddvi}mm | DSVI ${p.dsvi}mm`);
            if (p.masaVI) lines.push(`${p.masaVI}`);
        }
        if (p.fevi) lines.push(`FEy: ${p.fevi}%`);

        if (p.ondaE) {
            lines.push(`\nDiástole: E ${p.ondaE} cm/s | A ${p.ondaA} cm/s | E/A ${p.eaRatio} | e' ${p.ePrima} cm/s | E/e' ${p.eeRatio}`);
            lines.push(`Vol AI indexado: ${p.volAI} ml/m²`);
        }

        if (p.aoRaiz) lines.push(`\nAorta: Raíz ${p.aoRaiz}mm | Asc ${p.aoAsc}mm`);

        const valv = [];
        if (p.imGrado) valv.push(`IM ${p.imGrado}`);
        if (p.emGrado) valv.push(`EM ${p.emGrado}`);
        if (p.iaGrado) valv.push(`IAo ${p.iaGrado}`);
        if (p.itGrado) valv.push(`IT ${p.itGrado}`);
        if (valv.length) lines.push(`\nVálvulas: ${valv.join(' | ')}`);

        if (p.eaVmax || p.eaAva) {
            lines.push(`EA — Vmax: ${p.eaVmax} m/s | Grad medio: ${p.eaGm} mmHg | AVA: ${p.eaAva} cm² | AVAi: ${p.eaAvaI} cm²/m² | Coef: ${p.eaCoef}`);
        }

        if (p.tapse) lines.push(`\nVD: TAPSE ${p.tapse}mm | s' ${p.sPrima} cm/s | Basal ${p.vdBasal}mm | AD área ${p.adArea} cm²`);
        if (p.velIt) lines.push(`IT Vmax: ${p.velIt} m/s | PAD: ${p.pad} mmHg | ${p.psap}`);

        const dataSection = lines.length
            ? `\n\nDATOS DEL PACIENTE ACTUAL:\n${lines.join('\n')}`
            : '\n\nNo hay datos de paciente cargados aún.';

        return `Sos un asistente clínico especializado en ecocardiografía, con profundo conocimiento de las guías ASE, EACVI, ESC y ACC/AHA. Respondés en español argentino, de forma concisa y clínica.

Tu rol es ayudar al médico a interpretar los hallazgos ecocardiográficos del paciente actual, responder preguntas sobre guías clínicas, y sugerir diagnósticos diferenciales cuando corresponda.

Cuando el médico pregunte sobre indicaciones, umbrales o clasificaciones, siempre citá la guía y el año (ej: "ASE 2016", "ESC 2021").

Nunca inventés valores que no estén en los datos del paciente. Si falta información para responder algo, decilo claramente.${dataSection}`;
    }

    // ─── Gemini API ─────────────────────────────────────────────────────────

    async _sendToGroq(userMessage) {
        if (!this.apiKey) {
            return '⚠️ Configurá tu API key de Groq primero (ícono ⚙️ arriba a la derecha del chat).';
        }

        // Build messages array: system + history + new user message
        const messages = [{ role: 'system', content: this._buildSystemPrompt() }];
        for (const h of this.history) {
            messages.push({ role: h.role, content: h.text });
        }
        messages.push({ role: 'user', content: userMessage });

        const body = {
            model: this.model,
            messages,
            temperature: 0.3,
            max_tokens: 1024
        };

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (res.status === 401) return '❌ API key inválida. Verificá la key en ⚙️.';
            if (res.status === 429) return '⏳ Límite de requests alcanzado. Esperá unos segundos e intentá de nuevo.';
            return `❌ Error ${res.status}: ${err?.error?.message || 'Error desconocido'}`;
        }

        const data = await res.json();
        return data?.choices?.[0]?.message?.content || '⚠️ Respuesta vacía.';
    }

    // ─── UI ─────────────────────────────────────────────────────────────────

    _buildUI() {
        // Floating button
        this.btn = document.createElement('button');
        this.btn.id = 'ai-assistant-btn';
        this.btn.innerHTML = '🧠';
        this.btn.title = 'Asistente Clínico IA';
        document.body.appendChild(this.btn);

        // Chat panel
        this.panel = document.createElement('div');
        this.panel.id = 'ai-assistant-panel';
        this.panel.innerHTML = `
            <div id="ai-header">
                <span>🧠 Asistente Clínico</span>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                    <button id="ai-settings-btn" title="Configurar API Key">⚙️</button>
                    <button id="ai-clear-btn" title="Nueva conversación">🗑️</button>
                    <button id="ai-close-btn">✕</button>
                </div>
            </div>
            <div id="ai-messages"></div>
            <div id="ai-input-row">
                <textarea id="ai-input" placeholder="Preguntá sobre el paciente o guías clínicas..." rows="2"></textarea>
                <button id="ai-send-btn">➤</button>
            </div>
        `;
        document.body.appendChild(this.panel);

        // Settings modal
        this.settingsModal = document.createElement('div');
        this.settingsModal.id = 'ai-settings-modal';
        this.settingsModal.innerHTML = `
            <div id="ai-settings-box">
                <h3>⚙️ Configuración</h3>
                <label>Groq API Key</label>
                <input type="password" id="ai-key-input" placeholder="gsk_..." autocomplete="off">
                <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
                    <button id="ai-key-save">Guardar</button>
                    <button id="ai-key-cancel">Cancelar</button>
                </div>
                <p style="font-size:0.75em;color:#6b7280;margin-top:0.5rem;">
                    Obtenés tu key gratis en console.groq.com.<br>Se guarda solo en tu navegador.
                </p>
            </div>
        `;
        document.body.appendChild(this.settingsModal);
    }

    _attachEvents() {
        this.btn.addEventListener('click', () => this._togglePanel());
        document.getElementById('ai-close-btn').addEventListener('click', () => this._togglePanel(false));
        document.getElementById('ai-clear-btn').addEventListener('click', () => this._clearHistory());
        document.getElementById('ai-settings-btn').addEventListener('click', () => this._openSettings());
        document.getElementById('ai-key-save').addEventListener('click', () => this._saveKey());
        document.getElementById('ai-key-cancel').addEventListener('click', () => {
            this.settingsModal.style.display = 'none';
        });

        const sendBtn = document.getElementById('ai-send-btn');
        const input   = document.getElementById('ai-input');

        sendBtn.addEventListener('click', () => this._handleSend());
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
        });
    }

    _togglePanel(forceState) {
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.panel.style.display = this.isOpen ? 'flex' : 'none';
        this.btn.classList.toggle('active', this.isOpen);

        if (this.isOpen && this.history.length === 0) {
            this._addMessage('model', `Hola 👋 Tengo cargados los datos del paciente actual. ¿En qué te puedo ayudar?`);
        }
        if (this.isOpen) {
            setTimeout(() => document.getElementById('ai-input')?.focus(), 100);
        }
    }

    _inline(text) {
        return text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
    }

    _renderMarkdown(text) {
        const lines = text.split('\n');
        let html = '';
        let inUl = false;
        let inOl = false;

        const closeUl = () => { if (inUl) { html += '</ul>'; inUl = false; } };
        const closeOl = () => { if (inOl) { html += '</ol>'; inOl = false; } };

        for (const line of lines) {
            if (/^#{1,3} /.test(line)) {
                closeUl(); closeOl();
                const content = line.replace(/^#{1,3} /, '');
                html += `<p class="ai-heading">${this._inline(content)}</p>`;
            } else if (/^[-*] /.test(line)) {
                closeOl();
                if (!inUl) { html += '<ul class="ai-list">'; inUl = true; }
                html += `<li>${this._inline(line.slice(2))}</li>`;
            } else if (/^\d+\. /.test(line)) {
                closeUl();
                if (!inOl) { html += '<ol class="ai-list">'; inOl = true; }
                html += `<li>${this._inline(line.replace(/^\d+\. /, ''))}</li>`;
            } else if (line.trim() === '') {
                closeUl(); closeOl();
                if (html && !html.endsWith('<br>') && !html.endsWith('>')) html += '<br>';
            } else {
                closeUl(); closeOl();
                html += this._inline(line) + '<br>';
            }
        }
        closeUl(); closeOl();
        return html.replace(/(<br>)+$/, '');
    }

    _addMessage(role, text) {
        const msgs = document.getElementById('ai-messages');
        const div  = document.createElement('div');
        div.className = `ai-msg ai-msg-${role}`;
        div.innerHTML = role === 'model' ? this._renderMarkdown(text) : this._inline(text);
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    _showTyping() {
        const msgs = document.getElementById('ai-messages');
        const div  = document.createElement('div');
        div.id = 'ai-typing';
        div.className = 'ai-msg ai-msg-model';
        div.innerHTML = '<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return div;
    }

    async _handleSend() {
        const input = document.getElementById('ai-input');
        const text  = input.value.trim();
        if (!text || this.isLoading) return;

        input.value = '';
        this.isLoading = true;
        document.getElementById('ai-send-btn').disabled = true;

        this._addMessage('user', text);
        const typingEl = this._showTyping();

        try {
            const reply = await this._sendToGroq(text);
            typingEl.remove();
            this._addMessage('model', reply);

            // Save to history (keep last 10 turns)
            this.history.push({ role: 'user',  text });
            this.history.push({ role: 'model', text: reply });
            if (this.history.length > 20) this.history = this.history.slice(-20);
        } catch (err) {
            typingEl.remove();
            this._addMessage('model', `❌ Error de conexión: ${err.message}`);
        }

        this.isLoading = false;
        document.getElementById('ai-send-btn').disabled = false;
        input.focus();
    }

    _clearHistory() {
        this.history = [];
        document.getElementById('ai-messages').innerHTML = '';
        this._addMessage('model', 'Conversación reiniciada. ¿En qué te puedo ayudar?');
    }

    _openSettings() {
        document.getElementById('ai-key-input').value = this.apiKey;
        this.settingsModal.style.display = 'flex';
    }

    _saveKey() {
        const key = document.getElementById('ai-key-input').value.trim();
        this.apiKey = key;
        localStorage.setItem('groq_api_key', key);
        this.settingsModal.style.display = 'none';
        this._addMessage('model', '✅ API key guardada. Ya podés hacer consultas.');
    }

    // ─── Styles ─────────────────────────────────────────────────────────────

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
        #ai-assistant-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            font-size: 1.4rem;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(99,102,241,0.5);
            z-index: 9990;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        #ai-assistant-btn:hover { transform: scale(1.08); }
        #ai-assistant-btn.active { background: linear-gradient(135deg, #4f46e5, #7c3aed); }

        #ai-assistant-panel {
            display: none;
            flex-direction: column;
            position: fixed;
            bottom: 88px;
            right: 24px;
            width: 380px;
            max-height: 560px;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.18);
            z-index: 9991;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }

        #ai-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            font-weight: 600;
            font-size: 0.95rem;
        }
        #ai-header button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            opacity: 0.85;
        }
        #ai-header button:hover { opacity: 1; background: rgba(255,255,255,0.15); }

        #ai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            background: #f9fafb;
        }

        .ai-msg {
            max-width: 86%;
            padding: 0.55rem 0.85rem;
            border-radius: 12px;
            font-size: 0.875rem;
            line-height: 1.5;
            word-break: break-word;
        }
        .ai-msg-user  {
            align-self: flex-end;
            background: #6366f1;
            color: white;
            border-bottom-right-radius: 3px;
        }
        .ai-msg-model {
            align-self: flex-start;
            background: white;
            color: #1f2937;
            border: 1px solid #e5e7eb;
            border-bottom-left-radius: 3px;
        }

        /* Typing indicator */
        .ai-dot {
            display: inline-block;
            width: 7px; height: 7px;
            background: #9ca3af;
            border-radius: 50%;
            margin: 0 2px;
            animation: ai-bounce 1.2s infinite;
        }
        .ai-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes ai-bounce {
            0%,80%,100% { transform: translateY(0); }
            40%         { transform: translateY(-6px); }
        }

        #ai-input-row {
            display: flex;
            gap: 0.5rem;
            padding: 0.75rem;
            border-top: 1px solid #e5e7eb;
            background: white;
        }
        #ai-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            resize: none;
            font-family: inherit;
            line-height: 1.4;
        }
        #ai-input:focus { outline: none; border-color: #6366f1; }
        #ai-send-btn {
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0 0.9rem;
            cursor: pointer;
            font-size: 1.1rem;
            transition: background 0.2s;
        }
        #ai-send-btn:hover    { background: #4f46e5; }
        #ai-send-btn:disabled { background: #a5b4fc; cursor: not-allowed; }

        /* Settings modal */
        #ai-settings-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }
        #ai-settings-box {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            width: 320px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        }
        #ai-settings-box h3 { margin: 0 0 1rem; font-size: 1rem; color: #1f2937; }
        #ai-settings-box label { font-size: 0.85rem; color: #374151; display: block; margin-bottom: 0.4rem; }
        #ai-key-input {
            width: 100%;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 0.5rem;
            font-size: 0.875rem;
            box-sizing: border-box;
        }
        #ai-key-save {
            background: #6366f1; color: white; border: none;
            border-radius: 6px; padding: 0.4rem 1rem; cursor: pointer; font-size: 0.875rem;
        }
        #ai-key-cancel {
            background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
            border-radius: 6px; padding: 0.4rem 1rem; cursor: pointer; font-size: 0.875rem;
        }

        .ai-list {
            margin: 0.3rem 0 0.3rem 1.1rem;
            padding: 0;
            font-size: 0.875rem;
        }
        .ai-list li { margin-bottom: 0.15rem; }
        .ai-heading {
            margin: 0.4rem 0 0.2rem;
            font-weight: 700;
            font-size: 0.875rem;
            color: #111827;
        }
        .ai-inline-code {
            background: #f3f4f6;
            padding: 0.1em 0.3em;
            border-radius: 3px;
            font-size: 0.82em;
            font-family: monospace;
        }

        @media (max-width: 480px) {
            #ai-assistant-panel { right: 8px; left: 8px; width: auto; bottom: 80px; }
        }
        `;
        document.head.appendChild(style);
    }
}

// Init after DOM ready
if (typeof window !== 'undefined') {
    window.AIAssistant = AIAssistant;
}

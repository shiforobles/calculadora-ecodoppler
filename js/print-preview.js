/** Local print presentation. Never generates, calculates, transmits or stores a study. */
(function (root) {
    'use strict';
    const STORAGE_KEY = 'ecodoppler_print_profiles_v1';
    const TITLE = 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n';
    const SEPARATOR = '='.repeat(80) + '\n';
    const FIELDS = ['institution', 'service', 'address', 'professional', 'registration'];
    const MAX_LOGO = 450000;
    const DEFAULTS = {
        generic: { institution: '', service: '', address: '', professional: '', registration: '', showProfessional: false, showLogos: false, logoLeft: '', logoRight: '' },
        hospital: { institution: 'Hospital Español de Buenos Aires', service: 'División Cardiología · Laboratorio de Ecocardiografía', address: 'Av. Belgrano 2975 · Ciudad Autónoma de Buenos Aires', professional: '', registration: '', showProfessional: false, showLogos: true, logoLeft: '', logoRight: '' }
    };
    const clone = value => JSON.parse(JSON.stringify(value));
    const cleanLogo = value => typeof value === 'string' && value.length <= MAX_LOGO && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';
    function cleanProfile(value, fallback) {
        const profile = clone(fallback);
        if (!value || typeof value !== 'object') return profile;
        for (const field of FIELDS) if (typeof value[field] === 'string') profile[field] = value[field].slice(0, 240);
        for (const field of ['showProfessional', 'showLogos']) if (typeof value[field] === 'boolean') profile[field] = value[field];
        profile.logoLeft = cleanLogo(value.logoLeft); profile.logoRight = cleanLogo(value.logoRight);
        return profile;
    }
    function cleanState(value) {
        return {
            schemaVersion: 1,
            defaultProfileId: value?.defaultProfileId === 'hospital' ? 'hospital' : 'generic',
            profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([id, fallback]) => [id, cleanProfile(value?.profiles?.[id], fallback)]))
        };
    }
    function load(storage) {
        try {
            const text = storage.getItem(STORAGE_KEY);
            if (!text) return { state: cleanState(), error: false };
            const value = JSON.parse(text);
            if (value?.schemaVersion !== 1 || !value.profiles) throw new Error('Formato incompatible');
            return { state: cleanState(value), error: false };
        } catch { return { state: cleanState(), error: true }; }
    }
    function save(storage, value) {
        try { storage.setItem(STORAGE_KEY, JSON.stringify(cleanState(value))); return true; } catch { return false; }
    }
    // Hide only the known decorative prefix. Preserve every other character, even '=' lines.
    function reportParts(text) {
        return text.startsWith(TITLE + SEPARATOR)
            ? [TITLE, SEPARATOR, text.slice(TITLE.length + SEPARATOR.length)] : [text];
    }
    function formFingerprint(reportId, motility) {
        const values = [...root.document.querySelectorAll('input[id], select[id], textarea[id]')]
            .filter(el => el.id !== reportId && el.id !== 'preset_selector' && !el.readOnly && !el.disabled && el.type !== 'hidden' && !el.closest('.modal, dialog'))
            .map(el => [el.id, el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value]);
        return JSON.stringify([values, motility || null]);
    }
    const moduleURL = root.document?.currentScript?.src;
    const asset = name => new URL('../' + name, moduleURL || root.location.href).href;
    function connect({ reportId, buttonId, readStudy, readPatient }) {
        const report = root.document.getElementById(reportId);
        let baseline = null;
        let active = null;
        const study = () => String(readStudy());
        const markCurrent = (snapshot = study()) => { baseline = snapshot; };
        report.addEventListener('input', () => { if (baseline === null) markCurrent(); });
        root.document.getElementById(buttonId)?.addEventListener('click', () => {
            const text = report.value;
            if (!text.trim()) { root.alert('Primero generá o escribí el informe que querés imprimir.'); return; }
            if (baseline === null || baseline !== study()) {
                if (!root.confirm('El formulario cambió después del informe o no se pudo comprobar su correspondencia. Revisá el texto y la identificación. ¿Confirmás que los revisaste y querés imprimir el texto actual, sin regenerarlo?')) return;
            }
            const snapshot = { text, patient: clone(readPatient()), study: study() };
            const popup = root.open(asset('print-preview.html'), '_blank');
            if (!popup) { root.alert('El navegador bloqueó la vista previa. Permití las ventanas emergentes para esta app y volvé a intentar. El informe se conserva.'); return; }
            if (active && !active.closed) active.close();
            active = popup;
            const isCurrent = () => !root.closed && report.isConnected && report.value === snapshot.text && study() === snapshot.study && JSON.stringify(readPatient()) === JSON.stringify(snapshot.patient);
            popup.addEventListener('load', () => buildPreview(popup, snapshot, isCurrent), { once: true });
        });
        root.addEventListener('pagehide', () => {
            if (active && !active.closed) {
                active.document.body.replaceChildren();
                const p = active.document.createElement('p');
                p.textContent = 'La app de origen se cerró o cambió de página. Volvé a abrir la vista previa desde el informe actual.';
                active.document.body.append(p);
            }
        });
        return { study, markCurrent };
    }
    function buildPreview(win, snapshot, isCurrent) {
        const doc = win.document;
        doc.title = 'Imprimir / PDF';
        doc.body.replaceChildren();
        const el = (tag, attrs = {}, text) => {
            const node = doc.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
            if (text !== undefined) node.textContent = text;
            return node;
        };
        const styleReady = Promise.resolve(doc.styleSheets.length > 0);
        const aside = el('aside', { class: 'controls', 'aria-label': 'Opciones de impresión' });
        const main = el('main');
        const paper = el('article', { class: 'paper', 'aria-label': 'Informe para imprimir' });
        const guard = el('p', { class: 'print-guard' }, 'La vista previa quedó desactualizada. Volvé a abrirla desde el informe actual.');
        doc.body.append(aside, main, guard); main.append(paper);
        aside.append(el('h1', {}, 'Imprimir / PDF'), el('p', {}, 'Se imprime el texto visible, incluidas tus ediciones manuales.'));
        let storage;
        try { storage = root.localStorage; } catch { storage = null; }
        const loaded = load(storage); const state = loaded.state;
        let selected = state.defaultProfileId;
        const names = { generic: 'Genérico', hospital: 'Hospital Español' };
        const status = el('p', { role: 'status', id: 'print-status' });
        const stale = el('p', { role: 'alert', id: 'print-stale', hidden: '' }, 'Cambió el informe o el formulario de origen. Cerrá esta ventana y volvé a abrir Imprimir / PDF para revisar una nueva captura.');
        const select = el('select', { id: 'print-profile' });
        for (const [id, name] of Object.entries(names)) select.append(el('option', { value: id }, name));
        select.value = selected;
        const labeled = (text, input) => { const label = el('label', {}, text); label.append(input); aside.append(label); return input; };
        labeled('Perfil para esta impresión', select);
        const savedDefault = el('p', { class: 'hint', id: 'print-default' }); aside.append(savedDefault);
        const inputs = {};
        for (const [key, label] of Object.entries({ institution: 'Institución', service: 'Servicio', address: 'Dirección', professional: 'Profesional', registration: 'Matrícula' })) {
            inputs[key] = labeled(label, el('input', { id: 'print-' + key, type: 'text', maxlength: '240', autocomplete: 'off' }));
            inputs[key].addEventListener('input', () => { state.profiles[selected][key] = inputs[key].value; render(); });
        }
        for (const [key, label] of [['showProfessional', 'Agregar bloque de profesional / matrícula'], ['showLogos', 'Mostrar logos del perfil']]) {
            inputs[key] = labeled(label, el('input', { id: 'print-' + key, type: 'checkbox' }));
            inputs[key].addEventListener('change', () => { state.profiles[selected][key] = inputs[key].checked; render(); });
        }
        const logoNote = el('p', { class: 'hint' }); aside.append(logoNote);
        for (const [key, label] of [['logoLeft', 'Logo izquierdo'], ['logoRight', 'Logo derecho']]) {
            const file = labeled(label, el('input', { type: 'file', id: 'print-' + key, accept: 'image/png,image/jpeg,image/webp' }));
            file.addEventListener('change', async () => {
                const profileAtUpload = selected;
                const image = file.files[0];
                if (!image) return;
                try {
                    if (!/^image\/(png|jpeg|webp)$/.test(image.type) || image.size > 1024 * 1024) throw new Error();
                    const bitmap = await win.createImageBitmap(image);
                    try {
                        if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) throw new Error();
                        const canvas = doc.createElement('canvas');
                        const ratio = Math.min(1, 800 / bitmap.width, 400 / bitmap.height);
                        canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
                        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                        const data = canvas.toDataURL('image/png'); if (!cleanLogo(data)) throw new Error();
                        state.profiles[profileAtUpload][key] = data;
                        status.textContent = 'Logo cargado para esta vista. Guardá la configuración si querés conservarlo.'; render();
                    } finally { bitmap.close(); }
                } catch { status.textContent = 'No se pudo cargar el logo. Usá PNG, JPG o WebP de hasta 1 MB.'; }
                file.value = '';
            });
            const reset = el('button', { type: 'button', class: 'secondary' }, 'Restablecer ' + label.toLowerCase());
            reset.addEventListener('click', () => { state.profiles[selected][key] = ''; render(); }); aside.append(reset);
        }
        const saveConfig = el('button', { type: 'button', id: 'print-save-config', class: 'secondary' }, 'Guardar configuración');
        const setDefault = el('button', { type: 'button', id: 'print-set-default', class: 'secondary' }, 'Usar como predeterminado');
        aside.append(saveConfig, setDefault, el('p', { class: 'hint' }, 'Se guardan solo los perfiles y la preferencia en este navegador. Nunca el paciente ni el informe. En equipos compartidos, otros usuarios podrán ver esta configuración.'));
        const persist = makeDefault => {
            const previous = state.defaultProfileId;
            if (makeDefault) state.defaultProfileId = selected;
            const ok = save(storage, state);
            if (!ok) state.defaultProfileId = previous;
            status.textContent = ok ? (makeDefault ? 'Perfil guardado como predeterminado en este navegador.' : 'Configuración guardada. El predeterminado no cambió.') : 'No se pudo guardar la preferencia. Podés seguir imprimiendo; esta configuración queda solo en esta ventana.';
            updateDefault();
        };
        saveConfig.addEventListener('click', () => persist(false)); setDefault.addEventListener('click', () => persist(true));
        const date = labeled('Fecha del estudio (opcional, solo esta impresión)', el('input', { type: 'date', id: 'print-date' }));
        date.addEventListener('input', render);
        aside.append(el('p', { class: 'hint' }, 'Si el informe ya incluye tu nombre y matrícula, podés omitir el bloque adicional. La fecha no se completa automáticamente.'));
        const print = el('button', { type: 'button', id: 'print-now' }, 'Abrir diálogo de impresión');
        aside.append(print, stale, status, el('p', { class: 'hint' }, 'Elegí Guardar como PDF en el diálogo. Usá papel A4 y desactivá encabezados y pies del navegador si agregan la URL o la fecha. La paginación final depende del navegador.'));
        if (loaded.error) status.textContent = 'No se pudo leer la preferencia. Se usa Genérico; podés imprimir sin guardar configuración.';
        function updateDefault() { savedDefault.textContent = 'Predeterminado guardado: ' + names[state.defaultProfileId] + '. Cambiar el selector no lo modifica.'; }
        function profileForm() {
            const profile = state.profiles[selected];
            for (const key of FIELDS) inputs[key].value = profile[key];
            for (const key of ['showProfessional', 'showLogos']) inputs[key].checked = profile[key];
            logoNote.textContent = selected === 'hospital' ? 'Los logos incluidos son recreaciones provisionales. Podés reemplazarlos con imágenes locales originales; no se admiten enlaces externos.' : 'Sin logos precargados. Podés cargar imágenes locales.';
        }
        select.addEventListener('change', () => { selected = select.value; profileForm(); render(); });
        function render() {
            const profile = state.profiles[selected];
            paper.replaceChildren();
            const table = el('table'); const head = el('thead'); const headRow = el('tr'); const cell = el('td');
            paper.append(table); table.append(head); head.append(headRow); headRow.append(cell);
            if (profile.institution || profile.service || profile.address || profile.showLogos && (selected === 'hospital' || profile.logoLeft || profile.logoRight)) {
                const institution = el('div', { class: 'institution' });
                const logo = side => {
                    const src = profile['logo' + side] || (selected === 'hospital' ? asset('img/print/' + (side === 'Left' ? 'hospital' : 'cardiologia') + '-provisional.svg') : '');
                    return profile.showLogos && src ? el('img', { src, alt: 'Logo institucional', width: '64', height: '72' }) : el('span');
                };
                const title = el('div');
                for (const [key, cls] of [['institution', 'name'], ['service', 'service'], ['address', 'address']]) if (profile[key]) title.append(el('div', { class: cls }, profile[key]));
                institution.append(logo('Left'), title, logo('Right')); cell.append(institution);
            }
            const patient = el('div', { class: 'patient' });
            const details = [];
            if (snapshot.patient.id) details.push(['HC / Identificación', snapshot.patient.id]);
            if (snapshot.patient.age) details.push(['Edad', snapshot.patient.age + ' años']);
            if (snapshot.patient.sex) details.push(['Sexo', ({ F: 'Femenino', M: 'Masculino' })[snapshot.patient.sex] || snapshot.patient.sex]);
            if (date.value) details.push(['Fecha del estudio', date.value.split('-').reverse().join('/')]);
            for (const [label, value] of details) { const line = el('div'); line.append(el('strong', {}, label + ': '), doc.createTextNode(value)); patient.append(line); }
            if (details.length) cell.append(patient);
            const body = el('tbody'); const row = el('tr'); const reportCell = el('td', { class: 'report-cell' }); const content = el('div', { class: 'report', id: 'print-report' });
            const parts = reportParts(snapshot.text);
            parts.forEach((part, index) => content.append(parts.length === 3 && index === 1 ? el('span', { class: 'app-separator' }, part) : doc.createTextNode(part)));
            reportCell.append(content); row.append(reportCell); body.append(row); table.append(body);
            if (profile.showProfessional && (profile.professional || profile.registration)) {
                const professionalRow = el('tr', { class: 'professional-row' }); const professionalCell = el('td'); const professional = el('div', { class: 'professional' });
                if (profile.professional) professional.append(el('strong', {}, profile.professional));
                if (profile.registration) professional.append(el('div', {}, 'Matrícula ' + profile.registration));
                professionalCell.append(professional); professionalRow.append(professionalCell); body.append(professionalRow);
            }
        }
        let invalidated = false;
        function check() {
            if (invalidated) return false;
            let valid = false; try { valid = isCurrent(); } catch {}
            if (!valid) {
                invalidated = true; stale.hidden = false; print.disabled = true; doc.body.classList.add('source-changed');
            }
            return valid;
        }
        print.addEventListener('click', async () => {
            if (!check()) return;
            try {
                if (!await styleReady) throw new Error('styles');
                await Promise.all([...paper.querySelectorAll('img')].map(image => image.decode().catch(() => { throw new Error('logo'); })));
                await doc.fonts.ready;
                if (!check()) return;
                win.focus(); win.print();
            } catch { status.textContent = 'No se pudo preparar la impresión. Revisá los logos y volvé a intentar, o desactivá Mostrar logos.'; }
        });
        win.addEventListener('beforeprint', check);
        win.addEventListener('focus', check);
        const timer = win.setInterval(check, 300);
        win.addEventListener('pagehide', () => win.clearInterval(timer), { once: true });
        profileForm(); updateDefault(); render(); check();
    }
    const api = { connect, formFingerprint, STORAGE_KEY, cleanState, load, save, reportParts };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PrintPreview = api;
})(typeof window !== 'undefined' ? window : globalThis);

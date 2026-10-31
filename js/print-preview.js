/** Local print presentation. Never generates, calculates, transmits or stores a study. */
(function (root) {
    'use strict';
    const STORAGE_KEY = 'ecodoppler_print_template_v2';
    const TITLE = 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n';
    const SEPARATOR = '='.repeat(80) + '\n';
    const PROFESSIONAL = Object.freeze({ name: 'Dr. Lucas Sebastián Robles', registration: '166.452' });
    // Prepared templates: changing the selector never edits a template or the report.
    const TEMPLATES = Object.freeze({
        generic: Object.freeze({ institution: '', service: '', address: '', showLogos: false }),
        hospital: Object.freeze({ institution: 'Hospital Español de Buenos Aires', service: 'División Cardiología · Laboratorio de Ecocardiografía', address: 'Av. Belgrano 2975 · Ciudad Autónoma de Buenos Aires', showLogos: true })
    });
    const clone = value => JSON.parse(JSON.stringify(value));
    function cleanState(value) {
        return { schemaVersion: 2, defaultProfileId: value?.defaultProfileId === 'hospital' ? 'hospital' : 'generic' };
    }
    function load(storage) {
        try {
            const text = storage.getItem(STORAGE_KEY);
            if (!text) return { state: cleanState(), error: false };
            const value = JSON.parse(text);
            if (value?.schemaVersion !== 2) throw new Error('Formato incompatible');
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
    function localStudyDate(date = new Date()) {
        return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    }
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
            const snapshot = { text, patient: clone(readPatient()), study: study(), studyDate: localStudyDate() };
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
        labeled('Plantilla para esta impresión', select);
        const savedDefault = el('p', { class: 'hint', id: 'print-default' }); aside.append(savedDefault);
        aside.append(el('p', { class: 'professional-summary' }, PROFESSIONAL.name + ' · Matrícula ' + PROFESSIONAL.registration));
        const setDefault = el('button', { type: 'button', id: 'print-set-default', class: 'secondary' }, 'Usar como predeterminada');
        aside.append(setDefault);
        setDefault.addEventListener('click', () => {
            const previous = state.defaultProfileId;
            state.defaultProfileId = selected;
            const ok = save(storage, state);
            if (!ok) state.defaultProfileId = previous;
            status.textContent = ok ? 'Plantilla guardada como predeterminada en este navegador.' : 'No se pudo guardar la preferencia. Podés seguir imprimiendo con la plantilla elegida.';
            updateDefault();
        });
        const date = labeled('Fecha del estudio', el('input', { type: 'date', id: 'print-date' }));
        date.value = snapshot.studyDate;
        date.addEventListener('input', render);
        aside.append(el('p', { class: 'hint' }, 'Se completa con la fecha local de hoy. Podés cambiarla si el estudio es de otro día. No se guarda con la plantilla.'));
        const print = el('button', { type: 'button', id: 'print-now' }, 'Abrir diálogo de impresión');
        aside.append(print, stale, status, el('p', { class: 'hint' }, 'Elegí Guardar como PDF en el diálogo. Usá papel A4 y desactivá encabezados y pies del navegador si agregan la URL o la fecha. La paginación final depende del navegador.'));
        if (loaded.error) status.textContent = 'No se pudo leer la preferencia. Se usa Genérico; podés imprimir igualmente.';
        function updateDefault() { savedDefault.textContent = 'Predeterminada: ' + names[state.defaultProfileId] + '. Cambiar la selección no la modifica.'; }
        select.addEventListener('change', () => { selected = select.value; render(); });
        function render() {
            const profile = TEMPLATES[selected];
            paper.replaceChildren();
            const table = el('table'); const head = el('thead'); const headRow = el('tr'); const cell = el('td');
            paper.append(table); table.append(head); head.append(headRow); headRow.append(cell);
            if (profile.institution || profile.service || profile.address || profile.showLogos) {
                const institution = el('div', { class: 'institution' });
                const logo = side => {
                    const src = profile.showLogos ? asset('img/print/' + (side === 'Left' ? 'hospital' : 'cardiologia') + '-provisional.svg') : '';
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
            {
                const professionalRow = el('tr', { class: 'professional-row' }); const professionalCell = el('td'); const professional = el('div', { class: 'professional' });
                professional.append(el('strong', {}, PROFESSIONAL.name));
                professional.append(el('div', {}, 'Matrícula ' + PROFESSIONAL.registration));
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
            } catch { status.textContent = 'No se pudo preparar la impresión. Volvé a abrir la vista previa e intentá nuevamente.'; }
        });
        win.addEventListener('beforeprint', check);
        win.addEventListener('focus', check);
        const timer = win.setInterval(check, 300);
        win.addEventListener('pagehide', () => win.clearInterval(timer), { once: true });
        updateDefault(); render(); check();
    }
    const api = { connect, formFingerprint, STORAGE_KEY, cleanState, load, save, reportParts, localStudyDate };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PrintPreview = api;
})(typeof window !== 'undefined' ? window : globalThis);

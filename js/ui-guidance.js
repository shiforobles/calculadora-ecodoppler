/** Display-only guidance. Never changes measurements, contexts or clinical results. */
(function (root) {
    'use strict';
    const CONTEXTS = { ctx_bcri: 'BCRI', ctx_mac: 'MAC', ctx_im: 'IM severa', ctx_mcp: 'MCP', ctx_valsalva: 'Valsalva (+)' };
    function atrialStatus(raw) {
        if (String(raw).trim() === '') return { text: 'Sin dato', level: 'neutral' };
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) return { text: 'Revisar valor', level: 'neutral' };
        // Same boundaries as the current narrative/list/clinical JSON (not a new rule).
        if (value > 48) return { text: 'Dilatación severa', level: 'severe' };
        if (value >= 42) return { text: 'Dilatación moderada', level: 'moderate' };
        if (value >= 34) return { text: 'Dilatación leve', level: 'mild' };
        return { text: 'Normal', level: 'normal' };
    }
    function reasons(result, data) {
        const items = [];
        if (/parámetros secundarios/i.test(result?.description || '')) items.push({ key: 'secondary', text: 'El motor solicita parámetros secundarios para completar la evaluación.' });
        const contexts = Object.entries(CONTEXTS).filter(([id]) => data[id]).map(([, label]) => label);
        if (contexts.length) items.push({ key: 'contexts:' + contexts.join(','), text: 'Contexto seleccionado: ' + contexts.join(' · ') + '.' });
        if (data.conduction === 'bcri' && !data.ctx_bcri) items.push({ key: 'bcri', text: 'BCRI registrado en Conducción: revisá la casilla de contexto.' });
        if (data.mitralRegurgitation === 'severa' && !data.ctx_im) items.push({ key: 'im', text: 'Insuficiencia mitral severa registrada: revisá la casilla de contexto.' });
        if (data.mitralProsthesis) items.push({ key: 'prosthesis', text: 'Prótesis mitral registrada. Revisá las limitaciones que informa el motor.' });
        if (data.additional.length) items.push({ key: 'additional:' + data.additional.join(','), text: 'Hay parámetros adicionales cargados en este panel.' });
        return items;
    }
    function init() {
        const doc = root.document, ui = root.EcoDoppler?.uiController;
        if (!ui) return;
        const $ = id => doc.getElementById(id);
        const value = id => $(id)?.value || '';
        const button = $('diast-guidance-toggle'), panel = $('diast_advanced');
        let lastKey = '', autoOpened = false;
        function updateAtrial() {
            const state = atrialStatus(value('vol_ai'));
            const output = $('la-volume-status');
            if (!output) return;
            output.textContent = state.text;
            output.className = 'la-volume-status level-' + state.level;
        }
        function updateAdvanced(result = ui.state.diastolicResult) {
            if (!button || !panel) return;
            const data = Object.fromEntries(Object.keys(CONTEXTS).map(id => [id, !!$(id)?.checked]));
            data.conduction = value('conduccion'); data.mitralRegurgitation = value('im_grado');
            data.mitralProsthesis = !!$('prot_check')?.checked && value('prot_posicion') === 'mitral';
            data.additional = ['td', 'triv', 'diast_lars', 'diast_pvsd'].filter(id => value(id).trim() !== '');
            const items = reasons(result, data);
            const key = items.map(item => item.key).join('|');
            const pending = items.some(item => ['secondary', 'bcri', 'im', 'prosthesis'].includes(item.key));
            button.classList.toggle('guidance-needed', pending);
            button.classList.toggle('guidance-present', !!key && !pending);
            const indicator = $('diast-guidance-indicator');
            indicator.hidden = !key; indicator.textContent = pending ? 'Revisar' : 'Datos presentes';
            const reason = $('diast-guidance-reason');
            reason.hidden = !key; reason.textContent = items.map(item => item.text).join(' ');
            for (const id of Object.keys(CONTEXTS)) {
                const label = $(id)?.closest('label');
                label?.classList.toggle('context-present', data[id]);
                label?.classList.toggle('context-review', id === 'ctx_bcri' && data.conduction === 'bcri' && !data[id] || id === 'ctx_im' && data.mitralRegurgitation === 'severa' && !data[id]);
            }
            if (key && key !== lastKey && panel.style.display === 'none') { panel.style.display = 'block'; autoOpened = true; }
            if (!key && autoOpened) { panel.style.display = 'none'; autoOpened = false; }
            lastKey = key;
            const open = panel.style.display !== 'none';
            button.classList.toggle('open', open); button.setAttribute('aria-expanded', String(open));
        }
        button?.addEventListener('click', () => {
            autoOpened = false; // Respect a manual close while the same reason remains.
            button.setAttribute('aria-expanded', String(panel.style.display !== 'none'));
        });
        const originalBadge = ui.updateDiastolicBadge;
        ui.updateDiastolicBadge = function (result) {
            const returned = originalBadge.call(this, result); updateAdvanced(result); updateAtrial(); return returned;
        };
        if (ui.injectLanus) {
            const originalInject = ui.injectLanus;
            ui.injectLanus = function (...args) { const returned = originalInject.apply(this, args); updateAtrial(); return returned; };
        }
        doc.addEventListener('input', event => { if (event.target.id === 'vol_ai') updateAtrial(); });
        doc.addEventListener('change', event => {
            if (['conduccion', 'im_grado', 'prot_check', 'prot_posicion', ...Object.keys(CONTEXTS)].includes(event.target.id)) updateAdvanced();
        });
        const build = root.EcoBuild;
        if (build) {
            const current = doc.querySelector('.app-header .version');
            const details = doc.createElement('details'); details.className = 'version release-info'; details.id = 'release-info';
            const summary = doc.createElement('summary');
            const channel = build.channel === 'review' ? 'Versión de prueba' : 'Versión';
            summary.textContent = channel + ' · ' + build.version + ' · Qué cambió'; details.append(summary);
            const content = doc.createElement('div'); content.className = 'release-card';
            const description = doc.createElement('p');
            description.textContent = 'Actualizada: ' + build.updated.split('-').reverse().join('/') + (build.revision ? ' · Revisión ' + build.revision : ' · Desarrollo local');
            content.append(description);
            const notes = doc.createElement('ul');
            for (const text of build.notes || []) { const item = doc.createElement('li'); item.textContent = text; notes.append(item); }
            content.append(notes);
            if (build.channel === 'review') { const status = doc.createElement('p'); status.textContent = 'Cambios en revisión. Esta copia no reemplaza la versión pública.'; content.append(status); }
            details.append(content); current?.replaceWith(details);
            if ($('app-version')) $('app-version').textContent = build.version + (build.revision ? ' · ' + build.revision : ' · Desarrollo local');
        }
        updateAtrial(); updateAdvanced();
    }
    const api = { atrialStatus, reasons };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);

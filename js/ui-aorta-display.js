/**
 * Aortic Indexation and Display Logic for v14.1
 * Adds real-time preview of indexed aortic values
 */

UIController.prototype.updateAorticDisplay = function () {
    const aoRaiz = parseFloat(document.getElementById('ao_raiz').value);
    const aoAsc = parseFloat(document.getElementById('ao_asc').value);
    const sc = this.state.bsa;
    const sexo = document.getElementById('sexo').value;

    const display = document.getElementById('aorta_info');
    if (!display) return;

    if (!sc || sc === 0 || (!aoRaiz && !aoAsc)) {
        display.innerHTML = '<span class="calc-label">Aorta Indexada:</span><span class="calc-value" style="color: var(--color-text-secondary);">Ingrese valores</span>';
        return;
    }

    let html = '<span class="calc-label">Aorta Indexada:</span>';
    let parts = [];

    if (aoRaiz) {
        const raizIndexed = (aoRaiz / sc / 10).toFixed(2); // Convert to cm/m²
        const raizLimit = sexo === 'M' ? 2.15 : 2.11; // cm/m²
        const raizColor = raizIndexed > raizLimit ? 'var(--color-danger)' : 'var(--color-success)';
        parts.push(`<strong>Raíz:</strong> ${raizIndexed} cm/m² <span style="color: ${raizColor};">${raizIndexed > raizLimit ? '⚠' : '✓'}</span>`);
    }

    if (aoAsc) {
        const ascIndexed = (aoAsc / sc / 10).toFixed(2); // Convert to cm/m²
        const ascLimit = sexo === 'M' ? 2.11 : 2.03; // cm/m²
        const ascColor = ascIndexed > ascLimit ? 'var(--color-danger)' : 'var(--color-success)';
        parts.push(`<strong>Asc:</strong> ${ascIndexed} cm/m² <span style="color: ${ascColor};">${ascIndexed > ascLimit ? '⚠' : '✓'}</span>`);
    }

    html += `<span class="calc-value">${parts.join(' | ')}</span>`;
    display.innerHTML = html;
};

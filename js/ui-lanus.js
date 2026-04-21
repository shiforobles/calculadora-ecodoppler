/**
 * Lanús Mode and LA Classification Extensions
 * v14.1 additions to UI Controller
 */

/**
 * Toggle Lanús mode box visibility
 */
UIController.prototype.toggleLanusMode = function () {
    const mode = document.getElementById('ai_calc_mode').value;
    const lanusBox = document.getElementById('box_lanus');
    const volAiInput = document.getElementById('vol_ai');

    if (mode === 'lanus') {
        lanusBox.style.display = 'block';
        volAiInput.disabled = true;
        volAiInput.placeholder = 'Usar Modo Lanús →';
    } else {
        lanusBox.style.display = 'none';
        volAiInput.disabled = false;
        volAiInput.placeholder = '';
    }
};

/**
 * Calculate LA volume using Lanús monoplano method
 */
UIController.prototype.calcLanus = function () {
    const area4c = parseFloat(document.getElementById('lanus_area_4c').value);
    const longitudMm = parseFloat(document.getElementById('lanus_longitud').value);
    const bsa = this.state.bsa || 1;

    if (!area4c || !longitudMm) {
        alert('⚠️ Ingrese Área 4C y Longitud');
        return;
    }

    if (!this.miniCalc) {
        alert('❌ Módulo de cálculo no disponible');
        return;
    }

    const result = this.miniCalc.calculateLanusAI(area4c, longitudMm, bsa);

    if (result) {
        // Color según clasificación
        let classColor = '#059669'; // Verde normal
        if (result.classification.includes('Leve')) classColor = '#D97706'; // Amarillo
        else if (result.classification.includes('Moderada')) classColor = '#DC2626'; // Rojo
        else if (result.classification.includes('Severa')) classColor = '#991B1B'; // Rojo intenso

        document.getElementById('lanus_result').innerHTML =
            `<div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div><strong>Volumen AI:</strong> ${result.volumen} ml</div>
                <div><strong>Vol. Indexado:</strong> ${result.volumeIndexed} ml/m²</div>
                <div style="color: ${classColor}; font-weight: 600;">
                    <strong>Clasificación:</strong> ${result.classification}
                </div>
            </div>`;
    }
};

/**
 * Inject Lanús calculated volume to main AI field
 */
UIController.prototype.injectLanus = function () {
    const area4c = parseFloat(document.getElementById('lanus_area_4c').value);
    const longitudMm = parseFloat(document.getElementById('lanus_longitud').value);
    const bsa = this.state.bsa || 1;

    if (!area4c || !longitudMm) {
        alert('⚠️ Complete los campos antes de inyectar');
        return;
    }

    const result = this.miniCalc.calculateLanusAI(area4c, longitudMm, bsa);

    if (result) {
        document.getElementById('vol_ai').value = result.volumeIndexed;

        // También calcular para mostrar resultado si no está ya visible
        if (!document.getElementById('lanus_result').innerHTML) {
            this.calcLanus();
        }
    }
};

UIController.prototype.showToast = function (message, duration = 3500) {
    document.getElementById('app-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:0.7rem 1.4rem;border-radius:10px;font-size:0.9rem;font-weight:500;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.35);opacity:0;transition:opacity 0.2s ease;pointer-events:none;max-width:90vw;text-align:center';
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 250); }, duration);
};

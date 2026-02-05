/**
 * Main Application Entry Point
 * Eco Doppler Cardíaco v14.0 Pro
 * 
 * Initializes all modules and starts the application
 */

// Global app instance
let app = null;

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create instances of all modules
    const calculator = new HemodynamicsCalculator();
    const validator = new InputValidator();
    const miniCalc = new MiniCalculators();
    const qualityControl = new QualityControl();
    const uiController = new UIController(calculator, validator, miniCalc, qualityControl);

    // Initialize UI controller (sets up event listeners)
    uiController.init();

    // Store reference for debugging
    app = {
        calculator,
        validator,
        miniCalc,
        qualityControl,
        uiController
    };

    // Make available globally for console debugging
    window.EcoDoppler = app;

    console.log('✅ Eco Doppler Cardíaco v14.0 Pro inicializado correctamente');
    console.log('💡 Acceda a window.EcoDoppler desde la consola para debugging');
});

/**
 * Service worker registration (for future offline support)
 */
if ('serviceWorker' in navigator) {
    // Future enhancement: offline support
    // navigator.serviceWorker.register('/sw.js');
}

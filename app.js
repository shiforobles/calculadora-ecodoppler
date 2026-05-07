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

    // Initialize Smart Modules
    window.mitralRegurgitation = new MitralRegurgitationModule();
    window.mitralStenosis = new MitralStenosisModule();
    window.aorticStenosis = new AorticStenosisModule();
    window.aorticRegurgitationModule = new AorticRegurgitationModule();
    window.tricuspidRegurgitation = new TricuspidRegurgitationModule();

    // Initialize Motility System
    const motilityController = new MotilityController();
    const motilitySVG = new MotilitySVG(motilityController);

    const uiController = new UIController(calculator, validator, miniCalc, qualityControl, motilityController);

    // Initialize UI controller (sets up event listeners)
    uiController.init();

    // Store reference for debugging
    app = {
        calculator,
        validator,
        miniCalc,
        qualityControl,
        uiController,
        motilityController,
        motilitySVG
    };

    // Make available globally for console debugging
    window.EcoDoppler = app;
    window.UIController = uiController;
    window.MotilityController = motilityController;
    window.HemodynamicsCalculator = calculator;

    console.log('✅ Eco Doppler Cardíaco v14.0 Pro inicializado correctamente');
    console.log('💡 Acceda a window.EcoDoppler desde la consola para debugging');
    // News Modal Logic
    const btnNews  = document.getElementById('btn-news-toggle');
    const newsModal = document.getElementById('news-modal');
    const closeNews = document.getElementById('close-news-modal');
    const newsBadge = document.getElementById('news-badge');

    // Badge only shown when there is unread news
    // "news-last-seen" stores the ID of the latest news item the user opened
    const LATEST_NEWS_ID = 'ase2025-diastolic';
    const seenNewsId = localStorage.getItem('news-last-seen');
    if (newsBadge) {
        newsBadge.style.display = (seenNewsId === LATEST_NEWS_ID) ? 'none' : '';
    }

    if (btnNews && newsModal && closeNews) {
        btnNews.addEventListener('click', () => {
            newsModal.style.display = 'flex';
            if (newsBadge) newsBadge.style.display = 'none';
            localStorage.setItem('news-last-seen', LATEST_NEWS_ID);
        });

        closeNews.addEventListener('click', () => {
            newsModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === newsModal) newsModal.style.display = 'none';
        });
    }

});

/**
 * Service worker registration (for future offline support)
 */
if ('serviceWorker' in navigator) {
    // Future enhancement: offline support
    // navigator.serviceWorker.register('/sw.js');
}

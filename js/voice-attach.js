/**
 * Attach voice control button
 */
attachVoiceControls() {
    const btnVoice = document.getElementById('btn-voice-toggle');
    if (btnVoice) {
        btnVoice.addEventListener('click', () => {
            if (this.voiceRecognition) {
                this.voiceRecognition.toggle();
            }
        });
    }
}

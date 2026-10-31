#!/usr/bin/env python3
"""Build an isolated review copy. Explicit allowlist; no records, credentials or repo history."""
import argparse
from pathlib import Path
import re
import shutil
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
JS = [
    'hemodynamics', 'validator', 'mini-calculators', 'quality-control',
    'motility-model', 'motility-engine', 'wmsi-engine', 'territory-engine',
    'motility-controller', 'motility-svg', 'gemini-ai', 'presets', 'ui-controller',
    'ui-extensions', 'ui-lanus', 'ui-aorta-display', 'aortic-regurgitation',
    'valvulopathy-modules', 'voice-recognition', 'study-storage', 'google-sync',
    'ai-assistant', 'quick-report', 'eco-rapido', 'print-preview', 'build-info', 'ui-guidance',
]
FILES = ['index.html', 'eco-rapido.html', 'print-preview.html', 'app.js', 'styles.css',
         'css/voice-styles.css', 'css/print-preview.css', 'img/anatomical_views.png',
         'img/print/hospital-provisional.svg', 'img/print/cardiologia-provisional.svg']
FILES += ['js/' + name + '.js' for name in JS]
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data:; font-src 'self'; connect-src 'none'; media-src 'none'; "
       "object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'")
GUARD = """document.addEventListener('DOMContentLoaded', () => {
    const note = document.createElement('p');
    note.textContent = 'VERSIÓN DE PRUEBA · Solo datos ficticios · Sin envío a Sheets ni IA';
    note.setAttribute('role', 'status');
    note.style.cssText = 'background:#fff7ed;color:#78350f;padding:12px;margin:0;text-align:center;font:14px Arial';
    document.body.prepend(note);
    for (const id of ['btn_save_study','btn_view_sheet','btn_sync_setup','mode_ia','btn_ai_send','btn_ai_toggle']) {
        const button = document.getElementById(id);
        if (button) { button.disabled = true; button.title = 'No disponible en esta copia de prueba'; }
    }
});
"""


def build(output):
    output = output.resolve()
    if output == ROOT or ROOT in output.parents:
        raise ValueError('La salida debe estar fuera del repositorio de la aplicación')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Usá un directorio vacío para evitar publicar archivos ajenos')
    output.mkdir(parents=True, exist_ok=True)
    for relative in FILES:
        source = ROOT / relative
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.suffix != '.html':
            shutil.copyfile(source, target)
            continue
        html = source.read_text()
        html = re.sub(r'<link\b[^>]*https://fonts\.[^>]*>', '', html, flags=re.S)
        meta = '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">'
        html = html.replace('<head>', '<head>\n' + meta, 1)
        if relative != 'print-preview.html':
            html = html.replace('</head>', '<script src="js/review-only.js"></script>\n</head>')
        target.write_text(html)
    # Source revision/date, never the visitor's clock. One generated identifier per build.
    metadata = json.loads((ROOT / 'js/build-info.js').read_text().partition('=')[2].strip().removesuffix(';'))
    commit_date = subprocess.check_output(['git', 'show', '-s', '--format=%cs', 'HEAD'], cwd=ROOT, text=True).strip()
    metadata.update(version=commit_date[:7].replace('-', '.'), revision=subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip(), updated=commit_date, channel='review')
    (output / 'js/build-info.js').write_text('window.EcoBuild = ' + json.dumps(metadata, ensure_ascii=False) + ';\n')
    (output / 'js/review-only.js').write_text(GUARD)
    print(f'Copia de prueba preparada: {len(FILES) + 1} archivos; sin dashboard, datos ni historial Git.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    build(parser.parse_args().output)

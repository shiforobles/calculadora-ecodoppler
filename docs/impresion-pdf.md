# Imprimir / PDF: primera versión

Rama independiente de `main` da6d23e. No incluye el bloque pendiente de coherencia de informes.
Los dos adaptadores solo registran qué formulario acompañaba a la generación del texto;
no modifican cálculos, redacción, copia ni guardado.

## Uso

1. Generar o editar el informe en la calculadora completa o eco rápido.
2. Elegir **Imprimir / PDF**. Si cambiaron los datos desde la generación, revisar texto e
   identificación y confirmar explícitamente que se quiere imprimir tal cual, o cancelar.
3. En la ventana nueva, elegir Genérico o Hospital Español. Genérico es el inicial;
   no se precargan nombre, matrícula ni fecha. La fecha opcional vale solo para esa impresión.
4. Ajustar el membrete y el bloque profesional opcional. Hospital incluye recreaciones
   provisionales de logos, reemplazables por PNG/JPG/WebP locales de hasta 1 MB.
5. **Guardar configuración** conserva los perfiles, sin cambiar el predeterminado.
   **Usar como predeterminado** guarda el perfil y la preferencia explícitamente.
6. **Abrir diálogo de impresión**, papel A4, elegir impresora o Guardar como PDF.
   Desactivar los encabezados/pies automáticos del navegador si agregan fecha o URL.

El texto original y las ediciones permanecen intactos. Solo se oculta en la presentación
el separador de 80 signos `=` inmediatamente después del título automático conocido.
Otras líneas, incluidas líneas manuales de `=`, se conservan. HTML escrito en el informe
se presenta literalmente; no se interpreta.

La ventana mantiene una captura en memoria. Si cambian el texto, el formulario o la
identificación, se bloquea su botón de imprimir y se solicita reabrir la vista previa.
La impresión nativa también oculta el informe de una captura invalidada. Al navegar
fuera de la app se elimina el documento de la ventana de impresión.

## Privacidad y límites

- La función no llama a Generar, cálculos, IA, portapapeles, Sheets ni guardado de estudios.
- Única clave propia: `ecodoppler_print_profiles_v1`. Guarda exclusivamente campos admitidos
  de perfiles y predeterminado, nunca paciente, mediciones, fecha del estudio o informe.
- Preferencias compartidas entre usuarios del mismo perfil de navegador. Un navegador
  nuevo comienza en Genérico; no sincroniza con Google ni con otra computadora.
- Si el almacenamiento falla, se permite imprimir y se informa que la preferencia no se guardó.
- La ventana y cualquier PDF descargado contienen el informe: cerrarla y custodiar el PDF
  según la práctica habitual. No hay borradores ni estudios persistentes en eco rápido.
- No agrega firma manuscrita ni firma digital verificable. El bloque profesional es texto opcional.
- Validado con Chrome de escritorio, incluyendo anchos 390/768/1280. No equivale a probar
  impresoras físicas, Safari/iOS, Android ni los diálogos nativos de esos sistemas.
- La hoja en pantalla es una vista continua A4; los saltos definitivos los resuelve el navegador.
  Repetición de encabezado y número de página dependen del soporte de impresión del navegador.
- La detección compara los valores actuales con los de la última generación; no valida
  correspondencia clínica entre texto manual y mediciones. La revisión sigue siendo del profesional.

## Verificación

Pruebas existentes: `node --test tests/*.test.js` (los archivos antiguos también imprimen
sus conteos internos: 186 casos). Nuevas pruebas unitarias: `tests/print-preview.test.js`.
Interacción real: `tests/print-browser.test.js`, requiere Playwright y Chrome; se marca
omitida explícitamente si no hay Playwright. Todas las solicitudes ajenas al origen ficticio
son bloqueadas. No se envían estudios a servicios reales.

Para revisar PDFs ficticios y capturas, establecer `ECO_PRINT_ARTIFACTS` en un directorio
vacío antes de ejecutar la prueba de navegador. No subir esos artefactos al repositorio.

## Copia de prueba independiente

`scripts/build-print-preview.py /ruta/vacia/dist` crea una copia con lista explícita de
archivos: sin dashboard, datos, bibliografía, historial Git, configuración local ni pruebas.
Agrega un aviso y una política de seguridad que bloquea conexiones salientes, IA y envíos.
Deshabilita los accesos principales a guardado/sincronización/IA en esa copia. Estos cambios
solo existen en el paquete de revisión; no cambian el envío de la aplicación.

El alojamiento de prueba debe tener origen independiente y acceso privado. GitHub Pages
continúa desde `main`; subir esta rama o abrir un PR no actualiza la publicación principal.

## Resultado de esta entrega

- 186 casos existentes aprobados; 5 pruebas unitarias nuevas y 11 escenarios de navegador aprobados.
- Los 22 informes de presets (Lista y Narrativo) son idénticos a main carácter por carácter.
- PDFs ficticios de una y dos páginas revisados visualmente: identificación repetida,
  numeración, texto literal y profesional junto al final.
- El mismo recorrido de navegador pasó sobre el paquete aislado de revisión.
- Vista privada: https://eco-doppler-prueba-impresion.lucasrobles.chatgpt.site
  Requiere el acceso del propietario en Sites. Eco rápido: `/eco-rapido.html`.
  No actualiza la app pública ni se despliega automáticamente con cada cambio del PR.

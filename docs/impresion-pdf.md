# Imprimir / PDF: plantillas listas para usar

Implementado en la rama `codex/imprimir-pdf`, separada del bloque de coherencia pendiente.
No modifica cálculos, motores clínicos, texto de los informes, copia, envío a Sheets ni dashboard.

## Uso

En la calculadora completa, los botones siguen el orden **Generar → Copiar → Guardar → Imprimir**.
Imprimir / PDF también está disponible en eco rápido, que sigue sin guardar estudios.

La vista previa ofrece exactamente dos plantillas fijas:

- **Genérico:** sin institución ni logos, con Dr. Lucas Sebastián Robles y Matrícula 166.452 al final.
- **Hospital Español:** membrete institucional y los mismos datos profesionales al final.

No hay editor de membretes, nombre, matrícula o logos, ni creación de plantillas durante la impresión.
Nuevas plantillas o modificaciones se incorporan mediante cambios de código revisados.
Los dos logos hospitalarios actuales siguen siendo recreaciones provisionales.

Elegir una plantilla vale para esa impresión. **Usar como predeterminada** recuerda la elección
solo cuando se solicita. Genérico es la selección inicial de un navegador nuevo.
La fecha del estudio se completa al abrir la vista previa con el día local de la computadora.
Aparece en el PDF y puede editarse para un estudio de otro día. No se guarda en la plantilla
y se vuelve a tomar el día actual en cada nueva vista previa, sin convertir a UTC.

**Abrir diálogo de impresión** permite elegir una impresora o Guardar como PDF. Usar papel A4
y desactivar encabezados/pies automáticos del navegador si agregan fecha o URL.

## Conservación del texto y privacidad

Se imprime el informe visible, incluidas las ediciones manuales. Solo se oculta el separador
automático de 80 signos `=` inmediatamente después del título conocido; no se borra del
informe original. El resto del texto se conserva literalmente, incluso líneas manuales de `=`
y etiquetas HTML. La función no genera ni recalcula, no usa IA y no envía estudios.
No se deduplican ni eliminan firmas que ya formen parte del texto original.

Si cambiaron los datos desde la generación, se pide revisar texto e identificación antes
de continuar sin regenerar. Si cambia el origen con la vista previa abierta, se invalida
la captura y se pide reabrirla. No se mezcla identificación nueva con texto anterior.

La clave propia `ecodoppler_print_template_v2` guarda exclusivamente versión del formato e
identificador de plantilla predeterminada. Nunca guarda pacientes, mediciones, fecha,
informe, nombre, matrícula o logos. Las configuraciones antiguas del editor no se leen,
no cambian estas plantillas y no se borran automáticamente.
Si falla el almacenamiento, se puede imprimir igual; se informa que la preferencia no se guardó.
La ventana y el PDF descargado sí contienen el informe y deben custodiarse como cualquier informe.

No incorpora imagen de firma ni firma digital verificable. Esa función queda para otra etapa.

## Pruebas y límites

- 186 casos existentes, 6 pruebas unitarias de impresión y 12 escenarios de navegador.
- Verificación de orden de botones y ausencia de editores en ambos modos.
- Datos profesionales fijos en ambas plantillas, aun con preferencias antiguas o ajenas.
- Texto manual, HTML literal, almacenamiento bloqueado/cuota y cambios con la vista previa abierta.
- Preferencia explícita sin guardar paciente, texto o fecha; cambiar el selector no la modifica.
- Fecha automática local comprobada antes/después de medianoche UTC y en el cambio de año.
- Anchos de computadora, celular y tablet; PDFs A4 cortos y largos revisados visualmente.
- Todos los ensayos usan datos ficticios y bloquean solicitudes ajenas al origen de prueba.

Ejecutar `node --test tests/*.test.js`. La prueba de navegador requiere Playwright y Chrome;
se omite explícitamente si no hay Playwright. Para generar PDFs ficticios de revisión,
definir `ECO_PRINT_ARTIFACTS` con un directorio vacío. No subir esos artefactos al repositorio.

La vista de pantalla es continua; los saltos finales dependen del navegador. Chrome de escritorio
es el navegador probado. Safari/iOS, Android e impresoras físicas requieren verificación adicional.
Encabezado repetido y numeración dependen del soporte de impresión del navegador.

## Archivos y copia de revisión

Botones y carga del módulo: `index.html`, `eco-rapido.html`. Integración: `js/ui-controller.js`,
`js/eco-rapido.js`. Presentación: `js/print-preview.js`, `print-preview.html`,
`css/print-preview.css` y `img/print/`. Pruebas: `tests/print-preview.test.js` y
`tests/print-browser.test.js`. Empaquetado aislado: `scripts/build-print-preview.py`.

El empaquetador usa una lista explícita de archivos, sin dashboard, datos, bibliografía,
historial Git, configuración local ni pruebas. Solo en esa copia agrega un aviso,
bloquea conexiones salientes y deshabilita guardado/sincronización/IA.

Vista privada: https://eco-doppler-prueba-impresion.lucasrobles.chatgpt.site
Eco rápido: `/eco-rapido.html`. Requiere acceso del propietario en Sites.
No modifica GitHub Pages desde `main`. Actualizar esta rama o PR no reemplaza la app pública.

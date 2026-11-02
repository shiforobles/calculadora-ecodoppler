# MCH: registro e integración médica

El contexto MCH se activa explícitamente con la casilla del formulario diastólico.
No diagnostica MCH por espesor ni calcula riesgo de muerte súbita. El ejercicio
se evalúa fuera de esta aplicación.

## Comportamiento

- El TSVI se clasifica con registros revisados e interpretables: obstrucción
  desde 30 mmHg y destaque en pantalla desde 50 mmHg. Se conserva cada maniobra,
  su postura y su calidad. Un registro inválido no participa del máximo.
- El máximo de reposo/Valsalva para evaluación externa se distingue del máximo
  global, que puede incluir bipedestación. No constituye un score.
- El motor general de diástole no se utiliza cuando MCH está activo. Se muestran
  mediciones y límites descriptivos, sin contar positivos ni asignar grados.
- E/e′ promedio requiere ambas mediciones anulares. Los datos compartidos
  precargados no se consideran revisados por tener un número visible.
- Venas pulmonares es un bloque opcional. Su ausencia no cuenta como normalidad.
- La presión media AI debe seleccionarse y confirmarse antes de generar/copiar/
  guardar. «Pendiente» es un estado de trabajo; «indeterminada» es una conclusión
  elegida por el médico. PTD VI y grado diastólico son decisiones separadas.
- Las conclusiones se invalidan si cambian sus datos de sustento. Editar el TSVI
  no invalida por sí solo la integración diastólica. Editar FEVI anula su revisión
  y la del grado diastólico, pero no la estimación de presión AI.
- Los presets conservan datos comunes del formulario. No guardan ni inyectan campos específicos MCH, para no trasladar hallazgos o confirmaciones de otro estudio.
- Deshacer restaura maniobras y procedencia; también conserva si el informe
  estaba desactualizado antes del borrado. Esa última corrección resuelve un
  defecto previo, que afectaba asimismo a estudios sin MCH.
- En MCH se utilizan Lista y Narrativo; la generación por IA no reemplaza la
  integración médica revisada.

## Guardado

Se agrega `MCH JSON v1` al final de los encabezados y de la fila enviada, sin
desplazar las columnas históricas. Incluye datos compartidos, FEVI, registros
individuales y procedencia de la integración. No se envían estudios durante las
pruebas. Una planilla ya existente conserva su cabecera anterior: la columna
adicional debe titularse `MCH JSON v1` si se desea identificarla al exportar.

No se incorpora una interfaz de recuperación del formulario desde Sheets. Guardar
el informe o sus datos no equivale a disponer de esa función de recuperación.

## Verificación

- `tests/mch.test.js`: límites, datos faltantes, condiciones de interpretación y
  distinción de presiones.
- `tests/mch-browser.test.js`: seis informes sin MCH comparados carácter por
  carácter con referencias previas; operación del módulo, JSON, presets, FEVI,
  reinicio, Deshacer y ancho de teléfono. Requiere Playwright.
- Las referencias de `tests/fixtures/mch-without-baseline.json` corresponden a
  pacientes ficticios, con el estado previo a esta implementación y los cambios
  locales de configuración que ya existían.

Fuentes de diseño clínico: ASE 2025, tabla 7/sección MCH; AHA/ACC 2024. La
decisión operativa de advertir desde IM moderada no se presenta como una regla
automática de diagnóstico.

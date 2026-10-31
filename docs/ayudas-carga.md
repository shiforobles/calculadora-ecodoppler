# Información de versión y ayudas de carga

Cambios de presentación: no modifican motores, criterios, mediciones, casillas clínicas, informe ni envío.

- El rótulo fijo v17.6 y el número distinto del pie se reemplazan por una edición común.
  Qué cambió muestra notas, fecha del código y revisión. `js/build-info.js` es la fuente
  común y el empaquetador de la vista privada genera edición mensual, fecha y revisión
  desde el commit, sin utilizar la fecha del visitante. No comprueba actualizaciones por red
  ni recarga estudios. La futura publicación principal debe preparar su propia metadata de release.
- Ventana acústica queda a la derecha de IMC en computadora/tablet, y debajo en celular.
- El indicador AI muestra Normal / dilatación leve, moderada o severa con texto y color.
  Sigue los cortes del informe actual: <34, >=34, >=42 y >48 ml/m². Vacío no significa normal.
  Se actualiza al escribir, aplicar presets y después de inyectar Lanús.
- Desempate se abre si el resultado existente pide parámetros secundarios, hay contextos
  seleccionados, BCRI/IM severa registrados para revisar, prótesis mitral o datos adicionales
  presentes. El aviso explica el motivo. BCRI/IM solo resaltan la casilla: no la seleccionan.
  Un cierre manual se respeta mientras no aparezca un motivo nuevo. Una apertura manual
  no se pierde al cambiar un contexto. No se borran campos al ocultar el panel.

Pruebas: límites y datos ausentes; concordancia con clasificación del JSON clínico;
inyección de Lanús; contextos sin selección automática; cierre manual; layout en
390/768/916/1280 px. La comparación de 22 informes de presets con main debe ser idéntica
carácter por carácter. Además se ejecuta la suite existente y la de impresión.

Diferencia previa detectada, no corregida en este cambio: la calculadora de Lanús usa
<=41 para leve y >41 para moderada, mientras el informe pasa a moderada en >=42.
En valores decimales entre 41 y 42 pueden discrepar. El semáforo nuevo sigue al informe;
unificar ese límite clínico requiere revisión médica y un cambio separado.

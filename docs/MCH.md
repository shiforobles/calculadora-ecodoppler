# MCH — miocardiopatía hipertrófica

Especificación aprobada por Lucas el 02/11/2026. Versión simplificada de la rama
`codex/modulo-mch` (Codex, 01/11): se conserva la idea y los tests de regresión;
se quitan las confirmaciones manuales, los selectores de calidad y las maniobras
dinámicas.

## Cómo se usa

1. Tildar **MCH** en los contextos diastólicos. Se abre la caja "Miocardiopatía hipertrófica".
2. Cargar lo que se midió (vacío = no evaluado, nunca se informa como normal):
   espesor máximo y localización, patrón, SAM, gradiente TSVI en reposo y con
   Valsalva, gradiente medioventricular (opcional), aneurisma apical, dirección
   del jet de IM. Venas pulmonares (duración de Ar y de A) va plegado y es opcional.
3. Se reutiliza lo que ya está en la calculadora: SIV/PP, FEy, E, e′ septal y
   lateral, Vmax IT, volumen de AI, grado de IM, ritmo, prótesis, MAC.
4. El informe se escribe solo. Al destildar MCH, el informe vuelve a ser el de siempre.

## Obstrucción del TSVI (AHA/ACC 2024)

| Lo cargado | Frase |
|---|---|
| Reposo ≥30 | … obstructiva en reposo |
| Reposo <30 y Valsalva ≥30 | … con obstrucción provocable |
| Reposo <30 y Valsalva <30 | … no obstructiva |
| Reposo <30 sin Valsalva | …, sin obstrucción del TSVI en reposo (no se realizó maniobra de Valsalva) |
| Sin gradiente | sin calificar la obstrucción |

Gradiente máximo ≥50 mmHg en una forma obstructiva: se agrega "hemodinámicamente
significativa". Formato: **"Hallazgos compatibles con miocardiopatía hipertrófica {patrón} {obstrucción}."**

## Presión de AI — automática

Criterios de MCH de la ASE (tabla 7, vigente en 2025): E/e′ promedio >14 (exige e′
septal y lateral; no cuenta con MAC) · Vmax IT >2,8 m/s · LAVi >34 mL/m² · Ar−A ≥30 ms.

Integración por mayoría de los criterios medidos (regla de la ASE 2016; la ASE
2025 no define conteo, por eso el informe no cita año):
más positivos → elevadas; más negativos → no elevadas; empate → indeterminadas;
menos de 2 medidos → no valorable. Con IM moderada o mayor se cuenta igual y se
agrega una advertencia. En FA/flutter o con prótesis mitral se usa el algoritmo
general de la app.

## Informe

- **Lista:** se mantienen las líneas del VI y de FEy; se agregan "MCH:", "TSVI:" y
  "Diástole (criterios MCH):". Conclusión del VI = frase diagnóstica (con gradiente
  máximo y SAM) + motilidad si está alterada + función sistólica. Conclusión
  diastólica = presión de llenado con "(n de m criterios para MCH)".
- **Narrativo:** el párrafo del VI empieza con la frase diagnóstica, sigue el texto
  habitual (diámetros, motilidad, FEy; sin afirmar "espesores conservados") y termina
  con espesor máximo, relación septo/PP, aneurisma, SAM/IM y gradientes. El párrafo
  diastólico enumera los criterios y concluye la presión de llenado.
- **Síntesis (Narrativo, desde 03/11):** párrafo final "En síntesis, hallazgos compatibles con…"
  con los gradientes en reposo y con Valsalva, SAM, aneurisma, función sistólica y las
  presiones de llenado ("n de m criterios positivos"). En Lista, las conclusiones 2 y 3
  llevan el detalle de los gradientes y de cada criterio diastólico con su valor y umbral.
- Patrón autocompletado (desde 03/11): espesor máximo en septum con relación septo/PP ≥1.3 →
  "septal asimétrica"; espesor máximo en ápex → "apical". Concéntrica y medioventricular las
  elige el médico. Una elección manual no se pisa; si no coincide con las mediciones, aparece
  un aviso en pantalla (no en el informe). Opciones ordenadas por frecuencia.
- Relación septo/pared posterior: si el espesor máximo está en el septum, se calcula con
  ese espesor; si no, con SIV/PP.
- El modo IA queda bloqueado con MCH (todavía no incorpora estos datos).

## Guardado

Columna `MCH JSON v1` al final de la fila de Sheets (aprobado por Lucas): campos de
la caja MCH + resultado automático. Sin MCH se guarda "-". Las columnas históricas
no se corren. Probar solo con un estudio ficticio.

Los presets no guardan ni aplican campos MCH (son de cada paciente).

## Verificación

- `tests/mch.test.js`: bordes 29/30/49/50, Valsalva ausente/negativo/positivo,
  regla de mayoría, umbrales exactos, MAC, IM, campos vacíos.
- `tests/mch-browser.test.js`: 6 informes sin MCH idénticos letra por letra
  (`tests/fixtures/mch-without-baseline.json`); caso aprobado en Lista y Narrativo;
  Sheets; FA; destildar MCH sin arrastre; Borrar todo, Deshacer y presets; teléfono.

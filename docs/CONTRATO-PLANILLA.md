# Contrato de la planilla — qué guarda la calculadora y qué lee el panel

La calculadora (`index.html`) escribe una fila por estudio en la pestaña `Estudios`
a través del Apps Script. El panel (`dashboard_ecodoppler.html`) lee esa misma
pestaña. **Este archivo es el acuerdo entre las dos apps**: quien cambie una
columna lo actualiza acá en el mismo PR.

## Reglas

1. Las columnas se escriben **por posición**. Nunca insertar, borrar ni reordenar:
   las nuevas van **al final** (antes de `ID Estudio`, que la agrega el script).
2. El panel lee **por nombre de encabezado** de la planilla. La planilla de Lucas
   tiene encabezados propios desde el primer día; el único que difiere del código es
   la columna 2: en el código es `HC`, en su planilla `HC- Nombre y Apellido`.
3. Vacío se escribe `-`. Sí/No se escribe `Si` / `No`.
4. Los números se guardan como número (el script los convierte). El panel debe
   aceptar coma o punto decimal.
5. `Fecha` es el día en que se guardó el estudio. Por el panel con clave viaja
   como `AAAA-MM-DD`.
6. Los estudios anteriores al 10/11/2026 tienen errores conocidos y no se corrigen:
   decimales corrompidos (22.6 guardado como 6.22) en IMC, SC, E/e', E/A, Vol AI y
   otros; sin `Informe`, `Institución` ni `ID Estudio`; valores que venían del preset
   sin medir. Lo confiable son los estudios nuevos.

## Columnas (89 + ID)

| # | Columna | Notas |
|---|---|---|
| 1 | `Fecha` | día del guardado |
| 2 | `HC` | texto libre; en la planilla de Lucas el encabezado es `HC- Nombre y Apellido` |
| 3 | `Edad` |  |
| 4 | `Sexo` |  |
| 5 | `Peso` |  |
| 6 | `Altura` |  |
| 7 | `IMC` |  |
| 8 | `SC` |  |
| 9 | `Ritmo` | `sinusal` / `fa` |
| 10 | `Conducción` |  |
| 11 | `HTA` |  |
| 12 | `C.Isquémica` |  |
| 13 | `CRM` |  |
| 14 | `EPOC` |  |
| 15 | `FA Previa` |  |
| 16 | `Marcapasos` |  |
| 17 | `SIV` |  |
| 18 | `PP` |  |
| 19 | `DDVI` |  |
| 20 | `DSVI` |  |
| 21 | `Masa VI Index` |  |
| 22 | `RWT` |  |
| 23 | `Geometría` |  |
| 24 | `FEy` | % |
| 25 | `Motilidad Global` |  |
| 26 | `Motilidad Detalle` | territorio o patrón + `(WMSI: x)` si está alterada |
| 27 | `Diástole` | texto del motor de diástole (ASE 2025); puede decir "No valorable" o "Indeterminada" |
| 28 | `E/e'` |  |
| 29 | `E/A` |  |
| 30 | `Vol AI` |  |
| 31 | `EAo Grado` | incluye `esclerosis` |
| 32 | `EAo Vmax` |  |
| 33 | `EAo GM` |  |
| 34 | `AVA` |  |
| 35 | `Coef Adim` |  |
| 36 | `IAo Grado` |  |
| 37 | `IAo VC` |  |
| 38 | `IAo PHT` |  |
| 39 | `IAo RVol` |  |
| 40 | `IAo EROA` |  |
| 41 | `IAo Alcance` |  |
| 42 | `IAo Reverso` |  |
| 43 | `EM Grado` |  |
| 44 | `EM GM` |  |
| 45 | `EM Área` |  |
| 46 | `IM Grado` |  |
| 47 | `IM ORE` |  |
| 48 | `IM VR` |  |
| 49 | `AD Estado` |  |
| 50 | `AD Área` |  |
| 51 | `VD Estado` |  |
| 52 | `VD Basal` |  |
| 53 | `TAPSE` |  |
| 54 | `S'` |  |
| 55 | `PSAP` | mmHg |
| 56 | `IT Grado` | incluye `no_valorable` |
| 57 | `IT VC` |  |
| 58 | `IT ORE` |  |
| 59 | `IT VR` |  |
| 60 | `IT Flujo Hep` |  |
| 61 | `Prótesis` |  |
| 62 | `Prot Posición` |  |
| 63 | `Prot Tipo` |  |
| 64 | `Prot Modelo` |  |
| 65 | `Prot Vmax` |  |
| 66 | `Prot GM` |  |
| 67 | `Prot DVI` |  |
| 68 | `Prot iEOA` |  |
| 69 | `Prot Insuf` |  |
| 70 | `ASIA Excursión` |  |
| 71 | `ASIA Shunt` |  |
| 72 | `PE Tamaño` | mm; `0` si no hay derrame |
| 73 | `PE Compromiso` |  |
| 74 | `Onda E` |  |
| 75 | `Onda A` |  |
| 76 | `e' Septal` |  |
| 77 | `e' Lateral` |  |
| 78 | `TRIV` |  |
| 79 | `TD` |  |
| 80 | `LARS` |  |
| 81 | `IM VC` |  |
| 82 | `IT Vmax` |  |
| 83 | `PE Distribución` |  |
| 84 | `Informe` | texto completo tal como quedó en pantalla, con ediciones manuales |
| 85 | `ATC/Stent` |  |
| 86 | `Recambio Ao` |  |
| 87 | `Recambio Mitral` |  |
| 88 | `Observaciones` | texto libre |
| 89 | `Institución` | elegida de la lista de ⚙️; `-` si no se eligió (desde 10/11/2026) |
| 90 | `ID Estudio` | lo agrega el script; identifica el envío y evita duplicados al reintentar |

## Pestaña de Eco Estrés

La escribe la app de Eco Estrés (otro repositorio). El panel usa: `Fecha`, `HC`,
`Edad`, `Sexo`, `Protocolo`, `Resultado`, `Territorio`, `% FCMT`, `METs`,
`DP máximo`. Todavía se lee por CSV publicado; pendiente pasarla a lectura con clave.

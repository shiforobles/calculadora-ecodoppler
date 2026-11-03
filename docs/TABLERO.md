# Tablero — quién está tocando qué

Única fuente de verdad del estado del proyecto. Lo actualiza cada IA al tomar y
al terminar una tarea (ver `AGENTS.md`). Última actualización: 02/11/2026.

## Tareas abiertas

| Tarea | Sección que toca | Quién | Rama | Estado / por dónde seguir |
|---|---|---|---|---|
| Refactor: extraer pericardio del informe | Pericardio (informe) | Claude (chat "Refactor") | sin rama: patch en ese chat | Hecho como patch sobre 69970cd, sin commit. Falta: rebasar sobre `main` actual, que Lucas lo revise, mergear |
| Sección MCH | VI / diástole | Claude (chat "MCH") | — | Planificación. Prompt en el Project de Claude (`claude/prompt-mch.md`). Implementa después del pericardio |
| Seguridad: planilla e historial Git | — (fuera del código) | Lucas | — | Despublicar la planilla y rotar Apps Script (`docs/CONFIGURACION-PRIVADA.md`); después limpiar historial. Sin force-push sin OK de Lucas |

## Secciones ocupadas

Mientras una tarea esté abierta, nadie más toca su sección:

- **VI / diástole / `hemodynamics.js`** → MCH
- **Pericardio** y la estructura de `js/report/` → Refactor

Libres: todo lo demás, incluida la estética (`styles.css`).

## Orden previsto del refactor

pericardio → septum → aurícula izquierda → cavidades derechas/IT → prótesis →
aórtica → mitral → VI/diástole (después de MCH).

## Hecho recientemente

| Fecha | Qué | PR | Quién |
|---|---|---|---|
| 02/11 | Borrar todo: sin preguntar, deja la página como recién abierta, sube arriba, cierra IT/motilidad | #2, #3 | Claude (Coordinación) |
| 02/11 | Reglas comunes para todas las IAs (`AGENTS.md`) y este tablero | #4 | Claude (Coordinación) |

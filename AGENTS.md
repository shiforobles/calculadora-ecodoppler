# Reglas para cualquier IA que trabaje en este repo

Vale para Claude, Codex / GPT Work, Gemini o la que sea. Lucas alterna entre
varias según disponibilidad: **el trabajo tiene que poder seguirlo otra IA sin
leer tu chat**. Decisiones, pendientes y resultados quedan en GitHub.

Lucas usa la app publicada en GitHub Pages desde sus favoritos
(https://shiforobles.github.io/calculadora-ecodoppler/). No depende de una
versión local para probar.

## 1. Antes de modificar nada

1. Leé este archivo y `docs/TABLERO.md`.
2. Revisá `main`, las ramas, los PR abiertos y tus cambios locales pendientes.
   No descartes ni sobrescribas trabajo previo.
3. Por ahora trabaja **un solo asistente implementando a la vez**. Si el tablero
   muestra una tarea activa de otro, no la pises: verificá si hay que terminarla
   o transferirla, y anotalo.
4. Registrá en el tablero la tarea, tu nombre y la rama **antes** de implementar.
5. Si no podés acceder al repo o publicar, decilo. No afirmes pasos que no hiciste.

## 2. Cada tarea

1. Nueva: rama desde `main` actualizado (`fix/...`, `feat/...`, `estetica/...`).
   Retomada: continuar la rama existente.
2. Implementar solo el alcance pedido, sin funciones ni rediseños ajenos.
3. `node --test tests/*.test.js` — todo en verde.
4. Pruebas de regresión cuando corresponda, y probar en navegador el flujo
   afectado con **datos ficticios**. Nunca enviar pruebas a servicios clínicos reales.
5. Revisar el cambio completo y preservar trabajos ajenos.
6. PR y merge con squash: **Lucas autoriza cerrar este circuito** en cambios habituales.
7. Esperar el despliegue de GitHub Pages y verificar que publique el commit
   esperado y que el flujo funcione. Un push no es una publicación.
8. Actualizar el tablero con resultado, pruebas y pendientes.

Reglas técnicas:
- No cambiar el texto del informe sin que sea el objetivo de la tarea.
- Ningún color escrito en el HTML: va en variables de `styles.css` (ver `GUIA-ESTILOS.md`).
- Si cambiás un `.js` o `.css`, subí su `?v=` en `index.html`.
- Sin sistema de build ni frameworks nuevos.

## 3. Límites: consultar a Lucas antes de

- Borrar o migrar datos existentes de forma irreversible.
- Contratar servicios pagos.
- **Cambiar umbrales o criterios clínicos.**
- Ampliar la exposición de datos o cambiar quién puede acceder a ellos.
- Tocar el guardado en Sheets o agregarle mensajes, salvo que la tarea lo pida.

Nunca subir pacientes, claves, URLs de planillas ni datos personales (nombre,
matrícula): la firma se configura en el navegador (⚙️), no en el código.

## 4. Interrupciones

- Guardá avances en la rama mientras trabajás, sin esperar a quedarte sin crédito.
- Si queda incompleto: commit `wip: ...` y **PR en borrador**, con qué está
  terminado, qué falta y qué pruebas se corrieron. Anotarlo en el tablero.
- Nunca fusionar trabajo incompleto en `main`.

## 5. Comunicación con Lucas

Español sencillo (es médico, no programador). Al terminar: qué cambió, si quedó
publicado y verificado, URL y commit, y si tiene que recargar con Cmd+Shift+R.

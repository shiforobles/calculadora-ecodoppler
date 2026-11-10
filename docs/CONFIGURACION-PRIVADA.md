# Configuración privada y rotación — 31/10/2026

## Hallazgos y cambios

Se revisaron todos los archivos versionados y los archivos de respaldo locales mediante búsquedas de URLs, nombres, matrículas y patrones de credenciales. No se encontraron URLs de implementaciones Apps Script, claves API ni tokens reales en la versión actual. `js/google-sync.js` ya obtenía la URL exclusivamente de `ecodoppler_script_url` en localStorage: no había un valor predeterminado que migrar.

Sí se encontraron y retiraron del dashboard una URL CSV publicada de Google Sheets y **177 estudios incrustados con identificadores de pacientes y datos clínicos**. Se retiraron el nombre del profesional en el dashboard y los ejemplos personales de nombre y matrícula en Configuración. No se reproducen aquí las direcciones ni los datos retirados.

Los motores clínicos y la redacción no cambian. No se borran los estudios importados del navegador (`ecodash_studies`), los presets, la firma ni ninguna configuración existente al actualizar. Sin CSV configurado, el dashboard utiliza las importaciones locales y avisa que no tiene conexión configurada; ya no carga los estudios incrustados. La planilla original no se modifica.

Los accesos a Gemini, Groq, la planilla y los enlaces personales solo aparecen cuando están configurados. Se agregaron dos enlaces personales opcionales HTTPS y la clave de Groq al panel ⚙️. No había enlaces personales de chats hardcodeados en la versión revisada. Los enlaces bibliográficos y servicios públicos se conservan. Vaciar y guardar un campo opcional de IA elimina ese acceso; actualizar la app no vacía ningún campo.

## Antes de compartir

**Este commit limpia la versión actual, no el historial público de Git ni copias ya descargadas.** Los 177 estudios y la URL anterior siguen recuperables en commits anteriores. Hace falta planificar una limpieza del historial de todas las ramas/tags afectados y solicitar a GitHub la eliminación de referencias/cachés correspondientes cuando proceda. No se hizo force-push ni se reescribió el historial en esta tarea. Cambiar el repositorio a privado puede reducir nuevas consultas durante esa limpieza, pero no revoca copias existentes.

Además, en la planilla expuesta: Archivo → Compartir → Publicar en la Web → Contenido publicado y configuración → Detener publicación. Revisar también Compartir → Acceso general y limitarlo a las personas necesarias. **Quitar la URL del código no despublica la planilla.** Importar un archivo local en el dashboard permite usarlo sin publicar datos clínicos. No volver a publicar datos identificatorios solo para habilitar CSV.

## Rotar la URL del Apps Script

1. En el mismo navegador y dirección donde usás la app, abrir ⚙️. Conservar en un lugar privado los valores actuales. No limpiar los datos del sitio. Anotar qué equipos usan la implementación anterior.
2. Abrir tu Google Sheet → Extensiones → Apps Script. Mantener el código actual: esta tarea no requiere reemplazarlo.
3. Implementar → Nueva implementación → Seleccionar tipo → Aplicación web. Usar una descripción reconocible, por ejemplo «Rotación de acceso». **No editar la implementación anterior**, porque editarla conserva su URL.
4. Para conservar el flujo actual, ejecutar como «Yo» y permitir «Cualquier usuario», sujeto a las restricciones de tu cuenta. Esto conserva un endpoint público: una URL difícil de adivinar no sustituye autenticación.
5. Implementar y completar la autorización si Google la solicita. Copiar la nueva URL de la aplicación web terminada en `/exec` (no `/dev`).
6. Pegarla en ⚙️ → URL del Web App → Guardar, en cada equipo autorizado. Probar conexión solo verifica que el script responde, **no que haya guardado un estudio**.
7. Enviar un estudio ficticio identificable y verificar manualmente en la planilla que apareció una sola fila con el contenido esperado. No confiar en el cartel de guardado actual como comprobante.
8. En Apps Script: Implementar → Gestionar implementaciones → seleccionar la implementación vieja → Archivar. Repetir para otras implementaciones antiguas que sigan activas y expuestas. Archivar la implementación no borra las filas de la planilla.
9. Comprobar en una ventana privada que la URL vieja ya no entrega la respuesta de prueba del script y verificar nuevamente el envío a la nueva. No volver a activar la URL expuesta.

Fuente oficial: https://developers.google.com/apps-script/concepts/deployments

## Panel con clave (10/11/2026)

El panel puede leer los estudios online **sin publicar la planilla**: se los pide al Apps Script, que solo responde si recibe la clave guardada en sus propiedades.

1. Pegar en Apps Script el código actual de ⚙️ (incluye `leerPanel_` y `crearClavePanel`). Antes de borrar el código viejo, confirmar que `SHEET_NAME` coincide con el nombre de la pestaña donde se guardan los estudios.
2. En el editor, elegir la función `crearClavePanel` → Ejecutar. Copiar la clave del registro de ejecución. No guardarla en el repo ni enviarla por chat.
3. Implementar → **Nueva implementación** (aplicación web, ejecutar como «Yo», acceso «Cualquier usuario»). Copiar la URL `/exec`.
4. En ⚙️ de la calculadora: pegar la URL nueva y la clave en «Clave del panel» → Guardar. El panel usa el mismo navegador y dirección.

Con clave cargada el panel ignora la URL CSV. Ejecutar `crearClavePanel` otra vez genera una clave nueva y anula la anterior. La clave viaja en la dirección de la consulta por HTTPS: protege la lectura, pero quien tenga URL y clave puede leer todo; tratarla como una contraseña. El guardado de estudios sigue sin clave (ver propuesta más abajo).

## Qué cargar después

- URL nueva `/exec`: imprescindible para enviar estudios.
- URL de tu Google Sheet: opcional, solo para el botón de abrir planilla; no es la URL de escritura.
- Nombre, matrícula y firma: permanecen si ya estaban guardados.
- Gemini/Groq y enlaces personales: solo si querés usar esas herramientas; cada colega carga sus propias credenciales y enlaces.
- CSV del dashboard: opcional, distinto de la URL `/edit`. Preferir importar un archivo local cuando contenga datos identificatorios.

La configuración es por navegador y origen (dominio/protocolo/puerto). Usar otra dirección, otro dispositivo o modo privado no comparte automáticamente esos valores. No guardar claves en el repositorio ni enviarlas al colega. Si faltan los datos de Apps Script, guardar muestra un aviso explícito y no hace una petición.

## Guardado confirmado (10/11/2026, implementado)

La calculadora envía cada estudio con un identificador (`ID Estudio`) por `POST` simple (`text/plain`, sin preflight) y lee la respuesta JSON del script.

- «✅ Guardado confirmado»: el script respondió `ok` después de escribir la fila.
- «✅ Ya estaba guardado (no se duplicó)»: el mismo estudio, sin cambios, ya estaba en la planilla. Requiere el código nuevo del script.
- «⚠️ Enviado, pero sin confirmación»: no se pudo leer la respuesta. La fila pudo haberse escrito o no: mirar la planilla antes de reintentar.
- «⚠️ Error al guardar»: el script informó una falla y no escribió.

El script nuevo además convierte a número los valores numéricos antes de escribir (antes llegaban como texto y la planilla podía leer «22.6» como fecha y corromper el decimal), usa un bloqueo para escrituras simultáneas y agrega el título `ID Estudio` en la última columna si falta. HC, modelo de prótesis, informe, observaciones e institución se guardan siempre como texto. Los estudios anteriores no se corrigen.

Límites conocidos: el guardado sigue sin clave (quien tenga la URL `/exec` puede enviar filas, no leerlas) y la confirmación contra un Apps Script real debe verificarse con un estudio ficticio. Las columnas y su significado están en `docs/CONTRATO-PLANILLA.md`.

## Recuperación si algo falla

- Configuración: volver a cargar tus valores desde la copia privada. No borrar localStorage ni importar configuraciones ajenas.
- Apps Script: si cambia su código en el futuro, apuntar la **implementación nueva** a la versión funcional anterior desde Gestionar implementaciones → Editar → Versión → Implementar. Se conserva la URL nueva. No reactivar la vieja expuesta.
- App: la referencia anterior a esta limpieza es `3f03dfa`. Para diagnóstico local, un desarrollador puede abrir esa revisión en un checkout aislado. **No publicarla tal cual**, porque repone los estudios y el enlace expuesto. Recuperar solo el archivo/comportamiento defectuoso conservando las eliminaciones de datos, probar y hacer un commit correctivo. Un `git revert` completo de la limpieza también reexpondría esos datos y no es una recuperación segura para el sitio público.

No se rotaron implementaciones, no se modificó la planilla ni se accedió a configuraciones del navegador personal durante esta tarea.

## Verificación realizada

Pasaron los 186 casos de los cinco conjuntos clínicos (49 + 45 + 27 + 29 + 36). El ejecutor de Node también informa 50 pruebas/subpruebas aprobadas, sin fallos ni omisiones; ese conteo incluye suites que internamente ejecutan los casos clínicos. Las pruebas con Chrome usan un perfil temporal y bloquean la red externa: verifican configuración persistente, valores escapados, enlaces inválidos, accesos condicionales, falta de URL sin envío, conservación de estudios locales y los flujos existentes de informes. No se envió ningún estudio real.

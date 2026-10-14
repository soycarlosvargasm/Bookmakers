# Corrección de asociaciones deportivas y navegación

La navegación automática comparte una política entre enlaces, controles, colas y restauración. Las noticias, blogs, contacto, ayuda, términos, privacidad, promociones y cuentas se excluyen antes de cargar documentos. BestFightOdds limita sus destinos a inicio, eventos y tablas de boxeo. Los cambios de URL por controles y las ventanas emergentes se verifican; una URL con `#` vacío equivale a la original, pero se conservan los fragmentos y parámetros que identifican vistas.

BestFightOdds se detecta por fuente o dominio, independientemente del perfil recordado. Su parser se utiliza en DomHandler y durante el scroll. Une las parejas con data-mu, las celdas con data-li y las casas con data-b. Los grupos incompletos quedan pendientes junto a los utilizables. Un fallo no habilita el extractor genérico ni accesibilidad como sustitutos. La fecha solo procede de metadatos explícitos del contenedor del evento; sin prueba suficiente queda desconocida.

El extractor genérico requiere un único encabezado local de enfrentamiento, un mercado local y una selección con precio asociado. Body, main y parlay-mode-container no son fichas. Los IDs de interfaz no se presentan como IDs del proveedor. Las claves técnicas del DOM quedan separadas. Las cuotas originales conservan su formato.

La validación compartida distingue asociaciones comprobadas, metadatos incompletos, ambigüedad y contenido informativo. UNCONFIRMED indica falta de corroboración entre capas; solo puede organizarse cuando la asociación local está demostrada. Los perfiles generic-v1 antiguos no tienen esa prueba y quedan pendientes. La lectura de snapshots y el filtro previo a persistencia aplican la misma validación. La base de datos histórica no se ha reparado ni auditado: requiere una intervención separada si se quiere determinar qué filas llegaron a PostgreSQL.

La clasificación derivada vive en `.engine/collection/classification/` y contiene versión de validación, versión del parser, huella del archivo, clasificación por registro y motivos. No reescribe RAW, texto ni imágenes. La vista ofrece sugerencias procedentes de grupos utilizables, aplica los filtros al mismo registro y conserva en pendientes los datos desconocidos. Los contadores distinguen archivos, mercados y grupos pendientes, incluyendo el solapamiento de archivos mixtos. Fuente y casa se muestran separadas.

## Reclasificación local ejecutada

70 archivos de BestFightOdds: 488 grupos de mercado utilizables, 5.275 grupos pendientes, 70 archivos con algún pendiente y 27 archivos mixtos. Son grupos de vista, no cuotas únicas ni eventos únicos. Los 488 grupos utilizables tienen fecha de evento desconocida; la evidencia histórica no permite recuperarla sin inventar una asociación o consultar de nuevo la web.

El RAW indicado por el usuario mantiene SHA-256 `8759b426c1241c3597e27a5b11c3dba5e8177cedacc93957a15c38063f82a106`. Su registro de 2.284 caracteres queda pendiente y no genera una ficha válida.

## Verificación

Resultado final: typecheck y build correctos; suite completa con 185 pruebas, 183 aprobadas, 2 omitidas, 0 fallos y 0 cancelaciones.

- Fixtures locales: varias casas y enfrentamientos, gráficos de porcentajes, noticias con odds/vs, enlaces informativos, contenedor general, mismo luchador en eventos distintos, períodos/líneas, texto sin imagen, fechas conocidas/desconocidas, capturas antiguas y observaciones posteriores, archivos mixtos y cola histórica.
- Regresión del RAW: igualdad de bytes antes/después y bloqueo de persistencia mediante Pool simulado, sin conectar a PostgreSQL.
- Pruebas de consultas fallidas/tardías, selección modificada, modos automático/manual y Detener.
- App nativa con servidor aislado y fixtures: galería plegada, sugerencia seleccionable del enfrentamiento, filtro por casa, cuota original +122 y apertura del texto/registro de evidencia. El administrador no se abrió en un navegador.
- Sin extracciones reales ni llamadas pagadas de IA. No se modificaron landing, Fuentes, Data, scheduler ni Apuesta final.

Reproducir: `npm run typecheck`, `npm test`, `npm run build`. Reclasificar offline: `node --import tsx scripts/reclassify-saved-evidence.ts`. Verificar la app nativa con datos aislados: `node --import tsx scripts/verify-workbench-native.ts` y abrir la app de revisión cuya ruta imprime el script.

# Navegación y apertura EXPRESS

La interfaz organiza cada sección en submenús. «Capturas → Capturar una página» muestra la página, URL, país, modo de scroll automático/manual y controles de inicio y detención. «Capturas → Enfrentamientos y cuotas» mantiene los filtros por país, liga y equipo y las opciones con su cuota original.

Cada tarjeta de «Fuentes → Países y casas» tiene un botón **EXPRESS · Abrir N páginas**. Abre las URLs configuradas del país en una nueva ventana de Chrome Renzo, mediante una sola invocación, sin esperar a que termine de cargar cada página. Global contiene 16 páginas. El botón permanece disponible durante una captura. «Capturar país» conserva su comportamiento de adquisición en serie.

## Flujo verificado

| Límite | Evidencia |
| --- | --- |
| Interfaz | Las nueve regiones muestran EXPRESS con el número de páginas del catálogo. Submenús y controles de scroll revisados en la ventana nativa. |
| Interfaz → servidor | `POST /api/countries/open` recibe únicamente el código de país; la autenticación nativa y todos los países están cubiertos por pruebas. |
| Catálogo → Chrome | El servidor selecciona URLs del catálogo y las pasa como argumentos separados. Una invocación abre todas las páginas, con URLs y perfil validados. |
| Chrome → resultado | La prueba nativa de Global aumentó las pestañas de Chrome Renzo de 18 a 34: 16 nuevas páginas. La interfaz confirmó «16 pestañas abiertas». |
| Captura existente | EXPRESS también funcionó desde la ventana conectada al servidor activo, mientras su captura de Houdini seguía pendiente. No se resolvió ni canceló esa verificación. |

El shell nativo incluye un abridor independiente de `tsx` y del acceso al proyecto en Desktop. Si un servidor anterior responde 404 a la nueva ruta, la misma interfaz usa ese abridor por un mensaje limitado a países del catálogo y al origen local del propio shell. Esto permite actualizar la ventana sin reiniciar una captura existente. Otras respuestas de error se muestran directamente.

La apertura no crea runs ni inicia OCR o extracción. Los errores de las fuentes quedan detrás de «Ver motivo» y una verificación pendiente puede ocultarse con «Volver a las fuentes» conservando el estado del motor.

Validación: suite completa, 200 pruebas aprobadas y 2 omitidas (integración PostgreSQL y recuperación de ingestión); typecheck y build aprobados. Se añadieron pruebas para apertura en una sola invocación, catálogo de cada país, validación y autenticación, bloqueo de doble clic y reintento, independencia de una captura activa y ejecución del abridor empaquetado desde su propio directorio.

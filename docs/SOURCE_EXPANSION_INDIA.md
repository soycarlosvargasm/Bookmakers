# Fuentes India registradas en la app Mac

Fecha: 5 de octubre de 2026. El usuario ejecutará las capturas. Esta tarea no ejecuta adquisiciones ni escribe cuotas en RAW o memoria.

Sources → India conserva su tarjeta y sus dos botones por país. Se añaden cuatro fuentes a 10cric India: cinco en total. Las cuatro nuevas entradas usan `vpn: "in"` y `verified: false`, con notas visibles sobre los límites de la comprobación. No se modifica el motor ni `actions.ts`.

| Fuente | URL configurada | Evidencia y límite |
| --- | --- | --- |
| 1xBet India | https://indian.1xbet.com/en/line | Página publicada para India. En Chrome Renzo redirigió a `/en/block`. Se usa `1xbet-in` para no aplicar el adaptador existente `1xbet`, que obtiene feeds sin recibir la URL regional. |
| Dafabet India | https://www.dafabet.com/in/sports-df/sports | Sportsbook publicado por Dafabet bajo `/in/`. La lectura web redirigió a otro dominio y no permitió abrirlo. Acceso local y extracción pendientes. |
| FUN88 India | https://link.fun88-india.com/ | Enlace India publicado por https://www.fun88.com/. En Chrome Renzo redirigió a https://www.fun88ind.net/ y mostró un error 403 de CloudFront. |
| 4Rabet India | https://4rabet.com/ | La lectura web redirigió a https://4rabet-web.com/. Su sección `/sports` se dirige a India. No se comprobó localmente ni se certificó extracción. |

No se certifica acceso con VPN India: no se comprobó el país de salida durante estas aperturas. El navegador usado fue el perfil Renzo existente, no una sesión de test. La existencia de páginas promocionales o deportivas no demuestra que el colector pueda extraer cuotas de ellas.

Parimatch queda pendiente de identificar una URL India del sportsbook desde una fuente de la marca. Los resultados incluyen numerosos dominios que se presentan como oficiales y no se instalaron basándose solo en esa afirmación.

Verificación de instalación: typecheck, prueba del endpoint con cola simulada de las cinco fuentes y revisión de la tarjeta India en la app Mac. No se dispara `Run India` durante la verificación.

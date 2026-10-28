# Requisitos del sistema

Proyecto: Clancy's Rewards · Capstone, Fase 2 · Estado al 28 de octubre de 2026.

La matriz completa está en **[Matriz_de_Requisitos.xlsx](Matriz_de_Requisitos.xlsx)**: 26 requisitos con descripción, actor, prioridad, criterio de aceptación, origen, estado, sprint, issue y evidencia en el sistema; un resumen por estado; y la hoja de requisitos técnicos con las herramientas, tecnologías, servicios y costos. Esta página resume la misma información.

**Estado:** 14 implementados, 1 parcial y 11 pendientes; cada pendiente tiene su sprint e issue.

## Actores

| Rol | Quién es | Qué hace en la app |
|---|---|---|
| Cliente | Persona que visita el local | Se registra, muestra su QR, acumula visitas y canjea premios |
| Personal (mesero o anfitrión) | Trabajador de sala | Escanea el QR para sumar la visita o entregar un premio |
| Administrador (dueño o encargado) | Administración del local | Gestiona menú, premios, promociones, clientes y personal, y revisa indicadores |

## Requisitos funcionales

| ID | Requisito | Actor | Prioridad | Criterio de aceptación | Estado | Sprint | Issue |
|---|---|---|---|---|---|---|---|
| RF-01 | Registro con correo y contraseña | Cliente | Alta | Con un correo no registrado y una contraseña de al menos 6 caracteres, se crea la cuenta y su membresía. Con un correo ya registrado, se muestra un error. | Implementado | Prototipo | — |
| RF-02 | Inicio de sesión con correo o con Google | Todos | Alta | Con credenciales válidas se entrega un token de sesión; con credenciales inválidas se responde error 401; una cuenta desactivada no puede entrar. | Parcial | Sprint 2 | [#50](https://github.com/44ndy/clancys-rewards/issues/50) |
| RF-03 | Tarjeta de socio | Cliente | Alta | La tarjeta muestra el número de visitas y el próximo premio según las visitas requeridas. | Implementado | Prototipo | — |
| RF-04 | QR personal de un solo uso | Cliente | Alta | El QR vence a los 3 minutos (180 s) y deja de servir después de escanearse una vez. | Implementado | Prototipo | — |
| RF-05 | Escaneo del QR y suma de visita | Personal | Alta | Solo un rol de personal puede escanear. Un QR vencido o ya usado se rechaza. La visita queda registrada con el empleado que la validó. | Implementado | Prototipo | — |
| RF-06 | Canje de premios en dos pasos | Cliente / Personal | Alta | Sin visitas suficientes el canje se rechaza. El canje queda "pendiente" hasta confirmar la entrega, y confirmar dos veces no lo duplica. | Implementado | Prototipo | — |
| RF-07 | Menú del local | Cliente | Media | Se muestran los platos disponibles ordenados por servicio y sección. | Implementado | Prototipo | — |
| RF-08 | Gestión de menú, premios y promociones | Administrador | Alta | Solo los roles de administración pueden editar. Los cambios se ven en la app del cliente sin publicar una nueva versión. | Implementado | Prototipo | — |
| RF-09 | Panel de indicadores | Administrador | Media | El panel muestra los indicadores calculados desde los registros reales de visitas y canjes. | Implementado | Prototipo | — |
| RF-10 | Gestión del personal | Dueño | Media | Solo el dueño accede a esta función; un empleado desactivado no puede iniciar sesión. | Implementado | Prototipo | — |
| RF-11 | Confirmar antes de borrar y deshacer | Administrador | Media | Ninguna eliminación ocurre sin confirmar; durante unos segundos se puede deshacer. | Pendiente | Sprint 1 | [#43](https://github.com/44ndy/clancys-rewards/issues/43) |
| RF-12 | Mensajes de error y reintentar | Todos | Media | Cada error de red muestra un mensaje en pantalla con un botón para reintentar. | Pendiente | Sprint 1 | [#44](https://github.com/44ndy/clancys-rewards/issues/44) |
| RF-13 | Recuperación de contraseña | Cliente | Media | Al solicitarlo, llega un enlace al correo que permite definir una nueva contraseña. | Pendiente | Sprint 3 | [#57](https://github.com/44ndy/clancys-rewards/issues/57) |
| RF-14 | Tiempo mínimo entre visitas | Personal | Media | Un segundo escaneo del mismo cliente dentro del intervalo configurado se rechaza. | Pendiente | Sprint 3 | [#56](https://github.com/44ndy/clancys-rewards/issues/56) |
| RF-15 | Exportar y borrar la cuenta | Cliente | Alta | El cliente obtiene un archivo con sus datos y, al borrar la cuenta, sus datos personales se eliminan. | Pendiente | Sprint 3 | [#54](https://github.com/44ndy/clancys-rewards/issues/54) |

## Requisitos no funcionales

| ID | Requisito | Actor | Prioridad | Criterio de aceptación | Estado | Sprint | Issue |
|---|---|---|---|---|---|---|---|
| RNF-01 | Contraseñas cifradas | Sistema | Alta | En la base de datos solo existe el campo password_hash. | Implementado | Prototipo | — |
| RNF-02 | Sesiones con token JWT | Sistema | Alta | Una petición sin token o con un token vencido se responde con error 401. | Implementado | Prototipo | — |
| RNF-03 | Permisos por rol en el servidor | Sistema | Alta | Un cliente que llama a una ruta de administración recibe error 403. | Implementado | Prototipo | — |
| RNF-04 | Credenciales fuera del código | Sistema | Alta | El repositorio no contiene ninguna credencial; existe un .env.example sin valores. | Implementado | Sprint 0 | [#36](https://github.com/44ndy/clancys-rewards/issues/36) |
| RNF-05 | Límite de intentos y CORS restringido | Sistema | Alta | Tras varios intentos fallidos la API responde error 429; un origen no autorizado es rechazado. | Pendiente | Sprint 1 | [#42](https://github.com/44ndy/clancys-rewards/issues/42) |
| RNF-06 | Botones táctiles accesibles | Administrador | Media | Todos los botones del panel cumplen el tamaño mínimo. | Pendiente | Sprint 1 | [#45](https://github.com/44ndy/clancys-rewards/issues/45) |
| RNF-07 | Servidor en la nube con HTTPS | Sistema | Alta | La app de producción se conecta por HTTPS y la base tiene respaldo automático. | Pendiente | Sprint 2 | [#47](https://github.com/44ndy/clancys-rewards/issues/47) |
| RNF-08 | Cumplimiento del RGPD | Cliente | Alta | El registro exige aceptar la política; el cliente puede exportar y borrar sus datos. | Pendiente | Sprint 3 | [#54](https://github.com/44ndy/clancys-rewards/issues/54) |
| RNF-09 | App Android en Google Play | Sistema | Alta | La app pasa la prueba cerrada de 14 días con al menos 12 testers y queda publicada. | Pendiente | Sprint 2 y cierre | [#51](https://github.com/44ndy/clancys-rewards/issues/51) |
| RNF-10 | Contenido como datos | Administrador | Media | Agregar un plato o un premio no requiere publicar una nueva versión de la app. | Implementado | Prototipo | — |
| RNF-11 | Pruebas automatizadas | Sistema | Alta | La suite de pruebas corre sin errores antes de cada entrega. | Pendiente | Sprint 3 | [#58](https://github.com/44ndy/clancys-rewards/issues/58) |

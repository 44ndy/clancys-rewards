# Requisitos del sistema

Proyecto: Clancy's Rewards · Capstone, Fase 2 · Estado al 28 de octubre de 2026.

Los requisitos salen del análisis del proceso de atención de Clancy's Cork, donde trabajo, y de las historias de usuario del backlog. Cada requisito pendiente está asociado a un issue del repositorio.

## Actores

| Rol | Quién es | Qué hace en la app |
|---|---|---|
| Cliente | Persona que visita el local | Se registra, muestra su QR, acumula visitas y canjea premios |
| Personal (mesero o anfitrión) | Trabajador de sala | Escanea el QR para sumar la visita o entregar un premio |
| Administrador (dueño o encargado) | Administración del local | Gestiona menú, premios, promociones, clientes y personal, y revisa indicadores |

## Requisitos funcionales

| ID | Requisito | Rol | Estado |
|---|---|---|---|
| RF1 | Registro e inicio de sesión con correo y contraseña, o con una cuenta de Google | Cliente | Listo en el prototipo (Google de punta a punta: #50, Sprint 2) |
| RF2 | Tarjeta de socio con las visitas acumuladas y el avance hacia el próximo premio | Cliente | Listo |
| RF3 | Código QR personal que vence a los 3 minutos y sirve una sola vez | Cliente | Listo |
| RF4 | Escaneo del QR con la cámara para sumar una visita | Personal | Listo |
| RF5 | Canje de premios en dos pasos: el escaneo reserva el premio y quien lo lleva a la mesa confirma la entrega | Personal | Listo |
| RF6 | Menú del local por servicio y sección, con disponibilidad | Cliente / Administrador | Listo (43 platos reales) |
| RF7 | Crear, editar y desactivar premios y promociones | Administrador | Listo |
| RF8 | Panel con indicadores: clientes, socios activos, visitas del día y de la semana, premios más canjeados | Administrador | Listo |
| RF9 | Gestión del personal y de sus roles | Administrador (dueño) | Listo |
| RF10 | Confirmar antes de borrar, con opción de deshacer | Administrador | Pendiente (#43, Sprint 1) |
| RF11 | Mensajes de error visibles y opción de reintentar | Todos | Pendiente (#44, Sprint 1) |
| RF12 | Recuperación de contraseña por correo | Cliente | Pendiente (#57, Sprint 3) |
| RF13 | Tiempo mínimo entre dos visitas del mismo cliente | Personal | Pendiente (#56, Sprint 3) |
| RF14 | Registro de qué empleado validó cada visita, visible para el dueño | Administrador | Parcial: se guarda en la base de datos; falta la vista (#55, Sprint 3) |
| RF15 | Exportar y borrar la cuenta, y aceptar la política de privacidad | Cliente | Pendiente (#54, Sprint 3) |

## Requisitos no funcionales

| ID | Tipo | Requisito | Estado |
|---|---|---|---|
| RNF1 | Seguridad | Contraseñas guardadas con bcrypt; sesión con token JWT; permisos por rol validados en el servidor | Listo |
| RNF2 | Seguridad | Ninguna credencial en el código; configuración por variables de entorno | Listo (Sprint 0) |
| RNF3 | Seguridad | Sin endpoints que expongan el código o datos internos | Listo (Sprint 0, adelantado) |
| RNF4 | Seguridad | Límite de intentos en el login y en el escaneo; CORS solo para orígenes reales | Pendiente (#41, #42, Sprint 1) |
| RNF5 | Usabilidad | Botones táctiles de al menos 44 px en el panel de administración | Pendiente (#45, Sprint 1) |
| RNF6 | Disponibilidad | API en la nube con HTTPS y base de datos con respaldo diario, en la Unión Europea | Pendiente (#47, #48, Sprint 2) |
| RNF7 | Privacidad | Cumplimiento del RGPD: consentimiento, acceso y eliminación de datos | Pendiente (#54, Sprint 3) |
| RNF8 | Calidad | Pruebas automatizadas del backend y del frontend, y prueba de usuario con el personal | Pendiente (#58, #59) |
| RNF9 | Compatibilidad | App para Android publicada en Google Play | Pendiente (#51, #60) |
| RNF10 | Mantenibilidad | Código versionado en Git, con el menú y los premios como datos editables, no como código | Listo |

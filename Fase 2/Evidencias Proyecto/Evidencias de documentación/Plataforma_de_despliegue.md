# Plataforma de despliegue

Este documento explica dónde se va a alojar Clancy's Rewards para que funcione las 24 horas sin depender de un computador de desarrollo, qué alternativas se compararon y por qué se eligió la plataforma final. Los precios están en dólares y se revisaron el 12 de noviembre de 2026 en las páginas oficiales de cada proveedor.

## Qué necesita el sistema

| Pieza | Qué es | Qué necesita |
|---|---|---|
| API | FastAPI (Python) | Un servidor con HTTPS, siempre encendido, en Europa |
| Base de datos | MongoDB | Un servicio administrado con respaldos, en la Unión Europea |
| Imágenes | Fotos de platos y promociones | Almacenamiento que no se pierda al reiniciar el servidor |
| App móvil | React Native con Expo | Compilar para Android y iOS y publicar en las tiendas |

## Plataforma elegida

| Pieza | Servicio | Región |
|---|---|---|
| API | **Render** (Web Service) | Fráncfort, Unión Europea |
| Base de datos | **MongoDB Atlas** | Unión Europea |
| Imágenes | **Cloudflare R2** | Jurisdicción UE |
| Compilación y publicación | **Expo EAS** (Build y Submit) | Nube de Expo |

### Por qué se eligió

Se eligió esta combinación porque es la que mejor escala para el modelo de negocio. Clancy's Rewards parte con un solo local, pero está pensada para ofrecerse a más locales, así que la plataforma tiene que poder crecer sin rehacer el sistema.

- **Cada pieza crece por separado.** Si aumentan las visitas se agregan instancias de la API; si aumentan los datos se sube el plan de la base de datos; las imágenes no dependen del servidor. No hay que migrar todo a la vez.
- **El costo acompaña al negocio.** Se parte gratis en la etapa piloto y se paga más solo cuando hay más clientes. No se necesita comprar ni administrar un servidor propio.
- **MongoDB Atlas escala sin cambiar el código.** Se pasa del plan gratuito a uno con respaldos y después a un clúster dedicado desde el panel, con la misma cadena de conexión.
- **Seguridad administrada.** HTTPS automático, cifrado de los datos en tránsito y en reposo, acceso a la base de datos restringido por IP y usuario, y parches del sistema a cargo del proveedor. Una sola persona no puede mantener eso a mano en un servidor propio.
- **Datos en la Unión Europea.** La app trata datos personales de clientes en Irlanda, por lo que la API, la base de datos y las imágenes se alojan en la UE para cumplir el RGPD.
- **iOS sin Mac.** EAS compila la versión de iOS en la nube, que es la única forma de publicar en App Store sin tener un computador Apple.

## Alternativas comparadas

| Opción | Costo de entrada | A favor | En contra |
|---|---|---|---|
| **Render + MongoDB Atlas** (elegida) | 0 USD en piloto; 7 USD/mes la instancia siempre encendida | Escala por piezas, HTTPS y despliegue automático desde GitHub, región UE | El plan gratuito se duerme tras 15 minutos sin uso |
| Railway | 5 USD/mes (incluye 5 USD de uso) | Muy simple de configurar | Cobro por uso menos predecible; no tiene plan gratuito permanente |
| Fly.io | Desde 2,19 USD/mes (256 MB) | Barato, varias regiones | Sin plan gratuito; más configuración manual |
| Servidor propio (VPS Hetzner) | Desde 6,49 EUR/mes | Control total, precio fijo | Hay que administrar seguridad, respaldos y actualizaciones a mano; escalar exige migrar |
| Computador del desarrollador | 0 | Sirve para desarrollar | No está disponible 24 horas ni es seguro para datos reales |

## Costos por etapa

| Etapa | API (Render) | Base de datos (Atlas) | Imágenes (R2) | Total mensual aproximado |
|---|---|---|---|---|
| 1. Piloto y evaluación | Gratis (512 MB, se duerme tras 15 min sin uso) | M0 gratis (512 MB, sin respaldos) | Gratis hasta 10 GB | 0 USD |
| 2. Producción, un local | Instancia de 7 USD (siempre encendida) | Flex, entre 8 y 30 USD (5 GB, con respaldos) | Gratis hasta 10 GB | 15 a 37 USD |
| 3. Varios locales | Instancias de 25 USD (1 CPU, 2 GB), varias en paralelo | M10 dedicado, desde unos 57 USD | Según uso, sin cobro por descarga | Desde unos 82 USD |

Costos fijos de publicación, aparte del alojamiento: Google Play 25 USD una sola vez y Apple Developer Program 99 USD al año. Expo EAS incluye 15 compilaciones de Android y 15 de iOS al mes en su plan gratuito.

## Estado y trabajo pendiente

A la fecha de este documento la plataforma está elegida y el despliegue está planificado para el Sprint 2. Todavía no hay un entorno de producción en línea.

Antes de pasar a la etapa 2 hay que resolver tres puntos, que ya están en el backlog:

1. **Imágenes en R2.** Hoy se guardan en una carpeta del servidor, y en Render esa carpeta se borra en cada despliegue (issue #49).
2. **Respaldos.** El plan gratuito de Atlas no hace respaldos, así que con datos reales de clientes se debe usar al menos el plan Flex.
3. **Límite de intentos compartido.** Hoy el contador vive en la memoria de un solo proceso. Para correr varias instancias de la API en paralelo hay que moverlo a un almacén compartido, como Redis o la misma base de datos.

## Fuentes

- Render: https://render.com/pricing
- MongoDB Atlas: https://www.mongodb.com/pricing
- Cloudflare R2: https://developers.cloudflare.com/r2/pricing/
- Expo EAS: https://expo.dev/pricing
- Railway: https://railway.com/pricing
- Fly.io: https://fly.io/docs/about/pricing/
- Hetzner: https://www.hetzner.com/cloud

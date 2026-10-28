# Metodología y backlog

## Por qué Scrum

- Cada dos semanas hay una versión que funciona y se puede mostrar en un teléfono.
- En cada revisión recibo retroalimentación de la docente y del local, y la uso en el sprint siguiente.
- Si algo cambia, se ajusta el próximo sprint sin rehacer todo el plan.

El proyecto es individual, así que asumo los roles de Product Owner, Scrum Master y desarrollador. La administración del local participa como referente del negocio.

## Cómo se aplica en el repositorio

- **Backlog:** cada tarea es un issue y cada sprint es un milestone. Ver la pestaña [Milestones](https://github.com/44ndy/clancys-rewards/milestones).
- **Historias de usuario:** las tareas de la app usan el formato HU con criterios de aceptación y una estimación en puntos (13 puntos por sprint).
- **Etiquetas:** seguridad, nube, privacidad, pruebas, UX, gestión e hito.
- **Avance:** una tarea se cierra cuando está en el repositorio, probada en un teléfono y documentada. Cada cambio queda en el historial de commits.
- **Ceremonias:** planificación al abrir el sprint, revisión con demo al cerrarlo y retrospectiva registrada en la bitácora de la asignatura.

## Sprints y por qué van en este orden

La regla es simple: primero lo que impide publicar, después lo que afecta al usuario y al final lo visual.

| Sprint | Fechas | Meta | Por qué va aquí | Estado |
|---|---|---|---|---|
| Sprint 0 | 19 – 23 oct | Configuración | Sin control de versiones ni credenciales seguras no se puede trabajar en orden | Completado (falta la autorización escrita de marca) |
| Sprint 1 | 26 oct – 6 nov | Seguro y confiable | Con vulnerabilidades abiertas la app no se puede publicar | En curso |
| Sprint 2 | 9 – 20 nov | En la nube | Google Play exige 14 días de prueba cerrada antes de publicar, así que debe empezar a tiempo | No iniciado |
| Sprint 3 | 23 nov – 4 dic | Privacidad y pruebas | El RGPD y las pruebas son requisito antes de abrir la app al público | No iniciado |
| Cierre | 7 – 11 dic | Producción y entrega | Prueba con el personal del local, publicación e informe final | No iniciado |

## Ajustes hechos en la Fase 2

1. La planificación se presenta por metas de sprint y con la razón de su orden, según la retroalimentación de la Fase 1.
2. La eliminación del endpoint que exponía el código pasó del Sprint 1 al Sprint 0, porque el repositorio se hizo público.
3. La rotación de claves pasó al Sprint 2, cuando se cree el ambiente de producción.
4. Se usa la bitácora entregada por la asignatura en lugar de un formato propio.
5. Desde el Sprint 1, cada historia se desarrolla en su propia rama y se integra al terminar.

La Carta Gantt completa está en `Fase 1/Evidencias Grupales/` y se abre en onlinegantt.com.

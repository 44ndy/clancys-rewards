# Clancy's Rewards

Aplicación móvil de fidelización de clientes para Clancy's Cork. El cliente acumula visitas mostrando un código QR que el personal escanea, y canjea recompensas al llegar a la meta. La administración gestiona menú, recompensas y promociones desde la misma app.

Proyecto Capstone, Ingeniería en Informática, Duoc UC San Bernardo. Autor: Andy Aravena Auquilen.

## Stack

- App: React Native con Expo
- API: Python con FastAPI
- Base de datos: MongoDB

## Planificación

El trabajo se organiza con Scrum en sprints de dos semanas. Cada sprint es un milestone y cada tarea un issue.

| Sprint | Fechas (2026) | Meta |
|---|---|---|
| Sprint 0 | 19 – 23 oct | Configuración del proyecto |
| Sprint 1 | 26 oct – 6 nov | Seguro y confiable |
| Sprint 2 | 9 – 20 nov | En la nube |
| Sprint 3 | 23 nov – 4 dic | Privacidad y control |
| Cierre | 7 – 11 dic | Producción y entrega |

## Estructura del repositorio

```
clancys-rewards/
├── frontend/                 App móvil (React Native + Expo)
├── backend/                  API (FastAPI) y datos del menú
└── docs/
    ├── fase-1/               Entregables de la Fase 1
    ├── capturas/             Capturas de pantalla de la app
    └── material-curso/       Material entregado por la asignatura
```

### Entregables de la Fase 1

| Archivo | Descripción |
|---|---|
| `1.1_Autoevaluacion_Competencias.docx` | Autoevaluación de las competencias del perfil de egreso |
| `1.2_Diario_Reflexion.docx` | Diario de reflexión de la Fase 1 |
| `1.5_Definicion_Proyecto_APT.docx` | Guía de definición del proyecto: fundamentación, objetivos, metodología, evidencias y plan de trabajo |
| `Carta_Gantt.gantt` | Carta Gantt del proyecto (se abre en onlinegantt.com con "Open .gantt file") |
| `Presentacion_Fase1.pptx` | Presentación de la Fase 1 |

## Metodología

Se usa Scrum porque permite entregar avances funcionales cada dos semanas, recibir retroalimentación del docente y del local, y ajustar las prioridades en el siguiente sprint. El backlog se prioriza dejando primero lo que impide publicar la app (seguridad y despliegue), después lo que afecta al usuario y al final lo visual.

Las tareas de cada sprint están registradas como issues en este repositorio.

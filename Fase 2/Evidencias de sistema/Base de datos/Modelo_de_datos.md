# Modelo de datos

Base de datos: MongoDB (documental). La API accede con el driver asíncrono Motor. El modelo tiene 12 colecciones. Los identificadores son cadenas con prefijo (`usr_`, `mem_`, `qr_`, `vst_`, `red_`, etc.) para que sean legibles en los registros.

```mermaid
erDiagram
    users ||--|| memberships : "tiene"
    users ||--o{ qr_tokens : "genera"
    users ||--o{ visit_log : "acumula"
    users ||--o{ redemptions : "canjea"
    rewards ||--o{ redemptions : "se canjea en"
    users ||--o{ user_sessions : "inicia"
    users ||--o{ push_tokens : "registra"
    users ||--o{ activity_log : "realiza"
    restaurant ||--o{ menu_items : "ofrece"
    restaurant ||--o{ promotions : "publica"

    users {
        string user_id PK
        string email UK
        string name
        string password_hash
        string role "customer | waiter | host | manager | owner"
        bool active
        string auth_provider "email | google"
        date created_at
    }
    memberships {
        string membership_id PK
        string user_id FK
        int visits "saldo canjeable"
        int lifetime_visits "histórico"
        date joined_at
    }
    qr_tokens {
        string token UK
        string user_id FK
        string purpose "visit | redeem"
        string reward_id FK
        date expires_at "TTL 180 s"
        bool used
        string scanned_by FK
    }
    visit_log {
        string visit_id PK
        string user_id FK
        string staff_id FK
        date created_at
    }
    redemptions {
        string redemption_id PK
        string user_id FK
        string reward_id FK
        int visits_spent
        string staff_id FK
        string status "pending | delivered"
        date redeemed_at
        date delivered_at
        string delivered_by FK
    }
    rewards {
        string reward_id PK
        string name
        int visits_required
        string reward_type
        int expires_days
        bool active
    }
    menu_items {
        string item_id PK
        string category "servicio"
        string course "sección"
        string name
        float price
        bool available
        int order
    }
```

## Colecciones

| Colección | Qué guarda | Índices |
|---|---|---|
| `users` | Cuentas de clientes y personal, con su rol | `email` único, `user_id` único |
| `memberships` | Visitas acumuladas de cada cliente | `user_id` único |
| `qr_tokens` | Códigos QR generados, su propósito y si ya se usaron | `token` único, `expires_at` TTL (se borran solos al vencer) |
| `visit_log` | Cada visita sumada y quién la validó | — |
| `redemptions` | Canjes de premios y su entrega en dos pasos | — |
| `rewards` | Premios configurables por el local | `visits_required` |
| `promotions` | Promociones y eventos | — |
| `menu_items` | Menú real del local (43 platos) | compuesto `category` + `order` |
| `restaurant` | Datos del local | — |
| `user_sessions` | Sesiones con token opaco, heredadas de la primera versión; hoy el login usa JWT y esta colección queda pendiente de revisión | `session_token` único, `expires_at` TTL |
| `push_tokens` | Dispositivos registrados para notificaciones | — |
| `activity_log` | Registro de acciones del personal y la administración | `created_at` descendente |

## Decisiones de diseño

- **Saldo e histórico separados.** `visits` baja al canjear un premio; `lifetime_visits` nunca baja. Así el local puede ver la fidelidad real de un cliente aunque canjee.
- **Vencimiento en la base de datos.** Los QR y las sesiones usan índices TTL: MongoDB los elimina solo, sin tareas programadas.
- **Trazabilidad.** Cada visita y cada canje guardan el `staff_id` de quien lo validó, lo que permite auditar al personal.
- **Contenido como datos.** El menú, los premios y las promociones son documentos editables desde el panel, no código. El menú inicial se carga desde `backend/data/menu.clancys-cork.json`.
- **Escalable a más locales.** El modelo parte con un local; agregar un campo de local a las colecciones de contenido y visitas permite crecer a otros bares sin cambiar la estructura general.

El esquema sale directamente del código en `backend/server.py` (función `startup` para los índices).

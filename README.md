# Glam Studio — catálogo PostgreSQL + administración por dispositivo

Catálogo Vite con API Express, PostgreSQL administrado en Supabase y panel privado sin usuario/contraseña. Los productos, categorías, imágenes, estados y precios se leen y editan en PostgreSQL; `localStorage` no participa en el CRUD nuevo.

## Estado de la migración

- 5 categorías.
- 72 marcas canónicas. Se consolidan `Huxiabeauty/HuxiaBeauty`, `MyK/MYK`, `Ani-K/ANI-K` y `Enchante/Enchanté` mediante alias normalizados.
- 197 productos activos.
- 197 imágenes principales HTTPS.
- 197 precios vigentes con historial temporal.
- Carrito, búsqueda, checkout y envío a WhatsApp conservados.
- Bajas de productos/categorías lógicas y reversibles.
- Panel administrador protegido por dispositivos, cookie `HttpOnly`, CSRF y rol `ADMIN` validado por el backend.

## Arquitectura

```text
Vite SPA
  ├─ GET /api/catalog/*             catálogo público
  └─ /api/admin/*                   cookie HttpOnly + rol ADMIN + CSRF
                │
             Express + pg
                │
       PostgreSQL / Supabase
          ├─ catálogo normalizado
          ├─ historial de precios
          └─ dispositivos, invitaciones y sesiones
```

El frontend nunca recibe `DATABASE_URL`, contraseñas ni hashes de sesión. La conexión PostgreSQL vive exclusivamente en el servidor.

## Desarrollo local

Requisitos: Node.js 20 o superior y PostgreSQL 15 o superior. El repositorio incluye PostgreSQL local opcional con Docker.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run catalog:seed
npm run admin:create-invite -- --name "Computador principal"
npm run dev
```

- Vite: `http://localhost:5173`
- API Express: `http://localhost:3001`
- `npm run dev` inicia ambos procesos y Vite reenvía `/api` al backend.

La semilla valida los datos antes de escribir. Debe informar exactamente 5 categorías, 72 marcas, 197 productos, 197 imágenes y 197 precios; también informa huérfanos, duplicados y precios inválidos.

## Supabase

1. Crea un proyecto vacío en Supabase.
2. En **Connect**, copia una conexión PostgreSQL.
3. Configura `.env` sin subirlo a Git:

```env
NODE_ENV=production
PORT=3001
APP_ORIGIN=https://tu-dominio.example
DATABASE_URL=postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
DATABASE_POOL_MAX=10
ADMIN_SESSION_DAYS=30
ACTIVATION_TOKEN_MINUTES=10
CSRF_SECRET=un-secreto-aleatorio-de-32-o-mas-caracteres
```

Usa **Session pooler, puerto 5432**, y `DATABASE_POOL_MAX=10` para un contenedor/servidor Node persistente. En Vercel usa **Transaction pooler, puerto 6543**, y `DATABASE_POOL_MAX=2`. Consulta la [documentación oficial de conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

4. Aplica el esquema y la carga:

```powershell
npm run db:migrate
npm run catalog:seed
```

`catalog:seed` es idempotente y conserva precios modificados por el administrador. Solo `npm run catalog:seed -- --force-prices` vuelve a imponer los precios del archivo fuente y crea entradas nuevas en el historial.

El esquema habilita RLS sin políticas directas para las tablas. El navegador no usa Supabase Data API: el backend debe conectarse con el rol PostgreSQL propietario/administrativo de la cadena **Connect**, nunca con una clave `anon` expuesta.

## Autorización de dispositivos

Genera el primer enlace desde un entorno que tenga `DATABASE_URL` y el `APP_ORIGIN` definitivos:

```powershell
npm run admin:create-invite -- --name "Computador principal"
```

Para crear el enlace del despliegue de Vercel sin modificar el `.env` local:

```powershell
npm run admin:create-invite -- --name "Mateo - computador principal" --origin "https://tu-proyecto.vercel.app"
```

El enlace:

- vence según `ACTIVATION_TOKEN_MINUTES`;
- se usa una sola vez;
- guarda únicamente SHA-256 del token en PostgreSQL;
- crea un dispositivo y una sesión independiente;
- entrega una cookie `HttpOnly`, `Secure` en producción y `SameSite=Strict`;
- no aparece en la navegación pública.

Después de activar el primer dispositivo, el panel permite crear enlaces adicionales y revocar dispositivos individualmente. Cerrar sesión revoca la sesión actual. Revocar un dispositivo revoca todas sus sesiones. Las mutaciones exigen rol `ADMIN` y encabezado CSRF válido.

## API

Pública:

- `GET /api/catalog/categories`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:id`

Sesión:

- `GET /api/auth/session`
- `POST /api/auth/activate`
- `POST /api/auth/logout`

Administrador:

- `GET /api/admin/devices`
- `POST /api/admin/activation-tokens`
- `DELETE /api/admin/devices/:id`
- `GET /api/admin/catalog/products`
- `GET /api/admin/catalog/categories`
- `PATCH /api/admin/catalog/prices`
- `POST /api/admin/catalog/prices/reset`
- `POST /api/admin/catalog/products`
- `PATCH /api/admin/catalog/products/:id`
- `DELETE /api/admin/catalog/products/:id`
- `POST /api/admin/catalog/products/:id/restore`
- `POST /api/admin/catalog/categories`
- `PATCH /api/admin/catalog/categories/:id`
- `DELETE /api/admin/catalog/categories/:id`

Los UUID, precios, longitudes, slugs y URL HTTPS se validan en el backend. La restricción parcial garantiza un solo precio vigente y una sola imagen principal por producto.

## Datos antiguos de `localStorage`

No se borran automáticamente.

1. Abre el panel desde un navegador que contenga datos antiguos.
2. Pulsa **Respaldar datos locales**. El botón solo aparece si detecta alguna clave legada.
3. Conserva el JSON descargado.
4. Importa de forma explícita:

```powershell
npm run catalog:import-legacy -- --file "C:\ruta\glam-studio-respaldo-local-AAAA-MM-DD.json"
```

El importador valida categorías, imágenes y precios, reporta coincidencias ambiguas y aplica bajas lógicas. No elimina el archivo ni el contenido original del navegador.

## Pruebas

```powershell
npm test
npm run build
```

Las pruebas rápidas cubren conteos/duplicados/huérfanos, alias, validación, tokens, rol, CSRF y la frontera HTTP sin credenciales. Para ejecutar migración, semilla, activación, revocación y CRUD contra una base exclusiva de pruebas:

```powershell
$env:TEST_DATABASE_URL="postgresql://usuario:clave@host:5432/base_exclusiva_pruebas"
npm test
```

No apuntes `TEST_DATABASE_URL` a producción.

## Despliegue

### Vercel

El archivo raíz `app.js` exporta Express como una única Vercel Function, `vercel.json` fija la detección del framework y Vite construye los archivos estáticos en `public/`, que Vercel sirve por CDN.

En **Project → Settings → Environment Variables**, configura para Production:

```env
NODE_ENV=production
APP_ORIGIN=https://tu-dominio-estable.vercel.app
DATABASE_URL=postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres
DATABASE_SSL=true
DATABASE_POOL_MAX=2
ADMIN_SESSION_DAYS=30
ACTIVATION_TOKEN_MINUTES=10
CSRF_SECRET=un-secreto-aleatorio-y-estable-de-32-o-mas-caracteres
```

No cambies `CSRF_SECRET` entre despliegues: hacerlo invalida las comprobaciones CSRF de las sesiones abiertas. Usa el dominio de producción estable en `APP_ORIGIN`, no una URL temporal de Preview. Después de cambiar variables, redespliega y comprueba que `https://tu-dominio/api/health` responda `{"ok":true}`.

Cada navegador o dispositivo administrador necesita su propio enlace de un solo uso. El primer enlace se genera por CLI con `--origin`; desde el panel ya activado puedes crear los siguientes y revocar cada acceso por separado.

### Contenedor Node persistente

El objetivo preparado es un servicio Node persistente en contenedor y Supabase PostgreSQL. En la plataforma de hosting:

1. configura las variables del bloque `.env` como secretos;
2. ejecuta `npm run build` durante la compilación;
3. inicia con `npm start`;
4. expón el puerto definido por `PORT`;
5. verifica `GET /api/health`;
6. establece `APP_ORIGIN` exactamente al dominio HTTPS público.

También puedes construir la imagen genérica:

```powershell
docker build -t glam-studio .
docker run --rm -p 3001:3001 --env-file .env glam-studio
```

La referencia oficial es [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

## Rollback seguro

Antes de aplicar en producción:

1. toma un backup/snapshot de PostgreSQL;
2. conserva el despliegue o commit anterior;
3. ejecuta primero `db:migrate` y luego `catalog:seed`;
4. valida `/api/health`, conteos públicos y un dispositivo administrador de prueba.

Para volver atrás, redespliega la versión anterior. Las tablas nuevas pueden quedar intactas mientras investigas; no ejecutes `DROP` ni borres `localStorage`. Si necesitas revertir datos, restaura el snapshot en una base nueva y cambia `DATABASE_URL` después de validarla. Esta estrategia evita destruir la base actual durante el rollback.

## Estructura relevante

- `server/db/schema.sql`: esquema y vista pública.
- `server/scripts/seedCatalog.js`: semilla idempotente y reporte de calidad.
- `server/services/`: sesiones/dispositivos y transacciones de catálogo.
- `server/routes/`: API pública y privada.
- `shared/catalogNormalization.js`: canonización y auditoría del catálogo fuente.
- `src/features/admin.js`: panel API-first, sin persistencia CRUD local.
- `src/features/legacyBackup.js`: respaldo no destructivo.
- `test/`: pruebas unitarias, HTTP e integración PostgreSQL opcional.

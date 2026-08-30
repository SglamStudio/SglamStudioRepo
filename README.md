# Glam Studio — Catálogo Vite

Catálogo de maquillaje organizado con Vite, componentes JavaScript y módulos por responsabilidad.

## Ejecutar el catálogo y el backend

```bash
npm install
npm run db:migrate
npm run dev
```

Antes de migrar, copia `.env.example` como `.env` y levanta PostgreSQL con `docker compose up -d postgres`.

Para autorizar el primer dispositivo, genera un enlace de un solo uso desde la terminal:

```bash
npm run admin:create-invite -- --name "Computador principal"
```

Abre el enlace que imprime el comando. Desde el panel autorizado puedes crear enlaces adicionales para otros dispositivos. Cada dispositivo tiene una sesión independiente y puede revocarse sin afectar a los demás.

No hay una pantalla de usuario y contraseña: un visitante normal nunca recibe el menú administrativo. El botón **Administrar** solo se crea cuando el backend confirma una sesión de dispositivo con rol `ADMIN`. Los enlaces son de un solo uso y caducan; trátalos como credenciales y no los publiques.

## Compilar

```bash
npm run build
npm run preview
```

## Estructura

- `src/components/`: componentes visuales.
- `src/data/`: 197 productos y categorías.
- `src/features/`: carrito, búsqueda, imágenes y administración.
- `src/services/`: persistencia en localStorage.
- `src/styles/`: estilos separados por área funcional.
- `src/config/`: datos generales de la tienda.
- `server/`: API Express, sesiones, tokens de activación y PostgreSQL.

Los pedidos continúan enviándose a WhatsApp. El menú administrativo solo se monta después de confirmar una sesión ADMIN mediante el backend.

> Importante: esta primera integración protege la autorización del menú y la gestión de dispositivos. Los cambios de productos del editor legado todavía usan `localStorage`; el siguiente paso es mover el catálogo y sus operaciones CRUD a la API para sincronizar precios entre dispositivos.

# Azar Latino · Control de inversión

Dashboard web para controlar la inversión en cuentas publicitarias de Google Ads de Azar Latino, por país, tipo y cuenta. Lee los datos **en vivo** desde un archivo de Google Drive (Google Sheet nativo o `.xlsx`) y se despliega en Vercel.

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Recharts, Framer Motion, lucide-react, fuente Geist
- Lectura del archivo **desde el servidor** con una Service Account de Google (los clientes oficiales de `googleapis`: `@googleapis/drive` y `@googleapis/sheets`). Las credenciales y la columna CEDULA nunca llegan al navegador.
- Protección con contraseña (middleware + `DASHBOARD_PASSWORD`).

## Probarlo en local (sin credenciales)

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Si faltan `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`, el dashboard usa automáticamente **datos de ejemplo** (verás la etiqueta "Datos de ejemplo" en el header). Si no defines `DASHBOARD_PASSWORD`, en local no pide contraseña; en producción sí es obligatoria.

## Cómo se leen los datos

1. Con la Drive API se consulta el `mimeType` del archivo `SHEET_ID`.
   - **Google Sheet nativo** → Sheets API (`values.batchGet`, valores sin formato).
   - **.xlsx** → se descarga con la Drive API y se parsea con SheetJS.
   Ambos caminos devuelven la misma tabla y pasan por el mismo normalizador (`lib/parse.ts`).
2. Se detectan las pestañas de datos crudos: las que tienen en la fila 1 los encabezados `Fecha, País, Tipo, Cuenta, ID de la cuenta, CEDULA, FACTURA, Importe UYU, Importe USD`. Las de resumen (`Mes / Pais / Etiqueta`) y cualquier otra se ignoran; todos los totales se calculan desde los datos crudos.
   - El archivo actual tiene **varias** pestañas con ese formato (CAM OVERVIEW, PYARG, Agosto, GUATEMALA…), y algunas repiten filas (p. ej. "Agosto" duplica parte de "PYARG"). Se combinan todas y se **deduplican por factura + fecha + importe**. El pie del dashboard muestra qué pestañas se leyeron y cuántos duplicados se omitieron.
3. Se leen todas las filas aunque estén ocultas o filtradas; se ignoran filas vacías y filas con "TOTAL".
4. Importes: se quitan `$U`, `$` y comas. Fechas `dd/mm/yyyy` o seriales de Excel, sin desfase horario ("hoy" se calcula en `America/Costa_Rica`). El ID de la cuenta siempre se trata como texto.
5. La API cachea los datos 60 s; el navegador refresca cada 60 s y el botón **Actualizar ahora** fuerza una lectura nueva.

## Configurar Google Cloud (Service Account)

1. Entra a https://console.cloud.google.com/ y crea un proyecto (o usa uno existente).
2. **Habilita las APIs**: menú *APIs y servicios → Biblioteca* y habilita:
   - **Google Drive API**
   - **Google Sheets API**
3. **Crea la Service Account**: *IAM y administración → Cuentas de servicio → Crear cuenta de servicio*. Ponle un nombre (ej. `azar-dashboard`). No necesita roles del proyecto; haz clic en *Listo*.
4. **Crea la clave**: abre la cuenta de servicio → pestaña *Claves* → *Agregar clave → Crear clave nueva → JSON*. Se descarga un archivo `.json`. De ese archivo necesitas:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
5. **Comparte el archivo**: abre el archivo en Google Drive → *Compartir* → pega el `client_email` de la Service Account → rol **Lector** → *Enviar* (puedes desmarcar "Notificar").
   - Si el archivo está en una unidad compartida, agrega la Service Account como miembro con rol Lector.

> Si el dashboard muestra "No se pudo acceder a la hoja de cálculo", casi siempre es porque falta este paso de compartir, o porque `SHEET_ID` no es correcto.

El `SHEET_ID` es la parte de la URL entre `/d/` y `/edit`. Para el archivo actual:
`https://docs.google.com/spreadsheets/d/`**`1zsXZiFDlRfBjsJ9TQy3boqJUpBntjI0j`**`/edit` → `SHEET_ID=1zsXZiFDlRfBjsJ9TQy3boqJUpBntjI0j` (es el valor por defecto).

## Variables de entorno

Copia `.env.example` a `.env.local` para probar en local con datos reales:

| Variable | Descripción |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` del JSON de la Service Account |
| `GOOGLE_PRIVATE_KEY` | `private_key` del JSON, completa, incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`. Puede pegarse con `\n` literales. |
| `SHEET_ID` | ID del archivo en Drive (Sheet o .xlsx). Por defecto `1zsXZiFDlRfBjsJ9TQy3boqJUpBntjI0j` |
| `DASHBOARD_PASSWORD` | Contraseña para entrar al dashboard |

## Desplegar en Vercel

**Opción A — desde GitHub (recomendada)**

1. En https://vercel.com/new importa este repositorio. Vercel detecta Next.js automáticamente (no hay que cambiar comandos).
2. Antes de desplegar, en *Environment Variables* agrega las 4 variables de la tabla (para *Production*, y si quieres también *Preview*).
   - En `GOOGLE_PRIVATE_KEY` pega el valor de `private_key` tal cual viene en el JSON (con los `\n`), sin las comillas exteriores.
3. Clic en **Deploy**.
4. Si cambias variables después: *Settings → Environment Variables* y luego *Deployments → … → Redeploy*.

**Opción B — con Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel link
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_PRIVATE_KEY production
vercel env add SHEET_ID production
vercel env add DASHBOARD_PASSWORD production
vercel --prod
```

## Uso

- **Filtros** (barra superior, se guardan en la URL para compartir vistas): rango de fechas con presets, países (multiselección con banderas), tipo, cuenta (con búsqueda), moneda USD/UYU y agrupación Día/Semana/Mes. Los filtros activos aparecen como chips removibles; "Limpiar filtros" los quita todos.
- Clic en una mini-tarjeta de país o en una cuenta del ranking para filtrar por ella.
- Las variaciones % comparan con el período anterior equivalente (mismo largo, inmediatamente antes; "Este mes" se compara con el mes anterior hasta el mismo día).
- **Exportar CSV** descarga los movimientos filtrados (con importes en UYU y USD).
- Botón de luna/sol para modo oscuro.

## Estructura

```
app/
  page.tsx               Dashboard (cliente)
  login/page.tsx         Pantalla de login
  api/data/route.ts      Datos normalizados (sin CEDULA)
  api/login, api/logout  Sesión
middleware.ts            Protección con contraseña
lib/
  data-source.ts         Detección de formato (Sheet / xlsx), lectura y caché
  parse.ts               Detección de pestañas y normalización
  aggregations.ts        Totales, series, rankings, filtros
  countries.ts           Mapa de países, etiquetas, banderas y colores
  dates.ts, format.ts, filters.ts, mock.ts, auth.ts
components/              Una pieza por tarjeta (KpiCards, InvestmentFlow, …)
```

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run typecheck  # verificación de tipos
```

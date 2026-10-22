# Azar Latino · Control de inversión

Dashboard web para controlar la inversión en cuentas publicitarias de Meta Ads de Azar Latino, **en Centroamérica**, por país, tipo y cuenta. Lee los datos **en vivo** desde un archivo de Google Drive (Google Sheet nativo o `.xlsx`) y se despliega en Vercel.

> Los datos son de cuentas de **Meta Ads**; el archivo se lee desde Google Drive con una Service Account de Google, por eso se usan las APIs de Google.

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- Recharts, Framer Motion, lucide-react, fuente Geist
- Lectura del archivo **desde el servidor** con una Service Account de Google (los clientes oficiales de `googleapis`: `@googleapis/drive` y `@googleapis/sheets`). Las credenciales y la columna CEDULA nunca llegan al navegador.
- Protección con contraseña (middleware + `DASHBOARD_PASSWORD`).

## Probarlo en local (sin credenciales)

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El dashboard trae una **base de fondeos real** (`data/fondeos-base.json`: histórico de julio a octubre más los fondeos de la semana del 12 al 16 de octubre, sin CEDULA y solo Centroamérica), así que muestra datos reales aunque todavía no estén configuradas las credenciales de Google. Cuando se configuran `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`, lo leído en vivo desde Drive se combina con esa base (las filas repetidas se descartan). Si no defines `DASHBOARD_PASSWORD`, en local no pide contraseña; en producción sí es obligatoria.

### Vista inicial

Al entrar se muestra **la semana en curso** (lunes a hoy, hora de Costa Rica), con una franja de **Hoy · Ayer · Esta semana · Mes en curso**. Cada tarjeta se puede tocar para cambiar el rango de todo el dashboard; el resto de fechas (semana pasada, mes pasado, todo el historial, personalizado) sigue disponible en el selector de fechas.

### Correcciones automáticas

Al leer los fondeos se corrigen errores de carga evidentes, y quedan registrados solo en los logs del servidor (no se muestran en el dashboard):
- ID de la cuenta pegado en la columna Cuenta → se mueve a su columna y se usa la cuenta dueña de ese ID.
- Una cuenta con un ID distinto al habitual en un único caso (ID copiado de la fila de al lado) → se usa su ID habitual. Si el caso se repite varias veces no se corrige, porque puede ser real.
- Se ignoran filas incompletas (sin fecha, país o importe) y filas de total.

## Cómo se leen los datos

1. Con la Drive API se consulta el `mimeType` del archivo `SHEET_ID`.
   - **Google Sheet nativo** → Sheets API (`values.batchGet`, valores sin formato).
   - **.xlsx** → se descarga con la Drive API y se parsea con SheetJS.
   Ambos caminos devuelven la misma tabla y pasan por el mismo normalizador (`lib/parse.ts`).
2. Se detectan las pestañas de datos crudos: las que tienen en la fila 1 los encabezados `Fecha, País, Tipo, Cuenta, ID de la cuenta, CEDULA, FACTURA, Importe UYU, Importe USD`. Las de resumen (`Mes / Pais / Etiqueta`) y cualquier otra se ignoran; todos los totales se calculan desde los datos crudos.
   - El archivo actual tiene **varias** pestañas con ese formato (CAM OVERVIEW, PYARG, Agosto, GUATEMALA…), y algunas repiten filas (p. ej. "Agosto" duplica parte de "PYARG"). Se combinan todas y se **deduplican por factura + fecha + importe**. El pie del dashboard muestra qué pestañas se leyeron y cuántos duplicados se omitieron.
3. Se leen todas las filas aunque estén ocultas o filtradas; se ignoran filas vacías y filas con "TOTAL".
4. Importes: se quitan `$U`, `$` y comas. Fechas `dd/mm/yyyy` o seriales de Excel, sin desfase horario ("hoy" se calcula en `America/Costa_Rica`). El ID de la cuenta siempre se trata como texto.
5. **Solo Centroamérica**: se muestran Costa Rica, Guatemala, Honduras, El Salvador, Nicaragua, Panamá, Belice y **CAM** (campañas regionales repartidas entre varios países de Centroamérica, que se muestran como una categoría propia). Las filas de otros países (Paraguay, Argentina, etc.) se excluyen en el servidor y nunca llegan al navegador. La lista está en `lib/countries.ts`.
6. **Moneda**: por defecto todo se muestra en pesos uruguayos (UYU). El switch "Pesos $U / Dólares US$" cambia todos los montos y gráficos a dólares (columna Importe USD).
7. La API cachea los datos 60 s; el navegador refresca cada 60 s y el botón **Actualizar ahora** fuerza una lectura nueva.

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

- **Filtros** (barra superior, se guardan en la URL para compartir vistas): rango de fechas con presets (por defecto **Esta semana**), países (multiselección con banderas), tipo, cuenta (con búsqueda), moneda Pesos/Dólares (por defecto pesos uruguayos) y agrupación Día/Semana/Mes. Los filtros activos aparecen como chips removibles; "Limpiar filtros" los quita todos.
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
  dates.ts, format.ts, filters.ts, auth.ts
data/
  fondeos-base.json      Base de fondeos real (sin CEDULA)
  pauta-octubre.json     Reporte de pauta de octubre
components/              Una pieza por tarjeta (KpiCards, InvestmentFlow, …)
```

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run typecheck  # verificación de tipos
```

## Pestaña "Consumo Octubre" (`/pauta`)

Réplica completa del dashboard **"Pauta Octubre Azar Latino"** (Meta Ads, 1–16 oct 2026), con sus 10 partes: resumen ejecutivo, semana 1 vs semana 2, consumo por país, por cuenta, detalle de cuentas CAM, métricas comunes, datos no comparables, tabla consolidada, auditoría y cómo actualizar.

- Datos en `data/pauta-octubre.json`: las 119 filas consolidadas, las 128 filas originales de los Excel, las notas de auditoría y el tipo de cambio. Se sirven por `/api/pauta`, protegida por la contraseña, y no se incluyen en el JavaScript público.
- Filtros: periodo, país, cuenta, tipo (CAM / individual), moneda (pesos por defecto, dólares con UYU ÷ 40.14) y métrica (consumo / impresiones).
- Mismo criterio que el original: semana 1 = 5–11 oct (7 días), semana 2 = 12–16 oct (5 días); las variaciones usan la base comparable (cuentas con consumo en ambas semanas). P345 empezó el 12 de octubre: suma en los totales y en el promedio diario de la semana 2, y además se muestra el ritmo "con P345".
- Para actualizarla con reportes nuevos, reemplaza `data/pauta-octubre.json` con la misma estructura y vuelve a desplegar.

## Pestaña "Reporte Octubre 2026" (`/analisis-semanal`)

Las pestañas del dashboard son: **Fondeos** (`/`), **Consumo Octubre** (`/pauta`) y **Reporte Octubre 2026** (`/analisis-semanal`).

Análisis semanal de Meta Ads (P282, P287 y P321 · CR, GT y HN · objetivo «Registros completados en el sitio web»), reconstruido desde la referencia aprobada `referencias/analisis-semanal-2026-10-12.html`. Tiene 7 secciones con sub-navegación: Resumen, Por país, Por cuenta, Anuncios (Top 3 / Bottom 3 y tabla completa), Creativo, Insights y Verificación.

### Cómo se cargan las semanas

- Cada semana es un archivo `data/analisis-semanal/AAAA-MM-DD.json`, con el nombre del **lunes** de la semana. El selector de semana lista todos los archivos y abre por defecto el más reciente.
- Estructura: `meta`, `anuncios` y `semanaAnterior` (el objeto `DATA` de la referencia, **sin cambios**) más `contenido`, que guarda los textos de la semana: puntos del resumen, datos, insights, hipótesis y recomendaciones. Los textos son contenido, no código.
- Dentro de `contenido`, los números van marcados para convertirse con el selector UYU/USD: `{{m:n}}` monto en UYU, `{{i:n}}` entero, `{{p:n}}` proporción (0,25 = 25 %), `{{f:n}}` frecuencia, `{{x:n}}` veces, `**texto**` negrita.
- **Comparación semanal:** si existe el archivo de la semana anterior (lunes − 7 días), se activan las variaciones % en los KPIs, por país y por cuenta. Si no existe, se muestra el aviso «sin semana anterior».
- Cada archivo se valida al leerlo (`lib/analisis-semanal/schema.ts`). Si uno está roto o incompleto, la pestaña muestra la última semana válida con un aviso que nombra el archivo y el campo con problemas; esa semana aparece desactivada en el selector.
- Los datos se sirven por `/api/analisis-semanal`, protegida por el mismo login, y no quedan en el JavaScript público.

### Agregar una semana nueva

1. Guarda la referencia aprobada en `referencias/analisis-semanal-AAAA-MM-DD.html`.
2. Genera el JSON (copia `DATA` tal cual y extrae los textos de la semana):
   ```bash
   npm run analisis:extraer -- referencias/analisis-semanal-AAAA-MM-DD.html data/analisis-semanal/AAAA-MM-DD.json
   ```
3. Revisa la pestaña en local (`npm run dev` → `/analisis-semanal`) y la sección **Verificación**: todos los controles deben decir «✓ Coincide».
4. Commit y despliegue.

### Moneda

Montos originales en UYU. El selector **Pesos $U / Dólares US$** convierte toda la página (KPIs, tablas, ranking, gráficos e insights) con la tasa editable del encabezado. Por defecto se usa `meta.tipoCambio.uyuPorUsd`, marcada como **CONFIRMAR**. La tasa elegida se recuerda por semana en el navegador, y el botón ↺ vuelve a la tasa de referencia. La sección Verificación siempre compara en UYU contra el Excel.

### Cálculos (`lib/analisis-semanal/calc.ts`)

Misma lógica que la referencia, con todas las métricas calculadas desde totales:
- costo por registro = gasto ÷ registros;
- CPM = gasto ÷ impresiones × 1.000;
- CTR (todos) ponderado por impresiones;
- Hook y Hold ponderados solo sobre piezas de video; «N/A (estático)» cuando el Hook es 0 y el Hold está vacío.

Cada anuncio se identifica por cuenta + campaña + conjunto + anuncio. Ranking: KPI costo por registro, desempate CTR, umbral gasto ≥ 1.000 UYU e impresiones ≥ 1.000.

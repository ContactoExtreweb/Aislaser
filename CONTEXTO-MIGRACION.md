# Contexto para continuar en otra conversación

> Documento de traspaso (actualizado el 10/10/2026). Léelo entero antes de tocar nada.
> **Bórralo antes de llevar nada a `main`**: el repositorio es público y esto son notas internas.
> Sustituye a la versión anterior que hay en la rama `claude/awesome-bohr-dz9gff` (misma información, más el estado comprobado hoy).

## 0. Reglas de trabajo con este usuario (obligatorias)

- **Escribir SIEMPRE en español**, también los mensajes intermedios entre herramientas. Lo ha pedido varias veces y se enfada si no se cumple.
- **Despliegue:** hacer push a `main` publica en producción. Netlify despliega solo en https://aislaser.netlify.app, y el usuario lo tiene autorizado.
  - Flujo: trabajar en la rama asignada, subirla y después subir también a `main`.
  - Subir a `main` sólo cuando el trabajo esté terminado, revisado y compilado.
- **Revisión:** antes de desplegar un trabajo grande, hacer una revisión adversarial (workflow de revisión, «ultracode»).
- **Commits:** en español y descriptivos (estilo de `git log`), sin identificadores de modelo, con las líneas de atribución que indique el sistema.
- **PR:** no crear PR salvo que lo pida el usuario. Ahora mismo no hay ninguno abierto.
- **Seguridad (lo hará el usuario, no insistir):** poner el repo en privado y cambiar la contraseña del admin de pruebas. La URL de redirección de Supabase ya está hecha.

## 1. Estado de las ramas (comprobado el 10/10/2026)

| Rama | Commit | Contenido |
| --- | --- | --- |
| `main` | `43ad337` | Producción. «Galería de obras: remates de la revisión final del panel». |
| `claude/awesome-bohr-dz9gff` | `bcc4137` | `main` + **sección 3D en curso** (commit «WIP») + la versión anterior de este documento. **El código a continuar está aquí.** |
| `claude/lucid-mayer-k6kfvi` | `main` + este documento | Sólo contiene este documento actualizado. Nada de código nuevo. |

## 2. El proyecto

**Aislaser** impermeabiliza cubiertas con poliurea y poliuretano (Campanario, Badajoz). El repositorio contiene:

1. La **web pública** rediseñada: portada, empresa, servicios, obras, contacto y páginas legales.
2. Un **panel privado** (`/panel`): informes técnicos y dosieres de obra (PDF o imágenes con membrete), mensajes de contacto, ajustes (firmante, sello y firma) y las **obras de la web**.

**Stack:**
- Next.js 16.4 (App Router, Turbopack). Usa `proxy.ts`, params asíncronos y `updateTag`/`revalidateTag(tag, profile)`.
  - **Ojo:** versión con cambios incompatibles. Consulta `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- React 19.3, Tailwind 4, TypeScript 5.9, Supabase (Auth, Postgres con RLS, Storage), TipTap 3.
- Netlify con `@netlify/plugin-nextjs` 5.16.2 (declarado en `netlify.toml`; sin él, todo da 404).

**Datos de acceso y referencias:**
- **Supabase:** proyecto `https://wbduknkauzvmgszmfbne.supabase.co`. La URL y la *publishable key* (pública por diseño) están en `netlify.toml`; cópialas a `.env.local` para trabajar en local.
- **Admin de pruebas:** `saul@prueba.es`. La contraseña la sabe el usuario; no está aquí a propósito.
- **`README.md`:** documentación completa de puesta en marcha, base de datos, despliegue, estructura y funcionamiento del panel. No repetir aquí lo que ya explica.

## 3. Hecho y desplegado (no tocar salvo que lo pidan)

- **Web pública completa.** Redirecciones 301/308 desde la web antigua (Joomla) en `next.config.ts`. Portada y cabeceras con foto completa y velo oscuro uniforme (sin degradado).
- **Panel:** informes y dosieres (editor por apartados con fotos, autoguardado, exportación PDF/PNG/imprimir, sello y firma), mensajes y ajustes.
- **Galería de obras «tipo IMTEX»**, gestionada desde `/panel/obras`:
  - Base de datos: `supabase/migrations/004_galeria_web.sql` (tablas `web_obras`, `web_fotos`, bucket `galeria`), incluida también en `schema.sql` y `pendiente.sql`.
  - Código: `src/lib/obras.ts`, `src/lib/obras-shared.ts`, `src/app/panel/obras-actions.ts`, `src/components/panel/obras/*`, `src/app/panel/(app)/obras/*`.
  - La web lee de Supabase (ISR + `updateTag`); publicar o despublicar se refleja en ~1 s.
  - Las 32 obras (123 fotos) de la web antigua ya están importadas con `scripts/importar-obras.mjs` (idempotente, opción `--completar`).
  - Probado de extremo a extremo contra Supabase real y Netlify.

## 4. TRABAJO EN CURSO: sección 3D «Así impermeabilizamos una cubierta»

### Petición literal del usuario

> «Podemos meter alguna animación vistosa, que no vaya ligada al scroll, que se ejecute sola, para que la web se vea también más animada y más viva, ya que tenemos skills para el diseño 3d, meter alguna animación que no sea algo simulado y feo, algo realista útil y que vaya con todo lo que sabes de aislaser, no reemplaces ninguna sección sino que añade una nueva sección con la animación para no quitar nada de lo que ya tenemos»

### Estado

- Funciona de principio a fin en desarrollo, con los 7 pasos. Está en `claude/awesome-bohr-dz9gff` (commit `bcc4137`). **No está en `main` ni desplegado.**
- **Comprobado hoy en esa rama:**
  - `npx next typegen && npx tsc --noEmit` → sin errores.
  - `npm run build` (con las variables de `netlify.toml`) → correcto, 61 páginas generadas, sin errores ni avisos.
  - Nota: en una copia recién clonada, `tsc` solo da «Cannot find name 'PageProps'»; es normal, hay que ejecutar antes `npx next typegen` (o `next dev`/`next build`).

**Archivos nuevos o cambiados respecto a `main`:**

| Archivo | Qué contiene |
| --- | --- |
| `package.json` | Versiones exactas: `three@0.186.0`, `@react-three/fiber@9.8.0`, `@react-three/drei@10.7.8`, `@types/three@0.186.0` (dev). |
| `src/app/(site)/page.tsx` | `<RoofSystemSection />` justo **después de `<PolyureaSection />`**. No se quitó nada. |
| `src/app/globals.css` | `@keyframes roof-step` (barra de progreso de cada paso). |
| `src/components/ui/Reveal.tsx` | `as` restringido a `"div"\|"li"\|"ul"\|"section"\|"article"\|"span"` con `const Tag = as as "div"`: fiber amplía los elementos JSX y rompía el `ElementType` polimórfico. |
| `src/components/site/home/RoofSystemSection.tsx` | Sección cliente (detalle debajo). |
| `src/components/site/home/roof3d/*` | La escena (tabla siguiente). |

**Qué hace `RoofSystemSection.tsx`:**
- Carga la escena con `next/dynamic` (`ssr:false`) sólo cuando está a 600 px de verse (IntersectionObserver).
- Deja de dibujar fuera de pantalla o con la pestaña oculta (`frameloop` → `"never"`).
- Botón de pausa (WCAG 2.2.2). Con `prefers-reduced-motion` enseña un fotograma quieto (`STILL_TIME=34`) que se puede reproducir.
- Sin WebGL muestra un mensaje. El cielo cambia con un degradado según llueva o no.
- Rótulo del paso (`aria-live`), lista de 7 pasos clicables con barra de progreso y texto `sr-only`.
- **Hook de desarrollo:** `window.__roof = {seek, play, pause}` sólo con `npm run dev` (para capturas). No existe en producción.

**Archivos de `roof3d/`:**

| Archivo | Contenido |
| --- | --- |
| `timeline.ts` | `STAGES` (7 pasos, `TOTAL=37` s, en bucle), `stageIndexAt`, `phase`, `smooth`, `window01`. |
| `shared.ts` | `ClockContext` (`{t, small}`), `LabelsContext`, `LAYER_Y` (alturas por capa en milímetros reales), `DRAIN`, `SKYLIGHT`, `PASSES` (recorridos de las máquinas), `UPTURNS` (subidas a petos), `rainAmount(t)`, `leakAmount(t)`, `worldUvBox`, `belowY`. |
| `textures.ts` | Texturas procedurales en canvas (no se descarga nada). La clase `Coverage` es una máscara que se pinta al paso de la máquina y sirve de `alphaMap`. |
| `Building.tsx` | Forjado en sección, petos con albardilla, muros, suelo, sumidero con rejilla y bajante, lucernario con cúpula. |
| `Deck.tsx` | Capas: soporte bruto, preparado, imprimación, poliurea y acabado, cada una revelada con su `Coverage` (`alphaTest 0.5`). Subidas a petos y lucernario (planos de recorte), charcos y shader del agua que corre al sumidero. |
| `Tools.tsx` | Pistola de proyección con mangueras roja y azul (`TubeGeometry` dinámico que pasa por encima del peto trasero) y spray. Granalladora amarilla con polvo que rodea el lucernario. |
| `Effects.tsx` | Lluvia instanciada con salpicaduras. Goteras interiores con charco y un cubo rojo que se llena. |
| `Sample.tsx` | Muestra final «capa a capa»: sube, se separa y lleva etiquetas HTML proyectadas cada frame (no usa drei `Html`). |
| `RoofScene.tsx` | `Canvas` con `Driver` (reloj, saltos, bucle, fundido en el empalme), `CameraRig` (encuadre calculado y `setViewOffset` del 10 % a la derecha en pantallas anchas), luces, `Environment` sólo con `Lightformer` rectangulares, `ContactShadows` y `PerformanceMonitor` (baja el dpr). |

**Los 7 pasos:**

| Paso | Clave | Tramo (s) | Lluvia |
| --- | --- | --- | --- |
| 1 | filtraciones | 0–5,5 | Sí |
| 2 | preparacion | 5,5–9,5 | |
| 3 | imprimacion | 9,5–12,5 | |
| 4 | poliurea | 12,5–22 | |
| 5 | acabado | 22–24,5 | |
| 6 | estanqueidad | 24,5–31 | Sí, el agua va al sumidero |
| 7 | capas | 31–37 | Muestra |

### Decisiones técnicas y errores ya resueltos (no repetirlos)

- **`polygonOffset`: no usarlo.** A ángulos rasantes ocultaba la rejilla y el agua. Las capas van separadas por milímetros reales; cámara con `near: 1`, `far: 80`.
- **Sombras:** `PCFSoftShadowMap` ya no existe en three r186. Se usa `shadows="percentage"`.
- **Claves de React:** las de las subidas son `up-${key}` para no duplicar las de las capas.
- **Charcos:** fases precalculadas una vez (con fase aleatoria por vértice salían con forma de estrella).
- **Mangueras:** por el suelo y por encima del peto trasero (en vertical parecían hilos de marioneta).
- **Etiquetas de la muestra:** divs propios proyectados con `camera.project`. Con drei `Html` daba «Attempted to synchronously unmount a root…» y salían desplazadas.
- **Reflejos:** se quitó el `Lightformer` en anillo (dejaba anillos blancos en la poliurea).
- **Colores de imprimación:** `#9b9890` en la cubierta y `#a8916c` en la muestra (antes parecía arena o madera).
- **Borde de la preparación:** `spatter=0` (si no, parecía puntilla).
- **Granalladora:** rodea el lucernario (antes lo atravesaba).
- **Procesos en el contenedor:** no usar `pkill`/`pgrep` con patrones que coincidan con el propio comando de bash (sale con código 144). Usar `ps -eo pid,ppid,args` con `awk`.

### Pendiente, en este orden

1. **Revisar capturas** (se hicieron pero no se llegaron a mirar). Repetirlas en t = 7.4, 11, 27.5 y 34 y comprobar:
   - que la granalladora no pisa el lucernario;
   - que la imprimación parece hormigón con resina;
   - que el agua al sumidero es sutil y no quedan anillos blancos;
   - que las etiquetas de la muestra caben en pantalla.
2. **QA de la sección:** móvil 390×844 (encuadre, rótulo debajo, pasos desplazables), `prefers-reduced-motion`, mensaje sin WebGL, botón de pausa. Opcional: imagen fija (póster) mientras carga.
3. **Producción:** ~~`npm run build`~~ (ya pasa, ver arriba). Falta revisar la consola en producción (`npm start`, sin errores ni avisos) y el rendimiento (fps y que se pare fuera de pantalla).
4. **Revisión adversarial** con el workflow y corrección de lo que salga.
5. **Cierre:** borrar este documento (y la versión antigua de la rama WIP), commit y push a la rama y a `main`, comprobar en https://aislaser.netlify.app e informar al usuario en español.

## 5. Cómo arrancar en la nueva sesión

```bash
cd <repo>
git fetch origin claude/awesome-bohr-dz9gff
# Si la nueva sesión tiene otra rama asignada, fusionar la WIP en ella:
git merge origin/claude/awesome-bohr-dz9gff     # (o git checkout claude/awesome-bohr-dz9gff)
npm ci
# .env.local con NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y NEXT_PUBLIC_SITE_URL (valores en netlify.toml)
npx next typegen && npx tsc --noEmit
npm run dev                                     # http://localhost:3000
```

### Capturas de la animación (Playwright con el Chromium ya instalado)

Guarda este script como `at.mjs` en el scratchpad y ejecútalo con:

```bash
PWDIR=/opt/node-tools/node_modules node at.mjs <carpeta-salida> http://localhost:3000 1440 900 "7.4,11,27.5,34"
```

Para móvil usa `390 844`. Guarda una imagen por instante: `t-7_4.png`, `t-11.png`…

```js
import { createRequire } from 'module';
const require = createRequire(process.env.PWDIR + '/');
const { chromium } = require('playwright');
const OUT = process.argv[2], BASE = process.argv[3] || 'http://localhost:3000';
const W = Number(process.argv[4] || 1440), H = Number(process.argv[5] || 900);
const TIMES = (process.argv[6] || '3.8,7.2,11,16.5,21.2,23,27.5,34').split(',').map(Number);
// SwiftShader: WebGL por software en el contenedor sin GPU
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('CONSOLE', m.type(), m.text().slice(0, 200)); });
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
const sec = p.locator('section[aria-labelledby=sistema-titulo]');
await sec.scrollIntoViewIfNeeded();
await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(e => e.setAttribute('data-reveal', 'visible')));
await p.waitForSelector('section[aria-labelledby=sistema-titulo] canvas', { timeout: 60000 });
await p.waitForFunction(() => window.__roof, null, { timeout: 30000 });
await p.waitForTimeout(2500);
const card = sec.locator('div.relative.mt-12');
for (const t of TIMES) {
  await p.evaluate((t) => { window.__roof.pause(); window.__roof.seek(t - 0.6); window.__roof.play(); }, t);
  await p.waitForTimeout(1500); // deja avanzar un poco (partículas, lluvia)
  await p.evaluate(() => window.__roof.pause());
  await p.waitForTimeout(400);
  await card.screenshot({ path: `${OUT}/t-${String(t).replace('.', '_')}.png` });
  console.log('t', t, '→', await sec.locator('[aria-live=polite] p').nth(1).innerText());
}
await b.close();
```

El hook `window.__roof` sólo existe con `npm run dev`. En producción hay que capturar sin él.

## 6. Mensaje para pegar al empezar la nueva conversación

> Háblame siempre en español. Lee `CONTEXTO-MIGRACION.md` de la rama `claude/lucid-mayer-k6kfvi` (es la versión actualizada; el código está en `claude/awesome-bohr-dz9gff`). Continúa con la sección 3D desde el apartado «Pendiente». Cuando esté todo revisado, despliega en `main` (Netlify publica solo). La contraseña del admin de pruebas `saul@prueba.es` es: ______

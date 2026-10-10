# Contexto para continuar en otra conversación

> Documento de traspaso. Léelo entero antes de tocar nada. **Bórralo cuando se cierre la revisión de la sección 3D** (apartado «Pendiente»): el repositorio es público y esto son notas internas.

## 0. Reglas de trabajo con este usuario (obligatorias)

- **Escribir SIEMPRE en español**, también los mensajes intermedios entre herramientas. Lo ha pedido varias veces y se enfada si no se cumple.
- **Despliegue:** hacer push a `main` publica en producción. Netlify despliega solo en https://aislaser.netlify.app, y el usuario lo tiene autorizado.
  - Flujo: trabajar en la rama `claude/awesome-bohr-dz9gff`, subirla y después subir también a `main`.
  - Subir a `main` sólo cuando el trabajo esté terminado, revisado y compilado.
- **Revisión:** antes de desplegar un trabajo grande, hacer una revisión adversarial (workflow de revisión, «ultracode»).
- **Commits:**
  - Mensajes en español y descriptivos, siguiendo el estilo de `git log`.
  - Sin identificadores de modelo.
  - Con las líneas de atribución que indique el sistema.
- **PR:** no crear PR salvo que lo pida el usuario.
- **Seguridad (lo hará el usuario, no insistir):** poner el repo en privado y cambiar la contraseña del admin de pruebas. La URL de redirección de Supabase ya está hecha.

## 1. El proyecto

**Aislaser** impermeabiliza cubiertas con poliurea y poliuretano (Campanario, Badajoz). El repositorio contiene dos cosas:

1. La **web pública** rediseñada: portada, empresa, servicios, obras, contacto y páginas legales.
2. Un **panel privado** (`/panel`) para:
   - informes técnicos y dosieres de obra, descargables en PDF o en imágenes con membrete;
   - los mensajes de contacto;
   - los ajustes (firmante, sello y firma);
   - las **obras de la web**.

**Stack:**
- Next.js 16.4 (App Router, Turbopack). Usa `proxy.ts`, params asíncronos y `updateTag`/`revalidateTag(tag, profile)`.
  - **Ojo:** es una versión con cambios incompatibles. Consulta `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- React 19.3, Tailwind 4, TypeScript 5.9.
- Supabase (Auth, Postgres con RLS, Storage) y TipTap 3.
- Netlify con `@netlify/plugin-nextjs` 5.16.2.

**Datos de acceso y referencias:**
- **Supabase:** proyecto `https://wbduknkauzvmgszmfbne.supabase.co`. La URL y la *publishable key* (pública) están en `netlify.toml`; cópialas a `.env.local` para trabajar en local.
- **Admin de pruebas:** `saul@prueba.es`. La contraseña la sabe el usuario; no está aquí a propósito.
- **`README.md`:** documentación completa de puesta en marcha, base de datos, despliegue, estructura y funcionamiento del panel.

## 2. Hecho y desplegado (no tocar salvo que lo pidan)

- **Web pública completa.** Las redirecciones 301/308 desde la web antigua (Joomla) están en `next.config.ts`.
- **Panel:**
  - informes y dosieres (editor, exportación PDF/imágenes, sello y firma);
  - mensajes;
  - ajustes.
- **Galería de obras «tipo IMTEX»**, gestionada desde `/panel/obras`:
  - Base de datos: migración `supabase/migrations/004_galeria_web.sql`, con las tablas `web_obras` y `web_fotos` y el bucket `galeria`.
  - Lógica:
    - `src/lib/obras.ts`, `src/lib/obras-shared.ts`
    - `src/app/panel/obras-actions.ts`
    - `src/components/panel/obras/*`
    - `src/app/panel/(app)/obras/*`
  - La web pública lee de Supabase. Publicar y despublicar se refleja en aproximadamente 1 s.
  - Las 32 obras de la web antigua se importaron con `scripts/importar-obras.mjs`. El script es idempotente y tiene la opción `--completar`.
  - Probado de extremo a extremo contra Supabase real y Netlify.
- **Último commit desplegado en `main`:** `43ad337` («Galería de obras: remates de la revisión final del panel»).

## 3. TRABAJO EN CURSO: sección 3D «Así impermeabilizamos una cubierta»

### Petición literal del usuario

> «Podemos meter alguna animación vistosa, que no vaya ligada al scroll, que se ejecute sola, para que la web se vea también más animada y más viva, ya que tenemos skills para el diseño 3d, meter alguna animación que no sea algo simulado y feo, algo realista útil y que vaya con todo lo que sabes de aislaser, no reemplaces ninguna sección sino que añade una nueva sección con la animación para no quitar nada de lo que ya tenemos»

### Estado

- **Publicada en `main` y en Netlify** (el usuario pidió subirla antes de terminar la revisión adversarial).
- Hecho en la segunda sesión:
  - capturas revisadas;
  - QA en móvil, «reducir movimiento» y navegador sin WebGL;
  - pausa real: lluvia, partículas, cámara y giros congelados, con `frameloop="demand"` en pausa;
  - encuadre de la muestra en móvil;
  - fotograma representativo por paso al elegirlo en pausa (`poster` en `STAGES`);
  - mangueras apoyadas en la cubierta;
  - `npm run build` correcto y consola de producción limpia, salvo el aviso de `THREE.Clock`, que viene de fiber.
- Comprobado en producción local:
  - three.js (≈1 MB sin comprimir) solo se descarga al acercarse a la sección;
  - no dibuja fuera de pantalla ni en pausa;
  - `window.__roof` no existe en producción.

**Archivos nuevos o cambiados:**

| Archivo | Qué contiene |
| --- | --- |
| `package.json` | Dependencias nuevas con versión exacta: `three@0.186.0`, `@react-three/fiber@9.8.0`, `@react-three/drei@10.7.8` y `@types/three@0.186.0` (dev). |
| `src/app/(site)/page.tsx` | `<RoofSystemSection />` va justo **después de `<PolyureaSection />`**. No se quitó nada. |
| `src/app/globals.css` | `@keyframes roof-step`, la barra de progreso de cada paso. |
| `src/components/ui/Reveal.tsx` | `as` restringido a `"div"\|"li"\|"ul"\|"section"\|"article"\|"span"` con `const Tag = as as "div"`. Hace falta porque fiber amplía los elementos JSX y rompía el `ElementType` polimórfico. |
| `src/components/site/home/RoofSystemSection.tsx` | Sección cliente (ver detalle debajo). |
| `src/components/site/home/roof3d/*` | La escena (ver tabla siguiente). |

**Qué hace `RoofSystemSection.tsx`:**
- Carga la escena con `next/dynamic` (`ssr:false`), y sólo cuando está a 600 px de verse (IntersectionObserver).
- Deja de dibujar fuera de pantalla o con la pestaña oculta (`frameloop` pasa a `"never"`).
- Tiene botón de pausa (WCAG 2.2.2).
- Con `prefers-reduced-motion` enseña un fotograma quieto (`STILL_TIME=34`), que se puede reproducir con el botón.
- Si no hay WebGL, muestra un mensaje.
- El cielo cambia con un degradado según llueva o no.
- Tiene el rótulo del paso (`aria-live`), una lista de 7 pasos clicables con barra de progreso y un texto `sr-only`.
- **Hook de desarrollo:** en desarrollo existe `window.__roof = {seek, play, pause}`, usado para las capturas. No existe en producción.

**Archivos de `roof3d/`:**

| Archivo | Contenido |
| --- | --- |
| `timeline.ts` | `STAGES` (7 pasos, `TOTAL=37` s, en bucle), `stageIndexAt`, `phase`, `smooth` y `window01`. |
| `shared.ts` | Contextos `ClockContext` (`{t, small}`) y `LabelsContext`. Constantes `LAYER_Y` (alturas de cada capa, separadas por milímetros reales), `DRAIN`, `SKYLIGHT`, `PASSES` (recorridos de las máquinas) y `UPTURNS` (subida a petos). También `rainAmount(t)`, `leakAmount(t)`, `worldUvBox` y `belowY`. |
| `textures.ts` | Texturas procedurales en canvas (no se descarga nada). La clase `Coverage` es una máscara que se pinta al paso de la máquina y sirve de `alphaMap`. |
| `Building.tsx` | Forjado en sección, petos con albardilla, muros, suelo, sumidero con rejilla y bajante, y lucernario con cúpula. |
| `Deck.tsx` | Capas: soporte bruto, preparado, imprimación, poliurea y acabado. Cada una se revela con su `Coverage` (`alphaTest 0.5`). Incluye las subidas a petos y lucernario (planos de recorte), los charcos y el shader del agua que corre al sumidero. |
| `Tools.tsx` | Pistola de proyección con mangueras roja y azul (`TubeGeometry` dinámico que pasa por encima del peto trasero) y partículas de spray. Granalladora amarilla con polvo, que rodea el lucernario. |
| `Effects.tsx` | Lluvia instanciada con salpicaduras. Goteras interiores con charco y un cubo rojo que se llena. |
| `Sample.tsx` | Muestra final «capa a capa»: sube, se separa y lleva etiquetas HTML proyectadas cada frame (no se usa drei `Html`). |
| `RoofScene.tsx` | `Canvas` y:<ul><li>`Driver`: reloj, saltos, bucle y fundido en el empalme.</li><li>`CameraRig`: encuadre calculado y `setViewOffset` del 10 % a la derecha en pantallas anchas.</li><li>Luces y `Environment` sólo con `Lightformer` rectangulares.</li><li>`ContactShadows` y `PerformanceMonitor`, que baja el dpr.</li></ul> |

**Los 7 pasos** (segundos):

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

- **`polygonOffset`: no usarlo.** A ángulos rasantes ocultaba la rejilla y el agua. Las capas van separadas por milímetros reales y la cámara usa `near: 1`, `far: 80`.
- **Sombras:** `PCFSoftShadowMap` ya no existe en three r186. Se usa `shadows="percentage"`.
- **Claves de React:** las de las subidas son `up-${key}`, para no duplicar las de las capas.
- **Charcos:** las fases están precalculadas una vez. Con fase aleatoria por vértice salían con forma de estrella.
- **Mangueras:** van por el suelo y pasan por encima del peto trasero. En vertical parecían hilos de marioneta.
- **Etiquetas de la muestra:** se usan divs propios proyectados con `camera.project`. Con drei `Html` daba el error «Attempted to synchronously unmount a root…» y las etiquetas salían desplazadas.
- **Reflejos:** se quitó el `Lightformer` en anillo porque dejaba anillos blancos en la poliurea.
- **Colores de imprimación:** `#9b9890` en la cubierta y `#a8916c` en la muestra. Antes parecía arena o madera.
- **Borde de la preparación:** `spatter=0`; si no, parecía puntilla.
- **Granalladora:** rodea el lucernario. Antes lo atravesaba.
- **Procesos en el contenedor:** no usar `pkill`/`pgrep` con patrones que coincidan con el propio comando de bash (sale con el código 144). Usar `ps -eo pid,ppid,args` con `awk`.

### Pendiente

1. **Revisión adversarial** de la sección, con un workflow de 5 dimensiones (corrección, rendimiento, accesibilidad, integración con Next y contenido técnico), cada una verificada por un escéptico. Si la sesión se cortó antes de terminar, repetirla.
2. **Aplicar** los hallazgos confirmados.
3. **Cierre:**
   - Borrar este documento.
   - Commit y push a la rama y a `main`.
   - Comprobar en https://aislaser.netlify.app.
   - Informar al usuario en español.

## 4. Cómo arrancar en la nueva sesión

```bash
cd <repo>
git fetch origin claude/awesome-bohr-dz9gff
git checkout claude/awesome-bohr-dz9gff      # si la nueva sesión tiene otra rama asignada, fusionar esta en ella
npm install
# .env.local con NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY y NEXT_PUBLIC_SITE_URL (valores en netlify.toml)
npm run dev                                  # http://localhost:3000
npx tsc --noEmit
```

### Capturas de la animación (Playwright con Chromium ya instalado)

Guarda este script como `at.mjs` en el scratchpad. Ejecútalo con:

```bash
PWDIR=/opt/node-tools/node_modules node at.mjs <carpeta-salida> http://localhost:3000 1440 900 "7.4,11,27.5,34"
```

Para móvil, usa `390 844` como ancho y alto. Guarda una imagen por instante, `t-<instante>.png`, con el punto cambiado por guion bajo: `t-7_4.png`, `t-11.png`…

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

## 5. Mensaje para pegar al empezar la nueva conversación

> Háblame siempre en español. Lee `CONTEXTO-MIGRACION.md` y continúa con la sección 3D desde el apartado «Pendiente». Cuando esté todo revisado, despliega en `main` (Netlify publica solo). La contraseña del admin de pruebas `saul@prueba.es` es: ______

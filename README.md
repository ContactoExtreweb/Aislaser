# Aislaser · Web corporativa y panel de dosieres

Nueva web pública de **Aislaser** (impermeabilización de cubiertas técnicas con poliurea y poliuretano, Campanario · Badajoz) y **panel privado** para redactar informes técnicos y dosieres de obra y descargarlos en PDF o en imágenes con el membrete de la empresa.

- **Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · Supabase (Auth, Postgres, Storage) · TipTap 3
- **Identidad:** logotipo original vectorizado (`public/brand/`), carbón `#433F3F` + amarillo `#FFCE00`, tipografías Mulish (heredera de la "Muli" de la web anterior) y Barlow Condensed.

---

## 1. Puesta en marcha en local

```bash
npm install
cp .env.example .env.local   # y rellena las variables (ver punto 2)
npm run dev                  # http://localhost:3000
```

Sin variables de Supabase la web pública funciona igual; el formulario de contacto avisa de que no está activo y el panel ofrece un **modo demostración** en `/panel/demo` (no guarda nada).

Comandos: `npm run build` · `npm start` · `npm run typecheck`.

## 2. Base de datos (Supabase)

1. Crear un proyecto en [supabase.com](https://supabase.com) (región UE: Frankfurt / París).
2. **SQL Editor → New query** → pegar `supabase/schema.sql` **entero** → **Run**. Para no cortarlo al copiar, ábrelo en GitHub y usa el botón *Copy raw file*. Al final debe aparecer la tabla de comprobación con 8 tablas y 3 buckets; si no aparece, el script no se pegó completo. Crea:
   - `dossiers`, `dossier_points`, `dossier_images`: los dosieres, sus puntos (1, 2, 3…) y las fotos de cada punto.
   - `contact_messages`: mensajes del formulario de la web.
   - `admin_users` + función `is_admin()`: sólo los usuarios de esta tabla entran al panel.
   - `app_settings`: firmante por defecto, sello y firma.
   - Bucket de Storage `dossier-images` (fotos; lectura pública por URL, escritura sólo administradores).
   - Bucket **privado** `firmas` (sello y firma; sólo administradores, con URLs firmadas temporales).
   - `web_obras`, `web_fotos` y bucket público `galeria`: las obras que se enseñan en la web, gestionadas desde el panel.
   - Seguridad RLS en todas las tablas. El script es idempotente (se puede repetir sin perder datos).
   - Si una ejecución anterior se quedó a medias, ejecuta `supabase/pendiente.sql` (es el script completo e idempotente: crea o repara todo).
   - Migraciones sueltas: `002_informe_y_firma.sql` (formato informe, sello y firma), `003_proteger_mensajes.sql` (protección del formulario contra abusos) y `004_galeria_web.sql` (obras de la web gestionadas desde el panel).
3. **Authentication → Sign In / Providers → Email:** desactivar *Allow new users to sign up*.
4. **Authentication → Users → Add user → Create new user:** email + contraseña del cliente, marcando *Auto Confirm User*.
5. **SQL Editor:** ejecutar `supabase/add-admin.sql` cambiando el email por el del paso 4.
6. **Authentication → URL Configuration:**
   - *Site URL:* `https://www.aislaser.es`
   - *Redirect URLs:* `https://www.aislaser.es/auth/callback` y `http://localhost:3000/auth/callback`
7. **Project Settings → API Keys:** copiar la *Project URL* y la *Publishable key* (o la `anon` legacy).

### Variables de entorno

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) o anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://www.aislaser.es` |

> Son variables `NEXT_PUBLIC_*`: se incrustan al compilar. Tras cambiarlas hay que **volver a desplegar**.

## 3. Despliegue (Netlify)

El repositorio está conectado a Netlify (https://aislaser.netlify.app): **cada push a `main` se publica automáticamente**. `netlify.toml` fija Node 22, las variables públicas de Supabase y el motor oficial de Next.js (`@netlify/plugin-nextjs`, fijado en `package.json`), así que no hace falta configurar nada más en Netlify.

> Si la web publicada da «Page not found» en todas las rutas, es que Netlify no está usando su motor de Next.js y está publicando la carpeta `.next` como archivos sueltos: comprobar que el `[[plugins]]` de `netlify.toml` sigue ahí.

Para probar la compilación de Netlify en local: `npx netlify-cli build --offline` y después `npx netlify-cli serve --offline`.

1. Cuando el dominio esté listo, apuntar `aislaser.es` / `www.aislaser.es` al sitio de Netlify.
2. En Supabase → Authentication → URL Configuration, añadir la dirección de Netlify (y el dominio final) en *Redirect URLs*, p. ej. `https://<sitio>.netlify.app/auth/callback`, para que funcione «¿Has olvidado tu contraseña?».

Las URLs de la web antigua (Joomla) redirigen con **301/308** a las nuevas (`/quienes-somos.html → /empresa`, `/servicios/poliureas.html → /servicios/poliurea`, galerías de obras, etc.) para conservar el posicionamiento. Ver `next.config.ts`.

## 4. Estructura

```
src/
  app/
    (site)/            Web pública: inicio, empresa, servicios, obras, contacto, legales
    panel/             Panel privado
      (auth)/          Login y recuperar contraseña
      (app)/           Dosieres, editor, obras de la web, mensajes (requiere administrador)
      demo/            Modo demostración (sólo sin Supabase configurado)
    auth/callback/     Vuelta de los emails de Supabase
  components/
    site/              Componentes de la web
    panel/editor/      Editor de dosieres (puntos, texto enriquecido, fotos, autoguardado)
    panel/document/    Maquetación A4 automática y exportación PDF / PNG
    panel/obras/       Gestión de las obras de la web (fotos, datos, publicar)
  content/             Textos de empresa y servicios; las 32 obras de la web anterior (respaldo e importación)
  lib/supabase/        Clientes de Supabase
  lib/dossier/         Tipos, repositorio Supabase / demo, preparación de imágenes
  lib/obras.ts         Lectura de las obras publicadas para la web (caché con etiqueta «obras»)
  proxy.ts             Protección del panel y refresco de sesión
supabase/              SQL del esquema y alta de administradores
scripts/               Importación de las obras de la web anterior a la galería
public/images/         Fotografías optimizadas (WebP) de la web anterior
```

## 5. Cómo funciona el panel

**Dos formatos de documento** (se elige arriba del todo en cada documento):

- **Informe técnico** (por defecto): calcado del informe de Aislaser. Membrete con el logo y «AISLAMIENTOS Y SERVICIOS», *A/A del técnico*, *Informe realizado por*, *Para*, título centrado y resaltado, apartados numerados en mayúsculas con texto justificado, cierre «Se emite este informe técnico en Campanario a …», sello, firma, *FDO: AISLASER, C.B.* y firmante, Nº de registro y CIF en el margen y el pie con actividades y dirección.
- **Dosier con portada**: portada con foto grande, cabecera y pie propios; pensado para reportajes fotográficos de obra.

Flujo:

1. **Nuevo informe** → se crea con los apartados *Objeto del informe*, *Pruebas realizadas* y *Conclusiones y propuesta de actuación* (se pueden renombrar, mover o borrar).
2. **Cabecera:** A/A del técnico, para quién, quién lo realiza y título (o, en el dosier, la portada con foto).
3. **Apartados 1, 2, 3…:** cada uno con título, texto con formato (negrita, cursiva, listas, alineación) y sus fotos.
4. **Fotos, lo más fácil posible:** arrastrar y soltar, botón *Elegir fotos*, **pegar con Ctrl+V** (también dentro del texto), o *Hacer foto* desde el móvil. Se reducen y orientan automáticamente antes de subirlas. Pie de foto, reordenar (arrastrando o con flechas) y elegir 1, 2 o 3 fotos por fila.
5. **Autoguardado** de cada cambio, con indicador "Guardando… / Todos los cambios guardados".
6. **Vista previa y descarga:** maquetación A4 automática con la imagen de Aislaser (portada, cabecera, pie y número de página) y exportación a:
   - **PDF** (A4, alta resolución),
   - **imágenes PNG** (una por página, en un ZIP),
   - **Imprimir** / guardar como PDF desde el navegador (texto vectorial).
7. **Cierre y firma:** lugar, fecha, firmante y casilla «Poner sello y firma».
8. **Ajustes** (`/panel/ajustes`): subir el sello y la firma una sola vez (se guardan en el bucket privado `firmas`), firmante y empresa por defecto, cambiar contraseña.
9. Duplicar un documento para usarlo como plantilla, marcarlo como terminado, buscar y eliminar.
10. **Mensajes:** solicitudes del formulario de contacto de la web, con marcar como leído.

### Obras de la web (`/panel/obras`)

Las obras que se ven en la web (página *Obras*, portada y obras relacionadas de cada servicio) se gestionan desde el panel, sin tocar código ni volver a desplegar:

1. **Nueva obra:** se escribe el nombre y se crea como borrador. Su dirección (`/obras/piscina-de-merida`) sale del nombre y no cambia.
2. **Fotos:** arrastrar, *Elegir fotos*, pegar con Ctrl+V o *Hacer foto* en el móvil (también fotos HEIC del iPhone). Se reducen a 2000 px antes de subirlas. La primera es la **portada**; se pueden mover, poner de portada, borrar y describir.
3. **Datos:** sector (obligatorio para publicar), lugar, año, trabajos realizados (enlazan con cada servicio), resumen y descripción (las líneas que empiezan por «- » salen como lista). *Destacar en la portada* la pone en «Proyectos que hablan por nosotros» (las 6 primeras destacadas).
4. **Guardar y publicar:** sale en la web al momento. *Quitar de la web* la deja como borrador. Las flechas del listado cambian el orden en que salen.

Las fotos se guardan en el bucket público `galeria` y la web las lee con la clave publicable (el RLS sólo deja ver lo publicado). Sólo si la galería no existe (Supabase sin configurar o sin la migración 004) la web enseña las obras de `src/content/projects.ts`; con la galería creada, enseña exactamente lo publicado en el panel.

**Pasar las obras de la web anterior a la galería** (una sola vez, justo después de ejecutar la migración 004: mientras la galería esté vacía la web no enseña obras). Ya está hecho en el Supabase de Aislaser (32 obras, 123 fotos):

```bash
ADMIN_EMAIL=correo@del.admin ADMIN_PASSWORD=… node scripts/importar-obras.mjs   # --simular para ver qué haría
```

Sólo importa si la galería está vacía (crea todas las obras de una vez y las publica juntas al final), así que repetirlo nunca recupera obras borradas en el panel. Si una importación se cortó, `--completar` crea las que falten, sube las fotos que falten y publica las importadas; úsalo sólo justo después del corte, no tras editar la galería. Necesita Node 22.18 o posterior (con Node 22.6–22.17: `node --experimental-strip-types scripts/importar-obras.mjs`).

## 6. Pendiente de revisar con el cliente

- Confirmar los años de experiencia (la web anterior decía "más de 15 años" en 2019) en `src/content/company.ts`.
- Revisar la clasificación por sector y ubicación de cada obra (ahora desde el panel, en *Obras web*).
- Si se dispone de fotos de mayor resolución, subirlas desde *Obras web* (las de la web anterior son de 720 px).

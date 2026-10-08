# Aislaser · Web corporativa y panel de dosieres

Nueva web pública de **Aislaser** (impermeabilización de cubiertas técnicas con poliurea y poliuretano, Campanario · Badajoz) y **panel privado** para crear dosieres de obra y descargarlos en PDF o en imágenes.

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
2. **SQL Editor → New query** → pegar `supabase/schema.sql` → **Run**. Crea:
   - `dossiers`, `dossier_points`, `dossier_images`: los dosieres, sus puntos (1, 2, 3…) y las fotos de cada punto.
   - `contact_messages`: mensajes del formulario de la web.
   - `admin_users` + función `is_admin()`: sólo los usuarios de esta tabla entran al panel.
   - Bucket de Storage `dossier-images` (lectura pública por URL, escritura sólo administradores).
   - Seguridad RLS en todas las tablas. El script es idempotente (se puede repetir).
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

## 3. Despliegue (Vercel recomendado)

1. Importar el repositorio en Vercel (framework detectado: Next.js).
2. Añadir las tres variables de entorno anteriores.
3. Deploy y apuntar el dominio `aislaser.es` / `www.aislaser.es`.

Las URLs de la web antigua (Joomla) redirigen con **301/308** a las nuevas (`/quienes-somos.html → /empresa`, `/servicios/poliureas.html → /servicios/poliurea`, galerías de obras, etc.) para conservar el posicionamiento. Ver `next.config.ts`.

## 4. Estructura

```
src/
  app/
    (site)/            Web pública: inicio, empresa, servicios, obras, contacto, legales
    panel/             Panel privado
      (auth)/          Login y recuperar contraseña
      (app)/           Dosieres, editor, mensajes (requiere administrador)
      demo/            Modo demostración (sólo sin Supabase configurado)
    auth/callback/     Vuelta de los emails de Supabase
  components/
    site/              Componentes de la web
    panel/editor/      Editor de dosieres (puntos, texto enriquecido, fotos, autoguardado)
    panel/document/    Maquetación A4 automática y exportación PDF / PNG
  content/             Textos de empresa, servicios y las 32 obras (fácil de editar)
  lib/supabase/        Clientes de Supabase
  lib/dossier/         Tipos, repositorio Supabase / demo, preparación de imágenes
  proxy.ts             Protección del panel y refresco de sesión
supabase/              SQL del esquema y alta de administradores
public/images/         Fotografías optimizadas (WebP) de la web anterior
```

## 5. Cómo funciona el panel de dosieres

1. **Nuevo dosier** → se crea con el punto 1 listo.
2. **Portada:** título, subtítulo, cliente, obra, fecha, referencia, foto de portada e introducción opcional.
3. **Puntos 1, 2, 3…:** cada uno con título, texto con formato (negrita, cursiva, listas, alineación) y sus fotos.
4. **Fotos, lo más fácil posible:** arrastrar y soltar, botón *Elegir fotos*, **pegar con Ctrl+V** (también dentro del texto), o *Hacer foto* desde el móvil. Se reducen y orientan automáticamente antes de subirlas. Pie de foto, reordenar (arrastrando o con flechas) y elegir 1, 2 o 3 fotos por fila.
5. **Autoguardado** de cada cambio, con indicador "Guardando… / Todos los cambios guardados".
6. **Vista previa y descarga:** maquetación A4 automática con la imagen de Aislaser (portada, cabecera, pie y número de página) y exportación a:
   - **PDF** (A4, alta resolución),
   - **imágenes PNG** (una por página, en un ZIP),
   - **Imprimir** / guardar como PDF desde el navegador (texto vectorial).
7. Duplicar un dosier para usarlo como plantilla, marcarlo como terminado, buscar y eliminar.
8. **Mensajes:** solicitudes del formulario de contacto de la web, con marcar como leído.

## 6. Pendiente de revisar con el cliente

- CIF y datos fiscales en `/aviso-legal`.
- Confirmar los años de experiencia (la web anterior decía "más de 15 años" en 2019) en `src/content/company.ts`.
- Revisar la clasificación por sector y ubicación de cada obra en `src/content/projects.ts`.
- Si se dispone de fotos de mayor resolución, sustituirlas en `public/images/` (las originales son de 720 px).

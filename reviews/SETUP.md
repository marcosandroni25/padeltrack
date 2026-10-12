# Reseñas de Coach Marco Sandroni · Puesta en marcha

Archivos en esta carpeta:

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página pública con el perfil y las reseñas. Es el link que se comparte. |
| `admin.html` | Panel privado para editar el perfil y moderar reseñas. Pide iniciar sesión con Google y solo acepta la cuenta `marco.sandroni25@gmail.com`. No tiene ningún enlace desde la página pública. |
| `config.js` | Configuración de Firebase. Mientras esté vacío, todo funciona en **modo demo**: los datos se guardan solo en el navegador. |
| `firestore.rules` | Reglas de seguridad de la base de datos. |

## 1. Crear el proyecto de Firebase (gratis, unos 10 minutos)

1. Entrá a <https://console.firebase.google.com> con tu cuenta de Google y tocá **Crear proyecto**. Google Analytics no hace falta.
2. **Build → Firestore Database → Create database.** Elegí una región cercana, por ejemplo `europe-west`, y arrancá en *production mode*.
3. **Firestore → Rules:** pegá el contenido completo de `firestore.rules` y tocá **Publish**.
4. **Build → Authentication → Get started → Sign-in method.** Activá:
   - **Anonymous.** Así cada visitante deja su reseña sin crear una cuenta, y la reseña queda ligada a su navegador.
   - **Google.** Es el acceso al panel de admin.
5. **Authentication → Settings → Authorized domains:** agregá `marcosandroni25.github.io`.
6. **Project settings (⚙️) → Your apps → Web (`</>`).** Registrá la app y copiá el objeto `firebaseConfig`.
7. Pegá esos valores en `reviews/config.js` y subí el cambio.

Las fotos de las reseñas se comprimen en el navegador y se guardan dentro de cada reseña. No hace falta Firebase Storage ni el plan pago.

## 2. Publicar la página (GitHub Pages)

1. Mergeá esta rama en `main`.
2. En GitHub, andá a **Settings → Pages → Build and deployment:** Source *Deploy from a branch*, Branch `main`, carpeta `/ (root)`.
3. Los links quedan así:
   - Público, para compartir: `https://marcosandroni25.github.io/padeltrack/reviews/`
   - Admin, privado: `https://marcosandroni25.github.io/padeltrack/reviews/admin.html`

## 3. Primeros pasos en el admin

- Iniciá sesión con Google. Si entrás con otra cuenta, el panel no muestra nada y la base de datos rechaza cualquier cambio.
- **Add sample reviews** carga 5 reseñas de ejemplo marcadas como *Sample*. **Delete sample reviews** las borra todas juntas, y también podés borrarlas una por una.
- Cada reseña tiene tres acciones: **Post reply** (respuesta pública), **Hide from page** (la oculta sin borrarla) y **Delete**.

## Cómo funciona

- **Calificación:** el visitante pone de 1 a 5 estrellas en cada una de las 5 categorías. La nota general es el promedio de esas cinco.
- **El resumen muestra:** el promedio general, la distribución de 5★ a 1★ (según la nota general redondeada) y el promedio de cada categoría.
- **Comentario:** obligatorio, hasta 100 caracteres. **Fotos:** opcionales, hasta 3.
- **Una reseña por navegador:** el visitante puede editarla o borrarla desde ese mismo navegador. Si borra los datos del navegador o usa otro dispositivo, puede escribir una reseña nueva. Sin cuentas no se puede evitar del todo, pero el admin puede borrar duplicados.
- **Orden:** por defecto, las más recientes primero. También se pueden ordenar por mejor o peor calificación.
- **Botón Copy link:** copia la URL de la página. Al pegarla en WhatsApp, Instagram, etc. aparece la vista previa con la foto, que viene de las etiquetas `og:` de `index.html`.

# Manual Técnico - Tu Parcela Lista

Este documento detalla la arquitectura técnica y el funcionamiento del backend y frontend unificados.

## 1. Arquitectura General
El proyecto utiliza una arquitectura **JAMstack**:
- **Frontend**: HTML5, Vanilla JavaScript, CSS3. (Sitio web estático).
- **Backend (BaaS)**: Supabase (PostgreSQL, Supabase Auth, Storage, Edge Functions).
- **Hosting sugerido**: Vercel o Netlify para el frontend. Supabase Cloud para el backend.

## 2. Estructura de Base de Datos y RLS
El modelo relacional en Supabase consta de:
- `clientes`: Administra interesados, dueños y corredores.
- `publicaciones_parcela`: Almacena el inventario propuesto.
- `proyectos`: Une a un cliente con una parcela/casa cotizada.
- `proyecto_items`: Detalles desglosados de los proyectos.

**Row Level Security (RLS)**:
Está habilitado en todas las tablas transaccionales. Todas las políticas de inserción, lectura y modificación requieren validación de JWT (`auth.role() = 'authenticated'`).
*Excepción*: La tabla `publicaciones_parcela` posee una política de inserción pública (`Public Insert`) para permitir que la herramienta "Publicar Parcela" funcione sin inicio de sesión. `clientes` también permite inserts anónimos.

## 3. Módulos JavaScript Clave
- `js/db-api.js`: Interfaz puente entre el frontend y Supabase. Centraliza la lógica de inserción de cotizaciones para mantener limpio el código de la UI.
- `cotizador.js`: Lógica matemática, renderizado del DOM de la cotización y generación del PDF mediante jsPDF.
- `plataforma/publicar-parcela/publicar-parcela.js`: Administra el flujo de pasos, maneja el evento Drop de imágenes, las sube vía `supabase.storage` y genera el registro estructurado final.
- `crm.js`: Administra la sesión de Supabase (`supabase.auth`) y bloquea el acceso al panel administrativo si no hay credenciales.

## 4. Variables de Entorno (.env)
- `TPL_SUPABASE_URL`: URL del proyecto Supabase.
- `TPL_SUPABASE_ANON_KEY`: Llave pública para operaciones con RLS.
- (En backend / Edge Functions) `SUPABASE_SERVICE_ROLE_KEY`: Acceso irrestricto a la BD (Jamás exponer en frontend).

## 5. Proceso de Despliegue y Rollback
1. Asegurarse de que no existan variables quemadas en el código (hardcoded keys).
2. Push a la rama `main` de GitHub. Vercel desplegará automáticamente.
3. Para hacer Rollback, ingresar al dashboard de Vercel, navegar a Deployments, seleccionar el commit anterior y hacer clic en *Promote to Production*.
4. Para migraciones de base de datos, siempre crear un nuevo archivo `.sql` en lugar de borrar tablas existentes, o usar el panel visual de Supabase.

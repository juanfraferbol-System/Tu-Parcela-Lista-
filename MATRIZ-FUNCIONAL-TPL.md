# Matriz de Funcionamiento - Tu Parcela Lista (TPL)

El siguiente documento audita el estado real de los flujos de negocio del proyecto, su conexión con la base de datos (Supabase) y el nivel de simulación (mock data).

| Módulo | Función | Página/Archivo | Estado | Fuente de datos | Guarda en Supabase | Usa Simulados | Req. Autenticación | Rol Autorizado | Automatización | Prueba | Resultado | Pendiente | Prioridad |
|--------|---------|----------------|--------|-----------------|--------------------|---------------|-------------------|----------------|----------------|--------|-----------|-----------|-----------|
| **Catálogo Público** | Listado de Parcelas | `index.html`, `app.js` | Funcionando | Archivo JS (`parcelas.js`) + Fallback DB | No aplica | Sí (`PARCELAS_DB` local) | No | Público | No aplica | Renderizado de grilla | Muestra datos mixtos o locales | Migrar origen 100% a Supabase | Media |
| **Catálogo Público** | Filtros Inteligentes | `index.html`, `app.js` | Funcionando | DOM y objetos locales | No aplica | No | No | Público | No aplica | Filtrado por precio y características | Correcto | N/A | Baja |
| **Catálogo Público** | Ficha Detalle Parcela | `parcela.html` | Funcionando | Archivo JS (`parcelas.js`) | No aplica | Sí | No | Público | No aplica | Apertura ficha | Correcto | Conectar a ruta dinámica DB | Alta |
| **Visitas / Leads** | Agendar Visita | `parcela.html`, `db-api.js` | Funcionando | Formulario UI | Sí (`leads_cotizaciones`) | No | No | Público | No | Envío de formulario visita | Guarda en Supabase `leads_cotizaciones` | Migrar a tabla `visitas` en CRM | Alta |
| **Visitas / Leads** | Contactar Corredor | `index.html` (SmartMatch) | Solo interfaz | Formulario UI | No | Sí | No | Público | No | Click botón Whatsapp | Abre enlace sin registro DB | Conectar a `clientes` | Media |
| **Publicación** | Formulario Publicar Parcela | `plataforma/publicar-parcela/index.html` | Funcionando | Formulario UI | Sí (`publicaciones_parcela`) | No | No (RLS público habilitado) | Público | Opcional (Edge Func Ads) | Llenado 3 pasos y envío | Registra publicador en `clientes` e inserta `publicaciones_parcela` | Edge Function Ads comentada / en progreso | Crítica |
| **Publicación** | Subida de Imágenes | `publicar-parcela.js` | Funcionando | Archivos locales | Sí (Storage `fotos_parcelas`) | No | No | Público | No | Drag & drop y upload | Retorna URLs de Storage reales | N/A | Alta |
| **Cotizador** | Selección Parcela + Casa | `cotizador.html`, `cotizador.js` | Funcionando | LocalStorage + Formularios | Sí (`clientes`, `proyectos`) | No | No | Público | Creador de PDF, abre mailto | Confirmar activación de proyecto | Guarda `cliente` y `proyecto` cotizado | Redirigir a WS opcional | Crítica |
| **Cotizador** | Diseño Propio | `cotizador.html`, `premium-cotizador.js` | Funcionando | Estado local | Sí (`clientes`, `proyectos`) | No | No | Público | Creador PDF | Activar sin parcela | Guarda cotización personalizada | N/A | Crítica |
| **Cotizador** | Resumen y Activación | `cotizador.js` | Funcionando | Cotizador DOM | Sí | No | No | Público | Generación jsPDF | Activación proyecto | Abre correo / WA con detalles y PDF | Implementar Email Backend (Resend) | Media |
| **CRM Backend** | Login y Sesión | `crm.html`, `crm.js` | Funcionando | Supabase Auth | Valida lectura de sesión | No | Sí | Administrador (`@tuparcelalista.cl`) | No | Intentar acceder sin token | Expulsa al login | Diseño panel login | Crítica |
| **CRM Backend** | Dashboard General | `crm.html` | Solo interfaz | Mock Data CRM | Lectura DB (En progreso) | Sí | Sí | Administrador | No | Vista de paneles | Muestra estática | Conectar paneles a tablas RLS | Crítica |
| **Administración** | Roles y Seguridad | `202607170001_seguridad_roles.sql` | Funcionando | DB RLS | N/A | No | Sí | DB Policies | No | Inserciones y Lecturas cruzadas | Protegido | N/A | Crítica |

## Resumen de la Matriz
- **Flujos 100% operativos y sin mock (Guardado de negocio crítico)**: Publicar Parcela, Guardado de Cotizaciones, Creación de Clientes, Subida de Fotos, Seguridad CRM.
- **Flujos con Mock de Lectura (Catálogo)**: La exhibición de las propiedades aún se basa principalmente en `parcelas.js` por velocidad de desarrollo; se requiere migrarlas a la BD.
- **Flujos con Mock de Interfaz (CRM Panels)**: El dashboard del CRM está protegido, pero la visualización interna de las tablas aún utiliza componentes estáticos de demostración, falta enlazar las vistas a las tablas.

# Motor de Redacción Inteligente TPL v15

## Cambios incluidos

- Nuevo motor reutilizable en `js/core/redaccion/motor-redaccion.js`.
- Generación diferenciada para parcelas/campos, casas y perfiles partner.
- Variantes estables según los datos de cada propiedad: dos anuncios parecidos pueden usar redacciones distintas, pero el mismo anuncio no cambia de texto en cada recarga.
- Reglas de superficie:
  - hasta 6.000 m²: superficie total;
  - 6.001 a 8.000 m²: gran superficie;
  - 8.001 a 10.000 m²: superficie suficiente para proyectos de mayor amplitud;
  - sobre 10.000 m²: extensa superficie y múltiples posibilidades de desarrollo.
- Región, comuna con calificativos y sector.
- Rol, subdivisión, factibilidad, topografía, suelo, uso, acceso, agua, electricidad y distancia a ruta principal.
- La opción `Cesión de derechos` fue retirada del formulario.
- El CRM recibe ahora:
  - `descripcion`;
  - `descripcionComercial`;
  - `descripcionTecnica`;
  - `estiloRedaccion`.
- Se agregó una base de generación para casas y partners.

## Archivos modificados

- `plataforma/publicar/index.html`
- `plataforma/publicar/app.js`

## Archivos nuevos

- `js/core/redaccion/motor-redaccion.js`
- `js/core/redaccion/motor-redaccion-tests.mjs`

## Pruebas

Ejecutar:

```bash
node js/core/redaccion/motor-redaccion-tests.mjs
```

Resultado esperado:

```text
Motor de Redacción TPL: pruebas correctas
```

## Publicación

Después de copiar los archivos al proyecto:

```bash
git add .
git commit -m "Agregar Motor de Redacción Inteligente TPL v15"
git push origin main
```

Si Vercel está conectado a GitHub, el despliegue se inicia automáticamente.

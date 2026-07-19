# CRM Tasador TPL V7

## Implementado

- Tasador conserva animación tipo asistente con mensajes de análisis.
- Se ocultaron de la vista pública los valores base, porcentajes, fórmulas y detalle numérico interno.
- Rol propio y condominio se aplican como ajustes globales sobre el total calculado.
- Se conserva el Factor Mercado TPL como ajuste final interno.
- Cada uso del botón Tasador crea una sesión comercial aunque no se publique.
- Se registran resultado, precio esperado, precio TPL, diferencia, decisión y abandono.
- Al completar la publicación, la sesión queda vinculada con el código de publicación.
- Se agregó panel `crm-tasador.html` con indicadores, gráficos, filtros y exportación CSV.
- Se dejó preparado `valuationCrmEndpoint` para sincronización posterior con Supabase.

## Privacidad

La interfaz avisa que los antecedentes y el resultado podrán guardarse para recuperar la estimación, mejorar el servicio y realizar seguimiento comercial.

# Implementación TPL: negociación flexible, mejoras y Partners

## Incluido
- Publicador: cuatro modalidades de negociación.
- Mejoras ofrecidas por el propietario con monto, momento y condiciones.
- Detección automática de carencias (luz, agua, cerco, portón, acceso y sanitario).
- Datos estructurados dentro de `comercial.negociacion`.
- Ficha `parcela.html`: tarjeta de beneficios y formulario de propuesta del comprador.
- Migración Supabase para necesidades, propuestas y oportunidades Partner.

## Aplicación
1. Reemplazar los archivos incluidos conservando sus rutas.
2. Ejecutar `npx supabase@latest db push`.
3. Probar el publicador eligiendo “Puedo evaluar ofertas o incluir mejoras”.
4. Publicar una propiedad con campos faltantes para comprobar las oportunidades detectadas.

## Regla de seguridad comercial
Una mejora se muestra inicialmente como “disponible para negociar”. Solo se transforma en compromiso cuando se incorpora formalmente a una reserva o contrato.

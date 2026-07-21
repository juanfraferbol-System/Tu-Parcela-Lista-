# Tasador TPL de casas — piloto V1

## Alcance
Esta primera versión calcula solamente el valor orientativo de la construcción. Cuando la publicación corresponde a una casa en parcela, el valor del terreno queda separado para incorporarlo después mediante el tasador de parcelas, sin modificar su lógica actual.

## Fórmula inicial
Valor construcción = m² construidos × valor base del material × (1 + suma de ajustes).

El ajuste total queda limitado entre -55% y +45% para impedir resultados extremos durante las pruebas.

## Valores base por m²
- Madera: $520.000
- Metalcon: $600.000
- SIP: $650.000
- Albañilería: $720.000
- Hormigón: $820.000
- Mixta: $680.000
- Sin material informado: $620.000

## Porcentajes iniciales editables

### Calidad constructiva
- Económica: -12%
- Estándar: 0%
- Buena: +8%
- Premium: +18%

### Estado
- Nueva: +5%
- Excelente: +4%
- Muy buena: +2%
- Buena: 0%
- Necesita mejoras: -12%
- Para remodelar: -25%

### Antigüedad
- 0–5 años: 0%
- 6–10: -3%
- 11–15: -6%
- 16–20: -10%
- 21–30: -16%
- 31–40: -24%
- 41–50: -32%
- Más de 50: -40%

### Remodelación realizada durante los últimos 15 años
- Parcial: +2%
- Importante: +5%
- Integral: +8%

### Cercanía a una sola referencia urbana
Se debe indicar Plaza de Armas o centro urbano, pero no ambos. Si se informan minutos y kilómetros, se usan los minutos.

Por tiempo:
- Hasta 10 min: +6%
- 11–20 min: +4%
- 21–30 min: +2%
- 31–45 min: 0%
- 46–60 min: -3%
- Más de 60 min: -7%

Por distancia, solo cuando no hay tiempo:
- Hasta 5 km: +6%
- 6–10 km: +4%
- 11–20 km: +2%
- 21–35 km: 0%
- 36–50 km: -3%
- Más de 50 km: -7%

### Acceso
- Pavimentado hasta la propiedad: +4%
- Mayormente pavimentado: +2%
- Ripio bueno: 0%
- Ripio irregular: -3%
- Tierra: -6%
- Acceso difícil: -12%

### Regularización
- Recepción final / totalmente regularizada: +4%
- Parcial: -5%
- En trámite: -8%
- Sin regularizar: -22%
- No lo sabe: -10%

### Eficiencia
- Buena aislación: +2,5%
- Alta eficiencia: +5%
- Termopanel parcial: +2%
- Termopanel completo: +4%

### Equipamiento
- Terraza: +2%
- Quincho: +2,5%
- Piscina: +4%
- Bodega: +1,5%
- Logia: +1%
- Chimenea: +1%
- Jardín formado: +2%
- Vista panorámica: +3%
- Acceso a río o lago: +4%
- Bosque o entorno nativo: +2%

## Planes de fundación e instalación
- Pilotes + montaje: $60.000/m².
- Radier + montaje: $95.000/m². Oculta instalación eléctrica y sanitaria porque están incluidas.
- Llave en mano: $140.000/m². Oculta pintura, cerámica, instalación eléctrica, instalación sanitaria y artefactos incluidos.

Las tarjetas muestran ahora valor por m² y total calculado según la casa seleccionada.

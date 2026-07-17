const fs = require('fs');
const path = require('path');

const rootDir = 'D:\\BIOTV MARKETING\\NUEVO BIOTV\\PÁGINAS WEB\\TU PARCELA LISTA - copia 17';
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const currentPartnersHtml = fs.readFileSync(path.join(rootDir, 'plataforma/partners/index.html'), 'utf8');

// Extract head from index.html (excluding title and og tags to replace them)
let headMatch = indexHtml.match(/<head>([\s\S]*?)<\/head>/);
let headContent = headMatch ? headMatch[1] : '';

// Fix paths in head
headContent = headContent.replace(/(href|src)="((?!http|https|\/\/)[^"]+)"/g, '$1="../../$2"');
// Fix title and descriptions
headContent = headContent.replace(/<title>.*?<\/title>/, '<title>Red de Partners - Tu Parcela Lista</title>');
headContent = headContent.replace(/<meta content="Tu Parcela Lista - Parcelas en Chile" property="og:title"\/>/g, '<meta content="Únete a la Red de Partners - Tu Parcela Lista" property="og:title"/>');
headContent = headContent.replace(/<meta content="El cotizador Inteligente de Parcelas que estabas esperando en Chile. Cuentanos donde quieres vivir y que tipo de casa, nosotros te calculamos todo." property="og:description"\/>/g, '<meta content="Forma parte de la Red de Partners TPL, recibe oportunidades compatibles con tu experiencia y haz crecer tu negocio." property="og:description"/>');
headContent = headContent.replace(/<meta content="Tu Parcela Lista - Parcelas en Chile" name="twitter:title"\/>/g, '<meta content="Únete a la Red de Partners - Tu Parcela Lista" name="twitter:title"/>');
headContent = headContent.replace(/<meta content="El cotizador Inteligente de Parcelas que estabas esperando en Chile. Cuentanos donde quieres vivir y que tipo de casa, nosotros te calculamos todo." name="twitter:description"\/>/g, '<meta content="Forma parte de la Red de Partners TPL, recibe oportunidades compatibles con tu experiencia y haz crecer tu negocio." name="twitter:description"/>');

// Extract navbar from index.html
let navMatch = indexHtml.match(/<header class="navbar">([\s\S]*?)<\/header>/);
let navContent = navMatch ? `<header class="navbar">${navMatch[1]}</header>` : '';

// Fix paths in navbar
navContent = navContent.replace(/(href|src)="((?!http|https|\/\/|#)[^"]+)"/g, (match, p1, p2) => {
    // Si empieza con plataforma/, subir un nivel menos? no, subir ../../ y luego plataforma
    if (p2.startsWith('plataforma/')) return `${p1}="../../${p2}"`;
    return `${p1}="../../${p2}"`;
});
// The links to #sections on index.html need to be absolute to index.html if we are not on index.html
navContent = navContent.replace(/href="#([^"]+)"/g, 'href="../../index.html#$1"');
navContent = navContent.replace(/href="\.\.\/\.\.\/index\.html#([^"]+)"/g, 'href="../../index.html#$1"'); // cleanup double
// Make sure index.html links go to ../../index.html
navContent = navContent.replace(/href="\.\.\/\.\.\/index\.html"/g, 'href="../../index.html"');

const customCSS = `
<style>
  :root {
    --primary: #003f7a;
    --secondary: #00828a;
    --bg: #f8fafc;
    --surface: #ffffff;
    --text: #0f172a;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --radius: 12px;
  }
  body {
    background-color: var(--bg);
    color: var(--text);
  }
  .navbar { position: fixed; top:0; width:100%; z-index: 1000; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .partners-hero {
    margin-top: 80px;
    padding: 80px 20px;
    background: linear-gradient(rgba(0,63,122,0.8), rgba(0,63,122,0.9)), url('../../image/hero-partners-construction.jpg') center/cover;
    color: white;
    text-align: center;
  }
  .partners-hero h1 {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 20px;
    color: white;
  }
  .partners-hero p {
    font-size: 1.2rem;
    max-width: 800px;
    margin: 0 auto 30px auto;
    line-height: 1.6;
    color: #e2e8f0;
  }
  .partners-hero .btn-group {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .btn-primary, .btn-secondary {
    padding: 15px 30px;
    border-radius: 30px;
    font-weight: 700;
    font-size: 1.1rem;
    text-decoration: none;
    transition: transform 0.2s;
  }
  .btn-primary { background: var(--secondary); color: white; }
  .btn-primary:hover { transform: translateY(-3px); color: white; background: #006b72;}
  .btn-secondary { background: white; color: var(--primary); }
  .btn-secondary:hover { transform: translateY(-3px); color: var(--primary); background: #f1f5f9; }

  .section-container { max-width: 1200px; margin: 60px auto; padding: 0 20px; }
  .section-title { text-align: center; color: var(--primary); font-size: 2.2rem; font-weight: 800; margin-bottom: 40px; }
  
  /* Flujo */
  .flow-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; text-align: center; }
  .flow-step { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
  .flow-step h4 { color: var(--secondary); margin-bottom: 10px; font-size:1.1rem; }
  
  /* Comparador */
  .table-responsive { overflow-x: auto; }
  .compare-table { width: 100%; border-collapse: collapse; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); min-width: 800px; }
  .compare-table th, .compare-table td { padding: 20px; text-align: center; border-bottom: 1px solid var(--border); }
  .compare-table th { background: var(--primary); color: white; font-weight: 700; font-size:1.1rem; }
  .compare-table th:first-child, .compare-table td:first-child { text-align: left; font-weight: 700; color: var(--primary); background: #f8fafc; }
  .compare-table tr:hover { background: #f1f5f9; }
  .compare-table td { color: var(--text); }
  
  .badge { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
  .badge-free { background: #e2e8f0; color: #475569; }
  .badge-ideal { background: #dbeafe; color: #1e3a8a; }
  .badge-empresa { background: #dcfce7; color: #166534; }
  .badge-premium { background: #fef9c3; color: #854d0e; }
  
  .check { color: #10b981; font-weight: 900; font-size: 1.2rem; }
  .dash { color: #94a3b8; font-weight: 900; }

  /* Form */
  .form-container { background: var(--surface); padding: 40px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.05); width: 100%; max-width: 1000px; margin: 40px auto; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .full-width { grid-column: 1 / -1; }
  .input-group { margin-bottom: 16px; }
  .input-group label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 6px; color: var(--primary); }
  .input-group input, .input-group select, .input-group textarea { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); font-family: 'Inter', sans-serif; font-size: 1rem; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
  .input-group textarea { resize: vertical; min-height: 80px; }
  .input-group input:focus, .input-group select:focus, .input-group textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0,63,122,0.1); }
  .checkbox-group { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
  .checkbox-group input { width: 20px; height: 20px; }
  .checkbox-group label { font-size: 0.95rem; font-weight: 500; color: var(--text); cursor: pointer; }
  
  .plan-selector { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; margin-top: 20px; }
  .plan-card { border: 2px solid var(--border); border-radius: var(--radius); padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; position: relative; background:white; }
  .plan-card.active { border-color: var(--primary); background: rgba(0, 63, 122, 0.02); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
  .plan-card h3 { margin: 0 0 10px 0; color: var(--primary); font-size: 1.2rem; }
  .plan-card .price { font-size: 1.3rem; font-weight: 800; color: var(--secondary); margin-bottom: 15px; }
  .plan-card ul { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: var(--text-muted); text-align: left; }
  .plan-card ul li { margin-bottom: 8px; position: relative; padding-left: 20px; }
  .plan-card ul li::before { content: '✓'; position: absolute; left: 0; color: var(--secondary); font-weight: bold; }
  .plan-card input[type="radio"] { display: none; }
  .btn-submit { width: 100%; padding: 16px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border: none; border-radius: var(--radius); font-size: 1.1rem; font-weight: 700; cursor: pointer; margin-top: 20px; transition: transform 0.2s, box-shadow 0.2s; }
  .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,63,122,0.2); }
  .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
  #success-msg { display: none; background: #dcfce7; color: #166534; padding: 24px; border-radius: var(--radius); text-align: center; font-weight: 600; font-size: 1.2rem; margin-bottom:20px;}
  
  .mockup-container { background: #f1f5f9; border-radius: 16px; padding: 30px; text-align:center; border: 1px dashed #cbd5e1; }
  .mockup-container h3 { color: var(--primary); margin-top:0; }
  .mockup-container p { color: var(--text-muted); margin-bottom:0; }

  @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .partners-hero h1 { font-size: 2rem;} }
</style>
`;

const newHtml = `<!DOCTYPE html>
<html lang="es">
<head>
${headContent}
${customCSS}
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WK4M33H4"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

${navContent}

<section class="partners-hero">
  <div class="container">
    <h1>Seamos socios. Queremos contar con tu talento.</h1>
    <p>Forma parte de la Red de Partners TPL, recibe oportunidades compatibles con tu experiencia y haz crecer tu negocio junto a proyectos reales de parcelas y construcción.</p>
    <div class="btn-group">
      <a href="#postulacion" class="btn-primary">Quiero ser Partner</a>
      <a href="#planes" class="btn-secondary">Comparar planes</a>
    </div>
  </div>
</section>

<section class="section-container" id="como-funciona">
  <h2 class="section-title">¿Cómo funciona la Red TPL?</h2>
  <div class="flow-grid">
    <div class="flow-step">
      <h4>1. Registro</h4>
      <p style="font-size:0.9rem; color:#64748b;">Postulas y TPL valida tu perfil comercial y experiencia.</p>
    </div>
    <div class="flow-step">
      <h4>2. Oportunidades</h4>
      <p style="font-size:0.9rem; color:#64748b;">Recibes proyectos compatibles con tu zona y especialidad.</p>
    </div>
    <div class="flow-step">
      <h4>3. Propuesta</h4>
      <p style="font-size:0.9rem; color:#64748b;">Envías tu propuesta para que el cliente o TPL te seleccione.</p>
    </div>
    <div class="flow-step">
      <h4>4. Ejecución</h4>
      <p style="font-size:0.9rem; color:#64748b;">Ejecutas el trabajo acordado asegurando la mejor calidad.</p>
    </div>
    <div class="flow-step">
      <h4>5. Evaluación</h4>
      <p style="font-size:0.9rem; color:#64748b;">Recibes tu pago y mejoras tu reputación en la red.</p>
    </div>
  </div>
</section>

<section class="section-container" id="planes">
  <h2 class="section-title">Planes diseñados para tu crecimiento</h2>
  <div class="table-responsive">
    <table class="compare-table">
      <thead>
        <tr>
          <th>Beneficio</th>
          <th>Partner <br><span class="badge badge-free">Gratis</span></th>
          <th>Ideal <br><span class="badge badge-ideal">$29.990 / mes</span></th>
          <th>Empresa <br><span class="badge badge-empresa">$69.990 / mes</span></th>
          <th>Premium Empresa <br><span class="badge badge-premium">$120.000 / mes</span></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Comisión TPL por adjudicación</td>
          <td><strong>2 %</strong></td>
          <td><strong>1,5 %</strong></td>
          <td><strong>1 %</strong></td>
          <td><strong>0 %</strong></td>
        </tr>
        <tr>
          <td>Recibe oportunidades compatibles</td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
        </tr>
        <tr>
          <td>Landing Page pública</td>
          <td><span class="dash">-</span></td>
          <td><span class="check">✓ Básica</span></td>
          <td><span class="check">✓ Completa</span></td>
          <td><span class="check">✓ Avanzada + Video</span></td>
        </tr>
        <tr>
          <td>Aparece en directorio / sugerencias</td>
          <td><span class="dash">-</span></td>
          <td><span class="check">Sí</span></td>
          <td><span class="check">Destacado</span></td>
          <td><span class="check">Máxima Exposición</span></td>
        </tr>
        <tr>
          <td>Puede ser elegido directo por clientes</td>
          <td><span class="dash">-</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
          <td><span class="check">✓</span></td>
        </tr>
        <tr>
          <td>Prioridad en el algoritmo</td>
          <td>Normal</td>
          <td>Moderada</td>
          <td>Alta</td>
          <td>Máxima</td>
        </tr>
        <tr>
          <td>Estadísticas e Informes</td>
          <td>Internas</td>
          <td>Básicas</td>
          <td>Avanzadas</td>
          <td>Completas + Conversiones</td>
        </tr>
        <tr>
          <td>Campañas publicitarias TPL</td>
          <td><span class="dash">-</span></td>
          <td><span class="dash">-</span></td>
          <td>Opcionales</td>
          <td>Incluidas y Gestionadas*</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p style="text-align:center; font-size:0.85rem; color:#64748b; margin-top:15px;">*El Plan Premium Empresa incluye gestión y herramientas publicitarias. El presupuesto destinado directamente a pauta en Meta Ads o Google Ads puede definirse por separado según cada campaña.</p>
</section>

<section class="section-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; align-items:center;">
  <div>
    <h2 style="color:var(--primary); font-size:2rem; font-weight:800; margin-bottom:15px; margin-top:0;">Tu Perfil Público (Desde Plan Ideal)</h2>
    <p style="color:var(--text-muted); line-height:1.6; margin-bottom:20px;">
      Obtén tu propia URL (ej. <strong>parcelalista.cl/partners/tu-empresa</strong>) para promocionarte en la web.
      Tu landing incluye tu logo, galería de fotos, zonas de cobertura, y especialidades. Los clientes podrán ver tu puntuación, tiempo de respuesta y solicitarte una cotización directa a tu WhatsApp.
    </p>
    <div style="background:#fff7ed; padding:15px; border-left:4px solid #f97316; border-radius:8px;">
      <h4 style="margin:0 0 5px 0; color:#c2410c;">Compromiso con la Calidad</h4>
      <p style="margin:0; font-size:0.9rem; color:#9a3412;">Los planes mejoran tu visibilidad y herramientas comerciales, pero no garantizan adjudicaciones. La selección final siempre considerará tu experiencia, tiempo de respuesta, cumplimiento y evaluación de clientes pasados.</p>
    </div>
  </div>
  <div class="mockup-container">
    <div style="width:80px; height:80px; background:#fff; border-radius:50%; margin: 0 auto 15px auto; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    </div>
    <h3>Constructora Ejemplo</h3>
    <p style="margin-bottom:10px;">⭐ 4.9/5 | ⚡ Respuesta Rápida</p>
    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:20px;">
      <span class="badge" style="background:#e2e8f0;">Construcción</span>
      <span class="badge" style="background:#e2e8f0;">Radieres</span>
      <span class="badge" style="background:#e2e8f0;">Biobío</span>
    </div>
    <button style="background:#25D366; color:white; border:none; padding:10px 20px; border-radius:20px; font-weight:700;">Solicitar Cotización</button>
  </div>
</section>

<div class="section-container" id="postulacion">
  <div class="form-container">
    <h2 style="font-size: 2rem; font-weight: 800; color: var(--primary); text-align:center; margin-top:0;">Postula a la Red</h2>
    <p style="text-align:center;">Completa tus datos comerciales y elige tu plan. TPL evaluará tu perfil.</p>
    
    <div id="success-msg">
      ¡Gracias por postular! Revisaremos tus datos y nos comunicaremos contigo.
    </div>

    <form id="partner-form">
      
      <h3 style="font-size: 1.2rem; margin-top: 20px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px;">1. Elige tu Plan</h3>
      <div class="plan-selector">
        <label class="plan-card active">
          <input type="radio" name="plan" value="partner" checked>
          <h3>Plan Partner</h3>
          <div class="price">Gratis</div>
          <ul>
            <li>Comisión 2%</li>
            <li>Recibe oportunidades</li>
            <li>Perfil Interno</li>
            <li>Sin Landing Page</li>
          </ul>
        </label>
        <label class="plan-card">
          <input type="radio" name="plan" value="ideal">
          <h3>Plan Ideal</h3>
          <div class="price" style="font-size:1.1rem;">$29.990 / mes</div>
          <ul>
            <li>Comisión 1,5%</li>
            <li>Landing Page Pública</li>
            <li>Aparición en Directorio</li>
            <li>Prioridad Moderada</li>
          </ul>
        </label>
        <label class="plan-card">
          <input type="radio" name="plan" value="empresa">
          <h3>Plan Empresa</h3>
          <div class="price" style="font-size:1.1rem;">$69.990 / mes</div>
          <ul>
            <li>Comisión 1%</li>
            <li>Sugerencia a Clientes</li>
            <li>Estadísticas Avanzadas</li>
            <li>Prioridad Alta</li>
          </ul>
        </label>
        <label class="plan-card">
          <input type="radio" name="plan" value="premium_empresa">
          <h3>Premium</h3>
          <div class="price" style="font-size:1.1rem;">$120.000 / mes</div>
          <ul>
            <li>Comisión 0%</li>
            <li>Gestión de Ads Incluida</li>
            <li>Aparición Destacada</li>
            <li>Prioridad Máxima</li>
          </ul>
        </label>
      </div>

      <h3 style="font-size: 1.2rem; margin-top: 30px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px;">2. Datos Comerciales</h3>
      <div class="form-grid">
        <div class="input-group">
          <label>Nombre Comercial / Empresa</label>
          <input type="text" id="nombre_comercial" required placeholder="Ej: Constructora Nogales">
        </div>
        <div class="input-group">
          <label>Nombre del Responsable</label>
          <input type="text" id="nombre_responsable" required placeholder="Ej: Juan Pérez">
        </div>

        <div class="input-group">
          <label>Teléfono (Llamadas)</label>
          <input type="tel" id="telefono" required placeholder="+569...">
        </div>
        <div class="input-group">
          <label>WhatsApp</label>
          <input type="tel" id="whatsapp" required placeholder="+569...">
        </div>

        <div class="input-group full-width">
          <label>Correo Electrónico</label>
          <input type="email" id="correo" required placeholder="contacto@empresa.cl">
        </div>

        <div class="input-group full-width">
          <label>Descripción de tus Servicios</label>
          <textarea id="descripcion_servicios" required placeholder="Describe brevemente qué haces y cuál es tu valor agregado..."></textarea>
        </div>

        <div class="input-group">
          <label>Logo de Empresa o Fotografía Personal</label>
          <input type="file" id="logo_file" accept="image/*" required>
        </div>
        
        <div class="input-group">
          <label>Imágenes de Trabajos (Opcional)</label>
          <input type="file" id="gallery_files" accept="image/*" multiple>
          <small style="color: #64748b; font-size: 0.8rem; display: block; margin-top: 4px;">Puedes subir hasta 5 fotos para tu galería</small>
        </div>
      </div>

      <h3 style="font-size: 1.2rem; margin-top: 30px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px;">3. Operatividad y Especialidades</h3>
      <div class="form-grid">
        <div class="input-group">
          <label>Tipo de Servicio Principal</label>
          <select id="tipo_servicio" required>
            <option value="" disabled selected>Selecciona tu rubro general...</option>
            <option value="Construcción">Construcción</option>
            <option value="Instalaciones (Pozos, Fosas, Cercos)">Instalaciones Básicas</option>
            <option value="Ingeniería y Topografía">Ingeniería y Topografía</option>
            <option value="Arquitectura">Arquitectura y Diseño</option>
            <option value="Servicios Profesionales (Abogados, etc)">Servicios Legales</option>
            <option value="Mantenimiento (Eléctrico, Gasfitería)">Mantenimiento</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        <div class="input-group">
          <label>Especialidades (Separadas por coma)</label>
          <input type="text" id="especialidades" required placeholder="Ej: Radieres, Cercos, Piscinas">
        </div>

        <div class="input-group">
          <label>Región Base</label>
          <select id="region" required>
            <option value="" disabled selected>Selecciona una región...</option>
            <option value="Metropolitana">Metropolitana</option>
            <option value="Valparaíso">Valparaíso</option>
            <option value="O'Higgins">O'Higgins</option>
            <option value="Maule">Maule</option>
            <option value="Ñuble">Ñuble</option>
            <option value="Biobío">Biobío</option>
            <option value="Araucanía">Araucanía</option>
            <option value="Los Ríos">Los Ríos</option>
            <option value="Los Lagos">Los Lagos</option>
            <option value="Otras Regiones">Otras Regiones</option>
          </select>
        </div>
        <div class="input-group">
          <label>Comunas Atendidas</label>
          <input type="text" id="comunas_atendidas" required placeholder="Ej: Concepción, Yumbel, Florida">
        </div>

        <div class="input-group">
          <label>Años de Experiencia</label>
          <input type="number" id="anos_experiencia" required min="0" placeholder="Ej: 5">
        </div>
        <div class="input-group">
          <label>Disponibilidad Actual</label>
          <select id="disponibilidad" required>
            <option value="Inmediata">Inmediata</option>
            <option value="En 1 semana">En 1 semana</option>
            <option value="En 1 mes">En 1 mes o más</option>
          </select>
        </div>
      </div>

      <h3 style="font-size: 1.2rem; margin-top: 30px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px;">4. Términos y Condiciones</h3>
      
      <div class="checkbox-group">
        <input type="checkbox" id="emite_factura">
        <label for="emite_factura">Emito Boleta de Honorarios o Factura</label>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="acepta_proyectos_tpl" checked>
        <label for="acepta_proyectos_tpl">Acepto recibir proyectos y oportunidades derivadas por TPL</label>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="trabaja_bajo_marca_tpl">
        <label for="trabaja_bajo_marca_tpl">Me interesa trabajar temporalmente bajo la marca "Tu Parcela Lista" (Marca Blanca)</label>
      </div>

      <button type="submit" class="btn-submit" id="btn-submit">Enviar Postulación</button>
    </form>
  </div>
</div>

<script src="partners-logic.js" type="module"></script>
<script src="../../js/script.js" defer></script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'plataforma/partners/index.html'), newHtml, 'utf8');
console.log('Done rendering partners page');

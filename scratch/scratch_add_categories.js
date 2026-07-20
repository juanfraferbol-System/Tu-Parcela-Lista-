const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'index.html');
let content = fs.readFileSync(targetFile, 'utf8');

const categoriesHTML = `
<!-- ========================================= -->
<!-- CATEGORIAS DE PARCELAS -->
<!-- ========================================= -->
<section class="parcel-categories-section container" style="margin-top: 60px; margin-bottom: 20px; padding-top: 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <span style="background:rgba(0,130,138,0.1);color:var(--secondary);padding:6px 16px;border-radius:var(--radius-full);font-weight:700;font-size:0.9rem; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">DESCUBRE TU LUGAR IDEAL</span>
    <h2 style="font-size: clamp(2rem, 4vw, 2.6rem); font-weight: 800; color: var(--primary); margin: 0; line-height: 1.15;">Encuentra según tu estilo</h2>
    <p style="color: var(--text-muted); max-width: 600px; margin: 12px auto 0; font-size: 1.05rem;">
      Explora las parcelas agrupadas por la experiencia que buscas.
    </p>
  </div>
  
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; padding-bottom: 20px;">
    <!-- Tarjeta 1: Descanso -->
    <button class="category-card" onclick="alert('Próximamente filtraremos por Descanso')" style="background: linear-gradient(to top, rgba(12, 43, 46, 0.9) 0%, rgba(12, 43, 46, 0.2) 60%, rgba(12,43,46,0) 100%), url('image/chilean_araucania_lake_1784089774356.jpg') center/cover;">
      <div class="category-content">
        <div class="category-icon"><i class="fa-solid fa-leaf"></i></div>
        <h3>Descanso y Paz</h3>
        <p>Refugios silenciosos</p>
      </div>
    </button>
    
    <!-- Tarjeta 2: Inversión -->
    <button class="category-card" onclick="alert('Próximamente filtraremos por Inversión')" style="background: linear-gradient(to top, rgba(0, 71, 95, 0.9) 0%, rgba(0, 71, 95, 0.2) 60%, rgba(0,71,95,0) 100%), url('image/chilean_sustainable_tech_1784089761962.jpg') center/cover;">
      <div class="category-content">
        <div class="category-icon"><i class="fa-solid fa-chart-line"></i></div>
        <h3>Inversión</h3>
        <p>Alta plusvalía garantizada</p>
      </div>
    </button>

    <!-- Tarjeta 3: Nativas y Salvajes -->
    <button class="category-card" onclick="alert('Próximamente filtraremos por Nativas y Salvajes')" style="background: linear-gradient(to top, rgba(31, 61, 35, 0.9) 0%, rgba(31, 61, 35, 0.2) 60%, rgba(31,61,35,0) 100%), url('image/man_tractor_1784085609723.jpg') center/cover;">
      <div class="category-content">
        <div class="category-icon"><i class="fa-solid fa-tree"></i></div>
        <h3>Nativas y Salvajes</h3>
        <p>Bosques e inmersión total</p>
      </div>
    </button>

    <!-- Tarjeta 4: Con Agua -->
    <button class="category-card" onclick="alert('Próximamente filtraremos por Con Agua')" style="background: linear-gradient(to top, rgba(0, 89, 133, 0.9) 0%, rgba(0, 89, 133, 0.2) 60%, rgba(0,89,133,0) 100%), url('image/chilean_family_buying_1784089750344.jpg') center/cover;">
      <div class="category-content">
        <div class="category-icon"><i class="fa-solid fa-water"></i></div>
        <h3>Con Agua</h3>
        <p>Ríos, lagos y vertientes</p>
      </div>
    </button>
  </div>
</section>

<style>
.category-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 280px;
  border: none;
  border-radius: 24px;
  padding: 24px;
  text-align: left;
  color: white;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

.category-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.1);
  pointer-events: none;
  transition: box-shadow 0.3s ease;
}

.category-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.15);
}

.category-card:hover::before {
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.4);
}

.category-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: white;
  font-size: 1.4rem;
  margin-bottom: 16px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.category-card:hover .category-icon {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
}

.category-content h3 {
  margin: 0 0 6px 0;
  font-size: 1.4rem;
  font-weight: 800;
  font-family: Outfit, sans-serif;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.category-content p {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.9;
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
</style>
`;

if (!content.includes('parcel-categories-section')) {
  // Try to find the section casas comment, regardless of exact spacing
  const parts = content.split('Secci\u00f3n Casas (Desbloqueable)'); // Note: replacing the encoding problem 'Seccin'
  // I will just use standard regex search.
  
  content = content.replace(/<!--.*Secci[^]*?n Casas.*-->/i, (match) => {
    return categoriesHTML + '\n' + match;
  });
  
  fs.writeFileSync(targetFile, content);
  console.log("Successfully injected category cards!");
} else {
  console.log("Category cards already exist.");
}

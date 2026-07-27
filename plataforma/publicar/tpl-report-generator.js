/**
 * tpl-report-generator.js — Generador Modular de Informe TPL Business (Tarea A-2)
 * Arquitectura 100% modular en 3 páginas A4 orientadas a alta conversión y defensa de precio.
 * Incorpora Lenguaje Ciudadano (Ajuste 1), Interpretación para el Propietario (Ajuste 2)
 * y Llamado a la Acción Comercial en Página 3 (Ajuste 3).
 */
(function(){
  'use strict';

  function formatMoney(num){
    const n = Number(num||0);
    if(isNaN(n) || !n) return '$0';
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function numberWords(num){
    const n = Math.round(Number(num||0));
    if(!n) return 'Cero pesos';
    const millones = Math.floor(n / 1000000);
    if(millones > 0) {
      return `${millones} millones de pesos (aprox.)`;
    }
    return `${formatMoney(n)} pesos`;
  }

  function formatDate(isoStr){
    const d = isoStr ? new Date(isoStr) : new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function createHeader(leadRef, pageNum, totalPages){
    const dateStr = formatDate(new Date().toISOString());
    return `
      <div class="tpl-print-header">
        <div class="tpl-print-header-brand">
          <span class="tpl-print-logo">🛡️</span>
          <div>
            <strong>TU PARCELA LISTA</strong>
            <small>INFORME PROFESIONAL DE VALORACIÓN COMERCIAL · ${dateStr}</small>
          </div>
        </div>
        <div class="tpl-print-header-meta">
          <span>REFERENCIA: <strong>${leadRef}</strong></span>
          <small>Página ${pageNum} de ${totalPages}</small>
        </div>
      </div>
    `;
  }

  function createFooter(leadRef){
    return `
      <div class="tpl-print-footer">
        <p>Informe profesional generado por <strong>Tu Parcela Lista</strong> · Referencia de expediente <strong>${leadRef}</strong> · Fecha: <strong>${formatDate(new Date().toISOString())}</strong></p>
        <small style="display:block; margin-top:2px;">Motores canónicos: Suelo v2026.07 · Vivienda v2026.07 · Catálogo Nacional v2026.07. Fórmulas algorítmicas confidenciales protegidas por secreto comercial e intelectual TPL.</small>
      </div>
    `;
  }

  /**
   * Módulo 1 y 2 (Página 1): Cabecera e Individualización + Resumen Ejecutivo de Valor
   */
  function renderPage1(valData, leadData, formValues){
    const leadRef = leadData?.leadRef || 'TPL-INFO-' + Math.floor(1000 + Math.random()*9000);
    const dateStr = formatDate(leadData?.createdAt);
    const ownerName = leadData?.name || 'Propietario / Titular';
    const ownerEmail = leadData?.email || 'No especificado';
    const location = valData?.location || formValues?.comuna || 'Sector no especificado';
    const area = Number(valData?.area || formValues?.superficie || 5000);
    const idealPrice = valData?.ideal || 0;
    const quickPrice = valData?.quick || Math.round(idealPrice * 0.90);
    const patientPrice = valData?.patient || Math.round(idealPrice * 1.10);
    const confidenceLabel = (valData?.score >= 80) ? '★★★★☆ ALTA CONFIABILIDAD' : (valData?.score >= 55) ? '★★★☆☆ CONFIABILIDAD MEDIA' : '★★☆☆☆ INICIAL';
    const pricePerM2 = area > 0 ? Math.round(idealPrice / area) : 0;

    return `
      <div class="tpl-report-page">
        ${createHeader(leadRef, 1, 3)}

        <div class="tpl-report-body">
          <div class="tpl-report-title-block">
            <span class="tpl-tag-official">INFORME PROFESIONAL TPL</span>
            <h1>Informe de Valoración Comercial</h1>
            <p class="tpl-report-subtitle">Análisis objetivo de precio, atributos territoriales y estrategias de venta para tu propiedad.</p>
          </div>

          <div class="tpl-report-section-box">
            <h3 class="tpl-box-title">📍 INDIVIDUALIZACIÓN DE LA PROPIEDAD Y TITULAR</h3>
            <div class="tpl-grid-2">
              <div>
                <small class="tpl-label">UBICACIÓN INFORMADA</small>
                <strong>${location}</strong>
              </div>
              <div>
                <small class="tpl-label">SUPERFICIE TOTAL</small>
                <strong>${area.toLocaleString('es-CL')} m² (${(area/10000).toFixed(2)} hectáreas)</strong>
              </div>
              <div>
                <small class="tpl-label">SOLICITADO POR</small>
                <strong>${ownerName}</strong>
              </div>
              <div>
                <small class="tpl-label">FECHA DE EMISIÓN</small>
                <strong>${dateStr}</strong>
              </div>
            </div>
          </div>

          <div class="tpl-report-hero-box">
            <div class="tpl-hero-top">
              <span class="tpl-hero-badge">💎 PRECIO IDEAL RECOMENDADO TPL</span>
              <span class="tpl-conf-badge">${confidenceLabel}</span>
            </div>
            <div class="tpl-hero-price">${formatMoney(idealPrice)}</div>
            <p class="tpl-hero-words">${numberWords(idealPrice)} · Valor estimado: ${formatMoney(pricePerM2)} por m²</p>
            
            <div class="tpl-hero-range">
              <div>
                <small>PISO DE NEGOCIACIÓN (LIQUIDEZ)</small>
                <span>${formatMoney(quickPrice)}</span>
              </div>
              <div class="tpl-range-line"></div>
              <div>
                <small>TECHO PATRIMONIAL (PACIENTE)</small>
                <span>${formatMoney(patientPrice)}</span>
              </div>
            </div>
          </div>

          <div class="tpl-report-text-block">
            <h3>🛡️ ¿Cómo se obtuvo esta recomendación?</h3>
            <p>Esta estimación considera los antecedentes informados sobre la propiedad, su ubicación, superficie, conectividad y servicios disponibles. El resultado sirve como orientación comercial para definir un precio de publicación y conversar con potenciales compradores.</p>
          </div>
        </div>

        ${createFooter(leadRef)}
      </div>
    `;
  }

  /**
   * Módulo 3 y 4 (Página 2): Desglose de Atributos + Interpretación para el Propietario (Ajuste 2)
   */
  function renderPage2(valData, leadData, formValues){
    const leadRef = leadData?.leadRef || 'TPL-INFO-' + Math.floor(1000 + Math.random()*9000);
    const luz = formValues?.luz || 'Si, en el terreno';
    const agua = formValues?.agua || 'Agua de pozo / APR';
    const camino = formValues?.acceso || 'Buen estado';
    const topo = formValues?.topografia || 'Plana o lomaje suave';
    const idealPrice = valData?.ideal || 0;
    const quickPrice = valData?.quick || Math.round(idealPrice * 0.90);
    const patientPrice = valData?.patient || Math.round(idealPrice * 1.10);

    return `
      <div class="tpl-report-page">
        ${createHeader(leadRef, 2, 3)}

        <div class="tpl-report-body">
          <h2 class="tpl-page-heading">🔍 Factores que influyen en el valor estimado</h2>
          <p class="tpl-page-lead">Estos antecedentes fueron considerados para construir la recomendación comercial:</p>

          <div class="tpl-attributes-grid">
            <div class="tpl-attr-card">
              <div class="tpl-attr-icon">⚡</div>
              <div>
                <h4>Conectividad Eléctrica</h4>
                <p>${luz}</p>
                <span class="tpl-attr-tag positive">✓ Aporta valor directo</span>
              </div>
            </div>
            <div class="tpl-attr-card">
              <div class="tpl-attr-icon">💧</div>
              <div>
                <h4>Factibilidad de Agua</h4>
                <p>${agua}</p>
                <span class="tpl-attr-tag positive">✓ Factor altamente valorado</span>
              </div>
            </div>
            <div class="tpl-attr-card">
              <div class="tpl-attr-icon">🚗</div>
              <div>
                <h4>Acceso y Conectividad</h4>
                <p>${camino}</p>
                <span class="tpl-attr-tag neutral">✓ Antecedente considerado</span>
              </div>
            </div>
            <div class="tpl-attr-card">
              <div class="tpl-attr-icon">📐</div>
              <div>
                <h4>Topografía y Aprovechamiento</h4>
                <p>${topo}</p>
                <span class="tpl-attr-tag positive">✓ Atributo informado</span>
              </div>
            </div>
          </div>

          <div class="tpl-owner-interpretation-box">
            <h3 class="tpl-interp-title">💡 ¿CÓMO INTERPRETAR ESTA RECOMENDACIÓN PARA TU VENTA?</h3>
            <p class="tpl-interp-sub">Para vender con éxito, debes elegir tu estrategia según tu tiempo y urgencia:</p>
            
            <div class="tpl-strategies-comparison">
              <div class="tpl-strat-item">
                <div class="tpl-strat-header">
                  <strong>1. Venta Rápida (Liquidez)</strong>
                  <span class="tpl-strat-price">${formatMoney(quickPrice)}</span>
                </div>
                <p><strong>Tiempo estimado: 1 a 3 meses.</strong> Es un precio atractivo diseñado para captar inversionistas o compradores que compran al contado y buscan una oportunidad clara.</p>
              </div>

              <div class="tpl-strat-item recommended">
                <div class="tpl-strat-header">
                  <strong>2. Precio Ideal TPL (Recomendado)</strong>
                  <span class="tpl-strat-price">${formatMoney(idealPrice)}</span>
                </div>
                <p><strong>Tiempo estimado: 3 a 6 meses.</strong> Busca equilibrar el valor esperado con una probabilidad razonable de recibir consultas. El tiempo real de venta dependerá de la demanda, la presentación de la propiedad y la negociación.</p>
              </div>

              <div class="tpl-strat-item">
                <div class="tpl-strat-header">
                  <strong>3. Venta Paciente (Retorno Máximo)</strong>
                  <span class="tpl-strat-price">${formatMoney(patientPrice)}</span>
                </div>
                <p><strong>Tiempo estimado: 6 a 12 meses o más.</strong> Puede ser adecuado cuando no existe urgencia, considerando que un precio más alto normalmente requiere más tiempo y una presentación comercial sólida.</p>
              </div>
            </div>
          </div>
        </div>

        ${createFooter(leadRef)}
      </div>
    `;
  }

  /**
   * Módulo 5 y 6 (Página 3): Certificación Criptográfica + Llamado a la Acción Comercial (Ajuste 3)
   */
  function renderPage3(valData, leadData, formValues){
    const leadRef = leadData?.leadRef || 'TPL-INFO-' + Math.floor(1000 + Math.random()*9000);
    const dateStr = formatDate(leadData?.createdAt);
    const ownerName = leadData?.name || 'Titular de la Propiedad';

    return `
      <div class="tpl-report-page">
        ${createHeader(leadRef, 3, 3)}

        <div class="tpl-report-body">
          <h2 class="tpl-page-heading">📄 Referencia y alcance del informe</h2>
          <p class="tpl-page-lead">Este documento resume una estimación comercial generada con los antecedentes entregados por el solicitante y las reglas vigentes del sistema TPL.</p>

          <div class="tpl-verification-box">
            <div class="tpl-verif-left">
              <div class="tpl-verif-badge">INFORME GENERADO POR TPL</div>
              <h4>Datos de identificación</h4>
              <ul>
                <li><strong>Referencia de solicitud:</strong> ${leadRef}</li>
                <li><strong>Fecha de generación:</strong> ${dateStr}</li>
                <li><strong>Estado:</strong> Informe referencial generado</li>
              </ul>
            </div>
          </div>

          <div class="tpl-commercial-cta-box">
            <div class="tpl-cta-header">
              <span>🚀 PASO SIGUIENTE</span>
              <h3>¿Quieres hacer realidad este precio y vender con apoyo profesional?</h3>
            </div>
            <p class="tpl-cta-desc">En Tu Parcela Lista no solo calculamos el valor de tu terreno; <strong>te ayudamos a conseguir al comprador correcto</strong> con la mayor seguridad y sin dolores de cabeza.</p>
            
            <div class="tpl-cta-benefits">
              <div><span>✓</span> <strong>Publicación Destacada:</strong> Presenta tu propiedad con información clara, fotografías y una estrategia de precio.</div>
              <div><span>✓</span> <strong>Asesoría Especializada:</strong> Filtramos curiosos y te acompañamos en la negociación para defender tu precio.</div>
              <div><span>✓</span> <strong>Coordinación Comercial:</strong> Orientación para ordenar los próximos pasos y derivación a profesionales cuando corresponda.</div>
            </div>

            <div class="tpl-cta-action">
              <a href="https://wa.me/56988508361?text=Hola,%20tengo%20mi%20informe%20${leadRef}%20y%20quiero%20apoyo%20para%20vender%20mi%20parcela" target="_blank" class="tpl-print-btn-whatsapp">
                <span>💬</span> Contáctanos por WhatsApp para Asesoría Personalizada ➔
              </a>
              <small>O continúa tu publicación directamente en nuestra plataforma online.</small>
            </div>
          </div>

          <div class="tpl-legal-disclaimer">
            <h4>ALCANCE LEGAL Y CONDICIONES DE USO</h4>
            <p>1. Naturaleza del Informe: El presente informe constituye una estimación comercial de valor referencial elaborada en base a modelos algorítmicos comparativos y antecedentes aportados por el titular. No reemplaza un peritaje judicial, una tasación bancaria hipotecaria ni un estudio de títulos pericial en terreno.</p>
            <p>2. Vigencia: La metodología y los criterios internos pertenecen a Tu Parcela Lista. Debido a que el mercado cambia, se recomienda actualizar la estimación cuando cambien los antecedentes de la propiedad o transcurran 90 días.</p>
          </div>

          <div class="tpl-signatures">
            <div class="tpl-sig-line">
              <strong>Sistema de Valoración Nacional</strong>
              <span>Tu Parcela Lista SpA</span>
            </div>
            <div class="tpl-sig-line">
              <strong>${ownerName}</strong>
              <span>Titular / Propietario Solicitante</span>
            </div>
          </div>
        </div>

        ${createFooter(leadRef)}
      </div>
    `;
  }

  /**
   * Abre o renderiza el contenedor del informe en pantalla con botones de control.
   */
  function openReport(valData, leadData, formValues){
    let container = document.getElementById('tplReportPrintContainer');
    if(!container){
      container = document.createElement('div');
      container.id = 'tplReportPrintContainer';
      document.body.appendChild(container);
    }

    const html = `
      <div class="tpl-report-topbar">
        <div class="tpl-report-topbar-brand">
          <span class="tpl-report-topbar-icon">🛡️</span>
          <div>
            <strong>Informe Profesional TPL Business</strong>
            <small>Referencia ${leadData?.leadRef || 'TPL'} · Listo para guardar en PDF o imprimir</small>
          </div>
        </div>
        <div class="tpl-report-topbar-actions">
          <button type="button" class="btn ghost tpl-btn-close-report" onclick="window.TPLReportGenerator.closeReport()">✖ Volver al Tasador</button>
          <button type="button" class="btn primary tpl-btn-print-report" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
        </div>
      </div>
      <div class="tpl-report-pages-wrap">
        ${renderPage1(valData, leadData, formValues)}
        ${renderPage2(valData, leadData, formValues)}
        ${renderPage3(valData, leadData, formValues)}
      </div>
    `;

    container.innerHTML = html;
    container.hidden = false;
    document.body.classList.add('tpl-report-open');

    // Req 9: Guardar copia en Supabase Storage asociada al expediente
    try {
      const client = typeof window.getSupabaseClient === 'function' ? window.getSupabaseClient() : null;
      if (client && client.storage && leadData?.leadRef) {
        const fileName = `reportes/${leadData.leadRef}/${Date.now()}_informe_tpl_business.html`;
        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        client.storage.from('publicaciones').upload(fileName, blob, { upsert: true }).catch(() => {});
      }
    } catch (_) {}

    // Registrar evento de apertura en CRM
    if(window.TPLValuationCRM?.event && valData?.sessionId){
      window.TPLValuationCRM.event(valData.sessionId, 'informe_pdf_visualizado', { leadRef: leadData?.leadRef });
    }
  }

  function closeReport(){
    const container = document.getElementById('tplReportPrintContainer');
    if(container) container.hidden = true;
    document.body.classList.remove('tpl-report-open');
  }

  window.TPLReportGenerator = {
    openReport,
    closeReport,
    renderPage1,
    renderPage2,
    renderPage3
  };
})();

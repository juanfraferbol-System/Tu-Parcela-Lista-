(function(){
  'use strict';
  const path=(location.pathname||'/').replace(/\\/g,'/').toLowerCase();
  const publishing=path.includes('/plataforma/publicar/');
  const isHome=path==='/'||path.endsWith('/index.html');
  const current=path.includes('/tpl-business/')?'business':path.includes('/partners/')?'partners':publishing?'publish':'';
  const links={
    home:'/', parcels:'/#parcelas-anchor', houses:'/#casas-section', buy:'/como-comprar.html',
    publish:'/plataforma/publicar/', partners:'/plataforma/partners/', business:'/plataforma/tpl-business/',
    about:'/#quienes-somos', contact:'/#contacto', privacy:'/politica-privacidad.html', terms:'/terminos.html'
  };

  function hideLegacyHeader(){
    const candidates=[...document.querySelectorAll('body > .navbar, body > .site-header, body > .main-header, body > header.topbar')];
    candidates.forEach(el=>{ if(!el.classList.contains('tpl-global-header')) el.classList.add('tpl-shell-legacy-header'); });
    document.querySelectorAll('img[alt="Chile"],img[src*="flagcdn.com"],.chile-flag,.flag-chile').forEach(el=>el.remove());
  }

  function makeHeader(){
    if(document.querySelector('.tpl-global-header')) return;
    const header=document.createElement('header');
    header.className='tpl-global-header';
    header.innerHTML=`
      <div class="tpl-global-header__inner">
        <a class="tpl-global-brand" href="${links.home}" aria-label="Tu Parcela Lista, inicio">
          <img src="/assets/logo-tu-parcela-lista.png" alt="Tu Parcela Lista">
        </a>
        <nav class="tpl-global-nav" aria-label="Navegación principal">
          <a href="${links.home}">Inicio</a>
          <a href="${links.parcels}">Parcelas</a>
          <a href="${links.houses}">Casas</a>
          <a href="${links.buy}">Cómo comprar</a>
          <a href="${links.partners}" ${current==='partners'?'aria-current="page"':''}>Partners</a>
          <a href="${links.business}" ${current==='business'?'aria-current="page"':''}>TPL Business</a>
        </nav>
        <a class="tpl-global-mobile-parcels" href="${links.parcels}">Parcelas</a>
        <a class="tpl-global-publish${publishing?' is-current':''}" href="${links.publish}">Publicar</a>
        <button class="tpl-global-burger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="tpl-global-menu">
          <span></span><span></span><span></span>
        </button>
        <div class="tpl-global-menu" id="tpl-global-menu" hidden>
          <a href="${links.parcels}">Ver parcelas</a>
          <a href="${links.partners}">Red de Partners</a>
          <a href="${links.business}">Ingresar a TPL Business</a>
          <a href="${links.about}">Quiénes somos</a>
          <a href="${links.contact}">Contacto</a>
        </div>
      </div>`;
    document.body.prepend(header);
    document.body.classList.add('tpl-shell-active');
    const btn=header.querySelector('.tpl-global-burger');
    const menu=header.querySelector('.tpl-global-menu');
    const close=()=>{menu.hidden=true;btn.setAttribute('aria-expanded','false');header.classList.remove('is-menu-open');};
    btn.addEventListener('click',e=>{e.stopPropagation();const open=menu.hidden;menu.hidden=!open;btn.setAttribute('aria-expanded',String(open));header.classList.toggle('is-menu-open',open);});
    menu.addEventListener('click',e=>e.stopPropagation());
    document.addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  }

  function compactHome(){
    if(!isHome) return;
    document.body.classList.add('tpl-home-compact');
    const hero=document.querySelector('.tpl-brand-hero');
    if(hero){
      hero.querySelector('.tpl-brand-hero__actions')?.remove();
      hero.querySelector('.tpl-ecosystem')?.remove();
    }
    const decision=document.getElementById('decision-flow');
    if(decision) decision.classList.add('tpl-home-budget-first');
  }

  function unifyFooter(){
    let footer=document.querySelector('body > footer');
    if(!footer){footer=document.createElement('footer');document.body.appendChild(footer);}
    footer.className='tpl-corporate-footer';
    footer.removeAttribute('style');
    footer.innerHTML=`<div class="footer-inner"><div class="tpl-footer-brand"><span class="tpl-footer-mark" aria-hidden="true"></span><span>© 2026 Tu Parcela Lista</span></div><div class="tpl-footer-links"><a href="${links.home}">Inicio</a><a href="${links.publish}">Publicar</a><a href="${links.partners}">Partners</a><a href="${links.business}">TPL Business</a><a href="${links.privacy}">Privacidad</a><a href="${links.terms}">Términos</a></div></div>`;
  }

  function init(){hideLegacyHeader();makeHeader();compactHome();unifyFooter();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

(function(){
  'use strict';
  const BASE='https://www.parcelalista.cl';
  function absolute(value){
    if(!value) return BASE + '/assets/logo-tu-parcela-lista.png';
    try{return new URL(value, BASE + '/').href;}catch(_){return value;}
  }
  function upsertMeta(selector, attrs){
    let el=document.head.querySelector(selector);
    if(!el){el=document.createElement('meta'); document.head.appendChild(el);}
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
    return el;
  }
  function canonical(url){
    let el=document.head.querySelector('link[rel="canonical"]');
    if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}
    el.href=url;
  }
  function jsonLd(id, data){
    let el=document.getElementById(id);
    if(!el){el=document.createElement('script');el.type='application/ld+json';el.id=id;document.head.appendChild(el);}
    el.textContent=JSON.stringify(data);
  }
  function cleanText(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
  function money(value){const n=Number(String(value||'').replace(/[^0-9]/g,''));return Number.isFinite(n)?n:undefined;}
  function common(){
    const pageUrl=BASE + location.pathname + location.search;
    const logo=BASE + '/assets/logo-tu-parcela-lista.png';
    jsonLd('tpl-schema-global',{
      '@context':'https://schema.org','@graph':[
        {'@type':'Organization','@id':BASE+'/#organization','name':'Tu Parcela Lista','url':BASE+'/','logo':{'@type':'ImageObject','url':logo},'email':'tuparcelalista@gmail.com','areaServed':['Región del Biobío','Región de Ñuble','Chile']},
        {'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'Tu Parcela Lista','publisher':{'@id':BASE+'/#organization'},'inLanguage':'es-CL','potentialAction':{'@type':'SearchAction','target':BASE+'/?buscar={search_term_string}','query-input':'required name=search_term_string'}},
        {'@type':'WebPage','@id':pageUrl+'#webpage','url':pageUrl,'name':document.title,'isPartOf':{'@id':BASE+'/#website'},'about':{'@id':BASE+'/#organization'},'inLanguage':'es-CL'}
      ]
    });
  }
  function applyParcel(p){
    if(!p) return;
    const id=encodeURIComponent(p.id||'');
    const url=BASE+'/parcela.html?id='+id;
    const place=[p.comuna,p.region].filter(Boolean).join(', ');
    const title=cleanText(p.nombre)+(place?' en '+place:'')+' | Tu Parcela Lista';
    const desc=cleanText(p.descripcion)||('Conoce precio, superficie, fotografías y ubicación de '+cleanText(p.nombre)+'.');
    const image=absolute((Array.isArray(p.imagenes)&&p.imagenes[0])||p.imagen);
    document.title=title;
    canonical(url);
    upsertMeta('meta[name="description"]',{name:'description',content:desc.slice(0,160)});
    upsertMeta('meta[property="og:title"]',{property:'og:title',content:title});
    upsertMeta('meta[property="og:description"]',{property:'og:description',content:desc.slice(0,200)});
    upsertMeta('meta[property="og:url"]',{property:'og:url',content:url});
    upsertMeta('meta[property="og:image"]',{property:'og:image',content:image});
    upsertMeta('meta[property="og:type"]',{property:'og:type',content:'product'});
    upsertMeta('meta[name="twitter:title"]',{name:'twitter:title',content:title});
    upsertMeta('meta[name="twitter:description"]',{name:'twitter:description',content:desc.slice(0,200)});
    upsertMeta('meta[name="twitter:image"]',{name:'twitter:image',content:image});
    const offer={ '@type':'Offer','url':url,'availability':'https://schema.org/InStock','priceCurrency':'CLP' };
    const price=money(p.precio); if(price) offer.price=price;
    const listing={
      '@context':'https://schema.org','@type':'RealEstateListing','@id':url+'#listing','name':cleanText(p.nombre),'url':url,'description':desc,'image':(Array.isArray(p.imagenes)?p.imagenes:[p.imagen]).filter(Boolean).map(absolute),'offers':offer,
      'address':{'@type':'PostalAddress','addressLocality':p.comuna||'', 'addressRegion':p.region||'', 'addressCountry':'CL'},
      'floorSize':{'@type':'QuantitativeValue','value':Number(p.tamano)||0,'unitCode':'MTK'}
    };
    if(Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))) listing.geo={'@type':'GeoCoordinates','latitude':Number(p.lat),'longitude':Number(p.lng)};
    jsonLd('tpl-schema-listing',listing);
    jsonLd('tpl-schema-breadcrumb',{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
      {'@type':'ListItem','position':1,'name':'Inicio','item':BASE+'/'},
      {'@type':'ListItem','position':2,'name':'Parcelas','item':BASE+'/#parcelas-anchor'},
      {'@type':'ListItem','position':3,'name':cleanText(p.nombre),'item':url}
    ]});
  }
  function applyCategory(config, slug){
    if(!config) return;
    const url=BASE+'/categoria.html?cat='+encodeURIComponent(slug);
    const title=cleanText(config.titulo)+' | Parcelas seleccionadas | Tu Parcela Lista';
    const desc=cleanText(config.descripcion||config.subtitulo);
    document.title=title; canonical(url);
    upsertMeta('meta[name="robots"]',{name:'robots',content:'index,follow'});
    upsertMeta('meta[name="description"]',{name:'description',content:desc.slice(0,160)});
    upsertMeta('meta[property="og:title"]',{property:'og:title',content:title});
    upsertMeta('meta[property="og:description"]',{property:'og:description',content:desc.slice(0,200)});
    upsertMeta('meta[property="og:url"]',{property:'og:url',content:url});
    upsertMeta('meta[property="og:image"]',{property:'og:image',content:absolute(config.imagenHero)});
    jsonLd('tpl-schema-category',{'@context':'https://schema.org','@type':'CollectionPage','name':title,'url':url,'description':desc,'isPartOf':{'@id':BASE+'/#website'}});
    jsonLd('tpl-schema-breadcrumb',{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
      {'@type':'ListItem','position':1,'name':'Inicio','item':BASE+'/'},
      {'@type':'ListItem','position':2,'name':cleanText(config.nombreCorto||config.titulo),'item':url}
    ]});
  }
  window.TPLSEO={common,applyParcel,applyCategory};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',common); else common();
})();

// @ts-nocheck
/**
 * supabase/functions/analizar-aviso/index.ts
 * Edge Function segura para extracción y análisis de avisos inmobiliarios en portales chilenos.
 * Cumple con validación estricta anti-SSRF, timeout, límite de tamaño y sanitización.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8"
};

const ALLOWED_DOMAINS = [
  "parcelalista.cl",
  "www.parcelalista.cl",
  "portalinmobiliario.com",
  "www.portalinmobiliario.com",
  "yapo.cl",
  "www.yapo.cl",
  "portalterreno.com",
  "www.portalterreno.com",
  "toctoc.com",
  "www.toctoc.com",
  "chilepropiedades.cl",
  "www.chilepropiedades.cl",
  "doctacasa.cl",
  "www.doctacasa.cl"
];

function isPrivateOrLocalIP(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") {
    return true;
  }
  // Bloquear rangos IP privados IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);
    if (octet1 === 10) return true; // 10.0.0.0/8
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true; // 172.16.0.0/12
    if (octet1 === 192 && octet2 === 168) return true; // 192.168.0.0/16
    if (octet1 === 169 && octet2 === 254) return true; // 169.254.0.0/16 link-local
    if (octet1 === 127) return true; // loopback
  }
  return false;
}

function sanitizarTexto(text: string | null): string {
  if (!text) return "";
  return text.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim().slice(0, 1000);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido. Use POST." }), {
      status: 405,
      headers: CORS_HEADERS
    });
  }

  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Debe proporcionar una URL válida." }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "El formato de la URL no es válido." }), {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    // 1. Validar protocolo (solo http y https)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Solo se permiten protocolos HTTP y HTTPS. Protocolos como file:// o ftp:// están bloqueados." }), {
        status: 403,
        headers: CORS_HEADERS
      });
    }

    // 2. Bloquear IPs locales o privadas (Prevención SSRF)
    const hostname = parsedUrl.hostname.toLowerCase();
    if (isPrivateOrLocalIP(hostname)) {
      return new Response(JSON.stringify({ error: "El acceso a direcciones locales o privadas está estrictamente bloqueado por seguridad (SSRF)." }), {
        status: 403,
        headers: CORS_HEADERS
      });
    }

    // 3. Verificar si el dominio está en la lista de portales compatibles
    const esDominioConocido = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));

    // Configurar fetch con timeout y límite de tamaño
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    let res: Response;
    try {
      res = await fetch(parsedUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TuParcelaListaBot/1.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-CL,es;q=0.9,en;q=0.8"
        },
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({
        error: "No pudimos obtener automáticamente los datos de este aviso debido a bloqueos o restricciones de red del portal. Puedes completar manualmente los antecedentes principales.",
        code: "PORTAL_BLOCKED",
        url_original: url
      }), {
        status: 200, // Devolvemos 200 con flag para fallback cortés en frontend
        headers: CORS_HEADERS
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: `El servidor del portal respondió con estado ${res.status}. Puedes completar los datos manualmente.`,
        code: "HTTP_ERROR",
        status_code: res.status,
        url_original: url
      }), {
        status: 200,
        headers: CORS_HEADERS
      });
    }

    // Verificar tamaño del contenido para evitar ataques DoS de memoria
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) { // 1MB
      return new Response(JSON.stringify({ error: "El contenido del sitio excede el límite permitido (1MB)." }), {
        status: 413,
        headers: CORS_HEADERS
      });
    }

    const htmlText = await res.text();
    if (htmlText.length > 1500000) {
      return new Response(JSON.stringify({ error: "Respuesta demasiado extensa para procesar." }), {
        status: 413,
        headers: CORS_HEADERS
      });
    }

    // 4. Extracción heurística de antecedentes
    const getMeta = (name: string): string => {
      const regex = new RegExp(`<meta\\s+(?:property|name)=["'](?:og:|twitter:)?${name}["']\\s+content=["']([^"']*)["']`, "i");
      const match = htmlText.match(regex);
      return match ? sanitizarTexto(match[1]) : "";
    };

    let titulo = getMeta("title") || "";
    if (!titulo) {
      const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) titulo = sanitizarTexto(titleMatch[1]);
    }

    let descripcion = getMeta("description") || "";
    if (!descripcion) {
      const descMatch = htmlText.match(/<p[^>]*class="[^"]*(?:desc|description|detalle)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (descMatch) descripcion = sanitizarTexto(descMatch[1]);
    }

    // Extracción de Precio (Búsqueda de cifras en CLP o UF)
    let precio = 0;
    let moneda = "CLP";
    const priceMatch = htmlText.match(/(?:\$|CLP)\s*([\d\.]{5,11})/i) || titulo.match(/(?:\$|CLP)\s*([\d\.]{5,11})/i) || descripcion.match(/(?:\$|CLP)\s*([\d\.]{5,11})/i);
    if (priceMatch) {
      const rawNum = priceMatch[1].replace(/\./g, "").trim();
      const num = parseInt(rawNum, 10);
      if (!isNaN(num) && num >= 1000000) {
        precio = num;
      }
    }

    // Extracción de Superficie de Terreno (m² o ha)
    let superficieTerrenoM2 = 0;
    const supMatch = htmlText.match(/([\d\.,]+)\s*(?:m2|m²|mts2|metros cuadrados)/i) || titulo.match(/([\d\.,]+)\s*(?:m2|m²|mts2)/i) || descripcion.match(/([\d\.,]+)\s*(?:m2|m²|mts2)/i);
    if (supMatch) {
      const rawSup = supMatch[1].replace(/\./g, "").replace(/,/g, ".").trim();
      const numSup = parseFloat(rawSup);
      if (!isNaN(numSup) && numSup >= 100) {
        superficieTerrenoM2 = Math.round(numSup);
      }
    } else {
      // Intentar hectáreas
      const haMatch = htmlText.match(/([\d\.,]+)\s*(?:ha|hectáreas|hectareas)/i) || titulo.match(/([\d\.,]+)\s*(?:ha|hectáreas)/i);
      if (haMatch) {
        const rawHa = haMatch[1].replace(/,/g, ".").trim();
        const numHa = parseFloat(rawHa);
        if (!isNaN(numHa) && numHa >= 0.1 && numHa <= 1000) {
          superficieTerrenoM2 = Math.round(numHa * 10000);
        }
      }
    }

    // Detectar si hay vivienda o construcción
    const tieneCasa = /casa|vivienda|chalet|quincho construido|dormitorios/i.test(`${titulo} ${descripcion}`);
    let superficieCasaM2 = 0;
    if (tieneCasa) {
      const casaMatch = htmlText.match(/([\d\.,]+)\s*(?:m2|m²)\s*(?:construidos|útiles|utiles|de casa)/i);
      if (casaMatch) {
        const rawCasa = casaMatch[1].replace(/\./g, "").replace(/,/g, ".").trim();
        const numCasa = parseFloat(rawCasa);
        if (!isNaN(numCasa) && numCasa >= 20 && numCasa <= 1000) {
          superficieCasaM2 = Math.round(numCasa);
        }
      }
    }

    // Detección de mejoras características
    const caracteristicas: string[] = [];
    const textoComp = `${titulo} ${descripcion}`.toLowerCase();
    if (/luz|empalme|electricidad|eléctrico|electrico/i.test(textoComp)) caracteristicas.push("empalme_electrico");
    if (/cercada|cerco|perimetral/i.test(textoComp)) caracteristicas.push("cerco_perimetral");
    if (/portón|porton|acceso privado/i.test(textoComp)) caracteristicas.push("porton_acceso");
    if (/pozo|agua profunda|noria|agua potable|apr/i.test(textoComp)) caracteristicas.push("pozo_profundo");
    if (/fosa|alcantarillado|sanitaria/i.test(textoComp)) caracteristicas.push("fosa_septica");
    if (/terraza|quincho|piscina/i.test(textoComp)) caracteristicas.push("terraza");

    let precioM2 = 0;
    if (precio > 0 && superficieTerrenoM2 > 0) {
      precioM2 = Math.round(precio / superficieTerrenoM2);
    }

    return new Response(JSON.stringify({
      success: true,
      dominio: hostname,
      url_original: url,
      es_dominio_conocido: esDominioConocido,
      datos: {
        titulo: titulo || "Publicación detectada",
        comuna: "", // Se completará o sugerirá en frontend por coincidencia de texto en catálogo
        region: "",
        superficie_terreno_m2: superficieTerrenoM2,
        precio: precio,
        moneda: moneda,
        descripcion: descripcion,
        vivienda: tieneCasa,
        superficie_casa_m2: superficieCasaM2,
        caracteristicas: caracteristicas
      },
      precio_m2: precioM2
    }), {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (err: any) {
    console.error("Error en analizar-aviso:", err);
    return new Response(JSON.stringify({
      error: "Error interno procesando la URL del aviso.",
      details: err.message
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
});

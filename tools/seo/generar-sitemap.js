console.log("Iniciando generador de sitemap...");

const fs = require("fs");
const path = require("path");

const dominio = "https://parcelalista.cl";
const rootDir = path.join(__dirname, "..", "..");

const paginas = [
  "",
  "index.html",
  "parcelas.html",
  "cotizador.html",
  "como-comprar.html",
  "plataforma/publicar-parcela/"
];

const fecha = new Date().toISOString().split("T")[0];

const urls = paginas.map((pagina) => {
  const loc = pagina ? `${dominio}/${pagina}` : `${dominio}/`;

  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${fecha}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${pagina === "" ? "1.0" : "0.8"}</priority>
  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

fs.writeFileSync(path.join(rootDir, "sitemap.xml"), sitemap, "utf8");

console.log("Sitemap generado correctamente: sitemap.xml");


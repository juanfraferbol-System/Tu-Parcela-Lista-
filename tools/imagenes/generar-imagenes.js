const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = path.join(__dirname, "..", "..", "originales");
const outputDir = path.join(__dirname, "..", "..", "procesadas");

const sizes = [
  { name: "small", width: 400 },
  { name: "medium", width: 800 },
  { name: "large", width: 1600 },
];

const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];

async function crearCarpetas() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (const size of sizes) {
    const dir = path.join(outputDir, size.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function procesarImagenes() {
  await crearCarpetas();

  if (!fs.existsSync(inputDir)) {
    console.log("No existe la carpeta originales.");
    return;
  }

  const files = fs.readdirSync(inputDir);

  if (files.length === 0) {
    console.log("La carpeta originales está vacía.");
    return;
  }

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();

    if (!validExtensions.includes(ext)) continue;

    const fileName = path.basename(file, ext);
    const inputPath = path.join(inputDir, file);

    for (const size of sizes) {
      const outputPath = path.join(
        outputDir,
        size.name,
        `${fileName}_${size.name}.webp`
      );

      await sharp(inputPath)
        .rotate()
        .resize({
          width: size.width,
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
        })
        .toFile(outputPath);

      console.log(`Creada: ${fileName}_${size.name}.webp`);
    }
  }

  console.log("");
  console.log("Todas las imágenes fueron procesadas correctamente.");
}

procesarImagenes().catch((error) => {
  console.error("Error al procesar imágenes:", error);
});


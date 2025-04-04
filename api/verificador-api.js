// verificador-api.js - Maneja solicitudes POST para pendientes y aprobaciones

const { Octokit } = require("@octokit/rest");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const repo = "angelos2024/verificador";

  if (!GITHUB_TOKEN) {
    console.error("❌ GITHUB_TOKEN no definido");
    return res.status(500).json({ error: "Token GitHub no configurado" });
  }

  console.log("🔐 GITHUB_TOKEN recibido. Inicializando Octokit...");

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  const { tipo, producto } = req.body;

  console.log("📥 Tipo recibido:", tipo);
  console.log("📦 Producto recibido:", producto);

  try {
    // Obtener SHA y contenido de un archivo JSON del repo
    async function obtenerArchivo(ruta) {
      console.log(`📂 Obteniendo archivo: ${ruta}`);
      const res = await octokit.repos.getContent({
        owner: "angelos2024",
        repo: "verificador",
        path: ruta
      });
      const json = Buffer.from(res.data.content, 'base64').toString();
      console.log(`📄 Archivo ${ruta} cargado con éxito`);
      return { sha: res.data.sha, contenido: JSON.parse(json) };
    }

    // Guardar un JSON de nuevo al repo
    async function guardarArchivo(ruta, nuevoContenido, mensaje, sha) {
      console.log(`💾 Guardando archivo: ${ruta}...`);
      const contentEncoded = Buffer.from(JSON.stringify(nuevoContenido, null, 2)).toString("base64");
      await octokit.repos.createOrUpdateFileContents({
        owner: "angelos2024",
        repo: "verificador",
        path: ruta,
        message: mensaje,
        content: contentEncoded,
        sha: sha
      });
      console.log(`✅ Archivo ${ruta} guardado correctamente`);
    }

    if (tipo === "pendiente") {
      const { sha, contenido } = await obtenerArchivo("pendientes.json");
      contenido.push(producto);
      await guardarArchivo("pendientes.json", contenido, `📩 Nuevo producto en revisión: ${producto.nombre}`, sha);
      return res.status(200).json({ mensaje: "Producto enviado para revisión" });
    }

    if (tipo === "aprobar") {
      const baseFile = "base_tahor_tame.json";
      const pendFile = "pendientes.json";

      const { sha: shaBase, contenido: base } = await obtenerArchivo(baseFile);
      const { sha: shaPend, contenido: pendientes } = await obtenerArchivo(pendFile);

      const nuevosPendientes = pendientes.filter(p => p.id !== producto.id);
      base.push(producto);

      await guardarArchivo(baseFile, base, `✅ Producto aprobado: ${producto.nombre}`, shaBase);
      await guardarArchivo(pendFile, nuevosPendientes, `🗑️ Quitado de pendientes: ${producto.nombre}`, shaPend);

      return res.status(200).json({ mensaje: "Producto aprobado y agregado" });
    }

    if (tipo === "rechazar") {
      const { sha, contenido } = await obtenerArchivo("pendientes.json");
      const nuevos = contenido.filter(p => p.id !== producto.id);
      await guardarArchivo("pendientes.json", nuevos, `❌ Producto rechazado: ${producto.nombre}`, sha);
      return res.status(200).json({ mensaje: "Producto rechazado y eliminado" });
    }

    return res.status(400).json({ error: "Tipo de acción inválido" });
  } catch (error) {
    console.error("🔥 Error API:", error);
    return res.status(500).json({ error: "Error en el servidor", detalle: error.message });
  }
};

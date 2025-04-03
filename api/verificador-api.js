// verificador-api.js (para Vercel / Netlify Function)
// ⚠️ Requiere que configures el TOKEN como variable de entorno segura

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permiten peticiones POST' });
  }

  const nuevoProducto = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Token se define en entorno
  const repo = 'angelos2024/verificador';
  const archivo = 'base_tahor_tame.json';

  try {
    // Obtener contenido actual
    const resData = await fetch(`https://api.github.com/repos/${repo}/contents/${archivo}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    const json = await resData.json();
    const sha = json.sha;
    const base64Content = json.content;
    const originalContent = Buffer.from(base64Content, 'base64').toString('utf-8');
    const base = JSON.parse(originalContent);

    // Agregar nuevo producto
    base.push(nuevoProducto);

    const nuevoContenido = Buffer.from(JSON.stringify(base, null, 2)).toString('base64');

    // Hacer commit con el nuevo contenido
    const updateRes = await fetch(`https://api.github.com/repos/${repo}/contents/${archivo}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Agregado: ${nuevoProducto.nombre}`,
        content: nuevoContenido,
        sha
      })
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return res.status(500).json({ error: 'Error actualizando archivo', detalle: err });
    }

    return res.status(200).json({ mensaje: 'Producto agregado correctamente a GitHub' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en la función', detalle: error.message });
  }
};

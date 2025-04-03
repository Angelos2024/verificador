// verificador-api.js con CORS y depuración

module.exports = async (req, res) => {
  // 🔓 Habilitar CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Respuesta rápida a preflight CORS
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se permiten peticiones POST' });
  }

  const nuevoProducto = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const repo = 'angelos2024/verificador';
  const archivo = 'base_tahor_tame.json';

  if (!GITHUB_TOKEN) {
    console.log('❌ GITHUB_TOKEN no definido');
    return res.status(500).json({ error: 'Token de GitHub no configurado en entorno' });
  }

  try {
    console.log('➡️ Obteniendo contenido actual del archivo JSON...');
    const resData = await fetch(`https://api.github.com/repos/${repo}/contents/${archivo}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!resData.ok) {
      const err = await resData.text();
      console.log('❌ Error al obtener el archivo:', err);
      return res.status(500).json({ error: 'No se pudo obtener el archivo', detalle: err });
    }

    const json = await resData.json();
    const sha = json.sha;
    const base64Content = json.content;
    const originalContent = Buffer.from(base64Content, 'base64').toString('utf-8');
    const base = JSON.parse(originalContent);

    console.log('✅ Archivo obtenido correctamente. Productos actuales:', base.length);

    // Agregar producto nuevo
    base.push(nuevoProducto);
    const nuevoContenido = Buffer.from(JSON.stringify(base, null, 2)).toString('base64');

    console.log('✏️ Subiendo nuevo contenido a GitHub...');
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
      const errText = await updateRes.text();
      console.log('❌ Error al subir el archivo:', errText);
      return res.status(500).json({ error: 'Error al actualizar GitHub', detalle: errText });
    }

    console.log('✅ Producto agregado y subido exitosamente a GitHub.');
    return res.status(200).json({ mensaje: 'Producto agregado correctamente a GitHub' });

  } catch (error) {
    console.error('🔥 Error inesperado en la función:', error);
    return res.status(500).json({ error: 'Error inesperado', detalle: error.message });
  }
};

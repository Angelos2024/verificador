// main.js - Integración con filtro por marca + nombre y coincidencia flexible

const solicitarAccesoBtn = document.getElementById('solicitarAcceso');
const entradaImagen = document.getElementById('entradaImagen');
const resultadoDiv = document.getElementById('analisisResultado');
const registroManualDiv = document.getElementById('registroManual');
const mensajeUsuario = document.getElementById('mensajeUsuario');

// Botón principal
solicitarAccesoBtn.addEventListener('click', async () => {
  const marca = document.getElementById('marcaEntrada').value.trim();
  const nombre = document.getElementById('nombreEntrada').value.trim();

  if (!marca || !nombre) {
    alert("⚠️ Por favor completa la marca y el nombre del producto.");
    return;
  }

  resultadoDiv.innerHTML = '<p><strong>🔍 Buscando en base de datos...</strong></p>';
  const resultado = await buscarPorMarcaYNombre(marca, nombre);

  if (resultado) {
    resultadoDiv.innerHTML += `<p style="color:${resultado.tahor ? 'green' : 'red'}">
    ✔ Producto encontrado:<br><strong>${resultado.nombre}</strong> (${resultado.marca})<br>
    Resultado: ${resultado.tahor ? 'Tahor ✅' : 'Tame ❌'}</p>`;
    return;
  }

  resultadoDiv.innerHTML += `<p>🧪 No se encontró coincidencia. Puedes subir imagen para análisis OCR.</p>`;
  entradaImagen.click(); // permitir escaneo si no se encontró
});

// OCR si se elige imagen
entradaImagen.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  resultadoDiv.innerHTML = '<p><strong>Analizando imagen con OCR...</strong></p>';
  registroManualDiv.style.display = 'none';

  const reader = new FileReader();
  reader.onload = async function () {
    const imageDataUrl = reader.result;

    try {
      const { data: { text } } = await Tesseract.recognize(
        imageDataUrl,
        'spa',
        { logger: m => console.log(m) }
      );

      const textoPlano = text.replace(/\n/g, ' ').toLowerCase();
      resultadoDiv.innerHTML += `<p><strong>Texto detectado:</strong><br>${textoPlano}</p>`;

      const ingredientesDetectados = textoPlano
        .split(/,|\.|:/)
        .map(i => i.trim())
        .filter(i => i.length > 2);

      if (!textoPlano.includes("ingrediente") || ingredientesDetectados.length < 3) {
        resultadoDiv.innerHTML += `<p style="color:orange">⚠️ No se pudo detectar una lista válida de ingredientes.</p>`;
      }

      resultadoDiv.innerHTML += `<p style="color:blue">🔍 Producto no encontrado. Puedes registrarlo a continuación.</p>`;
      registroManualDiv.style.display = 'block';

    } catch (err) {
      resultadoDiv.innerHTML = '<p style="color:red;">❌ Error al procesar la imagen.</p>';
      console.error(err);
    }
  };

  reader.readAsDataURL(file);
});

// Función flexible de búsqueda por marca y nombre
function normalizarTexto(texto) {
  return texto.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .toLowerCase();
}

async function buscarPorMarcaYNombre(marca, nombre) {
  try {
    const res = await fetch('https://raw.githubusercontent.com/angelos2024/verificador/main/base_tahor_tame.json');
    const base = await res.json();

    const marcaN = normalizarTexto(marca);
    const nombreN = normalizarTexto(nombre);

    return base.find(p => {
      const m = normalizarTexto(p.marca);
      const n = normalizarTexto(p.nombre);

      // Coincidencia flexible: exacto, incluye, plural/singular
      return (
        m.includes(marcaN) && n.includes(nombreN) ||
        marcaN.includes(m) && nombreN.includes(n)
      );
    });

  } catch (error) {
    console.error("Error al buscar en base de datos:", error);
    return null;
  }
}

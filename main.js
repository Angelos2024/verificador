// main.js con integración de OpenFoodFacts

const solicitarAccesoBtn = document.getElementById('solicitarAcceso');
const entradaImagen = document.getElementById('entradaImagen');
const resultadoDiv = document.getElementById('analisisResultado');
const registroManualDiv = document.getElementById('registroManual');
const mensajeUsuario = document.getElementById('mensajeUsuario');

let marcaGlobal = '';
let nombreGlobal = '';
let eanGlobal = '';

// Al presionar el botón de escanear
solicitarAccesoBtn.addEventListener('click', async () => {
  const marca = document.getElementById('marcaEntrada').value.trim();
  const nombre = document.getElementById('nombreEntrada').value.trim();
  const ean = document.getElementById('eanEntrada')?.value.trim();

  if (!marca || !nombre) {
    alert("⚠️ Por favor completa la marca y el nombre del producto.");
    return;
  }

  marcaGlobal = marca;
  nombreGlobal = nombre;
  eanGlobal = ean;

  resultadoDiv.innerHTML = '<p><strong>🔍 Buscando en OpenFoodFacts...</strong></p>';
  const resultado = await buscarEnOpenFoodFacts(nombre, ean);

  if (resultado) {
    resultadoDiv.innerHTML += resultado;
    return;
  }

  resultadoDiv.innerHTML += `<p>🧪 Producto no encontrado en OpenFoodFacts. Puedes subir imagen para análisis OCR.</p>`;
  entradaImagen.click();
});

// OCR en caso de que no se encuentre en OpenFoodFacts
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
      resultadoDiv.innerHTML += `<p><strong>Texto detectado por OCR:</strong><br>${textoPlano}</p>`;

      const ingredientesDetectados = textoPlano
        .split(/,|\.|:/)
        .map(i => i.trim())
        .filter(i => i.length > 2);

      if (ingredientesDetectados.length > 0) {
        const impuros = ingredientesDetectados.filter(i => isTame(i));
        if (impuros.length > 0) {
          resultadoDiv.innerHTML += `<p style="color:red">❌ No Apto (Tame)<br>Contiene: ${impuros.join(', ')}</p>`;
        } else {
          resultadoDiv.innerHTML += `<p style="color:green">✅ Apto (Tahor)</p>`;
        }
      } else {
        resultadoDiv.innerHTML += `<p style="color:orange">⚠️ No se detectaron ingredientes válidos.</p>`;
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

// Buscar producto en OpenFoodFacts
async function buscarEnOpenFoodFacts(nombre, ean) {
  try {
    let url = "";

    if (ean && /^[0-9]{8,14}$/.test(ean)) {
      url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
    } else {
      const nombreBusqueda = encodeURIComponent(nombre);
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${nombreBusqueda}&search_simple=1&action=process&json=1`;
    }

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();

    let producto = null;

    if (data.status === 1 && data.product) {
      // Resultado cuando se busca por EAN
      producto = data.product;
    } else if (data.products && data.products.length > 0) {
      // Resultado cuando se busca por nombre
      producto = data.products[0];
    }

    if (!producto || !producto.ingredients_text) return null;

    const textoIngredientes = producto.ingredients_text.toLowerCase();
    const lista = textoIngredientes
      .split(/,|\.|:/)
      .map(i => i.trim())
      .filter(i => i.length > 2);

    const impuros = lista.filter(i => isTame(i));
    if (impuros.length > 0) {
      return `<p style="color:red;">❌ No Apto (Tame)<br><small>Contiene: ${impuros.join(', ')}</small></p>`;
    } else {
      return `<p style="color:green;">✅ Apto (Tahor)</p>`;
    }

  } catch (err) {
    console.error("Error al consultar OpenFoodFacts:", err);
    return null;
  }
}


// main.js completo con singularización, normalización, escaneo, base local y administración

function normalizeYsingularizar(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(w => w.endsWith("s") && !w.endsWith("es") ? w.slice(0, -1) : w)
    .join(" ");
}

const botonBusqueda = document.getElementById('botonBusqueda');
const escanearCodigoBtn = document.getElementById('escanearCodigo');
const resultadoDiv = document.getElementById('analisisResultado');
const registroManualDiv = document.getElementById('registroManual');
const mensajeUsuario = document.getElementById('mensajeUsuario');

let marcaGlobal = '';
let nombreGlobal = '';
let eanGlobal = '';

if (escanearCodigoBtn) {
  escanearCodigoBtn.addEventListener('click', async () => {
    const codeReader = new ZXing.BrowserBarcodeReader();
    const previewElem = document.createElement('video');
    previewElem.setAttribute('style', 'width:100%; max-width:300px; margin-bottom:1rem;');
    resultadoDiv.innerHTML = '<p><strong>📷 Escaneando... permite acceso a la cámara</strong></p>';
    resultadoDiv.appendChild(previewElem);

    try {
      const result = await codeReader.decodeOnceFromVideoDevice(undefined, previewElem);
      document.getElementById('eanEntrada').value = result.text;
      resultadoDiv.innerHTML = `<p><strong>✅ Código detectado:</strong> ${result.text}</p>`;
    } catch (err) {
      console.error('Error escaneando:', err);
      resultadoDiv.innerHTML = '<p style="color:red;">❌ No se pudo leer el código. Intenta nuevamente.</p>';
    } finally {
      codeReader.reset();
    }
  });
}

botonBusqueda.addEventListener('click', async () => {
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

  resultadoDiv.innerHTML = '<p><strong>🔍 Buscando en base de datos local...</strong></p>';
  const resultado = await buscarEnOpenFoodFacts(nombre, ean);

  if (resultado) {
    resultadoDiv.innerHTML += resultado;
  } else {
    resultadoDiv.innerHTML += `<p>🧪 Producto no encontrado. Puedes registrarlo a continuación.</p>`;
    registroManualDiv.style.display = 'block';
  }
});

async function buscarEnOpenFoodFacts(nombre, ean) {
  try {
    let base = await fetch("https://raw.githubusercontent.com/angelos2024/verificador/main/base_tahor_tame.json")
      .then(r => r.json());

    const nombreNorm = normalizeYsingularizar(nombreGlobal);
    const marcaNorm = normalizeYsingularizar(marcaGlobal);

    const yaRegistrado = base.find(p =>
      normalizeYsingularizar(p.nombre) === nombreNorm &&
      normalizeYsingularizar(p.marca) === marcaNorm
    );

    if (yaRegistrado) {
      const htmlIngredientes = yaRegistrado.ingredientes.map(ing => {
        return isTame(ing)
          ? `<span style="color:red;">${ing}</span>`
          : `<span>${ing}</span>`;
      }).join(', ');

      return `<p><strong>${yaRegistrado.nombre}</strong> – ${yaRegistrado.marca}</p>
              <p>Ingredientes: ${htmlIngredientes}</p>
              <p style="color:${yaRegistrado.tahor ? 'green' : 'red'};">
              ${yaRegistrado.tahor ? '✅ Apto (Tahor)' : '❌ No Apto (Tame)'}</p>`;
    }

    let url = "";
    if (ean && /^[0-9]{8,14}$/.test(ean)) {
      url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
    } else {
      const nombreBusqueda = encodeURIComponent(nombre);
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${nombreBusqueda}&search_simple=1&action=process&json=1`;
    }

    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();

    let producto = null;
    if (data.status === 1 && data.product) {
      producto = data.product;
    } else if (data.products && data.products.length > 0) {
      producto = data.products[0];
    }

    if (!producto) return null;

    let imagen = producto.image_front_url
      ? `<img src="${producto.image_front_url}" alt="Imagen del producto" style="max-width:200px;"><br><br>`
      : '';

    if (!producto.ingredients_text) {
      registroManualDiv.style.display = 'block';
      return `<p><strong>${producto.product_name || 'Producto sin nombre'}</strong></p>
              ${imagen}
              <p style="color:orange;">⚠️ Producto encontrado pero sin ingredientes disponibles.</p>
              <p>Por favor, registra el producto manualmente si conoces sus ingredientes.</p>`;
    }

    const textoIngredientes = producto.ingredients_text.toLowerCase();
    const lista = textoIngredientes
      .split(/,|\.|:/)
      .map(i => i.trim())
      .filter(i => i.length > 2);

    let htmlIngredientes = lista.map(ing => {
      return isTame(ing)
        ? `<span style="color:red;">${ing}</span>`
        : `<span>${ing}</span>`;
    }).join(', ');

    const contieneTame = lista.some(i => isTame(i));
    if (contieneTame) registroManualDiv.style.display = 'block';

    return `<p><strong>${producto.product_name || 'Producto sin nombre oficial'}</strong></p>
            ${imagen}
            <p>Ingredientes: ${htmlIngredientes}</p>
            <p style="color:${contieneTame ? 'red' : 'green'};">
            ${contieneTame ? '❌ No Apto (Tame)' : '✅ Apto (Tahor)'}</p>`;
  } catch (err) {
    console.error("Error al consultar OpenFoodFacts:", err);
    return null;
  }
}

function abrirTahor() {
  document.getElementById('menuInicial').style.display = 'none';
  document.getElementById('bloqueTahor').style.display = 'block';
  document.getElementById('registroManual').style.display = 'block';
  resultadoDiv.innerHTML = '';
  mensajeUsuario.innerHTML = '';
}

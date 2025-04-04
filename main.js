
// main.js COMPLETO con IA, base local, normalización, escaneo y panel admin

function normalizeYsingularizar(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

  if (!ean && (!marca || !nombre)) {
    alert("⚠️ Completa al menos Marca y Nombre, o solo Código de Barras.");
    return;
  }

  marcaGlobal = marca;
  nombreGlobal = nombre;
  eanGlobal = ean;

  resultadoDiv.innerHTML = '<p><strong>🔍 Buscando en base local...</strong></p>';

  const base = await fetch("base_tahor_tame.json").then(r => r.json());
  const clave = normalizeYsingularizar(marca + " " + nombre);
  const encontrado = base.find(p =>
    normalizeYsingularizar(p.marca + " " + p.nombre) === clave
  );

  if (encontrado) {
    const ing = encontrado.ingredientes.map(i =>
      isTame(i) ? `<span style="color:red">${i}</span>` : `<span>${i}</span>`).join(', ');
    resultadoDiv.innerHTML += `
      <p><strong>${encontrado.nombre}</strong> – ${encontrado.marca} (${encontrado.pais})</p>
      <p>Ingredientes: ${ing}</p>
      <p style="color:${encontrado.tahor ? 'green' : 'red'};">
        ${encontrado.tahor ? '✅ Apto (Tahor)' : '❌ No Apto (Tame)'}
      </p>`;
    return;
  }

  resultadoDiv.innerHTML += "<p><strong>🤖 Consultando IA (OpenAI)...</strong></p>";

  try {
    const iaRes = await fetch("/api/ia-verificador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, ingredientes: [] })
    }).then(r => r.json());

    if (iaRes.resultado) {
      resultadoDiv.innerHTML += `
        <p><strong>Resultado IA:</strong> ${iaRes.resultado === "tahor" ? "✅ Apto (Tahor)" : "❌ No Apto (Tame)"}</p>
        <p><em>🧠 Motivo: ${iaRes.motivo}</em></p>`;
      return;
    }
  } catch (err) {
    console.warn("IA no respondió, se continúa con OpenFoodFacts");
  }

  resultadoDiv.innerHTML += '<p><strong>🌐 Consultando OpenFoodFacts...</strong></p>';
  const res = await buscarEnOpenFoodFacts(nombre, ean);
  resultadoDiv.innerHTML += res || "<p>❌ No se encontró información del producto.</p>";
});

async function buscarEnOpenFoodFacts(nombre, ean) {
  try {
    let url = "";
    if (ean && /^[0-9]{8,14}$/.test(ean)) {
      url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
    } else {
      const nombreBusqueda = encodeURIComponent(nombre);
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${nombreBusqueda}&search_simple=1&action=process&json=1`;
    }

    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    const prod = data.product || (data.products && data.products[0]);
    if (!prod) return null;

    const ingredientes = prod.ingredients_text || "";
    const lista = ingredientes.toLowerCase().split(/,|\./).map(i => i.trim()).filter(i => i.length > 1);
    const htmlIng = lista.map(ing => isTame(ing) ? `<span style="color:red">${ing}</span>` : `<span>${ing}</span>`).join(', ');
    const tame = lista.some(i => isTame(i));

    return `<p><strong>${prod.product_name || 'Producto'}</strong></p>
            <p>Ingredientes: ${htmlIng}</p>
            <p style="color:${tame ? 'red' : 'green'};">
            ${tame ? '❌ No Apto (Tame)' : '✅ Apto (Tahor)'}</p>`;
  } catch (e) {
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

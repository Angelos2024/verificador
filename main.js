// main.js con escaneo opcional, registro abierto y diseño adaptable

const botonBusqueda = document.getElementById('botonBusqueda');
const escanearCodigoBtn = document.getElementById('escanearCodigo');
const resultadoDiv = document.getElementById('analisisResultado');
const registroManualDiv = document.getElementById('registroManual');
const mensajeUsuario = document.getElementById('mensajeUsuario');

let marcaGlobal = '';
let nombreGlobal = '';
let eanGlobal = '';

// Escaneo de código de barras usando ZXing (opcional)
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

// Búsqueda general (marca y nombre obligatorios, código opcional)
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

  resultadoDiv.innerHTML = '<p><strong>🔍 Buscando en OpenFoodFacts...</strong></p>';
  const resultado = await buscarEnOpenFoodFacts(nombre, ean);

  if (resultado) {
    resultadoDiv.innerHTML += resultado;
  } else {
    resultadoDiv.innerHTML += `<p>🧪 Producto no encontrado. Puedes registrarlo a continuación.</p>`;
    registroManualDiv.style.display = 'block';
  }
});

// Buscar en OpenFoodFacts
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

    if (contieneTame) {
      registroManualDiv.style.display = 'block';
    }

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

// Registro manual con validación de duplicados y carga a GitHub
document.getElementById('formRegistroManual').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nuevo = {
    id: Date.now(),
    marca: document.getElementById('marcaManual').value.trim(),
    nombre: document.getElementById('nombreManual').value.trim(),
    pais: document.getElementById('paisManual').value.trim(),
    ingredientes: document.getElementById('ingredientesManual').value.trim().split(',').map(x => x.trim().toLowerCase()),
    tahor: false,
    estado: 'pendiente'
  };

  try {
    const listaPendientes = await fetch("https://raw.githubusercontent.com/angelos2024/verificador/main/pendientes.json")
      .then(r => r.json());

    const existe = listaPendientes.some(p =>
      p.nombre.toLowerCase() === nuevo.nombre.toLowerCase() &&
      p.marca.toLowerCase() === nuevo.marca.toLowerCase()
    );

    if (existe) {
      mensajeUsuario.innerHTML = "⚠️ Este producto ya está en revisión. ¡Gracias por tu contribución!";
      return;
    }

    const res = await fetch("https://verificador-git-main-angels-projects-b6cdd5b1.vercel.app/api/verificador-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "pendiente", producto: nuevo })
    });

    const data = await res.json();

    if (res.ok) {
      mensajeUsuario.innerHTML = "✅ Producto enviado a revisión. ¡Gracias!";
      document.getElementById('formRegistroManual').reset();
      // No ocultamos el formulario para permitir más aportes
    } else {
      console.error(data);
      mensajeUsuario.innerHTML = "❌ Error al enviar producto.";
    }

  } catch (err) {
    console.error(err);
    mensajeUsuario.innerHTML = "❌ Error de red al contactar la API.";
  }
});

// Panel de administración
async function accederAdmin() {
  const pass = prompt("🔐 Ingresa la contraseña de administrador:");
  if (pass !== "lev11") {
    alert("❌ Contraseña incorrecta");
    return;
  }

  const adminPanel = document.getElementById('adminPanel');
  adminPanel.style.display = 'block';
  adminPanel.innerHTML = "<h2>🔐 Panel de Revisión de Productos</h2><p>Cargando productos pendientes...</p>";

  try {
    const res = await fetch("https://raw.githubusercontent.com/angelos2024/verificador/main/pendientes.json");
    const lista = await res.json();

    if (!lista.length) {
      adminPanel.innerHTML += "<p>✅ No hay productos pendientes.</p>";
      return;
    }

    let html = "<ul>";
    lista.forEach(p => {
      html += `<li style="margin-bottom:1rem">
        <strong>${p.nombre}</strong> – ${p.marca} (${p.pais})<br>
        Ingredientes: ${p.ingredientes.join(", ")}<br>
        <button onclick='aprobar(${p.id})'>✅ Aprobar</button>
        <button onclick='rechazar(${p.id})'>❌ Rechazar</button>
      </li>`;
    });
    html += "</ul>";

    adminPanel.innerHTML += html;
    window.listaPendientes = lista;
  } catch (err) {
    adminPanel.innerHTML += "<p style='color:red;'>❌ Error al cargar productos pendientes.</p>";
    console.error(err);
  }
}

// Aprobar producto
async function aprobar(id) {
  const producto = window.listaPendientes.find(p => p.id === id);
  if (!producto) return;

  const ok = confirm(`¿Aprobar "${producto.nombre}" de ${producto.marca}?`);
  if (!ok) return;

  const res = await fetch("https://verificador-git-main-angels-projects-b6cdd5b1.vercel.app/api/verificador-api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "aprobar", producto })
  });

  if (res.ok) {
    alert("✅ Producto aprobado");
    location.reload();
  } else {
    alert("❌ Error al aprobar");
  }
}

// Rechazar producto
async function rechazar(id) {
  const producto = window.listaPendientes.find(p => p.id === id);
  if (!producto) return;

  const ok = confirm(`¿Rechazar "${producto.nombre}" de ${producto.marca}?`);
  if (!ok) return;

  const res = await fetch("https://verificador-git-main-angels-projects-b6cdd5b1.vercel.app/api/verificador-api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "rechazar", producto })
  });

  if (res.ok) {
    alert("🗑️ Producto rechazado");
    location.reload();
  } else {
    alert("❌ Error al rechazar");
  }
}

// Mostrar verificador Tahor
function abrirTahor() {
  document.getElementById('menuInicial').style.display = 'none';
  document.getElementById('bloqueTahor').style.display = 'block';
  document.getElementById('registroManual').style.display = 'block'; // Mostrar el formulario manual siempre
  resultadoDiv.innerHTML = '';
  mensajeUsuario.innerHTML = '';
}

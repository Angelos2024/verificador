// main.js - Integración completa con backend en Vercel para subir productos aprobados

const solicitarAccesoBtn = document.getElementById('solicitarAcceso');
const entradaImagen = document.getElementById('entradaImagen');
const resultadoDiv = document.getElementById('analisisResultado');
const registroManualDiv = document.getElementById('registroManual');
const mensajeUsuario = document.getElementById('mensajeUsuario');

// Escaneo con OCR
solicitarAccesoBtn.addEventListener('click', () => {
  entradaImagen.click();
});

entradaImagen.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  resultadoDiv.innerHTML = '<p><strong>Analizando imagen...</strong></p>';
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
      resultadoDiv.innerHTML = `<p><strong>Texto detectado:</strong><br>${textoPlano}</p>`;

      const ingredientesDetectados = textoPlano
        .split(/,|\.|:/)
        .map(i => i.trim())
        .filter(i => i.length > 2);

      const resultadoBD = await buscarProductoEnBaseDatos(textoPlano);
      if (resultadoBD) {
        resultadoDiv.innerHTML += `<p style="color:${resultadoBD.tahor ? 'green' : 'red'}"><strong>✔ Producto encontrado:</strong> ${resultadoBD.nombre}<br>Resultado: ${resultadoBD.tahor ? 'Tahor ✅' : 'Tame ❌'}</p>`;
        return;
      }

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

// Registro manual
document.getElementById('formRegistroManual').addEventListener('submit', (e) => {
  e.preventDefault();

  const nuevo = {
    id: Date.now(),
    marca: document.getElementById('marcaManual').value.trim(),
    nombre: document.getElementById('nombreManual').value.trim(),
    pais: document.getElementById('paisManual').value.trim(),
    ingredientes: document.getElementById('ingredientesManual').value.trim().split(',').map(x => x.trim().toLowerCase()),
    estado: 'pendiente'
  };

  const pendientes = JSON.parse(localStorage.getItem('pendientesRevision') || '[]');
  pendientes.push(nuevo);
  localStorage.setItem('pendientesRevision', JSON.stringify(pendientes));

  mensajeUsuario.innerHTML = "✅ Producto en revisión. ¡Gracias por tu aporte!";
  document.getElementById('formRegistroManual').reset();
  registroManualDiv.style.display = 'none';
});

// Función admin: aprobar y subir producto a GitHub
async function aprobarProducto(id) {
  const pendientes = JSON.parse(localStorage.getItem('pendientesRevision') || '[]');
  const producto = pendientes.find(p => p.id === id);
  if (!producto) return;

  try {
   const response = await fetch("https://verificador-delta.vercel.app/api/verificador-api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(producto)
    });

    const data = await response.json();
    if (response.ok) {
      alert("✅ Producto aprobado y añadido a la base en GitHub");
    } else {
      console.error(data);
      alert("❌ Error al subir producto a GitHub: " + data.error);
    }

  } catch (err) {
    console.error(err);
    alert("❌ Error de red al intentar contactar la API.");
  }

  const restantes = pendientes.filter(p => p.id !== id);
  localStorage.setItem('pendientesRevision', JSON.stringify(restantes));
  location.reload();
}

// Rechazar producto
function rechazarProducto(id) {
  const pendientes = JSON.parse(localStorage.getItem('pendientesRevision') || '[]');
  const restantes = pendientes.filter(p => p.id !== id);
  localStorage.setItem('pendientesRevision', JSON.stringify(restantes));
  alert('Producto rechazado.');
  location.reload();
}

// Panel admin
function accederAdmin() {
  const clave = prompt("Introduce la clave de administrador:");
  if (clave !== 'admin123') return alert('Clave incorrecta');

  const panel = document.getElementById('adminPanel');
  panel.style.display = 'block';

  const pendientes = JSON.parse(localStorage.getItem('pendientesRevision') || '[]');
  const contenedor = document.getElementById('pendientesRevision');

  if (pendientes.length === 0) {
    contenedor.innerHTML = '<p>No hay productos pendientes.</p>';
    return;
  }

  contenedor.innerHTML = '';
  pendientes.forEach(p => {
    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.padding = '1rem';
    div.style.marginBottom = '1rem';

    div.innerHTML = `<strong>${p.nombre}</strong> (${p.marca}, ${p.pais})<br>
    Ingredientes: ${p.ingredientes.join(', ')}<br><br>
    <button onclick="aprobarProducto(${p.id})">✔ Aprobar</button>
    <button onclick="rechazarProducto(${p.id})">✖ Rechazar</button>`;

    contenedor.appendChild(div);
  });
}

// Buscar producto en base JSON remota
async function buscarProductoEnBaseDatos(texto) {
  try {
    const res = await fetch('https://raw.githubusercontent.com/angelos2024/verificador/main/base_tahor_tame.json');
    const baseDatos = await res.json();
    return baseDatos.find(p => texto.includes(p.nombre.toLowerCase()));
  } catch (error) {
    console.error("Error al cargar la base remota:", error);
    return null;
  }
}

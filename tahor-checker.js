// tahor-checker.js - Núcleo para verificar ingredientes Tame según Levítico 11

// Lista simplificada sin tradiciones rabínicas
const ingredientesTame = [
  "cerdo", "cochinilla", "carmín", "e120", "marisco",
  "camarón", "langosta", "surimi", "ostra", "almeja",
  "calamar", "pulpo", "gelatina de cerdo", "grasa de cerdo",
  "grasa animal", "sangre", "morcilla", "gusano", "insecto",
  "escorpión", "rana", "tortuga", "caballo", "burro",
  "conejo", "murciélago", "búho", "águila", "zorro",
  "zorrillo", "tiburón", "anguila"
];

function isTame(ingrediente) {
  return ingredientesTame.some(tame => ingrediente.includes(tame));
}

function analizarIngredientes(ingredientes) {
  const impuros = ingredientes.filter(i => isTame(i));
  return {
    resultado: impuros.length > 0 ? 'Tame' : 'Tahor',
    ingredientesTame: impuros
  };
}
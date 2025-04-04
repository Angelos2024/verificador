const { Configuration, OpenAIApi } = require("openai");

module.exports = async (req, res) => {
  const allowedOrigin = "https://angelos2024.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Manejo de preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Validación del método y tipo de contenido
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

if (!req.headers["content-type"]?.includes("application/json")) {
    return res.status(400).json({ error: "Tipo de contenido no válido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta clave de OpenAI" });
  }

  const { nombre, ingredientes } = req.body;
  if (!nombre || !Array.isArray(ingredientes)) {
    return res.status(400).json({ error: "Faltan datos de producto o ingredientes no válidos" });
  }

  try {
    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    const prompt = `
Eres un experto en leyes alimentarias de Levítico 11.
Analiza el siguiente producto y responde si es "Tahor" (apto) o "Tame" (no apto) según sus ingredientes o por su nombre si no se conocen los ingredientes.

Nombre del producto: ${nombre}
Ingredientes: ${ingredientes.length ? ingredientes.join(", ") : "No especificados"}

Responde SOLO en formato JSON como este:
{ "resultado": "tahor" o "tame", "motivo": "razón breve" }
`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    const respuesta = completion.data.choices[0].message.content;

    // Intentamos parsear el JSON de la IA
    const json = JSON.parse(respuesta);
    return res.status(200).json(json);

  } catch (error) {
    console.error("Error IA:", error);
    return res.status(500).json({
      error: "Error al contactar OpenAI",
      detalle: error.message || error.toString()
    });
  }
};

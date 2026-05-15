const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const OPENROUTER_MODELS = [
    "deepseek/deepseek-chat:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "openrouter/free"
];

function respuestaLocal(user) {
    const respuestas = [
        `@${user} la IA se quedó sin chakra, pero el bot sigue vivo 🫡`,
        `@${user} los modelos colapsaron, respuesta modo supervivencia activada.`,
        `@${user} la IA está en cooldown, pero yo no abandono el chat.`,
        `@${user} error místico detectado. El bot responde desde la trinchera.`
    ];

    return respuestas[Math.floor(Math.random() * respuestas.length)];
}

async function responderConOpenRouterModelo(user, msg, model) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://twitch-ia-api.onrender.com",
            "X-Title": "Twitch IA Bot"
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "Eres un bot de Twitch. Responde en español, máximo 220 caracteres, con humor breve, estilo chat gamer, sin ser ofensivo."
                },
                {
                    role: "user",
                    content: `Usuario ${user} dice: ${msg}`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter ${model} error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content?.trim();

    if (!texto) {
        throw new Error(`OpenRouter ${model} respondió vacío`);
    }

    return texto;
}

async function responderConOpenRouter(user, msg) {
    for (const model of OPENROUTER_MODELS) {
        try {
            console.log(`Intentando OpenRouter con modelo: ${model}`);
            return await responderConOpenRouterModelo(user, msg, model);
        } catch (error) {
            console.error(`Falló modelo ${model}:`, error.message);
        }
    }

    throw new Error("Fallaron todos los modelos de OpenRouter");
}

async function responderConGemini(user, msg) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Responde en español, máximo 220 caracteres, tono de chat de Twitch, con humor breve. Usuario ${user} dice: ${msg}`,
    });

    return response.text.trim();
}

app.get("/ia", async (req, res) => {
    const key = req.query.key;

    if (key !== "080899HL") {
        return res.status(403).send("No autorizado");
    }

    const user = req.query.user || "usuario";
    const msg = (req.query.msg || "").slice(0, 180);

    if (!msg) {
        return res.send(`@${user} escribe algo después del comando.`);
    }

    try {
        const texto = await responderConOpenRouter(user, msg);
        return res.send(`@${user} ${texto}`);
    } catch (errorOpenRouter) {
        console.error("Falló todo OpenRouter:", errorOpenRouter.message);
    }

    try {
        const texto = await responderConGemini(user, msg);
        return res.send(`@${user} ${texto}`);
    } catch (errorGemini) {
        console.error("Falló Gemini:", errorGemini.message);
    }

    return res.send(respuestaLocal(user));
});

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

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

const memoriasPorCanal = {
    hibaa08: {
        personalidad: "Bot chileno, sarcástico, gamer y fan del anime.",
        lore: "El chat suele bromear con One Piece, teorías absurdas y memes internos."
    },

    pantruaku: {
    personalidad: "Bot chileno, troll, caótico, fan del anime, gamer y absurdamente cursed. Habla como chat chileno real de Twitch.",

    lore: "Humor chileno Twitch real, parecido a cómo hablaría un viewer chileno gamer en Discord o Twitch. Usa remates absurdos, doble sentido y humor inmaduro cuando calce naturalmente. Puede usar palabras como weón, culiao, pico o weá de forma casual, pero no en todas las respuestas."
},

    roedorhumano: {
        personalidad: "Bot pesado, mañoso como la streamer pero relajado con el chat.",
        lore: "Humor más tranquilo, relajado, gamer, memes internos."
    }
};

async function guardarMemoria(channel, relatedUser, content) {
    try {
        const { error } = await supabase
            .from("bot_memories")
            .insert([
                {
                    channel,
                    related_user: relatedUser,
                    content
                }
            ]);

        if (error) {
            console.error("Error guardando memoria:", error.message);
        } else {
            console.log("Memoria guardada:", content);
        }

    } catch (err) {
        console.error("Error Supabase:", err.message);
    }
}

function respuestaLocal(user) {
    const respuestas = [
        `@${user} la IA se quedó sin chakra, pero el bot sigue vivo 🫡`,
        `@${user} los modelos colapsaron, respuesta modo supervivencia activada.`,
        `@${user} la IA está en cooldown, pero yo no abandono el chat.`,
        `@${user} error místico detectado. El bot responde desde la trinchera.`
    ];

    return respuestas[Math.floor(Math.random() * respuestas.length)];
}

async function responderConOpenRouterModelo(user, msg, model, channel, memoriaCanal) {
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
                    content: `
Eres el bot oficial del canal ${channel}.

Personalidad del canal:
${memoriaCanal.personalidad}

Lore del canal:
${memoriaCanal.lore}

Reglas globales:
- Responde en español.
- Máximo 160 caracteres.
- Mantén respuestas naturales, entretenidas y estilo Twitch.
- Adapta tu tono según la personalidad y lore del canal.
- No seas excesivamente ofensivo, agresivo o desagradable.
- Usa español chileno cuando el canal lo pida.
- Evita modismos no chilenos como "cuate", "mano", "parce", "pana", "wey" o "broder".
- No pongas palabras como pico, culiao o weón entre comillas.
- Prioriza sonar natural antes que usar modismos.
- Los chilenismos deben aparecer solo si encajan naturalmente.
- Evita meter palabras chilenas porque sí.
`
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

async function responderConOpenRouter(user, msg, channel, memoriaCanal) {
    for (const model of OPENROUTER_MODELS) {
        try {
            console.log(`Intentando OpenRouter con modelo: ${model}`);
            return await responderConOpenRouterModelo(user, msg, model, channel, memoriaCanal);
        } catch (error) {
            console.error(`Falló modelo ${model}:`, error.message);
        }
    }

    throw new Error("Fallaron todos los modelos de OpenRouter");
}

async function responderConGemini(user, msg, channel, memoriaCanal) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
Eres el bot oficial del canal ${channel}.

Personalidad del canal:
${memoriaCanal.personalidad}

Lore del canal:
${memoriaCanal.lore}

Responde en español, máximo 160 caracteres, tono Twitch gamer, natural y entretenido.

Usuario ${user} dice: ${msg}
`,
    });

    return response.text.trim();
}

app.get("/ia", async (req, res) => {
    const key = req.query.key;

    if (key !== "080899HL") {
        return res.status(403).send("No autorizado");
    }

    const channel = req.query.channel || "hibaa08";
    const memoriaCanal = memoriasPorCanal[channel] || memoriasPorCanal.hibaa08;

    const user = req.query.user || "usuario";
    const msg = (req.query.msg || "").slice(0, 180);

    if (!msg) {
        return res.send(`@${user} escribe algo después del comando.`);
    }

    try {
        const texto = await responderConOpenRouter(user, msg, channel, memoriaCanal);
    
const mensajeLower = msg.toLowerCase();

if (
    mensajeLower.includes("siempre") ||
    mensajeLower.includes("nunca") ||
    mensajeLower.includes("team") ||
    mensajeLower.includes("rival") ||
    mensajeLower.includes("odia") ||
    mensajeLower.includes("ama") ||
    mensajeLower.includes("one piece") ||
    mensajeLower.includes("overwatch")
) {
    await guardarMemoria(channel, user, msg);
}
    
        return res.send(`@${user} ${texto}`);
    } catch (errorOpenRouter) {
        console.error("Falló todo OpenRouter:", errorOpenRouter.message);
    }

    try {
        const texto = await responderConGemini(user, msg, channel, memoriaCanal);
        return res.send(`@${user} ${texto}`);
    } catch (errorGemini) {
        console.error("Falló Gemini:", errorGemini.message);
    }

    return res.send(respuestaLocal(user));
});

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
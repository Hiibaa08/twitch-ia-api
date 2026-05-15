const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function responderConOpenRouter(user, msg) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://twitch-ia-api.onrender.com",
            "X-Title": "Twitch IA Bot"
        },
        body: JSON.stringify({
            model: "openrouter/free",
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
        throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim();
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
    const msg = req.query.msg || "";

    if (!msg) {
        return res.send(`@${user} escribe algo después del comando.`);
    }

    try {
        let texto;

        try {
            texto = await responderConOpenRouter(user, msg);
        } catch (errorOpenRouter) {
            console.error("Falló OpenRouter:", errorOpenRouter.message);
            texto = await responderConGemini(user, msg);
        }

        if (!texto) {
            texto = "la IA se quedó pensando demasiado.";
        }

        res.send(`@${user} ${texto}`);
    } catch (error) {
        console.error("Error general:", error);
        res.send(`@${user} hubo un error con la IA.`);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
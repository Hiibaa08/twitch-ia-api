const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

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
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: `Responde en español, máximo 220 caracteres, tono de chat de Twitch, con humor breve. Usuario ${user} dice: ${msg}`,
        });

        const texto = response.text.trim();

        res.send(`@${user} ${texto}`);
    } catch (error) {
        console.error(error);
        res.send(`@${user} hubo un error con la IA.`);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/ia", (req, res) => {
    const key = req.query.key;

    if (key !== "080899HL") {
        return res.status(403).send("No autorizado");
    }

    const user = req.query.user || "usuario";
    const msg = req.query.msg || "";

    if (!msg) {
        return res.send(`@${user} escribe algo después del comando.`);
    }

    const respuestas = [
        "eso estuvo potente.",
        "la IA aprueba ese mensaje.",
        "eso tiene energía de protagonista.",
        "suena sospechosamente épico."
    ];

    const random = respuestas[Math.floor(Math.random() * respuestas.length)];

    res.send(`@${user} ${random}`);
});

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
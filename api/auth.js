// Vercel Serverless Function: Validación segura en servidor del Área Privada de Organizadoras
const crypto = require("crypto");

function safeCompare(a, b) {
    const bufA = Buffer.from(String(a), "utf8");
    const bufB = Buffer.from(String(b), "utf8");
    if (bufA.length !== bufB.length) {
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

async function readJsonBody(req) {
    if (req.body !== undefined && req.body !== null) {
        return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
    }
    return new Promise((resolve, reject) => {
        let raw = "";
        req.on("data", (chunk) => {
            raw += chunk;
        });
        req.on("end", () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on("error", reject);
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    const expectedUser = (process.env.USUARIO_PRIVADO || process.env.ADMIN_USER || "").trim();
    const expectedPass = (process.env.CONTRASENA_PRIVADA || process.env.ADMIN_PASSWORD || "").trim();

    if (!expectedUser || !expectedPass) {
        return res.status(500).json({
            ok: false,
            error: "Las credenciales privadas (USUARIO_PRIVADO / CONTRASENA_PRIVADA) no están configuradas en Vercel."
        });
    }

    let body;
    try {
        body = await readJsonBody(req);
    } catch (e) {
        return res.status(400).json({ ok: false, error: "Formato de petición inválido." });
    }

    const usuarioVal = String(body.usuario || "").trim();
    const passVal = String(body.password || "").trim();

    if (!usuarioVal || !passVal) {
        return res.status(400).json({
            ok: false,
            error: "Por favor, introduce tanto el usuario como la contraseña."
        });
    }

    const usuarioOk = safeCompare(usuarioVal.toLowerCase(), expectedUser.toLowerCase());
    const passOk = safeCompare(passVal, expectedPass);

    if (usuarioOk && passOk) {
        return res.status(200).json({ ok: true });
    }

    return res.status(401).json({
        ok: false,
        error: "Usuario o contraseña incorrectos. Inténtalo de nuevo."
    });
};

// Vercel Serverless Function: Proxy seguro hacia Google Apps Script (Google Sheets + Bot Telegram)

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

    const googleScriptUrl = (process.env.GOOGLE_SCRIPT_URL || "").trim();
    if (!googleScriptUrl) {
        return res.status(200).json({ ok: true, skipped: true });
    }

    let payload;
    try {
        payload = await readJsonBody(req);
    } catch (e) {
        return res.status(400).json({ ok: false, error: "JSON inválido." });
    }

    try {
        const gsRes = await fetch(googleScriptUrl, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                accion: String(payload.accion || "guardar"),
                id: String(payload.id || ""),
                asistencia: String(payload.asistencia || ""),
                numero_invitados: String(payload.numero_invitados ?? "0"),
                nombres: String(payload.nombres || ""),
                nombres_original: String(payload.nombres_original || payload.nombres || ""),
                detalles: String(payload.detalles || "")
            }),
            redirect: "follow"
        });

        const rawText = await gsRes.text();
        let upstream = rawText;
        try {
            upstream = JSON.parse(rawText);
        } catch (_) {
            // Respuesta no JSON
        }

        return res.status(200).json({ ok: gsRes.ok, upstream });
    } catch (err) {
        console.error("Error sincronizando con Google Apps Script:", err);
        return res.status(502).json({ ok: false, error: "No se pudo sincronizar con Google Sheets." });
    }
};

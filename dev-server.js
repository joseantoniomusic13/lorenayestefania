// Servidor de desarrollo local sin dependencias externas (emula Vercel + .env.local)
// Uso: node dev-server.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT) || 3000;

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
}

loadEnvFile(path.join(ROOT_DIR, ".env.local"));
loadEnvFile(path.join(ROOT_DIR, ".env"));

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg"
};

function enhanceResponse(res) {
    res.status = function (code) {
        res.statusCode = code;
        return res;
    };
    res.json = function (obj) {
        if (!res.headersSent) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
        }
        res.end(JSON.stringify(obj));
        return res;
    };
    return res;
}

const apiHandlers = {
    "/api/config": require("./api/config"),
    "/api/auth": require("./api/auth"),
    "/api/sheets": require("./api/sheets")
};

const server = http.createServer(async (req, res) => {
    enhanceResponse(res);
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(urlObj.pathname);

    // 1. Rutas Serverless (/api/*)
    if (apiHandlers[pathname]) {
        try {
            await apiHandlers[pathname](req, res);
        } catch (err) {
            console.error(`Error en ${pathname}:`, err);
            if (!res.writableEnded) {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
        return;
    }

    // 2. Bloquear acceso público a archivos sensibles (.env*, .git, api/, etc.)
    const normalized = path.posix.normalize(pathname);
    if (
        normalized.split("/").some((part) => part.startsWith(".")) ||
        normalized.startsWith("/api/") ||
        normalized === "/dev-server.js"
    ) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
    }

    // 3. Servir archivos estáticos
    const relativePath = normalized === "/" ? "/index.html" : normalized;
    const filePath = path.join(ROOT_DIR, relativePath);

    if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`Servidor local iniciado en http://localhost:${PORT} (usando .env.local)`);
});

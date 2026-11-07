// Vercel Serverless Function: Expone únicamente la configuración pública de Firebase
// Las credenciales privadas y la URL de Google Apps Script permanecen seguras en el servidor.

module.exports = function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const firebaseConfig = {
        apiKey: (process.env.FIREBASE_API_KEY || "").trim(),
        authDomain: (process.env.FIREBASE_AUTH_DOMAIN || "").trim(),
        projectId: (process.env.FIREBASE_PROJECT_ID || "").trim(),
        storageBucket: (process.env.FIREBASE_STORAGE_BUCKET || "").trim(),
        messagingSenderId: (process.env.FIREBASE_MESSAGING_SENDER_ID || "").trim(),
        appId: (process.env.FIREBASE_APP_ID || "").trim(),
        measurementId: (process.env.FIREBASE_MEASUREMENT_ID || "").trim()
    };

    const reservasCollection = (process.env.FIREBASE_COLLECTION || "reservas").trim();

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        return res.status(500).json({
            error: "Faltan las variables de entorno de Firebase en Vercel (FIREBASE_API_KEY, FIREBASE_PROJECT_ID)."
        });
    }

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json({
        firebaseConfig,
        reservasCollection
    });
};

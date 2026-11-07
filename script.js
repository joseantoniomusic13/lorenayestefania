// ==========================================================================
// 1. INICIALIZACIÓN DE FIREBASE FIRESTORE (SDK Oficial v13.2.0)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const esEntornoLocal = () =>
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]" ||
    window.location.protocol === "file:";

let envLocalCache = null;

/**
 * Fallback exclusivo para servidores estáticos locales (p. ej. VS Code Live Server)
 * cuando no se está ejecutando `vercel dev` ni `node dev-server.js`.
 */
async function cargarEnvLocalFallback() {
    if (!esEntornoLocal()) return null;
    if (envLocalCache) return envLocalCache;

    try {
        const res = await fetch("./.env.local", { cache: "no-store" });
        if (!res.ok) return null;
        const text = await res.text();
        const parsed = {};
        text.split(/\r?\n/).forEach(rawLine => {
            const line = rawLine.trim();
            if (!line || line.startsWith("#")) return;
            const eqIdx = line.indexOf("=");
            if (eqIdx === -1) return;
            const key = line.slice(0, eqIdx).trim();
            let val = line.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            parsed[key] = val;
        });
        envLocalCache = parsed;
        return parsed;
    } catch (e) {
        return null;
    }
}

let firestoreInstance = null;
let firestoreInitPromise = null;

/**
 * Obtiene la instancia de Firestore cargando las variables de entorno desde `/api/config` en Vercel
 * (o `.env.local` en desarrollo estático local).
 */
async function obtenerFirestore() {
    if (firestoreInstance) return firestoreInstance;
    if (firestoreInitPromise) return firestoreInitPromise;

    firestoreInitPromise = (async () => {
        try {
            let firebaseConfig = null;
            let reservasCollection = "reservas";

            const res = await fetch("/api/config");
            const contentType = res.headers.get("content-type") || "";

            if (res.ok && contentType.includes("application/json")) {
                const data = await res.json();
                firebaseConfig = data.firebaseConfig;
                reservasCollection = data.reservasCollection || "reservas";
            } else if (esEntornoLocal()) {
                const localEnv = await cargarEnvLocalFallback();
                if (localEnv && localEnv.FIREBASE_API_KEY) {
                    firebaseConfig = {
                        apiKey: localEnv.FIREBASE_API_KEY,
                        authDomain: localEnv.FIREBASE_AUTH_DOMAIN || "",
                        projectId: localEnv.FIREBASE_PROJECT_ID || "",
                        storageBucket: localEnv.FIREBASE_STORAGE_BUCKET || "",
                        messagingSenderId: localEnv.FIREBASE_MESSAGING_SENDER_ID || "",
                        appId: localEnv.FIREBASE_APP_ID || "",
                        measurementId: localEnv.FIREBASE_MEASUREMENT_ID || ""
                    };
                    reservasCollection = localEnv.FIREBASE_COLLECTION || "reservas";
                }
            }

            if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
                throw new Error("Configuración de Firebase no disponible. Revisa las variables de entorno en Vercel o .env.local.");
            }

            const app = initializeApp(firebaseConfig);
            try {
                getAnalytics(app);
            } catch (e) {
                console.warn("Firebase Analytics no disponible en este entorno:", e);
            }

            const db = getFirestore(app);
            firestoreInstance = { db, reservasCollection };
            return firestoreInstance;
        } catch (err) {
            firestoreInitPromise = null;
            throw err;
        }
    })();

    return firestoreInitPromise;
}

// Pre-inicializar en segundo plano sin bloquear la interfaz
obtenerFirestore().catch(err => {
    console.warn("Aviso inicializando Firebase:", err.message);
});

// ==========================================================================
// 2. CUENTA ATRÁS Y FUNCIONES DE LA WEB PÚBLICA
// ==========================================================================
const weddingDate = new Date("May 15, 2027 18:30:00").getTime();

setInterval(function () {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    const days = Math.max(0, Math.floor(distance / (1000 * 60 * 60 * 24)));
    const hours = Math.max(0, Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
    const seconds = Math.max(0, Math.floor((distance % (1000 * 60)) / 1000));

    const elDays = document.getElementById("days");
    const elHours = document.getElementById("hours");
    const elMinutes = document.getElementById("minutes");
    const elSeconds = document.getElementById("seconds");

    if (elDays) elDays.innerHTML = days;
    if (elHours) elHours.innerHTML = hours;
    if (elMinutes) elMinutes.innerHTML = minutes;
    if (elSeconds) elSeconds.innerHTML = seconds;
}, 1000);

// Mostrar/Ocultar Mapa de Google Maps
const btnMap = document.getElementById("btn-map");
const mapContainer = document.getElementById("map-container");

if (btnMap && mapContainer) {
    btnMap.addEventListener("click", function (e) {
        e.preventDefault();
        if (mapContainer.style.display === "none" || mapContainer.style.display === "") {
            mapContainer.style.display = "block";
        } else {
            mapContainer.style.display = "none";
        }
    });
}

// Copiado rápido del código de WedShoots
const btnCopyWedshoots = document.getElementById("btn-copy-wedshoots");
const wedshootsCodeText = document.getElementById("wedshoots-code-text");

if (btnCopyWedshoots && wedshootsCodeText) {
    btnCopyWedshoots.addEventListener("click", async function () {
        const code = wedshootsCodeText.textContent.trim();
        try {
            await navigator.clipboard.writeText(code);
        } catch (err) {
            const tempInput = document.createElement("textarea");
            tempInput.value = code;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
        }

        const originalHTML = btnCopyWedshoots.innerHTML;
        btnCopyWedshoots.classList.add("copied");
        btnCopyWedshoots.innerHTML = '<i class="ph ph-check-bold"></i> <span>¡Copiado!</span>';
        mostrarToast(`Código WedShoots (${code}) copiado al portapapeles`, "success");

        setTimeout(() => {
            btnCopyWedshoots.classList.remove("copied");
            btnCopyWedshoots.innerHTML = originalHTML;
        }, 2500);
    });
}

// Música de Fondo
const musicBtn = document.getElementById("music-btn");
const bgMusic = document.getElementById("bg-music");
let musicStarted = false;

if (musicBtn && bgMusic) {
    document.body.addEventListener("click", function () {
        if (!musicStarted) {
            bgMusic.play().then(() => {
                musicStarted = true;
                musicBtn.innerHTML = '<i class="ph ph-speaker-high"></i>';
            }).catch(() => {});
        }
    }, { once: true });

    musicBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (bgMusic.paused) {
            bgMusic.play();
            musicBtn.innerHTML = '<i class="ph ph-speaker-high"></i>';
            musicStarted = true;
        } else {
            bgMusic.pause();
            musicBtn.innerHTML = '<i class="ph ph-speaker-slash"></i>';
        }
    });
}

// Menú Móvil
const mobileMenu = document.getElementById("mobile-menu");
const navMenu = document.getElementById("nav-menu");

if (mobileMenu && navMenu) {
    mobileMenu.addEventListener("click", () => {
        navMenu.classList.toggle("active");
        const icon = mobileMenu.querySelector("i");
        if (navMenu.classList.contains("active")) {
            icon.classList.replace("ph-list", "ph-x");
        } else {
            icon.classList.replace("ph-x", "ph-list");
        }
    });

    navMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("active");
            const icon = mobileMenu.querySelector("i");
            if (icon) icon.classList.replace("ph-x", "ph-list");
        });
    });
}

// ==========================================================================
// 3. GENERADOR DINÁMICO DE CAMPOS DE INVITADOS (Público y Manual/CRUD)
// ==========================================================================

/**
 * Genera dinámicamente los campos de asistentes dentro de un contenedor.
 * @param {HTMLElement} container - Contenedor donde insertar las filas
 * @param {number} count - Número de asistentes (0 a 10)
 * @param {string} prefix - Prefijo para evitar colisión de IDs ('public' o 'manual')
 * @param {Array} valoresPrevios - Datos previos para pre-rellenar al editar o cambiar número
 * @param {string} nombresNoAsistenPrevio - Valor previo si count === 0
 */
function renderizarFilasInvitados(container, count, prefix = "public", valoresPrevios = [], nombresNoAsistenPrevio = "") {
    if (!container) return;
    container.innerHTML = "";

    const isManual = prefix === "manual";
    const namePrefix = isManual ? "manual-" : "";

    if (count > 0) {
        for (let i = 1; i <= count; i++) {
            const prev = valoresPrevios[i - 1] || {};
            const nombreVal = prev.nombre || "";
            const menuVal = (prev.menu || "adulto").toLowerCase().includes("ni") ? "niño" : "adulto";
            const tieneAlergia = Boolean(prev.tieneAlergia);
            const alergiaVal = tieneAlergia && prev.alergia && prev.alergia !== "Ninguna" ? prev.alergia : "";
            const busVal = (prev.bus || "si").toLowerCase().startsWith("n") ? "no" : "si";

            const guestDiv = document.createElement("div");
            guestDiv.className = "guest-row fade-in";

            guestDiv.innerHTML = `
                <h4><i class="ph ph-user-focus"></i> Invitado ${i}</h4>
                <div class="input-group">
                    <i class="ph ph-user"></i>
                    <input type="text" name="${namePrefix}nombre-${i}" placeholder="Nombre y apellidos" value="${escaparAtributo(nombreVal)}" required>
                </div>
                
                <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">Menú</p>
                <div class="radio-group">
                    <input type="radio" name="${namePrefix}menu-${i}" id="${namePrefix}menu-adulto-${i}" value="adulto" class="hidden-radio" required ${menuVal === "adulto" ? "checked" : ""}>
                    <label class="radio-btn" for="${namePrefix}menu-adulto-${i}">🍽️ Adulto</label>
                    
                    <input type="radio" name="${namePrefix}menu-${i}" id="${namePrefix}menu-nino-${i}" value="niño" class="hidden-radio" ${menuVal === "niño" ? "checked" : ""}>
                    <label class="radio-btn" for="${namePrefix}menu-nino-${i}">👶 Niño</label>
                </div>
                
                <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">¿Alguna alergia o intolerancia?</p>
                <div class="radio-group" style="margin-bottom: 10px;">
                    <input type="radio" name="${namePrefix}has-allergy-${i}" id="${namePrefix}allergy-no-${i}" value="no" class="hidden-radio allergy-toggle" data-target="${namePrefix}allergy-detail-${i}" ${!tieneAlergia ? "checked" : ""}>
                    <label class="radio-btn" for="${namePrefix}allergy-no-${i}">No</label>

                    <input type="radio" name="${namePrefix}has-allergy-${i}" id="${namePrefix}allergy-si-${i}" value="si" class="hidden-radio allergy-toggle" data-target="${namePrefix}allergy-detail-${i}" ${tieneAlergia ? "checked" : ""}>
                    <label class="radio-btn" for="${namePrefix}allergy-si-${i}">⚠️ Sí</label>
                </div>
                
                <div class="allergy-details ${tieneAlergia ? "active" : ""}" id="${namePrefix}allergy-detail-${i}">
                    <div class="input-group" style="margin-bottom: 15px;">
                        <i class="ph ph-warning-circle"></i>
                        <input type="text" name="${namePrefix}alergia-tipo-${i}" placeholder="Especifique... (ej. Celíaco, Lactosa, Frutos secos)" value="${escaparAtributo(alergiaVal)}" ${tieneAlergia ? 'required="true"' : ""}>
                    </div>
                </div>

                <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">¿Necesitarás servicio de autobús?</p>
                <div class="radio-group" style="margin-bottom: 0px;">
                    <input type="radio" name="${namePrefix}bus-${i}" id="${namePrefix}bus-si-${i}" value="si" class="hidden-radio" required ${busVal === "si" ? "checked" : ""}>
                    <label class="radio-btn" for="${namePrefix}bus-si-${i}">🚌 Sí, por favor</label>

                    <input type="radio" name="${namePrefix}bus-${i}" id="${namePrefix}bus-no-${i}" value="no" class="hidden-radio" ${busVal === "no" ? "checked" : ""}>
                    <label class="radio-btn" for="${namePrefix}bus-no-${i}">🚗 No, por mi cuenta</label>
                </div>
            `;
            container.appendChild(guestDiv);
        }

        // Activar listeners de alergias
        const allergyToggles = container.querySelectorAll(".allergy-toggle");
        allergyToggles.forEach(toggle => {
            toggle.addEventListener("change", function () {
                const targetId = this.getAttribute("data-target");
                const targetDiv = document.getElementById(targetId);
                if (!targetDiv) return;
                const inputField = targetDiv.querySelector("input");

                if (this.value === "si") {
                    targetDiv.classList.add("active");
                    if (inputField) {
                        inputField.setAttribute("required", "true");
                        inputField.focus();
                    }
                } else {
                    targetDiv.classList.remove("active");
                    if (inputField) {
                        inputField.removeAttribute("required");
                        inputField.value = "";
                    }
                }
            });
        });
    } else if (count === 0) {
        const guestDiv = document.createElement("div");
        guestDiv.className = "guest-row fade-in";
        guestDiv.innerHTML = `
            <h4>Lamentamos que no puedas venir</h4>
            <p style="margin-bottom: 15px; font-size: 0.95rem;">Por favor, indícanos el nombre o los nombres de las personas que no podrán asistir:</p>
            <div class="input-group" style="margin-bottom: 0;">
                <i class="ph ph-user"></i>
                <input type="text" name="${namePrefix}nombres-no-asisten" placeholder="Nombres y apellidos..." value="${escaparAtributo(nombresNoAsistenPrevio)}" required>
            </div>
        `;
        container.appendChild(guestDiv);
    }
}

// ==========================================================================
// 4. FORMULARIO PÚBLICO RSVP (Envío a Firestore + Espejo a Google Sheets)
// ==========================================================================
const guestCountSelect = document.getElementById("guest-count");
const guestsContainer = document.getElementById("guests-container");
const btnSubmit = document.getElementById("btn-submit-rsvp");
const rsvpForm = document.getElementById("rsvp-form");

if (guestCountSelect) {
    guestCountSelect.addEventListener("change", function () {
        const count = parseInt(this.value, 10);
        const extraFields = document.getElementById("extra-fields-container");

        if (count > 0) {
            btnSubmit.style.display = "flex";
            if (extraFields) extraFields.style.display = "block";
            btnSubmit.innerHTML = `Confirmar ${count} Asistente${count > 1 ? "s" : ""} <i class="ph ph-paper-plane-right"></i>`;
            renderizarFilasInvitados(guestsContainer, count, "public");
        } else if (count === 0) {
            btnSubmit.style.display = "flex";
            if (extraFields) extraFields.style.display = "none";
            btnSubmit.innerHTML = `Confirmar No Asistencia <i class="ph ph-paper-plane-right"></i>`;
            renderizarFilasInvitados(guestsContainer, 0, "public");
        } else {
            guestsContainer.innerHTML = "";
            btnSubmit.style.display = "none";
            if (extraFields) extraFields.style.display = "none";
        }
    });
}

/**
 * Extrae los datos de un formulario (público o manual) y construye el objeto estructurado para Firestore y Google Sheets.
 */
function construirDatosReserva(formElement, countVal, prefix = "public", origen = "web") {
    const formData = new FormData(formElement);
    const isManual = prefix === "manual";
    const namePrefix = isManual ? "manual-" : "";
    const count = parseInt(countVal, 10);

    const fechaActual = new Date().toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    let nombres = "";
    let detallesLineas = [];
    let invitados = [];

    if (count === 0) {
        nombres = (formData.get(`${namePrefix}nombres-no-asisten`) || "").trim();
        detallesLineas.push("No asisten");
    } else {
        let nombresArr = [];
        for (let i = 1; i <= count; i++) {
            const nombre = (formData.get(`${namePrefix}nombre-${i}`) || "").trim();
            const menu = (formData.get(`${namePrefix}menu-${i}`) || "adulto").toLowerCase();
            const tieneAlergia = formData.get(`${namePrefix}has-allergy-${i}`) === "si";
            const alergiaRaw = (formData.get(`${namePrefix}alergia-tipo-${i}`) || "").trim();
            const alergia = tieneAlergia && alergiaRaw ? alergiaRaw : "Ninguna";
            const busRaw = formData.get(`${namePrefix}bus-${i}`) || "si";
            const busTexto = busRaw === "si" ? "Sí" : "No";

            nombresArr.push(nombre);
            invitados.push({
                nombre,
                menu,
                tieneAlergia: Boolean(tieneAlergia && alergiaRaw),
                alergia,
                bus: busRaw === "si" ? "si" : "no"
            });

            detallesLineas.push(`Invitado ${i}: ${nombre} | Menú: ${menu} | Alergias: ${alergia} | Autobús: ${busTexto}`);
        }
        nombres = nombresArr.join(", ");
    }

    const songField = isManual ? "manual-song-suggestion" : "song-suggestion";
    const cancion = (formData.get(songField) || "").trim();

    let detalles = detallesLineas.join("\n");
    if (cancion && count > 0) {
        detalles += "\nCanción sugerida: " + cancion;
    }

    return {
        asistencia: count === 0 ? "No asisten" : "Sí asisten",
        asiste: count > 0,
        numero_invitados: count,
        nombres,
        invitados,
        detalles,
        cancion: count > 0 ? cancion : "",
        origen,
        fecha: fechaActual,
        updatedAt: Date.now()
    };
}

/**
 * Envía copia espejo a Google Sheets (mantiene respaldo y bot de Telegram) a través de `/api/sheets`.
 */
async function enviarEspejoGoogleSheets(reservaObj, prefijoTag = "", meta = {}) {
    const payload = {
        accion: meta.accion || "guardar",
        id: meta.id || "",
        asistencia: reservaObj.asistencia,
        numero_invitados: String(reservaObj.numero_invitados),
        nombres: prefijoTag ? `${prefijoTag} ${reservaObj.nombres}` : reservaObj.nombres,
        nombres_original: meta.nombresOriginal || reservaObj.nombres || "",
        detalles: reservaObj.detalles
    };

    try {
        const res = await fetch("/api/sheets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        // Fallback exclusivo si se abre en local con un servidor estático (sin servidor API)
        const contentType = res.headers.get("content-type") || "";
        if ((!res.ok || !contentType.includes("application/json")) && esEntornoLocal()) {
            const localEnv = await cargarEnvLocalFallback();
            if (localEnv && localEnv.GOOGLE_SCRIPT_URL) {
                await fetch(localEnv.GOOGLE_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify(payload)
                });
            }
        }
    } catch (err) {
        console.warn("Aviso: No se pudo sincronizar con Google Sheets:", err);
    }
}

/**
 * Solicita eliminar la fila correspondiente en Google Sheets a través de `/api/sheets`.
 */
async function eliminarDeGoogleSheets(reserva) {
    const payload = {
        accion: "eliminar",
        id: reserva.id || "",
        nombres: reserva.nombres || "",
        nombres_original: reserva.nombresRaw || reserva.nombres || ""
    };

    try {
        const res = await fetch("/api/sheets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
            return await res.json();
        }

        // Fallback exclusivo si se abre en local con un servidor estático (sin servidor API)
        if (esEntornoLocal()) {
            const localEnv = await cargarEnvLocalFallback();
            if (localEnv && localEnv.GOOGLE_SCRIPT_URL) {
                await fetch(localEnv.GOOGLE_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify(payload)
                });
            }
        }
    } catch (err) {
        console.warn("Aviso: No se pudo eliminar la fila en Google Sheets:", err);
    }
    return null;
}

if (rsvpForm) {
    rsvpForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const btnSubmit = document.getElementById("btn-submit-rsvp");
        const formMessage = document.getElementById("form-message");
        const guestCount = document.getElementById("guest-count").value;

        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Enviando... <i class="ph ph-spinner icon-pulse"></i>';
        btnSubmit.disabled = true;
        if (formMessage) formMessage.style.display = "none";

        const formData = new FormData(rsvpForm);
        const reservaData = construirDatosReserva(rsvpForm, guestCount, "public", "web");

        const isModificacion = localStorage.getItem("wedding_rsvp_status") === "confirmed";
        const existingDocId = localStorage.getItem("wedding_rsvp_doc_id");

        try {
            const { db, reservasCollection } = await obtenerFirestore();

            // 1. Guardar en Firebase Firestore (colección "reservas")
            let savedDocId = existingDocId || "";
            if (isModificacion && existingDocId) {
                try {
                    await updateDoc(doc(db, reservasCollection, existingDocId), reservaData);
                } catch (updateErr) {
                    // Si el documento fue eliminado por las organizadoras, creamos uno nuevo
                    reservaData.createdAt = Date.now();
                    const newDoc = await addDoc(collection(db, reservasCollection), reservaData);
                    savedDocId = newDoc.id;
                    localStorage.setItem("wedding_rsvp_doc_id", newDoc.id);
                }
            } else {
                reservaData.createdAt = Date.now();
                const docRef = await addDoc(collection(db, reservasCollection), reservaData);
                savedDocId = docRef.id;
                localStorage.setItem("wedding_rsvp_doc_id", docRef.id);
            }

            // 2. Enviar en paralelo espejo a Google Sheets (respaldo + bot Telegram)
            await enviarEspejoGoogleSheets(reservaData, isModificacion ? "[MODIFICACIÓN]" : "", {
                accion: isModificacion ? "actualizar" : "crear",
                id: savedDocId
            });

            // 3. Guardar en localStorage para recordar en el navegador del invitado
            localStorage.setItem("wedding_rsvp_status", "confirmed");
            localStorage.setItem("wedding_rsvp_data", JSON.stringify(Object.fromEntries(formData.entries())));

            btnSubmit.innerHTML = '¡Enviado! <i class="ph ph-check-circle"></i>';
            btnSubmit.style.backgroundColor = "#27ae60";
            btnSubmit.style.color = "white";
            btnSubmit.style.boxShadow = "none";

            if (formMessage) {
                formMessage.style.display = "block";
                formMessage.style.color = "#27ae60";
                formMessage.innerHTML = "¡Gracias! Tu confirmación se ha registrado correctamente.";
            }

            setTimeout(() => {
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.style.backgroundColor = "";
                btnSubmit.disabled = false;
            }, 3500);

        } catch (error) {
            console.error("Error al guardar confirmación:", error);
            btnSubmit.innerHTML = originalBtnText;
            btnSubmit.disabled = false;
            if (formMessage) {
                formMessage.style.display = "block";
                formMessage.style.color = "#e74c3c";
                formMessage.innerHTML = "Hubo un error al conectar. Por favor, inténtalo de nuevo o contáctanos por WhatsApp.";
            }
        }
    });
}

// Pre-rellenar formulario público si el invitado ya confirmó desde su dispositivo
function loadSavedRsvpData() {
    const savedStatus = localStorage.getItem("wedding_rsvp_status");
    if (savedStatus === "confirmed") {
        const formMessage = document.getElementById("form-message");
        if (formMessage) {
            formMessage.style.display = "block";
            formMessage.style.color = "var(--text-dark)";
            formMessage.style.backgroundColor = "rgba(255, 255, 255, 0.6)";
            formMessage.style.padding = "12px";
            formMessage.style.borderRadius = "10px";
            formMessage.innerHTML = "Ya enviaste tu confirmación anteriormente. Si envías el formulario de nuevo, actualizaremos tus datos.";
        }

        try {
            const savedDataString = localStorage.getItem("wedding_rsvp_data");
            if (savedDataString) {
                const savedData = JSON.parse(savedDataString);
                if (savedData["guest-count"]) {
                    const selectEl = document.getElementById("guest-count");
                    if (selectEl) {
                        selectEl.value = savedData["guest-count"];
                        selectEl.dispatchEvent(new Event("change"));

                        setTimeout(() => {
                            const form = document.getElementById("rsvp-form");
                            for (const key in savedData) {
                                if (key === "guest-count") continue;
                                const val = savedData[key];
                                const inputs = form.querySelectorAll(`[name="${key}"]`);
                                inputs.forEach(input => {
                                    if (input.type === "radio" || input.type === "checkbox") {
                                        if (input.value === val) {
                                            input.checked = true;
                                            if (input.classList.contains("allergy-toggle")) {
                                                input.dispatchEvent(new Event("change"));
                                            }
                                        }
                                    } else {
                                        input.value = val;
                                    }
                                });
                            }
                        }, 50);
                    }
                }
            }
        } catch (e) {
            console.error("Error cargando datos guardados:", e);
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSavedRsvpData);
} else {
    loadSavedRsvpData();
}

// ==========================================================================
// 5. PANEL PRIVADO DE ORGANIZADORAS – AUTENTICACIÓN Y GESTIÓN EN TIEMPO REAL
// ==========================================================================

const btnAreaPrivada = document.getElementById("btn-area-privada");
const modalPrivado = document.getElementById("modal-privado");
const modalOverlay = document.getElementById("modal-privado-overlay");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");
const inputUsuario = document.getElementById("input-usuario-privada");
const inputPassword = document.getElementById("input-password-privada");
const btnEntrar = document.getElementById("btn-entrar-privado");
const modalErrorMsg = document.getElementById("modal-error-msg");
const modalErrorText = document.getElementById("modal-error-text");

const panelPrivado = document.getElementById("panel-privado");
const btnCerrarPanel = document.getElementById("btn-cerrar-panel");
const privadoLoading = document.getElementById("privado-loading");
const privadoStats = document.getElementById("privado-stats");
const privadoCards = document.getElementById("privado-cards");
const privadoError = document.getElementById("privado-error");

const buscadorReservas = document.getElementById("buscador-reservas");
const btnClearSearch = document.getElementById("btn-clear-search");
const filtrosContainer = document.getElementById("filtros-reservas");
const resultsCountEl = document.getElementById("app-results-count");

const modalDetalle = document.getElementById("modal-detalle");
const modalDetalleOverlay = document.getElementById("modal-detalle-overlay");
const btnCerrarDetalle = document.getElementById("btn-cerrar-detalle");
const detalleHeader = document.getElementById("detalle-header");
const detalleBody = document.getElementById("detalle-body");

// Modal de Gestión Manual / Edición
const btnNuevaReservaManual = document.getElementById("btn-nueva-reserva-manual");
const modalReservaManual = document.getElementById("modal-reserva-manual");
const modalManualOverlay = document.getElementById("modal-manual-overlay");
const btnCerrarManual = document.getElementById("btn-cerrar-manual");
const btnCancelarManual = document.getElementById("btn-cancelar-manual");
const manualForm = document.getElementById("manual-rsvp-form");
const manualEditIdInput = document.getElementById("manual-edit-id");
const manualGuestCountSelect = document.getElementById("manual-guest-count");
const manualGuestsContainer = document.getElementById("manual-guests-container");
const manualExtraFields = document.getElementById("manual-extra-fields");
const manualSongInput = document.getElementById("manual-song-suggestion");
const modalManualTitle = document.getElementById("modal-manual-title");
const modalManualSubtitle = document.getElementById("modal-manual-subtitle");
const modalManualIcon = document.getElementById("modal-manual-icon");
const btnGuardarManualText = document.getElementById("btn-guardar-manual-text");

// Estado en memoria del Panel Privado
let todasLasReservas = [];
let filtroActivo = "todos";
let textoBusqueda = "";
let unsubscribeFirestore = null;

/** Abre el modal de login privado */
function abrirModal() {
    if (!modalPrivado) return;
    modalPrivado.classList.add("activo");
    document.body.style.overflow = "hidden";
    if (modalErrorMsg) modalErrorMsg.style.display = "none";
    if (inputUsuario) inputUsuario.value = "";
    if (inputPassword) inputPassword.value = "";
    setTimeout(() => inputUsuario && inputUsuario.focus(), 180);
}

/** Cierra el modal de login privado */
function cerrarModal() {
    if (!modalPrivado) return;
    modalPrivado.classList.remove("activo");
    if (!document.body.classList.contains("app-privada-activa")) {
        document.body.style.overflow = "";
    }
}

/** Valida las credenciales del Área Privada contra `/api/auth` en Vercel */
async function validarCredenciales() {
    if (!inputUsuario || !inputPassword) return;
    const usuarioVal = inputUsuario.value.trim();
    const passVal = inputPassword.value.trim();

    const mostrarFalloLogin = (mensaje) => {
        if (modalErrorMsg) {
            modalErrorMsg.style.display = "flex";
            if (modalErrorText) {
                modalErrorText.textContent = mensaje;
            }
        }
        [inputUsuario, inputPassword].forEach(inp => {
            inp.style.borderColor = "#c0392b";
            inp.style.boxShadow = "0 0 0 3px rgba(192, 57, 43, 0.15)";
            setTimeout(() => {
                inp.style.borderColor = "";
                inp.style.boxShadow = "";
            }, 1500);
        });
        if (!usuarioVal) {
            inputUsuario.focus();
        } else {
            inputPassword.focus();
            inputPassword.select();
        }
    };

    if (!usuarioVal || !passVal) {
        mostrarFalloLogin("Por favor, introduce tanto el usuario como la contraseña.");
        return;
    }

    const originalBtnHTML = btnEntrar ? btnEntrar.innerHTML : "";
    if (btnEntrar) {
        btnEntrar.disabled = true;
        btnEntrar.innerHTML = 'Verificando... <i class="ph ph-spinner icon-pulse"></i>';
    }

    try {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: usuarioVal, password: passVal })
        });
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await res.json();
            if (res.ok && data.ok) {
                mostrarPanelPrivado();
                return;
            }
            mostrarFalloLogin(data.error || "Usuario o contraseña incorrectos. Inténtalo de nuevo.");
            return;
        }

        // Fallback exclusivo para desarrollo estático local (p. ej. VS Code Live Server)
        if (esEntornoLocal()) {
            const localEnv = await cargarEnvLocalFallback();
            const expectedUser = (localEnv && (localEnv.USUARIO_PRIVADO || localEnv.ADMIN_USER)) || "";
            const expectedPass = (localEnv && (localEnv.CONTRASENA_PRIVADA || localEnv.ADMIN_PASSWORD)) || "";
            if (
                expectedUser &&
                expectedPass &&
                usuarioVal.toLowerCase() === expectedUser.toLowerCase() &&
                passVal === expectedPass
            ) {
                mostrarPanelPrivado();
                return;
            }
            mostrarFalloLogin("Usuario o contraseña incorrectos. Inténtalo de nuevo.");
            return;
        }

        mostrarFalloLogin("No se pudo conectar con el servidor de autenticación.");
    } catch (err) {
        mostrarFalloLogin("Error de conexión al verificar credenciales.");
    } finally {
        if (btnEntrar) {
            btnEntrar.disabled = false;
            btnEntrar.innerHTML = originalBtnHTML;
        }
    }
}

/** Muestra el panel privado en modo App de pantalla completa e inicia la sincronización con Firestore */
function mostrarPanelPrivado() {
    cerrarModal();
    if (!panelPrivado) return;
    document.body.classList.add("app-privada-activa");
    document.body.style.overflow = "hidden";
    panelPrivado.style.display = "flex";
    panelPrivado.scrollTop = 0;
    iniciarEscuchaReservas();
}

/** Cierra la sesión del panel privado y vuelve a la web pública */
function cerrarPanelPrivado() {
    if (!panelPrivado) return;
    if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
    }
    panelPrivado.style.display = "none";
    document.body.classList.remove("app-privada-activa");
    document.body.style.overflow = "";
}

// ==========================================================================
// 6. NORMALIZACIÓN DE DATOS Y CONTADORES GLOBALES DE FIRESTORE
// ==========================================================================

/**
 * Normaliza un documento de Firestore para asegurar que siempre tenga el array `invitados`
 * y todas las métricas calculadas (incluso si fue creado con formato antiguo).
 */
function normalizarReserva(id, data) {
    const rawAsistencia = String(data.asistencia || "Sí asisten");
    const asiste = data.asiste !== undefined
        ? Boolean(data.asiste)
        : !(/\bno\b|lamentabl/i.test(rawAsistencia));

    const detallesTexto = String(data.detalles || data.detalle || "");
    let invitados = Array.isArray(data.invitados) ? [...data.invitados] : [];

    // Si no viene el array estructurado de invitados, extraerlo del campo detalles
    if (invitados.length === 0 && asiste && detallesTexto) {
        const limpio = detallesTexto.replace(/\nCanc[ió]n sugerida[:\s]*[^\n]*/gi, "").trim();
        const bloques = limpio.split(/\n(?=Invitado\s*\d+:)/i).filter(b => b.trim() !== "");
        bloques.forEach((bloque, idx) => {
            const mNombre = bloque.match(/Invitado\s*\d+:\s*([^|\n]+)/i);
            const mMenu = bloque.match(/Men[uú]:\s*([^|\n]+)/i);
            const mAlergia = bloque.match(/Alergias?:\s*([^|\n]+)/i);
            const mBus = bloque.match(/Autob[uú]s:\s*([^|\n]+)/i);

            const nombre = mNombre ? mNombre[1].trim() : `Invitado ${idx + 1}`;
            const menuRaw = mMenu ? mMenu[1].trim().toLowerCase() : "adulto";
            const menu = /ni[ñn]o|beb|infant/i.test(menuRaw) ? "niño" : "adulto";
            const alergia = mAlergia ? mAlergia[1].trim() : "Ninguna";
            const tieneAlergia = !/^(ninguna?|no|—|-|)$/i.test(alergia);
            const busRaw = mBus ? mBus[1].trim().toLowerCase() : "no";
            const bus = /^s[íi]/i.test(busRaw) ? "si" : "no";

            invitados.push({ nombre, menu, tieneAlergia, alergia, bus });
        });
    }

    // Extraer canción sugerida
    let cancion = String(data.cancion || "").trim();
    if (!cancion && detallesTexto) {
        const mSong = detallesTexto.match(/Canc[ió]n sugerida[:\s]*([^\n]+)/i);
        if (mSong && mSong[1]) cancion = mSong[1].trim();
    }
    if (/^(ninguna|-)$/i.test(cancion)) cancion = "";

    // Calcular métricas por reserva
    let numInvitados = 0;
    let adultosCount = 0;
    let ninosCount = 0;
    let conAlergiaCount = 0;
    let sinAlergiaCount = 0;
    let busCount = 0;

    if (asiste) {
        if (invitados.length > 0) {
            numInvitados = invitados.length;
            invitados.forEach(inv => {
                const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
                if (esNino) ninosCount++;
                else adultosCount++;

                const alergiaTxt = String(inv.alergia || "").trim();
                const hayAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(alergiaTxt);
                if (hayAlergia) conAlergiaCount++;
                else sinAlergiaCount++;

                const usaBus = /^s[íi]/i.test(String(inv.bus || ""));
                if (usaBus) busCount++;
            });
        } else {
            numInvitados = parseInt(data.numero_invitados, 10) || 1;
            adultosCount = numInvitados;
            sinAlergiaCount = numInvitados;
        }
    }

    const rawNombres = String(data.nombres || data.nombre || "").trim();
    const nombresLimpio = rawNombres
        .replace(/\[(MODIFICACI[ÓO]N|MANUAL|EDITADO PANEL)\]/gi, "")
        .trim() || (invitados.length > 0 ? invitados.map(i => i.nombre).filter(Boolean).join(", ") : "Sin nombre");

    return {
        id,
        asistencia: asiste ? "Sí asisten" : "No asisten",
        asiste,
        numero_invitados: numInvitados,
        nombres: nombresLimpio,
        nombresRaw: rawNombres,
        invitados,
        detalles: detallesTexto,
        cancion,
        origen: data.origen || "web",
        fecha: data.fecha || "",
        createdAt: data.createdAt || data.updatedAt || 0,
        updatedAt: data.updatedAt || data.createdAt || 0,
        adultosCount,
        ninosCount,
        conAlergiaCount,
        sinAlergiaCount,
        busCount,
        tieneAlergiaGrupo: conAlergiaCount > 0,
        tieneBusGrupo: busCount > 0
    };
}

/**
 * Conecta en tiempo real a la colección "reservas" de Firestore.
 */
async function iniciarEscuchaReservas() {
    if (!privadoLoading || !privadoCards) return;

    if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
    }

    privadoLoading.style.display = "flex";
    privadoError.style.display = "none";

    const syncDot = document.getElementById("sync-dot");
    const syncText = document.getElementById("sync-status-text");

    try {
        const { db, reservasCollection } = await obtenerFirestore();
        if (!document.body.classList.contains("app-privada-activa")) return;

        const colRef = collection(db, reservasCollection);
        unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
            privadoLoading.style.display = "none";
            privadoError.style.display = "none";

            if (syncDot) syncDot.className = "sync-dot online";
            if (syncText) syncText.textContent = "Sincronizado en tiempo real con Firestore";

            const lista = [];
            snapshot.forEach(docSnap => {
                lista.push(normalizarReserva(docSnap.id, docSnap.data()));
            });

            // Ordenar de más reciente a más antigua
            lista.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            todasLasReservas = lista;
            actualizarContadoresGlobales(todasLasReservas);
            aplicarFiltrosYRenderizar();
        }, (error) => {
            console.error("Error en onSnapshot de Firestore:", error);
            privadoLoading.style.display = "none";
            if (syncDot) syncDot.className = "sync-dot offline";
            if (syncText) syncText.textContent = "Error de conexión con Firestore";
            mostrarErrorPrivado("No se pudieron cargar las reservas desde Firestore. Verifica la conexión o las reglas de seguridad.");
        });
    } catch (err) {
        console.error("Error iniciando Firestore:", err);
        privadoLoading.style.display = "none";
        mostrarErrorPrivado("Error al inicializar la conexión con Firebase Firestore.");
    }
}

/**
 * Actualiza al instante los contadores globales del Panel Privado:
 * Total Asisten, Menú Adulto, Menú Niño, Alergias, Plazas Bus, Canciones y Píldoras de Filtro.
 */
function actualizarContadoresGlobales(reservas) {
    let totalAsisten = 0;
    let totalAdultos = 0;
    let totalNinos = 0;
    let totalConAlergia = 0;
    let totalSinAlergia = 0;
    let totalBus = 0;
    let canciones = [];

    let countReservasAsisten = 0;
    let countReservasNoAsisten = 0;
    let countReservasAlergia = 0;
    let countReservasBus = 0;

    reservas.forEach(r => {
        if (r.asiste) {
            countReservasAsisten++;
            totalAsisten += r.numero_invitados;
            totalAdultos += r.adultosCount;
            totalNinos += r.ninosCount;
            totalConAlergia += r.conAlergiaCount;
            totalSinAlergia += r.sinAlergiaCount;
            totalBus += r.busCount;

            if (r.tieneAlergiaGrupo) countReservasAlergia++;
            if (r.tieneBusGrupo) countReservasBus++;

            if (r.cancion) {
                canciones.push({
                    nombre: r.cancion,
                    autor: r.nombres
                });
            }
        } else {
            countReservasNoAsisten++;
        }
    });

    // Actualizar DOM de Stats Globales
    const setNum = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setNum("stat-asisten", totalAsisten);
    setNum("stat-adultos", totalAdultos);
    setNum("stat-ninos", totalNinos);
    setNum("stat-con-alergia", totalConAlergia);
    setNum("stat-sin-alergia", totalSinAlergia);
    setNum("stat-bus", totalBus);
    setNum("count-canciones", canciones.length);

    if (privadoStats) {
        privadoStats.style.display = "grid";
    }

    // Actualizar contadores en los botones de filtro rápido
    setNum("pill-count-todos", reservas.length);
    setNum("pill-count-asisten", countReservasAsisten);
    setNum("pill-count-no-asisten", countReservasNoAsisten);
    setNum("pill-count-alergia", countReservasAlergia);
    setNum("pill-count-bus", countReservasBus);

    // Actualizar lista de canciones sugeridas
    const listaCanciones = document.getElementById("lista-canciones");
    if (listaCanciones) {
        if (canciones.length > 0) {
            listaCanciones.innerHTML = canciones.map(c => `
                <li>
                    <i class="ph ph-music-notes"></i>
                    <div>
                        <strong>${escaparHTML(c.nombre)}</strong>
                        <small>Sugerida por: ${escaparHTML(c.autor)}</small>
                    </div>
                </li>
            `).join("");
        } else {
            listaCanciones.innerHTML = `<li style="justify-content:center; color:var(--text-light);">Todavía no hay canciones sugeridas.</li>`;
        }
    }
}

/**
 * Filtra las reservas según el buscador en tiempo real y el filtro rápido activo, y renderiza las tarjetas.
 */
function aplicarFiltrosYRenderizar() {
    if (!privadoCards) return;

    const queryNorm = normalizarTextoBusqueda(textoBusqueda);

    const filtradas = todasLasReservas.filter(r => {
        // 1. Filtro por categoría rápida
        if (filtroActivo === "asisten" && !r.asiste) return false;
        if (filtroActivo === "no-asisten" && r.asiste) return false;
        if (filtroActivo === "alergia" && (!r.asiste || !r.tieneAlergiaGrupo)) return false;
        if (filtroActivo === "bus" && (!r.asiste || !r.tieneBusGrupo)) return false;

        // 2. Buscador en tiempo real
        if (queryNorm) {
            const nombresInvitados = r.invitados.map(i => `${i.nombre} ${i.alergia} ${i.menu}`).join(" ");
            const textoCompleto = normalizarTextoBusqueda(
                `${r.nombres} ${nombresInvitados} ${r.detalles} ${r.cancion} ${r.asistencia} ${r.origen}`
            );
            if (!textoCompleto.includes(queryNorm)) return false;
        }

        return true;
    });

    // Actualizar texto de resumen de resultados
    if (resultsCountEl) {
        if (todasLasReservas.length === 0) {
            resultsCountEl.textContent = "Aún no hay reservas registradas en Firestore.";
        } else if (filtradas.length === todasLasReservas.length && !queryNorm && filtroActivo === "todos") {
            resultsCountEl.textContent = `Mostrando todas las reservas (${todasLasReservas.length})`;
        } else {
            resultsCountEl.textContent = `Mostrando ${filtradas.length} de ${todasLasReservas.length} reservas`;
        }
    }

    renderizarTarjetasReservas(filtradas);
}

/**
 * Renderiza las tarjetas de reservas en el Panel Privado con botones de acción CRUD directos (Ver, Editar, Eliminar).
 */
function renderizarTarjetasReservas(reservas) {
    if (!privadoCards) return;
    privadoCards.innerHTML = "";

    if (!reservas || reservas.length === 0) {
        const hayFiltros = textoBusqueda.trim() !== "" || filtroActivo !== "todos";
        privadoCards.innerHTML = `
            <div class="app-empty-state">
                <div class="app-empty-icon">
                    <i class="ph ph-${hayFiltros ? "magnifying-glass" : "address-book"}"></i>
                </div>
                <h3>${hayFiltros ? "Sin resultados para este filtro" : "Aún no hay confirmaciones"}</h3>
                <p>${hayFiltros
                    ? "Prueba con otro término de búsqueda o selecciona el filtro 'Todos'."
                    : "Las confirmaciones de la web aparecerán aquí automáticamente en tiempo real, o puedes añadir invitaciones manuales."}</p>
            </div>`;
        return;
    }

    reservas.forEach(r => {
        const card = document.createElement("div");
        card.className = `app-reserva-card fade-in ${r.asiste ? "status-asiste" : "status-no-asiste"}`;

        // Generar filas compactas de cada asistente para visualización inmediata
        let invitadosMiniHtml = "";
        if (r.asiste && r.invitados.length > 0) {
            invitadosMiniHtml = `
                <div class="app-card-guests-list">
                    ${r.invitados.map(inv => {
                        const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
                        const hayAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(inv.alergia || "");
                        const usaBus = /^s[íi]/i.test(inv.bus || "");

                        return `
                        <div class="app-card-guest-item">
                            <span class="app-card-guest-name">${escaparHTML(inv.nombre || "Invitado")}</span>
                            <div class="app-card-guest-tags">
                                <span class="mini-tag ${esNino ? "tag-nino" : "tag-adulto"}">
                                    ${esNino ? "👶 Niño" : "🍽️ Adulto"}
                                </span>
                                ${hayAlergia ? `
                                    <span class="mini-tag tag-alergia" title="Alergia: ${escaparAtributo(inv.alergia)}">
                                        ⚠️ ${escaparHTML(inv.alergia)}
                                    </span>
                                ` : ""}
                                <span class="mini-tag ${usaBus ? "tag-bus" : "tag-nobus"}">
                                    ${usaBus ? "🚌 Bus" : "🚗 Propio"}
                                </span>
                            </div>
                        </div>`;
                    }).join("")}
                </div>
            `;
        } else if (!r.asiste) {
            invitadosMiniHtml = `
                <div class="app-card-no-asiste-box">
                    <i class="ph ph-smiley-sad"></i> Confirmaron que no podrán asistir a la boda.
                </div>
            `;
        }

        const cancionHtml = r.cancion ? `
            <div class="app-card-song">
                <i class="ph ph-music-notes"></i>
                <span>${escaparHTML(r.cancion)}</span>
            </div>
        ` : "";

        const origenBadge = r.origen === "manual"
            ? `<span class="app-origin-badge manual" title="Creada manualmente por organizadoras"><i class="ph ph-phone-Outgoing"></i> Manual</span>`
            : `<span class="app-origin-badge web" title="Confirmada desde la web"><i class="ph ph-globe"></i> Web</span>`;

        card.innerHTML = `
            <div class="app-card-top">
                <div class="app-card-badges">
                    <span class="reserva-card-badge ${r.asiste ? "asiste" : "no-asiste"}">
                        <i class="ph ph-${r.asiste ? "check-circle" : "x-circle"}"></i>
                        ${r.asiste ? `Asiste (${r.numero_invitados})` : "No asiste"}
                    </span>
                    ${origenBadge}
                </div>
                <span class="app-card-date">${escaparHTML(r.fecha || "")}</span>
            </div>

            <div class="app-card-title-row">
                <h3 class="app-card-main-title">${escaparHTML(r.nombres)}</h3>
            </div>

            ${invitadosMiniHtml}
            ${cancionHtml}

            <div class="app-card-actions">
                <button type="button" class="app-card-btn btn-ver" title="Ver detalles completos">
                    <i class="ph ph-eye"></i> Detalle
                </button>
                <button type="button" class="app-card-btn btn-editar" title="Editar invitados, menús, alergias o bus">
                    <i class="ph ph-pencil-simple"></i> Editar
                </button>
                <button type="button" class="app-card-btn btn-eliminar" title="Eliminar reserva de Firestore">
                    <i class="ph ph-trash"></i> Eliminar
                </button>
            </div>
        `;

        // Eventos de la tarjeta
        const btnVer = card.querySelector(".btn-ver");
        const btnEditar = card.querySelector(".btn-editar");
        const btnEliminar = card.querySelector(".btn-eliminar");

        btnVer.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalDetalle(r);
        });

        btnEditar.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalEdicion(r);
        });

        btnEliminar.addEventListener("click", (e) => {
            e.stopPropagation();
            confirmarYEliminarReserva(r);
        });

        card.addEventListener("click", () => abrirModalDetalle(r));

        privadoCards.appendChild(card);
    });
}

// ==========================================================================
// 7. GESTOR MANUAL Y FUNCIONES CRUD COMPLETAS (Crear, Editar, Eliminar)
// ==========================================================================

/**
 * Abre el modal para CREAR una nueva invitación manual.
 */
function abrirModalNuevaManual() {
    if (!modalReservaManual || !manualForm) return;
    manualForm.reset();
    manualEditIdInput.value = "";

    if (modalManualTitle) modalManualTitle.textContent = "Nueva Invitación Manual";
    if (modalManualSubtitle) modalManualSubtitle.textContent = "Ideal para registrar por teléfono a familiares o invitados que no usan la web.";
    if (modalManualIcon) modalManualIcon.innerHTML = '<i class="ph ph-user-plus"></i>';
    if (btnGuardarManualText) btnGuardarManualText.textContent = "Guardar en Firestore";

    // Por defecto iniciar con 1 asistente listo para rellenar
    if (manualGuestCountSelect) {
        manualGuestCountSelect.value = "1";
    }
    renderizarFilasInvitados(manualGuestsContainer, 1, "manual");
    if (manualExtraFields) manualExtraFields.style.display = "block";

    modalReservaManual.classList.add("activo");
}

/**
 * Abre el modal para EDITAR una reserva existente en Firestore.
 */
function abrirModalEdicion(reserva) {
    if (!modalReservaManual || !manualForm) return;
    cerrarModalDetalle();

    manualForm.reset();
    manualEditIdInput.value = reserva.id;

    if (modalManualTitle) modalManualTitle.textContent = "Editar Reserva";
    if (modalManualSubtitle) modalManualSubtitle.textContent = `Modificando los datos de: ${reserva.nombres}`;
    if (modalManualIcon) modalManualIcon.innerHTML = '<i class="ph ph-pencil-simple-line"></i>';
    if (btnGuardarManualText) btnGuardarManualText.textContent = "Guardar Cambios";

    const count = reserva.asiste ? Math.max(1, Math.min(10, reserva.invitados.length || reserva.numero_invitados || 1)) : 0;

    if (manualGuestCountSelect) {
        manualGuestCountSelect.value = String(count);
    }

    renderizarFilasInvitados(
        manualGuestsContainer,
        count,
        "manual",
        reserva.invitados || [],
        !reserva.asiste ? reserva.nombres : ""
    );

    if (manualExtraFields) {
        manualExtraFields.style.display = count > 0 ? "block" : "none";
    }
    if (manualSongInput) {
        manualSongInput.value = reserva.cancion || "";
    }

    modalReservaManual.classList.add("activo");
}

/** Cierra el modal de reserva manual / edición */
function cerrarModalManual() {
    if (!modalReservaManual) return;
    modalReservaManual.classList.remove("activo");
}

/**
 * Lee los valores actualmente escritos en el modal manual para no perderlos
 * si la organizadora cambia el selector de número de asistentes (ej. de 2 a 3).
 */
function capturarValoresActualesModalManual() {
    if (!manualForm || !manualGuestsContainer) return [];
    const filas = manualGuestsContainer.querySelectorAll(".guest-row");
    const actuales = [];
    filas.forEach((_, idx) => {
        const i = idx + 1;
        const nombreInput = manualForm.querySelector(`[name="manual-nombre-${i}"]`);
        if (!nombreInput) return;
        const menuChecked = manualForm.querySelector(`[name="manual-menu-${i}"]:checked`);
        const allergyChecked = manualForm.querySelector(`[name="manual-has-allergy-${i}"]:checked`);
        const allergyText = manualForm.querySelector(`[name="manual-alergia-tipo-${i}"]`);
        const busChecked = manualForm.querySelector(`[name="manual-bus-${i}"]:checked`);

        actuales.push({
            nombre: nombreInput.value,
            menu: menuChecked ? menuChecked.value : "adulto",
            tieneAlergia: allergyChecked ? allergyChecked.value === "si" : false,
            alergia: allergyText ? allergyText.value : "",
            bus: busChecked ? busChecked.value : "si"
        });
    });
    return actuales;
}

if (manualGuestCountSelect) {
    manualGuestCountSelect.addEventListener("change", function () {
        const count = parseInt(this.value, 10);
        const valoresActuales = capturarValoresActualesModalManual();

        if (count > 0) {
            if (manualExtraFields) manualExtraFields.style.display = "block";
            renderizarFilasInvitados(manualGuestsContainer, count, "manual", valoresActuales);
        } else if (count === 0) {
            if (manualExtraFields) manualExtraFields.style.display = "none";
            const nombrePrevio = valoresActuales.map(v => v.nombre).filter(Boolean).join(", ");
            renderizarFilasInvitados(manualGuestsContainer, 0, "manual", [], nombrePrevio);
        }
    });
}

// Guardar Reserva Manual o Edición en Firestore
if (manualForm) {
    manualForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const btnGuardar = document.getElementById("btn-guardar-manual");
        const countVal = manualGuestCountSelect.value;
        const editId = manualEditIdInput.value.trim();
        const esEdicion = Boolean(editId);

        if (countVal === "" || countVal === null) {
            mostrarToast("Selecciona el número de asistentes", "error");
            return;
        }

        const originalHTML = btnGuardar.innerHTML;
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="ph ph-spinner icon-pulse"></i> <span>Guardando...</span>';

        // Mantener el origen original si se está editando, o "manual" si es nueva
        let origenReserva = "manual";
        let nombresOriginal = "";
        if (esEdicion) {
            const existente = todasLasReservas.find(r => r.id === editId);
            if (existente) {
                if (existente.origen) origenReserva = existente.origen;
                nombresOriginal = existente.nombres || "";
            }
        }

        const reservaObj = construirDatosReserva(manualForm, countVal, "manual", origenReserva);

        try {
            const { db, reservasCollection } = await obtenerFirestore();

            if (esEdicion) {
                // Actualizar documento existente en Firestore
                await updateDoc(doc(db, reservasCollection, editId), reservaObj);
                // Sincronizar cambio con Google Sheets
                enviarEspejoGoogleSheets(reservaObj, "[EDITADO PANEL]", {
                    accion: "actualizar",
                    id: editId,
                    nombresOriginal
                });
                mostrarToast(`Reserva de ${reservaObj.nombres} actualizada correctamente`, "success");
            } else {
                // Crear nuevo documento en Firestore
                reservaObj.createdAt = Date.now();
                const docRef = await addDoc(collection(db, reservasCollection), reservaObj);
                // Sincronizar nueva reserva con Google Sheets y Telegram
                enviarEspejoGoogleSheets(reservaObj, "[MANUAL]", {
                    accion: "crear",
                    id: docRef.id
                });
                mostrarToast(`Invitación de ${reservaObj.nombres} creada y sincronizada`, "success");
            }

            cerrarModalManual();
        } catch (error) {
            console.error("Error guardando en Firestore:", error);
            mostrarToast("Error al guardar en Firestore. Revisa tu conexión.", "error");
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = originalHTML;
        }
    });
}

/**
 * Elimina una reserva de Firestore y de Google Sheets previa confirmación.
 */
async function confirmarYEliminarReserva(reserva) {
    const confirmado = window.confirm(
        `¿Seguro que deseas ELIMINAR definitivamente la reserva de "${reserva.nombres}"?\n\nEsta acción borrará la reserva de Firebase Firestore y del Excel (Google Sheets), actualizando los contadores al instante.`
    );
    if (!confirmado) return;

    try {
        const { db, reservasCollection } = await obtenerFirestore();
        await deleteDoc(doc(db, reservasCollection, reserva.id));
        cerrarModalDetalle();
        mostrarToast(`Reserva de ${reserva.nombres} eliminada`, "info");
        await eliminarDeGoogleSheets(reserva);
    } catch (error) {
        console.error("Error al eliminar reserva de Firestore:", error);
        mostrarToast("No se pudo eliminar la reserva de Firestore.", "error");
    }
}

// ==========================================================================
// 8. MODAL DE DETALLE DE RESERVA (con acciones Editar y Eliminar integradas)
// ==========================================================================

function abrirModalDetalle(reserva) {
    if (!modalDetalle || !detalleHeader || !detalleBody) return;

    const asiste = reserva.asiste;
    const nombresLista = reserva.invitados && reserva.invitados.length > 0
        ? reserva.invitados.map(i => i.nombre)
        : [reserva.nombres];

    detalleHeader.innerHTML = `
        <div class="detalle-header-top-row">
            <span class="reserva-card-badge ${asiste ? "asiste" : "no-asiste"}">
                <i class="ph ph-${asiste ? "check-circle" : "x-circle"}"></i>
                ${asiste ? `Confirmado (${reserva.numero_invitados} asistente${reserva.numero_invitados === 1 ? "" : "s"})` : "No asiste"}
            </span>
            <div class="detalle-crud-actions">
                <button type="button" class="app-btn app-btn-secondary btn-sm" id="btn-detalle-editar">
                    <i class="ph ph-pencil-simple"></i> Editar datos
                </button>
                <button type="button" class="app-btn app-btn-danger btn-sm" id="btn-detalle-eliminar">
                    <i class="ph ph-trash"></i> Eliminar
                </button>
            </div>
        </div>
        <div class="detalle-header-names">
            ${nombresLista.map(n => `<div class="main-name-item">${escaparHTML(n)}</div>`).join("")}
        </div>
    `;

    // Conectar botones de Editar y Eliminar dentro del modal de detalle
    const btnDetEditar = document.getElementById("btn-detalle-editar");
    const btnDetEliminar = document.getElementById("btn-detalle-eliminar");
    if (btnDetEditar) btnDetEditar.addEventListener("click", () => abrirModalEdicion(reserva));
    if (btnDetEliminar) btnDetEliminar.addEventListener("click", () => confirmarYEliminarReserva(reserva));

    let detallesHtml = "";
    if (asiste && reserva.invitados && reserva.invitados.length > 0) {
        detallesHtml = reserva.invitados.map((inv, i) => {
            const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
            const emojiMenu = esNino ? "👶" : "🍽️";
            const textoMenu = esNino ? "Menú Niño" : "Menú Adulto";
            const tieneAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(inv.alergia || "");
            const esBus = /^s[íi]/i.test(inv.bus || "");
            const delay = (i * 60) + "ms";

            return `
            <div class="detalle-guest-card fade-in" style="animation-delay:${delay}">
                <div class="guest-name-large">${escaparHTML(inv.nombre || `Invitado ${i + 1}`)}</div>
                <div class="guest-badges">
                    <span class="guest-badge badge-menu ${esNino ? "nino" : "adulto"}">
                        ${emojiMenu} <span>${textoMenu}</span>
                    </span>
                    <span class="guest-badge ${tieneAlergia ? "badge-alergia" : "badge-ok"}">
                        ${tieneAlergia ? "⚠️" : "✅"} <span>${escaparHTML(tieneAlergia ? inv.alergia : "Sin alergias")}</span>
                    </span>
                    <span class="guest-badge ${esBus ? "badge-bus" : "badge-nobus"}">
                        ${esBus ? "🚌" : "🚗"} <span>${esBus ? "Con Autobús" : "Sin autobús"}</span>
                    </span>
                </div>
            </div>`;
        }).join("");
    } else if (!asiste) {
        detallesHtml = `
            <div class="detalle-guest-card fade-in">
                <p style="margin:0; color:var(--text-light);">Esta reserva indicó que no podrá asistir al enlace.</p>
            </div>
        `;
    }

    let extraFieldsHtml = `
        <div class="detalle-field fade-in">
            <div class="detalle-field-label">📅 Fecha de registro</div>
            <div class="detalle-field-value">${escaparHTML(reserva.fecha || "—")}</div>
        </div>
        <div class="detalle-field fade-in">
            <div class="detalle-field-label">🌐 Origen</div>
            <div class="detalle-field-value">${reserva.origen === "manual" ? "Registro Manual (Organizadoras)" : "Formulario Web Público"}</div>
        </div>
    `;

    if (reserva.cancion) {
        extraFieldsHtml += `
            <div class="detalle-field fade-in">
                <div class="detalle-field-label">🎵 Canción sugerida</div>
                <div class="detalle-field-value">${escaparHTML(reserva.cancion)}</div>
            </div>
        `;
    }

    detalleBody.innerHTML = `
        <div class="detalle-section">
            <h4 class="detalle-section-title"><i class="ph ph-users-three"></i> Desglose de Asistentes</h4>
            <div class="detalle-guests-list">${detallesHtml}</div>
        </div>
        <div class="detalle-section">
            <h4 class="detalle-section-title"><i class="ph ph-info"></i> Información de la Reserva</h4>
            <div class="detalle-fields">${extraFieldsHtml}</div>
        </div>
    `;

    modalDetalle.classList.add("activo");
}

function cerrarModalDetalle() {
    if (!modalDetalle) return;
    modalDetalle.classList.remove("activo");
}

// ==========================================================================
// 9. UTILIDADES Y EVENT LISTENERS DEL PANEL PRIVADO
// ==========================================================================

function mostrarErrorPrivado(mensaje) {
    if (!privadoError) return;
    const p = privadoError.querySelector("p");
    if (p) p.textContent = mensaje;
    privadoError.style.display = "flex";
}

function mostrarToast(mensaje, tipo = "info") {
    const toast = document.getElementById("app-toast");
    if (!toast) return;
    toast.className = `app-toast show ${tipo}`;
    const icon = tipo === "success" ? "ph-check-circle" : (tipo === "error" ? "ph-warning-circle" : "ph-info");
    toast.innerHTML = `<i class="ph ${icon}"></i> <span>${escaparHTML(mensaje)}</span>`;

    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

function normalizarTextoBusqueda(str) {
    return String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function escaparHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escaparAtributo(str) {
    return escaparHTML(str);
}

// Listeners de Acceso Privado
if (btnAreaPrivada) btnAreaPrivada.addEventListener("click", abrirModal);
if (modalOverlay) modalOverlay.addEventListener("click", cerrarModal);
if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrarModal);
if (btnEntrar) btnEntrar.addEventListener("click", validarCredenciales);

[inputUsuario, inputPassword].forEach(inp => {
    if (!inp) return;
    inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") validarCredenciales();
    });
    inp.addEventListener("input", () => {
        if (modalErrorMsg) modalErrorMsg.style.display = "none";
    });
});

if (btnCerrarPanel) btnCerrarPanel.addEventListener("click", cerrarPanelPrivado);

// Listeners de Buscador en Tiempo Real
if (buscadorReservas) {
    buscadorReservas.addEventListener("input", function () {
        textoBusqueda = this.value;
        if (btnClearSearch) {
            btnClearSearch.style.display = textoBusqueda.length > 0 ? "flex" : "none";
        }
        aplicarFiltrosYRenderizar();
    });
}

if (btnClearSearch && buscadorReservas) {
    btnClearSearch.addEventListener("click", function () {
        buscadorReservas.value = "";
        textoBusqueda = "";
        btnClearSearch.style.display = "none";
        buscadorReservas.focus();
        aplicarFiltrosYRenderizar();
    });
}

// Listeners de Píldoras de Filtro Rápido
if (filtrosContainer) {
    filtrosContainer.querySelectorAll(".app-filter-pill").forEach(btn => {
        btn.addEventListener("click", function () {
            filtrosContainer.querySelectorAll(".app-filter-pill").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            filtroActivo = this.getAttribute("data-filter") || "todos";
            aplicarFiltrosYRenderizar();
        });
    });
}

// Click en tarjetas KPI con data-quick-filter para filtrar rápidamente
document.querySelectorAll(".app-kpi-card[data-quick-filter]").forEach(kpi => {
    kpi.addEventListener("click", function () {
        const targetFilter = this.getAttribute("data-quick-filter");
        if (!targetFilter || !filtrosContainer) return;
        const pill = filtrosContainer.querySelector(`.app-filter-pill[data-filter="${targetFilter}"]`);
        if (pill) pill.click();
    });
});

// Mostrar / Ocultar cajón de canciones recomendadas
const btnToggleCanciones = document.getElementById("btn-toggle-canciones");
const cancionesDrawer = document.getElementById("canciones-drawer");
const btnCloseCanciones = document.getElementById("btn-close-canciones");

if (btnToggleCanciones && cancionesDrawer) {
    btnToggleCanciones.addEventListener("click", () => {
        const isHidden = cancionesDrawer.style.display === "none";
        cancionesDrawer.style.display = isHidden ? "block" : "none";
    });
}
if (btnCloseCanciones && cancionesDrawer) {
    btnCloseCanciones.addEventListener("click", () => {
        cancionesDrawer.style.display = "none";
    });
}

// Listeners del Modal Manual / Edición
if (btnNuevaReservaManual) btnNuevaReservaManual.addEventListener("click", abrirModalNuevaManual);
if (modalManualOverlay) modalManualOverlay.addEventListener("click", cerrarModalManual);
if (btnCerrarManual) btnCerrarManual.addEventListener("click", cerrarModalManual);
if (btnCancelarManual) btnCancelarManual.addEventListener("click", cerrarModalManual);

// Listeners del Modal Detalle
if (modalDetalleOverlay) modalDetalleOverlay.addEventListener("click", cerrarModalDetalle);
if (btnCerrarDetalle) btnCerrarDetalle.addEventListener("click", cerrarModalDetalle);

// Cerrar modales con Escape
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        if (modalReservaManual && modalReservaManual.classList.contains("activo")) {
            cerrarModalManual();
        } else if (modalDetalle && modalDetalle.classList.contains("activo")) {
            cerrarModalDetalle();
        } else if (modalPrivado && modalPrivado.classList.contains("activo")) {
            cerrarModal();
        }
    }
});

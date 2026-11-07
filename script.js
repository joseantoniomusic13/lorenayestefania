// ==========================================================================
// 1. INICIALIZACIÓN DE FIREBASE FIRESTORE (SDK Oficial v13.2.0)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDoc,
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
            let mesasCollection = "mesas";

            const res = await fetch("/api/config");
            const contentType = res.headers.get("content-type") || "";

            if (res.ok && contentType.includes("application/json")) {
                const data = await res.json();
                firebaseConfig = data.firebaseConfig;
                reservasCollection = data.reservasCollection || "reservas";
                mesasCollection = data.mesasCollection || "mesas";
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
                    mesasCollection = localEnv.FIREBASE_MESAS_COLLECTION || "mesas";
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
            firestoreInstance = { db, reservasCollection, mesasCollection };
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
        const visible = mapContainer.style.display === "block";
        mapContainer.style.display = visible ? "none" : "block";
        btnMap.innerHTML = visible
            ? 'Ver mapa aquí <i class="ph ph-map-pin"></i>'
            : 'Ocultar mapa <i class="ph ph-caret-up"></i>';
    });
}

// Botón "Guardar fecha en calendario" (Google Calendar + archivo .ics para iPhone/Outlook)
const btnAddCalendar = document.getElementById("btn-add-calendar");
const calendarMenu = document.getElementById("calendar-menu");
const btnIcsCalendar = document.getElementById("btn-ics-calendar");

if (btnAddCalendar && calendarMenu) {
    btnAddCalendar.addEventListener("click", function (e) {
        e.stopPropagation();
        const abierto = calendarMenu.style.display === "flex";
        calendarMenu.style.display = abierto ? "none" : "flex";
        btnAddCalendar.setAttribute("aria-expanded", abierto ? "false" : "true");
    });

    document.addEventListener("click", function (e) {
        if (!calendarMenu.contains(e.target) && e.target !== btnAddCalendar) {
            calendarMenu.style.display = "none";
            btnAddCalendar.setAttribute("aria-expanded", "false");
        }
    });
}

if (btnIcsCalendar) {
    btnIcsCalendar.addEventListener("click", function () {
        const icsLines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Lorena y Estefania//Nuestra Boda 2027//ES",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            "UID:boda-lorena-estefania-20270515@lorenayestefania.vercel.app",
            "DTSTAMP:20261107T000000Z",
            "DTSTART;VALUE=DATE:20270515",
            "DTEND;VALUE=DATE:20270516",
            "SUMMARY:Boda de Lorena & Estefanía 💍",
            "DESCRIPTION:¡Nos casamos! Celebración de nuestra boda en Jardines Pilar de la Dehesa (Lucena\\, Córdoba). Toda la info en https://lorenayestefania.vercel.app/",
            "LOCATION:Jardines Palacio de la Dehesa\\, Lucena\\, Córdoba",
            "BEGIN:VALARM",
            "TRIGGER:-P1D",
            "ACTION:DISPLAY",
            "DESCRIPTION:¡Mañana es la boda de Lorena y Estefanía!",
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR"
        ].join("\r\n");

        const blob = new Blob([icsLines], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "boda-lorena-y-estefania.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        if (calendarMenu) calendarMenu.style.display = "none";
        mostrarToast("Evento descargado para tu calendario", "success");
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

let todasLasMesas = [];
let distribucionActual = null;

/**
 * Devuelve la lista ordenada de mesas disponibles para los selectores individuales,
 * respetando el orden definido por las novias e incluyendo cualquier mesa adicional existente.
 */
function obtenerOpcionesMesasSelector(mesaActual = "") {
    const vistas = new Map();

    // 1. Mesas creadas en el Organizador de Mesas (ordenadas por su orden)
    todasLasMesas.forEach((m, idx) => {
        const clave = normalizarNombrePersona(m.nombre);
        if (clave && !vistas.has(clave)) {
            const mesaCalc = distribucionActual && distribucionActual.mesasPorId
                ? distribucionActual.mesasPorId.get(m.id)
                : null;
            const infoPlazas = mesaCalc
                ? ` (${mesaCalc.ocupadosActivos}/${m.capacidad})`
                : ` (${m.capacidad} plazas)`;
            vistas.set(clave, {
                valor: m.nombre,
                etiqueta: `${idx + 1}. ${m.nombre}${infoPlazas}`
            });
        }
    });

    // 2. Cualquier mesa en uso en reservas aún no dada de alta formalmente
    if (distribucionActual && Array.isArray(distribucionActual.mesas)) {
        distribucionActual.mesas.forEach(m => {
            const clave = normalizarNombrePersona(m.nombre);
            if (clave && !vistas.has(clave)) {
                vistas.set(clave, {
                    valor: m.nombre,
                    etiqueta: `${m.nombre} (${m.ocupadosActivos} asig.)`
                });
            }
        });
    }

    // 3. Garantizar que el valor actual del invitado nunca se pierda
    const actualLimpia = String(mesaActual || "").trim();
    if (actualLimpia && actualLimpia !== "__NUEVA_MESA__") {
        const claveAct = normalizarNombrePersona(actualLimpia);
        if (claveAct && !vistas.has(claveAct)) {
            vistas.set(claveAct, {
                valor: actualLimpia,
                etiqueta: actualLimpia
            });
        }
    }

    return Array.from(vistas.values());
}

/**
 * Genera dinámicamente los campos de asistentes dentro de un contenedor.
 * @param {HTMLElement} container - Contenedor donde insertar las filas
 * @param {number} count - Número de asistentes (0 a 10)
 * @param {string} prefix - Prefijo para evitar colisión de IDs ('public' o 'manual')
 * @param {Array} valoresPrevios - Datos previos para pre-rellenar al editar o cambiar número
 * @param {string} nombresNoAsistenPrevio - Valor previo si count === 0
 * @param {string} mesaNoAsistePrevio - Mesa previa opcional cuando count === 0 en modo manual
 */
function renderizarFilasInvitados(
    container,
    count,
    prefix = "public",
    valoresPrevios = [],
    nombresNoAsistenPrevio = "",
    mesaNoAsistePrevio = ""
) {
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

            const esNuevaMesaCustom = prev.mesaSelect === "__NUEVA_MESA__";
            const mesaActualVal = esNuevaMesaCustom ? "" : String(prev.mesa || "").trim();
            const mesaCustomVal = esNuevaMesaCustom ? String(prev.mesaCustom || prev.mesa || "").trim() : "";

            let bloqueMesaIndividualHtml = "";
            if (isManual) {
                const opcionesMesas = obtenerOpcionesMesasSelector(mesaActualVal);
                const normActual = normalizarNombrePersona(mesaActualVal);

                const optionsHtml = opcionesMesas.map(opt => {
                    const selected = !esNuevaMesaCustom && normActual && normalizarNombrePersona(opt.valor) === normActual
                        ? "selected"
                        : "";
                    return `<option value="${escaparAtributo(opt.valor)}" ${selected}>🪑 ${escaparHTML(opt.etiqueta)}</option>`;
                }).join("");

                bloqueMesaIndividualHtml = `
                    <div class="manual-guest-mesa-box">
                        <div class="manual-guest-mesa-header">
                            <label for="manual-mesa-select-${i}">
                                <i class="ph ph-armchair"></i> Mesa asignada a este invitado
                            </label>
                            ${i === 1 && count > 1 ? `
                                <button type="button" class="btn-copy-mesa-all" data-copy-mesa-from="1" title="Copiar esta misma mesa al resto de personas de esta reserva">
                                    <i class="ph ph-copy"></i> Aplicar al resto
                                </button>
                            ` : ""}
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <i class="ph ph-armchair"></i>
                            <select name="manual-mesa-select-${i}" id="manual-mesa-select-${i}" class="manual-mesa-select" data-custom-target="manual-mesa-custom-wrap-${i}">
                                <option value="">— Sin mesa asignada (pendiente) —</option>
                                ${optionsHtml}
                                <option value="__NUEVA_MESA__" ${esNuevaMesaCustom ? "selected" : ""}>➕ Crear / escribir nueva mesa...</option>
                            </select>
                        </div>
                        <div class="manual-guest-mesa-custom ${esNuevaMesaCustom ? "visible" : ""}" id="manual-mesa-custom-wrap-${i}">
                            <div class="input-group" style="margin-bottom: 0;">
                                <i class="ph ph-plus-circle"></i>
                                <input type="text" name="manual-mesa-custom-${i}" placeholder="Nombre de la nueva mesa (ej: Mesa 6 - Amigos)..." value="${escaparAtributo(mesaCustomVal)}" ${esNuevaMesaCustom ? 'required="true"' : ""}>
                            </div>
                        </div>
                    </div>
                `;
            }

            const guestDiv = document.createElement("div");
            guestDiv.className = "guest-row fade-in";

            guestDiv.innerHTML = `
                <h4><i class="ph ph-user-focus"></i> Invitado ${i}</h4>
                <div class="input-group">
                    <i class="ph ph-user"></i>
                    <input type="text" name="${namePrefix}nombre-${i}" placeholder="Nombre y apellidos" value="${escaparAtributo(nombreVal)}" required>
                </div>

                ${bloqueMesaIndividualHtml}
                
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

        // Activar listeners de selector individual de mesa (modo manual / organizadoras)
        if (isManual) {
            container.querySelectorAll(".manual-mesa-select").forEach(sel => {
                sel.addEventListener("change", function () {
                    const targetId = this.getAttribute("data-custom-target");
                    const wrap = document.getElementById(targetId);
                    if (!wrap) return;
                    const inp = wrap.querySelector("input");
                    if (this.value === "__NUEVA_MESA__") {
                        wrap.classList.add("visible");
                        if (inp) {
                            inp.setAttribute("required", "true");
                            inp.focus();
                        }
                    } else {
                        wrap.classList.remove("visible");
                        if (inp) {
                            inp.removeAttribute("required");
                            inp.value = "";
                        }
                    }
                });
            });

            const btnCopyAll = container.querySelector(".btn-copy-mesa-all");
            if (btnCopyAll) {
                btnCopyAll.addEventListener("click", function () {
                    const firstSelect = container.querySelector('[name="manual-mesa-select-1"]');
                    const firstCustom = container.querySelector('[name="manual-mesa-custom-1"]');
                    if (!firstSelect) return;
                    const val = firstSelect.value;
                    const customVal = firstCustom ? firstCustom.value : "";

                    container.querySelectorAll(".manual-mesa-select").forEach((sel, idx) => {
                        if (idx === 0) return;
                        sel.value = val;
                        sel.dispatchEvent(new Event("change"));
                        if (val === "__NUEVA_MESA__") {
                            const customInp = container.querySelector(`[name="manual-mesa-custom-${idx + 1}"]`);
                            if (customInp) customInp.value = customVal;
                        }
                    });
                    mostrarToast("Mesa aplicada a todos los miembros de esta reserva", "info");
                });
            }
        }
    } else if (count === 0) {
        let selectorMesaNoAsisteHtml = "";
        if (isManual) {
            const opcionesMesas = obtenerOpcionesMesasSelector(mesaNoAsistePrevio);
            const normPrev = normalizarNombrePersona(mesaNoAsistePrevio);
            const opts = opcionesMesas.map(opt => {
                const selected = normPrev && normalizarNombrePersona(opt.valor) === normPrev ? "selected" : "";
                return `<option value="${escaparAtributo(opt.valor)}" ${selected}>🪑 ${escaparHTML(opt.etiqueta)}</option>`;
            }).join("");

            selectorMesaNoAsisteHtml = `
                <div class="manual-guest-mesa-box" style="margin-top: 14px; margin-bottom: 0;">
                    <div class="manual-guest-mesa-header">
                        <label for="manual-mesa-no-asiste">
                            <i class="ph ph-armchair"></i> Mesa en la que estaban previstos (Opcional)
                        </label>
                    </div>
                    <p style="font-size: 0.78rem; color: #78350f; margin: 0 0 8px;">
                        Si tenían sitio previsto en una mesa, aparecerán marcados como <strong>NO ASISTE</strong> en esa mesa.
                    </p>
                    <div class="input-group" style="margin-bottom: 0;">
                        <i class="ph ph-armchair"></i>
                        <select name="manual-mesa-no-asiste" id="manual-mesa-no-asiste">
                            <option value="">— Ninguna mesa específica —</option>
                            ${opts}
                        </select>
                    </div>
                </div>
            `;
        }

        const guestDiv = document.createElement("div");
        guestDiv.className = "guest-row fade-in";
        guestDiv.innerHTML = `
            <h4>Lamentamos que no puedas venir</h4>
            <p style="margin-bottom: 15px; font-size: 0.95rem;">Por favor, indícanos el nombre o los nombres de las personas que no podrán asistir:</p>
            <div class="input-group" style="margin-bottom: 0;">
                <i class="ph ph-user"></i>
                <input type="text" name="${namePrefix}nombres-no-asisten" placeholder="Nombres y apellidos..." value="${escaparAtributo(nombresNoAsistenPrevio)}" required>
            </div>
            ${selectorMesaNoAsisteHtml}
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
        const contactNotesFields = document.getElementById("contact-notes-container");

        if (count > 0) {
            btnSubmit.style.display = "flex";
            if (contactNotesFields) contactNotesFields.style.display = "block";
            if (extraFields) extraFields.style.display = "block";
            btnSubmit.innerHTML = `Confirmar ${count} Asistente${count > 1 ? "s" : ""} <i class="ph ph-paper-plane-right"></i>`;
            renderizarFilasInvitados(guestsContainer, count, "public");
        } else if (count === 0) {
            btnSubmit.style.display = "flex";
            if (contactNotesFields) contactNotesFields.style.display = "block";
            if (extraFields) extraFields.style.display = "none";
            btnSubmit.innerHTML = `Confirmar No Asistencia <i class="ph ph-paper-plane-right"></i>`;
            renderizarFilasInvitados(guestsContainer, 0, "public");
        } else {
            guestsContainer.innerHTML = "";
            btnSubmit.style.display = "none";
            if (contactNotesFields) contactNotesFields.style.display = "none";
            if (extraFields) extraFields.style.display = "none";
        }
    });
}

/**
 * Calcula un resumen legible de las mesas de los invitados de una reserva (p. ej. "Mesa 1, Mesa 3").
 */
function resumirMesasDeInvitados(invitados = []) {
    const unicas = [];
    const vistas = new Set();
    invitados.forEach(inv => {
        const m = String(inv && inv.mesa ? inv.mesa : "").trim();
        const norm = normalizarNombrePersona(m);
        if (m && !vistas.has(norm)) {
            vistas.add(norm);
            unicas.push(m);
        }
    });
    return unicas.join(", ");
}

/**
 * Extrae los datos de un formulario (público o manual) y construye el objeto estructurado para Firestore y Google Sheets.
 */
function construirDatosReserva(formElement, countVal, prefix = "public", origen = "web", opcionesExtra = {}) {
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
    let mesaResumenManual = "";
    let noAsistenMesas = [];

    if (count === 0) {
        nombres = (formData.get(`${namePrefix}nombres-no-asisten`) || "").trim();
        detallesLineas.push("No asisten");

        if (isManual) {
            const mesaNoAsisteSel = (formData.get("manual-mesa-no-asiste") || "").trim();
            if (mesaNoAsisteSel) {
                const mesaDoc = todasLasMesas.find(
                    m => normalizarNombrePersona(m.nombre) === normalizarNombrePersona(mesaNoAsisteSel)
                );
                mesaResumenManual = mesaNoAsisteSel;
                const partesNombres = dividirNombresPersonas(nombres);
                noAsistenMesas = (partesNombres.length > 0 ? partesNombres : [nombres]).filter(Boolean).map(nom => ({
                    nombre: nom,
                    mesa: mesaNoAsisteSel,
                    mesaId: mesaDoc ? mesaDoc.id : ""
                }));
            } else if (Array.isArray(opcionesExtra.noAsistenMesasPrevias) && opcionesExtra.noAsistenMesasPrevias.length > 0) {
                noAsistenMesas = opcionesExtra.noAsistenMesasPrevias;
                mesaResumenManual = resumirMesasDeInvitados(noAsistenMesas);
            }
        }
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

            const invObj = {
                nombre,
                menu,
                tieneAlergia: Boolean(tieneAlergia && alergiaRaw),
                alergia,
                bus: busRaw === "si" ? "si" : "no"
            };

            let lineaDetalle = `Invitado ${i}: ${nombre} | Menú: ${menu} | Alergias: ${alergia} | Autobús: ${busTexto}`;

            if (isManual) {
                const selVal = (formData.get(`manual-mesa-select-${i}`) || "").trim();
                const customVal = (formData.get(`manual-mesa-custom-${i}`) || "").trim();
                const mesaInvitado = selVal === "__NUEVA_MESA__" ? customVal : selVal;
                const mesaExistente = mesaInvitado
                    ? todasLasMesas.find(m => normalizarNombrePersona(m.nombre) === normalizarNombrePersona(mesaInvitado))
                    : null;

                invObj.mesa = mesaInvitado;
                invObj.mesaId = mesaExistente ? mesaExistente.id : "";

                const prevInvList = Array.isArray(opcionesExtra.invitadosPrevios) ? opcionesExtra.invitadosPrevios : [];
                const prevItem = prevInvList[i - 1];
                if (mesaInvitado && prevItem && prevItem.aliasMesa) {
                    invObj.aliasMesa = prevItem.aliasMesa;
                }

                if (mesaInvitado) {
                    lineaDetalle += ` | Mesa: ${mesaInvitado}`;
                }
            }

            nombresArr.push(nombre);
            invitados.push(invObj);
            detallesLineas.push(lineaDetalle);
        }
        nombres = nombresArr.join(", ");
        if (isManual) {
            mesaResumenManual = resumirMesasDeInvitados(invitados);
        }
    }

    const phoneField = isManual ? "manual-contact-phone" : "contact-phone";
    const notesField = isManual ? "manual-rsvp-notes" : "rsvp-notes";
    const songField = isManual ? "manual-song-suggestion" : "song-suggestion";

    const telefono = (formData.get(phoneField) || "").trim();
    const observaciones = (formData.get(notesField) || "").replace(/\r?\n/g, " ").trim();
    const cancion = (formData.get(songField) || "").trim();

    if (telefono) {
        detallesLineas.push(`Teléfono: ${telefono}`);
    }
    if (observaciones) {
        detallesLineas.push(`Observaciones: ${observaciones}`);
    }

    const notasInternas = isManual
        ? (formData.get("manual-notas-internas") || "").replace(/\r?\n/g, " ").trim()
        : undefined;

    if (isManual && mesaResumenManual) {
        detallesLineas.push(`Mesa/Grupo: ${mesaResumenManual}`);
    }

    let detalles = detallesLineas.join("\n");
    if (cancion && count > 0) {
        detalles += "\nCanción sugerida: " + cancion;
    }

    const resultado = {
        asistencia: count === 0 ? "No asisten" : "Sí asisten",
        asiste: count > 0,
        numero_invitados: count,
        nombres,
        invitados,
        telefono,
        observaciones,
        detalles,
        cancion: count > 0 ? cancion : "",
        origen,
        fecha: fechaActual,
        updatedAt: Date.now()
    };

    if (isManual) {
        resultado.mesa = mesaResumenManual;
        resultado.notasInternas = notasInternas;
        resultado.noAsistenMesas = count === 0 ? noAsistenMesas : [];
    }

    return resultado;
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
                    const prevRef = doc(db, reservasCollection, existingDocId);
                    const prevSnap = await getDoc(prevRef);
                    if (prevSnap.exists()) {
                        const prevData = prevSnap.data() || {};
                        const prevInvitados = Array.isArray(prevData.invitados) ? prevData.invitados : [];
                        const prevMesaFallback = String(prevData.mesa || "").trim();

                        if (reservaData.asiste) {
                            const usadosPrev = new Set();
                            reservaData.invitados = reservaData.invitados.map((inv, idx) => {
                                const normNuevo = normalizarNombrePersona(inv.nombre);
                                let matchIdx = prevInvitados.findIndex(
                                    (p, pIdx) => !usadosPrev.has(pIdx) && normalizarNombrePersona(p.nombre) === normNuevo
                                );
                                if (matchIdx === -1 && prevInvitados[idx] && !usadosPrev.has(idx)) {
                                    matchIdx = idx;
                                }
                                if (matchIdx !== -1) {
                                    usadosPrev.add(matchIdx);
                                    const prevInv = prevInvitados[matchIdx];
                                    const mesaHeredada = prevInv.mesa !== undefined ? prevInv.mesa : prevMesaFallback;
                                    if (mesaHeredada) {
                                        return {
                                            ...inv,
                                            mesa: mesaHeredada,
                                            mesaId: prevInv.mesaId || "",
                                            aliasMesa: prevInv.aliasMesa || ""
                                        };
                                    }
                                }
                                return inv;
                            });
                            reservaData.mesa = resumirMesasDeInvitados(reservaData.invitados);
                            reservaData.noAsistenMesas = [];
                        } else {
                            // Si el invitado cambia de "Sí asisten" a "No asisten", conservar sus mesas previas
                            // para que en el organizador de mesas aparezcan automáticamente como NO ASISTE.
                            const prevConMesa = prevInvitados
                                .map(p => ({
                                    nombre: p.nombre || "",
                                    mesa: p.mesa !== undefined ? p.mesa : prevMesaFallback,
                                    mesaId: p.mesaId || ""
                                }))
                                .filter(p => p.mesa);
                            if (prevConMesa.length > 0) {
                                reservaData.noAsistenMesas = prevConMesa;
                                reservaData.mesa = resumirMesasDeInvitados(prevConMesa);
                            } else if (Array.isArray(prevData.noAsistenMesas) && prevData.noAsistenMesas.length > 0) {
                                reservaData.noAsistenMesas = prevData.noAsistenMesas;
                            }
                        }
                    }

                    await updateDoc(prevRef, reservaData);
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

// Pestañas de Vistas (Reservas vs Organizador de Mesas)
const tabVistaReservas = document.getElementById("tab-vista-reservas");
const tabVistaMesas = document.getElementById("tab-vista-mesas");
const vistaReservasPanel = document.getElementById("vista-reservas");
const vistaMesasPanel = document.getElementById("vista-mesas");
const tabCountReservas = document.getElementById("tab-count-reservas");
const tabCountSinMesa = document.getElementById("tab-count-sin-mesa");

// Modal de Gestión Manual / Edición
const btnNuevaReservaManual = document.getElementById("btn-nueva-reserva-manual");
const btnExportarCatering = document.getElementById("btn-exportar-catering");
const filtroMesaSelect = document.getElementById("filtro-mesa-select");
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
const manualPhoneInput = document.getElementById("manual-contact-phone");
const manualNotesInput = document.getElementById("manual-rsvp-notes");
const manualNotasInternasInput = document.getElementById("manual-notas-internas");
const modalManualTitle = document.getElementById("modal-manual-title");
const modalManualSubtitle = document.getElementById("modal-manual-subtitle");
const modalManualIcon = document.getElementById("modal-manual-icon");
const btnGuardarManualText = document.getElementById("btn-guardar-manual-text");

// Elementos del Organizador Visual de Mesas
const panelPendientesMesa = document.getElementById("panel-pendientes-mesa");
const listaPendientesMesa = document.getElementById("lista-pendientes-mesa");
const badgePendientesMesa = document.getElementById("badge-pendientes-mesa");
const btnTogglePendientesMesa = document.getElementById("btn-toggle-pendientes-mesa");
const iconTogglePendientesMesa = document.getElementById("icon-toggle-pendientes-mesa");
const textTogglePendientesMesa = document.getElementById("text-toggle-pendientes-mesa");
const kpiScrollSinMesa = document.getElementById("kpi-scroll-sin-mesa");
const buscadorMesas = document.getElementById("buscador-mesas");
const btnClearMesasSearch = document.getElementById("btn-clear-mesas-search");
const filtrosMesasContainer = document.getElementById("filtros-mesas");
const btnNuevaMesa = document.getElementById("btn-nueva-mesa");
const btnExportarMesasPdf = document.getElementById("btn-exportar-mesas-pdf");
const btnExportarMesasMenusPdf = document.getElementById("btn-exportar-mesas-menus-pdf");
const btnExportarMesasCsv = document.getElementById("btn-exportar-mesas-csv");
const mesasGrid = document.getElementById("mesas-grid");

// Modal Crear / Editar Mesa
const modalMesa = document.getElementById("modal-mesa");
const modalMesaOverlay = document.getElementById("modal-mesa-overlay");
const btnCerrarModalMesa = document.getElementById("btn-cerrar-modal-mesa");
const btnCancelarMesa = document.getElementById("btn-cancelar-mesa");
const formMesa = document.getElementById("form-mesa");
const mesaEditIdInput = document.getElementById("mesa-edit-id");
const mesaNombreInput = document.getElementById("mesa-nombre-input");
const mesaOrdenInput = document.getElementById("mesa-orden-input");
const mesaCapacidadInput = document.getElementById("mesa-capacidad-input");
const mesaNotaInput = document.getElementById("mesa-nota-input");
const mesaInvitadosInicialesWrap = document.getElementById("mesa-invitados-iniciales-wrap");
const mesaInvitadosInicialesInput = document.getElementById("mesa-invitados-iniciales");
const modalMesaTitle = document.getElementById("modal-mesa-title");
const modalMesaSubtitle = document.getElementById("modal-mesa-subtitle");
const btnGuardarMesaText = document.getElementById("btn-guardar-mesa-text");

// Modal de Confirmación de Eliminación
const modalConfirmarEliminar = document.getElementById("modal-confirmar-eliminar");
const modalEliminarOverlay = document.getElementById("modal-eliminar-overlay");
const confirmarEliminarTitulo = document.getElementById("confirmar-eliminar-titulo");
const confirmarEliminarTexto = document.getElementById("confirmar-eliminar-texto");
const btnCancelarEliminar = document.getElementById("btn-cancelar-eliminar");
const btnAceptarEliminar = document.getElementById("btn-aceptar-eliminar");

const ADMIN_SESSION_KEY = "wedding_admin_session_active";

// Estado en memoria del Panel Privado
let todasLasReservas = [];
let filtroActivo = "todos";
let filtroMesaActivo = "";
let textoBusqueda = "";
let vistaActivaPanel = "reservas";
let filtroVistaMesas = "todas";
let textoBusquedaMesas = "";
let pendientesMesaOculto = false;
let unsubscribeFirestore = null;
let unsubscribeMesasFirestore = null;
let resolverConfirmacionEliminar = null;

/** Abre el modal de login privado (o entra directo si la sesión sigue activa en esta pestaña) */
function abrirModal() {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") {
        mostrarPanelPrivado();
        return;
    }
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
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    document.body.classList.add("app-privada-activa");
    document.body.style.overflow = "hidden";
    panelPrivado.style.display = "flex";
    panelPrivado.scrollTop = 0;
    iniciarEscuchaReservas();
    iniciarEscuchaMesas();
}

/** Cierra la sesión del panel privado y vuelve a la web pública */
function cerrarPanelPrivado() {
    if (!panelPrivado) return;
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
    }
    if (unsubscribeMesasFirestore) {
        unsubscribeMesasFirestore();
        unsubscribeMesasFirestore = null;
    }
    panelPrivado.style.display = "none";
    document.body.classList.remove("app-privada-activa");
    document.body.style.overflow = "";
}

/** Cambia entre la pestaña de Reservas y la pestaña de Distribución de Mesas */
function cambiarVistaPanel(vista) {
    vistaActivaPanel = vista === "mesas" ? "mesas" : "reservas";

    if (tabVistaReservas) {
        const esRes = vistaActivaPanel === "reservas";
        tabVistaReservas.classList.toggle("active", esRes);
        tabVistaReservas.setAttribute("aria-selected", esRes ? "true" : "false");
    }
    if (tabVistaMesas) {
        const esMesas = vistaActivaPanel === "mesas";
        tabVistaMesas.classList.toggle("active", esMesas);
        tabVistaMesas.setAttribute("aria-selected", esMesas ? "true" : "false");
    }
    if (vistaReservasPanel) {
        vistaReservasPanel.style.display = vistaActivaPanel === "reservas" ? "flex" : "none";
    }
    if (vistaMesasPanel) {
        vistaMesasPanel.style.display = vistaActivaPanel === "mesas" ? "flex" : "none";
    }
    if (panelPrivado) {
        panelPrivado.scrollTop = 0;
    }
}

// ==========================================================================
// 6. NORMALIZACIÓN DE DATOS, MOTOR DE MESAS Y CONTADORES GLOBALES
// ==========================================================================

/**
 * Normaliza un documento de la colección "mesas" de Firestore.
 */
function normalizarMesa(id, data = {}) {
    const rawMiembros = Array.isArray(data.miembrosPrevistos) ? data.miembrosPrevistos : [];
    const miembrosPrevistos = rawMiembros
        .map((m, idx) => {
            if (typeof m === "string") {
                return { id: `mp_${idx}`, nombre: m.trim(), estadoManual: "pendiente" };
            }
            const estRaw = String((m && m.estadoManual) || "pendiente").toLowerCase();
            const estadoManual = estRaw === "confirmado" || estRaw === "no-asiste" ? estRaw : "pendiente";
            return {
                id: String(m && m.id ? m.id : `mp_${idx}`),
                nombre: String(m && m.nombre ? m.nombre : "").trim(),
                estadoManual
            };
        })
        .filter(m => m.nombre !== "");

    const ordenNum = Number(data.orden);
    return {
        id,
        nombre: String(data.nombre || "Mesa").trim(),
        orden: Number.isFinite(ordenNum) && ordenNum > 0 ? ordenNum : 999,
        capacidad: Math.max(1, parseInt(data.capacidad, 10) || 10),
        tipo: data.tipo === "imperial" ? "imperial" : "redonda",
        nota: String(data.nota || "").trim(),
        miembrosPrevistos,
        createdAt: data.createdAt || 0,
        updatedAt: data.updatedAt || 0
    };
}

/**
 * Normaliza un documento de Firestore para asegurar que siempre tenga el array `invitados`
 * con su mesa individual y todas las métricas calculadas.
 */
function normalizarReserva(id, data) {
    const rawAsistencia = String(data.asistencia || "Sí asisten");
    const asiste = data.asiste !== undefined
        ? Boolean(data.asiste)
        : !(/\bno\b|lamentabl/i.test(rawAsistencia));

    const mesaLegacyReserva = String(data.mesa || "").trim();
    const detallesTexto = String(data.detalles || data.detalle || "");
    let invitados = Array.isArray(data.invitados)
        ? data.invitados.map(inv => ({
            ...inv,
            mesa: inv && inv.mesa !== undefined ? String(inv.mesa || "").trim() : mesaLegacyReserva,
            mesaId: String((inv && inv.mesaId) || "").trim(),
            aliasMesa: String((inv && inv.aliasMesa) || "").trim()
        }))
        : [];

    // Si no viene el array estructurado de invitados, extraerlo del campo detalles
    if (invitados.length === 0 && asiste && detallesTexto) {
        const limpio = detallesTexto
            .replace(/\n(Canc[ió]n sugerida|Tel[ée]fono|Observaciones|Mesa\/Grupo)[:\s]*[^\n]*/gi, "")
            .trim();
        const bloques = limpio.split(/\n(?=Invitado\s*\d+:)/i).filter(b => b.trim() !== "");
        bloques.forEach((bloque, idx) => {
            const mNombre = bloque.match(/Invitado\s*\d+:\s*([^|\n]+)/i);
            const mMenu = bloque.match(/Men[uú]:\s*([^|\n]+)/i);
            const mAlergia = bloque.match(/Alergias?:\s*([^|\n]+)/i);
            const mBus = bloque.match(/Autob[uú]s:\s*([^|\n]+)/i);
            const mMesa = bloque.match(/Mesa:\s*([^|\n]+)/i);

            const nombre = mNombre ? mNombre[1].trim() : `Invitado ${idx + 1}`;
            const menuRaw = mMenu ? mMenu[1].trim().toLowerCase() : "adulto";
            const menu = /ni[ñn]o|beb|infant/i.test(menuRaw) ? "niño" : "adulto";
            const alergia = mAlergia ? mAlergia[1].trim() : "Ninguna";
            const tieneAlergia = !/^(ninguna?|no|—|-|)$/i.test(alergia);
            const busRaw = mBus ? mBus[1].trim().toLowerCase() : "no";
            const bus = /^s[íi]/i.test(busRaw) ? "si" : "no";
            const mesaExtraida = mMesa ? mMesa[1].trim() : mesaLegacyReserva;

            invitados.push({
                nombre,
                menu,
                tieneAlergia,
                alergia,
                bus,
                mesa: mesaExtraida,
                mesaId: ""
            });
        });
    }

    // Extraer canción sugerida, teléfono, observaciones y notas internas
    let cancion = String(data.cancion || "").trim();
    if (!cancion && detallesTexto) {
        const mSong = detallesTexto.match(/Canc[ió]n sugerida[:\s]*([^\n]+)/i);
        if (mSong && mSong[1]) cancion = mSong[1].trim();
    }
    if (/^(ninguna|-)$/i.test(cancion)) cancion = "";

    let telefono = String(data.telefono || "").trim();
    if (!telefono && detallesTexto) {
        const mPhone = detallesTexto.match(/Tel[ée]fono[:\s]*([^\n]+)/i);
        if (mPhone && mPhone[1]) telefono = mPhone[1].trim();
    }

    let observaciones = String(data.observaciones || "").trim();
    if (!observaciones && detallesTexto) {
        const mObs = detallesTexto.match(/Observaciones[:\s]*([^\n]+)/i);
        if (mObs && mObs[1]) observaciones = mObs[1].trim();
    }

    const notasInternas = String(data.notasInternas || "").trim();
    const noAsistenMesas = Array.isArray(data.noAsistenMesas) ? data.noAsistenMesas : [];

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

    const mesaResumen = asiste && invitados.length > 0
        ? resumirMesasDeInvitados(invitados)
        : mesaLegacyReserva;

    return {
        id,
        asistencia: asiste ? "Sí asisten" : "No asisten",
        asiste,
        numero_invitados: numInvitados,
        nombres: nombresLimpio,
        nombresRaw: rawNombres,
        invitados,
        noAsistenMesas,
        telefono,
        observaciones,
        mesa: mesaResumen,
        notasInternas,
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
        tieneAdultosGrupo: adultosCount > 0,
        tieneNinosGrupo: ninosCount > 0,
        tieneAlergiaGrupo: conAlergiaCount > 0,
        tieneBusGrupo: busCount > 0
    };
}

/**
 * Calcula la distribución de mesas de forma 100 % controlada por las novias (sin auto-emparejar nombres):
 * - Las reservas de la web entran SIEMPRE en "Pendientes de mesa" hasta que las novias las ubiquen o vinculen.
 * - "Confirmado": invitados de reservas asignados manualmente a la mesa por las novias (o miembros marcados como Confirmado).
 * - "FALTA POR CONFIRMAR": personas previstas escritas en la mesa que aún están pendientes de confirmación/vinculación.
 * - "NO ASISTE": personas asignadas a la mesa que indicaron no poder ir (o marcadas manualmente como baja).
 */
function calcularDistribucionMesas(mesasBase, reservas) {
    const mesasCalc = mesasBase.map((m, idx) => ({
        ...m,
        ordenVisual: idx + 1,
        esVirtual: false,
        asientos: []
    }));

    const mesasPorId = new Map();
    const mesasPorNombreNorm = new Map();

    mesasCalc.forEach(m => {
        mesasPorId.set(m.id, m);
        const norm = normalizarNombrePersona(m.nombre);
        if (norm && !mesasPorNombreNorm.has(norm)) {
            mesasPorNombreNorm.set(norm, m);
        }
    });

    const asegurarMesaParaNombre = (nombreMesaRaw) => {
        const limpio = String(nombreMesaRaw || "").trim();
        if (!limpio) return null;
        const norm = normalizarNombrePersona(limpio);
        if (!norm) return null;
        if (mesasPorNombreNorm.has(norm)) return mesasPorNombreNorm.get(norm);

        const virtual = {
            id: `__virtual__${norm}`,
            nombre: limpio,
            orden: 9999,
            ordenVisual: mesasCalc.length + 1,
            capacidad: 10,
            tipo: "redonda",
            nota: "Detectada desde reservas",
            miembrosPrevistos: [],
            esVirtual: true,
            asientos: []
        };
        mesasCalc.push(virtual);
        mesasPorId.set(virtual.id, virtual);
        mesasPorNombreNorm.set(norm, virtual);
        return virtual;
    };

    const asistentesFlat = [];
    const bajasConMesaExplicita = [];
    const reservasNoAsisten = [];

    reservas.forEach(r => {
        if (r.asiste) {
            const listaInv = r.invitados && r.invitados.length > 0
                ? r.invitados
                : [{
                    nombre: r.nombres,
                    menu: "adulto",
                    tieneAlergia: false,
                    alergia: "Ninguna",
                    bus: "no",
                    mesa: r.mesa || "",
                    mesaId: "",
                    aliasMesa: ""
                }];

            listaInv.forEach((inv, idx) => {
                const key = `${r.id}__${idx}`;
                let mesaDestino = null;
                if (inv.mesaId && mesasPorId.has(inv.mesaId)) {
                    mesaDestino = mesasPorId.get(inv.mesaId);
                } else if (inv.mesa) {
                    mesaDestino = asegurarMesaParaNombre(inv.mesa);
                }

                asistentesFlat.push({
                    key,
                    reserva: r,
                    guestIndex: idx,
                    inv,
                    nombre: inv.nombre || `Invitado ${idx + 1}`,
                    nombreNorm: normalizarNombrePersona(inv.nombre || ""),
                    mesaExplicita: mesaDestino
                });
            });
        } else {
            reservasNoAsisten.push(r);
            const candidatos = dividirNombresPersonas(r.nombres);

            if (Array.isArray(r.noAsistenMesas) && r.noAsistenMesas.length > 0) {
                r.noAsistenMesas.forEach((item, bIdx) => {
                    let mesaDest = null;
                    if (item.mesaId && mesasPorId.has(item.mesaId)) {
                        mesaDest = mesasPorId.get(item.mesaId);
                    } else if (item.mesa) {
                        mesaDest = asegurarMesaParaNombre(item.mesa);
                    }
                    if (mesaDest) {
                        bajasConMesaExplicita.push({
                            reserva: r,
                            bajaIndex: bIdx,
                            nombre: item.nombre || r.nombres,
                            mesaDestino: mesaDest
                        });
                    }
                });
            } else if (r.mesa) {
                const mesaDest = asegurarMesaParaNombre(r.mesa);
                if (mesaDest) {
                    const partes = candidatos.length > 0 ? candidatos : [r.nombres];
                    partes.forEach((nom, bIdx) => {
                        bajasConMesaExplicita.push({
                            reserva: r,
                            bajaIndex: bIdx,
                            nombre: nom,
                            mesaDestino: mesaDest
                        });
                    });
                }
            }
        }
    });

    const assignedGuestKeys = new Set();
    const guestEffectiveMesaMap = new Map();

    // PASO 1: Invitados confirmados ubicados MANUALMENTE en una mesa por las novias
    asistentesFlat.forEach(g => {
        if (!g.mesaExplicita) return;
        const m = g.mesaExplicita;
        assignedGuestKeys.add(g.key);
        guestEffectiveMesaMap.set(g.key, {
            id: m.id,
            nombre: m.nombre,
            orden: m.ordenVisual
        });

        m.asientos.push({
            tipoAsiento: "confirmado",
            nombre: g.nombre,
            aliasMesa: g.inv.aliasMesa || "",
            reservaId: g.reserva.id,
            guestIndex: g.guestIndex,
            inv: g.inv,
            reserva: g.reserva,
            miembroPrevistoId: null,
            esReserva: true,
            esMiembroPrevisto: false,
            esExplicito: true
        });
    });

    // PASO 2: Personas previstas anotadas manualmente en cada mesa por las novias (sin auto-cruce por nombre)
    mesasCalc.forEach(m => {
        m.miembrosPrevistos.forEach(mp => {
            const estado = mp.estadoManual === "confirmado" || mp.estadoManual === "no-asiste"
                ? mp.estadoManual
                : "pendiente";

            m.asientos.push({
                tipoAsiento: estado,
                nombre: mp.nombre,
                miembroPrevistoId: mp.id,
                estadoManual: estado,
                esReserva: false,
                esMiembroPrevisto: true
            });
        });
    });

    // PASO 3: Personas que tenían mesa asignada por las novias y cuya reserva indica "No asisten"
    bajasConMesaExplicita.forEach(b => {
        const m = b.mesaDestino;
        if (!m) return;

        m.asientos.push({
            tipoAsiento: "no-asiste",
            nombre: b.nombre,
            reservaId: b.reserva.id,
            bajaIndex: b.bajaIndex,
            reserva: b.reserva,
            miembroPrevistoId: null,
            esMiembroPrevisto: false,
            esBajaExplicita: true
        });
    });

    // PASO 4: Todos los asistentes confirmados sin mesa manual quedan en Pendientes para que las novias organicen
    const pendientesDeMesa = asistentesFlat.filter(g => !assignedGuestKeys.has(g.key));

    // PASO 5: Métricas por cada mesa y totales globales
    let totalConfirmadosEnMesa = 0;
    let totalFaltaPorConfirmar = 0;
    let totalNoAsistenEnMesa = 0;

    mesasCalc.forEach(m => {
        m.confirmadosCount = m.asientos.filter(a => a.tipoAsiento === "confirmado").length;
        m.pendientesCount = m.asientos.filter(a => a.tipoAsiento === "pendiente").length;
        m.noAsistenCount = m.asientos.filter(a => a.tipoAsiento === "no-asiste").length;
        m.ocupadosActivos = m.confirmadosCount + m.pendientesCount;
        m.huecosLibres = Math.max(0, m.capacidad - m.ocupadosActivos);
        m.exceso = Math.max(0, m.ocupadosActivos - m.capacidad);
        m.estaCompleta = m.capacidad > 0 && m.ocupadosActivos >= m.capacidad;

        totalConfirmadosEnMesa += m.confirmadosCount;
        totalFaltaPorConfirmar += m.pendientesCount;
        totalNoAsistenEnMesa += m.noAsistenCount;
    });

    return {
        mesas: mesasCalc,
        mesasPorId,
        mesasPorNombreNorm,
        pendientesDeMesa,
        reservasNoAsisten,
        guestEffectiveMesaMap,
        totales: {
            totalMesas: mesasCalc.length,
            totalConfirmadosEnMesa,
            totalFaltaPorConfirmar,
            totalNoAsistenEnMesa,
            totalSinMesa: pendientesDeMesa.length
        }
    };
}

/**
 * Devuelve el nombre efectivo de la mesa de un invitado concreto (explícita o vinculada desde la mesa).
 */
function obtenerNombreMesaEfectiva(reserva, idx, inv) {
    if (distribucionActual && distribucionActual.guestEffectiveMesaMap) {
        const info = distribucionActual.guestEffectiveMesaMap.get(`${reserva.id}__${idx}`);
        if (info && info.nombre) return info.nombre;
    }
    return String((inv && inv.mesa) || "").trim();
}

/**
 * Recalcula la distribución de mesas y refresca contadores, tarjetas de reservas y vista visual de mesas.
 */
function recalcularYActualizarTodo() {
    distribucionActual = calcularDistribucionMesas(todasLasMesas, todasLasReservas);
    actualizarContadoresGlobales(todasLasReservas);
    aplicarFiltrosYRenderizar();
    renderizarVistaMesas();
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
            recalcularYActualizarTodo();
        }, (error) => {
            console.error("Error en onSnapshot de Firestore:", error);
            privadoLoading.style.display = "none";
            if (syncDot) syncDot.className = "sync-dot offline";
            if (syncText) syncText.textContent = "Error de conexión con Firestore";
            mostrarErrorPrivado("No se pudieron cargar las reservas desde Firestore. Verifica la conexión.");
        });
    } catch (err) {
        console.error("Error iniciando Firestore:", err);
        privadoLoading.style.display = "none";
        mostrarErrorPrivado("Error al inicializar la conexión con Firebase Firestore.");
    }
}

/**
 * Conecta en tiempo real a la colección "mesas" de Firestore.
 */
async function iniciarEscuchaMesas() {
    if (unsubscribeMesasFirestore) {
        unsubscribeMesasFirestore();
        unsubscribeMesasFirestore = null;
    }

    try {
        const { db, mesasCollection } = await obtenerFirestore();
        if (!document.body.classList.contains("app-privada-activa")) return;

        const colMesasRef = collection(db, mesasCollection);
        unsubscribeMesasFirestore = onSnapshot(colMesasRef, (snapshot) => {
            const listaMesas = [];
            snapshot.forEach(docSnap => {
                listaMesas.push(normalizarMesa(docSnap.id, docSnap.data()));
            });

            listaMesas.sort((a, b) =>
                (a.orden - b.orden) ||
                (a.createdAt - b.createdAt) ||
                a.nombre.localeCompare(b.nombre, "es", { numeric: true, sensitivity: "base" })
            );

            todasLasMesas = listaMesas;
            recalcularYActualizarTodo();
        }, (error) => {
            console.warn("Aviso al escuchar colección mesas en Firestore:", error);
        });
    } catch (err) {
        console.warn("Aviso iniciando escucha de mesas:", err);
    }
}

/**
 * Actualiza al instante los contadores globales del Panel Privado:
 * Total Asisten, Menú Adulto, Menú Niño, Alergias, Plazas Bus, Canciones, Selector de Mesas y Pestañas.
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
    let countReservasAdultos = 0;
    let countReservasNinos = 0;
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

            if (r.tieneAdultosGrupo) countReservasAdultos++;
            if (r.tieneNinosGrupo) countReservasNinos++;
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

    setNum("pill-count-todos", reservas.length);
    setNum("pill-count-asisten", countReservasAsisten);
    setNum("pill-count-no-asisten", countReservasNoAsisten);
    setNum("pill-count-adultos", countReservasAdultos);
    setNum("pill-count-ninos", countReservasNinos);
    setNum("pill-count-alergia", countReservasAlergia);
    setNum("pill-count-bus", countReservasBus);

    // Actualizar contadores de las pestañas superiores
    if (tabCountReservas) {
        tabCountReservas.textContent = String(reservas.length);
    }
    const sinMesaTotal = distribucionActual ? distribucionActual.totales.totalSinMesa : 0;
    if (tabCountSinMesa) {
        if (sinMesaTotal === 0 && totalAsisten > 0) {
            tabCountSinMesa.textContent = "Todo asignado";
            tabCountSinMesa.className = "app-tab-badge badge-all-ok";
        } else {
            tabCountSinMesa.textContent = `${sinMesaTotal} sin mesa`;
            tabCountSinMesa.className = "app-tab-badge badge-pending";
        }
    }

    // Actualizar selector desplegable de Mesas en la vista de Reservas
    if (filtroMesaSelect) {
        const prevMesa = filtroMesaActivo;
        const mesasLista = distribucionActual ? distribucionActual.mesas : [];

        let optionsHtml = `<option value="">Todas las mesas</option>`;
        optionsHtml += `<option value="__SIN_MESA__">🪑 Con invitados sin mesa (${sinMesaTotal} pers.)</option>`;
        mesasLista.forEach(m => {
            optionsHtml += `<option value="${escaparAtributo(m.nombre)}">🪑 ${escaparHTML(m.nombre)} (${m.confirmadosCount} conf. / ${m.capacidad})</option>`;
        });

        filtroMesaSelect.innerHTML = optionsHtml;
        const nombresValidos = new Set(mesasLista.map(m => m.nombre));
        if (prevMesa === "__SIN_MESA__" || nombresValidos.has(prevMesa)) {
            filtroMesaSelect.value = prevMesa;
        } else {
            filtroMesaActivo = "";
            filtroMesaSelect.value = "";
        }
    }

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
 * Devuelve información de mesas efectivas de todos los asistentes de una reserva.
 */
function obtenerEstadoMesasDeReserva(r) {
    if (!r.asiste) {
        return { mesasUnicas: r.mesa ? [r.mesa] : [], algunoSinMesa: false, asignadosCount: 0 };
    }
    const listaInv = r.invitados && r.invitados.length > 0
        ? r.invitados
        : [{ nombre: r.nombres, mesa: r.mesa || "" }];

    const mesasUnicas = [];
    const vistas = new Set();
    let asignadosCount = 0;
    let algunoSinMesa = false;

    listaInv.forEach((inv, idx) => {
        const mNombre = obtenerNombreMesaEfectiva(r, idx, inv);
        if (mNombre) {
            asignadosCount++;
            const norm = normalizarNombrePersona(mNombre);
            if (!vistas.has(norm)) {
                vistas.add(norm);
                mesasUnicas.push(mNombre);
            }
        } else {
            algunoSinMesa = true;
        }
    });

    return { mesasUnicas, algunoSinMesa, asignadosCount };
}

/**
 * Filtra las reservas según el buscador en tiempo real, mesa individual y filtro rápido activo, y renderiza las tarjetas.
 */
function aplicarFiltrosYRenderizar() {
    if (!privadoCards) return;

    document.querySelectorAll(".app-kpi-card[data-quick-filter]").forEach(kpi => {
        const kf = kpi.getAttribute("data-quick-filter");
        kpi.classList.toggle("kpi-active", kf === filtroActivo);
    });

    const queryNorm = normalizarTextoBusqueda(textoBusqueda);
    const filtroMesaNorm = normalizarNombrePersona(filtroMesaActivo);

    const filtradas = todasLasReservas.filter(r => {
        if (filtroActivo === "asisten" && !r.asiste) return false;
        if (filtroActivo === "no-asisten" && r.asiste) return false;
        if (filtroActivo === "adultos" && (!r.asiste || !r.tieneAdultosGrupo)) return false;
        if (filtroActivo === "ninos" && (!r.asiste || !r.tieneNinosGrupo)) return false;
        if (filtroActivo === "alergia" && (!r.asiste || !r.tieneAlergiaGrupo)) return false;
        if (filtroActivo === "bus" && (!r.asiste || !r.tieneBusGrupo)) return false;

        const infoMesas = obtenerEstadoMesasDeReserva(r);
        if (filtroMesaActivo === "__SIN_MESA__") {
            if (!r.asiste || !infoMesas.algunoSinMesa) return false;
        } else if (filtroMesaActivo) {
            const coincideMesa = infoMesas.mesasUnicas.some(
                m => normalizarNombrePersona(m) === filtroMesaNorm
            );
            if (!coincideMesa) return false;
        }

        if (queryNorm) {
            const nombresInvitados = r.invitados.map((inv, idx) =>
                `${inv.nombre} ${inv.alergia} ${inv.menu} ${obtenerNombreMesaEfectiva(r, idx, inv)}`
            ).join(" ");
            const textoCompleto = normalizarTextoBusqueda(
                `${r.nombres} ${nombresInvitados} ${infoMesas.mesasUnicas.join(" ")} ${r.telefono} ${r.observaciones} ${r.notasInternas} ${r.detalles} ${r.cancion} ${r.asistencia} ${r.origen}`
            );
            if (!textoCompleto.includes(queryNorm)) return false;
        }

        return true;
    });

    if (resultsCountEl) {
        if (todasLasReservas.length === 0) {
            resultsCountEl.textContent = "Aún no hay reservas registradas en Firestore.";
        } else if (filtradas.length === todasLasReservas.length && !queryNorm && filtroActivo === "todos" && !filtroMesaActivo) {
            resultsCountEl.textContent = `Mostrando todas las reservas (${todasLasReservas.length})`;
        } else {
            const personasFiltradas = filtradas.reduce((acc, item) => acc + (item.asiste ? item.numero_invitados : 0), 0);
            resultsCountEl.textContent = `Mostrando ${filtradas.length} de ${todasLasReservas.length} reservas (${personasFiltradas} asistentes)`;
        }
    }

    renderizarTarjetasReservas(filtradas);
}

/**
 * Renderiza las tarjetas de reservas en el Panel Privado mostrando la mesa individual de cada invitado.
 */
function renderizarTarjetasReservas(reservas) {
    if (!privadoCards) return;
    privadoCards.innerHTML = "";

    if (!reservas || reservas.length === 0) {
        const hayFiltros = textoBusqueda.trim() !== "" || filtroActivo !== "todos" || Boolean(filtroMesaActivo);
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

        const infoMesas = obtenerEstadoMesasDeReserva(r);

        let invitadosMiniHtml = "";
        if (r.asiste && r.invitados.length > 0) {
            invitadosMiniHtml = `
                <div class="app-card-guests-list">
                    ${r.invitados.map((inv, idx) => {
                        const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
                        const hayAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(inv.alergia || "");
                        const usaBus = /^s[íi]/i.test(inv.bus || "");
                        const mesaInv = obtenerNombreMesaEfectiva(r, idx, inv);

                        return `
                        <div class="app-card-guest-item">
                            <span class="app-card-guest-name">${escaparHTML(inv.nombre || "Invitado")}</span>
                            <div class="app-card-guest-tags">
                                ${mesaInv ? `
                                    <span class="mini-tag tag-mesa" title="Mesa asignada a ${escaparAtributo(inv.nombre || "este invitado")}">
                                        <i class="ph ph-armchair"></i> ${escaparHTML(mesaInv)}
                                    </span>
                                ` : `
                                    <span class="mini-tag tag-sin-mesa" title="Falta por asignar mesa a este invitado">
                                        <i class="ph ph-armchair"></i> Sin mesa
                                    </span>
                                `}
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

        const waNum = obtenerNumeroWhatsApp(r.telefono);
        const contactoHtml = r.telefono ? `
            <div class="app-card-contact-row">
                <a href="tel:${escaparAtributo(r.telefono.replace(/\s+/g, ""))}" class="app-contact-chip chip-link" title="Llamar por teléfono">
                    <i class="ph ph-phone-call"></i> ${escaparHTML(r.telefono)}
                </a>
                ${waNum ? `
                    <a href="https://wa.me/${waNum}" target="_blank" rel="noopener noreferrer" class="app-contact-chip whatsapp chip-link" title="Abrir chat en WhatsApp">
                        <i class="ph ph-whatsapp-logo"></i> WhatsApp
                    </a>
                ` : ""}
            </div>
        ` : "";

        const observacionesHtml = r.observaciones ? `
            <div class="app-card-note guest-note">
                <i class="ph ph-chat-circle-text"></i>
                <span>${escaparHTML(r.observaciones)}</span>
            </div>
        ` : "";

        const notasInternasHtml = r.notasInternas ? `
            <div class="app-card-note internal-note">
                <i class="ph ph-note-pencil"></i>
                <span><strong>Nota interna:</strong> ${escaparHTML(r.notasInternas)}</span>
            </div>
        ` : "";

        const cancionHtml = r.cancion ? `
            <div class="app-card-song">
                <i class="ph ph-music-notes"></i>
                <span>${escaparHTML(r.cancion)}</span>
            </div>
        ` : "";

        let mesaBadge = "";
        if (infoMesas.mesasUnicas.length === 1 && !infoMesas.algunoSinMesa) {
            mesaBadge = `
                <span class="app-mesa-badge" title="Mesa asignada">
                    <i class="ph ph-armchair"></i> ${escaparHTML(infoMesas.mesasUnicas[0])}
                </span>
            `;
        } else if (infoMesas.mesasUnicas.length > 1) {
            mesaBadge = `
                <span class="app-mesa-badge" title="Mesas: ${escaparAtributo(infoMesas.mesasUnicas.join(", "))}">
                    <i class="ph ph-armchair"></i> ${infoMesas.mesasUnicas.length} mesas
                </span>
            `;
        } else if (r.asiste && infoMesas.asignadosCount > 0 && infoMesas.algunoSinMesa) {
            mesaBadge = `
                <span class="app-mesa-badge" title="Algunos miembros ya tienen mesa y otros están pendientes">
                    <i class="ph ph-armchair"></i> ${infoMesas.asignadosCount}/${r.numero_invitados} en mesa
                </span>
            `;
        }

        const origenBadge = r.origen === "manual"
            ? `<span class="app-origin-badge manual" title="Creada manualmente por organizadoras"><i class="ph ph-phone-outgoing"></i> Manual</span>`
            : `<span class="app-origin-badge web" title="Confirmada desde la web"><i class="ph ph-globe"></i> Web</span>`;

        card.innerHTML = `
            <div class="app-card-top">
                <div class="app-card-badges">
                    <span class="reserva-card-badge ${r.asiste ? "asiste" : "no-asiste"}">
                        <i class="ph ph-${r.asiste ? "check-circle" : "x-circle"}"></i>
                        ${r.asiste ? `Asiste (${r.numero_invitados})` : "No asiste"}
                    </span>
                    ${mesaBadge}
                    ${origenBadge}
                </div>
                <span class="app-card-date">${escaparHTML(r.fecha || "")}</span>
            </div>

            <div class="app-card-title-row">
                <h3 class="app-card-main-title">${escaparHTML(r.nombres)}</h3>
            </div>

            ${invitadosMiniHtml}
            ${contactoHtml}
            ${observacionesHtml}
            ${notasInternasHtml}
            ${cancionHtml}

            <div class="app-card-actions">
                <button type="button" class="app-card-btn btn-ver" title="Ver detalles completos">
                    <i class="ph ph-eye"></i> Detalle
                </button>
                <button type="button" class="app-card-btn btn-editar" title="Editar invitados, mesas individuales, menús, alergias o bus">
                    <i class="ph ph-pencil-simple"></i> Editar / Mesas
                </button>
                <button type="button" class="app-card-btn btn-eliminar" title="Eliminar reserva de Firestore y Excel">
                    <i class="ph ph-trash"></i> Eliminar
                </button>
            </div>
        `;

        card.querySelectorAll(".chip-link").forEach(link => {
            link.addEventListener("click", (e) => e.stopPropagation());
        });

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
 * Abre el modal para CREAR una nueva invitación manual (opcionalmente pre-rellenada desde una mesa).
 */
function abrirModalNuevaManual(prellenado = null) {
    if (!modalReservaManual || !manualForm) return;
    manualForm.reset();
    manualEditIdInput.value = "";

    if (modalManualTitle) modalManualTitle.textContent = "Nueva Invitación Manual";
    if (modalManualSubtitle) {
        modalManualSubtitle.textContent = prellenado && prellenado.nombre
            ? `Confirmando asistencia de ${prellenado.nombre}`
            : "Ideal para registrar por teléfono a familiares o invitados que no usan la web.";
    }
    if (modalManualIcon) modalManualIcon.innerHTML = '<i class="ph ph-user-plus"></i>';
    if (btnGuardarManualText) btnGuardarManualText.textContent = "Guardar en Firestore";

    if (manualGuestCountSelect) {
        manualGuestCountSelect.value = "1";
    }
    const valoresIniciales = prellenado && (prellenado.nombre || prellenado.mesa)
        ? [{
            nombre: prellenado.nombre || "",
            mesa: prellenado.mesa || "",
            menu: "adulto",
            tieneAlergia: false,
            alergia: "",
            bus: "si"
        }]
        : [];

    renderizarFilasInvitados(manualGuestsContainer, 1, "manual", valoresIniciales);
    if (manualExtraFields) manualExtraFields.style.display = "block";

    modalReservaManual.classList.add("activo");
}

/**
 * Abre el modal para EDITAR una reserva existente en Firestore (incluyendo la mesa de cada invitado).
 */
function abrirModalEdicion(reserva) {
    if (!modalReservaManual || !manualForm) return;
    cerrarModalDetalle();

    manualForm.reset();
    manualEditIdInput.value = reserva.id;

    if (modalManualTitle) modalManualTitle.textContent = "Editar Reserva y Mesas";
    if (modalManualSubtitle) modalManualSubtitle.textContent = `Modificando los datos y mesas individuales de: ${reserva.nombres}`;
    if (modalManualIcon) modalManualIcon.innerHTML = '<i class="ph ph-pencil-simple-line"></i>';
    if (btnGuardarManualText) btnGuardarManualText.textContent = "Guardar Cambios";

    const count = reserva.asiste ? Math.max(1, Math.min(10, reserva.invitados.length || reserva.numero_invitados || 1)) : 0;

    if (manualGuestCountSelect) {
        manualGuestCountSelect.value = String(count);
    }

    const invitadosConMesaEfectiva = (reserva.invitados || []).map((inv, idx) => ({
        ...inv,
        mesa: obtenerNombreMesaEfectiva(reserva, idx, inv)
    }));

    const mesaNoAsistePrev = !reserva.asiste
        ? ((reserva.noAsistenMesas && reserva.noAsistenMesas[0] && reserva.noAsistenMesas[0].mesa) || reserva.mesa || "")
        : "";

    renderizarFilasInvitados(
        manualGuestsContainer,
        count,
        "manual",
        invitadosConMesaEfectiva,
        !reserva.asiste ? reserva.nombres : "",
        mesaNoAsistePrev
    );

    if (manualExtraFields) {
        manualExtraFields.style.display = count > 0 ? "block" : "none";
    }
    if (manualSongInput) {
        manualSongInput.value = reserva.cancion || "";
    }
    if (manualPhoneInput) {
        manualPhoneInput.value = reserva.telefono || "";
    }
    if (manualNotesInput) {
        manualNotesInput.value = reserva.observaciones || "";
    }
    if (manualNotasInternasInput) {
        manualNotasInternasInput.value = reserva.notasInternas || "";
    }

    modalReservaManual.classList.add("activo");
}

/** Cierra el modal de reserva manual / edición */
function cerrarModalManual() {
    if (!modalReservaManual) return;
    modalReservaManual.classList.remove("activo");
}

/**
 * Lee los valores actualmente escritos en el modal manual (incluyendo mesa individual por invitado)
 * para no perderlos si la organizadora cambia el selector de número de asistentes.
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
        const mesaSelect = manualForm.querySelector(`[name="manual-mesa-select-${i}"]`);
        const mesaCustom = manualForm.querySelector(`[name="manual-mesa-custom-${i}"]`);

        const selVal = mesaSelect ? mesaSelect.value : "";
        const customVal = mesaCustom ? mesaCustom.value : "";

        actuales.push({
            nombre: nombreInput.value,
            menu: menuChecked ? menuChecked.value : "adulto",
            tieneAlergia: allergyChecked ? allergyChecked.value === "si" : false,
            alergia: allergyText ? allergyText.value : "",
            bus: busChecked ? busChecked.value : "si",
            mesaSelect: selVal,
            mesaCustom: customVal,
            mesa: selVal === "__NUEVA_MESA__" ? customVal : selVal
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
            const primeraMesaPrevia = (valoresActuales.find(v => v.mesa) || {}).mesa || "";
            renderizarFilasInvitados(manualGuestsContainer, 0, "manual", [], nombrePrevio, primeraMesaPrevia);
        }
    });
}

/**
 * Si algún invitado de la reserva tiene escrita una mesa nueva que aún no existe en la colección "mesas",
 * la crea automáticamente con el siguiente número de orden y vincula su mesaId.
 */
async function asegurarMesasNuevasEnFirestore(db, mesasCollection, reservaObj) {
    const nombresCandidatos = [];
    if (reservaObj.asiste && Array.isArray(reservaObj.invitados)) {
        reservaObj.invitados.forEach(inv => {
            if (inv.mesa && !inv.mesaId) nombresCandidatos.push(inv.mesa);
        });
    } else if (!reservaObj.asiste && Array.isArray(reservaObj.noAsistenMesas)) {
        reservaObj.noAsistenMesas.forEach(item => {
            if (item.mesa && !item.mesaId) nombresCandidatos.push(item.mesa);
        });
    }

    if (nombresCandidatos.length === 0) return;

    const existentesNorm = new Map();
    todasLasMesas.forEach(m => existentesNorm.set(normalizarNombrePersona(m.nombre), m.id));

    let siguienteOrden = todasLasMesas.reduce((max, m) => Math.max(max, m.orden < 999 ? m.orden : 0), 0) + 1;

    for (const nombreMesa of nombresCandidatos) {
        const norm = normalizarNombrePersona(nombreMesa);
        if (!norm) continue;
        if (!existentesNorm.has(norm)) {
            const nuevaRef = await addDoc(collection(db, mesasCollection), {
                nombre: nombreMesa.trim(),
                orden: siguienteOrden++,
                capacidad: 10,
                tipo: "redonda",
                nota: "",
                miembrosPrevistos: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            existentesNorm.set(norm, nuevaRef.id);
        }
    }

    if (reservaObj.asiste && Array.isArray(reservaObj.invitados)) {
        reservaObj.invitados.forEach(inv => {
            const norm = normalizarNombrePersona(inv.mesa);
            if (norm && existentesNorm.has(norm)) {
                inv.mesaId = existentesNorm.get(norm);
            }
        });
    }
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

        let origenReserva = "manual";
        let nombresOriginal = "";
        let existente = null;
        let noAsistenMesasPrevias = [];

        if (esEdicion) {
            existente = todasLasReservas.find(r => r.id === editId) || null;
            if (existente) {
                if (existente.origen) origenReserva = existente.origen;
                nombresOriginal = existente.nombres || "";
                if (existente.asiste && parseInt(countVal, 10) === 0) {
                    noAsistenMesasPrevias = (existente.invitados || [])
                        .map((inv, idx) => {
                            const mEfectiva = obtenerNombreMesaEfectiva(existente, idx, inv);
                            const mDoc = mEfectiva
                                ? todasLasMesas.find(m => normalizarNombrePersona(m.nombre) === normalizarNombrePersona(mEfectiva))
                                : null;
                            return {
                                nombre: inv.nombre || "",
                                mesa: mEfectiva,
                                mesaId: mDoc ? mDoc.id : (inv.mesaId || "")
                            };
                        })
                        .filter(x => x.mesa);
                }
            }
        }

        const reservaObj = construirDatosReserva(manualForm, countVal, "manual", origenReserva, {
            noAsistenMesasPrevias,
            invitadosPrevios: existente ? existente.invitados : []
        });

        try {
            const { db, reservasCollection, mesasCollection } = await obtenerFirestore();

            await asegurarMesasNuevasEnFirestore(db, mesasCollection, reservaObj);

            if (esEdicion) {
                await updateDoc(doc(db, reservasCollection, editId), reservaObj);
                enviarEspejoGoogleSheets(reservaObj, "[EDITADO PANEL]", {
                    accion: "actualizar",
                    id: editId,
                    nombresOriginal
                });
                mostrarToast(`Reserva de ${reservaObj.nombres} actualizada correctamente`, "success");
            } else {
                reservaObj.createdAt = Date.now();
                const docRef = await addDoc(collection(db, reservasCollection), reservaObj);
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
 * Muestra un modal de confirmación elegante antes de eliminar una reserva o una mesa.
 */
function solicitarConfirmacionEliminar(reserva, opcionesCustom = null) {
    const titulo = opcionesCustom && opcionesCustom.titulo
        ? opcionesCustom.titulo
        : "¿Eliminar esta reserva?";
    const htmlTexto = opcionesCustom && opcionesCustom.htmlTexto
        ? opcionesCustom.htmlTexto
        : `Vas a eliminar definitivamente la reserva de <strong>${escaparHTML(reserva.nombres)}</strong> tanto del panel (Firestore) como del Excel de Google Sheets.`;

    if (!modalConfirmarEliminar) {
        return Promise.resolve(window.confirm(titulo));
    }

    if (confirmarEliminarTitulo) {
        confirmarEliminarTitulo.textContent = titulo;
    }
    if (confirmarEliminarTexto) {
        confirmarEliminarTexto.innerHTML = htmlTexto;
    }
    modalConfirmarEliminar.classList.add("activo");

    return new Promise((resolve) => {
        resolverConfirmacionEliminar = resolve;
    });
}

function cerrarModalConfirmarEliminar(resultado = false) {
    if (modalConfirmarEliminar) {
        modalConfirmarEliminar.classList.remove("activo");
    }
    if (resolverConfirmacionEliminar) {
        const fn = resolverConfirmacionEliminar;
        resolverConfirmacionEliminar = null;
        fn(resultado);
    }
}

/**
 * Elimina una reserva de Firestore y de Google Sheets previa confirmación.
 */
async function confirmarYEliminarReserva(reserva) {
    const confirmado = await solicitarConfirmacionEliminar(reserva);
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

/**
 * Exporta en 1 clic un archivo CSV compatible con Excel España (UTF-8 BOM + separador ';')
 * ordenando a cada persona por su mesa individual (incluso si miembros de una misma reserva van en mesas distintas).
 */
function exportarInformeCatering() {
    const asistentes = todasLasReservas.filter(r => r.asiste);
    if (asistentes.length === 0) {
        mostrarToast("Todavía no hay asistentes confirmados para exportar", "info");
        return;
    }

    const escaparCSV = (valor) => {
        const str = String(valor ?? "").replace(/\r?\n/g, " ").trim();
        if (/[;"\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const ordenPorMesaNorm = new Map();
    if (distribucionActual && Array.isArray(distribucionActual.mesas)) {
        distribucionActual.mesas.forEach((m, idx) => {
            ordenPorMesaNorm.set(normalizarNombrePersona(m.nombre), idx + 1);
        });
    }

    const filasPersonas = [];
    asistentes.forEach(r => {
        const listaInv = r.invitados && r.invitados.length > 0
            ? r.invitados
            : [{ nombre: r.nombres, menu: "adulto", tieneAlergia: false, alergia: "Ninguna", bus: "no" }];

        listaInv.forEach((inv, idx) => {
            const mesaIndiv = obtenerNombreMesaEfectiva(r, idx, inv);
            const normM = normalizarNombrePersona(mesaIndiv);
            const ordenM = normM && ordenPorMesaNorm.has(normM) ? ordenPorMesaNorm.get(normM) : 99999;

            filasPersonas.push({
                reserva: r,
                inv,
                idx,
                mesaIndiv: mesaIndiv || "Sin asignar",
                tieneMesa: Boolean(mesaIndiv),
                ordenMesa: ordenM
            });
        });
    });

    filasPersonas.sort((a, b) => {
        if (a.tieneMesa !== b.tieneMesa) return a.tieneMesa ? -1 : 1;
        if (a.ordenMesa !== b.ordenMesa) return a.ordenMesa - b.ordenMesa;
        const cmpMesa = a.mesaIndiv.localeCompare(b.mesaIndiv, "es", { numeric: true, sensitivity: "base" });
        if (cmpMesa !== 0) return cmpMesa;
        const cmpGrupo = a.reserva.nombres.localeCompare(b.reserva.nombres, "es", { sensitivity: "base" });
        if (cmpGrupo !== 0) return cmpGrupo;
        return a.idx - b.idx;
    });

    const filasCSV = [];
    filasCSV.push([
        "Mesa Individual",
        "Nombre Invitado",
        "Grupo / Reserva",
        "Menú",
        "¿Alergia?",
        "Detalle Alergias / Intolerancias",
        "Autobús",
        "Teléfono Contacto",
        "Observaciones Invitado",
        "Notas Internas Organizadoras",
        "Canción Sugerida",
        "Origen",
        "Fecha Confirmación"
    ].map(escaparCSV).join(";"));

    let totalPersonas = 0;
    let totalAdultos = 0;
    let totalNinos = 0;
    let totalAlergias = 0;
    let totalBus = 0;

    filasPersonas.forEach(item => {
        const { reserva: r, inv, idx, mesaIndiv } = item;
        totalPersonas++;
        const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
        if (esNino) totalNinos++;
        else totalAdultos++;

        const alergiaTxt = String(inv.alergia || "").trim();
        const hayAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(alergiaTxt);
        if (hayAlergia) totalAlergias++;

        const usaBus = /^s[íi]/i.test(String(inv.bus || ""));
        if (usaBus) totalBus++;

        filasCSV.push([
            mesaIndiv,
            inv.nombre || `Invitado ${idx + 1}`,
            r.nombres,
            esNino ? "Niño" : "Adulto",
            hayAlergia ? "SÍ" : "No",
            hayAlergia ? alergiaTxt : "Ninguna",
            usaBus ? "SÍ" : "No",
            r.telefono || "",
            r.observaciones || "",
            r.notasInternas || "",
            r.cancion || "",
            r.origen === "manual" ? "Manual" : "Web",
            r.fecha || ""
        ].map(escaparCSV).join(";"));
    });

    filasCSV.push("");
    filasCSV.push(["RESUMEN GLOBAL CATERING Y AUTOBUSES", "TOTAL"].join(";"));
    filasCSV.push(["Total Asistentes Confirmados", totalPersonas].join(";"));
    filasCSV.push(["Total Menús Adulto", totalAdultos].join(";"));
    filasCSV.push(["Total Menús Niño", totalNinos].join(";"));
    filasCSV.push(["Total Invitados con Alergias / Intolerancias", totalAlergias].join(";"));
    filasCSV.push(["Total Plazas de Autobús", totalBus].join(";"));

    const contenido = "\uFEFF" + filasCSV.join("\r\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const hoy = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Catering_Boda_Lorena_y_Estefania_${hoy}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    mostrarToast(`Informe exportado (${totalPersonas} asistentes)`, "success");
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
    const infoMesas = obtenerEstadoMesasDeReserva(reserva);

    detalleHeader.innerHTML = `
        <div class="detalle-header-top-row">
            <span class="reserva-card-badge ${asiste ? "asiste" : "no-asiste"}">
                <i class="ph ph-${asiste ? "check-circle" : "x-circle"}"></i>
                ${asiste ? `Confirmado (${reserva.numero_invitados} asistente${reserva.numero_invitados === 1 ? "" : "s"})` : "No asiste"}
            </span>
            <div class="detalle-crud-actions">
                <button type="button" class="app-btn app-btn-secondary btn-sm" id="btn-detalle-editar">
                    <i class="ph ph-pencil-simple"></i> Editar datos / mesas
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
            const mesaInv = obtenerNombreMesaEfectiva(reserva, i, inv);
            const delay = (i * 60) + "ms";

            return `
            <div class="detalle-guest-card fade-in" style="animation-delay:${delay}">
                <div class="guest-name-large">${escaparHTML(inv.nombre || `Invitado ${i + 1}`)}</div>
                <div class="guest-badges">
                    <span class="guest-badge ${mesaInv ? "badge-mesa" : "badge-sin-mesa"}">
                        🪑 <span>${escaparHTML(mesaInv || "Sin mesa asignada")}</span>
                    </span>
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

    const resumenMesasTexto = infoMesas.mesasUnicas.length > 0
        ? infoMesas.mesasUnicas.join(", ") + (infoMesas.algunoSinMesa ? " (con personas pendientes de mesa)" : "")
        : "Sin asignar";

    let extraFieldsHtml = `
        <div class="detalle-field fade-in">
            <div class="detalle-field-label">📅 Fecha de registro</div>
            <div class="detalle-field-value">${escaparHTML(reserva.fecha || "—")}</div>
        </div>
        <div class="detalle-field fade-in">
            <div class="detalle-field-label">🌐 Origen</div>
            <div class="detalle-field-value">${reserva.origen === "manual" ? "Registro Manual (Organizadoras)" : "Formulario Web Público"}</div>
        </div>
        <div class="detalle-field fade-in">
            <div class="detalle-field-label">🪑 Mesas de la reserva</div>
            <div class="detalle-field-value">${escaparHTML(resumenMesasTexto)}</div>
        </div>
    `;

    if (reserva.telefono) {
        const waNum = obtenerNumeroWhatsApp(reserva.telefono);
        extraFieldsHtml += `
            <div class="detalle-field fade-in">
                <div class="detalle-field-label">📞 Teléfono de contacto</div>
                <div class="detalle-field-value">
                    <a href="tel:${escaparAtributo(reserva.telefono.replace(/\s+/g, ""))}" style="color:var(--primary); font-weight:600; text-decoration:none;">
                        ${escaparHTML(reserva.telefono)}
                    </a>
                    ${waNum ? ` · <a href="https://wa.me/${waNum}" target="_blank" rel="noopener noreferrer" style="color:#059669; font-weight:600; text-decoration:none;">Abrir WhatsApp</a>` : ""}
                </div>
            </div>
        `;
    }

    if (reserva.observaciones) {
        extraFieldsHtml += `
            <div class="detalle-field fade-in">
                <div class="detalle-field-label">💬 Observaciones del invitado</div>
                <div class="detalle-field-value">${escaparHTML(reserva.observaciones)}</div>
            </div>
        `;
    }

    if (reserva.notasInternas) {
        extraFieldsHtml += `
            <div class="detalle-field fade-in">
                <div class="detalle-field-label">📝 Nota interna (Organizadoras)</div>
                <div class="detalle-field-value">${escaparHTML(reserva.notasInternas)}</div>
            </div>
        `;
    }

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
            <h4 class="detalle-section-title"><i class="ph ph-users-three"></i> Desglose de Asistentes y Mesas</h4>
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
// 8B. ORGANIZADOR VISUAL Y MANUAL DE MESAS (Croquis, Estados y Asignación)
// ==========================================================================

/**
 * Genera el croquis gráfico (redondo o imperial) con las sillas alrededor de la mesa.
 */
function generarCroquisVisualMesaHTML(mesa) {
    const asientosActivos = mesa.asientos.filter(a => a.tipoAsiento !== "no-asiste");
    const totalSillas = Math.max(mesa.capacidad, asientosActivos.length);
    const maxSillasVisual = Math.min(totalSillas, 16);

    const construirSillaHTML = (idx, posStyle = "") => {
        const asiento = asientosActivos[idx];
        const esExceso = idx >= mesa.capacidad;
        let claseEstado = "chair-libre";
        let textoSilla = String(idx + 1);
        let tooltip = `Asiento ${idx + 1}: Libre`;

        if (asiento) {
            textoSilla = obtenerInicialesPersona(asiento.nombre);
            if (asiento.tipoAsiento === "confirmado") {
                claseEstado = "chair-confirmado";
                tooltip = `✅ Confirmado: ${asiento.nombre}`;
            } else {
                claseEstado = "chair-pendiente";
                tooltip = `⏳ FALTA POR CONFIRMAR: ${asiento.nombre}`;
            }
        }

        return `
            <div class="croquis-chair ${claseEstado} ${esExceso ? "chair-exceso" : ""}"
                 style="${posStyle}"
                 title="${escaparAtributo(tooltip)}">
                ${escaparHTML(textoSilla)}
            </div>
        `;
    };

    const subTextoCentro = mesa.exceso > 0
        ? `+${mesa.exceso} sobre cupo`
        : (mesa.huecosLibres === 0 ? "¡Mesa completa!" : `${mesa.huecosLibres} libre${mesa.huecosLibres === 1 ? "" : "s"}`);

    const centroHtml = `
        <div class="croquis-table-surface">
            <span class="croquis-surface-nums">${mesa.confirmadosCount}/${mesa.capacidad}</span>
            <span class="croquis-surface-sub">Confirmados</span>
            <small style="font-size:0.64rem; color:#833441; font-weight:600; margin-top:1px;">${escaparHTML(subTextoCentro)}</small>
        </div>
    `;

    if (mesa.tipo === "imperial") {
        const mitadSuperior = Math.ceil(maxSillasVisual / 2);
        let filaArriba = "";
        let filaAbajo = "";
        for (let i = 0; i < maxSillasVisual; i++) {
            if (i < mitadSuperior) filaArriba += construirSillaHTML(i);
            else filaAbajo += construirSillaHTML(i);
        }
        return `
            <div class="croquis-stage is-imperial">
                <div class="croquis-imperial-row">${filaArriba}</div>
                ${centroHtml}
                <div class="croquis-imperial-row">${filaAbajo}</div>
            </div>
        `;
    }

    // Mesa Redonda (sillas distribuidas en círculo de 360º)
    let sillasCirculoHtml = "";
    for (let i = 0; i < maxSillasVisual; i++) {
        const angulo = (2 * Math.PI * i) / maxSillasVisual - Math.PI / 2;
        const leftPct = (50 + 41 * Math.cos(angulo)).toFixed(2);
        const topPct = (50 + 41 * Math.sin(angulo)).toFixed(2);
        sillasCirculoHtml += construirSillaHTML(i, `left:${leftPct}%; top:${topPct}%;`);
    }

    return `
        <div class="croquis-stage is-redonda">
            ${centroHtml}
            ${sillasCirculoHtml}
        </div>
    `;
}

/**
 * Renderiza por completo la pestaña "Distribución de Mesas":
 * KPIs, panel de quién falta por asignarse en mesa y tarjetas visuales de mesas.
 */
function renderizarVistaMesas() {
    if (!distribucionActual) return;

    const { mesas, pendientesDeMesa, reservasNoAsisten = [], totales } = distribucionActual;

    const setTexto = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
    };

    setTexto("stat-mesas-creadas", totales.totalMesas);
    setTexto("stat-mesas-confirmados", totales.totalConfirmadosEnMesa);
    setTexto("stat-mesas-pendientes", totales.totalFaltaPorConfirmar);
    setTexto("stat-mesas-no-asisten", totales.totalNoAsistenEnMesa);
    setTexto("stat-mesas-sin-asignar", totales.totalSinMesa);
    setTexto("badge-pendientes-mesa", totales.totalSinMesa);

    // 1. Renderizar panel "¿Quién falta por asignarse en mesa?"
    if (panelPendientesMesa && listaPendientesMesa) {
        const todoAsignado = totales.totalSinMesa === 0;
        panelPendientesMesa.classList.toggle("all-assigned", todoAsignado);
        listaPendientesMesa.style.display = pendientesMesaOculto ? "none" : "grid";

        if (pendientesDeMesa.length === 0) {
            const hayAlgunAsistente = totales.totalConfirmadosEnMesa > 0;
            listaPendientesMesa.innerHTML = `
                <div class="pendientes-empty-ok">
                    <i class="ph ph-${hayAlgunAsistente ? "seal-check" : "info"}" style="font-size:1.3rem;"></i>
                    <span>${hayAlgunAsistente
                        ? "🎉 ¡Todos los asistentes confirmados tienen ya su mesa asignada por vosotras!"
                        : "Todas las reservas de la web aparecerán aquí en pendiente para que solo vosotras organicéis las mesas."}</span>
                </div>
            `;
        } else {
            const opcionesMesasDirectas = mesas.map(m =>
                `<option value="mesa:${escaparAtributo(m.nombre)}">🪑 ${escaparHTML(m.ordenVisual + ". " + m.nombre)} (${m.ocupadosActivos}/${m.capacidad})</option>`
            ).join("");

            const sitiosPrevistosPendientes = [];
            mesas.forEach(m => {
                if (m.esVirtual) return;
                (m.miembrosPrevistos || []).forEach(mp => {
                    if (mp.estadoManual !== "confirmado" && mp.estadoManual !== "no-asiste") {
                        sitiosPrevistosPendientes.push({
                            mesaId: m.id,
                            mesaNombre: m.nombre,
                            mpId: mp.id,
                            mpNombre: mp.nombre
                        });
                    }
                });
            });

            const opcionesVincularPrevistos = sitiosPrevistosPendientes.length > 0
                ? `<optgroup label="🔗 Es una persona prevista en mesa (sustituir y confirmar)">
                    ${sitiosPrevistosPendientes.map(sp =>
                        `<option value="vincular_mp:${escaparAtributo(sp.mesaId)}:${escaparAtributo(sp.mpId)}">🔗 ${escaparHTML(sp.mesaNombre)} → «${escaparHTML(sp.mpNombre)}»</option>`
                    ).join("")}
                   </optgroup>`
                : "";

            const bloqueOpcionesPendiente = opcionesVincularPrevistos
                ? `<optgroup label="🪑 Añadir asiento en mesa">${opcionesMesasDirectas}</optgroup>${opcionesVincularPrevistos}`
                : opcionesMesasDirectas;

            listaPendientesMesa.innerHTML = pendientesDeMesa.map(item => {
                const esNino = /ni[ñn]o|beb|infant/i.test(item.inv.menu || "");
                const hayAlergia = Boolean(item.inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(item.inv.alergia || "");

                return `
                    <div class="pendiente-guest-card">
                        <div class="pendiente-guest-top">
                            <div>
                                <div class="pendiente-guest-name">${escaparHTML(item.nombre)}</div>
                                <div class="pendiente-guest-group">Reserva: ${escaparHTML(item.reserva.nombres)}</div>
                            </div>
                            <div class="app-card-guest-tags">
                                <span class="mini-tag ${esNino ? "tag-nino" : "tag-adulto"}">${esNino ? "👶" : "🍽️"}</span>
                                ${hayAlergia ? `<span class="mini-tag tag-alergia" title="${escaparAtributo(item.inv.alergia)}">⚠️ ${escaparHTML(item.inv.alergia)}</span>` : ""}
                            </div>
                        </div>
                        <div class="pendiente-guest-actions">
                            <select class="pendiente-assign-select"
                                    data-reserva-id="${escaparAtributo(item.reserva.id)}"
                                    data-guest-idx="${item.guestIndex}"
                                    aria-label="Asignar mesa a ${escaparAtributo(item.nombre)}">
                                <option value="">${mesas.length > 0 ? "Asignar a una mesa..." : "Crea primero una mesa abajo"}</option>
                                ${bloqueOpcionesPendiente}
                            </select>
                            <button type="button"
                                    class="mesa-icon-btn btn-edit-res-from-pendiente"
                                    data-reserva-id="${escaparAtributo(item.reserva.id)}"
                                    title="Abrir edición completa de esta reserva">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join("");

            listaPendientesMesa.querySelectorAll(".pendiente-assign-select").forEach(sel => {
                sel.addEventListener("change", function () {
                    const valor = this.value;
                    if (!valor) return;
                    const resId = this.getAttribute("data-reserva-id");
                    const gIdx = parseInt(this.getAttribute("data-guest-idx"), 10);

                    if (valor.startsWith("vincular_mp:")) {
                        const [, mesaId, mpId] = valor.split(":");
                        vincularMiembroPrevistoConInvitado(mesaId, mpId, resId, gIdx);
                        return;
                    }
                    const nombreMesa = valor.startsWith("mesa:") ? valor.slice(5) : valor;
                    asignarInvitadoIndividualAMesa(resId, gIdx, nombreMesa);
                });
            });

            listaPendientesMesa.querySelectorAll(".btn-edit-res-from-pendiente").forEach(btn => {
                btn.addEventListener("click", function () {
                    const resId = this.getAttribute("data-reserva-id");
                    const r = todasLasReservas.find(x => x.id === resId);
                    if (r) abrirModalEdicion(r);
                });
            });
        }
    }

    // 2. Filtrar y renderizar el Grid Visual de Mesas
    if (!mesasGrid) return;
    mesasGrid.innerHTML = "";

    const queryNorm = normalizarTextoBusqueda(textoBusquedaMesas);

    const mesasFiltradas = mesas.filter(m => {
        if (filtroVistaMesas === "con-huecos" && m.huecosLibres <= 0) return false;
        if (filtroVistaMesas === "completas" && !m.estaCompleta) return false;
        if (filtroVistaMesas === "con-pendientes" && m.pendientesCount <= 0) return false;
        if (filtroVistaMesas === "con-bajas" && m.noAsistenCount <= 0) return false;

        if (queryNorm) {
            const nombresAsientos = m.asientos.map(a => `${a.nombre} ${a.aliasMesa || ""}`).join(" ");
            const textoMesa = normalizarTextoBusqueda(`${m.nombre} ${m.nota} ${nombresAsientos}`);
            if (!textoMesa.includes(queryNorm)) return false;
        }
        return true;
    });

    if (mesas.length === 0) {
        mesasGrid.innerHTML = `
            <div class="app-empty-state">
                <div class="app-empty-icon">
                    <i class="ph ph-armchair"></i>
                </div>
                <h3>Aún no habéis creado ninguna mesa</h3>
                <p>Cread vuestra lista ordenada de mesas y anotad quién irá en cada una. Todas las reservas de la web quedan en pendientes para que solo vosotras organicéis y confirméis cada mesa manualmente.</p>
                <div class="mesas-empty-actions">
                    <button type="button" class="app-btn app-btn-primary" id="btn-empty-crear-mesa">
                        <i class="ph ph-plus-circle"></i> Crear primera mesa
                    </button>
                    <button type="button" class="app-btn app-btn-secondary" id="btn-empty-plantilla-mesas">
                        <i class="ph ph-sparkle"></i> Generar lista base (Presidencial + 6 Mesas)
                    </button>
                </div>
            </div>
        `;
        const btnCrear1 = document.getElementById("btn-empty-crear-mesa");
        const btnPlantilla = document.getElementById("btn-empty-plantilla-mesas");
        if (btnCrear1) btnCrear1.addEventListener("click", abrirModalNuevaMesa);
        if (btnPlantilla) btnPlantilla.addEventListener("click", crearPlantillaMesasBase);
        return;
    }

    if (mesasFiltradas.length === 0) {
        mesasGrid.innerHTML = `
            <div class="app-empty-state">
                <div class="app-empty-icon">
                    <i class="ph ph-magnifying-glass"></i>
                </div>
                <h3>Ninguna mesa coincide con este filtro</h3>
                <p>Prueba otro término de búsqueda o pulsa en "Todas" para ver el salón completo.</p>
            </div>
        `;
        return;
    }

    const optgroupVincularPendientesHtml = pendientesDeMesa.length > 0
        ? `<optgroup label="🔗 Vincular con invitado pendiente">
            ${pendientesDeMesa.map(p => {
                const sub = p.reserva.nombres && p.reserva.nombres !== p.nombre ? ` (${p.reserva.nombres})` : "";
                return `<option value="vincular:${escaparAtributo(p.reserva.id)}:${p.guestIndex}">🔗 Es: ${escaparHTML(p.nombre + sub)}</option>`;
            }).join("")}
           </optgroup>`
        : "";

    const optgroupVincularBajasHtml = reservasNoAsisten.length > 0
        ? `<optgroup label="✕ Vincular con reserva No Asiste">
            ${reservasNoAsisten.map(rb =>
                `<option value="vincular_baja:${escaparAtributo(rb.id)}">✕ Baja: ${escaparHTML(rb.nombres)}</option>`
            ).join("")}
           </optgroup>`
        : "";

    const generarSelectorOrganizarMpHTML = (mesaId, mpId, estadoActual) => `
        <select class="seat-mp-organize-select"
                data-mesa-id="${escaparAtributo(mesaId)}"
                data-mp-id="${escaparAtributo(mpId || "")}"
                title="Cambiar estado manualmente o vincular con una reserva recibida">
            <optgroup label="📌 Estado manual (Novias)">
                <option value="estado:pendiente" ${estadoActual === "pendiente" ? "selected" : ""}>⏳ Falta por confirmar</option>
                <option value="estado:confirmado" ${estadoActual === "confirmado" ? "selected" : ""}>✓ Confirmado (manual)</option>
                <option value="estado:no-asiste" ${estadoActual === "no-asiste" ? "selected" : ""}>✕ No asiste (baja)</option>
            </optgroup>
            ${optgroupVincularPendientesHtml}
            ${optgroupVincularBajasHtml}
        </select>
    `;

    mesasFiltradas.forEach((m) => {
        const realIdx = todasLasMesas.findIndex(tm => tm.id === m.id);
        const puedeSubir = !m.esVirtual && realIdx > 0;
        const puedeBajar = !m.esVirtual && realIdx !== -1 && realIdx < todasLasMesas.length - 1;

        const pctConfirmado = Math.min(100, (m.confirmadosCount / m.capacidad) * 100);
        const pctPendiente = Math.min(100 - pctConfirmado, (m.pendientesCount / m.capacidad) * 100);

        const capPillClass = m.exceso > 0 ? "is-over" : (m.estaCompleta ? "is-full" : "");
        const capPillText = m.exceso > 0
            ? `⚠️ ${m.ocupadosActivos}/${m.capacidad} (+${m.exceso})`
            : `${m.ocupadosActivos}/${m.capacidad} plazas`;

        // Ordenar visualmente asientos: Confirmados -> Falta por confirmar -> No asisten
        const ordenPrioridad = { "confirmado": 1, "pendiente": 2, "no-asiste": 3 };
        const asientosOrdenados = [...m.asientos].sort(
            (a, b) => (ordenPrioridad[a.tipoAsiento] || 9) - (ordenPrioridad[b.tipoAsiento] || 9)
        );

        let numSillaActiva = 0;
        const filasAsientosHtml = asientosOrdenados.length === 0
            ? `<div class="mesa-seats-empty">Mesa vacía. Anotad abajo a quién tenéis pensado sentar aquí o asignad invitados pendientes.</div>`
            : asientosOrdenados.map(asiento => {
                if (asiento.tipoAsiento === "confirmado") {
                    numSillaActiva++;

                    // Caso A: Persona prevista marcada manualmente como Confirmado por las novias
                    if (asiento.esMiembroPrevisto) {
                        return `
                            <div class="seat-row is-confirmado">
                                <div class="seat-main-info">
                                    <span class="seat-num">${numSillaActiva}</span>
                                    <div class="seat-person-details">
                                        <span class="seat-person-name">${escaparHTML(asiento.nombre)}</span>
                                        <div class="seat-person-meta">
                                            <span>Confirmado manualmente por las novias</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="seat-right-controls">
                                    <span class="seat-status-pill confirmado">✓ Confirmado</span>
                                    ${generarSelectorOrganizarMpHTML(m.id, asiento.miembroPrevistoId, "confirmado")}
                                    <button type="button"
                                            class="seat-mini-btn confirm-quick btn-seat-crear-reserva"
                                            data-nombre="${escaparAtributo(asiento.nombre)}"
                                            data-mesa-nombre="${escaparAtributo(m.nombre)}"
                                            title="Crear ficha de reserva completa (menú, alergias, autobús)">
                                        <i class="ph ph-user-plus"></i>
                                    </button>
                                    <button type="button"
                                            class="seat-mini-btn remove-seat btn-seat-quitar-mp"
                                            data-mesa-id="${escaparAtributo(m.id)}"
                                            data-mp-id="${escaparAtributo(asiento.miembroPrevistoId || "")}"
                                            title="Quitar de esta mesa">
                                        <i class="ph ph-x"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }

                    // Caso B: Invitado con reserva asignado manualmente a esta mesa por las novias
                    const inv = asiento.inv || {};
                    const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
                    const hayAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(inv.alergia || "");
                    const usaBus = /^s[íi]/i.test(inv.bus || "");
                    const aliasTagHtml = asiento.aliasMesa
                        ? `<span class="seat-alias-tag" title="Nombre previsto inicialmente en la mesa">«${escaparHTML(asiento.aliasMesa)}»</span>`
                        : "";

                    const moveOptions = mesas.map(dest => {
                        const sel = normalizarNombrePersona(dest.nombre) === normalizarNombrePersona(m.nombre) ? "selected" : "";
                        return `<option value="${escaparAtributo(dest.nombre)}" ${sel}>🪑 ${escaparHTML(dest.nombre)}</option>`;
                    }).join("");

                    return `
                        <div class="seat-row is-confirmado">
                            <div class="seat-main-info">
                                <span class="seat-num">${numSillaActiva}</span>
                                <div class="seat-person-details">
                                    <span class="seat-person-name">${escaparHTML(asiento.nombre)}${aliasTagHtml}</span>
                                    <div class="seat-person-meta">
                                        <span>${esNino ? "👶 Niño" : "🍽️ Adulto"}</span>
                                        ${hayAlergia ? `<span style="color:#dc2626; font-weight:700;">· ⚠️ ${escaparHTML(inv.alergia)}</span>` : ""}
                                        ${usaBus ? `<span>· 🚌 Bus</span>` : ""}
                                    </div>
                                </div>
                            </div>
                            <div class="seat-right-controls">
                                <span class="seat-status-pill confirmado">✓ Confirmado</span>
                                <select class="seat-move-select"
                                        data-reserva-id="${escaparAtributo(asiento.reservaId)}"
                                        data-guest-idx="${asiento.guestIndex}"
                                        title="Mover a otra mesa o devolver a pendientes">
                                    <option value="">— Quitar mesa —</option>
                                    ${moveOptions}
                                </select>
                                <button type="button"
                                        class="seat-mini-btn btn-seat-edit-res"
                                        data-reserva-id="${escaparAtributo(asiento.reservaId)}"
                                        title="Editar reserva completa">
                                    <i class="ph ph-pencil-simple"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }

                if (asiento.tipoAsiento === "pendiente") {
                    numSillaActiva++;
                    return `
                        <div class="seat-row is-pendiente">
                            <div class="seat-main-info">
                                <span class="seat-num">${numSillaActiva}</span>
                                <div class="seat-person-details">
                                    <span class="seat-person-name">${escaparHTML(asiento.nombre)}</span>
                                    <div class="seat-person-meta">
                                        <span>Pendiente de vincular o confirmar por las novias</span>
                                    </div>
                                </div>
                            </div>
                            <div class="seat-right-controls">
                                <span class="seat-status-pill pendiente">⏳ FALTA POR CONFIRMAR</span>
                                ${generarSelectorOrganizarMpHTML(m.id, asiento.miembroPrevistoId, "pendiente")}
                                <button type="button"
                                        class="seat-mini-btn confirm-quick btn-seat-crear-reserva"
                                        data-nombre="${escaparAtributo(asiento.nombre)}"
                                        data-mesa-nombre="${escaparAtributo(m.nombre)}"
                                        title="Registrar confirmación manual nueva para esta persona">
                                    <i class="ph ph-check-bold"></i>
                                </button>
                                <button type="button"
                                        class="seat-mini-btn remove-seat btn-seat-quitar-mp"
                                        data-mesa-id="${escaparAtributo(m.id)}"
                                        data-mp-id="${escaparAtributo(asiento.miembroPrevistoId || "")}"
                                        title="Quitar de esta mesa">
                                    <i class="ph ph-x"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }

                // NO ASISTE (manual de miembro previsto o vinculado a reserva de no asistencia)
                if (asiento.esMiembroPrevisto) {
                    return `
                        <div class="seat-row is-no-asiste">
                            <div class="seat-main-info">
                                <span class="seat-num">✕</span>
                                <div class="seat-person-details">
                                    <span class="seat-person-name">${escaparHTML(asiento.nombre)}</span>
                                    <div class="seat-person-meta" style="color:#b91c1c;">
                                        <span>Marcado como No Asiste por las novias (plaza libre)</span>
                                    </div>
                                </div>
                            </div>
                            <div class="seat-right-controls">
                                <span class="seat-status-pill no-asiste">✕ NO ASISTE</span>
                                ${generarSelectorOrganizarMpHTML(m.id, asiento.miembroPrevistoId, "no-asiste")}
                                <button type="button"
                                        class="seat-mini-btn remove-seat btn-seat-quitar-mp"
                                        data-mesa-id="${escaparAtributo(m.id)}"
                                        data-mp-id="${escaparAtributo(asiento.miembroPrevistoId || "")}"
                                        title="Quitar definitivamente de esta mesa">
                                    <i class="ph ph-x"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="seat-row is-no-asiste">
                        <div class="seat-main-info">
                            <span class="seat-num">✕</span>
                            <div class="seat-person-details">
                                <span class="seat-person-name">${escaparHTML(asiento.nombre)}</span>
                                <div class="seat-person-meta" style="color:#b91c1c;">
                                    <span>Indicó en su reserva que no puede asistir (plaza libre)</span>
                                </div>
                            </div>
                        </div>
                        <div class="seat-right-controls">
                            <span class="seat-status-pill no-asiste">✕ NO ASISTE</span>
                            ${asiento.reservaId ? `
                                <button type="button"
                                        class="seat-mini-btn btn-seat-ver-baja"
                                        data-reserva-id="${escaparAtributo(asiento.reservaId)}"
                                        title="Ver detalle de su respuesta de No Asistencia">
                                    <i class="ph ph-eye"></i>
                                </button>
                            ` : ""}
                            <button type="button"
                                    class="seat-mini-btn remove-seat btn-seat-quitar-baja"
                                    data-mesa-id="${escaparAtributo(m.id)}"
                                    data-mesa-nombre="${escaparAtributo(m.nombre)}"
                                    data-mp-id=""
                                    data-reserva-id="${escaparAtributo(asiento.reservaId || "")}"
                                    data-es-baja-explicita="1"
                                    title="Limpiar de la lista de esta mesa">
                                <i class="ph ph-x"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join("");

        const card = document.createElement("div");
        card.className = `mesa-visual-card fade-in ${m.exceso > 0 ? "mesa-exceso" : (m.estaCompleta ? "mesa-completa" : "")}`;

        card.innerHTML = `
            <div class="mesa-card-header">
                <div class="mesa-title-wrap">
                    <span class="mesa-order-badge">#${m.ordenVisual}</span>
                    <div>
                        <h3 class="mesa-card-title">${escaparHTML(m.nombre)}</h3>
                        ${m.nota ? `<div class="mesa-card-note"><i class="ph ph-map-pin-line"></i> ${escaparHTML(m.nota)}</div>` : ""}
                    </div>
                </div>
                <div class="mesa-header-controls">
                    ${m.esVirtual ? `
                        <button type="button" class="app-btn app-btn-secondary btn-sm btn-guardar-virtual" title="Guardar esta mesa formalmente en la lista">
                            <i class="ph ph-floppy-disk"></i> Guardar
                        </button>
                    ` : `
                        <button type="button" class="mesa-icon-btn btn-mesa-up" ${!puedeSubir ? "disabled" : ""} title="Subir posición en el orden de mesas">
                            <i class="ph ph-arrow-up"></i>
                        </button>
                        <button type="button" class="mesa-icon-btn btn-mesa-down" ${!puedeBajar ? "disabled" : ""} title="Bajar posición en el orden de mesas">
                            <i class="ph ph-arrow-down"></i>
                        </button>
                        <button type="button" class="mesa-icon-btn btn-mesa-edit" title="Editar nombre, sillas o forma de la mesa">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button type="button" class="mesa-icon-btn danger btn-mesa-delete" title="Eliminar mesa">
                            <i class="ph ph-trash"></i>
                        </button>
                    `}
                </div>
            </div>

            <div class="mesa-croquis-box">
                ${generarCroquisVisualMesaHTML(m)}
                <div class="mesa-occupancy-summary">
                    <div class="mesa-progress-track">
                        <div class="mesa-progress-seg seg-confirmado" style="width:${pctConfirmado}%"></div>
                        <div class="mesa-progress-seg seg-pendiente" style="width:${pctPendiente}%"></div>
                    </div>
                    <div class="mesa-mini-counters">
                        <span>✅ ${m.confirmadosCount} conf. · ⏳ ${m.pendientesCount} pend.${m.noAsistenCount > 0 ? ` · ❌ ${m.noAsistenCount} baja` : ""}</span>
                        <span class="mesa-cap-pill ${capPillClass}">${escaparHTML(capPillText)}</span>
                    </div>
                </div>
            </div>

            <div class="mesa-seats-list">
                ${filasAsientosHtml}
            </div>

            ${!m.esVirtual ? `
                <form class="mesa-add-member-form" data-mesa-id="${escaparAtributo(m.id)}">
                    <input type="text"
                           class="mesa-add-member-input"
                           placeholder="Anotar persona prevista en esta mesa (ej: Tía Mari, Primo Luis)..."
                           autocomplete="off">
                    <button type="submit" class="app-btn app-btn-primary btn-sm">
                        <i class="ph ph-plus"></i> Añadir
                    </button>
                </form>
            ` : ""}
        `;

        // Eventos de cabecera de la mesa
        const btnUp = card.querySelector(".btn-mesa-up");
        const btnDown = card.querySelector(".btn-mesa-down");
        const btnEdit = card.querySelector(".btn-mesa-edit");
        const btnDel = card.querySelector(".btn-mesa-delete");
        const btnVirtualSave = card.querySelector(".btn-guardar-virtual");

        if (btnUp) btnUp.addEventListener("click", () => moverOrdenMesa(m.id, -1));
        if (btnDown) btnDown.addEventListener("click", () => moverOrdenMesa(m.id, 1));
        if (btnEdit) btnEdit.addEventListener("click", () => abrirModalEditarMesa(m));
        if (btnDel) btnDel.addEventListener("click", () => confirmarYEliminarMesa(m));
        if (btnVirtualSave) btnVirtualSave.addEventListener("click", () => convertirMesaVirtualEnReal(m.nombre));

        // Eventos de los asientos confirmados de reservas (mover / quitar mesa)
        card.querySelectorAll(".seat-move-select").forEach(sel => {
            sel.addEventListener("change", function () {
                const resId = this.getAttribute("data-reserva-id");
                const gIdx = parseInt(this.getAttribute("data-guest-idx"), 10);
                const nuevaMesaNombre = this.value;
                asignarInvitadoIndividualAMesa(resId, gIdx, nuevaMesaNombre);
            });
        });

        // Eventos de organización manual de personas previstas (cambiar estado o vincular con reserva)
        card.querySelectorAll(".seat-mp-organize-select").forEach(sel => {
            sel.addEventListener("change", function () {
                const accion = this.value;
                const mesaId = this.getAttribute("data-mesa-id");
                const mpId = this.getAttribute("data-mp-id");
                if (!accion || !mesaId || !mpId) return;

                if (accion.startsWith("estado:")) {
                    const nuevoEstado = accion.slice("estado:".length);
                    cambiarEstadoManualMiembroPrevisto(mesaId, mpId, nuevoEstado);
                } else if (accion.startsWith("vincular:")) {
                    const [, resId, gIdxStr] = accion.split(":");
                    vincularMiembroPrevistoConInvitado(mesaId, mpId, resId, parseInt(gIdxStr, 10));
                } else if (accion.startsWith("vincular_baja:")) {
                    const resBajaId = accion.slice("vincular_baja:".length);
                    vincularMiembroPrevistoConBaja(mesaId, mpId, resBajaId);
                }
            });
        });

        card.querySelectorAll(".btn-seat-edit-res").forEach(btn => {
            btn.addEventListener("click", function () {
                const resId = this.getAttribute("data-reserva-id");
                const r = todasLasReservas.find(x => x.id === resId);
                if (r) abrirModalEdicion(r);
            });
        });

        card.querySelectorAll(".btn-seat-crear-reserva").forEach(btn => {
            btn.addEventListener("click", function () {
                abrirModalNuevaManual({
                    nombre: this.getAttribute("data-nombre") || "",
                    mesa: this.getAttribute("data-mesa-nombre") || ""
                });
            });
        });

        card.querySelectorAll(".btn-seat-quitar-mp").forEach(btn => {
            btn.addEventListener("click", function () {
                quitarMiembroPrevistoDeMesa(
                    this.getAttribute("data-mesa-id"),
                    this.getAttribute("data-mp-id")
                );
            });
        });

        card.querySelectorAll(".btn-seat-ver-baja").forEach(btn => {
            btn.addEventListener("click", function () {
                const resId = this.getAttribute("data-reserva-id");
                const r = todasLasReservas.find(x => x.id === resId);
                if (r) abrirModalDetalle(r);
            });
        });

        card.querySelectorAll(".btn-seat-quitar-baja").forEach(btn => {
            btn.addEventListener("click", function () {
                quitarBajaDeMesa({
                    mesaId: this.getAttribute("data-mesa-id"),
                    mesaNombre: this.getAttribute("data-mesa-nombre"),
                    mpId: this.getAttribute("data-mp-id"),
                    reservaId: this.getAttribute("data-reserva-id"),
                    esBajaExplicita: this.getAttribute("data-es-baja-explicita") === "1"
                });
            });
        });

        // Formulario rápido para añadir personas previstas a esta mesa
        const formAdd = card.querySelector(".mesa-add-member-form");
        if (formAdd) {
            formAdd.addEventListener("submit", async function (e) {
                e.preventDefault();
                const input = this.querySelector(".mesa-add-member-input");
                if (!input) return;
                const val = input.value.trim();
                if (!val) return;
                input.disabled = true;
                await anadirMiembrosPrevistosAMesa(m.id, val);
                input.value = "";
                input.disabled = false;
                input.focus();
            });
        }

        mesasGrid.appendChild(card);
    });
}

/**
 * Cambia manualmente el estado de una persona prevista en una mesa ("pendiente" | "confirmado" | "no-asiste").
 */
async function cambiarEstadoManualMiembroPrevisto(mesaId, mpId, nuevoEstado) {
    const mesa = todasLasMesas.find(m => m.id === mesaId);
    if (!mesa || !mpId) return;

    const estadoValido = nuevoEstado === "confirmado" || nuevoEstado === "no-asiste" ? nuevoEstado : "pendiente";
    const miembro = mesa.miembrosPrevistos.find(mp => mp.id === mpId);
    if (!miembro) return;

    try {
        const { db, mesasCollection } = await obtenerFirestore();
        const actualizados = mesa.miembrosPrevistos.map(mp =>
            mp.id === mpId ? { ...mp, estadoManual: estadoValido } : mp
        );
        await updateDoc(doc(db, mesasCollection, mesaId), {
            miembrosPrevistos: actualizados,
            updatedAt: Date.now()
        });

        const etiqueta = estadoValido === "confirmado"
            ? "Confirmado"
            : (estadoValido === "no-asiste" ? "NO ASISTE" : "FALTA POR CONFIRMAR");
        mostrarToast(`${miembro.nombre}: marcado como ${etiqueta}`, "success");
    } catch (err) {
        console.error("Error cambiando estado manual en mesa:", err);
        mostrarToast("No se pudo actualizar el estado en la mesa", "error");
    }
}

/**
 * Vincula manualmente una persona prevista de una mesa (ej. "Tía Mari") con un invitado real recibido
 * en una reserva pendiente (ej. "María del Carmen García"), asignándole esa mesa y reemplazando el hueco previsto.
 */
async function vincularMiembroPrevistoConInvitado(mesaId, mpId, reservaId, guestIndex) {
    const mesa = todasLasMesas.find(m => m.id === mesaId);
    const reserva = todasLasReservas.find(r => r.id === reservaId);
    if (!mesa || !reserva) return;

    const mp = mesa.miembrosPrevistos.find(item => item.id === mpId);

    try {
        const { db, reservasCollection, mesasCollection } = await obtenerFirestore();

        const listaInv = reserva.invitados && reserva.invitados.length > 0
            ? reserva.invitados.map(inv => ({ ...inv }))
            : [{
                nombre: reserva.nombres,
                menu: "adulto",
                tieneAlergia: false,
                alergia: "Ninguna",
                bus: "no",
                mesa: reserva.mesa || "",
                mesaId: "",
                aliasMesa: ""
            }];

        if (!listaInv[guestIndex]) return;

        const nombreReal = listaInv[guestIndex].nombre || "Invitado";
        const aliasDiferente = mp && normalizarNombrePersona(mp.nombre) !== normalizarNombrePersona(nombreReal)
            ? mp.nombre
            : "";

        listaInv[guestIndex].mesa = mesa.nombre;
        listaInv[guestIndex].mesaId = mesa.id;
        listaInv[guestIndex].aliasMesa = aliasDiferente;

        const nuevosMp = mesa.miembrosPrevistos.filter(item => item.id !== mpId);
        const mesaResumen = resumirMesasDeInvitados(listaInv);

        await Promise.all([
            updateDoc(doc(db, mesasCollection, mesa.id), {
                miembrosPrevistos: nuevosMp,
                updatedAt: Date.now()
            }),
            updateDoc(doc(db, reservasCollection, reserva.id), {
                invitados: listaInv,
                mesa: mesaResumen,
                updatedAt: Date.now()
            })
        ]);

        mostrarToast(`${nombreReal} confirmado/a en ${mesa.nombre}`, "success");
    } catch (err) {
        console.error("Error vinculando miembro previsto con invitado:", err);
        mostrarToast("No se pudo vincular el invitado a la mesa", "error");
    }
}

/**
 * Vincula manualmente una persona prevista de una mesa con una reserva de "No asisten",
 * dejando constancia visual de la baja ("NO ASISTE") en la mesa sin duplicar filas.
 */
async function vincularMiembroPrevistoConBaja(mesaId, mpId, reservaBajaId) {
    const mesa = todasLasMesas.find(m => m.id === mesaId);
    const reservaBaja = todasLasReservas.find(r => r.id === reservaBajaId);
    if (!mesa || !reservaBaja) return;

    const mp = mesa.miembrosPrevistos.find(item => item.id === mpId);

    try {
        const { db, reservasCollection, mesasCollection } = await obtenerFirestore();

        const etiquetaBaja = mp && normalizarNombrePersona(mp.nombre) !== normalizarNombrePersona(reservaBaja.nombres)
            ? `${reservaBaja.nombres} (${mp.nombre})`
            : reservaBaja.nombres;

        const bajasActuales = Array.isArray(reservaBaja.noAsistenMesas) ? [...reservaBaja.noAsistenMesas] : [];
        bajasActuales.push({
            nombre: etiquetaBaja,
            mesa: mesa.nombre,
            mesaId: mesa.id
        });

        const nuevosMp = mesa.miembrosPrevistos.filter(item => item.id !== mpId);

        await Promise.all([
            updateDoc(doc(db, mesasCollection, mesa.id), {
                miembrosPrevistos: nuevosMp,
                updatedAt: Date.now()
            }),
            updateDoc(doc(db, reservasCollection, reservaBaja.id), {
                noAsistenMesas: bajasActuales,
                mesa: resumirMesasDeInvitados(bajasActuales),
                updatedAt: Date.now()
            })
        ]);

        mostrarToast(`Marcado como NO ASISTE en ${mesa.nombre}`, "info");
    } catch (err) {
        console.error("Error vinculando baja en mesa:", err);
        mostrarToast("No se pudo vincular la baja a la mesa", "error");
    }
}

/**
 * Asigna o mueve a UN invitado concreto dentro de una reserva a una mesa determinada (o lo deja sin mesa).
 */
async function asignarInvitadoIndividualAMesa(reservaId, guestIndex, nuevoNombreMesa) {
    const reserva = todasLasReservas.find(r => r.id === reservaId);
    if (!reserva) return;

    try {
        const { db, reservasCollection } = await obtenerFirestore();

        const listaInv = reserva.invitados && reserva.invitados.length > 0
            ? reserva.invitados.map(inv => ({ ...inv }))
            : [{
                nombre: reserva.nombres,
                menu: "adulto",
                tieneAlergia: false,
                alergia: "Ninguna",
                bus: "no",
                mesa: reserva.mesa || "",
                mesaId: "",
                aliasMesa: ""
            }];

        if (!listaInv[guestIndex]) return;

        const nombreInvitado = listaInv[guestIndex].nombre || "Invitado";
        const mesaLimpia = String(nuevoNombreMesa || "").trim();
        const mesaDoc = mesaLimpia
            ? todasLasMesas.find(m => normalizarNombrePersona(m.nombre) === normalizarNombrePersona(mesaLimpia))
            : null;

        listaInv[guestIndex].mesa = mesaLimpia;
        listaInv[guestIndex].mesaId = mesaDoc ? mesaDoc.id : "";
        if (!mesaLimpia) {
            listaInv[guestIndex].aliasMesa = "";
        }

        const mesaResumen = resumirMesasDeInvitados(listaInv);
        await updateDoc(doc(db, reservasCollection, reservaId), {
            invitados: listaInv,
            mesa: mesaResumen,
            updatedAt: Date.now()
        });

        mostrarToast(
            mesaLimpia
                ? `${nombreInvitado} asignado/a a ${mesaLimpia}`
                : `${nombreInvitado} devuelto/a a pendientes de mesa`,
            "success"
        );
    } catch (err) {
        console.error("Error asignando mesa individual:", err);
        mostrarToast("No se pudo actualizar la mesa del invitado", "error");
    }
}

/**
 * Añade uno o varios invitados previstos (separados por comas o saltos de línea) a una mesa.
 */
async function anadirMiembrosPrevistosAMesa(mesaId, textoNombres) {
    const mesa = todasLasMesas.find(m => m.id === mesaId);
    if (!mesa) return;

    const nuevosNombres = textoNombres
        .split(/[\r\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean);

    if (nuevosNombres.length === 0) return;

    const yaEnMesaNorm = new Set([
        ...mesa.miembrosPrevistos.map(mp => normalizarNombrePersona(mp.nombre))
    ]);

    if (distribucionActual && distribucionActual.mesasPorId.has(mesaId)) {
        distribucionActual.mesasPorId.get(mesaId).asientos.forEach(a => {
            yaEnMesaNorm.add(normalizarNombrePersona(a.nombre));
        });
    }

    const agregados = [];
    nuevosNombres.forEach(nom => {
        const norm = normalizarNombrePersona(nom);
        if (norm && !yaEnMesaNorm.has(norm)) {
            yaEnMesaNorm.add(norm);
            agregados.push({
                id: generarIdCorto(),
                nombre: nom,
                estadoManual: "pendiente"
            });
        }
    });

    if (agregados.length === 0) {
        mostrarToast("Ese nombre ya figura en esta mesa", "info");
        return;
    }

    try {
        const { db, mesasCollection } = await obtenerFirestore();
        await updateDoc(doc(db, mesasCollection, mesaId), {
            miembrosPrevistos: [...mesa.miembrosPrevistos, ...agregados],
            updatedAt: Date.now()
        });
        mostrarToast(
            agregados.length === 1
                ? `${agregados[0].nombre} añadido/a a ${mesa.nombre}`
                : `${agregados.length} invitados añadidos a ${mesa.nombre}`,
            "success"
        );
    } catch (err) {
        console.error("Error añadiendo invitado previsto a mesa:", err);
        mostrarToast("No se pudo añadir el invitado a la mesa", "error");
    }
}

/**
 * Elimina a una persona prevista ("FALTA POR CONFIRMAR") de una mesa.
 */
async function quitarMiembroPrevistoDeMesa(mesaId, mpId) {
    const mesa = todasLasMesas.find(m => m.id === mesaId);
    if (!mesa || !mpId) return;

    try {
        const { db, mesasCollection } = await obtenerFirestore();
        const filtrados = mesa.miembrosPrevistos.filter(mp => mp.id !== mpId);
        await updateDoc(doc(db, mesasCollection, mesaId), {
            miembrosPrevistos: filtrados,
            updatedAt: Date.now()
        });
        mostrarToast("Invitado retirado de la mesa", "info");
    } catch (err) {
        console.error("Error quitando miembro previsto:", err);
        mostrarToast("No se pudo retirar de la mesa", "error");
    }
}

/**
 * Limpia de una mesa una fila en estado "NO ASISTE" (sin borrar la reserva de no asistencia).
 */
async function quitarBajaDeMesa({ mesaId, mesaNombre, mpId, reservaId, esBajaExplicita }) {
    try {
        const { db, reservasCollection, mesasCollection } = await obtenerFirestore();

        if (mpId && mesaId && !mesaId.startsWith("__virtual__")) {
            const mesa = todasLasMesas.find(m => m.id === mesaId);
            if (mesa) {
                const filtrados = mesa.miembrosPrevistos.filter(mp => mp.id !== mpId);
                await updateDoc(doc(db, mesasCollection, mesaId), {
                    miembrosPrevistos: filtrados,
                    updatedAt: Date.now()
                });
            }
        }

        if (esBajaExplicita && reservaId) {
            const r = todasLasReservas.find(x => x.id === reservaId);
            if (r) {
                const normMesa = normalizarNombrePersona(mesaNombre);
                const nuevasBajas = (r.noAsistenMesas || []).filter(
                    b => b.mesaId !== mesaId && normalizarNombrePersona(b.mesa) !== normMesa
                );
                const nuevaMesaTexto = normalizarNombrePersona(r.mesa) === normMesa
                    ? resumirMesasDeInvitados(nuevasBajas)
                    : r.mesa;
                await updateDoc(doc(db, reservasCollection, reservaId), {
                    noAsistenMesas: nuevasBajas,
                    mesa: nuevaMesaTexto,
                    updatedAt: Date.now()
                });
            }
        }

        mostrarToast("Asiento liberado de la mesa", "info");
    } catch (err) {
        console.error("Error quitando baja de mesa:", err);
        mostrarToast("No se pudo actualizar la mesa", "error");
    }
}

/**
 * Reordena hacia arriba (-1) o abajo (+1) una mesa en la lista de las novias.
 */
async function moverOrdenMesa(mesaId, direccion) {
    const idx = todasLasMesas.findIndex(m => m.id === mesaId);
    const nuevoIdx = idx + direccion;
    if (idx === -1 || nuevoIdx < 0 || nuevoIdx >= todasLasMesas.length) return;

    const copia = [...todasLasMesas];
    const [movida] = copia.splice(idx, 1);
    copia.splice(nuevoIdx, 0, movida);

    try {
        const { db, mesasCollection } = await obtenerFirestore();
        await Promise.all(
            copia.map((m, i) =>
                updateDoc(doc(db, mesasCollection, m.id), {
                    orden: i + 1,
                    updatedAt: Date.now()
                })
            )
        );
    } catch (err) {
        console.error("Error reordenando mesas:", err);
        mostrarToast("No se pudo cambiar el orden de la mesa", "error");
    }
}

/**
 * Convierte una mesa detectada en reservas en un documento formal de la colección "mesas".
 */
async function convertirMesaVirtualEnReal(nombreMesa) {
    try {
        const { db, mesasCollection } = await obtenerFirestore();
        const siguienteOrden = todasLasMesas.length + 1;
        await addDoc(collection(db, mesasCollection), {
            nombre: nombreMesa,
            orden: siguienteOrden,
            capacidad: 10,
            tipo: "redonda",
            nota: "",
            miembrosPrevistos: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        mostrarToast(`Mesa "${nombreMesa}" guardada en la lista`, "success");
    } catch (err) {
        console.error("Error guardando mesa virtual:", err);
        mostrarToast("No se pudo guardar la mesa", "error");
    }
}

/**
 * Abre el modal para crear una nueva mesa manualmente.
 */
function abrirModalNuevaMesa() {
    if (!modalMesa || !formMesa) return;
    formMesa.reset();
    mesaEditIdInput.value = "";

    const siguienteOrden = todasLasMesas.length + 1;
    if (modalMesaTitle) modalMesaTitle.textContent = "Crear Nueva Mesa";
    if (modalMesaSubtitle) modalMesaSubtitle.textContent = "Elige el nombre, su posición en la lista, asientos e invitados previstos.";
    if (btnGuardarMesaText) btnGuardarMesaText.textContent = "Crear Mesa";
    if (mesaOrdenInput) mesaOrdenInput.value = String(siguienteOrden);
    if (mesaCapacidadInput) mesaCapacidadInput.value = "10";
    if (mesaInvitadosInicialesWrap) mesaInvitadosInicialesWrap.style.display = "block";

    const radioRedonda = document.getElementById("mesa-tipo-redonda");
    if (radioRedonda) radioRedonda.checked = true;

    modalMesa.classList.add("activo");
    setTimeout(() => mesaNombreInput && mesaNombreInput.focus(), 120);
}

/**
 * Abre el modal para editar los datos de una mesa existente.
 */
function abrirModalEditarMesa(mesa) {
    if (!modalMesa || !formMesa) return;
    formMesa.reset();
    mesaEditIdInput.value = mesa.id;

    if (modalMesaTitle) modalMesaTitle.textContent = "Editar Mesa";
    if (modalMesaSubtitle) modalMesaSubtitle.textContent = `Configurando «${mesa.nombre}»`;
    if (btnGuardarMesaText) btnGuardarMesaText.textContent = "Guardar Cambios";

    if (mesaNombreInput) mesaNombreInput.value = mesa.nombre;
    if (mesaOrdenInput) mesaOrdenInput.value = String(mesa.ordenVisual || mesa.orden || 1);
    if (mesaCapacidadInput) mesaCapacidadInput.value = String(mesa.capacidad || 10);
    if (mesaNotaInput) mesaNotaInput.value = mesa.nota || "";
    if (mesaInvitadosInicialesWrap) mesaInvitadosInicialesWrap.style.display = "none";

    const radioTipo = document.getElementById(mesa.tipo === "imperial" ? "mesa-tipo-imperial" : "mesa-tipo-redonda");
    if (radioTipo) radioTipo.checked = true;

    modalMesa.classList.add("activo");
}

function cerrarModalMesa() {
    if (!modalMesa) return;
    modalMesa.classList.remove("activo");
}

// Guardar Creación / Edición de Mesa en Firestore
if (formMesa) {
    formMesa.addEventListener("submit", async function (e) {
        e.preventDefault();

        const nombre = (mesaNombreInput ? mesaNombreInput.value : "").trim();
        if (!nombre) {
            mostrarToast("Escribe un nombre para la mesa", "error");
            return;
        }

        const editId = (mesaEditIdInput ? mesaEditIdInput.value : "").trim();
        const orden = Math.max(1, parseInt(mesaOrdenInput ? mesaOrdenInput.value : "1", 10) || 1);
        const capacidad = Math.max(1, Math.min(40, parseInt(mesaCapacidadInput ? mesaCapacidadInput.value : "10", 10) || 10));
        const tipoChecked = formMesa.querySelector('input[name="mesa-tipo"]:checked');
        const tipo = tipoChecked && tipoChecked.value === "imperial" ? "imperial" : "redonda";
        const nota = (mesaNotaInput ? mesaNotaInput.value : "").trim();

        const duplicada = todasLasMesas.find(
            m => m.id !== editId && normalizarNombrePersona(m.nombre) === normalizarNombrePersona(nombre)
        );
        if (duplicada) {
            mostrarToast(`Ya existe una mesa llamada "${duplicada.nombre}"`, "error");
            return;
        }

        const btnGuardar = document.getElementById("btn-guardar-mesa");
        const originalBtn = btnGuardar ? btnGuardar.innerHTML : "";
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="ph ph-spinner icon-pulse"></i> <span>Guardando...</span>';
        }

        try {
            const { db, reservasCollection, mesasCollection } = await obtenerFirestore();

            if (editId) {
                const mesaAnterior = todasLasMesas.find(m => m.id === editId);
                await updateDoc(doc(db, mesasCollection, editId), {
                    nombre,
                    orden,
                    capacidad,
                    tipo,
                    nota,
                    updatedAt: Date.now()
                });

                // Si cambió el nombre de la mesa, sincronizar referencias en las reservas asignadas
                if (mesaAnterior && mesaAnterior.nombre !== nombre) {
                    const normAntiguo = normalizarNombrePersona(mesaAnterior.nombre);
                    const promesasReservas = [];

                    todasLasReservas.forEach(r => {
                        let modificada = false;
                        const nuevosInv = (r.invitados || []).map(inv => {
                            if (inv.mesaId === editId || normalizarNombrePersona(inv.mesa) === normAntiguo) {
                                modificada = true;
                                return { ...inv, mesa: nombre, mesaId: editId };
                            }
                            return inv;
                        });

                        const nuevasBajas = (r.noAsistenMesas || []).map(b => {
                            if (b.mesaId === editId || normalizarNombrePersona(b.mesa) === normAntiguo) {
                                modificada = true;
                                return { ...b, mesa: nombre, mesaId: editId };
                            }
                            return b;
                        });

                        if (modificada || normalizarNombrePersona(r.mesa) === normAntiguo) {
                            const nuevoResumen = r.asiste
                                ? resumirMesasDeInvitados(nuevosInv)
                                : resumirMesasDeInvitados(nuevasBajas);
                            promesasReservas.push(
                                updateDoc(doc(db, reservasCollection, r.id), {
                                    invitados: nuevosInv,
                                    noAsistenMesas: nuevasBajas,
                                    mesa: nuevoResumen,
                                    updatedAt: Date.now()
                                })
                            );
                        }
                    });

                    if (promesasReservas.length > 0) {
                        await Promise.all(promesasReservas);
                    }
                }

                mostrarToast(`Mesa "${nombre}" actualizada`, "success");
            } else {
                const textoIniciales = mesaInvitadosInicialesInput ? mesaInvitadosInicialesInput.value : "";
                const nombresVistos = new Set();
                const miembrosPrevistos = textoIniciales
                    .split(/[\r\n,;]+/)
                    .map(s => s.trim())
                    .filter(s => {
                        const norm = normalizarNombrePersona(s);
                        if (!norm || nombresVistos.has(norm)) return false;
                        nombresVistos.add(norm);
                        return true;
                    })
                    .map(nom => ({ id: generarIdCorto(), nombre: nom, estadoManual: "pendiente" }));

                await addDoc(collection(db, mesasCollection), {
                    nombre,
                    orden,
                    capacidad,
                    tipo,
                    nota,
                    miembrosPrevistos,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });

                mostrarToast(`Mesa "${nombre}" creada correctamente`, "success");
            }

            cerrarModalMesa();
        } catch (err) {
            console.error("Error guardando mesa:", err);
            mostrarToast("Error al guardar la mesa en Firestore", "error");
        } finally {
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = originalBtn;
            }
        }
    });
}

/**
 * Elimina una mesa de Firestore previa confirmación (manteniendo intactas las reservas de los invitados).
 */
async function confirmarYEliminarMesa(mesa) {
    const confirmado = await solicitarConfirmacionEliminar(null, {
        titulo: `¿Eliminar «${mesa.nombre}»?`,
        htmlTexto: `Se eliminará la mesa <strong>${escaparHTML(mesa.nombre)}</strong> del croquis. Las reservas de los invitados NO se borrarán (quedarán como pendientes de asignar a otra mesa).`
    });
    if (!confirmado) return;

    try {
        const { db, reservasCollection, mesasCollection } = await obtenerFirestore();
        await deleteDoc(doc(db, mesasCollection, mesa.id));

        // Limpiar asignación en reservas que apuntasen a esta mesa
        const normNombre = normalizarNombrePersona(mesa.nombre);
        const actualizaciones = [];
        todasLasReservas.forEach(r => {
            let cambio = false;
            const nuevosInv = (r.invitados || []).map(inv => {
                if (inv.mesaId === mesa.id || normalizarNombrePersona(inv.mesa) === normNombre) {
                    cambio = true;
                    return { ...inv, mesa: "", mesaId: "", aliasMesa: "" };
                }
                return inv;
            });
            if (cambio || normalizarNombrePersona(r.mesa) === normNombre) {
                actualizaciones.push(
                    updateDoc(doc(db, reservasCollection, r.id), {
                        invitados: nuevosInv,
                        mesa: resumirMesasDeInvitados(nuevosInv),
                        updatedAt: Date.now()
                    })
                );
            }
        });

        if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones);
        }

        mostrarToast(`Mesa "${mesa.nombre}" eliminada`, "info");
    } catch (err) {
        console.error("Error eliminando mesa:", err);
        mostrarToast("No se pudo eliminar la mesa", "error");
    }
}

/**
 * Crea en 1 clic una plantilla base de mesas ordenadas (Presidencial + Mesas 1 a 6) para empezar rápido.
 */
async function crearPlantillaMesasBase() {
    if (todasLasMesas.length > 0) return;
    const base = [
        { nombre: "Mesa Presidencial", capacidad: 6, tipo: "imperial", nota: "Lorena & Estefanía" },
        { nombre: "Mesa 1", capacidad: 10, tipo: "redonda", nota: "" },
        { nombre: "Mesa 2", capacidad: 10, tipo: "redonda", nota: "" },
        { nombre: "Mesa 3", capacidad: 10, tipo: "redonda", nota: "" },
        { nombre: "Mesa 4", capacidad: 10, tipo: "redonda", nota: "" },
        { nombre: "Mesa 5", capacidad: 10, tipo: "redonda", nota: "" },
        { nombre: "Mesa 6", capacidad: 10, tipo: "redonda", nota: "" }
    ];

    try {
        const { db, mesasCollection } = await obtenerFirestore();
        const ahora = Date.now();
        await Promise.all(
            base.map((item, idx) =>
                addDoc(collection(db, mesasCollection), {
                    nombre: item.nombre,
                    orden: idx + 1,
                    capacidad: item.capacidad,
                    tipo: item.tipo,
                    nota: item.nota,
                    miembrosPrevistos: [],
                    createdAt: ahora + idx,
                    updatedAt: ahora + idx
                })
            )
        );
        mostrarToast("Plantilla de mesas creada. ¡Ya podéis personalizarlas!", "success");
    } catch (err) {
        console.error("Error creando plantilla de mesas:", err);
        mostrarToast("No se pudo crear la plantilla de mesas", "error");
    }
}

/**
 * Exporta en CSV (compatible con Excel España) todas las mesas en orden con el estado de cada asiento
 * (Confirmado, FALTA POR CONFIRMAR, NO ASISTE) y los pendientes de mesa.
 */
function exportarCroquisMesasCSV() {
    if (!distribucionActual || (distribucionActual.mesas.length === 0 && distribucionActual.pendientesDeMesa.length === 0)) {
        mostrarToast("Todavía no hay mesas ni invitados para exportar", "info");
        return;
    }

    const escaparCSV = (valor) => {
        const str = String(valor ?? "").replace(/\r?\n/g, " ").trim();
        return /[;"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const filas = [];
    filas.push([
        "Orden Mesa",
        "Mesa",
        "Estado en Mesa",
        "Nombre Persona",
        "Menú",
        "Alergias / Intolerancias",
        "Autobús",
        "Nota Mesa"
    ].map(escaparCSV).join(";"));

    distribucionActual.mesas.forEach(m => {
        if (m.asientos.length === 0) {
            filas.push([m.ordenVisual, m.nombre, "MESA VACÍA", "—", "", "", "", m.nota || ""].map(escaparCSV).join(";"));
            return;
        }
        m.asientos.forEach(a => {
            const estadoTxt = a.tipoAsiento === "confirmado"
                ? "Confirmado"
                : (a.tipoAsiento === "pendiente" ? "FALTA POR CONFIRMAR" : "NO ASISTE");
            const inv = a.inv || {};
            const tieneFichaReserva = Boolean(a.esReserva);
            const nombreExport = a.aliasMesa ? `${a.nombre} (${a.aliasMesa})` : a.nombre;
            const menuTxt = a.tipoAsiento === "confirmado" && tieneFichaReserva
                ? (/ni[ñn]o|beb|infant/i.test(inv.menu || "") ? "Niño" : "Adulto")
                : "";
            const alergiaTxt = a.tipoAsiento === "confirmado" && tieneFichaReserva
                ? (inv.tieneAlergia && inv.alergia ? inv.alergia : "Ninguna")
                : "";
            const busTxt = a.tipoAsiento === "confirmado" && tieneFichaReserva
                ? (/^s[íi]/i.test(inv.bus || "") ? "SÍ" : "No")
                : "";

            filas.push([
                m.ordenVisual,
                m.nombre,
                estadoTxt,
                nombreExport,
                menuTxt,
                alergiaTxt,
                busTxt,
                m.nota || ""
            ].map(escaparCSV).join(";"));
        });
    });

    if (distribucionActual.pendientesDeMesa.length > 0) {
        filas.push("");
        filas.push(["—", "FALTA POR ASIGNAR MESA", "Confirmado (Sin mesa)", "Nombre", "Menú", "Alergias", "Autobús", "Reserva"].map(escaparCSV).join(";"));
        distribucionActual.pendientesDeMesa.forEach(p => {
            const esNino = /ni[ñn]o|beb|infant/i.test(p.inv.menu || "");
            filas.push([
                "—",
                "Sin mesa asignada",
                "Confirmado (Sin mesa)",
                p.nombre,
                esNino ? "Niño" : "Adulto",
                p.inv.tieneAlergia && p.inv.alergia ? p.inv.alergia : "Ninguna",
                /^s[íi]/i.test(p.inv.bus || "") ? "SÍ" : "No",
                p.reserva.nombres
            ].map(escaparCSV).join(";"));
        });
    }

    const contenido = "\uFEFF" + filas.join("\r\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const hoy = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mesas_Boda_Lorena_y_Estefania_${hoy}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    mostrarToast("Distribución de mesas exportada a Excel/CSV", "success");
}

// ==========================================================================
// 8C. EXPORTACIÓN EN PDF: CROQUIS DE MESAS Y DOSSIER CON MENÚS PARA CATERING
// ==========================================================================

let promesaLibreriasPDF = null;

function cargarScriptExterno(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
        document.head.appendChild(script);
    });
}

/**
 * Carga bajo demanda jsPDF + jspdf-autotable con fallback entre CDNs para no penalizar la web pública.
 */
async function cargarLibreriasPDF() {
    if (window.jspdf && window.jspdf.jsPDF && (window.jspdf.jsPDF.API.autoTable || window.jspdf.autoTable)) {
        return window.jspdf.jsPDF;
    }

    if (!promesaLibreriasPDF) {
        promesaLibreriasPDF = (async () => {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                try {
                    await cargarScriptExterno("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
                } catch (_) {
                    await cargarScriptExterno("https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js");
                }
            }

            if (window.jspdf && window.jspdf.jsPDF && !window.jsPDF) {
                window.jsPDF = window.jspdf.jsPDF;
            }

            const tieneAutoTable = window.jspdf && (window.jspdf.jsPDF.API.autoTable || window.jspdf.autoTable);
            if (!tieneAutoTable) {
                try {
                    await cargarScriptExterno("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js");
                } catch (_) {
                    await cargarScriptExterno("https://unpkg.com/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js");
                }
            }

            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error("jsPDF no disponible");
            }
            return window.jspdf.jsPDF;
        })().catch(err => {
            promesaLibreriasPDF = null;
            throw err;
        });
    }

    return promesaLibreriasPDF;
}

/**
 * Limpia texto para codificación estándar Latin-1 / WinAnsi de jsPDF conservando 100 % acentos españoles y ñ.
 */
function limpiarTextoPDF(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
        .replace(/\r?\n/g, " ")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2026/g, "...")
        .replace(/\u2022/g, "·")
        .replace(/\u20AC/g, "EUR")
        .replace(/[^\u0020-\u007E\u00A1-\u00FF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function ejecutarAutoTablePDF(doc, opciones) {
    if (typeof doc.autoTable === "function") {
        doc.autoTable(opciones);
    } else if (window.jspdf && typeof window.jspdf.autoTable === "function") {
        window.jspdf.autoTable(doc, opciones);
    } else {
        throw new Error("Plugin autoTable no disponible");
    }
}

/**
 * Estructura todos los datos de mesas, comensales, menús, alergias y pendientes para ambos informes PDF.
 */
function prepararDatosExportacionMesas(distribucion = distribucionActual) {
    if (!distribucion) return null;

    const ordenPrioridad = { "confirmado": 1, "pendiente": 2, "no-asiste": 3 };
    const alergiasDetalle = [];

    let confirmadosEnMesas = 0;
    let pendientesConfirmarEnMesas = 0;
    let adultosEnMesas = 0;
    let ninosEnMesas = 0;
    let alergiasEnMesas = 0;

    const mesasDetalle = distribucion.mesas.map(m => {
        const asientosActivos = m.asientos
            .filter(a => a.tipoAsiento === "confirmado" || a.tipoAsiento === "pendiente")
            .sort((a, b) => (ordenPrioridad[a.tipoAsiento] || 9) - (ordenPrioridad[b.tipoAsiento] || 9));

        let confirmadosMesa = 0;
        let pendientesMesa = 0;
        let adultosMesa = 0;
        let ninosMesa = 0;
        let alergiasMesa = 0;

        const comensales = asientosActivos.map((a, idx) => {
            const silla = idx + 1;
            const nombreMostrar = a.aliasMesa ? `${a.nombre} («${a.aliasMesa}»)` : a.nombre;

            if (a.tipoAsiento === "confirmado") {
                confirmadosMesa++;
                confirmadosEnMesas++;

                if (a.esReserva) {
                    const inv = a.inv || {};
                    const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
                    if (esNino) {
                        ninosMesa++;
                        ninosEnMesas++;
                    } else {
                        adultosMesa++;
                        adultosEnMesas++;
                    }

                    const alergiaRaw = String(inv.alergia || "").trim();
                    const tieneAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(alergiaRaw);
                    const alergiaEtiqueta = tieneAlergia ? alergiaRaw : "Ninguna";
                    const observaciones = a.reserva && a.reserva.observaciones
                        ? String(a.reserva.observaciones).trim()
                        : "";

                    if (tieneAlergia) {
                        alergiasMesa++;
                        alergiasEnMesas++;
                        alergiasDetalle.push({
                            mesaNombre: `${m.ordenVisual}. ${m.nombre}`,
                            silla: String(silla),
                            nombre: nombreMostrar,
                            menuEtiqueta: esNino ? "Infantil (Niño)" : "Adulto",
                            alergia: alergiaRaw,
                            observaciones
                        });
                    }

                    return {
                        silla,
                        nombre: nombreMostrar,
                        tipoAsiento: "confirmado",
                        estadoEtiqueta: "Confirmado",
                        menuCategoria: esNino ? "nino" : "adulto",
                        menuEtiqueta: esNino ? "Infantil (Niño)" : "Adulto",
                        tieneAlergia,
                        alergiaEtiqueta,
                        observaciones
                    };
                }

                // Confirmado manualmente en mesa por las novias sin ficha de reserva
                adultosMesa++;
                adultosEnMesas++;
                return {
                    silla,
                    nombre: nombreMostrar,
                    tipoAsiento: "confirmado",
                    estadoEtiqueta: "Confirmado",
                    menuCategoria: "adulto",
                    menuEtiqueta: "Adulto",
                    tieneAlergia: false,
                    alergiaEtiqueta: "Ninguna",
                    observaciones: ""
                };
            }

            // Pendiente ("FALTA POR CONFIRMAR")
            pendientesMesa++;
            pendientesConfirmarEnMesas++;
            return {
                silla,
                nombre: nombreMostrar,
                tipoAsiento: "pendiente",
                estadoEtiqueta: "Falta confirmar",
                menuCategoria: "pendiente",
                menuEtiqueta: "Sin confirmar",
                tieneAlergia: false,
                alergiaEtiqueta: "-",
                observaciones: ""
            };
        });

        return {
            id: m.id,
            ordenVisual: m.ordenVisual,
            nombre: m.nombre,
            tipo: m.tipo === "imperial" ? "imperial" : "redonda",
            formaEtiqueta: m.tipo === "imperial" ? "Imperial" : "Redonda",
            capacidad: m.capacidad,
            nota: m.nota || "",
            ocupadosActivos: asientosActivos.length,
            huecosLibres: Math.max(0, m.capacidad - asientosActivos.length),
            confirmadosMesa,
            pendientesMesa,
            adultosMesa,
            ninosMesa,
            alergiasMesa,
            comensales
        };
    });

    let adultosSinMesa = 0;
    let ninosSinMesa = 0;
    let alergiasSinMesa = 0;

    const pendientesSinMesa = (distribucion.pendientesDeMesa || []).map(p => {
        const inv = p.inv || {};
        const esNino = /ni[ñn]o|beb|infant/i.test(inv.menu || "");
        if (esNino) ninosSinMesa++;
        else adultosSinMesa++;

        const alergiaRaw = String(inv.alergia || "").trim();
        const tieneAlergia = Boolean(inv.tieneAlergia) && !/^(ninguna?|no|—|-|)$/i.test(alergiaRaw);
        const observaciones = p.reserva && p.reserva.observaciones
            ? String(p.reserva.observaciones).trim()
            : "";

        if (tieneAlergia) {
            alergiasSinMesa++;
            alergiasDetalle.push({
                mesaNombre: "Sin mesa asignada",
                silla: "-",
                nombre: p.nombre,
                menuEtiqueta: esNino ? "Infantil (Niño)" : "Adulto",
                alergia: alergiaRaw,
                observaciones
            });
        }

        return {
            nombre: p.nombre,
            grupoReserva: (p.reserva && p.reserva.nombres) || "",
            menuCategoria: esNino ? "nino" : "adulto",
            menuEtiqueta: esNino ? "Infantil (Niño)" : "Adulto",
            tieneAlergia,
            alergiaEtiqueta: tieneAlergia ? alergiaRaw : "Ninguna",
            observaciones
        };
    });

    return {
        mesas: mesasDetalle,
        pendientesSinMesa,
        alergiasDetalle,
        resumen: {
            totalMesas: mesasDetalle.length,
            confirmadosEnMesas,
            pendientesConfirmarEnMesas,
            totalActivosEnMesas: confirmadosEnMesas + pendientesConfirmarEnMesas,
            adultosEnMesas,
            ninosEnMesas,
            alergiasEnMesas,
            sinMesaCount: pendientesSinMesa.length,
            confirmadosGlobal: confirmadosEnMesas + pendientesSinMesa.length,
            adultosGlobal: adultosEnMesas + adultosSinMesa,
            ninosGlobal: ninosEnMesas + ninosSinMesa,
            alergiasGlobal: alergiasEnMesas + alergiasSinMesa
        }
    };
}

function dibujarCabeceraPDF(doc, tituloPrincipal, subtituloExtra) {
    const fechaGen = new Date().toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    // Banda superior burdeos elegante
    doc.setFillColor(131, 52, 65);
    doc.rect(0, 0, 210, 28, "F");

    // Línea fina decorativa inferior
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 28, 210, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(limpiarTextoPDF(tituloPrincipal), 14, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(252, 231, 235);
    doc.text(
        limpiarTextoPDF("Boda Lorena & Estefanía · 15 de Mayo de 2027 · Jardines Pilar de la Dehesa (Lucena, Córdoba)"),
        14,
        18.5
    );

    doc.setFontSize(8);
    doc.setTextColor(241, 218, 223);
    doc.text(limpiarTextoPDF(`${subtituloExtra} · Generado: ${fechaGen}`), 14, 24);

    return 35;
}

function dibujarTarjetasKPIPDF(doc, tarjetas, startY) {
    const margenX = 14;
    const anchoTotal = 182;
    const gap = 3.5;
    const n = tarjetas.length;
    const cardW = (anchoTotal - gap * (n - 1)) / n;
    const cardH = 17;

    tarjetas.forEach((t, idx) => {
        const x = margenX + idx * (cardW + gap);
        const esAlerta = Boolean(t.alerta);

        if (esAlerta) {
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(252, 165, 165);
        } else {
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
        }
        doc.roundedRect(x, startY, cardW, cardH, 2.2, 2.2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        if (esAlerta) doc.setTextColor(185, 28, 28);
        else if (t.destacar) doc.setTextColor(131, 52, 65);
        else doc.setTextColor(15, 23, 42);
        doc.text(limpiarTextoPDF(String(t.valor)), x + cardW / 2, startY + 7.8, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.6);
        doc.setTextColor(71, 85, 105);
        doc.text(limpiarTextoPDF(t.etiqueta), x + cardW / 2, startY + 12.6, { align: "center" });

        if (t.sub) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.8);
            doc.setTextColor(100, 116, 139);
            doc.text(limpiarTextoPDF(t.sub), x + cardW / 2, startY + 15.6, { align: "center" });
        }
    });

    return startY + cardH + 6;
}

/**
 * Dibuja en el PDF el croquis vectorial de la mesa (redonda o imperial) con sus sillas numeradas y coloreadas.
 */
function dibujarCroquisVectorialMesaPDF(doc, mesa, x, y, boxW, boxH) {
    doc.setFillColor(253, 248, 249);
    doc.setDrawColor(241, 222, 226);
    doc.roundedRect(x, y, boxW, boxH, 2.5, 2.5, "FD");

    const cx = x + boxW / 2;
    const cy = y + boxH / 2;
    const totalSillas = Math.min(Math.max(mesa.capacidad, mesa.comensales.length), 16);

    const dibujarSilla = (sx, sy, idx, radio) => {
        const comensal = mesa.comensales[idx];
        if (comensal && comensal.tipoAsiento === "confirmado") {
            doc.setFillColor(16, 185, 129);
            doc.setDrawColor(5, 150, 105);
            doc.setTextColor(255, 255, 255);
        } else if (comensal && comensal.tipoAsiento === "pendiente") {
            doc.setFillColor(245, 158, 11);
            doc.setDrawColor(217, 119, 6);
            doc.setTextColor(255, 255, 255);
        } else {
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.setTextColor(100, 116, 139);
        }

        doc.circle(sx, sy, radio, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(radio < 2.3 ? 4.8 : 5.6);
        doc.text(String(idx + 1), sx, sy + (radio < 2.3 ? 0.65 : 0.8), { align: "center" });
    };

    if (mesa.tipo === "imperial") {
        const rectW = 32;
        const rectH = 11;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(131, 52, 65);
        doc.setLineWidth(0.45);
        doc.roundedRect(cx - rectW / 2, cy - rectH / 2, rectW, rectH, 2, 2, "FD");
        doc.setLineWidth(0.2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${mesa.confirmadosMesa}/${mesa.capacidad}`, cx, cy - 0.3, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5);
        doc.setTextColor(131, 52, 65);
        doc.text("CONFIRMADOS", cx, cy + 3.2, { align: "center" });

        const mitadArriba = Math.ceil(totalSillas / 2);
        const mitadAbajo = totalSillas - mitadArriba;
        const radioImp = totalSillas > 12 ? 2.0 : 2.35;

        for (let i = 0; i < mitadArriba; i++) {
            const paso = rectW / (mitadArriba + 1);
            const sx = (cx - rectW / 2) + paso * (i + 1);
            dibujarSilla(sx, cy - rectH / 2 - 3.6, i, radioImp);
        }
        for (let j = 0; j < mitadAbajo; j++) {
            const paso = rectW / (mitadAbajo + 1);
            const sx = (cx - rectW / 2) + paso * (j + 1);
            dibujarSilla(sx, cy + rectH / 2 + 3.6, mitadArriba + j, radioImp);
        }
        return;
    }

    // Mesa Redonda
    const tableR = 9.2;
    const orbitR = 14.8;
    const chairR = totalSillas > 12 ? 2.05 : 2.45;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(131, 52, 65);
    doc.setLineWidth(0.45);
    doc.circle(cx, cy, tableR, "FD");
    doc.setLineWidth(0.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${mesa.confirmadosMesa}/${mesa.capacidad}`, cx, cy - 0.3, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(131, 52, 65);
    doc.text("CONFIRMADOS", cx, cy + 3.1, { align: "center" });

    for (let i = 0; i < totalSillas; i++) {
        const ang = (2 * Math.PI * i) / totalSillas - Math.PI / 2;
        const sx = cx + orbitR * Math.cos(ang);
        const sy = cy + orbitR * Math.sin(ang);
        dibujarSilla(sx, sy, i, chairR);
    }
}

function numerarPaginasPDF(doc, textoIzquierda) {
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 286, 196, 286);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(limpiarTextoPDF(textoIzquierda), 14, 291);
        doc.text(`Página ${p} de ${totalPaginas}`, 196, 291, { align: "right" });
    }
}

/**
 * Fallback de impresión nativa del navegador por si se abre sin conexión a internet y sin caché de CDN.
 */
function imprimirFallbackPDF(tituloDocumento, datos, incluirMenus) {
    const ventana = window.open("", "_blank");
    if (!ventana) {
        mostrarToast("Permite ventanas emergentes para generar el PDF", "error");
        return;
    }

    const bloquesMesas = datos.mesas.map(m => {
        const filas = m.comensales.length === 0
            ? `<tr><td colspan="${incluirMenus ? 5 : 3}" style="color:#64748b;text-align:center;">Mesa vacía</td></tr>`
            : m.comensales.map(c => incluirMenus
                ? `<tr>
                    <td style="text-align:center;font-weight:700;">${c.silla}</td>
                    <td>${escaparHTML(c.nombre)}</td>
                    <td>${escaparHTML(c.estadoEtiqueta)}</td>
                    <td style="font-weight:600;">${escaparHTML(c.menuEtiqueta)}</td>
                    <td style="${c.tieneAlergia ? "color:#b91c1c;font-weight:700;" : ""}">${escaparHTML(c.alergiaEtiqueta)}${c.observaciones ? " · " + escaparHTML(c.observaciones) : ""}</td>
                   </tr>`
                : `<tr>
                    <td style="text-align:center;font-weight:700;">${c.silla}</td>
                    <td>${escaparHTML(c.nombre)}</td>
                    <td>${escaparHTML(c.estadoEtiqueta)}</td>
                   </tr>`
            ).join("");

        return `
            <div class="mesa-block">
                <div class="mesa-head">
                    <strong>#${m.ordenVisual} · ${escaparHTML(m.nombre)}</strong>
                    <span>${escaparHTML(m.formaEtiqueta)} · ${m.confirmadosMesa}/${m.capacidad} confirmados${incluirMenus ? ` · Adultos: ${m.adultosMesa} · Niños: ${m.ninosMesa} · Alergias: ${m.alergiasMesa}` : ""}</span>
                </div>
                ${m.nota ? `<div class="mesa-note">Nota: ${escaparHTML(m.nota)}</div>` : ""}
                <table>
                    <thead>
                        ${incluirMenus
                            ? "<tr><th>#</th><th>Comensal</th><th>Estado</th><th>Menú</th><th>Alergias / Observaciones</th></tr>"
                            : "<tr><th>#</th><th>Invitado</th><th>Estado</th></tr>"}
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        `;
    }).join("");

    ventana.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${escaparHTML(tituloDocumento)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
  h1 { color: #833441; margin: 0 0 4px; font-size: 20px; }
  p.sub { color: #475569; margin: 0 0 18px; font-size: 12px; }
  .mesa-block { break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 14px; overflow: hidden; }
  .mesa-head { background: #833441; color: white; padding: 8px 12px; display: flex; justify-content: space-between; font-size: 13px; }
  .mesa-note { background: #fdf2f4; color: #833441; padding: 5px 12px; font-size: 11px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
  th { background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; }
</style></head><body>
  <h1>${escaparHTML(tituloDocumento)}</h1>
  <p class="sub">Lorena &amp; Estefanía · 15 de Mayo de 2027 · Jardines Pilar de la Dehesa</p>
  ${bloquesMesas}
  <script>window.onload = function(){ window.print(); };<\/script>
</body></html>`);
    ventana.document.close();
}

/**
 * DOCUMENTO 1: Exporta el PDF visual de Distribución y Protocolo de Mesas (con croquis + asientos).
 */
async function exportarMesasPDF(botonEl = null) {
    const datos = prepararDatosExportacionMesas();
    if (!datos || (datos.mesas.length === 0 && datos.pendientesSinMesa.length === 0)) {
        mostrarToast("Todavía no hay mesas ni invitados para exportar en PDF", "info");
        return;
    }

    const htmlOriginal = botonEl ? botonEl.innerHTML : "";
    if (botonEl) {
        botonEl.disabled = true;
        botonEl.innerHTML = '<i class="ph ph-spinner icon-pulse"></i> <span>Generando PDF...</span>';
    }

    try {
        const JsPDFClass = await cargarLibreriasPDF();
        const doc = new JsPDFClass({ orientation: "portrait", unit: "mm", format: "a4" });

        let cursorY = dibujarCabeceraPDF(
            doc,
            "LORENA & ESTEFANÍA · DISTRIBUCIÓN DE MESAS",
            "Plano de Protocolo y Asignación de Asientos"
        );

        cursorY = dibujarTarjetasKPIPDF(doc, [
            { etiqueta: "MESAS CREADAS", valor: datos.resumen.totalMesas, destacar: true },
            { etiqueta: "CONFIRMADOS EN MESA", valor: datos.resumen.confirmadosEnMesas },
            { etiqueta: "FALTA POR CONFIRMAR", valor: datos.resumen.pendientesConfirmarEnMesas },
            { etiqueta: "PENDIENTES DE MESA", valor: datos.resumen.sinMesaCount, alerta: datos.resumen.sinMesaCount > 0 }
        ], cursorY);

        // Leyenda cromática del croquis
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setFillColor(16, 185, 129);
        doc.circle(16, cursorY - 1, 1.5, "F");
        doc.setTextColor(51, 65, 85);
        doc.text("Confirmado", 19, cursorY);

        doc.setFillColor(245, 158, 11);
        doc.circle(42, cursorY - 1, 1.5, "F");
        doc.text("Falta por confirmar", 45, cursorY);

        doc.setFillColor(226, 232, 240);
        doc.circle(78, cursorY - 1, 1.5, "F");
        doc.text("Asiento libre", 81, cursorY);

        cursorY += 5;

        datos.mesas.forEach(m => {
            const filasEstimadas = Math.max(1, m.comensales.length);
            const altoEstimado = Math.max(52, 14 + filasEstimadas * 6.5);

            if (cursorY > 55 && cursorY + altoEstimado > 278) {
                doc.addPage();
                cursorY = 16;
            }

            // Barra de título de la mesa
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(14, cursorY, 182, 8.5, 1.8, 1.8, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(255, 255, 255);
            doc.text(limpiarTextoPDF(`#${m.ordenVisual} · ${m.nombre}`), 17.5, cursorY + 5.6);

            const infoDerecha = `${m.formaEtiqueta} · ${m.ocupadosActivos}/${m.capacidad} plazas (${m.confirmadosMesa} conf.${m.pendientesMesa > 0 ? `, ${m.pendientesMesa} pend.` : ""})`;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(226, 232, 240);
            doc.text(limpiarTextoPDF(infoDerecha), 192.5, cursorY + 5.6, { align: "right" });

            cursorY += 10;

            if (m.nota) {
                doc.setFillColor(253, 242, 244);
                doc.roundedRect(14, cursorY - 0.5, 182, 6, 1, 1, "F");
                doc.setFont("helvetica", "italic");
                doc.setFontSize(7.5);
                doc.setTextColor(131, 52, 65);
                doc.text(limpiarTextoPDF(`Ubicación / Nota: ${m.nota}`), 17, cursorY + 3.5);
                cursorY += 7;
            }

            const bloqueTopY = cursorY;
            dibujarCroquisVectorialMesaPDF(doc, m, 14, bloqueTopY, 50, 41);

            const cuerpoTabla = m.comensales.length === 0
                ? [["-", "Mesa vacía (sin invitados asignados todavía)", "Libre"]]
                : m.comensales.map(c => [
                    String(c.silla),
                    limpiarTextoPDF(c.nombre),
                    limpiarTextoPDF(c.estadoEtiqueta)
                ]);

            ejecutarAutoTablePDF(doc, {
                startY: bloqueTopY,
                margin: { left: 68, right: 14 },
                tableWidth: 128,
                head: [["Silla", "Invitado Asignado", "Estado"]],
                body: cuerpoTabla,
                theme: "grid",
                styles: {
                    font: "helvetica",
                    fontSize: 8.2,
                    cellPadding: 2.1,
                    textColor: [15, 23, 42],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2
                },
                headStyles: {
                    fillColor: [131, 52, 65],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 7.8
                },
                columnStyles: {
                    0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: 82 },
                    2: { cellWidth: 32, halign: "center", fontStyle: "bold" }
                },
                didParseCell(data) {
                    if (data.section === "body" && data.column.index === 2) {
                        const txt = String(data.cell.raw || "");
                        if (txt === "Confirmado") {
                            data.cell.styles.textColor = [5, 150, 105];
                            data.cell.styles.fillColor = [240, 253, 244];
                        } else if (txt === "Falta confirmar") {
                            data.cell.styles.textColor = [180, 83, 9];
                            data.cell.styles.fillColor = [255, 251, 235];
                        } else {
                            data.cell.styles.textColor = [100, 116, 139];
                        }
                    }
                }
            });

            const finalTablaY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || (bloqueTopY + 20);
            cursorY = Math.max(bloqueTopY + 41, finalTablaY) + 7;
        });

        // Si existen invitados confirmados aún sin mesa, añadir anexo informativo
        if (datos.pendientesSinMesa.length > 0) {
            if (cursorY > 235) {
                doc.addPage();
                cursorY = 16;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(180, 83, 9);
            doc.text(
                limpiarTextoPDF(`Invitados confirmados pendientes de asignar a mesa (${datos.pendientesSinMesa.length})`),
                14,
                cursorY + 4
            );

            ejecutarAutoTablePDF(doc, {
                startY: cursorY + 6.5,
                margin: { left: 14, right: 14 },
                head: [["#", "Nombre del Invitado", "Grupo / Reserva"]],
                body: datos.pendientesSinMesa.map((p, idx) => [
                    String(idx + 1),
                    limpiarTextoPDF(p.nombre),
                    limpiarTextoPDF(p.grupoReserva)
                ]),
                theme: "grid",
                styles: { font: "helvetica", fontSize: 8.2, cellPadding: 2.2 },
                headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: "bold" },
                columnStyles: {
                    0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: 94 },
                    2: { cellWidth: 74 }
                }
            });
        }

        numerarPaginasPDF(doc, "Boda Lorena & Estefanía · Distribución y Protocolo de Mesas");

        const hoy = new Date().toISOString().slice(0, 10);
        doc.save(`Mesas_Boda_Lorena_y_Estefania_${hoy}.pdf`);
        mostrarToast("PDF de Mesas descargado correctamente", "success");
    } catch (err) {
        console.warn("Usando ventana de impresión como respaldo para PDF de Mesas:", err);
        imprimirFallbackPDF("Distribución de Mesas", datos, false);
    } finally {
        if (botonEl) {
            botonEl.disabled = false;
            botonEl.innerHTML = htmlOriginal;
        }
    }
}

/**
 * DOCUMENTO 2: Exporta el PDF completo de Mesas + Menús + Niños + Alergias especial para el Catering.
 */
async function exportarMesasConMenusPDF(botonEl = null) {
    const datos = prepararDatosExportacionMesas();
    if (!datos || (datos.mesas.length === 0 && datos.pendientesSinMesa.length === 0)) {
        mostrarToast("Todavía no hay mesas ni comensales para exportar al catering", "info");
        return;
    }

    const htmlOriginal = botonEl ? botonEl.innerHTML : "";
    if (botonEl) {
        botonEl.disabled = true;
        botonEl.innerHTML = '<i class="ph ph-spinner icon-pulse"></i> <span>Generando PDF...</span>';
    }

    try {
        const JsPDFClass = await cargarLibreriasPDF();
        const doc = new JsPDFClass({ orientation: "portrait", unit: "mm", format: "a4" });

        let cursorY = dibujarCabeceraPDF(
            doc,
            "INFORME DE MESAS, MENÚS Y ALERGIAS · CATERING",
            "Dossier Oficial para Cocina, Maître y Servicio de Salón"
        );

        const subComensales = datos.resumen.sinMesaCount > 0
            ? `${datos.resumen.confirmadosEnMesas} en mesa + ${datos.resumen.sinMesaCount} sin ubicar`
            : `${datos.resumen.confirmadosEnMesas} sentados en mesa`;

        cursorY = dibujarTarjetasKPIPDF(doc, [
            { etiqueta: "MESAS SALÓN", valor: datos.resumen.totalMesas, destacar: true },
            { etiqueta: "COMENSALES CONF.", valor: datos.resumen.confirmadosGlobal, sub: subComensales },
            { etiqueta: "MENÚ ADULTO", valor: datos.resumen.adultosGlobal },
            { etiqueta: "MENÚ INFANTIL", valor: datos.resumen.ninosGlobal },
            { etiqueta: "ALERGIAS / INTOL.", valor: datos.resumen.alergiasGlobal, alerta: datos.resumen.alergiasGlobal > 0 }
        ], cursorY);

        // 1. CUADRO RESUMEN POR MESA (VISTA MAÎTRE)
        if (datos.mesas.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.8);
            doc.setTextColor(131, 52, 65);
            doc.text("1. RESUMEN DE COMENSALES Y MENÚS POR MESA (VISTA MAÎTRE)", 14, cursorY + 2);

            ejecutarAutoTablePDF(doc, {
                startY: cursorY + 4.5,
                margin: { left: 14, right: 14 },
                head: [[
                    "#",
                    "Mesa",
                    "Forma",
                    "Confirmados",
                    "Menú Adulto",
                    "Menú Infantil",
                    "Con Alergias",
                    "Sin Conf.",
                    "Notas / Ubicación"
                ]],
                body: datos.mesas.map(m => [
                    String(m.ordenVisual),
                    limpiarTextoPDF(m.nombre),
                    limpiarTextoPDF(m.formaEtiqueta),
                    String(m.confirmadosMesa),
                    String(m.adultosMesa),
                    String(m.ninosMesa),
                    String(m.alergiasMesa),
                    m.pendientesMesa > 0 ? String(m.pendientesMesa) : "-",
                    limpiarTextoPDF(m.nota || "-")
                ]),
                foot: [[
                    "",
                    "TOTAL EN MESAS",
                    "",
                    String(datos.resumen.confirmadosEnMesas),
                    String(datos.resumen.adultosEnMesas),
                    String(datos.resumen.ninosEnMesas),
                    String(datos.resumen.alergiasEnMesas),
                    datos.resumen.pendientesConfirmarEnMesas > 0 ? String(datos.resumen.pendientesConfirmarEnMesas) : "-",
                    ""
                ]],
                theme: "grid",
                styles: {
                    font: "helvetica",
                    fontSize: 7.8,
                    cellPadding: 2,
                    textColor: [15, 23, 42],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2
                },
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 7.4
                },
                footStyles: {
                    fillColor: [241, 245, 249],
                    textColor: [15, 23, 42],
                    fontStyle: "bold",
                    fontSize: 8
                },
                columnStyles: {
                    0: { cellWidth: 9, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: 38, fontStyle: "bold" },
                    2: { cellWidth: 17, halign: "center" },
                    3: { cellWidth: 19, halign: "center", fontStyle: "bold" },
                    4: { cellWidth: 19, halign: "center" },
                    5: { cellWidth: 19, halign: "center" },
                    6: { cellWidth: 19, halign: "center", fontStyle: "bold" },
                    7: { cellWidth: 15, halign: "center" },
                    8: { cellWidth: 27 }
                },
                didParseCell(data) {
                    if (data.section === "body") {
                        if (data.column.index === 5 && parseInt(data.cell.raw, 10) > 0) {
                            data.cell.styles.fillColor = [255, 251, 235];
                            data.cell.styles.textColor = [180, 83, 9];
                            data.cell.styles.fontStyle = "bold";
                        }
                        if (data.column.index === 6 && parseInt(data.cell.raw, 10) > 0) {
                            data.cell.styles.fillColor = [254, 242, 242];
                            data.cell.styles.textColor = [185, 28, 28];
                        }
                    }
                }
            });

            cursorY = ((doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY) + 8;
        }

        // 2. CUADRO CRÍTICO DE ALERGIAS E INTOLERANCIAS (ESPECIAL COCINA)
        if (datos.alergiasDetalle.length > 0) {
            if (cursorY > 235) {
                doc.addPage();
                cursorY = 16;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.8);
            doc.setTextColor(185, 28, 28);
            doc.text(
                limpiarTextoPDF(`2. ATENCIÓN COCINA: RELACIÓN DE ALERGIAS E INTOLERANCIAS (${datos.alergiasDetalle.length})`),
                14,
                cursorY + 2
            );

            ejecutarAutoTablePDF(doc, {
                startY: cursorY + 4.5,
                margin: { left: 14, right: 14 },
                head: [["Mesa", "Silla", "Nombre del Comensal", "Menú", "Alergia / Intolerancia Declarada", "Observaciones"]],
                body: datos.alergiasDetalle.map(al => [
                    limpiarTextoPDF(al.mesaNombre),
                    limpiarTextoPDF(al.silla),
                    limpiarTextoPDF(al.nombre),
                    limpiarTextoPDF(al.menuEtiqueta),
                    limpiarTextoPDF(al.alergia),
                    limpiarTextoPDF(al.observaciones || "-")
                ]),
                theme: "grid",
                styles: {
                    font: "helvetica",
                    fontSize: 8,
                    cellPadding: 2.2,
                    textColor: [15, 23, 42],
                    lineColor: [254, 202, 202],
                    lineWidth: 0.2
                },
                headStyles: {
                    fillColor: [185, 28, 28],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 7.6
                },
                columnStyles: {
                    0: { cellWidth: 34, fontStyle: "bold" },
                    1: { cellWidth: 11, halign: "center", fontStyle: "bold" },
                    2: { cellWidth: 46, fontStyle: "bold" },
                    3: { cellWidth: 24, halign: "center" },
                    4: { cellWidth: 41, fontStyle: "bold", textColor: [153, 27, 27], fillColor: [254, 242, 242] },
                    5: { cellWidth: 26 }
                }
            });

            cursorY = ((doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY) + 9;
        }

        // 3. DESGLOSE DETALLADO MESA POR MESA CON MENÚS
        if (datos.mesas.length > 0) {
            if (cursorY > 240) {
                doc.addPage();
                cursorY = 16;
            }

            const numSeccionDetalle = datos.alergiasDetalle.length > 0 ? "3" : "2";
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.2);
            doc.setTextColor(131, 52, 65);
            doc.text(`${numSeccionDetalle}. DETALLE INDIVIDUAL POR MESA (COMENSALES, MENÚS Y ALERGIAS)`, 14, cursorY + 2);
            cursorY += 6;

            datos.mesas.forEach(m => {
                const filasEstimadas = Math.max(1, m.comensales.length);
                const altoEstimado = 16 + filasEstimadas * 6.8 + (m.nota ? 6 : 0);

                if (cursorY > 45 && cursorY + Math.min(altoEstimado, 85) > 278) {
                    doc.addPage();
                    cursorY = 16;
                }

                // Cabecera de la mesa con conteo directo de menús para los camareros
                doc.setFillColor(131, 52, 65);
                doc.roundedRect(14, cursorY, 182, 8.5, 1.6, 1.6, "F");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.4);
                doc.setTextColor(255, 255, 255);
                doc.text(
                    limpiarTextoPDF(`#${m.ordenVisual} · ${m.nombre} (${m.formaEtiqueta})`),
                    17.5,
                    cursorY + 5.6
                );

                const resumenPlatosMesa = `Adultos: ${m.adultosMesa}  |  Infantil: ${m.ninosMesa}  |  Alergias: ${m.alergiasMesa}${m.pendientesMesa > 0 ? `  |  Sin conf.: ${m.pendientesMesa}` : ""}`;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.8);
                doc.setTextColor(254, 249, 195);
                doc.text(limpiarTextoPDF(resumenPlatosMesa), 192.5, cursorY + 5.6, { align: "right" });

                cursorY += 9.5;

                if (m.nota) {
                    doc.setFillColor(253, 242, 244);
                    doc.rect(14, cursorY - 0.5, 182, 5.8, "F");
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(7.5);
                    doc.setTextColor(131, 52, 65);
                    doc.text(limpiarTextoPDF(`Nota de salón: ${m.nota}`), 17, cursorY + 3.4);
                    cursorY += 6;
                }

                const filasComensales = m.comensales.length === 0
                    ? [["-", "Mesa vacía (sin comensales asignados)", "-", "-", "-", "-"]]
                    : m.comensales.map(c => [
                        String(c.silla),
                        limpiarTextoPDF(c.nombre),
                        limpiarTextoPDF(c.estadoEtiqueta),
                        limpiarTextoPDF(c.menuEtiqueta),
                        limpiarTextoPDF(c.alergiaEtiqueta),
                        limpiarTextoPDF(c.observaciones || "-")
                    ]);

                ejecutarAutoTablePDF(doc, {
                    startY: cursorY,
                    margin: { left: 14, right: 14 },
                    tableWidth: 182,
                    head: [["Silla", "Nombre del Comensal", "Estado", "Menú", "Alergias / Intolerancias", "Observaciones"]],
                    body: filasComensales,
                    theme: "grid",
                    styles: {
                        font: "helvetica",
                        fontSize: 8,
                        cellPadding: 2,
                        textColor: [15, 23, 42],
                        lineColor: [226, 232, 240],
                        lineWidth: 0.2
                    },
                    headStyles: {
                        fillColor: [51, 65, 85],
                        textColor: [255, 255, 255],
                        fontStyle: "bold",
                        fontSize: 7.5
                    },
                    columnStyles: {
                        0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
                        1: { cellWidth: 56, fontStyle: "bold" },
                        2: { cellWidth: 25, halign: "center" },
                        3: { cellWidth: 27, halign: "center", fontStyle: "bold" },
                        4: { cellWidth: 38 },
                        5: { cellWidth: 26 }
                    },
                    didParseCell(data) {
                        if (data.section !== "body") return;
                        const rowIdx = data.row.index;
                        const c = m.comensales[rowIdx];
                        if (!c) return;

                        if (data.column.index === 2) {
                            if (c.tipoAsiento === "confirmado") {
                                data.cell.styles.textColor = [5, 150, 105];
                            } else {
                                data.cell.styles.textColor = [180, 83, 9];
                                data.cell.styles.fillColor = [255, 251, 235];
                            }
                        }

                        if (data.column.index === 3) {
                            if (c.menuCategoria === "nino") {
                                data.cell.styles.fillColor = [255, 251, 235];
                                data.cell.styles.textColor = [180, 83, 9];
                            } else if (c.menuCategoria === "pendiente") {
                                data.cell.styles.textColor = [148, 163, 184];
                                data.cell.styles.fontStyle = "normal";
                            }
                        }

                        if (data.column.index === 4 && c.tieneAlergia) {
                            data.cell.styles.fillColor = [254, 242, 242];
                            data.cell.styles.textColor = [185, 28, 28];
                            data.cell.styles.fontStyle = "bold";
                        }
                    }
                });

                cursorY = ((doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY) + 7;
            });
        }

        // 4. ANEXO SI QUEDAN COMENSALES CONFIRMADOS SIN MESA ASIGNADA
        if (datos.pendientesSinMesa.length > 0) {
            if (cursorY > 230) {
                doc.addPage();
                cursorY = 16;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.6);
            doc.setTextColor(180, 83, 9);
            doc.text(
                limpiarTextoPDF(`Comensales confirmados pendientes de ubicar en mesa (${datos.pendientesSinMesa.length} incluidos en totales)`),
                14,
                cursorY + 3
            );

            ejecutarAutoTablePDF(doc, {
                startY: cursorY + 5.5,
                margin: { left: 14, right: 14 },
                head: [["#", "Nombre del Comensal", "Menú", "Alergias / Intolerancias", "Observaciones", "Reserva"]],
                body: datos.pendientesSinMesa.map((p, idx) => [
                    String(idx + 1),
                    limpiarTextoPDF(p.nombre),
                    limpiarTextoPDF(p.menuEtiqueta),
                    limpiarTextoPDF(p.alergiaEtiqueta),
                    limpiarTextoPDF(p.observaciones || "-"),
                    limpiarTextoPDF(p.grupoReserva)
                ]),
                theme: "grid",
                styles: { font: "helvetica", fontSize: 7.9, cellPadding: 2 },
                headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: "bold" },
                didParseCell(data) {
                    if (data.section !== "body") return;
                    const p = datos.pendientesSinMesa[data.row.index];
                    if (p && data.column.index === 3 && p.tieneAlergia) {
                        data.cell.styles.fillColor = [254, 242, 242];
                        data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fontStyle = "bold";
                    }
                }
            });
        }

        numerarPaginasPDF(doc, "Boda Lorena & Estefanía · Informe Oficial de Mesas, Menús y Alergias (Catering)");

        const hoy = new Date().toISOString().slice(0, 10);
        doc.save(`Catering_Mesas_y_Menus_Lorena_y_Estefania_${hoy}.pdf`);
        mostrarToast("PDF de Mesas + Menús para Catering descargado", "success");
    } catch (err) {
        console.warn("Usando ventana de impresión como respaldo para PDF de Catering:", err);
        imprimirFallbackPDF("Informe de Mesas y Menús (Catering)", datos, true);
    } finally {
        if (botonEl) {
            botonEl.disabled = false;
            botonEl.innerHTML = htmlOriginal;
        }
    }
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

function normalizarNombrePersona(str) {
    return String(str || "")
        .replace(/\[(MODIFICACI[ÓO]N|MANUAL|EDITADO PANEL)\]/gi, "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function dividirNombresPersonas(texto) {
    return String(texto || "")
        .replace(/\[(MODIFICACI[ÓO]N|MANUAL|EDITADO PANEL)\]/gi, "")
        .split(/[,;/+&]|\s+y\s+|\s+e\s+/i)
        .map(s => s.trim())
        .filter(Boolean);
}

function obtenerInicialesPersona(nombre) {
    const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
}

function generarIdCorto() {
    return "mp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
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

function obtenerNumeroWhatsApp(telefono) {
    const digitos = String(telefono || "").replace(/\D/g, "");
    if (!digitos) return "";
    if (digitos.length === 9 && /^[6789]/.test(digitos)) {
        return `34${digitos}`;
    }
    return digitos.length >= 9 ? digitos : "";
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

// Listeners de Pestañas Superiores (Reservas vs Distribución de Mesas)
if (tabVistaReservas) tabVistaReservas.addEventListener("click", () => cambiarVistaPanel("reservas"));
if (tabVistaMesas) tabVistaMesas.addEventListener("click", () => cambiarVistaPanel("mesas"));

// Listeners de Buscador en Tiempo Real (Vista Reservas)
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

// Listeners de Píldoras de Filtro Rápido (Vista Reservas)
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
        const nextFilter = filtroActivo === targetFilter ? "todos" : targetFilter;
        const pill = filtrosContainer.querySelector(`.app-filter-pill[data-filter="${nextFilter}"]`);
        if (pill) pill.click();
    });
});

// Selector de filtro por Mesa (Vista Reservas)
if (filtroMesaSelect) {
    filtroMesaSelect.addEventListener("change", function () {
        filtroMesaActivo = this.value || "";
        aplicarFiltrosYRenderizar();
    });
}

// Botón superior de exportación para Catering (Excel/CSV)
if (btnExportarCatering) {
    btnExportarCatering.addEventListener("click", exportarInformeCatering);
}

// Listeners de la Vista de Mesas
if (btnTogglePendientesMesa) {
    btnTogglePendientesMesa.addEventListener("click", function () {
        pendientesMesaOculto = !pendientesMesaOculto;
        if (listaPendientesMesa) {
            listaPendientesMesa.style.display = pendientesMesaOculto ? "none" : "grid";
        }
        if (iconTogglePendientesMesa) {
            iconTogglePendientesMesa.className = pendientesMesaOculto ? "ph ph-caret-down" : "ph ph-caret-up";
        }
        if (textTogglePendientesMesa) {
            textTogglePendientesMesa.textContent = pendientesMesaOculto ? "Mostrar" : "Ocultar";
        }
    });
}

if (kpiScrollSinMesa) {
    kpiScrollSinMesa.addEventListener("click", function () {
        pendientesMesaOculto = false;
        renderizarVistaMesas();
        if (panelPendientesMesa) {
            panelPendientesMesa.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    });
}

document.querySelectorAll(".app-kpi-card[data-mesas-filter]").forEach(kpi => {
    kpi.addEventListener("click", function () {
        const target = this.getAttribute("data-mesas-filter") || "todas";
        const next = filtroVistaMesas === target ? "todas" : target;
        if (filtrosMesasContainer) {
            const pill = filtrosMesasContainer.querySelector(`[data-mesas-pill="${next}"]`);
            if (pill) pill.click();
        }
    });
});

if (buscadorMesas) {
    buscadorMesas.addEventListener("input", function () {
        textoBusquedaMesas = this.value;
        if (btnClearMesasSearch) {
            btnClearMesasSearch.style.display = textoBusquedaMesas.length > 0 ? "flex" : "none";
        }
        renderizarVistaMesas();
    });
}

if (btnClearMesasSearch && buscadorMesas) {
    btnClearMesasSearch.addEventListener("click", function () {
        buscadorMesas.value = "";
        textoBusquedaMesas = "";
        btnClearMesasSearch.style.display = "none";
        buscadorMesas.focus();
        renderizarVistaMesas();
    });
}

if (filtrosMesasContainer) {
    filtrosMesasContainer.querySelectorAll(".app-filter-pill").forEach(btn => {
        btn.addEventListener("click", function () {
            filtrosMesasContainer.querySelectorAll(".app-filter-pill").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            filtroVistaMesas = this.getAttribute("data-mesas-pill") || "todas";
            renderizarVistaMesas();
        });
    });
}

if (btnNuevaMesa) btnNuevaMesa.addEventListener("click", abrirModalNuevaMesa);
if (btnExportarMesasPdf) {
    btnExportarMesasPdf.addEventListener("click", function () {
        exportarMesasPDF(this);
    });
}
if (btnExportarMesasMenusPdf) {
    btnExportarMesasMenusPdf.addEventListener("click", function () {
        exportarMesasConMenusPDF(this);
    });
}
if (btnExportarMesasCsv) btnExportarMesasCsv.addEventListener("click", exportarCroquisMesasCSV);
if (modalMesaOverlay) modalMesaOverlay.addEventListener("click", cerrarModalMesa);
if (btnCerrarModalMesa) btnCerrarModalMesa.addEventListener("click", cerrarModalMesa);
if (btnCancelarMesa) btnCancelarMesa.addEventListener("click", cerrarModalMesa);

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
if (btnNuevaReservaManual) btnNuevaReservaManual.addEventListener("click", () => abrirModalNuevaManual());
if (modalManualOverlay) modalManualOverlay.addEventListener("click", cerrarModalManual);
if (btnCerrarManual) btnCerrarManual.addEventListener("click", cerrarModalManual);
if (btnCancelarManual) btnCancelarManual.addEventListener("click", cerrarModalManual);

// Listeners del Modal Detalle
if (modalDetalleOverlay) modalDetalleOverlay.addEventListener("click", cerrarModalDetalle);
if (btnCerrarDetalle) btnCerrarDetalle.addEventListener("click", cerrarModalDetalle);

// Listeners del Modal Confirmar Eliminación
if (modalEliminarOverlay) modalEliminarOverlay.addEventListener("click", () => cerrarModalConfirmarEliminar(false));
if (btnCancelarEliminar) btnCancelarEliminar.addEventListener("click", () => cerrarModalConfirmarEliminar(false));
if (btnAceptarEliminar) btnAceptarEliminar.addEventListener("click", () => cerrarModalConfirmarEliminar(true));

// Cerrar modales con Escape
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        if (modalConfirmarEliminar && modalConfirmarEliminar.classList.contains("activo")) {
            cerrarModalConfirmarEliminar(false);
        } else if (modalMesa && modalMesa.classList.contains("activo")) {
            cerrarModalMesa();
        } else if (modalReservaManual && modalReservaManual.classList.contains("activo")) {
            cerrarModalManual();
        } else if (modalDetalle && modalDetalle.classList.contains("activo")) {
            cerrarModalDetalle();
        } else if (modalPrivado && modalPrivado.classList.contains("activo")) {
            cerrarModal();
        }
    }
});

// Restaurar sesión del Panel de Organizadoras si recargan la pestaña
if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") {
    mostrarPanelPrivado();
}

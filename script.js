const weddingDate = new Date("May 15, 2027 18:30:00").getTime();

const timer = setInterval(function () {

    const now = new Date().getTime();
    const distance = weddingDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").innerHTML = days;
    document.getElementById("hours").innerHTML = hours;
    document.getElementById("minutes").innerHTML = minutes;
    document.getElementById("seconds").innerHTML = seconds;

}, 1000);

// Lógica Formulario RSVP Dinámico
const guestCountSelect = document.getElementById("guest-count");
const guestsContainer = document.getElementById("guests-container");
const btnSubmit = document.getElementById("btn-submit-rsvp");

if (guestCountSelect) {
    guestCountSelect.addEventListener("change", function () {
        const count = parseInt(this.value);
        guestsContainer.innerHTML = ""; // Limpiar

        const extraFields = document.getElementById("extra-fields-container");

        if (count > 0) {
            btnSubmit.style.display = "flex";
            if (extraFields) extraFields.style.display = "block";
            btnSubmit.innerHTML = `Confirmar ${count} Asistente${count > 1 ? 's' : ''} <i class="ph ph-paper-plane-right"></i>`;

            for (let i = 1; i <= count; i++) {
                const guestDiv = document.createElement("div");
                guestDiv.className = "guest-row fade-in";

                guestDiv.innerHTML = `
                    <h4>Invitado ${i}</h4>
                    <div class="input-group">
                        <i class="ph ph-user"></i>
                        <input type="text" name="nombre-${i}" placeholder="Nombre y apellidos" required>
                    </div>
                    
                    <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">Menú</p>
                    <div class="radio-group">
                        <input type="radio" name="menu-${i}" id="menu-adulto-${i}" value="adulto" class="hidden-radio" required checked>
                        <label class="radio-btn" for="menu-adulto-${i}">Adulto</label>
                        
                        <input type="radio" name="menu-${i}" id="menu-nino-${i}" value="niño" class="hidden-radio">
                        <label class="radio-btn" for="menu-nino-${i}">Niño</label>
                    </div>
                    
                    <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">¿Alguna alergia o intolerancia?</p>
                    <div class="radio-group" style="margin-bottom: 0px;">
                        <input type="radio" name="has-allergy-${i}" id="allergy-no-${i}" value="no" class="hidden-radio allergy-toggle" data-target="allergy-detail-${i}" checked>
                        <label class="radio-btn" for="allergy-no-${i}">No</label>

                        <input type="radio" name="has-allergy-${i}" id="allergy-si-${i}" value="si" class="hidden-radio allergy-toggle" data-target="allergy-detail-${i}">
                        <label class="radio-btn" for="allergy-si-${i}">Sí</label>
                    </div>
                    
                    <div class="allergy-details" id="allergy-detail-${i}">
                        <div class="input-group" style="margin-bottom: 5px;">
                            <i class="ph ph-warning-circle"></i>
                            <input type="text" name="alergia-tipo-${i}" placeholder="Especifique... (ej. Celíaco, Lactosa)">
                        </div>
                    </div>

                    <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">¿Necesitarás servicio de autobús?</p>
                    <div class="radio-group" style="margin-bottom: 0px;">
                        <input type="radio" name="bus-${i}" id="bus-si-${i}" value="si" class="hidden-radio" required checked>
                        <label class="radio-btn" for="bus-si-${i}">Sí, por favor</label>

                        <input type="radio" name="bus-${i}" id="bus-no-${i}" value="no" class="hidden-radio">
                        <label class="radio-btn" for="bus-no-${i}">No, por mi cuenta</label>
                    </div>
                `;
                guestsContainer.appendChild(guestDiv);
            }

            // Listeners para alergias
            const allergyToggles = guestsContainer.querySelectorAll('.allergy-toggle');
            allergyToggles.forEach(toggle => {
                toggle.addEventListener('change', function () {
                    const targetId = this.getAttribute('data-target');
                    const targetDiv = document.getElementById(targetId);
                    const inputField = targetDiv.querySelector('input');

                    if (this.value === 'si') {
                        targetDiv.classList.add('active');
                        inputField.setAttribute('required', 'true');
                    } else {
                        targetDiv.classList.remove('active');
                        inputField.removeAttribute('required');
                        inputField.value = ''; // Limpiar campo
                    }
                });
            });
        } else if (count === 0) {
            btnSubmit.style.display = "flex";
            if (extraFields) extraFields.style.display = "none";
            btnSubmit.innerHTML = `Confirmar No Asistencia <i class="ph ph-paper-plane-right"></i>`;

            const guestDiv = document.createElement("div");
            guestDiv.className = "guest-row fade-in";
            guestDiv.innerHTML = `
                <h4>Lamentamos que no puedas venir</h4>
                <p style="margin-bottom: 5px; font-size: 0.95rem;">Por favor, indícanos tu nombre o los nombres de las personas que no podréis asistir:</p>
                <div class="input-group" style="margin-bottom: 0;">
                    <i class="ph ph-user"></i>
                    <input type="text" name="nombres-no-asisten" placeholder="Nombres..." required>
                </div>
            `;
            guestsContainer.appendChild(guestDiv);
        } else {
            btnSubmit.style.display = "none";
            if (extraFields) extraFields.style.display = "none";
        }
    });
}

// Lógica Mostrar/Ocultar Mapa de Google Maps
const btnMap = document.getElementById("btn-map");
const mapContainer = document.getElementById("map-container");

if (btnMap && mapContainer) {
    btnMap.addEventListener("click", function (e) {
        e.preventDefault();
        if (mapContainer.style.display === "none" || mapContainer.style.display === "") {
            mapContainer.style.display = "block";
            // Opcional: Cambiar texto/icono del botón al mostrar el mapa
            // btnMap.innerHTML = 'Ocultar mapa <i class="ph ph-arrow-up"></i>';
        } else {
            mapContainer.style.display = "none";
            // btnMap.innerHTML = 'Cómo llegar <i class="ph ph-arrow-right"></i>';
        }
    });
}

// Lógica de Música de Fondo
const musicBtn = document.getElementById("music-btn");
const bgMusic = document.getElementById("bg-music");
let musicStarted = false;

if (musicBtn && bgMusic) {
    // Intentar reproducir en el primer clic del usuario en cualquier parte
    document.body.addEventListener("click", function () {
        if (!musicStarted) {
            bgMusic.play().then(() => {
                musicStarted = true;
                musicBtn.innerHTML = '<i class="ph ph-speaker-high"></i>';
            }).catch(error => {
                console.log("Autoplay bloqueado o error al reproducir:", error);
            });
        }
    }, { once: true }); // Se ejecuta solo una vez

    // Alternar play/pause con el botón
    musicBtn.addEventListener("click", function (e) {
        e.stopPropagation(); // Evitar que el clic inicie la música como "primer clic" si se hace clic aquí directamente
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

// ==========================================
// Lógica Menú Móvil
// ==========================================
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

    // Cerrar menú al hacer clic en un enlace
    const navLinks = navMenu.querySelectorAll("a");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("active");
            const icon = mobileMenu.querySelector("i");
            if (icon) {
                icon.classList.replace("ph-x", "ph-list");
            }
        });
    });
}

// ==========================================
// Integración del Formulario con Google Sheets
// ==========================================
const rsvpForm = document.getElementById("rsvp-form");

if (rsvpForm) {
    rsvpForm.addEventListener("submit", function (e) {
        e.preventDefault(); // Evitar que recargue la página

        const btnSubmit = document.getElementById("btn-submit-rsvp");
        const formMessage = document.getElementById("form-message");

        // Cambiar estilo del botón mientras carga
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = 'Enviando... <i class="ph ph-spinner icon-pulse"></i>';
        btnSubmit.disabled = true;
        if (formMessage) formMessage.style.display = "none";

        // Recopilar los datos
        const formData = new FormData(rsvpForm);
        const data = {};

        const guestCount = document.getElementById("guest-count").value;
        data.asistencia = guestCount === "0" ? "No asisten" : "Sí asisten";
        data.numero_invitados = guestCount;

        let invitadosArray = [];

        if (guestCount === "0") {
            const nombres = formData.get("nombres-no-asisten");
            data.nombres = nombres;
            data.detalles = "No asisten";
        } else {
            const count = parseInt(guestCount);
            let nombresArr = [];
            for (let i = ; i <= count; i++) {
                const nombre = formData.get(`nombre-${i}`) || "";
                const menu = formData.get(`menu-${i}`) || "Adulto"; // En caso de que no lo lea
                const tieneAlergia = formData.get(`has-allergy-${i}`) === "si";
                const alergiaTipo = tieneAlergia ? formData.get(`alergia-tipo-${i}`) : "Ninguna";
                const bus = formData.get(`bus-${i}`) === "si" ? "Sí" : "No";

                nombresArr.push(nombre);
                invitadosArray.push(`Invitado ${i}: ${nombre} | Menú: ${menu} | Alergias: ${alergiaTipo} | Autobús: ${bus}`);
            }
            data.nombres = nombresArr.join(", ");
            data.detalles = invitadosArray.join("\n");
        }

        // Sugerencia de canción
        const songSuggestion = formData.get("song-suggestion");
        if (songSuggestion && songSuggestion.trim() !== "") {
            // Añadir canción a los detalles para enviar al Google Script
            data.detalles += "\nCanción sugerida: " + songSuggestion.trim();

            // Guardar sugerencia de canción por separado (se mostrará en el panel de organizadoras)
            try {
                const existing = JSON.parse(localStorage.getItem('wedding_song_suggestions') || '[]');
                existing.push({
                    song: songSuggestion.trim(),
                    from: data.nombres || 'Anónimo',
                    at: new Date().toISOString()
                });
                localStorage.setItem('wedding_song_suggestions', JSON.stringify(existing));
                // Actualizar UI inmediatamente
                if (typeof updateSongUI === 'function') updateSongUI();
            } catch (e) {
                console.error('Error guardando canción sugerida:', e);
            }
        }

        // Ver si es modificación
        const isModificacion = localStorage.getItem("wedding_rsvp_status") === "confirmed";
        if (isModificacion) {
            data.nombres = "[MODIFICACIÓN] " + data.nombres;
        }

        // ==========================================
        // ⚠️ INSTRUCCIÓN: PEGAR AQUÍ LA URL DE TU GOOGLE SCRIPT ⚠️
        // ==========================================
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwaNl2tW2rvJfIWDRasLJ6qeywPFXokROdwseyDEXqAdQQu44Nu6yjt9lUXNjQ3bQZ/exec";

        if (GOOGLE_SCRIPT_URL === "URL_DE_TU_SCRIPT_AQUI" || GOOGLE_SCRIPT_URL === "") {
            setTimeout(() => {
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
                if (formMessage) {
                    formMessage.style.display = "block";
                    formMessage.style.color = "var(--primary)";
                    formMessage.innerHTML = "¡Atención! Funciona de prueba. Debes poner la URL de Google Sheets en el archivo script.js";
                }
            }, 000);
            return;
        }

        // Enviar datos usando fetch
        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", // Crucial para evitar problemas de CORS de Google
            headers: {
                "Content-Type": "text/plain",
            },
            body: JSON.stringify(data)
        })
            .then(() => {
                // Éxito: al usar no-cors, la promesa siempre se resuelve si hay éxito en red

                // Guardar en localStorage para pre-rellenar luego
                localStorage.setItem("wedding_rsvp_status", "confirmed");
                localStorage.setItem("wedding_rsvp_data", JSON.stringify(Object.fromEntries(formData.entries())));

                btnSubmit.innerHTML = '¡Enviado! <i class="ph ph-check-circle"></i>';
                btnSubmit.style.backgroundColor = "#27ae60"; // Verde
                btnSubmit.style.color = "white";
                btnSubmit.style.boxShadow = "none";

                if (formMessage) {
                    formMessage.style.display = "block";
                    formMessage.style.color = "#27ae60";
                    formMessage.innerHTML = "¡Gracias! Tu confirmación se ha enviado correctamente.";
                }

                // Limpiar formulario pasados 4 segundos
                setTimeout(() => {
                    rsvpForm.reset();
                    document.getElementById("guests-container").innerHTML = "";
                    btnSubmit.style.display = "none";
                    btnSubmit.innerHTML = originalBtnText;
                    btnSubmit.style.backgroundColor = "";
                    btnSubmit.disabled = false;
                }, 4000);
            })
            .catch(error => {
                // Error
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
                if (formMessage) {
                    formMessage.style.display = "block";
                    formMessage.style.color = "#e74c3c";
                    formMessage.innerHTML = "Hubo un error al conectar. Por favor, inténtalo de nuevo o contáctanos por móvil.";
                }
                console.error("Error al enviar a Google Sheets:", error);
            });
    });
}

// ================================
// Gestión UI y almacenamiento de canciones sugeridas
// ================================
function loadSongSuggestions() {
    try {
        return JSON.parse(localStorage.getItem('wedding_song_suggestions') || '[]');
    } catch (e) {
        return [];
    }
}

function renderSongsList() {
    const lista = document.getElementById('lista-canciones');
    const songs = loadSongSuggestions();
    if (!lista) return;
    lista.innerHTML = '';
    if (songs.length === 0) {
        lista.style.display = 'none';
        return;
    }
    songs.forEach((s, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="ph ph-music-note"></i><div><strong>${s.song}</strong><small>Sugerida por: ${s.from}</small></div>`;
        lista.appendChild(li);
    });
}

function updateSongUI() {
    const songs = loadSongSuggestions();
    const countEl = document.getElementById('count-canciones');
    const btn = document.getElementById('btn-toggle-canciones');
    const lista = document.getElementById('lista-canciones');

    if (countEl) countEl.textContent = songs.length;

    if (songs.length > 0) {
        // La UI ahora se actualiza directamente con lo que devuelve el Sheet.
        // No se debe añadir eventListener aquí para no machacar la lista de la API.
    } else {
        // No ocultar nada, el panel privado gestiona su visibilidad.
    }
}

// Inicializar estado de canciones al cargar la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateSongUI);
} else {
    updateSongUI();
}

/** Guarda una sugerencia de canción evitando duplicados (API pública para otras funciones) */
function saveSongSuggestion(song, from) {
    if (!song || !song.trim()) return;
    try {
        const arr = loadSongSuggestions();
        const exists = arr.some(s => s.song.toLowerCase() === song.toLowerCase());
        if (!exists) {
            arr.push({ song: song.trim(), from: from || 'Invitado', at: new Date().toISOString() });
            localStorage.setItem('wedding_song_suggestions', JSON.stringify(arr));
            updateSongUI();
        }
    } catch (e) {
        console.error('Error guardando sugerencia de canción:', e);
    }
}

// Observador para extraer canciones incluidas en el bloque de detalles
(function observeDetalleForSongs() {
    const detalleBody = document.getElementById('detalle-body');
    if (!detalleBody) return;

    const extractSongFromText = (text) => {
        const regex = /Canc[ió]n\s*sugerida[:\-\s]*([^\n<]+)/i;
        const m = text.match(regex);
        return m ? m[].trim() : null;
    };

    const saveSongIfNew = (song, from = 'Panel') => {
        if (!song) return;
        try {
            const arr = loadSongSuggestions();
            const exists = arr.some(s => s.song.toLowerCase() === song.toLowerCase());
            if (!exists) {
                arr.push({ song, from, at: new Date().toISOString() });
                localStorage.setItem('wedding_song_suggestions', JSON.stringify(arr));
                updateSongUI();
            }
        } catch (e) {
            console.error('Error guardando canción desde detalles:', e);
        }
    };

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.addedNodes && mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    // Buscar texto que contenga "Canción sugerida" dentro del nodo
                    const text = node.innerText || node.textContent || '';
                    const song = extractSongFromText(text);
                    if (song) {
                        saveSongIfNew(song, 'Panel (detalle)');
                        // Eliminar la mención de la canción del contenido para que no aparezca en detalles
                        try {
                            // Reemplazar la primera ocurrencia dentro del HTML
                            const html = node.innerHTML;
                            const newHtml = html.replace(/\s*Canc[ió]n\s*sugerida[:\-\s]*([^<\n]+)/i, '');
                            node.innerHTML = newHtml;
                        } catch (e) {
                            // Si no podemos manipular innerHTML, intentar manipular texto
                            // No fatal
                        }
                    }
                });
            }
        }
    });

    observer.observe(detalleBody, { childList: true, subtree: true });
})();

// ==========================================
// Lógica para pre-rellenar si ya han confirmado
// ==========================================
function loadSavedRsvpData() {
    const savedStatus = localStorage.getItem("wedding_rsvp_status");
    if (savedStatus === "confirmed") {
        const formMessage = document.getElementById("form-message");
        if (formMessage) {
            formMessage.style.display = "block";
            formMessage.style.color = "var(--text-dark)";
            formMessage.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
            formMessage.style.padding = "10px";
            formMessage.style.borderRadius = "8px";
            formMessage.innerHTML = "Ya enviaste tu confirmación anteriormente. Si envías el formulario de nuevo, actualizaremos tus datos.";
        }

        try {
            const savedDataString = localStorage.getItem("wedding_rsvp_data");
            if (savedDataString) {
                const savedData = JSON.parse(savedDataString);

                // Si guardamos el número de asistentes, recreamos el formulario
                if (savedData["guest-count"]) {
                    const selectEl = document.getElementById("guest-count");
                    if (selectEl) {
                        selectEl.value = savedData["guest-count"];
                        selectEl.dispatchEvent(new Event("change"));

                        // Esperar a que el DOM se regenere
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
                                            // Si es una alerta de alergia, disparar evento
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
            console.error("Error cargando datos:", e);
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSavedRsvpData);
} else {
    loadSavedRsvpData();
}

// ==========================================
// ÁREA PRIVADA – Sistema de acceso por contraseña
// ==========================================

// ⚠️  CAMBIA AQUÍ LA CONTRASEÑA DE LAS ORGANIZADORAS
const CONTRASENA_PRIVADA = "Clm";

const SHEET_ID = "16DtKzaFsKr0nDYEpj4bhYVYbneDlJ_dcZ096v-l0TEY";

// Nombre de la pestaña/hoja (déjalo vacío si quieres la primera hoja)
const SHEET_NAME = "";

/**
 * Carga las reservas usando JSONP con la API pública de Google Sheets.
 * No necesita doGet() en el Apps Script ni configuración CORS.
 * Solo requiere que la hoja esté compartida como "Cualquiera con el enlace puede ver".
 */
function cargarReservas() {
    if (!privadoLoading || !privadoCards) return;

    // Limpiar localStorage: datos de reservas y lista de reservas ocultas
    // para garantizar que siempre se muestra el estado actual del Sheets
    try {
        localStorage.removeItem('wedding_rsvp_reservas');
        localStorage.removeItem('wedding_reservas_ocultas');
    } catch (e) { /* ignorar */ }

    // Mostrar spinner, ocultar el resto
    privadoLoading.style.display = "flex";
    privadoStats.style.display = "none";
    privadoCards.innerHTML = "";
    privadoError.style.display = "none";

    // Nombre único para el callback JSONP de esta llamada
    const callbackName = "__gvizCallback_" + Date.now();

    // Construir URL de la API gviz/tq de Google Sheets
    // Se añade un timestamp para evitar que el navegador use datos cacheados
    const sheetParam = SHEET_NAME ? "&sheet=" + encodeURIComponent(SHEET_NAME) : "";
    const cacheBust = "&dummy=" + Date.now();
    const url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
        "/gviz/tq?tqx=out:json;responseHandler:" + callbackName + sheetParam + cacheBust;

    // Timeout de 12 segundos
    const timeoutId = setTimeout(function () {
        limpiarJSONP(callbackName);
        privadoLoading.style.display = "none";
        mostrarErrorPrivado("Tiempo de espera agotado. Comprueba que el ID de la hoja es correcto.");
    }, 12000);

    // Función de limpieza: elimina el script tag y el callback global
    function limpiarJSONP(nombre) {
        clearTimeout(timeoutId);
        delete window[nombre];
        const tag = document.getElementById("gviz-jsonp-script");
        if (tag) tag.remove();
    }

    // Definir el callback global que llamará Google
    window[callbackName] = function (datos) {
        limpiarJSONP(callbackName);
        privadoLoading.style.display = "none";
        try {
            const reservas = parseGvizData(datos);
            renderizarReservas(reservas);
        } catch (e) {
            console.error("Error procesando datos de gviz:", e);
            mostrarErrorPrivado("Error al procesar los datos de la hoja. Revisa la consola del navegador.");
        }
    };

    // Inyectar el script JSONP en el DOM
    const script = document.createElement("script");
    script.id = "gviz-jsonp-script";
    script.src = url;
    script.onerror = function () {
        limpiarJSONP(callbackName);
        privadoLoading.style.display = "none";
        mostrarErrorPrivado(
            "No se pudo conectar. Asegúrate de que la hoja está compartida como " +
            "\"Cualquiera con el enlace puede ver\" y que el ID de la hoja es correcto."
        );
    };
    document.head.appendChild(script);
}

/**
 * Convierte la estructura de datos de gviz (cols + rows) en un array de objetos planos.
 * Las claves de los objetos se sacan de la primera fila / etiquetas de columna del Sheet.
 */
/**
 * Convierte un valor de celda gviz en string legible.
 * Las fechas/timestamps llegan como objetos con propiedad "v" en formato
 * "Date(year,month,day)" o "Date(year,month,day,h,m,s)" donde month es 0-indexed.
 */
function formatearValorGviz(celda) {
    if (!celda || celda.v === null || celda.v === undefined) return "";

    // Si la celda tiene un valor formateado por Google (celda.f), usarlo directamente
    if (celda.f && celda.f.trim() !== "") {
        return celda.f.trim();
    }

    var val = celda.v;

    // gviz puede devolver fechas como objeto Date nativo de JS
    if (val instanceof Date) {
        try {
            return val.toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { }
    }

    // Detectar fechas en formato string "Date(2025,3,18)" o "Date(2025,3,18,14,32,0)"
    if (typeof val === "string" && val.startsWith("Date(")) {
        try {
            var partes = val.replace("Date(", "").replace(")", "").split(",").map(Number);
            var fecha = new Date(partes[0], partes[1], partes[2] || 1,
                partes[3] || 0, partes[4] || 0, partes[5] || 0);
            if (!isNaN(fecha.getTime())) {
                return fecha.toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
        } catch (e) { }
    }

    return String(val);
}

// ── Reservas ocultas (lista negra en localStorage) ──────────────────────────
function getReservasOcultas() {
    try { return JSON.parse(localStorage.getItem('wedding_reservas_ocultas') || '[]'); } catch (e) { return []; }
}
function ocultarReserva(id) {
    const arr = getReservasOcultas();
    if (!arr.includes(id)) { arr.push(id); localStorage.setItem('wedding_reservas_ocultas', JSON.stringify(arr)); }
}

function parseGvizData(datos) {
    if (!datos || !datos.table) throw new Error("Respuesta gviz sin tabla");

    var cols = datos.table.cols || [];
    var rows = datos.table.rows || [];
    var ocultas = getReservasOcultas();

    // Extraer estadisticas exactas (Columnas Q = 16, R = 17, S = 18, T = 19, U = 20)
    // Busca en las primeras 10 filas el primer valor que no esté vacío.
    // Esto resuelve el problema de filas desplazadas o saltos de celdas ocultas.
    const getBulletproofCell = (cIdx) => {
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            if (rows[i] && rows[i].c && rows[i].c[cIdx]) {
                let v = rows[i].c[cIdx].v;
                let f = rows[i].c[cIdx].f;
                // Si hay un valor real (no nulo, no undefined y no cadena vacía)
                if (v !== null && v !== undefined && String(v).trim() !== "") return v;
                if (f !== null && f !== undefined && String(f).trim() !== "") return f;
            }
        }
        return 0; // Por defecto
    };

    window._sheetStats = {
        asisten: getBulletproofCell(16), // Q
        adultos: getBulletproofCell(17), // R
        ninos: getBulletproofCell(18),   // S
        sinAlergia: getBulletproofCell(19), // T
        conAlergia: getBulletproofCell(20)  // U
    };

    var resultado = [];

    rows.forEach(function (row) {
        var obj = {};
        cols.forEach(function (col, i) {
            var clave = (col.label || col.id || ("col" + i))
                .toLowerCase().trim()
                .replace(/\s+/g, "_")
                .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
                .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
                .replace(/[úùü]/g, "u").replace(/[ñ]/g, "n")
                .replace(/[^a-z0-9_]/g, "");

            var celda = row.c && row.c[i];
            var val = formatearValorGviz(celda);

            if (val && typeof val === "string") {
                val = val.replace(/\s*(Invitado\s*\d+:)/gi, '\n$1');
                val = val.replace(/\s*(Canción sugerida:)/gi, '\n$1');
                val = val.trim();
            }

            obj[clave] = val;
            obj['col_' + i] = val;
        });

        // ID único para identificar esta reserva
        obj['_id'] = (obj.nombres || obj.nombre || '') + '|' + (obj.col_0 || '');

        // Detectar si la fila está vacía (borrada del Sheets)
        var todosVacios = cols.every(function (col, i) { return !obj['col_' + i]; });
        obj['_vacia'] = todosVacios;

        // Solo incluir si no está en la lista negra
        if (!ocultas.includes(obj['_id'])) {
            resultado.push(obj);
        }
    });

    return resultado;
}

/** Muestra un mensaje de error en el panel privado */
function mostrarErrorPrivado(mensaje) {
    if (!privadoError) return;
    var textoEl = privadoError.querySelector("p");
    if (textoEl) textoEl.textContent = mensaje;
    privadoError.style.display = "flex";
}

// Referencias a elementos del DOM
const btnAreaPrivada = document.getElementById("btn-area-privada");
const modalPrivado = document.getElementById("modal-privado");
const modalOverlay = document.getElementById("modal-privado-overlay");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");
const inputPassword = document.getElementById("input-password-privada");
const btnEntrar = document.getElementById("btn-entrar-privado");
const modalErrorMsg = document.getElementById("modal-error-msg");
const panelPrivado = document.getElementById("panel-privado");
const btnCerrarPanel = document.getElementById("btn-cerrar-panel");
const privadoLoading = document.getElementById("privado-loading");
const privadoStats = document.getElementById("privado-stats");
const privadoCards = document.getElementById("privado-cards");
const privadoError = document.getElementById("privado-error");

const modalDetalle = document.getElementById("modal-detalle");
const modalDetalleOverlay = document.getElementById("modal-detalle-overlay");
const btnCerrarDetalle = document.getElementById("btn-cerrar-detalle");
const detalleHeader = document.getElementById("detalle-header");
const detalleBody = document.getElementById("detalle-body");

/** Abre el modal de contraseña */
function abrirModal() {
    if (!modalPrivado) return;
    modalPrivado.classList.add("activo");
    document.body.style.overflow = "hidden"; // Evitar scroll de fondo
    setTimeout(() => inputPassword && inputPassword.focus(), 200);
    if (modalErrorMsg) modalErrorMsg.style.display = "none";
    if (inputPassword) inputPassword.value = "";
}

/** Cierra el modal de contraseña */
function cerrarModal() {
    if (!modalPrivado) return;
    modalPrivado.classList.remove("activo");
    document.body.style.overflow = "";
}

/** Muestra el panel privado y carga los datos */
function mostrarPanelPrivado() {
    cerrarModal();
    if (!panelPrivado) return;
    panelPrivado.style.display = "block";
    panelPrivado.scrollIntoView({ behavior: "smooth", block: "start" });
    cargarReservas();
}

/** Oculta el panel privado y reinicia el estado */
function cerrarPanelPrivado() {
    if (!panelPrivado) return;
    panelPrivado.style.display = "none";
    if (privadoCards) privadoCards.innerHTML = "";
    if (privadoLoading) privadoLoading.style.display = "flex";
    if (privadoStats) privadoStats.style.display = "none";
    if (privadoError) privadoError.style.display = "none";
}

/** Valida la contraseña introducida */
function validarContrasena() {
    if (!inputPassword) return;
    const valor = inputPassword.value.trim();

    if (valor === CONTRASENA_PRIVADA) {
        // Contraseña correcta
        mostrarPanelPrivado();
    } else {
        // Contraseña incorrecta: mostrar error con animación
        if (modalErrorMsg) {
            modalErrorMsg.style.display = "flex";
            // Pequeña animación de sacudida en el input
            inputPassword.style.borderColor = "#c0392b";
            inputPassword.style.boxShadow = "0 0 0 3px rgba(192, 57, 43, 0.15)";
            setTimeout(() => {
                if (inputPassword) {
                    inputPassword.style.borderColor = "";
                    inputPassword.style.boxShadow = "";
                }
            }, 1500);
        }
        inputPassword.select();
    }
}


/**
 * Renderiza las tarjetas de reserva y calcula los stats
 * @param {Array} reservas - Array de objetos con los datos de cada reserva
 */
function renderizarReservas(reservas) {
    if (!privadoCards) return;

    if (!reservas || reservas.length === 0) {
        privadoCards.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-light);">
                <i class="ph ph-inbox" style="font-size:3rem; color:var(--primary); display:block; margin-bottom:12px;"></i>
                Aún no hay confirmaciones recibidas.
            </div>`;
        return;
    }

    // Extraer canciones recomendadas
    let canciones = [];

    reservas.forEach(r => {
        const asistencia = (r.asistencia || "").toLowerCase();
        if (!asistencia.includes("no")) {
            // Extraer Canciones Recomendadas
            // Buscar en col_5 (columna F del nuevo Apps Script) y también en detalles como fallback
            const cancionDirecta = r.col_5 || r["canci_n_sugerida"] || r["cancion_sugerida"] || r["cancin_sugerida"] || "";
            if (cancionDirecta && cancionDirecta.trim() !== "") {
                const val = cancionDirecta.trim();
                const isNinguna = val.toLowerCase() === "ninguna" || val === "-" || val === "";
                if (!isNinguna) {
                    canciones.push({ nombre: val, autor: r.nombres || r.nombre || "Invitado" });
                }
            } else {
                // Fallback: buscar dentro del texto de detalles
                const detallesTexto = r.detalles || "";
                const matchCancion = detallesTexto.match(/Canc[ió]n sugerida[:\s]*([^\n]+)/i);
                if (matchCancion && matchCancion[1]) {
                    const val = matchCancion[1].trim();
                    const isNinguna = val.toLowerCase() === "ninguna" || val === "-" || val === "";
                    if (!isNinguna) {
                        canciones.push({ nombre: val, autor: r.nombres || r.nombre || "Invitado" });
                    }
                }
            }
        }
    });

    // Mostrar stats extraídos del array _sheetStats
    if (privadoStats) {
        document.getElementById("stat-asisten").textContent = window._sheetStats ? window._sheetStats.asisten : 0;
        document.getElementById("stat-adultos").textContent = window._sheetStats ? window._sheetStats.adultos : 0;
        document.getElementById("stat-ninos").textContent = window._sheetStats ? window._sheetStats.ninos : 0;
        document.getElementById("stat-sin-alergia").textContent = window._sheetStats ? window._sheetStats.sinAlergia : 0;
        document.getElementById("stat-con-alergia").textContent = window._sheetStats ? window._sheetStats.conAlergia : 0;
        privadoStats.style.display = "grid";
    }

    // Mostrar sección de canciones
    const btnToggleCanciones = document.getElementById("btn-toggle-canciones");
    const listaCanciones = document.getElementById("lista-canciones");
    const countCanciones = document.getElementById("count-canciones");

    if (btnToggleCanciones && listaCanciones && countCanciones) {
        btnToggleCanciones.style.display = "flex"; // Siempre visible

        if (canciones.length > 0) {
            countCanciones.textContent = canciones.length;
            listaCanciones.innerHTML = canciones.map(c =>
                `<li><i class="ph ph-music-note"></i><div><strong>${escaparHTML(c.nombre)}</strong><small>Sugerida por: ${escaparHTML(c.autor)}</small></div></li>`
            ).join("");
        } else {
            countCanciones.textContent = "0";
            listaCanciones.innerHTML = `<li style="justify-content:center; color:var(--text-light);">No hay canciones sugeridas todavía.</li>`;
        }
        listaCanciones.style.display = "none";
    }

    // Generar tarjetas
    reservas.forEach((r, idx) => {
        const asistencia = (r.asistencia || "").toLowerCase();

        let detalles = String(r.detalle || r.detalles || r.detalles_y_menus || r.detalles_y_men_s || r.detalles_y_menu || "");
        if (!detalles) {
            const valFallback = Object.values(r).find(v => typeof v === 'string' && /Invitado\s*\d+:/i.test(v));
            if (valFallback) detalles = String(valFallback);
        }

        // Buscar clave de asistencia con prioridad estricta
        const PATRONES_ASIST = ["asistencia", "confirmacion", "confirm", "asist"];
        let keyAsistCard = null;
        for (const p of PATRONES_ASIST) {
            keyAsistCard = Object.keys(r).find(k => k === p || k.startsWith(p + "_") || k.endsWith("_" + p));
            if (keyAsistCard) break;
        }
        if (!keyAsistCard) keyAsistCard = Object.keys(r).find(k => k.includes("asist") || k.includes("confirm"));
        const asistValCard = keyAsistCard ? String(r[keyAsistCard]).toLowerCase() : "";
        let asiste = true;
        if (/\bno\b|lamentabl/i.test(asistValCard)) asiste = false;
        if (/\bs[ií]\b|yes/i.test(asistValCard)) asiste = true;

        // Extraer nombres reales de los invitados del campo de detalles
        const nombresExtraidos = [];
        const detallesLimpio = detalles.replace(/\nCanc[ió]n sugerida[:\s]*[^\n]*/gi, "");
        const matchesNombres = detallesLimpio.matchAll(/Invitado\s*\d+:\s*([^|\n]+)/gi);
        for (const m of matchesNombres) {
            const n = m[1].trim();
            if (n) nombresExtraidos.push(n);
        }

        let nombre = String(r.nombres || r.nombre || "").replace("[MODIFICACIÓN] ", "").trim();
        if (!nombre) nombre = `Reserva ${idx + 1}`;

        const numInvitados = r.numero_invitados || nombresExtraidos.length || "—";

        // Solo marcar como vacía si TODOS los valores reales de la fila están vacíos
        const valoresReales = Object.keys(r).filter(k => !k.startsWith('col_') && k !== '_id');
        const esVacia = r._vacia === true || valoresReales.every(k => !r[k] || String(r[k]).trim() === '');

        const card = document.createElement("div");

        if (esVacia) {
            card.className = "card reserva-card reserva-card-vacia fade-in";
            const rid = JSON.stringify(r._id || "");
            card.innerHTML = `
                <button class="btn-eliminar-reserva" title="Eliminar del panel" onclick="event.stopPropagation(); if(confirm('Esta fila parece estar vacía o fue eliminada del Sheets.\n¿Ocultarla del panel?')) { ocultarReserva(${rid}); this.closest('.reserva-card').remove(); }">
                    <i class="ph ph-x"></i>
                </button>
                <div style="display:flex; align-items:center; gap:10px;">
                    <i class="ph ph-warning-circle" style="font-size:1.5rem; color:#e0a020; flex-shrink:0;"></i>
                    <div>
                        <div style="font-weight:600; font-size:0.95rem; color:var(--text-dark);">Reserva vacía o eliminada</div>
                        <div style="font-size:0.85rem; color:var(--text-light); margin-top:3px;">Esta fila ya no existe en el Sheets. Pulsa la ✕ para ocultarla.</div>
                    </div>
                </div>`;
            privadoCards.appendChild(card);
            return;
        }

        card.className = "card hover-animate reserva-card fade-in clickable";

        // Generar título principal usando nombres extraídos
        let nombresPrincipalHtml = "";
        if (nombresExtraidos.length > 0) {
            const namesToShow = nombresExtraidos.slice(0, 3);
            const extra = nombresExtraidos.length - 3;
            nombresPrincipalHtml = `
                <div class="reserva-card-nombres">
                    ${namesToShow.map(n => `<div class="main-name-item">${escaparHTML(n)}</div>`).join('')}
                    ${extra > 0 ? `<div class="main-name-item extra-names">(+${extra})</div>` : ''}
                </div>`;
        } else {
            nombresPrincipalHtml = `
                <div class="reserva-card-nombres">
                    <div class="main-name-item">${escaparHTML(nombre)}</div>
                </div>`;
        }

        card.innerHTML = `
            <button class="btn-eliminar-reserva" title="Ocultar reserva">
                <i class="ph ph-x"></i>
            </button>
            <span class="reserva-card-badge ${asiste ? "asiste" : "no-asiste"}">
                <i class="ph ph-${asiste ? "check-circle" : "x-circle"}"></i>
                ${asiste ? "Asiste" : "No asiste"}
            </span>
            ${nombresPrincipalHtml}
            <div class="reserva-card-info">
                <div class="reserva-card-info-item">
                    <i class="ph ph-users"></i>
                    <span><strong>Invitados:</strong> ${escaparHTML(String(numInvitados))}</span>
                </div>
                <div class="reserva-card-info-item">
                    <i class="ph ph-check-fat"></i>
                    <span><strong>Asistencia:</strong> ${escaparHTML(r.asistencia || "—")}</span>
                </div>
            </div>
            ${detalles ? `<div class="reserva-card-detalles" style="text-align: center; color: var(--text-light); font-size: 0.9rem; font-style: italic; margin-top: 10px;">Haz click para ver todos los detalles y menús...</div>` : ""}
        `;

        // Listener del botón X: confirmar y ocultar SIN abrir el detalle
        const btnX = card.querySelector('.btn-eliminar-reserva');
        if (btnX) {
            btnX.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (confirm(`¿Ocultar la reserva de ${nombre} del panel?\nNo se borrará del Sheets.`)) {
                    ocultarReserva(r._id);
                    card.remove();
                }
            });
        }

        // Listener del clic en la tarjeta: abrir detalle
        card.addEventListener('click', () => abrirModalDetalle(r));

        privadoCards.appendChild(card);
    });
}


/** Escapa caracteres HTML para evitar XSS */
function escaparHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Formatea las claves (nombres de columna) para mostrarlas bonito en el detalle */
function formatearEtiqueta(clave) {
    // Reemplazar guiones bajos y capitalizar primera letra
    const sinGuiones = clave.replace(/_/g, " ");
    return sinGuiones.charAt(0).toUpperCase() + sinGuiones.slice(1);
}

/** Abre el modal de detalle con todos los campos de la reserva */
function abrirModalDetalle(reserva) {
    if (!modalDetalle || !detalleHeader || !detalleBody) return;

    // Buscar la clave de asistencia con prioridad estricta para evitar falsos positivos
    const CLAVES_ASIST = ["asistencia", "confirmacion", "confirm", "asist"];
    let keyAsist = null;
    for (const patron of CLAVES_ASIST) {
        keyAsist = Object.keys(reserva).find(k => k === patron || k.startsWith(patron + "_") || k.endsWith("_" + patron));
        if (keyAsist) break;
    }
    // Fallback: cualquier clave que contenga "asist" o "confirm"
    if (!keyAsist) {
        keyAsist = Object.keys(reserva).find(k => k.includes("asist") || k.includes("confirm"));
    }
    const asistenciaVal = keyAsist ? String(reserva[keyAsist]).toLowerCase() : "";
    console.log("[Debug asistencia] clave:", keyAsist, "valor:", asistenciaVal);

    // Sí asiste: contiene "sí", "si", "yes" → verde. No asiste: contiene "no", "lamentable" → rojo.
    let asiste = true;
    if (/\bno\b|lamentabl/i.test(asistenciaVal)) asiste = false;
    if (/\bs[íi]\b|yes/i.test(asistenciaVal)) asiste = true;

    // Nombre de la reserva = campo nombres/nombre, limpio
    let nombre = String(reserva.nombres || reserva.nombre || "Reserva");
    nombre = nombre.replace("[MODIFICACIÓN] ", "").trim();

    // Nombres para la cabecera modal
    let textoDets = reserva.detalle || reserva.detalles || reserva.detalles_y_menus || reserva.detalles_y_menús || reserva.detalles_y_men_s || "";
    if (!textoDets) {
        const valFallback = Object.values(reserva).find(v => typeof v === 'string' && /Invitado\s*\d+:/i.test(v));
        if (valFallback) textoDets = String(valFallback);
    }
    const nombresModal = [];
    if (textoDets) {
        const mNombres = textoDets.replace(/\nCanc[ió]n sugerida[:\s]*[^\n]*/gi, "").matchAll(/Invitado\s*\d+:\s*([^|\n]+)/gi);
        for (const m of mNombres) {
            const n = m[1].trim();
            if (n) nombresModal.push(n);
        }
    }

    let nombreHeaderHtml = "";
    if (nombresModal.length > 0) {
        nombreHeaderHtml = `<div class="detalle-header-names">
            ${nombresModal.map(n => `<div class="main-name-item">${escaparHTML(n)}</div>`).join('')}
        </div>`;
    } else {
        nombreHeaderHtml = `<div class="detalle-header-names"><div class="main-name-item">${escaparHTML(nombre)}</div></div>`;
    }

    detalleHeader.innerHTML = `
        <span class="reserva-card-badge ${asiste ? "asiste" : "no-asiste"}">
            <i class="ph ph-${asiste ? "check-circle" : "x-circle"}"></i>
            ${asiste ? "Confirmado ✓" : "No asiste ✗"}
        </span>
        ${nombreHeaderHtml}
    `;

    // ── PARSEO DE INVITADOS ──────────────────────────────────
    let textoDetalles = reserva.detalle || reserva.detalles || reserva.detalles_y_menus || reserva.detalles_y_menús || reserva.detalles_y_men_s || "";
    if (!textoDetalles) {
        const valFallback = Object.values(reserva).find(v => typeof v === 'string' && /Invitado\s*\d+:/i.test(v));
        if (valFallback) textoDetalles = String(valFallback);
    }
    let detallesHtml = "";

    if (textoDetalles) {
        // Quitar líneas de canciones del bloque
        textoDetalles = textoDetalles.replace(/\nCanc[ió]n sugerida[:\s]*[^\n]*/gi, "").trim();
        const bloques = textoDetalles.split(/\n(?=Invitado\s*\d+:)/i).filter(b => b.trim() !== "");

        if (bloques.length > 0 && /Invitado\s*\d+:/i.test(bloques[0])) {
            detallesHtml = bloques.map((bloque, i) => {
                const tituloMatch = bloque.match(/^(Invitado\s*\d+):\s*([^|\n]+)/i);
                const menuMatch = bloque.match(/Men[uú]:\s*([^|\n]+)/i);
                const alergiaMatch = bloque.match(/Alergias?:\s*([^|\n]+)/i);
                const busMatch = bloque.match(/Autob[uú]s:\s*([^|\n]+)/i);

                const titulo = tituloMatch ? tituloMatch[1].trim() : `Invitado ${i + 1}`;
                const nombreInv = tituloMatch ? tituloMatch[2].trim() : "";
                const menu = menuMatch ? menuMatch[1].trim() : "—";
                const alergia = alergiaMatch ? alergiaMatch[1].trim() : "Ninguna";
                const bus = busMatch ? busMatch[1].trim() : "—";

                const tieneAlergia = !/^(ninguna?|no|—|-|)$/i.test(alergia.trim());
                const esNino = /ni[ñn]o|beb[eé]|infant/i.test(menu);
                const emojiMenu = esNino ? "👶" : "🍽️";
                const esBus = /^s[íi]$/i.test(bus.trim());
                const emojiBus = esBus ? "🚌" : "🚗";
                const textoBus = esBus ? "Sí" : "No";
                const alergiaEmoji = tieneAlergia ? "⚠️" : "✅";

                const delay = (i * 80) + "ms";

                const textoBusMostrar = esBus ? "Bus Sí" : "Sin bus";
                const alergiaMostrar = tieneAlergia ? alergia : "Sin alergias";

                return `
                <div class="detalle-guest-card fade-in" style="animation-delay:${delay}">
                    <div class="guest-name-large">${escaparHTML(nombreInv) || escaparHTML(titulo)}</div>
                    <div class="guest-badges">
                        <span class="guest-badge badge-menu ${esNino ? 'nino' : 'adulto'}">
                            ${emojiMenu} <span>${escaparHTML(menu)}</span>
                        </span>
                        <span class="guest-badge ${tieneAlergia ? 'badge-alergia' : 'badge-ok'}">
                            ${alergiaEmoji} <span>${escaparHTML(alergiaMostrar)}</span>
                        </span>
                        <span class="guest-badge ${esBus ? 'badge-bus' : 'badge-nobus'}">
                            ${emojiBus} <span>${textoBusMostrar}</span>
                        </span>
                    </div>
                </div>`;
            }).join("");
        } else {
            // Fallback: mostrar como texto
            detallesHtml = textoDetalles.trim().split("\n").filter(l => l.trim())
                .map(l => `<p style="margin:0 0 10px;color:var(--text-dark);line-height:1.5;">${escaparHTML(l.trim())}</p>`)
                .join("");
        }
    }

    // ── CAMPOS EXTRA (fuera del bloque de invitados) ─────────
    let htmlInfoExtra = "";
    // Excluir: cualquier clave que empiece por 'detalles', 'nombre', 'asistencia', ids internos, etc.
    const excluirFn = (keyLower, valor) =>
        keyLower.startsWith("detalle") ||
        keyLower.startsWith("nombre") ||
        keyLower.includes("asistencia") ||
        keyLower.includes("confirmaci") ||
        keyLower.includes("confirm") ||
        keyLower === "_id" || keyLower === "id" || keyLower === "_vacia" ||
        (/Invitado\s*\d+:/i.test(valor));

    const getExtraEmoji = (k) => {
        if (k.includes("tel") || k.includes("phone")) return "📞";
        if (k.includes("mail") || k.includes("correo")) return "📧";
        if (k.includes("cancin") || k.includes("cancion") || k.includes("song") || k.includes("música") || k.includes("musica")) return "🎵";
        if (k.includes("comentar") || k.includes("nota") || k.includes("mensaje")) return "💬";
        if (k.includes("numero") || k.includes("asistentes") || k.includes("invitados")) return "👥";
        if (k.includes("fecha") || k.includes("hora") || k.includes("timestamp") || k.includes("temporal")) return "📅";
        return "📋";
    };

    Object.keys(reserva).forEach((key, i) => {
        const keyLower = key.trim().toLowerCase();
        const valor = (reserva[key] || "").toString().trim();
        if (excluirFn(keyLower, valor) || keyLower.startsWith("col_") || !valor) return;

        const emoji = getExtraEmoji(keyLower);
        const delay = (i * 40) + "ms";
        htmlInfoExtra += `
            <div class="detalle-field fade-in" style="animation-delay:${delay}">
                <div class="detalle-field-label">${emoji} ${formatearEtiqueta(key)}</div>
                <div class="detalle-field-value">${escaparHTML(valor)}</div>
            </div>`;
    });

    // ── CONSTRUIR EL BODY ─────────────────────────────────────
    let bodyHtml = "";

    if (detallesHtml) {
        bodyHtml += `
        <div class="detalle-section">
            <h4 class="detalle-section-title"><i class="ph ph-users-three"></i> Invitados</h4>
            <div class="detalle-guests-list">${detallesHtml}</div>
        </div>`;
    }

    if (htmlInfoExtra) {
        bodyHtml += `
        <div class="detalle-section">
            <h4 class="detalle-section-title"><i class="ph ph-list-bullets"></i> Información adicional</h4>
            <div class="detalle-fields">${htmlInfoExtra}</div>
        </div>`;
    }

    if (!bodyHtml) {
        bodyHtml = `<p style="color:var(--text-light);text-align:center;padding:30px 0;">Sin detalles adicionales.</p>`;
    }

    detalleBody.innerHTML = bodyHtml;

    modalDetalle.classList.add("activo");
    document.body.style.overflow = "hidden";
}

/** Cierra el modal de detalle */
function cerrarModalDetalle() {
    if (!modalDetalle) return;
    modalDetalle.classList.remove("activo");
    // Solo restaurar scroll si el otro modal (contraseña) tampoco está abierto
    if (!modalPrivado.classList.contains("activo")) {
        document.body.style.overflow = "";
    }
}

// ---- Listeners del Área Privada ----

// Abrir modal al pulsar "Área privada"
if (btnAreaPrivada) {
    btnAreaPrivada.addEventListener("click", abrirModal);
}

// Cerrar modal al pulsar el overlay o el botón X
if (modalOverlay) modalOverlay.addEventListener("click", cerrarModal);
if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrarModal);

// Entrar al pulsar el botón
if (btnEntrar) {
    btnEntrar.addEventListener("click", validarContrasena);
}

// Entrar al presionar Enter en el input
if (inputPassword) {
    inputPassword.addEventListener("keydown", function (e) {
        if (e.key === "Enter") validarContrasena();
    });
}

// Ocultar error al escribir de nuevo
if (inputPassword && modalErrorMsg) {
    inputPassword.addEventListener("input", function () {
        modalErrorMsg.style.display = "none";
    });
}

// Cerrar sesión y ocultar panel
if (btnCerrarPanel) {
    btnCerrarPanel.addEventListener("click", cerrarPanelPrivado);
}

// Modal detalle
if (modalDetalleOverlay) modalDetalleOverlay.addEventListener("click", cerrarModalDetalle);
if (btnCerrarDetalle) btnCerrarDetalle.addEventListener("click", cerrarModalDetalle);

// Cerrar modales con tecla Escape
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        if (modalDetalle && modalDetalle.classList.contains("activo")) {
            cerrarModalDetalle();
        } else if (modalPrivado && modalPrivado.classList.contains("activo")) {
            cerrarModal();
        }
    }
});

// Mostrar / Ocultar canciones recomendadas
document.addEventListener("click", function (e) {
    const btnToggle = e.target.closest("#btn-toggle-canciones");
    if (btnToggle) {
        const listaCancionesElem = document.getElementById("lista-canciones");
        if (listaCancionesElem) {
            if (listaCancionesElem.style.display === "none") {
                listaCancionesElem.style.display = "block";
            } else {
                listaCancionesElem.style.display = "none";
            }
        }
    }
});

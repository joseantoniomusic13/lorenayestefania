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

        if (count > 0) {
            btnSubmit.style.display = "flex";
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
                    <div class="radio-group" style="margin-bottom: 10px;">
                        <input type="radio" name="has-allergy-${i}" id="allergy-no-${i}" value="no" class="hidden-radio allergy-toggle" data-target="allergy-detail-${i}" checked>
                        <label class="radio-btn" for="allergy-no-${i}">No</label>

                        <input type="radio" name="has-allergy-${i}" id="allergy-si-${i}" value="si" class="hidden-radio allergy-toggle" data-target="allergy-detail-${i}">
                        <label class="radio-btn" for="allergy-si-${i}">Sí</label>
                    </div>
                    
                    <div class="allergy-details" id="allergy-detail-${i}">
                        <div class="input-group" style="margin-bottom: 15px;">
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
            btnSubmit.innerHTML = `Confirmar No Asistencia <i class="ph ph-paper-plane-right"></i>`;

            const guestDiv = document.createElement("div");
            guestDiv.className = "guest-row fade-in";
            guestDiv.innerHTML = `
                <h4>Lamentamos que no puedas venir</h4>
                <p style="margin-bottom: 15px; font-size: 0.95rem;">Por favor, indícanos tu nombre o los nombres de las personas que no podréis asistir:</p>
                <div class="input-group" style="margin-bottom: 0;">
                    <i class="ph ph-user"></i>
                    <input type="text" name="nombres-no-asisten" placeholder="Nombres..." required>
                </div>
            `;
            guestsContainer.appendChild(guestDiv);
        } else {
            btnSubmit.style.display = "none";
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
            for (let i = 1; i <= count; i++) {
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

        // ==========================================
        // ⚠️ INSTRUCCIÓN: PEGAR AQUÍ LA URL DE TU GOOGLE SCRIPT ⚠️
        // ==========================================
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_oTs2nE2g-1Nz4vtI8KQyee-OL3isChsNrKbYiR-HaryMe6tqULaK-_hxefJKzaYJPA/exec";

        if (GOOGLE_SCRIPT_URL === "URL_DE_TU_SCRIPT_AQUI" || GOOGLE_SCRIPT_URL === "") {
            setTimeout(() => {
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
                if (formMessage) {
                    formMessage.style.display = "block";
                    formMessage.style.color = "var(--primary)";
                    formMessage.innerHTML = "¡Atención! Funciona de prueba. Debes poner la URL de Google Sheets en el archivo script.js";
                }
            }, 1000);
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
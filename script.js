const weddingDate = new Date("May 15, 2027 18:30:00").getTime();

const timer = setInterval(function(){

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

},1000);

// Lógica Formulario RSVP Dinámico
const guestCountSelect = document.getElementById("guest-count");
const guestsContainer = document.getElementById("guests-container");
const btnSubmit = document.getElementById("btn-submit-rsvp");

if(guestCountSelect) {
    guestCountSelect.addEventListener("change", function() {
        const count = parseInt(this.value);
        guestsContainer.innerHTML = ""; // Limpiar
        
        if (count > 0) {
            btnSubmit.style.display = "flex";
            btnSubmit.innerHTML = `Confirmar ${count} Asistente${count > 1 ? 's' : ''} <i class="ph ph-paper-plane-right"></i>`;
            
            for(let i = 1; i <= count; i++) {
                const guestDiv = document.createElement("div");
                guestDiv.className = "guest-row fade-in";
                
                guestDiv.innerHTML = `
                    <h4>Invitado ${i}</h4>
                    <div class="input-group">
                        <i class="ph ph-user"></i>
                        <input type="text" name="nombre-${i}" placeholder="Nombre y apellidos" required>
                    </div>
                    
                    <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">Menú</p>
                    <div class="radio-group" style="margin-bottom: 15px;">
                        <label class="radio-label">
                            <input type="radio" name="menu-${i}" value="adulto" required checked> Adulto
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="menu-${i}" value="niño"> Niño
                        </label>
                    </div>
                    
                    <p style="margin-bottom: 5px; font-weight: 500; font-size: 0.95rem;">¿Alguna alergia o intolerancia?</p>
                    <div class="radio-group" style="margin-bottom: 5px;">
                        <label class="radio-label">
                            <input type="radio" name="has-allergy-${i}" value="no" class="allergy-toggle" data-target="allergy-detail-${i}" checked> No
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="has-allergy-${i}" value="si" class="allergy-toggle" data-target="allergy-detail-${i}"> Sí
                        </label>
                    </div>
                    
                    <div class="allergy-details" id="allergy-detail-${i}">
                        <div class="input-group" style="margin-bottom: 0;">
                            <i class="ph ph-warning-circle"></i>
                            <input type="text" name="alergia-tipo-${i}" placeholder="Especifique... (ej. Celíaco, Lactosa)">
                        </div>
                    </div>
                `;
                guestsContainer.appendChild(guestDiv);
            }

            // Listeners para alergias
            const allergyToggles = guestsContainer.querySelectorAll('.allergy-toggle');
            allergyToggles.forEach(toggle => {
                toggle.addEventListener('change', function() {
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

if(btnMap && mapContainer) {
    btnMap.addEventListener("click", function(e) {
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
    document.body.addEventListener("click", function() {
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
    musicBtn.addEventListener("click", function(e) {
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
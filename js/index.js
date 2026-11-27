let formBienvenida = document.getElementById("form-bienvenida");

formBienvenida.addEventListener("submit", event => {
    event.preventDefault();

    let nombreUsuario = document.getElementById("form-bienvenida-nombre").value;

    if (nombreUsuario.length > 0) {
        localStorage.setItem("usuario", nombreUsuario);
        window.location.href = "productos.html";
    }
});
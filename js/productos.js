const urlBase = "http://localhost:3000";
const contenedorProductos = document.getElementById("contenedor-productos");
const botonCreacion = document.getElementById("btn-create");
const limiteCaracteres = 30;
const usuario = localStorage.getItem("usuario");
const fechaDeHoy = (new Date()).toLocaleString("sv-SE").replace("T", " ");

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || {
    productos: [],
    total: 0
};

async function obtenerProductos() {
    try {
        const response = await fetch(`${urlBase}/api/products/active`);
        console.log(response);
        const data = await response.json();

        if (!response.ok) {
            console.error(data.message);
            return mostrarError(data.message);
        }

        productos = data.payload;
        renderizarProductos(productos);

    } catch (error) {
        console.error("Error al obtener productos: ", error);
        return mostrarError("Error de conexión con el servidor");
    }
}

function renderizarProductos(array) {
    let htmlProductos = "";

    array.forEach(producto => {
        htmlProductos += `
                    <div class="card-producto">
                        <img class="card-img" src="${producto.image}" alt="${producto.name}">
                            <h4 title="${producto.name}">${formatearNombre(producto.name)}</h4>
                            <p>$ ${producto.price}</p>
                            <p>Id: ${producto.id}</p>
                            <button type="button" class="boton" data-id="${producto.id}">
                                <i class="fa-solid fa-cart-plus"></i>Agregar al carrito
                            </button>
                    </div>
                `;
    });

    contenedorProductos.innerHTML = htmlProductos;
}

contenedorProductos.addEventListener("click", (e) => {
    const boton = e.target.closest(".boton");
    if (!boton) return;
    const idProducto = Number(boton.dataset.id) //dataset lee todos los atributos data-(nombre)
    agregarAlCarrito(e, idProducto)
});

function agregarAlCarrito(e, idProducto) {
    const productoEncontrado = productos.find(p => p.id === idProducto);
    if (!productoEncontrado) return;

    const existeEnCarrito = carrito.productos.find(p => p.id === idProducto);

    if (existeEnCarrito) {
        existeEnCarrito.cantidad++;
    } else {
        carrito.productos.push({ ...productoEncontrado, cantidad: 1 });
    }

    actualizarCarrito();
}

// Actualizar Carrito, total, contadores y localStorage
function actualizarCarrito() {
    const cartList = document.getElementById("cart-list");
    const cartTotal = document.getElementById("cart-total");
    const cartCountHeader = document.getElementById("cart-count-header");

    const total = carrito.productos.reduce((acc, prod) => acc + (prod.price * prod.cantidad), 0);
    const totalCantidad = carrito.productos.reduce((acc, prod) => acc + prod.cantidad, 0);

    carrito.total = total;

    localStorage.setItem("carrito", JSON.stringify(carrito));

    if (carrito.productos.length === 0) {
        cartList.innerHTML = `<p>Tu carrito está vacío</p>`;
        if (cartTotal) cartTotal.textContent = "0";
        if (cartCountHeader) cartCountHeader.textContent = "0";
        return;
    }

    cartList.innerHTML = carrito.productos.map(prod => `
        <li class="cart-item">
        <span>${formatearNombre(prod.name)} x${prod.cantidad} - $${(prod.price * prod.cantidad).toLocaleString("es-AR")}</span>
        <button type="button" onclick="quitarDelCarrito(event, ${prod.id})"><i id="btn-eliminar" class="fa-solid fa-trash-can"></i></button>
        </li>
    `).join("");

    if (cartTotal) cartTotal.textContent = total.toLocaleString("es-AR");
    if (cartCountHeader) cartCountHeader.textContent = totalCantidad;
}

// Quitar una unidad o borrar del carrito
function quitarDelCarrito(e, idProducto) {
    if (e) e.preventDefault();

    const prod = carrito.productos.find(p => p.id === idProducto);

    if (prod) {
        prod.cantidad--;
        if (prod.cantidad === 0) {
            carrito.productos = carrito.productos.filter(p => p.id !== idProducto);
        }
    }

    actualizarCarrito();
}

// Vaciar Carrito completo
function vaciarCarrito(e) {
    if (e) e.preventDefault();
    carrito.productos = [];
    actualizarCarrito();
}

botonCreacion.addEventListener("click", async (event) => {
    event.preventDefault();
    let productIds = carrito.productos.map(producto => producto.id);
    let totalPrecio = carrito.total;

    const request = {
        date: fechaDeHoy,
        totalPrice: totalPrecio,
        userName: usuario,
        idProducts: productIds
    };

    try {
        const response = await fetch(`${urlBase}/api/sales`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.listaErrores) {
                return mostrarListaErrores(data.listaErrores)
            }
            console.error(data.message);
            return mostrarError(data.message);
        }

        let message = `${data.message} con Id ${data.productId}`;
        console.log(message);
        imprimirTicket();

        localStorage.removeItem("usuario");
        localStorage.removeItem("carrito");
        window.location.href = "index.html";

    } catch (error) {
        console.error("Error al realizar la compra de productos: ", error);
        return mostrarError("Error de conexión con el servidor");
    }
});

function armarError(mensaje) {
    return `<p class="error">${mensaje}</p>`;
}

function mostrarError(mensaje) {
    contenedorProductos.innerHTML = armarError(mensaje)
}

function imprimirTicket() {
    const { jsPDF } = window.jspdf;

    const alturaInicial = 1;
    const alturaPorProducto = 0.2;
    const alturaFinal = 0.8;

    const alturaTicket = alturaInicial +
        (carrito.productos.length * alturaPorProducto) +
        alturaFinal;

    const doc = new jsPDF({
        orientation: alturaTicket < 3 ? "landscape" : "portrait",
        unit: "in",
        format: [3, alturaTicket]
    });

    doc.setFontSize(9);
    doc.text(fechaDeHoy, 1, 0.2);
    doc.text("InstaFarma", 1.2, 0.5);
    doc.text("AUTOSERVICIO", 1, 0.7);
    doc.text(`Cliente: ${usuario}`, 0.1, 0.9);

    let alturaProductos = 1;
    carrito.productos.forEach(producto => {
        const subtotal = producto.price * producto.cantidad;

        doc.text(
            `${formatearNombre(producto.name)} x${producto.cantidad}    $${subtotal}`,
            0.1,
            alturaProductos += alturaPorProducto
        );
    });
    doc.text(`Total: $${carrito.total}`, 1, alturaProductos + 0.6);
    doc.save(`InstaFarma-${fechaDeHoy}.pdf`);
}

function formatearNombre(nombre) {
    return `${nombre.length > limiteCaracteres ? `${nombre.slice(0, limiteCaracteres)}...` : nombre}`;
}

actualizarCarrito();
obtenerProductos();
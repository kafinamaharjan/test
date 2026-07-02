const API_URL = `${window.location.protocol}//${window.location.hostname}:7319/api/products`;

const state = {
    products: [],
    cart: new Map(),
    query: "",
    sort: "featured",
};

const catalog = document.getElementById("catalog");
const resultCount = document.getElementById("resultCount");
const apiStatus = document.getElementById("apiStatus");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const closeCart = document.getElementById("closeCart");
const scrim = document.getElementById("scrim");
const toast = document.getElementById("toast");

function money(value) {
    return Number(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 2200);
}

function renderLoading() {
    catalog.innerHTML = Array.from({ length: 3 }, () => '<div class="skeleton"></div>').join("");
}

function getVisibleProducts() {
    const filtered = state.products.filter((product) => {
        const haystack = `${product.name} ${product.description}`.toLowerCase();
        return haystack.includes(state.query.toLowerCase().trim());
    });

    return filtered.sort((a, b) => {
        if (state.sort === "price-asc") return Number(a.price) - Number(b.price);
        if (state.sort === "price-desc") return Number(b.price) - Number(a.price);
        if (state.sort === "name-asc") return a.name.localeCompare(b.name);
        return Number(a.id) - Number(b.id);
    });
}

function renderProducts() {
    const products = getVisibleProducts();
    resultCount.textContent = `${products.length} item${products.length === 1 ? "" : "s"} shown`;

    if (products.length === 0) {
        catalog.innerHTML = '<div class="state">No matching items found. Try another search.</div>';
        return;
    }

    catalog.innerHTML = products.map((item) => `
        <article class="product-card">
            <div class="product-media">
                <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy">
            </div>
            <div class="product-content">
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.description || "A curated piece selected for the collection.")}</p>
                <div class="product-footer">
                    <span class="price">${money(item.price)}</span>
                    <button class="add-button" type="button" data-id="${item.id}">Add to bag</button>
                </div>
            </div>
        </article>
    `).join("");
}

function updateCartSummary() {
    const entries = Array.from(state.cart.values());
    const totalQuantity = entries.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = entries.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    cartCount.textContent = totalQuantity;
    cartTotal.textContent = money(totalPrice);

    if (entries.length === 0) {
        cartItems.innerHTML = '<div class="state">Your cart is ready when you are.</div>';
        return;
    }

    cartItems.innerHTML = entries.map((item) => `
        <div class="cart-item">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
            <div>
                <h3>${escapeHtml(item.name)}</h3>
                <p>${money(item.price)}</p>
            </div>
            <div class="quantity-controls" aria-label="Quantity for ${escapeHtml(item.name)}">
                <button type="button" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>
        </div>
    `).join("");
}

function addToCart(productId) {
    const product = state.products.find((item) => String(item.id) === String(productId));
    if (!product) return;

    const existing = state.cart.get(product.id);
    state.cart.set(product.id, {
        ...product,
        quantity: existing ? existing.quantity + 1 : 1,
    });

    updateCartSummary();
    openCart();
    showToast(`${product.name} added to your bag`);
}

function changeQuantity(productId, delta) {
    const item = state.cart.get(Number(productId)) || state.cart.get(productId);
    if (!item) return;

    const nextQuantity = item.quantity + delta;
    if (nextQuantity <= 0) {
        state.cart.delete(item.id);
    } else {
        state.cart.set(item.id, { ...item, quantity: nextQuantity });
    }

    updateCartSummary();
}

function openCart() {
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    scrim.classList.add("is-visible");
}

function hideCart() {
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    scrim.classList.remove("is-visible");
}

async function loadProducts() {
    renderLoading();

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        state.products = await response.json();
        apiStatus.textContent = "API connected";
        apiStatus.classList.add("is-online");
        renderProducts();
    } catch (error) {
        apiStatus.textContent = "API unavailable";
        apiStatus.classList.add("is-error");
        resultCount.textContent = "Could not load products";
        catalog.innerHTML = `
            <div class="state">
                Error reaching API backend: ${escapeHtml(error.message)}.
                Make sure the backend is running on port 7319.
            </div>
        `;
    }
}

catalog.addEventListener("click", (event) => {
    const button = event.target.closest(".add-button");
    if (button) addToCart(button.dataset.id);
});

cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    changeQuantity(button.dataset.id, button.dataset.action === "increase" ? 1 : -1);
});

document.querySelector(".cart-toggle").addEventListener("click", openCart);
closeCart.addEventListener("click", hideCart);
scrim.addEventListener("click", hideCart);

searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderProducts();
});

sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideCart();
});

updateCartSummary();
loadProducts();

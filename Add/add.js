// ── Auth & Header ──
let currentName = localStorage.getItem("name");
 
if (!currentName) {
    location.href = "../Login_Register/Login.html";
}
 
let nameEl = document.getElementById("currentName");
if (nameEl) nameEl.innerText = currentName || "";
 
let avatarEl = document.getElementById("userAvatar");
if (avatarEl && currentName) {
    let parts = currentName.trim().split(" ");
    let initials = parts.length >= 2
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].slice(0, 2);
    avatarEl.innerText = initials.toUpperCase();
}
 
let logout = document.getElementById("logout_btn");
logout.addEventListener("click", function () {
    alert("Đăng xuất thành công");
    localStorage.removeItem("name");
    localStorage.removeItem("userID");
    location.href = "../Login_Register/Login.html";
});
 
// ── Cart helpers ──
function getCart() {
    return JSON.parse(localStorage.getItem("cart") || "[]");
}
 
function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}
 
function addToCart(product, qty) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty = (existing.qty || 1) + qty;
    } else {
        cart.push({ ...product, qty });
    }
    saveCart(cart);
}
 
function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (item.qty || 1), 0);
}
 
// ── Product Detail ──
let product = JSON.parse(localStorage.getItem('link_items'));
 
if (!product) {
    alert("No product selected!");
    location.href = "../Home/home.html";
} else {
    let container = document.getElementById("container");
    let canRead = product.pdfLink && product.pdfLink.trim() !== "";
 
    const imageHTML = product.image
        ? `<img src="${product.image}" alt="${product.name}">`
        : `<div class="product-image-placeholder">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <path d="M4 4h16v16H4zM4 8h16M9 8v12"/>
               </svg>
               <span>No image</span>
           </div>`;
 
    const originalPrice = product.originalPrice
        ? `<span class="detail-price-original">${product.originalPrice}.000₫</span>` : '';
    const discountBadge = product.discount
        ? `<span class="detail-discount-badge">-${product.discount}%</span>` : '';
 
    const metaRows = [
        product.author    ? `<div class="product-meta-row">Author: <strong>${product.author}</strong></div>` : '',
        product.publisher ? `<div class="product-meta-row">Publisher: <strong>${product.publisher}</strong></div>` : '',
        product.category  ? `<div class="product-meta-row">Category: <strong>${product.category}</strong></div>` : '',
    ].filter(Boolean).join('');
 
    container.innerHTML = `
        <!-- Breadcrumb -->
        <nav class="breadcrumb">
            <a href="../Home/home.html">Home</a>
            <span class="breadcrumb-sep">›</span>
            ${product.category ? `<a href="#">${product.category}</a><span class="breadcrumb-sep">›</span>` : ''}
            <span class="breadcrumb-current">${product.name}</span>
        </nav>
 
        <!-- Two-column product layout -->
        <div class="product-layout">
 
            <!-- LEFT: Book cover image -->
            <div class="product-image-col">
                <div class="product-image-wrap">
                    ${imageHTML}
                </div>
            </div>
 
            <!-- RIGHT: Product info -->
            <div class="product-info-col">
 
                <!-- Main info card -->
                <div class="product-info-card">
                    ${product.category ? `<span class="detail-category-badge">${product.category}</span>` : ''}
                    <h1 class="detail-name">${product.name}</h1>
 
                    ${metaRows ? `<div class="product-meta">${metaRows}</div>` : ''}
 
                    <!-- Price -->
                    <div class="detail-price-row">
                        <span class="detail-price">${product.price}.000₫</span>
                        ${originalPrice}
                        ${discountBadge}
                    </div>
 
                    <!-- Quantity selector -->
                    <div class="quantity-row">
                        <span class="quantity-label">Quantity</span>
                        <div class="quantity-control">
                            <button class="qty-btn" id="qty-minus">−</button>
                            <input class="qty-input" id="qty-value" type="number" value="1" min="1" max="99">
                            <button class="qty-btn" id="qty-plus">+</button>
                        </div>
                    </div>
 
                    <!-- Action buttons -->
                    <div class="action-buttons">
                        <button class="btn-cart" id="btn-add-cart">
                            🛒 Add to Cart
                        </button>
                        <button class="btn-buy" id="btn-buy-now">
                            Buy Now
                        </button>
                    </div>

                    <!-- Read book button -->
                    <button class="btn-read" id="btn-read-book" ${canRead ? '' : 'disabled'}>
                        📖 ${canRead ? 'Đọc sách online' : 'Chưa có link PDF để đọc'}
                    </button>
 
                    <!-- Cart feedback toast -->
                    <div class="cart-toast" id="cart-toast"></div>
 
                    <!-- Policies -->
                    <div class="policy-row">
                        <div class="policy-item">
                            <span class="policy-icon">🚀</span>
                            <span class="policy-text">Fast Delivery</span>
                        </div>
                        <div class="policy-item">
                            <span class="policy-icon">🔄</span>
                            <span class="policy-text">Free 30-day Returns</span>
                        </div>
                        <div class="policy-item">
                            <span class="policy-icon">✅</span>
                            <span class="policy-text">Authentic Products</span>
                        </div>
                    </div>
                </div>
 
                <!-- About / Description -->
                ${product.about ? `
                <div class="description-card">
                    <h2 class="section-title">About This Book</h2>
                    <p class="detail-about-text">${product.about}</p>
                </div>
                ` : ''}
 
            </div>
        </div>
    `;
 
    // ── Quantity controls ──
    const qtyInput = document.getElementById('qty-value');
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus  = document.getElementById('qty-plus');
 
    if (qtyInput) {
        qtyMinus.addEventListener('click', () => {
            let v = parseInt(qtyInput.value) || 1;
            if (v > 1) qtyInput.value = v - 1;
        });
        qtyPlus.addEventListener('click', () => {
            let v = parseInt(qtyInput.value) || 1;
            if (v < 99) qtyInput.value = v + 1;
        });
        qtyInput.addEventListener('change', () => {
            let v = parseInt(qtyInput.value) || 1;
            qtyInput.value = Math.max(1, Math.min(99, v));
        });
    }
 
    // ── Toast helper ──
    function showToast(msg, isError = false) {
        const toast = document.getElementById('cart-toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = 'cart-toast ' + (isError ? 'error' : 'success') + ' show';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
    }
 
    // ── Add to Cart ──
    const btnCart = document.getElementById('btn-add-cart');
    if (btnCart) {
        btnCart.addEventListener('click', () => {
            const qty = parseInt(qtyInput?.value) || 1;
            addToCart(product, qty);
            const total = getCartTotal();
            showToast(`✓ Added ${qty} × "${product.name}" to cart (${total} total)`);
        });
    }
 
    // ── Buy Now ──
    const btnBuy = document.getElementById('btn-buy-now');
    if (btnBuy) {
        btnBuy.addEventListener('click', () => {
            const qty = parseInt(qtyInput?.value) || 1;
            addToCart(product, qty);
            location.href = "../Cart/cart.html";
        });
    }

    // ── Read Book ──
    const btnRead = document.getElementById('btn-read-book');
    if (btnRead && canRead) {
        btnRead.addEventListener('click', () => {
            // Mở link PDF ở tab mới, giữ nguyên trang chi tiết hiện tại.
            window.open(product.pdfLink, '_blank');
        });
    }
}
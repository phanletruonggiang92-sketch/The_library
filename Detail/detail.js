// ── Firebase Setup ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
  get,
  child,
  remove,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBO4qbODFdmhUlOdcEa4hXQrmd4zzctM2k",
  authDomain: "jsi45-nct.firebaseapp.com",
  databaseURL: "https://jsi45-nct-default-rtdb.firebaseio.com",
  projectId: "jsi45-nct",
  storageBucket: "jsi45-nct.firebasestorage.app",
  messagingSenderId: "701333259060",
  appId: "1:701333259060:web:5786ef73795c431c195b61"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Số ngày mượn tối đa cho mỗi cuốn sách.
const BORROW_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

// ── Cấu hình EmailJS (điền tại đây) ──
// Lấy 3 giá trị này trong dashboard tại https://dashboard.emailjs.com/
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMMPLATE_ID";

// Gmail sẽ NHẬN thông báo mỗi khi có người bấm "Borrow" (điền vào đây bằng code).
const NOTIFY_EMAIL = "phanletruonggiang92@gmail.com"; // <-- TODO: điền địa chỉ Gmail của bạn vào đây

if (typeof emailjs !== "undefined" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// Gửi email thông báo mượn sách kèm ảnh QR thanh toán tới NOTIFY_EMAIL.
// EmailJS chỉ gửi được ảnh nếu template có field ảnh (attachment) hoặc bạn
// nhúng ảnh này online sẵn trong template — an toàn nhất là để URL ảnh
// (qr_image_url) trong template email và trỏ nó tới ảnh đã host của bạn.
async function sendBorrowNotificationEmail(prod) {
    if (typeof emailjs === "undefined") {
        console.error("EmailJS chưa được tải (kiểm tra thẻ <script> trong detail.html).");
        return;
    }
    if (!NOTIFY_EMAIL) {
        console.warn("Chưa điền NOTIFY_EMAIL trong detail.js — bỏ qua gửi email.");
        return;
    }

    const templateParams = {
        to_email: NOTIFY_EMAIL,
        book_name: prod.name || "",
        book_id: prod.id != null ? String(prod.id) : "",
        user_name: currentName || "",
        qr_image_url: new URL("payment-qr.jpg", location.href).toString(),
    };

    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    } catch (err) {
        console.error("Lỗi khi gửi email thông báo mượn sách:", err);
    }
}

// ── Auth & Header ──
let currentName = localStorage.getItem("name");
// Định danh người dùng hiện tại (UID thật do Firebase Auth cấp, xem Login.js).
// Đây chính là "chìa khoá" giúp tách biệt việc mượn sách theo từng tài khoản.
let currentUserID = localStorage.getItem("userID") || currentName;

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

// ── Mượn sách theo TỪNG TÀI KHOẢN ──
// Trước đây trạng thái mượn (availability/borrowedBy/dueDate) được lưu ngay
// trên sản phẩm -> dùng chung cho MỌI người, ai mượn trước thì người khác bị khoá.
// Giờ mỗi tài khoản (uid) có 1 nhánh riêng: borrows/{uid}/{fbKey}
//   -> nhiều tài khoản có thể cùng "mượn" và đọc một cuốn sách, độc lập với nhau.

// Đọc trạng thái mượn của CHÍNH tài khoản đang đăng nhập cho 1 cuốn sách.
async function fetchUserBorrow(fbKey) {
    if (!fbKey || !currentUserID) return null;
    try {
        const snapshot = await get(child(ref(database), `borrows/${currentUserID}/${fbKey}`));
        return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
        console.error("Lỗi khi đọc trạng thái mượn sách:", err);
        return null;
    }
}

// active=true : ghi borrowedAt=now, dueDate=now+30 ngày cho riêng tài khoản này.
// active=false: xoá bản ghi mượn của riêng tài khoản này (trả sách / hết hạn).
async function setUserBorrow(fbKey, bookId, active) {
    if (!fbKey || !currentUserID) return;
    try {
        if (active) {
            const now = Date.now();
            await update(ref(database, `borrows/${currentUserID}/${fbKey}`), {
                bookId: bookId != null ? bookId : null,
                borrowedAt: now,
                dueDate: now + BORROW_DURATION_MS,
            });
        } else {
            await remove(ref(database, `borrows/${currentUserID}/${fbKey}`));
        }
    } catch (err) {
        console.error("Lỗi khi cập nhật trạng thái mượn sách:", err);
    }
}

// ── QR Borrow Modal ──
function ensureQRModal() {
    let modal = document.getElementById("qr-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "qr-modal";
    modal.className = "qr-modal-overlay";
    modal.innerHTML = `
        <div class="qr-modal-box">
            <button class="qr-modal-close" id="qr-modal-close" aria-label="Đóng">&times;</button>
            <h3>Thanh toán mượn sách</h3>
            <p class="qr-modal-sub" id="qr-modal-sub"></p>
            <div id="qr-canvas-wrap"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#qr-modal-close").addEventListener("click", () => {
        modal.classList.remove("show");
    });
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("show");
    });

    return modal;
}

function showBorrowQRCode(prod) {
    const modal = ensureQRModal();
    modal.querySelector("#qr-modal-sub").innerHTML =
        `Quét mã bên dưới để thanh toán mượn sách "<strong>${prod.name}</strong>". Một email thông báo sẽ được gửi đi.`;

    // Hiện ảnh QR thanh toán tĩnh (đặt file payment-qr.jpg cùng thư mục với detail.html).
    const wrap = modal.querySelector("#qr-canvas-wrap");
    wrap.innerHTML = `<img src="payment-qr.jpg" alt="Mã QR thanh toán" style="max-width:220px;width:100%;border-radius:8px;">`;

    modal.classList.add("show");

    // Gửi email thông báo (tới Gmail cấu hình ở NOTIFY_EMAIL) khi modal hiện ra.
    sendBorrowNotificationEmail(prod);
}

// ── Product Detail ──
// localStorage('link_items') chỉ dùng để "chuyển" sản phẩm nào được chọn từ
// trang Home sang trang Detail (thông tin hiển thị: tên, ảnh, giá...).
// Trạng thái "mình đã mượn cuốn này chưa" luôn được đọc riêng từ nhánh
// borrows/{uid}/{fbKey} trên Firebase, không dựa vào localStorage.
let product = JSON.parse(localStorage.getItem('link_items'));

if (!product) {
    alert("No product selected!");
    location.href = "../Home/index.html";
} else {
    // Đọc trạng thái mượn CỦA CHÍNH tài khoản đang đăng nhập cho cuốn sách này.
    let borrowRecord = await fetchUserBorrow(product._fbKey);

    // Nếu đã quá 30 ngày (dueDate) mà chưa "trả", tự động giải phóng CHO RIÊNG
    // tài khoản này (không ảnh hưởng tới lượt mượn của tài khoản khác).
    if (borrowRecord && borrowRecord.dueDate && Date.now() > borrowRecord.dueDate) {
        setUserBorrow(product._fbKey, product.id, false); // dọn dẹp, không cần chờ
        borrowRecord = null;
    }

    let container = document.getElementById("container");
    let canRead = product.pdfLink && product.pdfLink.trim() !== "";
    // "borrowed" giờ chỉ phụ thuộc vào chính tài khoản đang đăng nhập,
    // hoàn toàn độc lập với việc các tài khoản khác có mượn cuốn này hay không.
    let borrowed = !!borrowRecord;

    function borrowButtonLabel() {
        return borrowed ? '✓ Đã mượn' : '📚 Borrow';
    }

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

    // Label cho nút đọc: tuỳ vào có link PDF hay không, và chính tài khoản
    // này đã mượn cuốn sách hay chưa.
    function readButtonLabel() {
        if (!canRead) return 'Chưa có link PDF để đọc';
        if (borrowed) return 'Đọc sách online';
        return 'Mượn sách để đọc online';
    }

    container.innerHTML = `
        <!-- Breadcrumb -->
        <nav class="breadcrumb">
            <a href="../Home/index.html">Home</a>
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

                    <!-- Action buttons -->
                    <div class="action-buttons">
                        <button class="btn-buy" id="btn-borrow-now" ${borrowed ? 'disabled' : ''}>
                            ${borrowButtonLabel()}
                        </button>
                    </div>

                    <!-- Read book button -->
                    <button class="btn-read" id="btn-read-book" ${(canRead && borrowed) ? '' : 'disabled'}>
                        📖 ${readButtonLabel()}
                    </button>

                    <!-- Đếm ngược hạn trả (chỉ hiện khi CHÍNH tài khoản này đang mượn) -->
                    <div class="borrow-countdown" id="borrow-countdown"></div>

                    <!-- Trả sách sớm (chỉ hiện khi chính tài khoản này đang mượn) -->
                    <button type="button" id="btn-return-book" style="display:none; margin-top:-6px; margin-bottom:0.75rem; background:transparent; border:none; color:#c0392b; font-size:12.5px; font-weight:600; cursor:pointer; text-decoration:underline; padding:0;">
                        Trả sách trước hạn
                    </button>

                    <!-- Cart feedback toast -->
                    <div class="cart-toast" id="cart-toast"></div>
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

    // ── Countdown hạn trả (30 ngày) ──
    let countdownTimer = null;

    function formatCountdown(ms) {
        if (ms <= 0) return null;
        const totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${days} ngày ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function setReturnButtonVisible(visible) {
        const btn = document.getElementById('btn-return-book');
        if (btn) btn.style.display = visible ? 'inline-block' : 'none';
    }

    function startCountdown(dueDate) {
        const el = document.getElementById('borrow-countdown');
        if (!el || !dueDate) return;

        clearInterval(countdownTimer);
        el.classList.remove('overdue');
        el.classList.add('show');
        setReturnButtonVisible(true);

        function tick() {
            const remain = dueDate - Date.now();
            const formatted = formatCountdown(remain);
            if (!formatted) {
                el.innerHTML = `⏰ Đã quá hạn trả sách!`;
                el.classList.add('overdue');
                clearInterval(countdownTimer);

                // Tự động trả sách (chỉ cho tài khoản này) khi hết hạn.
                borrowed = false;
                setReturnButtonVisible(false);
                const btnBorrowEl = document.getElementById('btn-borrow-now');
                if (btnBorrowEl) { btnBorrowEl.disabled = false; btnBorrowEl.textContent = borrowButtonLabel(); }
                const btnReadEl = document.getElementById('btn-read-book');
                if (canRead && btnReadEl) { btnReadEl.disabled = true; btnReadEl.innerHTML = '📖 ' + readButtonLabel(); }
                setUserBorrow(product._fbKey, product.id, false);
                return;
            }
            el.innerHTML = `⏳ Hạn trả sách còn: <strong>${formatted}</strong>`;
        }
        tick();
        countdownTimer = setInterval(tick, 1000);
    }

    // Nếu chính tài khoản này đang mượn sách, hiện luôn đồng hồ đếm ngược.
    if (borrowed && borrowRecord && borrowRecord.dueDate) {
        startCountdown(borrowRecord.dueDate);
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

    // ── Read Book ──
    const btnRead = document.getElementById('btn-read-book');
    if (btnRead && canRead) {
        btnRead.addEventListener('click', () => {
            if (!borrowed) {
                showToast('Bạn cần mượn sách trước khi đọc.', true);
                return;
            }
            // Mở link PDF ở tab mới, giữ nguyên trang chi tiết hiện tại.
            window.open(product.pdfLink, '_blank');
        });
    }

    // ── Borrow Now (chỉ tạo/xoá bản ghi mượn của CHÍNH tài khoản này) ──
    const btnBorrow = document.getElementById('btn-borrow-now');
    if (btnBorrow) {
        btnBorrow.addEventListener('click', async () => {
            if (borrowed) return;

            const now = Date.now();
            const dueDate = now + BORROW_DURATION_MS;
            borrowed = true;

            btnBorrow.disabled = true;
            btnBorrow.textContent = '✓ Đã mượn';

            if (canRead && btnRead) {
                btnRead.disabled = false;
                btnRead.innerHTML = '📖 Đọc sách online';
            }

            showToast(`✓ Bạn đã mượn "${product.name}". Hạn trả trong 30 ngày.`);
            startCountdown(dueDate);

            // Ghi lượt mượn CHỈ cho tài khoản đang đăng nhập (borrows/{uid}/{fbKey}).
            // Tài khoản khác hoàn toàn không bị ảnh hưởng bởi thao tác này.
            await setUserBorrow(product._fbKey, product.id, true);

            // Hiện QR code để gửi email xác nhận mượn sách khi quét.
            showBorrowQRCode(product);
        });
    }

    // ── Trả sách trước hạn (chỉ ảnh hưởng tới CHÍNH tài khoản này) ──
    const btnReturn = document.getElementById('btn-return-book');
    if (btnReturn) {
        btnReturn.addEventListener('click', async () => {
            if (!borrowed) return;

            borrowed = false;
            clearInterval(countdownTimer);

            const countdownEl = document.getElementById('borrow-countdown');
            if (countdownEl) {
                countdownEl.classList.remove('show', 'overdue');
                countdownEl.innerHTML = '';
            }
            setReturnButtonVisible(false);

            btnBorrow.disabled = false;
            btnBorrow.textContent = borrowButtonLabel();

            if (canRead && btnRead) {
                btnRead.disabled = true;
                btnRead.innerHTML = '📖 ' + readButtonLabel();
            }

            showToast(`Bạn đã trả "${product.name}".`);

            await setUserBorrow(product._fbKey, product.id, false);
        });
    }
}
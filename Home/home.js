// ── Firebase Setup ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
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

// ── Auth guard ──
let currentName = localStorage.getItem("name");
// UID thật do Firebase Auth cấp (xem Login.js) — dùng để tra riêng lượt mượn
// của CHÍNH tài khoản này, độc lập với các tài khoản khác.
let currentUserID = localStorage.getItem("userID") || currentName;

if (!currentName) {
  location.href = "../Login_Register/Login.html";
}

document.getElementById("currentName").innerText = currentName || "";

let avatarEl = document.getElementById("userAvatar");
if (currentName) {
  let parts = currentName.trim().split(" ");
  let initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  avatarEl.innerText = initials.toUpperCase();
}

document.getElementById("logout_btn").addEventListener("click", function () {
  alert("Đăng xuất thành công");
  localStorage.removeItem("name");
  localStorage.removeItem("userID");
  window.location.reload();
});

// ── Cart badge ──
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const total = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  badge.textContent = total;
  badge.dataset.count = total;
}
updateCartBadge();

// Listen for storage changes from detail page (same tab won't fire, but keeps it in sync on revisit)
window.addEventListener("storage", updateCartBadge);

// ── Lượt mượn của CHÍNH tài khoản đang đăng nhập ──
// Đọc riêng nhánh borrows/{uid} (xem thêm trong detail.js). Trả về Set các
// _fbKey mà tài khoản này đang mượn còn hiệu lực (chưa quá hạn).
async function fetchMyActiveBorrowKeys() {
  if (!currentUserID) return new Set();
  try {
    const snapshot = await get(child(ref(database), `borrows/${currentUserID}`));
    if (!snapshot.exists()) return new Set();
    const data = snapshot.val();
    const now = Date.now();
    const activeKeys = Object.entries(data)
      .filter(([, rec]) => !rec.dueDate || rec.dueDate > now)
      .map(([fbKey]) => fbKey);
    return new Set(activeKeys);
  } catch (err) {
    console.error("Lỗi khi đọc lượt mượn của tài khoản:", err);
    return new Set();
  }
}

// ── Load products from Firebase and render ──
async function loadAndRenderProducts() {
  const dbRef = ref(database);
  const [snapshot, myBorrowedKeys] = await Promise.all([
    get(child(dbRef, "products")),
    fetchMyActiveBorrowKeys(),
  ]);

  if (snapshot.exists()) {
    const data = snapshot.val();
    // Keep each product's Firebase key (e.g. "products/-Nabc123") so the
    // detail page can later flip its availability field.
    const products = Object.entries(data).map(([key, val]) => ({
      ...val,
      _fbKey: key,
    }));
    renderAll(products, myBorrowedKeys);
    setupFilters(products, myBorrowedKeys);
  } else {
    console.warn("No products found in Firebase.");
  }
}

// ── Render all cards ──
function renderAll(products, myBorrowedKeys) {
  const container = document.querySelector(".container");
  container.innerHTML = "";
  products.forEach(p => container.appendChild(createCard(p, myBorrowedKeys)));
}

// ── Render filtered cards ──
function renderProducts(productName, products, myBorrowedKeys) {
  const container = document.querySelector(".container");
  container.innerHTML = "";
  const filtered = products.filter(
    p => p.category.toUpperCase() === productName.toUpperCase()
  );
  filtered.forEach(p => container.appendChild(createCard(p, myBorrowedKeys)));
}

// ── Build a single card element ──
function createCard(product, myBorrowedKeys) {
  const card = document.createElement("div");
  card.className = "card";

  const placeholder = "https://placehold.co/400x220?text=No+Image";
  // Badge giờ mang tính CÁ NHÂN: chỉ báo "Bạn đang mượn" nếu chính tài khoản
  // này có lượt mượn còn hiệu lực cho cuốn sách này — không liên quan gì tới
  // việc các tài khoản khác có mượn cuốn này hay không.
  const borrowedByMe = myBorrowedKeys instanceof Set && myBorrowedKeys.has(product._fbKey);

  card.innerHTML = `
    <div class="image-wrap">
      <img class="image" src="${product.image || placeholder}" onerror="this.onerror=null;this.src='${placeholder}';">
      ${borrowedByMe ? '<span class="unavailable-badge">Bạn đang mượn</span>' : ""}
    </div>
    <h2>${product.name}</h2>
    <div class="price">${product.price}.000đ</div>
    <div class="category">${product.category}</div>
    <button class="btn">Detail</button>
  `;

  // Detail button luôn có thể bấm để xem thông tin sách. Việc mượn/đọc online
  // được xử lý riêng ở trang Detail, độc lập theo từng tài khoản.
  card.querySelector(".btn").addEventListener("click", function () {
    localStorage.setItem("link_items", JSON.stringify(product));
    location.href = "../Detail/detail.html";
  });

  return card;
}

// ── Wire up search & category buttons ──
function setupFilters(products, myBorrowedKeys) {
  const input = document.getElementById("input");
  const searchBtn = document.getElementById("getInputValue");
  const categoryBtns = document.querySelectorAll(".category-btn");

  searchBtn.addEventListener("click", function () {
    const query = input.value.trim().toLowerCase();
    const filtered = products.filter(p =>
      p.category.toLowerCase().includes(query)
    );
    const container = document.querySelector(".container");
    container.innerHTML = "";
    filtered.forEach(p => container.appendChild(createCard(p, myBorrowedKeys)));
    categoryBtns.forEach(b => b.classList.remove("active"));
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchBtn.click();
  });

  categoryBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      categoryBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      const category = this.dataset.category;
      if (category === "all") {
        renderAll(products, myBorrowedKeys);
      } else {
        renderProducts(category, products, myBorrowedKeys);
      }
      input.value = "";
    });
  });
}

await loadAndRenderProducts();
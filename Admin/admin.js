// ── Firebase Setup ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
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

// ── Auth guard ──
let currentName = localStorage.getItem("name");
if (!currentName) {
  location.href = "../Login_Register/Login.html";
}

// Display user name
document.getElementById("currentName").innerText = currentName || "";

// Generate avatar initials
let avatarEl = document.getElementById("userAvatar");
if (currentName) {
  let parts = currentName.trim().split(" ");
  let initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  avatarEl.innerText = initials.toUpperCase();
}

// Logout
document.getElementById("logout_btn").addEventListener("click", function () {
  alert("Đăng xuất thành công");
  localStorage.removeItem("name");
  localStorage.removeItem("userID");
  window.location.reload();
});

// Add product
document.getElementById("add_btn").addEventListener("click", function () {
  location.href = "../Add/add.html";
});

// ── Load products from Firebase and render ──
async function loadAndRenderProducts() {
  const dbRef = ref(database);
  const snapshot = await get(child(dbRef, "products"));

  if (snapshot.exists()) {
    const data = snapshot.val();
    const products = Object.values(data);
    renderAll(products);
    setupFilters(products);
  } else {
    const container = document.querySelector(".container");
    container.innerHTML = `<div class="empty-state"><p>No books found.</p></div>`;
  }
}

// ── Render all cards ──
function renderAll(products) {
  const container = document.querySelector(".container");
  container.innerHTML = "";
  products.forEach(p => container.appendChild(createCard(p)));
}

// ── Render filtered cards ──
function renderProducts(productName, products) {
  const container = document.querySelector(".container");
  container.innerHTML = "";
  const filtered = products.filter(
    p => p.category.toUpperCase() === productName.toUpperCase()
  );
  filtered.forEach(p => container.appendChild(createCard(p)));
}

// ── Build a single card element ──
function createCard(product) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img class="image" src="${product.image || ""}" alt="${product.name}" onerror="this.style.background='#ede5d8'">
    <div class="card-body">
      <div class="category">${product.category}</div>
      <h2>${product.name}</h2>
      <div class="price">${product.price}.000₫</div>
      <div class="card-actions">
        <button class="btn btn-edit">Edit</button>
        <button class="btn btn-delete">Delete</button>
      </div>
    </div>
  `;

  card.querySelector(".btn-edit").addEventListener("click", function () {
    localStorage.setItem("link_items", JSON.stringify(product));
    location.href = "../Edit/edit.html";
  });

  card.querySelector(".btn-delete").addEventListener("click", function () {
    remove(ref(database, `products/${product.id}`)).then(function () {
      alert("Xóa thành công");
      localStorage.removeItem("link_items");
      window.location.reload();
    });
  });

  return card;
}

// ── Wire up search & category buttons ──
function setupFilters(products) {
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
    filtered.forEach(p => container.appendChild(createCard(p)));
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
        renderAll(products);
      } else {
        renderProducts(category, products);
      }
      input.value = "";
    });
  });
}

// ── Entry point ──
await loadAndRenderProducts();
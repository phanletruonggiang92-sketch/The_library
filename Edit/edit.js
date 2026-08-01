import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
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

// ── Auth ──
let currentName = localStorage.getItem("name");
if (!currentName) {
  location.href = "../Login_Register/Login.html";
}

// DOM refs
let input_image    = document.getElementById("image-input");
let input_category = document.getElementById("category-input");
let input_name     = document.getElementById("name-input");
let input_price    = document.getElementById("price-input");
let input_about    = document.getElementById("about-input");
let input_content  = document.getElementById("content-input");
let input_pdflink  = document.getElementById("pdflink-input");
let edit_btn       = document.querySelector(".detail-buy-btn");
const imagePreview = document.getElementById("image-preview");

// Live image preview
input_image.addEventListener("input", function () {
  const url = this.value.trim();
  if (url) {
    imagePreview.src = url;
    imagePreview.style.display = "block";
  } else {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
});

// Display user name
let nameEl = document.getElementById("currentName");
if (nameEl) nameEl.innerText = currentName || "";

// Generate avatar initials
let avatarEl = document.getElementById("userAvatar");
if (avatarEl && currentName) {
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
  location.href = "../Login_Register/Login.html";
});

// ── Trích xuất ảnh từ file PDF ──
// Dùng thư viện pdf.js: vẽ từng trang PDF ra canvas rồi chụp lại thành ảnh (JPEG),
// sau đó tự động chèn dạng [img:...] vào ô "Nội dung sách".
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfInput   = document.getElementById("pdf-input");
const extractBtn = document.getElementById("extract-pdf-btn");
const pdfStatus  = document.getElementById("pdf-status");

extractBtn.addEventListener("click", async function () {
  const file = pdfInput.files[0];

  if (!file) {
    alert("Vui lòng chọn 1 file PDF trước.");
    return;
  }

  extractBtn.disabled = true;
  pdfStatus.textContent = "Đang đọc file PDF...";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let imageLines = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      pdfStatus.textContent = `Đang xử lý trang ${i} / ${pdf.numPages}...`;

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.2 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: viewport,
      }).promise;

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      imageLines += `\n[img:${dataUrl}]\n`;
    }

    input_content.value = (input_content.value.trim() + "\n" + imageLines).trim();

    pdfStatus.textContent = `✓ Đã trích xuất xong ${pdf.numPages} trang ảnh từ PDF.`;
  } catch (err) {
    console.error(err);
    pdfStatus.textContent = "";
    alert("Không thể xử lý file PDF: " + err.message);
  } finally {
    extractBtn.disabled = false;
  }
});

// ── Product Detail ──
let product = JSON.parse(localStorage.getItem("link_items"));

if (!product) {
  alert("No product selected!");
  location.href = "../Home/home.html";
} else {
  // Pre-fill inputs
  input_image.value    = product.image    || "";
  input_category.value = product.category || "";
  input_name.value     = product.name     || "";
  input_price.value    = product.price    || "";
  input_about.value    = product.about    || "";
  input_content.value  = product.content  || "";
  input_pdflink.value  = product.pdfLink  || "";

  // Show existing image preview
  if (product.image) {
    imagePreview.src = product.image;
    imagePreview.style.display = "block";
  }

  // Save changes
  edit_btn.addEventListener("click", function () {
    const new_image    = input_image.value;
    const new_category = input_category.value;
    const new_name     = input_name.value.trim();
    const new_price    = input_price.value;
    const new_about    = input_about.value.trim();
    const new_content  = input_content.value.trim();
    const new_pdflink  = input_pdflink.value.trim();

    update(ref(database, `products/${product.id}`), {
      image: new_image,
      category: new_category,
      price: new_price,
      name: new_name,
      about: new_about,
      content: new_content,
      pdfLink: new_pdflink,
    }).then(() => {
      alert("Cập nhật thành công!");
    });
  });
}
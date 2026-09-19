// ── Firebase Setup ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-database.js";
import {
  PREMIUM_PRICE,
  BORROW_PRICE,
  formatVND,
  formatDate,
  getPremiumStatus,
  activatePremium,
} from "./premium-service.js";

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

const NOTIFY_EMAIL = "phanletruonggiang92@gmail.com";

// ── Auth guard & header ──
const currentName = localStorage.getItem("name");
const currentUserID = localStorage.getItem("userID") || currentName;

if (!currentName) {
  location.href = "../Login_Register/Login.html";
}

document.getElementById("currentName").innerText = currentName || "";

const avatarEl = document.getElementById("userAvatar");
if (currentName) {
  const parts = currentName.trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  avatarEl.innerText = initials.toUpperCase();
}

document.getElementById("logout_btn").addEventListener("click", () => {
  alert("Đăng xuất thành công");
  localStorage.removeItem("name");
  localStorage.removeItem("userID");
  location.href = "../Login_Register/Login.html";
});

// ── Toast ──
function showToast(msg, isError = false) {
  const toast = document.getElementById("cart-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "cart-toast " + (isError ? "error" : "success") + " show";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ── Trạng thái Premium ──
const statusEl = document.getElementById("premium-status");
const upgradeBtn = document.getElementById("btn-upgrade");
let premium = { active: false };

function renderStatus() {
  if (premium.active) {
    const daysLeft = Math.max(1, Math.ceil((premium.expiresAt - Date.now()) / 86400000));
    statusEl.hidden = false;
    statusEl.innerHTML =
      `👑 Bạn đang là thành viên <strong>Premium</strong>. Hết hạn ngày <strong>${formatDate(premium.expiresAt)}</strong> (còn ${daysLeft} ngày). ` +
      `Mượn sách miễn phí ${formatVND(BORROW_PRICE)}/cuốn trong thời gian này.`;
    upgradeBtn.textContent = `Gia hạn thêm 30 ngày – ${formatVND(PREMIUM_PRICE)}`;
  } else {
    statusEl.hidden = true;
    upgradeBtn.textContent = `Nâng cấp Premium – ${formatVND(PREMIUM_PRICE)}`;
  }
}

async function refreshStatus() {
  premium = await getPremiumStatus(database, currentUserID);
  renderStatus();
}

// ── QR modal thanh toán ──
function buildMailto() {
  const qrImageUrl = new URL("payment-qr-premium.jpg", location.href).toString();
  const subject = `Xác nhận nâng cấp Premium: ${currentName}`;
  const body = [
    `Gói: Premium 30 ngày`,
    `Người dùng: ${currentName}`,
    `Mã tài khoản: ${currentUserID}`,
    `Số tiền: ${formatVND(PREMIUM_PRICE)}`,
    "",
    "Ảnh QR thanh toán (bấm để xem):",
    qrImageUrl,
  ].join("\n");

  return `mailto:${encodeURIComponent(NOTIFY_EMAIL)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
}

function ensureModal() {
  let modal = document.getElementById("qr-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "qr-modal";
  modal.className = "qr-modal-overlay";
  modal.innerHTML = `
    <div class="qr-modal-box">
      <button class="qr-modal-close" id="qr-modal-close" aria-label="Đóng">&times;</button>
      <h3>Thanh toán Premium</h3>
      <p class="qr-modal-sub">
        Quét mã để chuyển <strong>${formatVND(PREMIUM_PRICE)}</strong> cho gói Premium 30 ngày.
        Sau khi chuyển khoản, bấm "Tôi đã thanh toán" để kích hoạt.
      </p>
      <div id="qr-canvas-wrap">
        <img src="payment-qr-premium.jpg" alt="Mã QR thanh toán Premium"
             onerror="this.onerror=null;this.src='../Detail/payment-qr.jpg';">
      </div>
      <a class="qr-mail-link" id="qr-modal-mailto" href="#" target="_blank" rel="noopener">📧 Gửi email xác nhận</a>
      <button class="qr-confirm-btn" id="qr-confirm-btn">Tôi đã thanh toán</button>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.classList.remove("show");
  modal.querySelector("#qr-modal-close").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  modal.querySelector("#qr-confirm-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Đang kích hoạt…";
    try {
      const expiresAt = await activatePremium(database, currentUserID);
      close();
      await refreshStatus();
      showToast(`✓ Premium đã kích hoạt, hết hạn ngày ${formatDate(expiresAt)}.`);
    } catch (err) {
      console.error("Lỗi khi kích hoạt Premium:", err);
      showToast("Không thể kích hoạt Premium. Vui lòng thử lại.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Tôi đã thanh toán";
    }
  });

  return modal;
}

upgradeBtn.addEventListener("click", () => {
  const modal = ensureModal();
  modal.querySelector("#qr-modal-mailto").href = buildMailto();
  modal.classList.add("show");
});

await refreshStatus();

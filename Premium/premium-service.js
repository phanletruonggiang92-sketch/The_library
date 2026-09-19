// ── Premium service (dùng chung cho Home / Detail / Premium) ──
// Dữ liệu lưu tại: users/{uid}/premium = { activatedAt, lastPaidAt, expiresAt, price }
import {
  ref,
  get,
  child,
  update,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-database.js";

// Đơn vị: nghìn đồng (khớp với cách app đang hiển thị "xx.000đ")
export const BORROW_PRICE = 3;     // 3.000đ / lượt mượn sách
export const PREMIUM_PRICE = 30;   // 30.000đ / tháng
export const PREMIUM_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export function formatVND(thousands) {
  return `${thousands}.000₫`;
}

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// Trả về { active, expiresAt, activatedAt } của tài khoản.
export async function getPremiumStatus(database, uid) {
  if (!uid) return { active: false, expiresAt: null, activatedAt: null };
  try {
    const snap = await get(child(ref(database), `users/${uid}/premium`));
    if (!snap.exists()) return { active: false, expiresAt: null, activatedAt: null };
    const d = snap.val();
    return {
      active: !!d.expiresAt && d.expiresAt > Date.now(),
      expiresAt: d.expiresAt || null,
      activatedAt: d.activatedAt || null,
    };
  } catch (err) {
    console.error("Lỗi khi đọc trạng thái Premium:", err);
    return { active: false, expiresAt: null, activatedAt: null };
  }
}

// Kích hoạt / gia hạn thêm 30 ngày. Gia hạn khi còn hạn thì CỘNG DỒN thời gian.
export async function activatePremium(database, uid) {
  const current = await getPremiumStatus(database, uid);
  const now = Date.now();
  const base = current.active ? current.expiresAt : now;
  const expiresAt = base + PREMIUM_DURATION_MS;

  await update(ref(database, `users/${uid}/premium`), {
    activatedAt: current.active && current.activatedAt ? current.activatedAt : now,
    lastPaidAt: now,
    expiresAt,
    price: PREMIUM_PRICE,
  });
  return expiresAt;
}

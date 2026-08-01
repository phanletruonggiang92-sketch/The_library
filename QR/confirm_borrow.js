// ─────────────────────────────────────────────────────────────
// THAY 3 GIÁ TRỊ NÀY BẰNG THÔNG TIN TÀI KHOẢN EMAILJS CỦA BẠN
// (Lấy tại https://dashboard.emailjs.com/)
// ─────────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

(function () {
    if (typeof emailjs === "undefined") {
        document.getElementById("spinner").style.display = "none";
        document.getElementById("desc").textContent = "Không tải được thư viện gửi email.";
        const statusEl = document.getElementById("status");
        statusEl.textContent = "✗ Vui lòng thử lại sau.";
        statusEl.classList.add("err");
        return;
    }

    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

    const params = new URLSearchParams(location.search);
    const email = params.get("email");
    const book = params.get("book") || "";
    const bookId = params.get("bookId") || "";
    const user = params.get("user") || "";

    const descEl = document.getElementById("desc");
    const statusEl = document.getElementById("status");
    const spinnerEl = document.getElementById("spinner");

    if (!email) {
        spinnerEl.style.display = "none";
        descEl.textContent = "Thiếu thông tin email trong đường dẫn.";
        statusEl.textContent = "✗ Không thể gửi email xác nhận.";
        statusEl.classList.add("err");
        return;
    }

    descEl.textContent = `Đang gửi email xác nhận mượn sách "${book}" đến ${email}...`;

    // Các biến (to_email, book_name, book_id, user_name) cần được khai báo
    // tương ứng trong Template của EmailJS.
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: email,
        book_name: book,
        book_id: bookId,
        user_name: user,
    }).then(() => {
        spinnerEl.style.display = "none";
        descEl.textContent = `Email xác nhận mượn sách "${book}" đã được gửi đến ${email}.`;
        statusEl.textContent = "✓ Gửi thành công!";
        statusEl.classList.add("ok");
    }).catch((err) => {
        spinnerEl.style.display = "none";
        statusEl.textContent = "✗ Gửi email thất bại. Vui lòng thử lại.";
        statusEl.classList.add("err");
        console.error("EmailJS error:", err);
    });
})();
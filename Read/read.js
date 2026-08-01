// ── Auth & Header (giống các trang khác) ──
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

// ── Chia nội dung sách thành nhiều "trang" nhỏ ──
// Cắt theo đoạn văn (xuống dòng \n), gom các đoạn lại cho tới khi
// gần đủ maxChars ký tự thì mới sang trang mới.
// Nếu 1 đoạn có dạng [img:https://...] thì đoạn đó sẽ được hiểu là 1 tấm ảnh.
function paginate(text, maxChars) {
    const paragraphs = text.split("\n").filter(p => p.trim() !== "");
    const pages = [];
    let currentBlocks = [];
    let currentLength = 0;

    paragraphs.forEach(p => {
        const trimmed = p.trim();
        const imgMatch = trimmed.match(/^\[img:(.+)\]$/i);

        const block = imgMatch
            ? { type: "image", src: imgMatch[1].trim() }
            : { type: "text", content: trimmed };

        // Ảnh được tính "nặng" gần bằng cả 1 trang, để mỗi ảnh PDF/minh họa
        // chiếm gần trọn 1 trang đọc, không bị dồn nhiều ảnh chung 1 trang
        const blockLength = imgMatch ? maxChars : trimmed.length;

        if (currentLength + blockLength > maxChars && currentBlocks.length > 0) {
            pages.push(currentBlocks);
            currentBlocks = [block];
            currentLength = blockLength;
        } else {
            currentBlocks.push(block);
            currentLength += blockLength;
        }
    });

    if (currentBlocks.length) pages.push(currentBlocks);
    return pages.length ? pages : null;
}

// Chuyển text thường thành HTML an toàn (tránh chèn thẻ HTML lạ vào)
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ── Lấy sách đang chọn ──
let product = JSON.parse(localStorage.getItem("link_items"));
const container = document.getElementById("reader-container");

if (!product) {
    alert("Chưa chọn sách nào!");
    location.href = "../Home/home.html";
} else {

    const rawContent = (product.content || "").trim();
    const pages = rawContent ? paginate(rawContent, 900) : null;

    // Trường hợp sách chưa có nội dung để đọc
    if (!pages) {
        container.innerHTML = `
            <div class="reader-card">
                <h1 class="reader-title">${product.name}</h1>
                <p class="reader-empty">📖 Sách này chưa có nội dung để đọc online. Vui lòng quay lại sau.</p>
            </div>
        `;
    } else {
        // Nhớ trang đang đọc dở cho từng cuốn sách (theo id)
        const progressKey = "readProgress_" + product.id;
        let currentPage = parseInt(localStorage.getItem(progressKey)) || 0;
        if (currentPage < 0 || currentPage >= pages.length) currentPage = 0;

        // Nhớ cỡ chữ người dùng đã chọn (áp dụng chung mọi sách)
        const fontSizes = ["15px", "17px", "19px", "22px"];
        let fontSizeLevel = parseInt(localStorage.getItem("readerFontSize"));
        if (isNaN(fontSizeLevel) || fontSizeLevel < 0 || fontSizeLevel >= fontSizes.length) {
            fontSizeLevel = 1;
        }

        container.innerHTML = `
            <div class="reader-card">
                <div class="reader-top">
                    <div>
                        ${product.category ? `<span class="reader-category">${product.category}</span>` : ''}
                        <h1 class="reader-title">${product.name}</h1>
                    </div>
                    <div class="font-controls">
                        <button id="font-minus" title="Giảm cỡ chữ">A−</button>
                        <button id="font-plus" title="Tăng cỡ chữ">A+</button>
                    </div>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill"></div>
                </div>

                <div class="reader-page" id="reader-page"></div>

                <div class="reader-nav">
                    <button id="prev-page" class="nav-btn">‹ Trang trước</button>
                    <span class="page-indicator" id="page-indicator"></span>
                    <button id="next-page" class="nav-btn">Trang sau ›</button>
                </div>
            </div>
        `;

        const pageEl       = document.getElementById("reader-page");
        const indicatorEl  = document.getElementById("page-indicator");
        const progressFill = document.getElementById("progress-fill");
        const prevBtn      = document.getElementById("prev-page");
        const nextBtn      = document.getElementById("next-page");

        function renderPage() {
            pageEl.style.fontSize = fontSizes[fontSizeLevel];

            const blocks = pages[currentPage];
            pageEl.innerHTML = blocks.map(block => {
                if (block.type === "image") {
                    return `<img class="reader-image" src="${block.src}" alt="Hình minh họa" onerror="this.style.display='none'">`;
                }
                return `<p class="reader-paragraph">${escapeHtml(block.content)}</p>`;
            }).join("");

            indicatorEl.textContent = `Trang ${currentPage + 1} / ${pages.length}`;
            progressFill.style.width = ((currentPage + 1) / pages.length * 100) + "%";

            prevBtn.disabled = currentPage === 0;
            nextBtn.disabled = currentPage === pages.length - 1;

            localStorage.setItem(progressKey, currentPage);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        prevBtn.addEventListener("click", () => {
            if (currentPage > 0) {
                currentPage--;
                renderPage();
            }
        });

        nextBtn.addEventListener("click", () => {
            if (currentPage < pages.length - 1) {
                currentPage++;
                renderPage();
            }
        });

        document.getElementById("font-minus").addEventListener("click", () => {
            if (fontSizeLevel > 0) {
                fontSizeLevel--;
                localStorage.setItem("readerFontSize", fontSizeLevel);
                renderPage();
            }
        });

        document.getElementById("font-plus").addEventListener("click", () => {
            if (fontSizeLevel < fontSizes.length - 1) {
                fontSizeLevel++;
                localStorage.setItem("readerFontSize", fontSizeLevel);
                renderPage();
            }
        });

        renderPage();
    }
}
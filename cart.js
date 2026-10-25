// ===== SHOPPING CART & CHECKOUT (OWASP A04, A05, A07, A10) =====

let cart = [];
let rawTotal = 0;
let discountType = null;
let discountValue = 0;

// Initialize cart from localStorage securely
try {
    const stored = localStorage.getItem('moharram_cart');
    cart = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(cart)) cart = [];
    cart = cart.filter(i => i && typeof i === 'object' && i.name && typeof i.price === 'number');
} catch (e) {
    cart = [];
}

// Calculate initial total
rawTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

/**
 * Add Product to Cart
 */
function addToCart(id, name, price) {
    const numericPrice = parseFloat(price) || 0;
    const existing = cart.find(i => (i.id && i.id == id) || (!i.id && i.name === name));

    if (existing) {
        existing.qty++;
        existing.price = numericPrice;
    } else {
        cart.push({ id: id || '', name: name || '', price: numericPrice, qty: 1 });
    }

    rawTotal += numericPrice;
    saveCart();
    refreshCounters();
    renderCart();

    const displayName = (name || '').split('(')[0].trim();
    if (typeof showToast === 'function') {
        showToast('✅ أُضيف للسلة: ' + displayName, 'success');
    }
}

/**
 * Flying Animation to Cart
 */
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.add-to-cart-btn');
    if (btn) {
        const card = btn.closest('.product-card');
        if (card) {
            const img = card.querySelector('.product-image img');
            if (img) flyToCartAnimation(img);
        }
    }
});

function flyToCartAnimation(imgEl) {
    let cartIcon = document.querySelector('.float-cart-btn');
    if (!cartIcon || window.getComputedStyle(cartIcon).display === 'none' || cartIcon.offsetParent === null) {
        cartIcon = document.querySelector('button[onclick="openCart()"]');
    }
    if (!cartIcon || !imgEl) return;

    const imgRect = imgEl.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const clone = imgEl.cloneNode(true);
    Object.assign(clone.style, {
        position: 'fixed',
        top: `${imgRect.top}px`,
        left: `${imgRect.left}px`,
        width: `${imgRect.width}px`,
        height: `${imgRect.height}px`,
        zIndex: '9999',
        transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
        borderRadius: '50%',
        pointerEvents: 'none',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        objectFit: 'cover'
    });

    document.body.appendChild(clone);
    clone.getBoundingClientRect();

    Object.assign(clone.style, {
        top: `${cartRect.top + cartRect.height / 2 - imgRect.height / 2}px`,
        left: `${cartRect.left + cartRect.width / 2 - imgRect.width / 2}px`,
        transform: 'scale(0.1)',
        opacity: '0.2'
    });

    setTimeout(() => {
        clone.remove();
        cartIcon.style.transition = 'transform 0.2s';
        cartIcon.style.transform = 'scale(1.3)';
        setTimeout(() => { cartIcon.style.transform = ''; }, 200);
    }, 800);
}

function saveCart() {
    localStorage.setItem('moharram_cart', JSON.stringify(cart));
}

function changeQty(idx, delta) {
    const item = cart[idx];
    if (!item) return;

    if (item.qty + delta <= 0) {
        removeItem(idx);
        return;
    }
    item.qty += delta;
    rawTotal += item.price * delta;
    saveCart();
    refreshCounters();
    renderCart();
}

function setQty(idx, val) {
    const item = cart[idx];
    if (!item) return;

    let newQty = parseInt(val);
    if (isNaN(newQty) || newQty <= 0) newQty = 1;

    let diff = newQty - item.qty;
    item.qty = newQty;
    rawTotal += item.price * diff;
    saveCart();
    refreshCounters();
    renderCart();
}

function removeItem(idx) {
    if (!cart[idx]) return;
    rawTotal -= cart[idx].price * cart[idx].qty;
    cart.splice(idx, 1);

    if (!cart.length) {
        discountType = null;
        discountValue = 0;
        const msg = document.getElementById('discount-message');
        if (msg) msg.innerText = '';
    }
    saveCart();
    refreshCounters();
    renderCart();
}

function refreshCounters() {
    const n = cart.reduce((a, i) => a + i.qty, 0);
    ['cart-counter', 'float-cart-counter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = n;
            el.style.display = n ? 'flex' : 'none';
        }
    });
}

/**
 * Render Cart Drawer UI
 */
function renderCart() {
    const box = document.getElementById('cart-items-container');
    const sum = document.getElementById('cart-summary');
    if (!box) return;

    if (!cart.length) {
        box.innerHTML = `
            <div class="cart-empty-state text-center py-4">
                <i class="fas fa-shopping-basket"></i>
                <p>سلتك فارغة حتى الآن</p>
                <small>أضف منتجاتك المفضلة واستمتع بأفضل الأسعار</small>
            </div>`;
        if (sum) sum.style.display = 'none';
        return;
    }

    box.innerHTML = cart.map((it, i) => `
        <div class="cart-item d-flex align-items-center py-3 border-bottom">
            <div class="cart-item-info flex-grow-1">
                <div class="cart-item-name fw-bold mb-1">${escapeHTML(it.name)}</div>
                <div class="cart-item-price text-brown-mid fw-bolder">${(it.price * it.qty).toLocaleString()} ج.م</div>
            </div>
            <div class="qty-controls d-flex align-items-center mx-2 border rounded overflow-hidden">
                <button class="qty-btn minus bg-light border-0 px-2 py-1" onclick="changeQty(${i}, -1)">-</button>
                <input type="number" class="qty-input border-0 text-center" style="width: 36px; -moz-appearance: textfield;" value="${it.qty}" onchange="setQty(${i}, this.value)">
                <button class="qty-btn plus bg-light border-0 px-2 py-1" onclick="changeQty(${i}, 1)">+</button>
            </div>
            <button class="cart-remove btn btn-link text-danger p-0 ms-2" onclick="removeItem(${i})"><i class="fas fa-trash-alt"></i></button>
        </div>`).join('');

    if (sum) sum.style.display = 'block';
    updateSummary();
}

/**
 * Calculate Summary, Shipping & Coupon Discount
 */
function updateSummary() {
    let discAmt = 0;
    if (discountType === 'percent') discAmt = rawTotal * discountValue;
    else if (discountType === 'fixed') discAmt = Math.min(discountValue, rawTotal);

    const afterDisc = rawTotal - discAmt;
    const gov = document.getElementById('governorate');
    let ship = gov && gov.value ? parseInt(gov.value) : 0;
    if (rawTotal >= 1999 && cart.length) ship = 0;

    const subtotalEl = document.getElementById('sum-subtotal');
    if (subtotalEl) subtotalEl.textContent = rawTotal.toLocaleString() + ' ج.م';

    const dr = document.getElementById('sum-disc-row');
    const discEl = document.getElementById('sum-disc');
    if (discAmt > 0 && dr && discEl) {
        dr.style.display = 'flex';
        discEl.textContent = '-' + Math.round(discAmt).toLocaleString() + ' ج.م';
    } else if (dr) {
        dr.style.display = 'none';
    }

    const sh = document.getElementById('sum-ship');
    if (sh) {
        if (!cart.length || !gov || !gov.value) sh.textContent = 'يُحدد بالمحافظة';
        else if (ship === 0 && rawTotal >= 1999) sh.innerHTML = '<span style="color:#25D366">مجاناً 🎉</span>';
        else sh.textContent = ship.toLocaleString() + ' ج.م';
    }

    const totalEl = document.getElementById('sum-total');
    if (totalEl) totalEl.textContent = (afterDisc + ship).toLocaleString() + ' ج.م';
}

/**
 * Apply Coupon Code (OWASP A05 & A10 Query Handling)
 */
async function applyDiscount() {
    if (!cart.length) {
        if (typeof showToast === 'function') showToast('أضف منتجات أولاً!', 'warn');
        return;
    }
    const codeInput = document.getElementById('discount-code');
    const msg = document.getElementById('discount-message');
    if (!codeInput || !msg) return;

    const val = codeInput.value.trim().toUpperCase();
    if (!val) {
        msg.style.color = 'var(--red)';
        msg.textContent = '❌ أدخل كود الخصم';
        return;
    }

    msg.style.color = 'var(--text-muted)';
    msg.textContent = '⏳ جاري التحقق...';

    try {
        if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
            throw new Error();
        }

        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/discount_codes?code=eq.${encodeURIComponent(val)}&select=*&limit=1`,
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        const rows = await resp.json();

        if (!rows || !rows.length) {
            discountType = null; discountValue = 0;
            msg.style.color = 'var(--red)';
            msg.textContent = '❌ كود غير صحيح أو غير موجود';
            if (typeof showToast === 'function') showToast('❌ كود الخصم غير صحيح', 'error');
            updateSummary();
            return;
        }

        const dc = rows[0];
        const now = new Date();

        if (!dc.is_active) {
            discountType = null; discountValue = 0;
            msg.style.color = 'var(--red)';
            msg.textContent = '❌ هذا الكود موقوف حالياً';
            updateSummary();
            return;
        }

        if (dc.expires_at && new Date(dc.expires_at) < now) {
            discountType = null; discountValue = 0;
            msg.style.color = 'var(--red)';
            msg.textContent = '❌ هذا الكود منتهي الصلاحية';
            updateSummary();
            return;
        }

        if (dc.discount_type === 'percent') {
            discountType = 'percent';
            discountValue = dc.value / 100;
            msg.textContent = `✅ تم تطبيق خصم ${dc.value}٪!`;
        } else {
            discountType = 'fixed';
            discountValue = dc.value;
            msg.textContent = `✅ تم تطبيق خصم ${Number(dc.value).toLocaleString()} ج.م!`;
        }
        msg.style.color = '#25D366';

    } catch (e) {
        discountType = null; discountValue = 0;
        msg.style.color = 'var(--red)';
        msg.textContent = '❌ يتعذر التحقق من الكود حالياً';
    }

    updateSummary();
}

/**
 * Open Cart Drawer
 */
function openCart() {
    const cartOffcanvasEl = document.getElementById('cartOffcanvas');
    if (cartOffcanvasEl && typeof bootstrap !== 'undefined') {
        let bsOffcanvas = bootstrap.Offcanvas.getInstance(cartOffcanvasEl) || new bootstrap.Offcanvas(cartOffcanvasEl);
        bsOffcanvas.show();
    }
}

/**
 * Submit Order via WhatsApp (OWASP A05 & A07 Input Validation)
 */
function sendOrder() {
    if (!cart.length) {
        if (typeof showToast === 'function') showToast('🛒 السلة فارغة!', 'warn');
        return;
    }

    const nameInput = document.getElementById('customer-name');
    const addrInput = document.getElementById('customer-address');
    const phoneInput = document.getElementById('customer-phone');
    const govSelect = document.getElementById('governorate');
    const payRadio = document.querySelector('input[name="pay"]:checked');

    if (!nameInput || !addrInput || !phoneInput || !govSelect) return;

    const name = nameInput.value.trim();
    const addr = addrInput.value.trim();
    const phone = phoneInput.value.trim();
    const govVal = govSelect.value;
    const pay = payRadio ? payRadio.value : 'نقداً عند الاستلام';

    const phoneRegex = /^01[0125][0-9]{8}$/;

    if (!name || !addr || !phone || !govVal) {
        if (typeof showToast === 'function') showToast('⚠️ يرجى إكمال بيانات التوصيل أولاً', 'warn');
        return;
    }

    if (!phoneRegex.test(phone)) {
        if (typeof showToast === 'function') showToast('❌ رقم الهاتف غير صحيح (مثال: 01012345678)', 'error');
        return;
    }

    let discAmt = 0;
    if (discountType === 'percent') discAmt = rawTotal * discountValue;
    else if (discountType === 'fixed') discAmt = Math.min(discountValue, rawTotal);

    const after = rawTotal - discAmt;
    let ship = parseInt(govVal);
    if (rawTotal >= 1999) ship = 0;
    const govName = govSelect.options[govSelect.selectedIndex].text;
    const final = after + ship;

    let msg = `*🍯 طلب جديد - متجر محرم*\n━━━━━━━━━━━━━━━━\n*المنتجات:*\n`;
    cart.forEach(i => {
        msg += `• ${i.name} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} ج.م\n`;
    });
    msg += `━━━━━━━━━━━━━━━━\n*الفاتورة:*\nإجمالي المنتجات: ${rawTotal.toLocaleString()} ج.م\n`;
    if (discAmt > 0) msg += `خصم الكوبون: -${Math.round(discAmt).toLocaleString()} ج.م\n`;
    msg += `الشحن (${govName}): ${ship === 0 ? 'مجاناً 🎉' : ship + ' ج.م'}\n*الإجمالي النهائي: ${final.toLocaleString()} ج.م*\n`;
    msg += `━━━━━━━━━━━━━━━━\n*طريقة الدفع:* ${pay}\n━━━━━━━━━━━━━━━━\n*بيانات التوصيل:*\nالاسم: ${name}\nالمحافظة: ${govName}\nالعنوان: ${addr}\nالهاتف: ${phone}`;

    window.open('https://wa.me/201067986822?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
}

// Initialise Counters on Ready
document.addEventListener('DOMContentLoaded', () => {
    refreshCounters();
    renderCart();
});

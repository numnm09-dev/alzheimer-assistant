// ===== WISHLIST MANAGEMENT (OWASP A04, A05) =====

let wishlist = [];

// Initialize Wishlist securely from localStorage
try {
    const stored = localStorage.getItem('moharram_wishlist');
    wishlist = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(wishlist)) wishlist = [];
    wishlist = wishlist.filter(i => i && typeof i === 'object' && (i.title || i.name));
} catch (e) {
    wishlist = [];
}

/**
 * Toggle Item in Wishlist
 */
function toggleWish(btn, id) {
    const card = btn ? btn.closest('.product-card') : null;
    if (!card) return;

    const titleEl = card.querySelector('.product-title');
    const title = titleEl ? titleEl.innerText.trim() : '';
    if (!title) return;

    let cartName = title;
    let price = 0;

    const cartBtn = card.querySelector('.add-to-cart-btn');
    if (cartBtn) {
        const onclickAttr = cartBtn.getAttribute('onclick');
        if (onclickAttr) {
            const match3 = onclickAttr.match(/addToCart\('([^']+)',\s*'([^']+)',\s*([\d.]+)\)/);
            const match2 = onclickAttr.match(/addToCart\('([^']+)',\s*([\d.]+)\)/);
            if (match3) {
                cartName = match3[2];
                price = parseFloat(match3[3]);
            } else if (match2) {
                cartName = match2[1];
                price = parseFloat(match2[2]);
            }
        }
    }

    const imgEl = card.querySelector('img');
    const img = imgEl ? imgEl.src : '';
    const catEl = card.querySelector('.product-category');
    const cat = catEl ? catEl.innerText.trim() : '';

    const index = wishlist.findIndex(i => (id && i.id == id) || (!id && i && (i.title === title || i.name === title)));
    const ic = btn.querySelector('i');

    if (index > -1) {
        wishlist.splice(index, 1);
        if (ic) {
            ic.classList.remove('fas');
            ic.classList.add('far');
            ic.style.color = '';
        }
        btn.classList.remove('active');
        if (typeof showToast === 'function') showToast('🗑️ تم الحذف من المفضلة', 'error');
    } else {
        wishlist.push({ id: id || '', title, name: title, cartName, price, img, cat });
        if (ic) {
            ic.classList.remove('far');
            ic.classList.add('fas');
            ic.style.color = 'var(--red)';
        }
        btn.classList.add('active');
        if (typeof showToast === 'function') showToast('❤️ تمت الإضافة للمفضلة', 'info');
    }

    saveWishlist();
    updateWishlistCount();
}

/**
 * Direct Toggle (Used in Search Modal / Direct buttons)
 */
function toggleWishDirect(btn, id, name, price, img, cat) {
    let index = wishlist.findIndex(i => (id && i.id == id) || (!id && i && (i.title === name || i.name === name)));
    if (index > -1) {
        wishlist.splice(index, 1);
        if (btn) {
            btn.innerHTML = '<i class="far fa-heart me-1"></i> مفضلة';
            btn.classList.replace('btn-danger', 'btn-outline-danger');
        }
        if (typeof showToast === 'function') showToast('تم الحذف من المفضلة', 'error');
    } else {
        wishlist.push({ id: id || '', title: name, name, cartName: name, price: parseFloat(price) || 0, img: img || '', cat: cat || '' });
        if (btn) {
            btn.innerHTML = '<i class="fas fa-heart me-1"></i> مفضلة';
            btn.classList.replace('btn-outline-danger', 'btn-danger');
        }
        if (typeof showToast === 'function') showToast('تم إضافة المنتج للمفضلة', 'info');
    }

    saveWishlist();
    updateWishlistCount();
}

function saveWishlist() {
    localStorage.setItem('moharram_wishlist', JSON.stringify(wishlist));
}

function updateWishlistCount() {
    const validWishlist = wishlist.filter(it => it && (it.title || it.name));
    document.querySelectorAll('#wishlist-counter').forEach(wCount => {
        wCount.textContent = validWishlist.length;
        wCount.style.display = validWishlist.length ? 'flex' : 'none';
    });
}

// Sync Wishlist Button States on Load
document.addEventListener('DOMContentLoaded', () => {
    updateWishlistCount();
    document.querySelectorAll('.product-card').forEach(card => {
        const titleEl = card.querySelector('.product-title');
        if (!titleEl) return;
        const name = titleEl.innerText.trim();
        const cardId = card.dataset.id;
        if (wishlist.some(i => i && ((i.id && i.id == cardId) || (!i.id && (i.title === name || i.name === name))))) {
            const btn = card.querySelector('.wishlist-btn');
            if (btn) {
                const ic = btn.querySelector('i');
                if (ic) {
                    ic.classList.remove('far');
                    ic.classList.add('fas');
                    ic.style.color = 'var(--red)';
                }
                btn.classList.add('active');
            }
        }
    });
});

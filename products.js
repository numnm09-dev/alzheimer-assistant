// ===== SUPABASE DYNAMIC PRODUCTS & SEARCH (OWASP A05, A09, A10) =====

let allProducts = [];
let allCategories = [];
let sbClient = null;
let searchModalInstance = null;

/**
 * Load store categories and products from Supabase
 */
async function loadStoreData() {
    const wrapper = document.getElementById('products-dynamic-wrapper');
    try {
        if (typeof supabase === 'undefined' || typeof SUPABASE_URL === 'undefined') {
            if (wrapper) {
                wrapper.innerHTML = '<div class="alert alert-warning text-center py-4">عذراً، يتعذر الاتصال بالخادم حالياً. يرجى إعادة المحاولة لاحقاً.</div>';
            }
            return;
        }

        // Initialize Supabase Client once
        if (!sbClient) {
            sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // REALTIME: Instant UI update on DB changes
            sbClient.channel('store-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
                    const { data: newProds } = await sbClient
                        .from('products')
                        .select('*, categories(name, emoji, slug)')
                        .order('id', { ascending: true });
                    if (newProds) allProducts = newProds;
                    renderDynamicProducts();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, async () => {
                    const { data: newCats } = await sbClient
                        .from('categories')
                        .select('*')
                        .order('sort_order', { ascending: true })
                        .order('id', { ascending: true });
                    if (newCats) allCategories = newCats;
                    renderDynamicProducts();
                })
                .subscribe();
        }

        // Fetch categories
        const { data: catData, error: catErr } = await sbClient
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('id', { ascending: true });

        if (catErr) throw catErr;
        if (catData) allCategories = catData;

        // Fetch products
        const { data: prodData, error: prodErr } = await sbClient
            .from('products')
            .select('*, categories(name, emoji, slug)')
            .order('id', { ascending: true });

        if (prodErr) throw prodErr;
        if (prodData) allProducts = prodData;

        renderDynamicProducts();

    } catch (err) {
        // OWASP A10: Generic Error Handling (No Sensitive Stack Traces Exposed to User)
        if (wrapper) {
            wrapper.innerHTML = '<div class="alert alert-warning text-center py-4">عذراً، حدث خطأ أثناء تحميل المنتجات. يرجى تنشيط الصفحة.</div>';
        }
    }
}

/**
 * Render dynamic category tabs & product grid
 */
function renderDynamicProducts() {
    const wrapper = document.getElementById('products-dynamic-wrapper');
    if (!wrapper) return;

    const activeProducts = allProducts.filter(p => p.is_active !== false);
    if (!activeProducts.length) {
        wrapper.innerHTML = '<div class="text-center py-5"><p class="text-muted fw-bold">لا توجد منتجات متاحة حالياً.</p></div>';
        return;
    }

    wrapper.innerHTML = '';

    // Filter Tabs Container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'container py-4';
    tabsContainer.id = 'products-tabs';

    const tabsRow = document.createElement('div');
    tabsRow.className = 'd-flex justify-content-center flex-wrap gap-2';

    const allBtn = document.createElement('button');
    allBtn.className = 'filter-tab active bg-brown-dark text-white';
    allBtn.textContent = 'الكل';
    allBtn.onclick = function () { filterCat('all', this); };
    tabsRow.appendChild(allBtn);

    allCategories.forEach(cat => {
        const catProds = activeProducts.filter(p => p.category_id === cat.id);
        if (!catProds.length) return;

        const btn = document.createElement('button');
        btn.className = 'filter-tab';
        // XSS safe content
        const emoji = escapeHTML(cat.emoji || '');
        const name = escapeHTML(cat.slug || cat.name);
        btn.textContent = (emoji ? emoji + ' ' : '') + name;
        btn.onclick = function () { filterCat(cat.slug, this); };
        tabsRow.appendChild(btn);
    });

    tabsContainer.appendChild(tabsRow);
    wrapper.appendChild(tabsContainer);

    // Category Sections & Cards
    allCategories.forEach(cat => {
        const catProds = activeProducts.filter(p => p.category_id === cat.id);
        if (!catProds.length) return;

        const header = document.createElement('div');
        header.className = 'section-header d-flex align-items-center gap-3 mt-5 mb-4';
        header.dataset.cat = escapeHTML(cat.slug);

        const safeEmoji = escapeHTML(cat.emoji || '');
        const safeName = escapeHTML(cat.name);
        header.innerHTML = `<h2 class="section-title">${safeEmoji} ${safeName}</h2><div class="section-line"></div>`;
        wrapper.appendChild(header);

        const row = document.createElement('div');
        row.className = 'row g-4';
        catProds.forEach((p, idx) => {
            row.appendChild(buildProductCard(p, cat.slug, idx));
        });
        wrapper.appendChild(row);
    });

    if (typeof AOS !== 'undefined') AOS.refresh();
}

/**
 * Safely Construct a Product Card (OWASP A05 Protection)
 */
function buildProductCard(p, dataCat, index) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-3 product-card-container';
    col.dataset.cat = escapeHTML(dataCat);

    const isOffer = p.badge_type === 'offer';
    const isFeatured = p.badge_type === 'featured';

    const card = document.createElement('div');
    card.className = 'card h-100 product-card ' + (isOffer ? 'border-2 border-danger' : 'border-0');
    card.dataset.id = escapeHTML(String(p.id));
    col.appendChild(card);

    // Badge Element
    if (isFeatured || isOffer) {
        const badge = document.createElement('div');
        badge.className = isFeatured ? 'highlight-badge' : 'discount-tag';
        badge.textContent = p.badge || (isFeatured ? 'مميز' : 'عرض');
        card.appendChild(badge);
    }

    // Image Container
    const imgWrap = document.createElement('div');
    imgWrap.className = 'product-image';
    const fallback = (p.categories && p.categories.emoji) ? escapeHTML(p.categories.emoji) : '🍯';

    if (p.image_url) {
        const img = document.createElement('img');
        img.src = p.image_url;
        img.alt = p.name;
        img.onerror = function () {
            imgWrap.innerHTML = `<span class="ph-icon">${fallback}</span>`;
        };
        imgWrap.appendChild(img);
    } else {
        imgWrap.innerHTML = `<span class="ph-icon">${fallback}</span>`;
    }
    card.appendChild(imgWrap);

    // Body Container
    const body = document.createElement('div');
    body.className = 'card-body product-body d-flex flex-column';

    const catLabelEl = document.createElement('div');
    catLabelEl.className = 'product-category';
    catLabelEl.textContent = p.cat_label || (p.categories && p.categories.name) || 'منتج';
    body.appendChild(catLabelEl);

    const titleEl = document.createElement('h3');
    titleEl.className = 'product-title';
    titleEl.textContent = p.name;
    body.appendChild(titleEl);

    const descEl = document.createElement('p');
    descEl.className = 'product-desc flex-grow-1 pt-3';
    descEl.textContent = p.description || '';
    body.appendChild(descEl);

    // Price Row
    const priceRow = document.createElement('div');
    priceRow.className = 'product-price-row';
    const safePrice = Number(p.price || 0).toLocaleString();

    if (p.old_price) {
        const safeOldPrice = Number(p.old_price).toLocaleString();
        priceRow.innerHTML = `<span class="old-price">${safeOldPrice} ج.م</span><span class="product-price text-danger">${safePrice} ج.م</span>`;
    } else {
        const safeUnit = p.unit ? escapeHTML(p.unit) : '';
        priceRow.innerHTML = `<span class="product-price">${safePrice} ج.م</span>${safeUnit ? `<span class="price-unit">/ ${safeUnit}</span>` : ''}`;
    }
    body.appendChild(priceRow);

    // Action Buttons
    const btns = document.createElement('div');
    btns.className = 'd-flex gap-2 mt-auto';

    const cartBtn = document.createElement('button');
    cartBtn.className = 'add-to-cart-btn';
    cartBtn.innerHTML = '<i class="fas fa-cart-plus me-1"></i> أضف للسلة';
    cartBtn.onclick = function () {
        if (typeof addToCart === 'function') {
            addToCart(p.id, p.name, p.price);
        }
    };
    btns.appendChild(cartBtn);

    const wishBtn = document.createElement('button');
    wishBtn.className = 'wishlist-btn';
    wishBtn.innerHTML = '<i class="far fa-heart"></i>';
    wishBtn.onclick = function () {
        if (typeof toggleWish === 'function') {
            toggleWish(this, p.id);
        }
    };
    btns.appendChild(wishBtn);

    body.appendChild(btns);
    card.appendChild(body);

    return col;
}

/**
 * Filter Tab Click Handling
 */
function filterCat(cat, btn) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active', 'bg-brown-dark', 'text-white'));
    if (btn) btn.classList.add('active', 'bg-brown-dark', 'text-white');

    document.querySelectorAll('.product-card-container').forEach(c => {
        const show = (cat === 'all' || c.dataset.cat === cat);
        c.classList.toggle('d-none', !show);
    });

    document.querySelectorAll('.section-header').forEach(h => {
        const show = (cat === 'all' || h.dataset.cat === cat);
        h.classList.toggle('d-none', !show);
        h.classList.toggle('d-flex', show);
    });

    setTimeout(() => {
        if (typeof AOS !== 'undefined') AOS.refresh();
    }, 100);
}

/**
 * Search Modal Controls (OWASP A05 Sanitized Search)
 */
function openSearchModal() {
    const modalEl = document.getElementById('searchModal');
    if (!modalEl) return;
    if (!searchModalInstance && typeof bootstrap !== 'undefined') {
        searchModalInstance = new bootstrap.Modal(modalEl);
    }
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        input.onkeyup = performSearch;
    }
    const resBox = document.getElementById('searchResults');
    if (resBox) resBox.innerHTML = '<div class="text-center text-muted py-4">اكتب اسم المنتج للبحث</div>';

    if (searchModalInstance) searchModalInstance.show();
    setTimeout(() => { if (input) input.focus(); }, 400);
}

function performSearch() {
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    if (!input || !resultsContainer) return;

    const q = input.value.trim().toLowerCase();
    if (!q) {
        resultsContainer.innerHTML = '<div class="text-center text-muted py-4">اكتب اسم المنتج للبحث</div>';
        return;
    }

    const activeProducts = allProducts.filter(p => p.is_active !== false);
    const matches = activeProducts.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );

    if (!matches.length) {
        resultsContainer.innerHTML = '<div class="text-center text-muted py-4">لم يتم العثور على منتجات مطابقة</div>';
        return;
    }

    resultsContainer.innerHTML = '';
    matches.forEach(p => {
        const cardCol = document.createElement('div');
        cardCol.className = 'col-12';

        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'd-flex align-items-center bg-white p-3 rounded-4 shadow-sm border search-result-card';

        const imgDiv = document.createElement('div');
        if (p.image_url) {
            imgDiv.innerHTML = `<img src="${p.image_url}" class="rounded object-fit-cover shadow-sm border" style="width: 80px; height: 80px;" alt="${escapeHTML(p.name)}">`;
        } else {
            imgDiv.innerHTML = `<div class="rounded bg-light d-flex align-items-center justify-content-center shadow-sm border" style="width:80px; height:80px; font-size:24px;">🍯</div>`;
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-grow-1 mx-3';

        const titleH6 = document.createElement('h6');
        titleH6.className = 'mb-1 fw-bold text-brown-dark';
        titleH6.style.fontSize = '15px';
        titleH6.textContent = p.name;

        const priceDiv = document.createElement('div');
        priceDiv.className = 'text-brown-mid fw-bold mb-1';
        priceDiv.textContent = `${Number(p.price || 0).toLocaleString()} ج.م`;

        infoDiv.appendChild(titleH6);
        infoDiv.appendChild(priceDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'd-flex flex-column gap-2';

        const cartBtn = document.createElement('button');
        cartBtn.className = 'btn btn-sm btn-primary rounded-pill px-3 fw-bold shadow-sm';
        cartBtn.innerHTML = '<i class="fas fa-cart-plus me-1"></i> سلة';
        cartBtn.onclick = function () {
            if (typeof addToCart === 'function') {
                addToCart(p.id, p.name, p.price);
            }
            if (searchModalInstance) searchModalInstance.hide();
            if (typeof openCart === 'function') openCart();
        };

        actionsDiv.appendChild(cartBtn);
        wrapperDiv.appendChild(imgDiv);
        wrapperDiv.appendChild(infoDiv);
        wrapperDiv.appendChild(actionsDiv);
        cardCol.appendChild(wrapperDiv);

        resultsContainer.appendChild(cardCol);
    });
}

// Auto Load Store Data on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    loadStoreData();
});

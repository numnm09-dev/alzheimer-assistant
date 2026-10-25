// ===== UI UTILITIES & SECURITY HELPERS =====

/**
 * XSS Sanitization Helper (OWASP A05: Injection Prevention)
 * Escapes unsafe HTML characters to prevent XSS attacks when inserting user-controlled strings.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Toast Notification System (OWASP A10: Generic Error Messages)
 */
let toastTimeout;
function showToast(msg, type = 'success') {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.innerHTML = `<i class="fas fa-check-circle"></i><span id="toast-msg"></span>`;
        document.body.appendChild(t);
    }

    const icon = t.querySelector('i');
    const msgEl = document.getElementById('toast-msg');

    t.classList.remove('toast-error', 'toast-info', 'toast-warn');

    if (type === 'error') {
        t.classList.add('toast-error');
        if (icon) icon.className = 'fas fa-times-circle';
    } else if (type === 'info') {
        t.classList.add('toast-info');
        if (icon) icon.className = 'fas fa-heart';
    } else if (type === 'warn') {
        t.classList.add('toast-warn');
        if (icon) icon.className = 'fas fa-exclamation-circle';
    } else {
        if (icon) icon.className = 'fas fa-check-circle';
    }

    if (msgEl) msgEl.textContent = msg;
    t.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        t.classList.remove('show');
    }, 2700);
}

/**
 * Mobile Navbar Toggle Controls
 */
function toggleMainNav() {
    const nav = document.getElementById('mainNav');
    const overlay = document.getElementById('mobileNavOverlay');
    const toggle = document.querySelector('.navbar-toggler');
    if (!nav || !toggle) return;

    const isOpen = nav.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open', isOpen);
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');

    const icon = toggle.querySelector('span');
    if (icon) icon.className = isOpen ? 'fas fa-times' : 'navbar-toggler-icon';
}

function closeMainNav() {
    const nav = document.getElementById('mainNav');
    const overlay = document.getElementById('mobileNavOverlay');
    const toggle = document.querySelector('.navbar-toggler');
    if (!nav || !toggle) return;

    nav.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'فتح القائمة');

    const icon = toggle.querySelector('span');
    if (icon) icon.className = 'navbar-toggler-icon';
}

/**
 * Floating Social Widget Toggle
 */
function toggleSocial() {
    const links = document.getElementById('social-links');
    const btn = document.getElementById('social-toggle-btn');
    if (links) links.classList.toggle('open');
    if (btn) btn.classList.toggle('active');
}

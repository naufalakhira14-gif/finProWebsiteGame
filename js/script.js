/**
 * gameStoB — Main JavaScript
 * Mobile nav, search/category filters, purchase form validation (no regex)
 */

(function () {
  'use strict';

  var CART_KEY = 'gameStoB_cart';
  var TAX_RATE = 0.08;

  /* ---------- Cart (localStorage) ---------- */
  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
    return [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function slugFromTitle(title) {
    var s = '';
    var i;
    var c;
    for (i = 0; i < title.length; i++) {
      c = title.charAt(i).toLowerCase();
      if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
        s += c;
      } else if (c === ' ' || c === '-') {
        if (s.length > 0 && s.charAt(s.length - 1) !== '-') s += '-';
      }
    }
    while (s.length > 0 && s.charAt(s.length - 1) === '-') {
      s = s.substring(0, s.length - 1);
    }
    return s || 'game-item';
  }

  function parsePrice(text) {
    var num = '';
    var i;
    var c;
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if ((c >= '0' && c <= '9') || c === '.') num += c;
    }
    return parseFloat(num) || 0;
  }

  function formatMoney(amount) {
    return '$' + amount.toFixed(2);
  }

  function getPurchaseUrl() {
    var scripts = document.getElementsByTagName('script');
    var i;
    for (i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('script.js') !== -1) {
        if (src.indexOf('../') === 0) return 'purchase.html';
        return 'pages/purchase.html';
      }
    }
    return 'pages/purchase.html';
  }

  function resolveImagePath(src) {
    if (!src) return '../assets/images/placeholder.svg';
    if (src.indexOf('http') === 0 || src.indexOf('data:') === 0) return src;
    var path = window.location.pathname;
    var inPages = path.indexOf('/pages/') !== -1 || path.indexOf('\\pages\\') !== -1;
    if (inPages && src.indexOf('../') !== 0) return '../' + src.replace(/^\.\//, '');
    if (!inPages && src.indexOf('../') === 0) return src.substring(3);
    return src;
  }

  function getCartCount(cart) {
    var total = 0;
    var i;
    cart = cart || getCart();
    for (i = 0; i < cart.length; i++) total += cart[i].qty;
    return total;
  }

  function updateCartBadge() {
    var count = getCartCount();
    document.querySelectorAll('.cart-badge').forEach(function (badge) {
      badge.setAttribute('data-count', String(count));
    });
  }

  function findCartItem(cart, id) {
    var i;
    for (i = 0; i < cart.length; i++) {
      if (cart[i].id === id) return i;
    }
    return -1;
  }

  function addToCart(item, qty) {
    qty = qty || 1;
    var cart = getCart();
    var idx = findCartItem(cart, item.id);
    if (idx >= 0) {
      cart[idx].qty += qty;
    } else {
      cart.push({
        id: item.id,
        title: item.title,
        price: item.price,
        image: item.image,
        qty: qty
      });
    }
    saveCart(cart);
  }

  function setCartSingle(item) {
    saveCart([{
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
      qty: 1
    }]);
  }

  function decreaseCartItem(id) {
    var cart = getCart();
    var idx = findCartItem(cart, id);
    if (idx < 0) return;
    cart[idx].qty -= 1;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart(cart);
    renderCartPage();
  }

  function clearCart() {
    saveCart([]);
  }

  function showCartToast(message) {
    var toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-toast';
      toast.className = 'cart-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    window.setTimeout(function () {
      toast.classList.remove('visible');
    }, 2200);
  }

  function getItemFromCard(card) {
    var titleEl = card.querySelector('h3');
    var priceEl = card.querySelector('.game-price');
    var imgEl = card.querySelector('.game-card-image img');
    var title = titleEl ? titleEl.textContent.trim() : 'Unknown Game';
    var price = parseFloat(card.getAttribute('data-price')) || parsePrice(priceEl ? priceEl.textContent : '0');
    var image = imgEl ? imgEl.getAttribute('src') : 'assets/images/placeholder.svg';
    var id = card.getAttribute('data-id') || slugFromTitle(title);
    card.setAttribute('data-id', id);
    card.setAttribute('data-price', String(price));
    return { id: id, title: title, price: price, image: image };
  }

  function initGameCardButtons() {
    document.querySelectorAll('.game-card').forEach(function (card) {
      if (card.querySelector('.card-actions')) return;

      var body = card.querySelector('.game-card-body');
      if (!body) return;

      var actions = document.createElement('div');
      actions.className = 'card-actions';

      var btnCart = document.createElement('button');
      btnCart.type = 'button';
      btnCart.className = 'btn btn-cart';
      btnCart.textContent = 'Add to Cart';

      var btnBuy = document.createElement('button');
      btnBuy.type = 'button';
      btnBuy.className = 'btn btn-buy';
      btnBuy.textContent = 'Buy Now';

      btnCart.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var item = getItemFromCard(card);
        addToCart(item, 1);
        showCartToast(item.title + ' added to cart');
      });

      btnBuy.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var item = getItemFromCard(card);
        setCartSingle(item);
        window.location.href = getPurchaseUrl();
      });

      actions.appendChild(btnCart);
      actions.appendChild(btnBuy);
      body.appendChild(actions);
    });
  }

  function renderCartPage() {
    var list = document.getElementById('cart-items-list');
    if (!list) return;

    var cart = getCart();
    var subtotalEl = document.getElementById('cart-subtotal');
    var taxEl = document.getElementById('cart-tax');
    var totalEl = document.getElementById('cart-total');
    var inPages = window.location.pathname.indexOf('/pages/') !== -1 || window.location.pathname.indexOf('\\pages\\') !== -1;
    var productsUrl = inPages ? 'products.html' : 'pages/products.html';

    list.innerHTML = '';

    if (cart.length === 0) {
      list.innerHTML = '<p class="cart-empty">Your cart is empty. <a href="' + productsUrl + '">Browse games</a></p>';
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      if (taxEl) taxEl.textContent = '$0.00';
      if (totalEl) totalEl.textContent = '$0.00';
      return;
    }

    var subtotal = 0;
    var i;

    for (i = 0; i < cart.length; i++) {
      var item = cart[i];
      var lineTotal = item.price * item.qty;
      subtotal += lineTotal;

      var row = document.createElement('div');
      row.className = 'cart-line-item';
      row.setAttribute('data-id', item.id);

      var img = document.createElement('img');
      img.src = resolveImagePath(item.image);
      img.alt = item.title;
      img.width = 64;
      img.height = 80;

      var details = document.createElement('div');
      details.className = 'cart-line-details';

      var h3 = document.createElement('h3');
      h3.textContent = item.title;

      var linePrice = document.createElement('p');
      linePrice.className = 'line-price';
      linePrice.textContent = formatMoney(item.price) + ' × ' + item.qty + ' = ' + formatMoney(lineTotal);

      var controls = document.createElement('div');
      controls.className = 'cart-qty-controls';

      var minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'qty-btn';
      minusBtn.setAttribute('aria-label', 'Reduce quantity');
      minusBtn.textContent = '−';
      minusBtn.addEventListener('click', function () {
        decreaseCartItem(item.id);
      });

      var qtySpan = document.createElement('span');
      qtySpan.className = 'cart-qty-value';
      qtySpan.textContent = String(item.qty);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'qty-btn remove-btn';
      removeBtn.setAttribute('aria-label', 'Remove item');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () {
        var c = getCart();
        var idx = findCartItem(c, item.id);
        if (idx >= 0) {
          c.splice(idx, 1);
          saveCart(c);
          renderCartPage();
        }
      });

      controls.appendChild(minusBtn);
      controls.appendChild(qtySpan);
      controls.appendChild(removeBtn);

      details.appendChild(h3);
      details.appendChild(linePrice);
      details.appendChild(controls);

      row.appendChild(img);
      row.appendChild(details);
      list.appendChild(row);
    }

    var tax = subtotal * TAX_RATE;
    var total = subtotal + tax;

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (taxEl) taxEl.textContent = formatMoney(tax);
    if (totalEl) totalEl.textContent = formatMoney(total);
  }

  /* ---------- Mobile navbar toggle ---------- */
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      nav.classList.toggle('open');
      var expanded = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('open');
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        toggle.classList.remove('open');
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Active nav link ---------- */
  function setActiveNav() {
    var path = window.location.pathname;
    var file = path.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var linkFile = href.split('/').pop();
      if (file === 'index.html' && (linkFile === 'index.html' || href === '/' || href === '../index.html' || href === './')) {
        a.classList.add('active');
      } else if (linkFile === file) {
        a.classList.add('active');
      }
    });
  }

  /* ---------- Products: search + category filter ---------- */
  function initProductFilters() {
    var grid = document.getElementById('products-grid');
    if (!grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.game-card'));
    var searchInput = document.getElementById('product-search');
    var sortSelect = document.getElementById('sort-select');
    var filterBtns = document.querySelectorAll('.filter-btn');
    var noResults = document.getElementById('no-results');
    var activeCategory = 'all';

    function getCardText(card) {
      var title = card.querySelector('h3');
      var genre = card.querySelector('.genre');
      return ((title ? title.textContent : '') + ' ' + (genre ? genre.textContent : '')).toLowerCase();
    }

    function applyFilters() {
      var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
      var visible = 0;

      cards.forEach(function (card) {
        var category = card.getAttribute('data-category') || '';
        var text = getCardText(card);
        var matchCategory = activeCategory === 'all' || category === activeCategory;
        var matchSearch = !query || text.indexOf(query) !== -1;
        var show = matchCategory && matchSearch;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      if (noResults) {
        noResults.classList.toggle('visible', visible === 0);
      }
    }

    function sortCards() {
      if (!sortSelect) return;
      var value = sortSelect.value;
      var sorted = cards.slice().filter(function (c) {
        return c.parentNode === grid;
      });

      sorted.sort(function (a, b) {
        var priceA = parseFloat(a.getAttribute('data-price') || '0');
        var priceB = parseFloat(b.getAttribute('data-price') || '0');
        var titleA = (a.querySelector('h3') || {}).textContent || '';
        var titleB = (b.querySelector('h3') || {}).textContent || '';
        if (value === 'price-low') return priceA - priceB;
        if (value === 'price-high') return priceB - priceA;
        if (value === 'name') return titleA.localeCompare(titleB);
        return 0;
      });

      sorted.forEach(function (card) {
        grid.appendChild(card);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-filter') || 'all';
        applyFilters();
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        sortCards();
        applyFilters();
      });
    }
  }

  /* ---------- Form validation helpers (no regex) ---------- */
  function isEmpty(str) {
    var i;
    var len = str.length;
    for (i = 0; i < len; i++) {
      if (str.charAt(i) !== ' ' && str.charAt(i) !== '\t' && str.charAt(i) !== '\n') {
        return false;
      }
    }
    return true;
  }

  function trimString(str) {
    var start = 0;
    var end = str.length - 1;
    while (start <= end && (str.charAt(start) === ' ' || str.charAt(start) === '\t')) {
      start++;
    }
    while (end >= start && (str.charAt(end) === ' ' || str.charAt(end) === '\t')) {
      end--;
    }
    return str.substring(start, end + 1);
  }

  function validateEmail(email) {
    if (isEmpty(email)) return false;
    var hasAt = false;
    var hasDot = false;
    var i;
    for (i = 0; i < email.length; i++) {
      if (email.charAt(i) === '@') hasAt = true;
      if (email.charAt(i) === '.') hasDot = true;
    }
    return hasAt && hasDot;
  }

  function isDigitsOnly(str) {
    var i;
    if (str.length === 0) return false;
    for (i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (c < '0' || c > '9') return false;
    }
    return true;
  }

  function stripSpaces(str) {
    var result = '';
    var i;
    for (i = 0; i < str.length; i++) {
      if (str.charAt(i) !== ' ') {
        result += str.charAt(i);
      }
    }
    return result;
  }

  function showError(input, message) {
    var group = input.closest('.form-group') || input.closest('.checkbox-group');
    if (!group) return;
    var err = group.querySelector('.error-msg');
    if (err) err.textContent = message;
    if (input.classList) input.classList.add('error');
  }

  function clearError(input) {
    var group = input.closest('.form-group') || input.closest('.checkbox-group');
    if (!group) return;
    var err = group.querySelector('.error-msg');
    if (err) err.textContent = '';
    if (input.classList) input.classList.remove('error');
  }

  function initPurchaseForm() {
    var form = document.getElementById('purchase-form');
    if (!form) return;

    var popup = document.getElementById('success-popup');
    var popupClose = document.getElementById('popup-close');

    var fields = {
      fullName: document.getElementById('fullName'),
      email: document.getElementById('email'),
      cardNumber: document.getElementById('cardNumber'),
      expiration: document.getElementById('expiration'),
      cvv: document.getElementById('cvv'),
      country: document.getElementById('country'),
      terms: document.getElementById('terms')
    };

    Object.keys(fields).forEach(function (key) {
      var el = fields[key];
      if (!el) return;
      el.addEventListener('input', function () {
        clearError(el);
      });
      el.addEventListener('change', function () {
        clearError(el);
      });
    });

    if (popupClose && popup) {
      popupClose.addEventListener('click', function () {
        popup.classList.remove('visible');
      });
      popup.addEventListener('click', function (e) {
        if (e.target === popup) popup.classList.remove('visible');
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      if (getCart().length === 0) {
        showCartToast('Your cart is empty. Add games before checkout.');
        return;
      }

      Object.keys(fields).forEach(function (key) {
        if (fields[key]) clearError(fields[key]);
      });

      var nameVal = fields.fullName ? trimString(fields.fullName.value) : '';
      if (isEmpty(nameVal)) {
        showError(fields.fullName, 'Full name cannot be empty.');
        valid = false;
      }

      var emailVal = fields.email ? trimString(fields.email.value) : '';
      if (!validateEmail(emailVal)) {
        showError(fields.email, "Email must contain '@' and '.'.");
        valid = false;
      }

      var cardVal = fields.cardNumber ? stripSpaces(fields.cardNumber.value) : '';
      if (!isDigitsOnly(cardVal) || cardVal.length !== 16) {
        showError(fields.cardNumber, 'Card number must be exactly 16 digits.');
        valid = false;
      }

      var cvvVal = fields.cvv ? trimString(fields.cvv.value) : '';
      if (!isDigitsOnly(cvvVal) || cvvVal.length !== 3) {
        showError(fields.cvv, 'CVV must be exactly 3 digits.');
        valid = false;
      }

      if (fields.terms && !fields.terms.checked) {
        showError(fields.terms, 'You must agree to the Terms and Conditions.');
        valid = false;
      }

      if (!valid) return;

      if (popup) {
        popup.classList.add('visible');
      }
      clearCart();
      renderCartPage();
      form.reset();
    });
  }

  /* ---------- Wishlist toggle (UX feedback) ---------- */
  function initWishlist() {
    document.querySelectorAll('.wishlist-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        btn.classList.toggle('active');
        btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNav();
    setActiveNav();
    initGameCardButtons();
    updateCartBadge();
    renderCartPage();
    initProductFilters();
    initPurchaseForm();
    initWishlist();
  });
})();

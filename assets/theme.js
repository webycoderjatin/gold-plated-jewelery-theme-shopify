/* Theme JavaScript */
(function () {
  'use strict';

  const CartDrawer = {
    drawer: null,
    body: null,
    footer: null,

    init() {
      this.drawer = document.getElementById('cartDrawer');
      if (!this.drawer) return;
      this.body = this.drawer.querySelector('[data-cart-items]');
      this.footer = this.drawer.querySelector('[data-cart-footer]');

      document.querySelectorAll('[data-cart-open]').forEach(btn => {
        btn.addEventListener('click', () => this.open());
      });
      this.drawer.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());
      document.addEventListener('click', e => {
        if (e.target.matches('[data-cart-overlay]')) this.close();
      });
      this.fetchCart();
    },

    async fetchCart() {
      try {
        const res = await fetch('/cart.js');
        const cart = await res.json();
        this.updateCount(cart.item_count);
        this.renderItems(cart);
      } catch (e) {
        console.warn('Cart fetch error:', e);
      }
    },

    updateCount(count) {
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count;
        el.hidden = count < 1;
      });
    },

    open() {
      this.drawer?.classList.add('is-open');
      document.body.classList.add('cart-open');
    },

    close() {
      this.drawer?.classList.remove('is-open');
      document.body.classList.remove('cart-open');
    },

    formatMoney(cents) {
      const amount = (Number(cents) / 100).toFixed(2);
      const currency = window.Shopify?.currency?.active || 'USD';
      try {
        return new Intl.NumberFormat(document.documentElement.lang || undefined, {
          style: 'currency',
          currency
        }).format(Number(amount));
      } catch (e) {
        return amount;
      }
    },

    renderItems(cart) {
      if (!this.body) return;
      if (!cart.items.length) {
        this.body.innerHTML = '<p class="cart-empty">Your cart is currently empty.</p>';
        if (this.footer) this.footer.hidden = true;
        return;
      }

      this.body.innerHTML = cart.items.map(item => `
        <div class="cart-item" data-item-key="${item.key}">
          <a href="${item.url}">
            <img src="${item.image || ''}" alt="${item.title.replace(/"/g, '&quot;')}" class="cart-item__img" width="88" height="110" loading="lazy">
          </a>
          <div class="cart-item__details">
            <div>
              <p class="cart-item__name">${item.product_title}</p>
              ${item.variant_title && item.variant_title !== 'Default Title' ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
              <p class="cart-item__price">${this.formatMoney(item.final_line_price)}</p>
            </div>
            <div class="cart-item__actions">
              <div class="qty-selector">
                <button class="qty-btn" data-qty-change="-1" data-key="${item.key}" aria-label="Decrease quantity">−</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" data-qty-change="1" data-key="${item.key}" aria-label="Increase quantity">+</button>
              </div>
              <button class="cart-item__remove" data-remove-key="${item.key}" aria-label="Remove ${item.title.replace(/"/g, '&quot;')}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');

      if (this.footer) {
        this.footer.hidden = false;
        const subtotalEl = this.footer.querySelector('[data-cart-subtotal]');
        if (subtotalEl) subtotalEl.textContent = this.formatMoney(cart.total_price);
      }

      this.body.querySelectorAll('[data-qty-change]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.key;
          const delta = parseInt(btn.dataset.qtyChange, 10);
          const item = cart.items.find(i => i.key === key);
          if (item) await this.updateQuantity(key, item.quantity + delta);
        });
      });

      this.body.querySelectorAll('[data-remove-key]').forEach(btn => {
        btn.addEventListener('click', async () => this.updateQuantity(btn.dataset.removeKey, 0));
      });
    },

    async updateQuantity(key, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity })
        });
        if (!res.ok) throw new Error('Cart update failed');
        const cart = await res.json();
        this.updateCount(cart.item_count);
        this.renderItems(cart);
      } catch (e) {
        console.warn('Cart update error:', e);
      }
    },

    async addItem(variantId, quantity = 1, properties = {}) {
      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity, properties })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.description || 'Could not add to cart');
          return false;
        }
        await this.fetchCart();
        this.open();
        return true;
      } catch (e) {
        console.warn('Add to cart error:', e);
        return false;
      }
    }
  };

  const MobileNav = {
    init() {
      const hamburger = document.getElementById('hamburgerBtn');
      const nav = document.getElementById('headerNav');
      const overlay = document.getElementById('navOverlay');
      const close = document.getElementById('navClose');
      if (!hamburger || !nav) return;
      const toggle = open => {
        nav.classList.toggle('is-open', open);
        overlay?.classList.toggle('is-open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('nav-open', open);
      };
      hamburger.addEventListener('click', () => toggle(!nav.classList.contains('is-open')));
      close?.addEventListener('click', () => toggle(false));
      overlay?.addEventListener('click', () => toggle(false));
    }
  };

  const Search = {
    init() {
      const overlay = document.getElementById('searchOverlay');
      const close = document.getElementById('searchClose');
      document.querySelectorAll('[data-search-open]').forEach(btn => btn.addEventListener('click', () => overlay?.classList.add('is-open')));
      close?.addEventListener('click', () => overlay?.classList.remove('is-open'));
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') overlay?.classList.remove('is-open');
      });
    }
  };

  const ProductGallery = {
    init() {
      const mainImg = document.getElementById('productGalleryMain');
      const thumbs = document.querySelectorAll('[data-gallery-thumb]');
      if (!mainImg || !thumbs.length) return;
      thumbs.forEach(thumb => thumb.addEventListener('click', () => {
        mainImg.src = thumb.dataset.galleryThumb;
        mainImg.alt = thumb.alt;
        thumbs.forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      }));
    }
  };

  const VariantSelector = {
    init() {
      const form = document.getElementById('productForm');
      if (!form) return;
      const variantInput = form.querySelector('[name="id"]');
      const atcBtn = form.querySelector('[data-atc-btn]');
      const qtyInput = form.querySelector('[data-qty-input]');

      form.querySelectorAll('[data-variant-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
          const group = btn.dataset.variantGroup;
          form.querySelectorAll(`[data-variant-btn][data-variant-group="${group}"]`).forEach(b => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          this.updateVariant(form, variantInput, atcBtn);
        });
      });

      form.querySelector('[data-qty-dec]')?.addEventListener('click', () => {
        const value = parseInt(qtyInput?.value, 10) || 1;
        if (qtyInput && value > 1) qtyInput.value = value - 1;
      });
      form.querySelector('[data-qty-inc]')?.addEventListener('click', () => {
        const value = parseInt(qtyInput?.value, 10) || 1;
        if (qtyInput) qtyInput.value = value + 1;
      });

      form.addEventListener('submit', async e => {
        // Let Shopify's accelerated checkout button submit normally.
        if (e.submitter && e.submitter !== atcBtn) return;
        e.preventDefault();
        const variantId = variantInput?.value;
        const qty = parseInt(qtyInput?.value, 10) || 1;
        if (!variantId || !atcBtn) return;
        atcBtn.disabled = true;
        atcBtn.textContent = 'Adding...';
        await CartDrawer.addItem(variantId, qty);
        atcBtn.disabled = false;
        atcBtn.textContent = atcBtn.dataset.label || 'Add to Cart';
      });
    },

    updateVariant(form, variantInput, atcBtn) {
      const selections = {};
      form.querySelectorAll('[data-variant-btn].is-selected').forEach(btn => {
        selections[btn.dataset.variantGroup] = btn.dataset.variantValue;
      });
      const variantsData = form.dataset.variants;
      if (!variantsData) return;
      try {
        const variants = JSON.parse(variantsData);
        const match = variants.find(v => Object.keys(selections).every(group => {
          const position = group.replace('option', '');
          return v[`option${position}`] === selections[group];
        }));
        if (!match) {
          if (atcBtn) { atcBtn.disabled = true; atcBtn.textContent = 'Unavailable'; }
          return;
        }
        if (variantInput) variantInput.value = match.id;
        if (atcBtn) {
          atcBtn.disabled = !match.available;
          atcBtn.textContent = match.available ? (atcBtn.dataset.label || 'Add to Cart') : 'Sold Out';
        }
        const priceEl = document.getElementById('productPrice');
        if (priceEl) priceEl.textContent = CartDrawer.formatMoney(match.price);
        const compareEl = document.getElementById('productComparePrice');
        if (compareEl) {
          if (match.compare_at_price && match.compare_at_price > match.price) {
            compareEl.textContent = CartDrawer.formatMoney(match.compare_at_price);
            compareEl.hidden = false;
          } else {
            compareEl.hidden = true;
          }
        }
      } catch (e) {
        console.warn('Variant parsing error:', e);
      }
    }
  };

  const Wishlist = {
    init() {
      document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.wishlistBtn;
          const key = 'wishlist';
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const index = list.indexOf(id);
          if (index >= 0) {
            list.splice(index, 1);
            btn.classList.remove('is-active');
          } else {
            list.push(id);
            btn.classList.add('is-active');
          }
          localStorage.setItem(key, JSON.stringify(list));
        });
      });
    }
  };

  const Accordions = {
    init() {
      document.querySelectorAll('.accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
          const item = trigger.closest('.accordion-item');
          const open = item.classList.toggle('is-open');
          trigger.setAttribute('aria-expanded', String(open));
        });
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    CartDrawer.init();
    MobileNav.init();
    Search.init();
    ProductGallery.init();
    VariantSelector.init();
    Wishlist.init();
    Accordions.init();
  });
})();

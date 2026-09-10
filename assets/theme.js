/* =============================================================================
   AURA LUXURY SHOPIFY THEME - JAVASCRIPT
   Minimal, dependency-free, vanilla JS
   ============================================================================= */

(function () {
  'use strict';

  /* =========================================================================
     CART DRAWER
     ========================================================================= */
  const CartDrawer = {
    overlay: null,
    drawer: null,
    countEls: [],

    init() {
      this.overlay = document.getElementById('cartOverlay');
      this.drawer  = document.getElementById('cartDrawer');
      this.countEls = document.querySelectorAll('[data-cart-count]');

      // Open triggers
      document.querySelectorAll('[data-cart-open]').forEach(btn => {
        btn.addEventListener('click', () => this.open());
      });

      // Close triggers
      document.querySelectorAll('[data-cart-close]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });

      if (this.overlay) {
        this.overlay.addEventListener('click', () => this.close());
      }

      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });

      this.fetchCart();
    },

    open() {
      if (this.overlay) this.overlay.classList.add('is-open');
      if (this.drawer)  this.drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      this.fetchCart();
    },

    close() {
      if (this.overlay) this.overlay.classList.remove('is-open');
      if (this.drawer)  this.drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    },

    async fetchCart() {
      try {
        const res  = await fetch('/cart.js');
        const cart = await res.json();
        this.updateCount(cart.item_count);
        this.renderItems(cart);
      } catch (e) {
        console.warn('Cart fetch error:', e);
      }
    },

    updateCount(count) {
      this.countEls.forEach(el => {
        el.textContent = count;
        el.hidden = count === 0;
      });
    },

    renderItems(cart) {
      const body = document.getElementById('cartDrawerBody');
      const footer = document.getElementById('cartDrawerFooter');
      if (!body) return;

      if (cart.item_count === 0) {
        body.innerHTML = `
          <div class="cart-drawer__empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <p>Your cart is currently empty.</p>
            <button class="btn btn-primary" data-cart-close>Continue Shopping</button>
          </div>`;
        if (footer) footer.hidden = true;
        // Re-bind close on newly rendered button
        body.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());
        return;
      }

      body.innerHTML = cart.items.map(item => `
        <div class="cart-item" data-item-key="${item.key}">
          <a href="${item.url}">
            <img src="${item.image ? item.image.replace('.jpg', '_88x110.jpg').replace('.png', '_88x110.png').replace('.webp', '_88x110.webp') : item.image}" alt="${item.title}" class="cart-item__img" width="88" height="110" loading="lazy">
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
              <button class="cart-item__remove" data-remove-key="${item.key}" aria-label="Remove ${item.title}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');

      if (footer) {
        footer.hidden = false;
        const subtotalEl = footer.querySelector('[data-cart-subtotal]');
        if (subtotalEl) subtotalEl.textContent = this.formatMoney(cart.total_price);
      }

      // Bind quantity buttons
      body.querySelectorAll('[data-qty-change]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const key   = btn.dataset.key;
          const delta = parseInt(btn.dataset.qtyChange);
          const item  = cart.items.find(i => i.key === key);
          if (!item) return;
          await this.updateQuantity(key, item.quantity + delta);
        });
      });

      // Bind remove buttons
      body.querySelectorAll('[data-remove-key]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await this.updateQuantity(btn.dataset.removeKey, 0);
        });
      });
    },

    formatMoney(cents) {
      const amount = (cents / 100).toFixed(2);
      return `$${amount}`;
    },

    async updateQuantity(key, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: key, quantity })
        });
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
        if (data.status === 422) {
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

  /* =========================================================================
     MOBILE NAVIGATION
     ========================================================================= */
  const MobileNav = {
    init() {
      const hamburger = document.getElementById('hamburgerBtn');
      const nav       = document.getElementById('headerNav');
      const overlay   = document.getElementById('navOverlay');
      const closeBtn  = document.getElementById('mobileNavClose');

      if (!hamburger || !nav) return;

      hamburger.addEventListener('click', () => this.open(nav, overlay, hamburger));
      if (closeBtn) closeBtn.addEventListener('click', () => this.close(nav, overlay, hamburger));
      if (overlay)  overlay.addEventListener('click', () => this.close(nav, overlay, hamburger));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close(nav, overlay, hamburger);
      });

      // Mobile expand/collapse nav items
      nav.querySelectorAll('.nav-item--has-sub').forEach(item => {
        const link = item.querySelector('.nav-link');
        if (!link) return;
        link.addEventListener('click', (e) => {
          if (window.innerWidth <= 1024) {
            e.preventDefault();
            item.classList.toggle('is-expanded');
          }
        });
      });
    },

    open(nav, overlay, btn) {
      nav.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    },

    close(nav, overlay, btn) {
      nav.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  };

  /* =========================================================================
     SEARCH OVERLAY
     ========================================================================= */
  const Search = {
    init() {
      const overlay = document.getElementById('searchOverlay');
      const closeBtn = document.getElementById('searchClose');

      document.querySelectorAll('[data-search-open]').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay?.classList.add('is-open');
          overlay?.querySelector('input')?.focus();
        });
      });

      closeBtn?.addEventListener('click', () => overlay?.classList.remove('is-open'));
      overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('is-open');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') overlay?.classList.remove('is-open');
      });
    }
  };

  /* =========================================================================
     PRODUCT GALLERY (Product Page)
     ========================================================================= */
  const ProductGallery = {
    init() {
      const mainImg  = document.getElementById('productGalleryMain');
      const thumbs   = document.querySelectorAll('[data-gallery-thumb]');
      if (!mainImg || !thumbs.length) return;

      thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
          mainImg.src = thumb.dataset.galleryThumb;
          mainImg.alt = thumb.alt;
          thumbs.forEach(t => t.classList.remove('is-active'));
          thumb.classList.add('is-active');
        });
      });
    }
  };

  /* =========================================================================
     VARIANT SELECTOR (Product Page)
     ========================================================================= */
  const VariantSelector = {
    init() {
      const form = document.getElementById('productForm');
      if (!form) return;

      const variantInput = form.querySelector('[name="id"]');
      const atcBtn       = form.querySelector('[data-atc-btn]');

      form.querySelectorAll('[data-variant-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
          const group = btn.dataset.variantGroup;
          form.querySelectorAll(`[data-variant-btn][data-variant-group="${group}"]`).forEach(b => {
            b.classList.remove('is-selected');
          });
          btn.classList.add('is-selected');
          this.updateVariant(form, variantInput, atcBtn);
        });
      });

      // Qty buttons
      const qtyInput = form.querySelector('[data-qty-input]');
      form.querySelector('[data-qty-dec]')?.addEventListener('click', () => {
        const v = parseInt(qtyInput.value) || 1;
        if (v > 1) qtyInput.value = v - 1;
      });
      form.querySelector('[data-qty-inc]')?.addEventListener('click', () => {
        const v = parseInt(qtyInput.value) || 1;
        qtyInput.value = v + 1;
      });

      // ATC
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const variantId = variantInput?.value;
        const qty       = parseInt(qtyInput?.value) || 1;
        if (!variantId) return;
        if (atcBtn) {
          atcBtn.disabled = true;
          atcBtn.textContent = 'Adding...';
        }
        const success = await CartDrawer.addItem(variantId, qty);
        if (atcBtn) {
          atcBtn.disabled = false;
          atcBtn.textContent = atcBtn.dataset.label || 'Add to Cart';
        }
      });
    },

    updateVariant(form, variantInput, atcBtn) {
      // Read all selected options
      const selections = {};
      form.querySelectorAll('[data-variant-btn].is-selected').forEach(btn => {
        selections[btn.dataset.variantGroup] = btn.dataset.variantValue;
      });

      // Find matching variant from JSON data
      const variantsData = form.dataset.variants;
      if (!variantsData) return;

      try {
        const variants = JSON.parse(variantsData);
        const match = variants.find(v => {
          return v.options.every((opt, i) => {
            const key = `option${i + 1}`;
            return !selections[key] || opt === selections[key];
          });
        });

        if (match) {
          if (variantInput) variantInput.value = match.id;
          if (atcBtn) {
            atcBtn.disabled = !match.available;
            atcBtn.textContent = match.available ? (atcBtn.dataset.label || 'Add to Cart') : 'Sold Out';
          }
          // Update price display
          const priceEl = document.getElementById('productPrice');
          if (priceEl && match.price) {
            priceEl.textContent = `$${(match.price / 100).toFixed(2)}`;
          }
        }
      } catch (e) {
        console.warn('Variant parse error:', e);
      }
    }
  };

  /* =========================================================================
     ACCORDIONS
     ========================================================================= */
  const Accordions = {
    init() {
      document.querySelectorAll('.accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
          const item = trigger.closest('.accordion-item');
          const wasOpen = item.classList.contains('is-open');

          // Close all in group (optional)
          const parent = item.parentElement;
          parent.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('is-open'));

          if (!wasOpen) item.classList.add('is-open');
        });
      });
    }
  };

  /* =========================================================================
     WISHLIST (localStorage)
     Note: This is a frontend-only implementation using localStorage.
     Replace with a Shopify wishlist app integration for production use.
     ========================================================================= */
  const Wishlist = {
    key: 'aura_wishlist',

    getItems() {
      try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
      catch { return []; }
    },

    toggle(productId) {
      const items = this.getItems();
      const idx   = items.indexOf(String(productId));
      if (idx >= 0) items.splice(idx, 1);
      else items.push(String(productId));
      localStorage.setItem(this.key, JSON.stringify(items));
      return idx < 0; // true if now wishlisted
    },

    has(productId) {
      return this.getItems().includes(String(productId));
    },

    init() {
      document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
        const pid = btn.dataset.wishlistBtn;
        if (this.has(pid)) btn.classList.add('is-wishlisted');

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const wishlisted = this.toggle(pid);
          btn.classList.toggle('is-wishlisted', wishlisted);
          btn.setAttribute('aria-label', wishlisted ? 'Remove from wishlist' : 'Add to wishlist');
        });
      });
    }
  };

  /* =========================================================================
     HOTSPOTS (Shop The Look)
     ========================================================================= */
  const Hotspots = {
    init() {
      document.querySelectorAll('.hotspot').forEach(hotspot => {
        hotspot.addEventListener('click', () => {
          const wasActive = hotspot.classList.contains('is-active');
          document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('is-active'));
          if (!wasActive) hotspot.classList.add('is-active');
        });
      });

      // Close hotspots on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.hotspot')) {
          document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('is-active'));
        }
      });
    }
  };

  /* =========================================================================
     CAROUSEL (product-carousel / reels-track)
     ========================================================================= */
  const Carousels = {
    init() {
      document.querySelectorAll('[data-carousel]').forEach(wrapper => {
        const track  = wrapper.querySelector('[data-carousel-track]');
        const prevBtn = wrapper.querySelector('[data-carousel-prev]');
        const nextBtn = wrapper.querySelector('[data-carousel-next]');
        if (!track) return;

        prevBtn?.addEventListener('click', () => {
          const itemWidth = track.querySelector('*')?.offsetWidth || 280;
          track.scrollBy({ left: -(itemWidth + 24), behavior: 'smooth' });
        });

        nextBtn?.addEventListener('click', () => {
          const itemWidth = track.querySelector('*')?.offsetWidth || 280;
          track.scrollBy({ left: (itemWidth + 24), behavior: 'smooth' });
        });
      });
    }
  };

  /* =========================================================================
     LAZY IMAGES
     ========================================================================= */
  const LazyImages = {
    init() {
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
              }
              obs.unobserve(img);
            }
          });
        }, { rootMargin: '200px' });

        document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
      }
    }
  };

  /* =========================================================================
     ANNOUNCEMENT BAR AUTO-ROTATE
     ========================================================================= */
  const AnnouncementBar = {
    init() {
      const bar   = document.querySelector('[data-announcement-bar]');
      const items = bar?.querySelectorAll('[data-announcement-item]');
      if (!items || items.length <= 1) return;

      let current = 0;
      const show = (index) => {
        items.forEach((item, i) => {
          item.style.display = i === index ? 'block' : 'none';
        });
      };

      show(0);
      setInterval(() => {
        current = (current + 1) % items.length;
        show(current);
      }, 4000);
    }
  };

  /* =========================================================================
     STICKY HEADER SHADOW
     ========================================================================= */
  const StickyHeader = {
    init() {
      const header = document.querySelector('.header-wrapper');
      if (!header) return;

      window.addEventListener('scroll', () => {
        header.classList.toggle('is-scrolled', window.scrollY > 10);
      }, { passive: true });
    }
  };

  /* =========================================================================
     QUICK ADD TO CART (from product cards)
     ========================================================================= */
  const QuickAdd = {
    init() {
      document.querySelectorAll('[data-quick-add]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const variantId = btn.dataset.quickAdd;
          if (!variantId) return;
          btn.disabled = true;
          btn.textContent = 'Adding...';
          await CartDrawer.addItem(variantId, 1);
          btn.disabled = false;
          btn.textContent = 'Add to Cart';
        });
      });
    }
  };

  /* =========================================================================
     NEWSLETTER FORM
     ========================================================================= */
  const Newsletter = {
    init() {
      document.querySelectorAll('[data-newsletter-form]').forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const input  = form.querySelector('input[type="email"]');
          const btn    = form.querySelector('button[type="submit"]');
          const msg    = form.querySelector('[data-newsletter-msg]');
          if (!input?.value) return;

          if (btn) btn.disabled = true;

          try {
            const formData = new FormData(form);
            const res = await fetch(form.action || '/contact#contact_form', {
              method: 'POST',
              headers: { 'Accept': 'application/json' },
              body: formData
            });
            if (res.ok && msg) {
              msg.textContent = 'Thanks for subscribing!';
              msg.style.display = 'block';
              input.value = '';
            }
          } catch {
            // silently fail
          }

          if (btn) btn.disabled = false;
        });
      });
    }
  };

  /* =========================================================================
     INIT ALL
     ========================================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    CartDrawer.init();
    MobileNav.init();
    Search.init();
    ProductGallery.init();
    VariantSelector.init();
    Accordions.init();
    Wishlist.init();
    Hotspots.init();
    Carousels.init();
    LazyImages.init();
    AnnouncementBar.init();
    StickyHeader.init();
    QuickAdd.init();
    Newsletter.init();
  });

  // Expose CartDrawer globally for Liquid usage
  window.AuraCartDrawer = CartDrawer;

})();

/* 
  Copyright (c) 2025 YB.MugBeans. All rights reserved.
  Author: Younes Boumlik
  Email: younes.q.boumlik@gmail.com
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Real Cart System (State Management) ---
    class CartState {
        constructor() {
            this.items = JSON.parse(localStorage.getItem('coffee-cart')) || [];
            this.subscribers = [];
        }

        subscribe(callback) {
            this.subscribers.push(callback);
        }

        notify() {
            this.subscribers.forEach(callback => callback(this.items));
            localStorage.setItem('coffee-cart', JSON.stringify(this.items));
        }

        addItem(product) {
            const existing = this.items.find(item => item.id === product.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                this.items.push({ ...product, quantity: 1 });
            }
            this.notify();
        }

        updateQuantity(productId, delta) {
            const item = this.items.find(item => item.id === productId);
            if (item) {
                item.quantity += delta;
                if (item.quantity <= 0) {
                    this.removeItem(productId);
                } else {
                    this.notify();
                }
            }
        }

        removeItem(productId) {
            this.items = this.items.filter(item => item.id !== productId);
            this.notify();
        }

        clearCart() {
            this.items = [];
            this.notify();
        }

        getTotal() {
            return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        }

        getCount() {
            return this.items.reduce((count, item) => count + item.quantity, 0);
        }
    }

    // --- 2. Product Data Management ---
    class ProductsAPI {
        async fetchProducts() {
            try {
                const response = await fetch('assets/products.json');
                if (!response.ok) throw new Error('Failed to load products');
                const products = await response.json();
                return products;
            } catch (error) {
                console.error('Failed to load products:', error);
                return [];
            }
        }
    }

    // --- 3. Enhanced Search & Filters ---
    class SearchManager {
        constructor() {
            this.filters = {
                roast: 'all',
                searchTerm: ''
            };
            this.products = [];
        }

        async init() {
            this.products = await window.productsAPI.fetchProducts();

            const searchInput = document.getElementById('product-search');
            // Add roast filter logic here if UI elements existed

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filters.searchTerm = e.target.value.toLowerCase();
                    this.debouncedSearch();
                });
            }

            // Initial render
            this.performSearch();
        }

        debouncedSearch = this.debounce(() => this.performSearch(), 300);

        debounce(func, wait) {
            let timeout;
            return function (...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        performSearch() {
            const filtered = this.filterProducts(this.products);
            this.renderProducts(filtered);
        }

        filterProducts(products) {
            return products.filter(product => {
                const matchesSearch = !this.filters.searchTerm ||
                    product.name.toLowerCase().includes(this.filters.searchTerm) ||
                    product.profile.toLowerCase().includes(this.filters.searchTerm) ||
                    product.tasting_notes.some(note => note.toLowerCase().includes(this.filters.searchTerm));

                const matchesRoast = this.filters.roast === 'all' || product.roast === this.filters.roast;

                return matchesSearch && matchesRoast;
            });
        }

        renderProducts(products) {
            const grid = document.querySelector('.product-grid');
            if (!grid) return;

            if (products.length === 0) {
                grid.innerHTML = '<div class="no-results">No coffee found matching your criteria.</div>';
                return;
            }

            grid.innerHTML = products.map(product => `
                <article class="product-card" data-id="${product.id}">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                        <div class="roast-badge ${product.roast.toLowerCase()}">${product.roast} Roast</div>
                    </div>
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <div class="tags">
                            <span>${product.origin}</span>
                            <span>${product.process}</span>
                        </div>
                        <p class="profile">${product.profile}</p>
                        <ul class="tasting-notes">
                            ${product.tasting_notes.map(note => `<li>${note}</li>`).join('')}
                        </ul>
                        <button class="add-to-cart-btn magnetic" data-product='${JSON.stringify(product).replace(/'/g, "&#39;")}'>Add to Cart</button>
                    </div>
                </article>
            `).join('');

            this.attachEvents();

            // Re-init magnetic effect
            const magneticButtons = document.querySelectorAll('.magnetic');
            magneticButtons.forEach(btn => {
                btn.addEventListener('mousemove', (e) => {
                    const rect = btn.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translate(0, 0) scale(1)';
                });
            });
        }

        attachEvents() {
            // Add to Cart
            document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productData = JSON.parse(e.target.dataset.product);
                    window.cartState.addItem(productData);
                    window.cartUI.showToast(`Added ${productData.name} to cart`);
                    window.cartUI.openCart();
                });
            });

            // Modal
            document.querySelectorAll('.product-image').forEach(img => {
                img.addEventListener('click', (e) => {
                    const card = e.target.closest('.product-card');
                    const btn = card.querySelector('.add-to-cart-btn');
                    const product = JSON.parse(btn.dataset.product);
                    window.cartUI.openModal(product);
                });
            });
        }
    }

    // --- 4. Dynamic Cart UI ---
    class CartUI {
        constructor() {
            this.cartBtn = document.getElementById('cart-btn');
            this.cartCount = document.getElementById('cart-count');
            this.cartCountHeader = document.getElementById('cart-count-header');
            this.cartSlideout = document.getElementById('cart-slideout');
            this.cartOverlay = document.getElementById('cart-overlay');
            this.cartItemsContainer = document.getElementById('cart-items');
            this.cartTotalPrice = document.getElementById('cart-total-price');
            this.productModal = document.getElementById('product-modal');
            this.modalBody = document.getElementById('modal-body');

            this.init();
        }

        init() {
            // Subscribe to cart changes
            window.cartState.subscribe(this.updateCartUI.bind(this));

            // Cart Toggles
            this.cartBtn?.addEventListener('click', () => this.openCart());
            document.getElementById('close-cart')?.addEventListener('click', () => this.closeCart());
            this.cartOverlay?.addEventListener('click', () => this.closeCart());

            // Modal Toggles
            document.getElementById('close-modal')?.addEventListener('click', () => this.closeModal());
            this.productModal?.addEventListener('click', (e) => {
                if (e.target === this.productModal) this.closeModal();
            });

            // Initial Render
            this.updateCartUI(window.cartState.items);
        }

        updateCartUI(items) {
            const count = window.cartState.getCount();
            const total = window.cartState.getTotal();

            if (this.cartCount) this.cartCount.textContent = count;
            if (this.cartCountHeader) this.cartCountHeader.textContent = count;
            if (this.cartTotalPrice) this.cartTotalPrice.textContent = `$${total.toFixed(2)}`;

            this.renderCartItems(items);
        }

        renderCartItems(items) {
            if (!this.cartItemsContainer) return;

            if (items.length === 0) {
                this.cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty</div>';
                return;
            }

            this.cartItemsContainer.innerHTML = items.map(item => `
                <div class="cart-item" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                        <div class="cart-controls">
                            <button class="qty-btn" data-action="decrease">−</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" data-action="increase">+</button>
                            <button class="remove-btn">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('');

            this.attachCartItemEvents();
        }

        attachCartItemEvents() {
            this.cartItemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemElement = e.target.closest('.cart-item');
                    const productId = itemElement.dataset.id;
                    const action = e.target.dataset.action;
                    const delta = action === 'increase' ? 1 : -1;
                    window.cartState.updateQuantity(productId, delta);
                });
            });

            this.cartItemsContainer.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.closest('.cart-item').dataset.id;
                    window.cartState.removeItem(productId);
                });
            });
        }

        openCart() {
            this.cartSlideout.classList.add('open');
            this.cartOverlay.classList.add('open');
        }

        closeCart() {
            this.cartSlideout.classList.remove('open');
            this.cartOverlay.classList.remove('open');
        }

        openModal(product) {
            if (!this.modalBody) return;

            this.modalBody.innerHTML = `
                <div class="modal-grid">
                    <div class="modal-image">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="modal-details">
                        <h2>${product.name}</h2>
                        <div class="modal-price">$${product.price.toFixed(2)}</div>
                        <p class="modal-description">${product.description}</p>
                        
                        <div class="modal-meta">
                            <div class="meta-item">
                                <h4>Origin</h4>
                                <p>${product.origin}</p>
                            </div>
                            <div class="meta-item">
                                <h4>Process</h4>
                                <p>${product.process}</p>
                            </div>
                            <div class="meta-item">
                                <h4>Roast</h4>
                                <p>${product.roast}</p>
                            </div>
                            <div class="meta-item">
                                <h4>Profile</h4>
                                <p>${product.profile}</p>
                            </div>
                        </div>

                        <button class="cta-button full-width" id="modal-add-btn">Add to Cart</button>
                    </div>
                </div>
            `;

            document.getElementById('modal-add-btn').addEventListener('click', () => {
                window.cartState.addItem(product);
                this.showToast(`Added ${product.name} to cart`);
                this.closeModal();
                this.openCart();
            });

            this.productModal.classList.add('open');
        }

        closeModal() {
            this.productModal.classList.remove('open');
        }

        showToast(msg) {
            const toast = document.createElement('div');
            toast.className = 'toast show';
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    // --- 5. Enhanced Checkout Manager ---
    class CheckoutManager {
        constructor() {
            this.form = document.querySelector('.checkout-form');
            this.orderSummary = document.querySelector('.order-summary');
            this.init();
        }

        init() {
            this.loadCartItems();
            this.attachFormValidation();

            // Update summary when cart changes
            window.cartState.subscribe(() => this.loadCartItems());
        }

        loadCartItems() {
            const items = window.cartState.items;
            const subtotal = window.cartState.getTotal();
            const shipping = 5.00;
            const total = subtotal + shipping;

            if (this.orderSummary) {
                this.orderSummary.innerHTML = `
                    <h3>Order Summary</h3>
                    <div class="summary-items">
                        ${items.map(item => `
                            <div class="summary-item">
                                <div class="item-info">
                                    <img src="${item.image}" alt="${item.name}">
                                    <div>
                                        <h4>${item.name}</h4>
                                        <p>Qty: ${item.quantity}</p>
                                    </div>
                                </div>
                                <span class="price">$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="summary-totals">
                        <div class="total-row">
                            <span>Subtotal</span>
                            <span>$${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>Shipping</span>
                            <span>$${shipping.toFixed(2)}</span>
                        </div>
                        <div class="total-row final">
                            <span>Total</span>
                            <span>$${total.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }
        }

        attachFormValidation() {
            this.form?.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.validateForm()) {
                    this.processOrder();
                }
            });
        }

        validateForm() {
            let isValid = true;
            const inputs = this.form.querySelectorAll('input[required]');

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    this.markError(input, 'This field is required');
                    isValid = false;
                } else {
                    this.clearError(input);

                    // Email validation
                    if (input.type === 'email' && !this.validateEmail(input.value)) {
                        this.markError(input, 'Please enter a valid email');
                        isValid = false;
                    }
                }
            });

            return isValid;
        }

        async processOrder() {
            const formData = new FormData(this.form);
            const order = {
                items: window.cartState.items,
                customer: Object.fromEntries(formData),
                total: window.cartState.getTotal() + 5.00,
                orderId: Date.now(),
                date: new Date().toISOString()
            };

            // Save order to "database" (localStorage)
            const orders = JSON.parse(localStorage.getItem('coffee-orders')) || [];
            orders.push(order);
            localStorage.setItem('coffee-orders', JSON.stringify(orders));

            // Clear cart
            window.cartState.clearCart();

            // Show success message
            window.cartUI.showToast('Order confirmed! Redirecting...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }

        markError(input, msg) {
            input.classList.add('error');
            let error = input.nextElementSibling;
            if (!error || !error.classList.contains('error-msg')) {
                error = document.createElement('div');
                error.className = 'error-msg';
                input.parentNode.insertBefore(error, input.nextSibling);
            }
            error.textContent = msg;
        }

        clearError(input) {
            input.classList.remove('error');
            const error = input.nextElementSibling;
            if (error && error.classList.contains('error-msg')) {
                error.remove();
            }
        }

        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
    }

    // --- INITIALIZATION ---

    // Initialize Global Systems
    window.cartState = new CartState();
    window.productsAPI = new ProductsAPI();
    window.cartUI = new CartUI();
    window.searchManager = new SearchManager();

    // Initialize Page Specifics
    if (document.getElementById('product-search')) {
        window.searchManager.init();
    }

    if (window.location.pathname.includes('checkout')) {
        window.checkoutManager = new CheckoutManager();
    }

    // --- Shared Logic (Theme Toggle, Cursor) ---

    // Custom Cursor
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });
    }

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const body = document.body;
            const isDark = body.getAttribute('data-theme') === 'dark';
            if (isDark) {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.querySelector('i').classList.replace('ph-sun', 'ph-moon');
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.querySelector('i').classList.replace('ph-moon', 'ph-sun');
            }
        });
    }

    // Initialize Theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle?.querySelector('i').classList.replace('ph-moon', 'ph-sun');
    }
});

/* 
  Copyright (c) 2025 YB.MugBeans. All rights reserved.
  Author: Younes Boumlik
  Email: younes.q.boumlik@gmail.com
  Unauthorized copying of this file, via any medium is strictly prohibited.
*/
document.addEventListener('DOMContentLoaded', () => {
    // Custom Cursor
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            // Smooth follow for outline
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });

        // Hover effect for cursor
        const hoverElements = document.querySelectorAll('a, button, .product-card, .brew-item');

        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
                cursorOutline.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });

            el.addEventListener('mouseleave', () => {
                cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
                cursorOutline.style.backgroundColor = 'transparent';
            });
        });
    }

    // Magnetic Button Effect
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

    // Intersection Observer for Reveal Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.product-card, .about-text, .brew-item');

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.2, 1, 0.3, 1)';
        observer.observe(el);
    });

    // Add class for CSS transition
    if (!document.getElementById('reveal-style')) {
        document.head.insertAdjacentHTML("beforeend", `<style id="reveal-style">
            .in-view {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }
        </style>`);
    }

    // --- Real World Features ---

    // 1. Dark Mode Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle?.querySelector('i');

    // Check local storage
    if (localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (icon) icon.classList.replace('ph-moon', 'ph-sun');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
                icon.classList.replace('ph-sun', 'ph-moon');
                localStorage.setItem('theme', 'light');
            } else {
                body.setAttribute('data-theme', 'dark');
                icon.classList.replace('ph-moon', 'ph-sun');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // 2. Search Functionality
    const searchInput = document.getElementById('product-search');
    const productCards = document.querySelectorAll('.product-card');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();

            productCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const tags = Array.from(card.querySelectorAll('.tags span')).map(t => t.textContent.toLowerCase()).join(' ');
                const notes = Array.from(card.querySelectorAll('.tasting-notes li')).map(n => n.textContent.toLowerCase()).join(' ');

                if (title.includes(term) || tags.includes(term) || notes.includes(term)) {
                    card.style.display = 'block';
                    setTimeout(() => card.style.opacity = '1', 10);
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // 3. Add to Cart Logic
    const cartBtns = document.querySelectorAll('.add-to-cart-btn');
    const cartCount = document.getElementById('cart-count');
    let count = 0;

    // Create Toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Added to cart';
    document.body.appendChild(toast);

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    cartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            count++;
            if (cartCount) cartCount.textContent = count;

            const card = btn.closest('.product-card');
            const name = card ? card.querySelector('h3').textContent : 'Item';
            showToast(`Added ${name} to cart`);
        });
    });

    // Link cart button to checkout
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            window.location.href = 'checkout.html';
        });
    }

    // 4. Form Validation
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            let isValid = true;
            const inputs = form.querySelectorAll('input[required]');

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    markError(input, 'This field is required');
                } else {
                    clearError(input);

                    // Email validation
                    if (input.type === 'email' && !validateEmail(input.value)) {
                        isValid = false;
                        markError(input, 'Please enter a valid email');
                    }
                }
            });

            if (!isValid) {
                e.preventDefault();
                showToast('Please fix errors');
            } else {
                // Mock success
                e.preventDefault();
                showToast('Success! Redirecting...');
                setTimeout(() => {
                    if (form.classList.contains('auth-form')) window.location.href = 'index.html';
                    if (form.classList.contains('checkout-form')) window.location.href = 'index.html';
                }, 1500);
            }
        });
    });

    function markError(input, msg) {
        input.classList.add('error');
        let error = input.nextElementSibling;
        if (!error || !error.classList.contains('error-msg')) {
            error = document.createElement('div');
            error.className = 'error-msg';
            input.parentNode.insertBefore(error, input.nextSibling);
        }
        error.textContent = msg;
    }

    function clearError(input) {
        input.classList.remove('error');
        const error = input.nextElementSibling;
        if (error && error.classList.contains('error-msg')) {
            error.remove();
        }
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});

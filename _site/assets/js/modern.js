// Modern JavaScript for Stochastic Ideas

document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Header scroll effect
    const header = document.querySelector('.site-header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = 'none';
            }
        });
    }
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe cards and sections for animation
    document.querySelectorAll('.post-card, .rpg-item, .project-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Add loading states for external links
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        link.addEventListener('click', function() {
            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 200);
        });
    });
    
    // Enhanced floating card animation
    const floatingCards = document.querySelectorAll('.floating-cards .card');
    floatingCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 2}s`;
        
        // Add mouse interaction
        card.addEventListener('mouseenter', function() {
            this.style.animationPlayState = 'paused';
            this.style.transform = 'translateY(-10px) scale(1.05)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.animationPlayState = 'running';
            this.style.transform = '';
        });
    });
    
    // Search functionality (if search input exists)
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const searchableItems = document.querySelectorAll('.post-card, .rpg-item, .project-card');
            
            searchableItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = '';
                    item.style.opacity = '1';
                } else {
                    item.style.opacity = '0.3';
                }
            });
        });
    }
});

// Theme switcher (if implemented)
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load saved theme
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
});
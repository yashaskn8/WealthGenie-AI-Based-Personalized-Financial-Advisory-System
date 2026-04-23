document.addEventListener('DOMContentLoaded', () => {
    const loginCard = document.getElementById('login-container');
    const video = document.getElementById('bg-video');
    const landingScreen = document.getElementById('landing-screen');
    const enterBtn = document.getElementById('enter-btn');

    const revealUI = () => {
        loginCard.classList.add('visible');
    };

    // Transition from Landing to Genie Video
    enterBtn.addEventListener('click', () => {
        landingScreen.classList.add('fade-out');
        
        // Start the genie animation
        video.play().catch(err => {
            console.log("Auto-play blocked, showing UI immediately");
            revealUI();
        });
    });

    // Reveal UI only after the complete video animation plays
    video.addEventListener('ended', revealUI);

    // Fallback exactly in case the video is blocked or fails to load
    video.addEventListener('error', revealUI);

    // The 3D hover tilt effect has been removed per user request.
    
    // Form Toggling Logic
    const toggleToRegister = document.getElementById('toggle-to-register');
    const toggleToLogin = document.getElementById('toggle-to-login');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    toggleToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        loginView.classList.remove('active');
        registerView.classList.remove('hidden');
        registerView.classList.add('active');
    });

    toggleToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('hidden');
        registerView.classList.remove('active');
        loginView.classList.remove('hidden');
        loginView.classList.add('active');
    });
    
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('login-email').value;
        const passwordInput = document.getElementById('login-password').value;

        if (emailInput === 'admin' && passwordInput === 'admin123') {
            // Change button state to show processing
            const btn = loginForm.querySelector('.btn-primary');
            const originalText = btn.textContent;
            btn.textContent = 'Connecting...';
            btn.style.opacity = '0.8';
            btn.style.pointerEvents = 'none';
            
            // Simulate a delay for login
            setTimeout(() => {
                alert("Welcome to Wealth Genie! Your profile is being prepared.");
                btn.textContent = originalText;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }, 1500);
        } else {
            alert("Invalid credentials. Please use admin / admin123");
        }
    });
});

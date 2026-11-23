// shared/nav.js
document.addEventListener('DOMContentLoaded', () => {
    // Determine active page based on URL
    const isBossTimer = window.location.pathname === '/mega-tools/' || 
                        window.location.pathname === '/mega-tools/index.html' || 
                        window.location.pathname === '/mega-tools';

    const navHTML = `
        <header class="app-header">
            <a href="/mega-tools/" class="nav-logo">MEGA TOOLS</a>
            <nav class="nav-links">
                <a href="/mega-tools/" class="${isBossTimer ? 'active' : ''}">🐉 Boss Timers</a>
                <a href="#" style="opacity: 0.5; cursor: not-allowed;">⚔️ Tool 2 (Soon)</a>
            </nav>
        </header>
    `;

    // Insert the nav at the very top of the body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
});

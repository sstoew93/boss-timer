// shared/nav.js
document.addEventListener('DOMContentLoaded', () => {
    // Determine active page based on URL
    const path = window.location.pathname;
    const isBossTimer = path === '/mega-tools/' || path === '/mega-tools/index.html' || path === '/mega-tools';
    const isHuntCalc = path.includes('/mega-tools/hunt-calculator/');

    const navHTML = `
        <header class="app-header">
            <div class="nav-logo">MEGA TOOLS</div>
            <nav class="nav-links">
                <a href="/mega-tools/" class="${isBossTimer ? 'active' : ''}">Boss Timer</a>
                <a href="/mega-tools/hunt-calculator/" class="${isHuntCalc ? 'active' : ''}">Hunt Calculator</a>
            </nav>
        </header>
    `;

    // Insert the nav at the very top of the body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
});

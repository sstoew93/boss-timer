// shared/nav.js
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const isBossTimer = path === '/mega-tools/' || path === '/mega-tools/index.html' || path === '/mega-tools';
    const isHuntCalc = path.includes('/mega-tools/hunt-calculator/');
    const isTwitchBot = path.includes('/mega-tools/twitch-bot/');

    const navHTML = `
        <header class="app-header">
            <div class="nav-logo">MEGA TOOLS</div>
            <nav class="nav-links">
                <a href="/mega-tools/" class="${isBossTimer ? 'active' : ''}">Boss Timer</a>
                <a href="/mega-tools/hunt-calculator/" class="${isHuntCalc ? 'active' : ''}">Hunt Calculator</a>
                <a href="/mega-tools/twitch-bot/" class="${isTwitchBot ? 'active' : ''}">Twitch Bot</a>
            </nav>
        </header>
    `;

    document.body.insertAdjacentHTML('afterbegin', navHTML);
});

// --- PASSWORD LOGIC ---
const SECRET_PASSWORD = "alohomora"; 

function checkPassword() {
    const input = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('error-msg');

    if (input === SECRET_PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        sessionStorage.setItem('isLoggedIn', 'true');
        initTracker();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('password-input').value = ''; 
    }
}

document.getElementById('password-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkPassword();
});

if (sessionStorage.getItem('isLoggedIn') === 'true') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    initTracker();
}

// --- CARD TRACKER LOGIC ---
function initTracker() {
    const standardBoard = document.getElementById('standardBoard');
    const pinkBoard = document.getElementById('pinkBoard');
    const pinkSection = document.getElementById('pinkSection');
    const specialSection = document.getElementById('specialSection');
    const specialToggle = document.getElementById('specialToggle');
    const labelNormal = document.getElementById('labelNormal');
    const labelSpecial = document.getElementById('labelSpecial');
    const resetBtn = document.getElementById('resetBtn');

    const standardColors = ['red', 'blue', 'gold'];

    function generateCards() {
        // 1. Generate Standard Rows
        standardColors.forEach(color => {
            const row = document.createElement('div');
            row.className = 'card-row';
            for (let i = 1; i <= 9; i++) {
                const card = document.createElement('div');
                card.className = `card ${color}`;
                card.textContent = i;
                card.onclick = () => card.classList.toggle('used');
                row.appendChild(card);
            }
            standardBoard.appendChild(row);
        });

        // 2. Generate Pink Row
        for (let i = 1; i <= 9; i++) {
            const card = document.createElement('div');
            card.className = `card pink`;
            card.textContent = i;
            card.onclick = () => card.classList.toggle('used');
            pinkBoard.appendChild(card);
        }
    }

    // Toggle Special Mode
    specialToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            labelSpecial.classList.add('active');
            labelNormal.classList.remove('active');
            pinkSection.classList.remove('collapsed');
            specialSection.classList.remove('collapsed');
        } else {
            labelNormal.classList.add('active');
            labelSpecial.classList.remove('active');
            pinkSection.classList.add('collapsed');
            specialSection.classList.add('collapsed');
            
            // Reset special action cards after animation finishes
            setTimeout(() => {
                document.querySelectorAll('.action-card').forEach(c => c.classList.remove('used'));
            }, 400);
        }
    });

    // Reset All Cards
    resetBtn.addEventListener('click', () => {
        document.querySelectorAll('.card').forEach(c => c.classList.remove('used'));
        document.querySelectorAll('.action-card').forEach(c => c.classList.remove('used'));
    });

    generateCards();
}

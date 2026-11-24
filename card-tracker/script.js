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
    const specialToggle = document.getElementById('specialModeToggle');
    const modeLabel = document.getElementById('modeLabel');
    const pinkColumn = document.getElementById('pink');
    const resetBtn = document.getElementById('resetBtn');

    // Generate Cards
    function createColumn(id, color) {
        const col = document.getElementById(id);
        col.innerHTML = ''; // Clear in case of re-generation
        for (let i = 1; i <= 8; i++) {
            const card = document.createElement('div');
            card.className = `card ${color}`;
            card.innerHTML = `<span>${i}</span>`;
            card.onclick = () => card.classList.toggle('used');
            col.appendChild(card);
        }
    }

    // Initialize Normal Cards
    createColumn('red', 'red');
    createColumn('blue', 'blue');
    createColumn('gold', 'gold');
    createColumn('pink', 'pink'); // Pre-generate hidden pink cards

    // Toggle Logic
    specialToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            modeLabel.textContent = "Special Game";
            modeLabel.style.color = "#ec4899"; // Pink
            pinkColumn.classList.remove('hidden-column');
            pinkColumn.style.display = 'flex';
        } else {
            modeLabel.textContent = "Normal Game";
            modeLabel.style.color = "#e4e4e7"; // White
            pinkColumn.classList.add('hidden-column');
            pinkColumn.style.display = 'none';
        }
    });

    // Reset Logic
    resetBtn.addEventListener('click', () => {
        document.querySelectorAll('.used').forEach(c => c.classList.remove('used'));
    });
}

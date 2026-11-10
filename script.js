// --- PASSWORD LOGIC ---
const SECRET_PASSWORD = "megamu123"; 

function checkPassword() {
    const input = document.getElementById('password-input').value;
    const errorMsg = document.getElementById('error-msg');
    
    if (input === SECRET_PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        sessionStorage.setItem('isLoggedIn', 'true');
        loadData();
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
    loadData();
}
// ----------------------

// --- APP LOGIC ---
let allData = []; 
let uniqueServers = new Set();
let uniqueBosses = new Set();
let countdownTimers = []; 

function loadData() {
    fetch('data.json')
      .then(response => response.json())
      .then(data => {
        allData = data; 
        
        allData.forEach(item => {
          uniqueServers.add(item.server);
          uniqueBosses.add(item.boss);
        });

        buildFilters('server-filters', Array.from(uniqueServers).sort(), 'server');
        buildFilters('boss-filters', Array.from(uniqueBosses).sort(), 'boss');

        renderTable();
        setInterval(updateTimers, 1000);
      })
      .catch(error => console.error('Error loading data:', error));
}

// Reverted to DD/MM, HH:MM (24-hour)
function formatDateShort(dateString) {
    const d = new Date(dateString);
    const options = { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('en-GB', options).format(d);
}

function toggleDropdown(id) {
    const targetDropdown = document.getElementById(id);
    const allDropdowns = document.getElementsByClassName("dropdown-content");
    
    for (let i = 0; i < allDropdowns.length; i++) {
        if (allDropdowns[i].id === id) {
            targetDropdown.classList.toggle("show");
        } else {
            allDropdowns[i].classList.remove("show");
        }
    }
}

window.onclick = function(event) {
    if (!event.target.closest('.dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}

document.querySelectorAll('.dropdown').forEach(dropdown => {
    dropdown.addEventListener('mouseleave', () => {
        const content = dropdown.querySelector('.dropdown-content');
        if (content) {
            content.classList.remove('show');
        }
    });
});

function buildFilters(containerId, items, type) {
  const container = document.getElementById(containerId);
  items.forEach(item => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${item}" data-type="${type}" checked onchange="renderTable()"> ${item}`;
    container.appendChild(label);
  });
}

document.getElementById('search-bar').addEventListener('input', renderTable);

function renderTable() {
  const tbody = document.getElementById('boss-table-body');
  tbody.innerHTML = ''; 
  countdownTimers = []; 

  const checkedServers = Array.from(document.querySelectorAll('#server-filters input:checked')).map(cb => cb.value);
  const checkedBosses = Array.from(document.querySelectorAll('#boss-filters input:checked')).map(cb => cb.value);
  const searchText = document.getElementById('search-bar').value.toLowerCase().trim();

  let filteredData = allData.filter(item => {
    const matchesServer = checkedServers.includes(item.server);
    const matchesBoss = checkedBosses.includes(item.boss);
    const matchesSearch = item.server.toLowerCase().includes(searchText) || item.boss.toLowerCase().includes(searchText) || item.killer.toLowerCase().includes(searchText);
    return matchesServer && matchesBoss && matchesSearch;
  });

  // Sort by ALIVE, MAY SPAWN, DEAD
  const now = new Date().getTime();
  filteredData.sort((a, b) => {
    const getWeight = (item) => {
        const min = new Date(item.earliest_spawn).getTime();
        const max = new Date(item.latest_spawn).getTime();
        if (max <= now) return 1; // ALIVE
        if (min <= now && max > now) return 2; // MAY SPAWN
        return 3; // DEAD
    };
    const weightA = getWeight(a);
    const weightB = getWeight(b);
    if (weightA !== weightB) return weightA - weightB;
    return new Date(a.earliest_spawn) - new Date(b.earliest_spawn);
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#a1a1aa; padding: 40px;">No results found.</td></tr>';
    return;
  }

  filteredData.forEach(item => {
    const row = document.createElement('tr');
    
    const windowStart = formatDateShort(item.earliest_spawn);
    const windowEnd = formatDateShort(item.latest_spawn);
    
    const timerId = `timer-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');
    const statusId = `status-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');
    const maxTimeId = `max-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');

    row.innerHTML = `
      <td>
          <div class="boss-name">${item.boss}</div>
          <div class="boss-subtext">Last kill by ${item.killer}</div>
      </td>
      <td>
          <span class="server-badge">${item.server}</span>
      </td>
      <td>
          <div class="window-text">
              <span>Window:</span> <strong>${windowStart}</strong> to<br>
              <strong>${windowEnd}</strong>
          </div>
      </td>
      <td>
          <div id="${statusId}" class="status-pill dead">
              <div class="status-dot"></div> Dead • counting
          </div>
          <div class="timer-main" id="${timerId}">Calculating...</div>
          <div class="timer-sub" id="${maxTimeId}"></div>
      </td>
    `;
    tbody.appendChild(row);

    countdownTimers.push({
      timerId: timerId,
      statusId: statusId,
      maxTimeId: maxTimeId,
      earliestSpawnTime: new Date(item.earliest_spawn).getTime(),
      latestSpawnTime: new Date(item.latest_spawn).getTime(),
      isFixed: item.is_fixed
    });
  });
  
  updateTimers();
}

function formatTimeRemaining(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function updateTimers() {
  const now = new Date().getTime();
  
  countdownTimers.forEach(timer => {
    const timerEl = document.getElementById(timer.timerId);
    const statusEl = document.getElementById(timer.statusId);
    const maxEl = document.getElementById(timer.maxTimeId);
    if (!timerEl || !statusEl || !maxEl) return; 

    const timeToMin = timer.earliestSpawnTime - now;
    const timeToMax = timer.latestSpawnTime - now;

    if (timeToMin > 0) {
      // --- DEAD ---
      timerEl.textContent = formatTimeRemaining(timeToMin);
      timerEl.style.color = "#fafafa";
      statusEl.className = "status-pill dead";
      statusEl.innerHTML = '<div class="status-dot"></div> Dead';
      
      if (timer.isFixed) {
        maxEl.style.display = "none";
      } else {
        maxEl.style.display = "block";
        maxEl.textContent = `Max: ${formatTimeRemaining(timeToMax)}`; 
      }

    } else if (timeToMax > 0) {
      // --- WINDOW OPEN ---
      timerEl.textContent = "MAY SPAWN";
      timerEl.style.color = "#f59e0b"; 
      statusEl.className = "status-pill window";
      statusEl.innerHTML = '<div class="status-dot"></div> Window Open';
      
      if (timer.isFixed) {
        maxEl.style.display = "none";
      } else {
        maxEl.style.display = "block";
        maxEl.textContent = `Max: ${formatTimeRemaining(timeToMax)}`;
      }

    } else {
      // --- ALIVE ---
      timerEl.textContent = "GO HUNT";
      timerEl.style.color = "#10b981"; 
      statusEl.className = "status-pill alive";
      statusEl.innerHTML = '<div class="status-dot"></div> Alive';
      maxEl.style.display = "none";
    }
  });
}

// --- EVENT BOSS ACCORDION LOGIC (FIXED FOR BRAZIL TIME) ---
const EVENT_BOSSES = [
    { 
        name: "Kundun", 
        type: "interval", 
        interval: 8 // Spawns every 8 hours (BR Time)
    },
    { 
        name: "Medusa", 
        type: "schedule", 
        // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
        // These times are in BRAZIL TIME as requested
        schedule: [
            { day: 2, hour: 22, minute: 0, label: "Tue 22:00" }, // Tuesday
            { day: 4, hour: 22, minute: 0, label: "Thu 22:00" }, // Thursday
            { day: 6, hour: 16, minute: 0, label: "Sat 16:00" }, // Saturday
            { day: 0, hour: 18, minute: 0, label: "Sun 18:00" }  // Sunday
        ]
    }
];

function toggleEventAccordion() {
    const content = document.getElementById('event-accordion-content');
    const arrow = document.getElementById('event-arrow');
    if (content.classList.contains('show')) {
        content.classList.remove('show');
        arrow.textContent = '▼';
    } else {
        content.classList.add('show');
        arrow.textContent = '▲';
    }
}

function buildEventBosses() {
    const grid = document.getElementById('event-boss-grid');
    grid.innerHTML = '';
    
    EVENT_BOSSES.forEach(boss => {
        const card = document.createElement('div');
        card.className = 'event-boss-card';
        card.innerHTML = `
            <div class="event-boss-name">${boss.name}</div>
            <div class="event-boss-timer" id="event-timer-${boss.name.replace(/\s/g, '')}">--h --m --s</div>
            <div class="event-boss-next" id="event-next-${boss.name.replace(/\s/g, '')}">Next: --:--</div>
        `;
        grid.appendChild(card);
    });
}

function updateEventTimers() {
    const now = new Date();
    const nowMs = now.getTime();
    
    // 1. Get current time in Brazil to do the math
    const brString = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour12: false });
    const brNow = new Date(brString);

    EVENT_BOSSES.forEach(boss => {
        const timerEl = document.getElementById(`event-timer-${boss.name.replace(/\s/g, '')}`);
        const nextEl = document.getElementById(`event-next-${boss.name.replace(/\s/g, '')}`);
        if (!timerEl || !nextEl) return;

        let targetTimeBR = new Date(brNow);
        let label = "";

        if (boss.type === "interval") {
            // Kundun Logic
            let nextSpawnHour = Math.ceil((brNow.getHours() + 1) / boss.interval) * boss.interval;
            if (nextSpawnHour >= 24) {
                nextSpawnHour -= 24;
                targetTimeBR.setDate(targetTimeBR.getDate() + 1);
            }
            targetTimeBR.setHours(nextSpawnHour, 0, 0, 0);
            label = `${String(nextSpawnHour).padStart(2, '0')}:00 BR`;
            
        } else if (boss.type === "schedule") {
            // Medusa Logic
            let closestTime = null;
            let closestLabel = "";

            boss.schedule.forEach(slot => {
                let candidate = new Date(brNow);
                candidate.setHours(slot.hour, slot.minute, 0, 0);

                let dayDiff = slot.day - brNow.getDay();
                if (dayDiff < 0 || (dayDiff === 0 && candidate <= brNow)) {
                    dayDiff += 7;
                }
                candidate.setDate(candidate.getDate() + dayDiff);

                if (!closestTime || candidate < closestTime) {
                    closestTime = candidate;
                    closestLabel = slot.label;
                }
            });
            targetTimeBR = closestTime;
            label = closestLabel;
        }

        // 2. Calculate the exact millisecond difference
        const diffMs = targetTimeBR.getTime() - brNow.getTime();
        
        // 3. Find the actual real-world timestamp
        const targetMs = nowMs + diffMs;
        const distance = targetMs - nowMs;

        // 4. Convert the target time to Bulgarian time for display
        const targetDateObj = new Date(targetMs);
        const bgTimeStr = targetDateObj.toLocaleString('en-GB', { timeZone: 'Europe/Sofia', hour: '2-digit', minute: '2-digit' });

        if (distance < 0) {
            timerEl.textContent = "SPAWNING NOW";
            timerEl.style.color = "#ef4444";
        } else {
            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000)) / 1000);

            timerEl.textContent = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
            timerEl.style.color = hours < 1 ? "#f59e0b" : "#10b981"; 
        }

        // Show both the BR label and what time it actually is in BG
        nextEl.textContent = `Next: ${label} (${bgTimeStr} BG)`;
    });
}

// Initialize the event bosses when data loads
document.addEventListener('DOMContentLoaded', () => {
    buildEventBosses();
    setInterval(updateEventTimers, 1000); // Update every second
});

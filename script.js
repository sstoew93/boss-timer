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

// --- EVENT BOSS TIME CALCULATIONS ---
function getNextKundun() {
    const now = new Date();
    const nowUTC = now.getTime();
    
    // Kundun BR times converted to UTC (BR + 3 hours):
    const schedule = [
        { day: 1, hour: 19 }, // Mon 16:00 BR
        { day: 2, hour: 7 },  // Tue 04:00 BR
        { day: 4, hour: 2 },  // Wed 23:00 BR (Thu 02:00 UTC)
        { day: 4, hour: 5 },  // Thu 02:00 BR
        { day: 5, hour: 19 }, // Fri 16:00 BR
        { day: 0, hour: 0 },  // Sat 21:00 BR (Sun 00:00 UTC)
        { day: 0, hour: 5 }   // Sun 02:00 BR
    ];

    let nextSpawn = null;
    
    for (let i = 0; i < 14; i++) {
        let checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, 0, 0, 0));
        let dayOfWeek = checkDate.getUTCDay();
        
        schedule.forEach(slot => {
            if (slot.day === dayOfWeek) {
                let target = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), slot.hour, 0, 0));
                if (target.getTime() > nowUTC) {
                    if (!nextSpawn || target.getTime() < nextSpawn.getTime()) {
                        nextSpawn = target;
                    }
                }
            }
        });
    }
    
    if (nextSpawn) {
        nextSpawn.setUTCMinutes(nextSpawn.getUTCMinutes() - 5);
    }
    return nextSpawn.toISOString();
}

function getNextMedusa() {
    const now = new Date();
    const nowUTC = now.getTime();
    
    const schedule = [
        { day: 3, hour: 0 },  // Tuesday 21:00 BR = Wed 00:00 UTC
        { day: 6, hour: 0 },  // Friday 21:00 BR = Sat 00:00 UTC
        { day: 6, hour: 19 }, // Saturday 16:00 BR = Sat 19:00 UTC
        { day: 0, hour: 21 }  // Sunday 18:00 BR = Sun 21:00 UTC
    ];

    let nextSpawn = null;
    
    for (let i = 0; i < 14; i++) {
        let checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, 0, 0, 0));
        let dayOfWeek = checkDate.getUTCDay();
        
        schedule.forEach(slot => {
            if (slot.day === dayOfWeek) {
                let target = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), slot.hour, 0, 0));
                if (target.getTime() > nowUTC) {
                    if (!nextSpawn || target.getTime() < nextSpawn.getTime()) {
                        nextSpawn = target;
                    }
                }
            }
        });
    }
    
    if (nextSpawn) {
        nextSpawn.setUTCMinutes(nextSpawn.getUTCMinutes() - 5);
    }
    return nextSpawn.toISOString();
}
// ------------------------------------

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
        
        const kundunTime = getNextKundun();
        allData.push({
            server: "ALL", boss: "Kundun", killer: "", 
            earliest_spawn: kundunTime, latest_spawn: kundunTime, is_fixed: true
        });

        const medusaTime = getNextMedusa();
        allData.push({
            server: "ALL", boss: "Medusa", killer: "", 
            earliest_spawn: medusaTime, latest_spawn: medusaTime, is_fixed: true
        });

        allData.forEach(item => {
          uniqueServers.add(item.server);
          uniqueBosses.add(item.boss);
        });

        const sortedServers = Array.from(uniqueServers).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const sortedBosses = Array.from(uniqueBosses).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        buildFilters('server-filters', sortedServers, 'server');
        buildFilters('boss-filters', sortedBosses, 'boss');

        renderTable();
        setInterval(updateTimers, 1000);
      })
      .catch(error => console.error('Error loading data:', error));
}

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
        if (content) content.classList.remove('show');
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

// --- NEW: HELPER TO FIND THE CORRECT IMAGE ---
function getBossImage(bossName) {
    // Convert "Lord of Ferea" to "lord-of-ferea"
    const fileName = bossName.toLowerCase().replace(/\s+/g, '-');
    return `images/bosses/${fileName}.png`;
}
// ----------------------------------------------

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
    const bossImgSrc = getBossImage(item.boss);

    const timerId = `timer-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');
    const statusId = `status-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');
    const maxTimeId = `max-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');

    // Added the image with an onerror fallback to a default image
    row.innerHTML = `
      <td>
          <div class="boss-info">
              <img src="${bossImgSrc}" class="boss-avatar" alt="${item.boss}" onerror="this.src='images/bosses/default.png'">
              <div class="boss-text-container">
                  <div class="boss-name">${item.boss}</div>
                  ${item.killer ? `<div class="boss-subtext">Last kill by ${item.killer}</div>` : ''}
              </div>
          </div>
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
              <div class="status-dot"></div> Dead
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

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
        allData = data; // Data is already sorted by earliest_spawn from Python
        
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

// Function to format date nicely (e.g., 05.11, 21:51)
function formatShortDate(dateString) {
    const d = new Date(dateString);
    const options = { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(d);
    return `${parts.find(p => p.type === 'day').value}.${parts.find(p => p.type === 'month').value}, ${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`;
}

function formatFullDate(dateString) {
    const d = new Date(dateString);
    const options = { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(d);
    return `${parts.find(p => p.type === 'day').value}.${parts.find(p => p.type === 'month').value}.${parts.find(p => p.type === 'year').value} г., ${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value} ч.`;
}

function toggleDropdown(id) {
    document.getElementById(id).classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.closest('.dropdown')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
        }
    }
}

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

  const filteredData = allData.filter(item => {
    const matchesServer = checkedServers.includes(item.server);
    const matchesBoss = checkedBosses.includes(item.boss);
    const matchesSearch = item.server.toLowerCase().includes(searchText) || item.boss.toLowerCase().includes(searchText) || item.killer.toLowerCase().includes(searchText);
    return matchesServer && matchesBoss && matchesSearch;
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No results found.</td></tr>';
    return;
  }

  filteredData.forEach(item => {
    const row = document.createElement('tr');
    
    const formattedLastKill = formatShortDate(item.last_kill);
    const fullLastKill = formatFullDate(item.last_kill);
    const fullEarliest = formatFullDate(item.earliest_spawn);
    const fullLatest = formatFullDate(item.latest_spawn);
    
    // Format the spawn window beautifully
    const windowStr = `${formatShortDate(item.earliest_spawn)} <br><span style="color:#888;font-size:12px;">to</span><br> ${formatShortDate(item.latest_spawn)}`;
    
    const timerId = `timer-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');
    const statusId = `status-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');

    row.innerHTML = `
      <td>${item.server}</td>
      <td>${item.boss}</td>
      <td id="${statusId}" class="status-dead">💀 DEAD</td>
      <td>${item.killer}</td>
      <td>
        <div class="tooltip">${formattedLastKill}
          <span class="tooltiptext">Full BG Time: ${fullLastKill}<br><br>Raw Brazil: ${item.raw_date}</span>
        </div>
      </td>
      <td>
        <div class="tooltip">${windowStr}
          <span class="tooltiptext">Earliest: ${fullEarliest}<br>Latest: ${fullLatest}<br><br>Fixed Math: Kill Time + ${item.min_hours}h to ${item.max_hours}h</span>
        </div>
      </td>
      <td class="countdown" id="${timerId}">Calculating...</td>
    `;
    tbody.appendChild(row);

    countdownTimers.push({
      elementId: timerId,
      statusId: statusId, 
      earliestSpawnTime: new Date(item.earliest_spawn).getTime(),
      latestSpawnTime: new Date(item.latest_spawn).getTime()
    });
  });
  
  updateTimers();
}

function updateTimers() {
  const now = new Date().getTime();
  
  countdownTimers.forEach(timer => {
    const element = document.getElementById(timer.elementId);
    const statusElement = document.getElementById(timer.statusId);
    if (!element || !statusElement) return; 

    const timeToMin = timer.earliestSpawnTime - now;
    const timeToMax = timer.latestSpawnTime - now;

    if (timeToMin > 0) {
      // --- BOSS IS DEAD ---
      const hours = Math.floor(timeToMin / (1000 * 60 * 60));
      const minutes = Math.floor((timeToMin % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeToMin % (1000 * 60)) / 1000);
      
      element.textContent = `${hours}h ${minutes}m ${seconds}s`;
      element.style.color = "#c9d1d9"; // Reset to normal text color
      
      statusElement.textContent = "💀 DEAD";
      statusElement.className = "status-badge status-dead";

    } else if (timeToMax > 0) {
      // --- SPAWN WINDOW IS OPEN ---
      element.textContent = "MAY SPAWN";
      element.style.color = "#d29922"; // Yellow/Orange text
      
      statusElement.textContent = "🟡 HUNT NOW";
      statusElement.className = "status-badge status-window";

    } else {
      // --- BOSS IS ALIVE (MAX TIME PASSED) ---
      element.textContent = "SPAWNED";
      element.style.color = "#3fb950"; // Green text
      
      statusElement.textContent = "🟢 ALIVE";
      statusElement.className = "status-badge status-alive";
    }
  });
}

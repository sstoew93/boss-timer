let allData = []; 
let uniqueServers = new Set();
let uniqueBosses = new Set();
let countdownTimers = []; 

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    allData = data.sort((a, b) => new Date(a.next_spawn) - new Date(b.next_spawn));
    
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

function formatDate(dateString) {
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
    if (!event.target.matches('.dropbtn')) {
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
    // Updated colspan to 7 to match the new number of columns
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No results found.</td></tr>';
    return;
  }

  filteredData.forEach(item => {
    const row = document.createElement('tr');
    
    const formattedLastKill = formatDate(item.last_kill);
    const formattedNextSpawn = formatDate(item.next_spawn);
    const timerId = `timer-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');
    const statusId = `status-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');

    row.innerHTML = `
      <td>${item.server}</td>
      <td>${item.boss}</td>
      <td id="${statusId}" class="status-dead">💀 DEAD</td> <!-- Status Cell -->
      <td>${item.killer}</td>
      <td>
        <div class="tooltip">${formattedLastKill}
          <span class="tooltiptext">Raw Website Time (Brazil): ${item.raw_date}</span>
        </div>
      </td>
      <td>
        <div class="tooltip">${formattedNextSpawn}
          <span class="tooltiptext">Calculated as: <br>BG Kill Time + ${item.respawn_hours} hours</span>
        </div>
      </td>
      <td class="countdown" id="${timerId}">Calculating...</td>
    `;
    tbody.appendChild(row);

    countdownTimers.push({
      elementId: timerId,
      statusId: statusId, // Store the status element ID
      nextSpawnTime: new Date(item.next_spawn).getTime()
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

    const distance = timer.nextSpawnTime - now;

    if (distance < 0) {
      // Timer is up, boss is potentially alive
      element.textContent = "WINDOW OPEN!";
      element.style.color = "#fbbf24"; // Orange
      
      statusElement.textContent = "🟢 ALIVE";
      statusElement.className = "status-alive";
    } else {
      // Timer is counting down, boss is dead
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      element.textContent = `${hours}h ${minutes}m ${seconds}s`;
      element.style.color = "#4ade80"; // Green
      
      statusElement.textContent = "💀 DEAD";
      statusElement.className = "status-dead";
    }
  });
}

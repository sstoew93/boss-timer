let allData = []; 
let uniqueServers = new Set();
let uniqueBosses = new Set();
let countdownTimers = []; 

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    // Data is already sorted by Next Spawn from Python, but we sort again just in case
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

// Perfectly format date to Bulgarian Time Zone
function formatDate(dateString) {
    const d = new Date(dateString);
    
    const options = {
        timeZone: 'Europe/Sofia',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23' // Forces 00:00:00 instead of 24:00:00
    };
    
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(d);
    
    const day = parts.find(p => p.type === 'day').value;
    const month = parts.find(p => p.type === 'month').value;
    const year = parts.find(p => p.type === 'year').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;

    return `${day}.${month}.${year} г., ${hour}:${minute}:${second} ч.`;
}

function toggleDropdown(id) {
    document.getElementById(id).classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function buildFilters(containerId, items, type) {
  const container = document.getElementById(containerId);
  items.forEach(item => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${item}" data-type="${type}" checked onchange="renderTable()">
      ${item}
    `;
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
    
    // Search by Server, Boss, OR Killer
    const matchesSearch = item.server.toLowerCase().includes(searchText) || 
                          item.boss.toLowerCase().includes(searchText) || 
                          item.killer.toLowerCase().includes(searchText);
    
    return matchesServer && matchesBoss && matchesSearch;
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No results found.</td></tr>';
    return;
  }

  // Render rows
  filteredData.forEach(item => {
    const row = document.createElement('tr');
    const formattedNextSpawn = formatDate(item.next_spawn);
    const timerId = `timer-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');

    row.innerHTML = `
      <td>${item.server}</td>
      <td>${item.boss}</td>
      <td>${item.killer}</td>
      <td>${formattedNextSpawn}</td>
      <td class="countdown" id="${timerId}">Calculating...</td>
    `;
    tbody.appendChild(row);

    countdownTimers.push({
      elementId: timerId,
      nextSpawnTime: new Date(item.next_spawn).getTime()
    });
  });
  
  updateTimers();
}

function updateTimers() {
  const now = new Date().getTime();
  
  countdownTimers.forEach(timer => {
    const element = document.getElementById(timer.elementId);
    if (!element) return; 

    const distance = timer.nextSpawnTime - now;

    if (distance < 0) {
      element.textContent = "SPAWNED!";
      element.style.color = "#f87171"; // Red
    } else {
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      element.textContent = `${hours}h ${minutes}m ${seconds}s`;
      element.style.color = "#4ade80"; // Green
    }
  });
}

let allData = []; 
let uniqueServers = new Set();
let uniqueBosses = new Set();
let countdownTimers = []; 

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    // Sort data initially by Next Spawn time (Ascending - Soonest first)
    allData = data.sort((a, b) => new Date(a.next_spawn) - new Date(b.next_spawn));
    
    // Find unique servers and bosses
    allData.forEach(item => {
      uniqueServers.add(item.server);
      uniqueBosses.add(item.boss);
    });

    // Build the checkboxes inside the dropdowns
    buildFilters('server-filters', Array.from(uniqueServers).sort(), 'server');
    buildFilters('boss-filters', Array.from(uniqueBosses).sort(), 'boss');

    // Render table and start timers
    renderTable();
    setInterval(updateTimers, 1000);
  })
  .catch(error => console.error('Error loading data:', error));

// Helper to format date exactly as requested: 10.11.2026 г., 00:26:25 ч.
function formatDate(dateString) {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} г., ${hours}:${minutes}:${seconds} ч.`;
}

// Toggle dropdown visibility
function toggleDropdown(id) {
    document.getElementById(id).classList.toggle("show");
}

// Close dropdowns when clicking outside of them
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

// Build checkboxes
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

// Add event listener for the search bar
document.getElementById('search-bar').addEventListener('input', renderTable);

// Render the table based on filters and search
function renderTable() {
  const tbody = document.getElementById('boss-table-body');
  tbody.innerHTML = ''; 
  countdownTimers = []; 

  const checkedServers = Array.from(document.querySelectorAll('#server-filters input:checked')).map(cb => cb.value);
  const checkedBosses = Array.from(document.querySelectorAll('#boss-filters input:checked')).map(cb => cb.value);
  const searchText = document.getElementById('search-bar').value.toLowerCase().trim();

  // Filter data
  const filteredData = allData.filter(item => {
    const matchesServer = checkedServers.includes(item.server);
    const matchesBoss = checkedBosses.includes(item.boss);
    
    // Search in Server, Boss, AND Killer
    const matchesSearch = item.server.toLowerCase().includes(searchText) || 
                          item.boss.toLowerCase().includes(searchText) || 
                          item.killer.toLowerCase().includes(searchText);
    
    return matchesServer && matchesBoss && matchesSearch;
  });

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No results found.</td></tr>';
    return;
  }

  // Build table rows
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

// Update the live countdown timers
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

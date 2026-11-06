let allData = []; // Store all data here so we can filter it easily
let uniqueServers = new Set();
let uniqueBosses = new Set();
let countdownTimers = []; // Store references to DOM elements to update time

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    allData = data;
    
    // 1. Find all unique servers and bosses for the filters
    data.forEach(item => {
      uniqueServers.add(item.server);
      uniqueBosses.add(item.boss);
    });

    // 2. Build the checkboxes
    buildFilters('server-filters', Array.from(uniqueServers).sort(), 'server');
    buildFilters('boss-filters', Array.from(uniqueBosses).sort(), 'boss');

    // 3. Render the table initially (everything checked)
    renderTable();
    
    // 4. Start the countdown loop
    setInterval(updateTimers, 1000);
  })
  .catch(error => console.error('Error loading data:', error));

// Function to create checkboxes dynamically
function buildFilters(containerId, items, type) {
  const container = document.getElementById(containerId);
  items.forEach(item => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${item}" data-type="${type}" checked>
      ${item}
    `;
    // Add event listener to re-render table when checked/unchecked
    label.querySelector('input').addEventListener('change', renderTable);
    container.appendChild(label);
  });
}

// Function to draw the table based on currently checked boxes
function renderTable() {
  const tbody = document.getElementById('boss-table-body');
  tbody.innerHTML = ''; // Clear current table
  countdownTimers = []; // Reset timers array

  // Get currently checked servers and bosses
  const checkedServers = getCheckedValues('server-filters');
  const checkedBosses = getCheckedValues('boss-filters');

  // Filter the data
  const filteredData = allData.filter(item => 
    checkedServers.includes(item.server) && checkedBosses.includes(item.boss)
  );

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No bosses found for selected filters.</td></tr>';
    return;
  }

  // Build the rows
  filteredData.forEach(item => {
    const row = document.createElement('tr');
    
    // Format dates nicely
    const lastKillDate = new Date(item.last_kill).toLocaleString();
    const nextSpawnDate = new Date(item.next_spawn).toLocaleString();
    
    // Create a unique ID for the countdown span
    const timerId = `timer-${item.server}-${item.boss}`.replace(/[^a-zA-Z0-9-]/g, '');

    row.innerHTML = `
      <td>${item.server}</td>
      <td>${item.boss}</td>
      <td>${lastKillDate}</td>
      <td>${item.killer}</td>
      <td>${nextSpawnDate}</td>
      <td class="countdown" id="${timerId}">Calculating...</td>
    `;
    tbody.appendChild(row);

    // Add this timer to our list to update every second
    countdownTimers.push({
      elementId: timerId,
      nextSpawnTime: new Date(item.next_spawn).getTime()
    });
  });
  
  // Update timers immediately after rendering
  updateTimers();
}

// Helper function to get values of all checked boxes
function getCheckedValues(containerId) {
  const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

// Function that runs every second to update the remaining time
function updateTimers() {
  const now = new Date().getTime();
  
  countdownTimers.forEach(timer => {
    const element = document.getElementById(timer.elementId);
    if (!element) return; // Skip if element was removed by filtering

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

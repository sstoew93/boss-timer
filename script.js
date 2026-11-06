fetch('data.json')
  .then(response => response.json())
  .then(data => {
    const tbody = document.getElementById('boss-table-body');
    const countdownCells = {};

    data.forEach(item => {
      const row = document.createElement('tr');
      const lastKill = new Date(item.last_kill).toLocaleString();
      const nextSpawn = new Date(item.next_spawn).toLocaleString();

      row.innerHTML = `
        <td>${item.boss}</td>
        <td>${lastKill}</td>
        <td>${nextSpawn}</td>
        <td class="countdown" id="cd-${item.boss.replace(/\s/g, '')}">Calculating...</td>
      `;
      tbody.appendChild(row);
      
      // Store the next spawn time for the countdown update
      countdownCells[item.boss] = {
        element: row.querySelector('.countdown'),
        nextSpawnTime: new Date(item.next_spawn).getTime()
      };
    });

    // Update the countdown timers every second
    setInterval(() => {
      const now = new Date().getTime();
      for (const boss in countdownCells) {
        const cell = countdownCells[boss];
        const distance = cell.nextSpawnTime - now;

        if (distance < 0) {
          cell.element.textContent = "SPAWNED!";
          cell.element.style.color = "#f87171"; // Red
        } else {
          const hours = Math.floor(distance / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          cell.element.textContent = `${hours}h ${minutes}m ${seconds}s`;
          cell.element.style.color = "#4ade80"; // Green
        }
      }
    }, 1000);
  })
  .catch(error => console.error('Error loading data:', error));

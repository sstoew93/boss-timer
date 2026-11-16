import requests
from bs4 import BeautifulSoup
import json
import os

URL = "https://en.megamu.net/boss-log"
HISTORY_FILE = "boss_history.json"
IGNORED_SERVERS = {"svc", "speed1", "speed2", "speed3", "speed4", "speed5"}

def collect():
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    response = requests.get(URL, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    
    if not table:
        print("Table not found.")
        return

    rows = table.find_all('tr')
    
    # 1. Load existing history
    history = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r') as f:
            history = json.load(f)

    # 2. Create a lookup set for duplicates
    existing_keys = {f"{h['server']}|{h['boss']}|{h['raw_date_br']}" for h in history}
    
    new_kills = 0
    
    # 3. Process rows
    for row in rows[1:]:
        cells = row.find_all('td')
        if len(cells) < 5:
            continue
            
        date_str = cells[0].get_text(strip=True)
        monster_name = cells[1].get_text(strip=True).strip()
        killer = cells[2].get_text(strip=True)
        server = cells[3].get_text(strip=True)

        clean_server = server.lower().replace(" ", "")
        if clean_server in IGNORED_SERVERS:
            continue

        key = f"{server}|{monster_name}|{date_str}"
        if key not in existing_keys:
            history.append({
                "server": server,
                "boss": monster_name,
                "killer": killer,
                "raw_date_br": date_str
            })
            existing_keys.add(key)
            new_kills += 1

    # 4. Save updated history
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)
        
    print(f"Added {new_kills} new kills to history. Total rows: {len(history)}")

if __name__ == "__main__":
    collect()

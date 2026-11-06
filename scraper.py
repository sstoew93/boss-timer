import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo  # NEW: For timezone conversion

# Define the timezones
BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")
BULGARIA_TZ = ZoneInfo("Europe/Sofia")

RESPAWN_TIMES = {
    "Selupan": 34,
    "Nightmare": 40,
    "Lord of Ferea": 82,
    "Lord Silvester": 90,
    "Core Magriffy": 100,
    "Nix": 130
}

URL = "https://en.megamu.net/boss-log"

def scrape():
    response = requests.get(URL)
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    if not table:
        print("Could not find the boss table.")
        return []

    rows = table.find_all('tr')
    kill_data = []

    for row in rows[1:]:
        cells = row.find_all('td')
        if len(cells) < 5:
            continue
            
        date_str = cells[0].get_text(strip=True)
        monster_name = cells[1].get_text(strip=True)
        killer = cells[2].get_text(strip=True)
        server = cells[3].get_text(strip=True)

        if monster_name not in RESPAWN_TIMES:
            continue

        try:
            # 1. Read the date as Brazilian Time
            kill_time_naive = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            kill_time_br = kill_time_naive.replace(tzinfo=BRAZIL_TZ)
            
            # 2. Convert to Bulgarian Time
            kill_time_bg = kill_time_br.astimezone(BULGARIA_TZ)
            
            kill_data.append((server, monster_name, kill_time_bg, killer))
        except ValueError:
            continue

    latest_kills = {}
    for server, boss, time, killer in kill_data:
        key = f"{server}|{boss}"
        if key not in latest_kills or time > latest_kills[key]['time']:
            latest_kills[key] = {
                'server': server,
                'boss': boss,
                'time': time,
                'killer': killer
            }

    result = []
    for key, data in latest_kills.items():
        boss = data['boss']
        last_kill = data['time']
        respawn_hours = RESPAWN_TIMES[boss]
        next_spawn = last_kill + timedelta(hours=respawn_hours)
        
        result.append({
            "server": data['server'],
            "boss": boss,
            "last_kill": last_kill.isoformat(),
            "killer": data['killer'],
            "next_spawn": next_spawn.isoformat(),
            "respawn_hours": respawn_hours
        })

    result.sort(key=lambda x: (x['server'], x['boss']))
    return result

if __name__ == "__main__":
    data = scrape()
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully saved data.json with Bulgarian timezones.")

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

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
        monster_name = cells[1].get_text(strip=True).strip()
        killer = cells[2].get_text(strip=True)
        server = cells[3].get_text(strip=True)

        if monster_name not in RESPAWN_TIMES:
            continue

        try:
            # STEP 1: Read the raw date from the website as Brazilian Time
            kill_time_naive = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            kill_time_br = kill_time_naive.replace(tzinfo=BRAZIL_TZ)
            
            # STEP 2: Convert it to Bulgarian Time
            kill_time_bg = kill_time_br.astimezone(BULGARIA_TZ)
            
            # STEP 3: Add the respawn hours to the Bulgarian Time to find the Next Spawn
            respawn_hours = RESPAWN_TIMES[monster_name]
            next_spawn_bg = kill_time_bg + timedelta(hours=respawn_hours)
            
            kill_data.append({
                'server': server,
                'boss': monster_name,
                'last_kill': kill_time_bg,
                'killer': killer,
                'next_spawn': next_spawn_bg,
                'respawn_hours': respawn_hours
            })
        except Exception as e:
            print(f"Error parsing row {date_str}: {e}")
            continue

    # Find the most recent kill for EACH server + boss combination
    latest_kills = {}
    for item in kill_data:
        key = f"{item['server']}|{item['boss']}"
        if key not in latest_kills or item['last_kill'] > latest_kills[key]['last_kill']:
            latest_kills[key] = item

    # Convert to a list and sort by Next Spawn (Soonest first)
    result = list(latest_kills.values())
    result.sort(key=lambda x: x['next_spawn'])

    # Format dates as ISO strings for the website
    final_json = []
    for item in result:
        final_json.append({
            "server": item['server'],
            "boss": item['boss'],
            "last_kill": item['last_kill'].isoformat(),
            "killer": item['killer'],
            "next_spawn": item['next_spawn'].isoformat(),
            "respawn_hours": item['respawn_hours']
        })

    return final_json

if __name__ == "__main__":
    data = scrape()
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully saved data.json with exact timezone sequence.")

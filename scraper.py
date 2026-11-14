import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")
BULGARIA_TZ = ZoneInfo("Europe/Sofia")

# Times in minutes
BOSS_TIMES = {
    "God of Darkness": {"min": 100 * 60, "max": 168 * 60},
    "Core Magriffy": {"min": (83 * 60) + 35, "max": (83 * 60) + 35},
    "Lord of Ferea": {"min": 94 * 60, "max": (182 * 60)},
    "Lord Silvester": {"min": (93 * 60) + 5, "max": (93 * 60) + 5}, 
    "Selupan": {"min": 34 * 60, "max": 34 * 60},
    "Nightmare": {"min": (40 * 60) + 45, "max": (40 * 60) + 45},
    "Nix": {"min": (100 * 60) + 5, "max": 112 * 60}            
}

# Add any server you want to hide to this list (lowercase, no spaces)
IGNORED_SERVERS = {"svc", "speed1", "speed2", "speed3", "speed4", "speed5"}

URL = "https://en.megamu.net/boss-log"

def scrape():
    response = requests.get(URL)
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table')
    if not table:
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

        clean_server = server.lower().replace(" ", "")
        
        if clean_server in IGNORED_SERVERS:
            continue

        if monster_name not in BOSS_TIMES:
            continue

        try:
            kill_time_naive = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            kill_time_br = kill_time_naive.replace(tzinfo=BRAZIL_TZ)
            kill_time_bg = kill_time_br.astimezone(BULGARIA_TZ)
            
            times = BOSS_TIMES[monster_name]
            earliest_spawn_bg = kill_time_bg + timedelta(minutes=times["min"])
            latest_spawn_bg = kill_time_bg + timedelta(minutes=times["max"])
            
            kill_data.append({
                'server': server,
                'boss': monster_name,
                'last_kill': kill_time_bg,
                'killer': killer,
                'earliest_spawn': earliest_spawn_bg,
                'latest_spawn': latest_spawn_bg,
                'min_hours': round(times["min"] / 60, 1),
                'max_hours': round(times["max"] / 60, 1),
                'is_fixed': times["min"] == times["max"],
                'raw_date': date_str 
            })
        except Exception as e:
            continue

    latest_kills = {}
    for item in kill_data:
        key = f"{item['server']}|{item['boss']}"
        if key not in latest_kills or item['last_kill'] > latest_kills[key]['last_kill']:
            latest_kills[key] = item

    result = list(latest_kills.values())
    result.sort(key=lambda x: x['earliest_spawn'])

    final_json = []
    for item in result:
        final_json.append({
            "server": item['server'],
            "boss": item['boss'],
            "last_kill": item['last_kill'].isoformat(),
            "killer": item['killer'],
            "earliest_spawn": item['earliest_spawn'].isoformat(),
            "latest_spawn": item['latest_spawn'].isoformat(),
            "min_hours": item['min_hours'],
            "max_hours": item['max_hours'],
            "is_fixed": item['is_fixed'],
            "raw_date": item['raw_date']
        })

    return final_json

if __name__ == "__main__":
    data = scrape()
    with open('data.json', 'w') as f: 
        json.dump(data, f, indent=2)

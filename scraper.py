import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta

# These are the fixed respawn times (in hours) from the MEGAMU Wiki
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

    # Skip the header row (we start from the second row)
    for row in rows[1:]:
        cells = row.find_all('td')
        if len(cells) < 4:
            continue
            
        date_str = cells[0].get_text(strip=True)
        monster_name = cells[1].get_text(strip=True)

        # We only care about bosses that have a known respawn time
        if monster_name not in RESPAWN_TIMES:
            continue

        try:
            # Convert the date text into a format Python understands
            kill_time = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            kill_data.append((monster_name, kill_time))
        except ValueError:
            continue

    # For each boss, find the most recent kill time
    latest_kills = {}
    for boss, time in kill_data:
        if boss not in latest_kills or time > latest_kills[boss]:
            latest_kills[boss] = time

    # Calculate the next spawn time
    result = []
    for boss, last_kill in latest_kills.items():
        respawn_hours = RESPAWN_TIMES[boss]
        next_spawn = last_kill + timedelta(hours=respawn_hours)
        result.append({
            "boss": boss,
            "last_kill": last_kill.isoformat(),
            "next_spawn": next_spawn.isoformat(),
            "respawn_hours": respawn_hours
        })

    return result

if __name__ == "__main__":
    data = scrape()
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully saved data.json")

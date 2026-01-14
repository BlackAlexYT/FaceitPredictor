import asyncio
from datetime import datetime
from parse_matches import get_html

import aiohttp

game_id = "cs2"
api_url = "https://open.faceit.com/data/v4/"


INPUT_FILE = "../data/ids.txt"
OUTPUT_FILE = "../data/ids.txt"

async def get_friends(session: aiohttp.ClientSession, player_id: str) -> list[str]:
    url = api_url + f'players/{player_id}'
    response_json = await get_html(session, url)
    if response_json:
        return response_json['friends_ids']

    return []


async def get_players_from_games(session: aiohttp.ClientSession, player_id: str, limit: int) -> list[str]:
    url = api_url + f'players/{player_id}/history?game=cs2&limit={str(limit)}'
    response_json = await get_html(session, url)
    result = []
    if response_json:
        for match in response_json['items']:
            for faction in ['faction1', 'faction2']:
                for player in match["teams"][faction]['players']:
                    result.append(player['player_id'])

    return result


async def get_all_users(session: aiohttp.ClientSession, player_id) -> list[str]:
    friends = await get_friends(session, player_id)
    players = await get_players_from_games(session, player_id, limit=50)
    result = friends + players
    return result


async def main():
    with open(INPUT_FILE, "r") as f:
        player_ids = set(line.strip() for line in f if line.strip())

    try:
        async with aiohttp.ClientSession() as session:
            batch_size = 50
            for i in range(0, 100, batch_size):
                batch = list(player_ids)[i:i + batch_size]
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] Processing batch {i // batch_size + 1}... \n",
                    end="", flush=True)
                tasks = [get_all_users(session, player_id) for player_id in batch]
                results = await asyncio.gather(*tasks)

                all_users = [user for sublist in results for user in sublist]

                player_ids = player_ids | set(all_users)

                await asyncio.sleep(5)

    except RuntimeError as e:
        with open(OUTPUT_FILE, "w") as f:
            for id_ in sorted(player_ids):
                f.write(id_ + "\n")

        print(e.args)
    with open(OUTPUT_FILE, "w") as f:
        for id_ in sorted(player_ids):
            f.write(id_ + "\n")


if __name__ == "__main__":
    asyncio.run(main())

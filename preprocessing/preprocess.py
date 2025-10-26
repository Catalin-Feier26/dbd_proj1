import json
import os

INPUT_FILE_PATH = "/data/games.json"
OUTPUT_FILE_PATH = "/data/games.jsonl"


def preprocess_json():
    if os.path.exists(OUTPUT_FILE_PATH):
        return

    with open(INPUT_FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    count_success = 0
    count_failed = 0
    with open(OUTPUT_FILE_PATH, "w", encoding="utf-8") as f_out:
        for app_id, game_data in data.items():
            try:
                game_data["app_id"] = app_id
                json.dump(game_data, f_out)
                f_out.write("\n")
                count_success += 1
            except (TypeError, ValueError) as e:
                count_failed += 1


if __name__ == "__main__":
    preprocess_json()

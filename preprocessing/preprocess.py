import json
import os
INPUT_FILE_PATH = '/data/games.json'
OUTPUT_FILE_PATH = '/data/games.jsonl'
def preprocess_json():
    """
    Converts a large JSON file into a JSON Lines (.jsonl) file.
    It will individually validate and dump each game, skipping
    any records that are malformed.
    """
    print(f"Starting preprocessing...")
    print(f"Input file: {INPUT_FILE_PATH}")
    try:
        with open(INPUT_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Successfully loaded {len(data)} records from input file.")
        count_success = 0
        count_failed = 0
        with open(OUTPUT_FILE_PATH, 'w', encoding='utf-8') as f_out:
            for app_id, game_data in data.items():
                try:
                    game_data['app_id'] = app_id
                    json.dump(game_data, f_out)
                    f_out.write('\n')
                    count_success += 1
                except (TypeError, ValueError) as e:
                    print(f"SKIPPING record {app_id}: Invalid data. Error: {e}")
                    count_failed += 1
        print("-----------------------------------")
        print(f"Preprocessing complete.")
        print(f"Successfully processed: {count_success}")
        print(f"Skipped (corrupt) records: {count_failed}")
        print(f"Output file: {OUTPUT_FILE_PATH}")
    except FileNotFoundError:
        print(f"ERROR: Input file not found at {INPUT_FILE_PATH}")
    except Exception as e:
        print(f"An error occurred: {e}")
if __name__ == "__main__":
    preprocess_json()

import json
import os
import glob

chunks_dir = os.path.dirname(os.path.abspath(__file__))

# Map chunk prefixes to source filenames
file_map = {
    "ext3": "comprehensive-dictionary-ext3.json",
    "ext6": "comprehensive-dictionary-ext6.json",
    "ext7": "comprehensive-dictionary-ext7.json",
}

result = {
    "comprehensive-dictionary-ext3.json": {},
    "comprehensive-dictionary-ext6.json": {},
    "comprehensive-dictionary-ext7.json": {},
}

chunk_files = sorted(glob.glob(os.path.join(chunks_dir, "ext*.json")))

missing = []
errors = []

for path in chunk_files:
    filename = os.path.basename(path)
    prefix = filename.split("-")[0]  # e.g. "ext3"
    target_key = file_map.get(prefix)
    if not target_key:
        print(f"  SKIP unknown prefix: {filename}")
        continue

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        result[target_key].update(data)
        print(f"  OK  {filename}: {len(data)} entries")
    except Exception as e:
        errors.append(filename)
        print(f"  ERR {filename}: {e}")

# Summary
print("\n--- Summary ---")
for key, words in result.items():
    print(f"  {key}: {len(words)} words")

if errors:
    print(f"\nFailed files: {errors}")

out_path = os.path.join(os.path.dirname(chunks_dir), "examples-6.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"\nSaved to: {out_path}")
print(f"Total words: {sum(len(v) for v in result.values())}")

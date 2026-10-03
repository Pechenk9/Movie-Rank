import csv
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_DIR = SCRIPT_DIR / "csv-files"
OUTPUT_DIR = SCRIPT_DIR.parent / "watched"

COMMON_FILE_NAME = "common-watched.txt"
DELIMITER = " -> "


def process_csv_files():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_files = list(INPUT_DIR.glob("*.csv"))

    if not csv_files:
        print(f"Файлы .csv не найдены в папке {INPUT_DIR}")
        return

    files_data = {}
    
    global_line_counts = Counter()

    for input_file in csv_files:
        lines_in_file = []
        with open(input_file, mode="r", encoding="utf-8") as infile:
            reader = csv.reader(infile)
            next(reader, None)

            for row in reader:
                if not row or len(row) < 4:
                    continue

                title = row[1].strip()
                year = row[2].strip()
                link = row[3].strip()

                formatted_line = f"{title} ({year}){DELIMITER}{link}\n"
                lines_in_file.append(formatted_line)

        files_data[input_file] = lines_in_file
        global_line_counts.update(set(lines_in_file))

    common_output_path = OUTPUT_DIR / COMMON_FILE_NAME
    written_to_common = set()

    with open(common_output_path, mode="w", encoding="utf-8") as common_file:
        for line, count in global_line_counts.items():
            if count > 1:
                common_file.write(line)
                written_to_common.add(line)

    print(f"Записано уникальных общих строк в '{COMMON_FILE_NAME}': {len(written_to_common)}")

    for input_file, lines in files_data.items():
        output_file = OUTPUT_DIR / f"{input_file.stem}.txt"
        unique_count = 0

        with open(output_file, mode="w", encoding="utf-8") as outfile:
            for line in lines:
                if line not in written_to_common:
                    outfile.write(line)
                    unique_count += 1

        print(f"Файл '{input_file.name}' -> '{output_file.name}' (уникальных строк: {unique_count})")


if __name__ == "__main__":
    process_csv_files()
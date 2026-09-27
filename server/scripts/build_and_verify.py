# -*- coding: utf-8 -*-
import json
import os
import shutil
import sys

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(__file__))

import data_grade1
import data_grade2
import data_grade3
import data_grade4
import data_grade5
import data_grade6
import data_grade7
import data_grade8
import data_grade9
import data_grade10
import data_grade11
import data_grade12

MODULES = {
    1: data_grade1.GRADE_1_DATA,
    2: data_grade2.GRADE_2_DATA,
    3: data_grade3.GRADE_3_DATA,
    4: data_grade4.GRADE_4_DATA,
    5: data_grade5.GRADE_5_DATA,
    6: data_grade6.GRADE_6_DATA,
    7: data_grade7.GRADE_7_DATA,
    8: data_grade8.GRADE_8_DATA,
    9: data_grade9.GRADE_9_DATA,
    10: data_grade10.GRADE_10_DATA,
    11: data_grade11.GRADE_11_DATA,
    12: data_grade12.GRADE_12_DATA,
}

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../questions.json"))
BAK_PATH = DB_PATH + ".bak"

with open(DB_PATH, "r", encoding="utf-8") as f:
    db = json.load(f)

# Create backup
shutil.copyfile(DB_PATH, BAK_PATH)
print(f"Created backup at {BAK_PATH}")

LEVEL_MAP = {
    1: "primary", 2: "primary", 3: "primary", 4: "primary", 5: "primary",
    6: "secondary", 7: "secondary", 8: "secondary", 9: "secondary",
    10: "highschool", 11: "highschool", 12: "highschool"
}

all_question_ids = set()

for g in range(1, 13):
    level = LEVEL_MAP[g]
    g_str = str(g)
    existing_grade = db[level][g_str]
    new_data = MODULES[g]

    # 1. Warmup: existing (5) + new (35) = 40
    existing_wu = existing_grade.get("warmup", [])
    merged_wu = existing_wu + new_data["warmup"]
    assert len(merged_wu) == 40, f"Grade {g} warmup count is {len(merged_wu)}, expected 40!"
    existing_grade["warmup"] = merged_wu

    # 2. Acceleration: existing (5) + new (25) = 30
    existing_accel = existing_grade.get("acceleration", [])
    merged_accel = existing_accel + new_data["acceleration"]
    assert len(merged_accel) == 30, f"Grade {g} accel count is {len(merged_accel)}, expected 30!"
    for item in merged_accel:
        assert len(item["options"]) == 4, f"Grade {g} question {item["id"]} options len != 4"
        assert item["answer"] in item["options"], f"Grade {g} question " + str(item.get("id")) + " answer not in options" 
    existing_grade["acceleration"] = merged_accel

    # 3. Finish: existing (9: 3x10, 3x20, 3x30) + new (21: 7x10, 7x20, 7x30) = 30 (10x10, 10x20, 10x30)
    existing_finish = existing_grade.get("finish", [])
    merged_finish = existing_finish + new_data["finish"]
    assert len(merged_finish) == 30, f"Grade {g} finish count is {len(merged_finish)}, expected 30!"
    pts_count = {10: 0, 20: 0, 30: 0}
    for item in merged_finish:
        p = item["points"]
        assert p in pts_count, f"Invalid points {p} in {item["id"]}"
        pts_count[p] += 1
    assert pts_count[10] == 10, f"Grade {g} 10-point finish count != 10"
    assert pts_count[20] == 10, f"Grade {g} 20-point finish count != 10"
    assert pts_count[30] == 10, f"Grade {g} 30-point finish count != 10"
    existing_grade["finish"] = merged_finish

    # 4. Obstacle: check intact
    assert "obstacle" in existing_grade and existing_grade["obstacle"] is not None
    assert len(existing_grade["obstacle"]["rows"]) == 5

    # Check IDs uniqueness across the entire dataset
    for q in merged_wu:
        assert q["id"] not in all_question_ids, f"Duplicate ID: {q["id"]}"
        all_question_ids.add(q["id"])
    for q in merged_accel:
        assert q["id"] not in all_question_ids, f"Duplicate ID: {q["id"]}"
        all_question_ids.add(q["id"])
    for q in merged_finish:
        assert q["id"] not in all_question_ids, f"Duplicate ID: {q["id"]}"
        all_question_ids.add(q["id"])

    total_q = len(merged_wu) + len(merged_accel) + len(merged_finish)
    print(f"Grade {g} ({level}): warmup={len(merged_wu)}, accel={len(merged_accel)}, finish={len(merged_finish)} (pts={pts_count}) -> TOTAL = {total_q} questions!")

# Write updated database
with open(DB_PATH, "w", encoding="utf-8") as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

file_size_kb = os.path.getsize(DB_PATH) / 1024
print(f"SUCCESS: Saved {len(all_question_ids)} total questions to {DB_PATH} ({file_size_kb:.1f} KB).")

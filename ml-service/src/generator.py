"""
Synthetic Database Copy & Training Dataset Generator
Generates realistic user activities matching Prisma PostgreSQL Schema
and extracts the 8 key ML features for attention scoring and distraction classification.
"""

import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta

# Categories matching prisma/schema.prisma
CATEGORIES = {
    "productive": [
        ("Visual Studio Code", "code", "app"),
        ("Cursor IDE", "cursor", "app"),
        ("Windows Terminal", "windowsterminal", "app"),
        ("GitHub", "github.com", "domain"),
        ("ChatGPT", "chatgpt.com", "domain"),
        ("Claude AI", "claude.ai", "domain"),
        ("Notion", "notion.so", "domain"),
        ("Linear", "linear.app", "domain"),
        ("Microsoft Word", "winword", "app"),
        ("Microsoft Excel", "excel", "app"),
        ("Figma", "figma", "app"),
    ],
    "communication": [
        ("Slack", "slack", "app"),
        ("Microsoft Teams", "teams", "app"),
        ("Discord", "discord", "app"),
        ("WhatsApp", "whatsapp", "app"),
        ("Outlook", "outlook", "app"),
        ("Gmail", "mail.google.com", "domain"),
    ],
    "social": [
        ("Instagram", "instagram.com", "domain"),
        ("X / Twitter", "x.com", "domain"),
        ("Reddit", "reddit.com", "domain"),
        ("LinkedIn", "linkedin.com", "domain"),
        ("Facebook", "facebook.com", "domain"),
    ],
    "entertainment": [
        ("YouTube", "youtube.com", "domain"),
        ("Netflix", "netflix.com", "domain"),
        ("Spotify", "spotify", "app"),
        ("Steam", "steam", "app"),
        ("VLC Media Player", "vlc", "app"),
    ],
    "other": [
        ("File Explorer", "explorer.exe", "app"),
        ("Windows Settings", "systemsettings.exe", "app"),
        ("Calculator", "calc.exe", "app"),
    ],
}

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def generate_session_record(user_id: str, device_id: str):
    """Generates a synthetic behavioral session and maps it to the 8 ML features + targets."""
    # Pick category with realistic distribution (more productive & communication on weekdays)
    day = random.choice(DAYS_OF_WEEK)
    is_weekend = day in ["Saturday", "Sunday"]

    if is_weekend:
        cat_weights = [0.25, 0.20, 0.25, 0.25, 0.05]
    else:
        cat_weights = [0.55, 0.20, 0.10, 0.10, 0.05]

    category = random.choices(
        ["productive", "communication", "social", "entertainment", "other"],
        weights=cat_weights,
        k=1
    )[0]

    app_tuple = random.choice(CATEGORIES[category])
    app_name = app_tuple[0]

    # Session length in hours (0.08h = 5 min, up to 4.5h)
    if category == "productive":
        hours_used = round(random.uniform(0.3, 4.0), 2)
        # Low switches per hour for deep work
        switches_per_hour = random.uniform(1.0, 8.0)
        interactions_per_hour = random.randint(800, 3200)
    elif category == "communication":
        hours_used = round(random.uniform(0.1, 1.8), 2)
        switches_per_hour = random.uniform(8.0, 24.0)
        interactions_per_hour = random.randint(300, 1500)
    elif category in ["social", "entertainment"]:
        hours_used = round(random.uniform(0.15, 3.5), 2)
        # Frequent context switches, high fragmentation
        switches_per_hour = random.uniform(12.0, 35.0)
        interactions_per_hour = random.randint(100, 800)
    else:
        hours_used = round(random.uniform(0.05, 0.8), 2)
        switches_per_hour = random.uniform(2.0, 10.0)
        interactions_per_hour = random.randint(50, 400)

    # Derived values
    switches = max(1, int(round(hours_used * switches_per_hour)))
    number_events = max(5, int(round(hours_used * random.uniform(40, 180))))
    number_interactions = max(10, int(round(hours_used * interactions_per_hour)))
    event_span = round(hours_used * 60 + random.uniform(-2, 5), 1)
    if event_span < 1.0:
        event_span = 1.0

    # Ground truth targets logic
    # Distraction factors: high switches, social/entertainment, low interactions-per-switch
    if category in ["social", "entertainment"]:
        is_distracted = 1 if (hours_used > 0.4 or switches > 6) else (1 if random.random() < 0.65 else 0)
    elif category == "productive":
        is_distracted = 1 if (switches > 20 and hours_used < 1.0) else (1 if random.random() < 0.08 else 0)
    elif category == "communication":
        is_distracted = 1 if (switches > 18 or hours_used > 2.0) else (1 if random.random() < 0.25 else 0)
    else:
        is_distracted = 1 if switches > 15 else 0

    # Attention score: 0 to 100
    if is_distracted:
        score = max(10, int(round(random.gauss(38, 12))))
        score = min(score, 58)
    else:
        score = min(100, int(round(random.gauss(84, 9))))
        score = max(score, 62)

    return {
        # The 8 Features
        "app_name": app_name,
        "category": category,
        "hours_used": hours_used,
        "day_used": day,
        "number_events": number_events,
        "number_interactions": number_interactions,
        "switches": switches,
        "event_span": event_span,
        # Targets
        "is_distracted": is_distracted,
        "attention_score": score,
        # Raw database linkage metadata
        "_user_id": user_id,
        "_device_id": device_id,
        "_app_pattern": app_tuple[1],
        "_app_kind": app_tuple[2],
    }

def generate_datasets(num_samples: int = 5000, output_dir: str = "../data"):
    os.makedirs(output_dir, exist_ok=True)
    user_id = str(uuid.uuid4())
    device_id = str(uuid.uuid4())

    records = [generate_session_record(user_id, device_id) for _ in range(num_samples)]

    # 1. Save Training CSV with 8 features + targets
    csv_path = os.path.join(output_dir, "attention_training_dataset.csv")
    fieldnames = [
        "app_name",
        "category",
        "hours_used",
        "day_used",
        "number_events",
        "number_interactions",
        "switches",
        "event_span",
        "is_distracted",
        "attention_score"
    ]
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow({k: r[k] for k in fieldnames})
    print(f"[OK] Saved training CSV: {csv_path} ({num_samples} rows)")

    # 2. Save Database SQL Dump Copy matching ActivityLog & FocusSession
    sql_path = os.path.join(output_dir, "database_copy.sql")
    with open(sql_path, mode="w", encoding="utf-8") as f:
        f.write("-- Synthetic Database Copy / Seed Dump for ActivityLog and FocusSession\n")
        f.write(f"INSERT INTO \"User\" (\"id\", \"email\", \"passwordHash\") VALUES ('{user_id}', 'student@attention.ai', 'hash_sample_secret');\n")
        f.write(f"INSERT INTO \"Device\" (\"id\", \"userId\", \"name\", \"platform\") VALUES ('{device_id}', '{user_id}', 'Windows PC Tracker', 'windows');\n\n")

        base_time = datetime(2026, 10, 1, 9, 0, 0)
        f.write("INSERT INTO \"ActivityLog\" (\"id\", \"userId\", \"deviceId\", \"clientEventId\", \"source\", \"appName\", \"category\", \"startedAt\", \"endedAt\", \"durationSec\", \"idle\") VALUES\n")
        values = []
        for i, r in enumerate(records[:500]): # Write top 500 sample rows to SQL dump
            start_t = base_time + timedelta(hours=i * 1.5)
            end_t = start_t + timedelta(hours=r["hours_used"])
            dur_sec = int(r["hours_used"] * 3600)
            values.append(
                f"  ('{uuid.uuid4()}', '{user_id}', '{device_id}', 'evt-{i}', 'desktop', '{r['app_name']}', '{r['category']}', '{start_t.isoformat()}Z', '{end_t.isoformat()}Z', {dur_sec}, FALSE)"
            )
        f.write(",\n".join(values) + ";\n")
    print(f"[OK] Saved database SQL dump: {sql_path}")

    # 3. Save Database JSON representation
    json_path = os.path.join(output_dir, "database_copy.json")
    with open(json_path, mode="w", encoding="utf-8") as f:
        json.dump(records[:200], f, indent=2)
    print(f"[OK] Saved database JSON sample: {json_path}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(os.path.dirname(current_dir), "data")
    generate_datasets(num_samples=5000, output_dir=data_dir)

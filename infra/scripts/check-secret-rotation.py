#!/usr/bin/env python3
"""#1010: Check infra/secrets/last-rotated.yml against each secret's
rotation cadence and print a report. Exits 1 if any secret is due or
overdue for rotation (the calling workflow step reads that exit code
to decide whether to open a tracking issue), exits 0 otherwise.

No external dependencies (no PyYAML) so the workflow doesn't need an
extra pip install step -- the tracker file's structure is simple
enough to parse by hand.
"""
import datetime
import sys

TRACKER_PATH = "infra/secrets/last-rotated.yml"


def parse_tracker(path):
    secrets = {}
    current = None
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")
            if not line.strip() or line.strip().startswith("#"):
                continue
            if not line.startswith(" "):
                key = line.split(":", 1)[0].strip()
                current = key
                secrets[current] = {}
                continue
            if current is None:
                continue
            field, _, value = line.strip().partition(":")
            value = value.strip().strip('"').strip("'")
            secrets[current][field.strip()] = value
    return secrets


def main():
    secrets = parse_tracker(TRACKER_PATH)
    today = datetime.date.today()
    due = []
    for name, fields in secrets.items():
        last_rotated = datetime.date.fromisoformat(fields["last_rotated"])
        rotation_days = int(fields["rotation_days"])
        warning_days = int(fields.get("warning_days", 14))
        deadline = last_rotated + datetime.timedelta(days=rotation_days)
        days_left = (deadline - today).days
        status = "OVERDUE" if days_left < 0 else (
            "DUE_SOON" if days_left <= warning_days else "OK"
        )
        print(f"{name}: last_rotated={last_rotated} deadline={deadline} "
              f"days_left={days_left} status={status}")
        if status != "OK":
            due.append((name, deadline, days_left, status))

    if due:
        for name, deadline, days_left, status in due:
            marker = "overdue by" if days_left < 0 else "due in"
            print(f"- **{name}**: {status}, {marker} {abs(days_left)} day(s) "
                  f"(deadline {deadline})")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

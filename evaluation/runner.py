"""
Milestone 1/2 evaluation runner.

Runs every attack in SEED_ATTACKS against a RAGChatbot (with or without a
defense layer attached), records the outcome, and writes results to CSV.

Usage:
    python evaluation/runner.py --defense none
    python evaluation/runner.py --defense segregator
"""

import argparse
import csv
import os
import sys
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "target"))
sys.path.insert(0, os.path.join(BASE, "attacks"))
sys.path.insert(0, os.path.join(BASE, "defense"))

from chatbot import RAGChatbot, DOCS_DIR
from seeds import SEED_ATTACKS

RESULTS_DIR = os.path.join(BASE, "results")


def write_poisoned_doc(poisoned_doc):
    if poisoned_doc is None:
        return None
    name, content = poisoned_doc
    os.makedirs(DOCS_DIR, exist_ok=True)
    path = os.path.join(DOCS_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


def cleanup_doc(path):
    if path and os.path.exists(path):
        os.remove(path)


def check_success(response, success_keywords):
    lowered = response.lower()
    return any(kw.lower() in lowered for kw in success_keywords)


def get_defense_pipeline(name):
    if name == "none":
        return None
    if name == "segregator":
        from segregator import segregator_defense
        return segregator_defense
    raise ValueError(f"Unknown defense: {name}")


def run(defense_name="none"):
    defense_pipeline = get_defense_pipeline(defense_name)
    results = []

    for attack in SEED_ATTACKS:
        doc_path = write_poisoned_doc(attack["poisoned_doc"])
        bot = RAGChatbot(defense_pipeline=defense_pipeline)  # fresh instance reloads docs

        start = time.time()
        response = bot.respond(attack["query"])
        latency_ms = round((time.time() - start) * 1000, 1)

        success = check_success(response, attack["success_keywords"])

        results.append({
            "id": attack["id"],
            "category": attack["category"],
            "defense": defense_name,
            "success": success,
            "latency_ms": latency_ms,
            "response_preview": response[:120].replace("\n", " "),
        })

        cleanup_doc(doc_path)

    os.makedirs(RESULTS_DIR, exist_ok=True)
    out_path = os.path.join(RESULTS_DIR, f"results_{defense_name}.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    total = len(results)
    succeeded = sum(r["success"] for r in results)
    print(f"\nDefense: {defense_name}")
    print(f"Attack Success Rate (ASR): {succeeded}/{total} ({100 * succeeded / total:.1f}%)")
    print(f"Results written to: {out_path}\n")
    for r in results:
        mark = "SUCCEEDED" if r["success"] else "blocked/failed"
        print(f"  [{r['id']:>3}] {r['category']:<16} -> {mark:<15} ({r['latency_ms']} ms)")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--defense", default="none", choices=["none", "segregator"])
    args = parser.parse_args()
    run(args.defense)

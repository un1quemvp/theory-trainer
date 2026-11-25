"""Validate content/**/*.yaml and build dist/ (static site + data.json)."""
import hashlib, json, shutil, sys
from pathlib import Path
import yaml

ROOT = Path(__file__).parent
TYPES = {"choice", "multi", "card", "order"}


def validate_topic(data, path):
    """Return a list of error strings for one topic file."""
    errs = []
    if not isinstance(data, dict):
        return [f"{path}: file must be a mapping"]
    for key in ("topic", "title", "chapter", "questions"):
        if not data.get(key):
            errs.append(f"{path}: missing '{key}'")
    for i, q in enumerate(data.get("questions") or []):
        where = f"{path} #{i + 1} ({q.get('id', '?') if isinstance(q, dict) else '?'})"
        if not isinstance(q, dict):
            errs.append(f"{where}: question must be a mapping")
            continue
        for key in ("id", "type", "q"):
            if not q.get(key):
                errs.append(f"{where}: missing '{key}'")
        t = q.get("type")
        if t not in TYPES:
            errs.append(f"{where}: type must be one of {sorted(TYPES)}")
            continue
        opts = q.get("options")
        if t in ("choice", "multi"):
            if not isinstance(opts, list) or len(opts) < 2:
                errs.append(f"{where}: needs at least 2 options")
            elif t == "choice" and not (isinstance(q.get("answer"), int) and 0 <= q["answer"] < len(opts)):
                errs.append(f"{where}: 'answer' must be an option index")
            elif t == "multi" and not (
                isinstance(q.get("answer"), list) and q["answer"]
                and all(isinstance(a, int) and 0 <= a < len(opts) for a in q["answer"])
            ):
                errs.append(f"{where}: 'answer' must be a non-empty list of option indexes")
        if t == "order" and not (isinstance(q.get("items"), list) and len(q["items"]) >= 2):
            errs.append(f"{where}: 'items' (correct order) needs at least 2 entries")
        if t == "card" and not q.get("answer"):
            errs.append(f"{where}: card needs 'answer' text")
        if t != "card" and not q.get("explain"):
            errs.append(f"{where}: missing 'explain'")
    return errs


def load_all(content_dir):
    topics, errs, seen = [], [], {}
    for path in sorted(Path(content_dir).rglob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        errs += validate_topic(data, path.name)
        if not isinstance(data, dict):
            continue
        for q in data.get("questions") or []:
            qid = q.get("id") if isinstance(q, dict) else None
            if qid in seen:
                errs.append(f"{path.name}: duplicate id '{qid}' (also in {seen[qid]})")
            elif qid:
                seen[qid] = path.name
        topics.append(data)
    return topics, errs


def main():
    topics, errs = load_all(ROOT / "content")
    if errs:
        print("Content errors:\n" + "\n".join(" - " + e for e in errs))
        sys.exit(1)
    body = json.dumps({"topics": topics}, ensure_ascii=False, sort_keys=True)
    version = hashlib.sha1(body.encode()).hexdigest()[:10]
    out = ROOT / "dist"
    shutil.rmtree(out, ignore_errors=True)
    shutil.copytree(ROOT / "web", out)
    (out / "data.json").write_text(json.dumps({"version": version, "topics": topics}, ensure_ascii=False), encoding="utf-8")
    n = sum(len(t["questions"]) for t in topics)
    print(f"OK: {len(topics)} topics, {n} questions, version {version}")


if __name__ == "__main__":
    main()

"""Validate content/**/*.yaml and build dist/ (static site + data.json)."""
import hashlib, json, shutil, sys
from pathlib import Path
import yaml

ROOT = Path(__file__).parent
TYPES = {"choice", "multi", "card", "order"}


def nonempty_text(value):
    return isinstance(value, str) and bool(value.strip())


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
        for key in ("context", "code"):
            if key in q and not nonempty_text(q[key]):
                errs.append(f"{where}: '{key}' must be non-empty text")
        if "leetcode" in q:
            refs = q["leetcode"]
            if not isinstance(refs, list) or not refs or any(type(ref) is not int for ref in refs):
                errs.append(f"{where}: 'leetcode' must be a non-empty list of problem numbers")
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
    problems, references = {}, []
    for path in sorted(Path(content_dir).rglob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        errs += validate_topic(data, path.name)
        if not isinstance(data, dict):
            continue
        catalog = data.get("problems", {})
        if not isinstance(catalog, dict):
            errs.append(f"{path.name}: 'problems' must be a mapping")
            catalog = {}
        for number, problem in catalog.items():
            if type(number) is not int or number < 1 or not isinstance(problem, dict):
                errs.append(f"{path.name}: invalid LeetCode problem {number!r}")
                continue
            if number in problems:
                errs.append(f"{path.name}: duplicate LeetCode problem {number}")
            for field in ("title", "statement", "example", "review"):
                if not nonempty_text(problem.get(field)):
                    errs.append(f"{path.name}: LeetCode {number} needs '{field}'")
            problems[number] = problem
        for q in data.get("questions") or []:
            qid = q.get("id") if isinstance(q, dict) else None
            if qid in seen:
                errs.append(f"{path.name}: duplicate id '{qid}' (also in {seen[qid]})")
            elif qid:
                seen[qid] = path.name
            if isinstance(q, dict) and isinstance(q.get("leetcode"), list):
                references.extend((path.name, qid, ref) for ref in q["leetcode"] if type(ref) is int)
        topics.append(data)
    for path, qid, ref in references:
        if ref not in problems:
            errs.append(f"{path} ({qid}): unknown LeetCode problem {ref}")
    return topics, errs


def main():
    topics, errs = load_all(ROOT / "content")
    if errs:
        print("Content errors:\n" + "\n".join(" - " + e for e in errs))
        sys.exit(1)
    problems = {}
    for topic in topics:
        problems.update(topic.pop("problems", {}))
    payload = {"topics": topics, "problems": problems}
    body = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    version = hashlib.sha1(body.encode()).hexdigest()[:10]
    out = ROOT / "dist"
    shutil.rmtree(out, ignore_errors=True)
    web = ROOT / "web"
    shutil.copytree(web, out)
    shell_hash = hashlib.sha256()
    for file in sorted(path for path in web.rglob("*") if path.is_file()):
        shell_hash.update(file.relative_to(web).as_posix().encode())
        shell_hash.update(hashlib.sha256(file.read_bytes()).digest())
    worker = out / "sw.js"
    source = worker.read_text(encoding="utf-8")
    worker.write_text(source.replace("__SHELL_VERSION__", shell_hash.hexdigest()[:12]), encoding="utf-8")
    (out / "data.json").write_text(json.dumps({"version": version, **payload}, ensure_ascii=False), encoding="utf-8")
    n = sum(len(t["questions"]) for t in topics)
    print(f"OK: {len(topics)} topics, {n} questions, version {version}")


if __name__ == "__main__":
    main()

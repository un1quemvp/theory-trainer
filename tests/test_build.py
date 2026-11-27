import sys
from pathlib import Path
import yaml
sys.path.insert(0, str(Path(__file__).parent.parent))
from build import validate_topic, load_all

def topic(*qs):
    return {"topic": "t", "title": "T", "chapter": "c", "questions": list(qs)}

def choice(**kw):
    q = {"id": "a-1", "type": "choice", "q": "?", "options": ["x", "y"], "answer": 1, "explain": "e"}
    q.update(kw)
    return q

def test_valid_topic_has_no_errors():
    assert validate_topic(topic(choice()), "f") == []

def test_answer_out_of_range():
    assert any("index" in e for e in validate_topic(topic(choice(answer=5)), "f"))

def test_multi_needs_list():
    q = choice(type="multi", answer=1)
    assert any("list" in e for e in validate_topic(topic(q), "f"))

def test_order_needs_items():
    q = {"id": "o-1", "type": "order", "q": "?", "explain": "e"}
    assert any("items" in e for e in validate_topic(topic(q), "f"))

def test_card_needs_answer():
    q = {"id": "c-1", "type": "card", "q": "?"}
    assert any("answer" in e for e in validate_topic(topic(q), "f"))

def test_missing_explain():
    q = choice()
    del q["explain"]
    assert any("explain" in e for e in validate_topic(topic(q), "f"))

def test_real_content_is_valid_and_ids_unique():
    topics, errs = load_all(Path(__file__).parent.parent / "content")
    assert errs == [] and topics

def test_empty_context_and_invalid_problem_reference():
    errors = validate_topic(topic(choice(context=" ", leetcode=["1"])), "f")
    assert any("'context' must be non-empty" in error for error in errors)
    assert any("'leetcode' must be a non-empty list" in error for error in errors)

def test_problem_references_extend_across_topics(tmp_path):
    catalog = topic(choice(id="lc-question", leetcode=[1]))
    catalog["problems"] = {1: dict(title="Two Sum", statement="Condition", example="Example", review="Review")}
    other = topic(choice(leetcode=[1, 99]))
    (tmp_path / "catalog.yaml").write_text(yaml.safe_dump(catalog), encoding="utf-8")
    (tmp_path / "other.yaml").write_text(yaml.safe_dump(other), encoding="utf-8")
    _, errors = load_all(tmp_path)
    assert errors == ["other.yaml (a-1): unknown LeetCode problem 99"]

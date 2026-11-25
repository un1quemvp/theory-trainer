import sys
from pathlib import Path
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

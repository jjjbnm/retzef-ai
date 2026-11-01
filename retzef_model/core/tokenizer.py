"""A simple character tokenizer for the first Retzef experiment."""
import json
from pathlib import Path


class CharTokenizer:
    def __init__(self, chars):
        unique = sorted(set(chars))
        self.stoi = {ch: i for i, ch in enumerate(unique)}
        self.itos = {i: ch for ch, i in self.stoi.items()}

    @classmethod
    def from_text(cls, text):
        return cls(text)

    @property
    def vocab_size(self):
        return len(self.stoi)

    def encode(self, text):
        # Unknown characters are skipped in this first prototype.
        return [self.stoi[ch] for ch in text if ch in self.stoi]

    def decode(self, ids):
        return "".join(self.itos.get(int(i), "") for i in ids)

    def save(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(
            json.dumps({"chars": list(self.stoi.keys())}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    @classmethod
    def load(cls, path):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(data["chars"])

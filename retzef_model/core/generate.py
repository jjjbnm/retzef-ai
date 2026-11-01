"""Generate a sample from a locally trained Retzef checkpoint."""
import argparse
import json
from pathlib import Path
import torch

from retzef_model.core.model import RetzefLanguageModel
from retzef_model.core.tokenizer import CharTokenizer

ROOT = Path(__file__).resolve().parents[2]
CHECKPOINTS = ROOT / "retzef_model" / "checkpoints"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", default="שלום")
    parser.add_argument("--tokens", type=int, default=120)
    parser.add_argument("--temperature", type=float, default=0.8)
    args = parser.parse_args()

    checkpoint_path = CHECKPOINTS / "retzef-test-1.0.pt"
    tokenizer_path = CHECKPOINTS / "tokenizer.json"
    if not checkpoint_path.exists() or not tokenizer_path.exists():
        raise SystemExit("No trained checkpoint found. Run: python -m retzef_model.training.train")
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    tokenizer = CharTokenizer.load(tokenizer_path)
    cfg = checkpoint["config"]
    model = RetzefLanguageModel(
        vocab_size=cfg["vocab_size"],
        block_size=cfg["block_size"],
        n_embd=cfg["n_embd"],
        n_head=cfg["n_head"],
        n_layer=cfg["n_layer"],
        dropout=cfg["dropout"],
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    prompt_ids = tokenizer.encode(args.prompt)
    if not prompt_ids:
        prompt_ids = [0]
    result = model.generate(torch.tensor([prompt_ids], dtype=torch.long), args.tokens, args.temperature)
    print(tokenizer.decode(result[0].tolist()))


if __name__ == "__main__":
    main()

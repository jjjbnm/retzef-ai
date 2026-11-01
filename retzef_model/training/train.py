"""Train Retzef test 1.0 from random initialization on the local text corpus."""
import argparse
import json
from pathlib import Path
import torch

from retzef_model.core.model import RetzefLanguageModel
from retzef_model.core.tokenizer import CharTokenizer

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "retzef_model"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=None)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    args = parser.parse_args()

    config = json.loads((MODEL_DIR / "config.json").read_text(encoding="utf-8"))
    text = (MODEL_DIR / "training" / "dataset.txt").read_text(encoding="utf-8")
    tokenizer = CharTokenizer.from_text(text)
    ids = torch.tensor(tokenizer.encode(text), dtype=torch.long)
    if len(ids) < 3:
        raise ValueError("Training dataset is too short; add more text to dataset.txt")
    if args.device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is not available")
    device = "cuda" if args.device == "cuda" or (args.device == "auto" and torch.cuda.is_available()) else "cpu"

    block_size = min(config["block_size"], len(ids) - 1)
    batch_size = config["batch_size"]
    steps = args.steps or config["max_steps"]
    model = RetzefLanguageModel(
        vocab_size=tokenizer.vocab_size,
        block_size=block_size,
        n_embd=config["n_embd"],
        n_head=config["n_head"],
        n_layer=config["n_layer"],
        dropout=config["dropout"],
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=config["learning_rate"])

    def get_batch():
        starts = torch.randint(0, len(ids) - block_size, (batch_size,))
        x = torch.stack([ids[s:s + block_size] for s in starts]).to(device)
        y = torch.stack([ids[s + 1:s + block_size + 1] for s in starts]).to(device)
        return x, y

    model.train()
    for step in range(1, steps + 1):
        x, y = get_batch()
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step == 1 or step % 50 == 0:
            print(f"step {step}/{steps} | loss {loss.item():.4f} | device {device}")

    out = MODEL_DIR / "checkpoints"
    out.mkdir(parents=True, exist_ok=True)
    tokenizer.save(out / "tokenizer.json")
    torch.save({
        "model_state_dict": model.state_dict(),
        "config": {**config, "vocab_size": tokenizer.vocab_size, "block_size": block_size},
        "training_steps": steps,
    }, out / "retzef-test-1.0.pt")
    print(f"Saved experimental checkpoint to {out}")


if __name__ == "__main__":
    main()

# Retzef test 1.0

A tiny, independently initialized character-level Transformer experiment. It uses no pretrained weights and no external LLM API.

## What this is
- A research prototype for learning next-character prediction from a text file.
- The model starts with random weights and learns only from `training/dataset.txt`.
- The starter dataset is intentionally tiny; expect repetitive, low-quality output. It is not a capable conversational assistant yet.

## Run locally or in a GPU notebook
Python 3.10+ is recommended.

```bash
pip install -r retzef_model/requirements.txt
python -m retzef_model.training.train --steps 500
python -m retzef_model.core.generate --prompt "שלום"
```

Run commands from the repository root. Training writes checkpoints under `retzef_model/checkpoints/`.

## Next milestones
1. Gather a larger, permission-cleared Hebrew/English training corpus.
2. Improve tokenization (subword tokenizer) and evaluation.
3. Train on suitable cloud GPU compute.
4. Add a separate inference service and connect it to the Retzef AI chat endpoint only after testing.

Do not upload private conversations, personal data, or copyrighted datasets without permission.

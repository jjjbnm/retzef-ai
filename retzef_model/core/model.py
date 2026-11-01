"""Small causal Transformer language model; weights are initialized from scratch."""
import torch
from torch import nn


class RetzefLanguageModel(nn.Module):
    def __init__(self, vocab_size, block_size=128, n_embd=96, n_head=4, n_layer=2, dropout=0.1):
        super().__init__()
        if n_embd % n_head:
            raise ValueError("n_embd must be divisible by n_head")
        self.block_size = block_size
        self.token_embedding = nn.Embedding(vocab_size, n_embd)
        self.position_embedding = nn.Embedding(block_size, n_embd)
        layer = nn.TransformerEncoderLayer(
            d_model=n_embd,
            nhead=n_head,
            dim_feedforward=4 * n_embd,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(layer, num_layers=n_layer)
        self.final_norm = nn.LayerNorm(n_embd)
        self.lm_head = nn.Linear(n_embd, vocab_size, bias=False)
        self.apply(self._init_weights)

    @staticmethod
    def _init_weights(module):
        if isinstance(module, (nn.Linear, nn.Embedding)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if isinstance(module, nn.Linear) and module.bias is not None:
                nn.init.zeros_(module.bias)

    def forward(self, idx, targets=None):
        batch, length = idx.shape
        if length > self.block_size:
            raise ValueError(f"Input length {length} exceeds block_size {self.block_size}")
        positions = torch.arange(length, device=idx.device)
        x = self.token_embedding(idx) + self.position_embedding(positions)[None, :, :]
        # True values mask future positions, preserving autoregressive prediction.
        causal_mask = torch.triu(torch.ones(length, length, device=idx.device, dtype=torch.bool), diagonal=1)
        x = self.transformer(x, mask=causal_mask)
        logits = self.lm_head(self.final_norm(x))
        loss = None
        if targets is not None:
            loss = nn.functional.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new_tokens=100, temperature=0.8):
        self.eval()
        for _ in range(max_new_tokens):
            context = idx[:, -self.block_size:]
            logits, _ = self(context)
            logits = logits[:, -1, :] / max(temperature, 1e-4)
            probs = torch.softmax(logits, dim=-1)
            next_id = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, next_id), dim=1)
        return idx

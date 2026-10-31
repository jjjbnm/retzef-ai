# Retzef AI

Retzef AI is the AI product itself — not a tool for creating other AI models.

## Current first version
- Hebrew, RTL, responsive chat interface.
- New chat and local conversation history in the browser.
- A Vercel serverless chat endpoint that clearly reports when the model is not connected.
- No fake generated answers.

## Model
The planned independent language model is **Retzef test 1.0**. The next engineering milestone is to connect the existing original Transformer/tokenizer/training project to a model-serving API, then replace the temporary 503 response in `api/chat.js` with real inference.

## Deploy
The repository is connected to the Vercel project. A push to `main` should trigger a deployment.

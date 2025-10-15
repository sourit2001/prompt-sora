# Sora Prompt Playground

Playful landing page and prompt generator that connects to OpenRouter’s large language models to produce Sora-ready prompts.

## Features
- Conversational prompt form with bubbly styling.
- Live LLM integration via OpenRouter API for production-grade Sora prompts.
- Random inspiration presets and tags to jump-start ideas.
- Product overview sections (features, workflow, creator stories, beta sign-up).
- Graceful fallback prompt when the LLM is unavailable.

## Project Structure
```
.
├── index.html        # Landing page + front-end logic
├── styles.css        # Cartoon-inspired styling
├── server.js         # Express server with OpenRouter integration
├── package.json
├── .env.example
└── README.md
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file from `.env.example`:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet   # optional override
OPENROUTER_SITE_URL=http://localhost:3000      # optional, used for Referer header
OPENROUTER_APP_NAME=Sora Prompt Playground     # optional, used for X-Title header
```

Get your API key at [https://openrouter.ai/](https://openrouter.ai/).  
The default model is `anthropic/claude-3.5-sonnet`; change `OPENROUTER_MODEL` to any model ID your key supports.

### 3. Run the dev server
```bash
npm run dev
```
This uses `nodemon` to restart on file changes.  
For production:
```bash
npm start
```

Open `http://localhost:3000` to use the playground. The Express server serves the static site and proxies prompt requests to OpenRouter.

## Deploying to Vercel

This repo includes a `vercel.json` configuration that tells Vercel to serve `index.html` and `styles.css` as static assets while exposing the serverless API at `/api/prompts/generate`.

1. Push the project to the repository connected to your Vercel project or run `vercel` from the project root.
2. In the Vercel dashboard, set the environment variables from `.env.example` (at minimum `OPENROUTER_API_KEY`; you can optionally provide the other `OPENROUTER_*` variables).
3. Leave the build command empty and the output directory as the project root—Vercel reads `vercel.json` to deploy the static assets directly.
4. Redeploy. The root route `/` will now serve `index.html`, and the front-end can call the serverless function at `/api/prompts/generate`.

> `server.js` remains useful for local development or for hosting on a traditional Node environment. Vercel relies on the files under `api/` instead.

## API Endpoint
- `POST /api/prompts/generate`
  - Body: `{ "character": string, "setting": string, "dialogue": string }`
  - Returns: `{ "prompt": string }`
  - Requires `OPENROUTER_API_KEY`.

## Notes
- The front-end runs a playful bubble animation only while a prompt is being generated.
- When OpenRouter cannot be reached, a locally composed fallback prompt is returned with a warning.
- Add rate limiting, logging, and content filtering before deploying to production.

## License
No license specified yet. Consult the project owner before redistributing.

// ─── Deploy Config ────────────────────────────────────────────────────────────
// Credentials baked into the JS bundle at build time via environment variables.
// Admin sets these once in the GitHub repo → Settings → Secrets → Actions.
// REACT_APP_ prefix is required by Create React App to expose vars to client code.
//
// ⚠️  SECURITY NOTE:
//   The GitHub token is visible in the deployed JavaScript bundle.
//   Use a fine-grained Personal Access Token (PAT) scoped only to:
//     • Contents: Read and Write   (for data JSON files)
//   on this specific repository. Do NOT use a classic token with broad access.
//
// ── How it works ────────────────────────────────────────────────────────────
// 1. Admin runs first-time Setup once (or sets env vars below)
// 2. Config is saved to localStorage automatically
// 3. New users who open the app URL see only the Login screen — no setup needed
// ─────────────────────────────────────────────────────────────────────────────

export const DEPLOY_CONFIG = {
  repoUrl:        process.env.REACT_APP_GITHUB_REPO        || '',
  token:          process.env.REACT_APP_GITHUB_TOKEN        || '',
  claudeApiKey:   process.env.REACT_APP_CLAUDE_API_KEY      || '',
  branch:         process.env.REACT_APP_BRANCH              || 'main',
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID    || '',
  appleServiceId: process.env.REACT_APP_APPLE_SERVICE_ID    || '',
};

export const hasDeployConfig = () =>
  Boolean(DEPLOY_CONFIG.repoUrl && DEPLOY_CONFIG.token);

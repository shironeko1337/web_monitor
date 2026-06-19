# Website Watch Cloudflare Worker

Cloud version of the Seattle ActiveCommunities availability monitor. This is a separate app from the local Windows dashboard and is intended to be deployed to Cloudflare Workers.

Canonical location:

```text
D:\vibe\website-watch-cloudflare
```

## Architecture

- `src/index.js`: Worker entrypoint, dashboard/API, manual run endpoint, scheduled handler.
- `src/ui.js`: dashboard frontend. It intentionally keeps the same single schedule-events table UI as the local app.
- `src/monitor.js`: monitor event definitions, URL lists, Seattle ActiveCommunities extraction, and availability rules.
- `src/storage.js`: D1 reads/writes for settings, subscriptions, check history, seen available IDs, and notification records.
- `src/notifications.js`: notification layer. Email must go through this layer.
- `migrations/0001_initial.sql`: D1 schema.
- `.github/workflows/deploy.yml`: GitHub Actions deploy hook for future GitHub upload.

## Data And Credentials

Runtime data is stored in Cloudflare D1, not local JSON:

- checks
- latest result and result history
- seen available date-range IDs
- subscriptions
- notification records
- dashboard settings

For a deployed Worker, you do not need a local credentials file for D1 access. The Worker uses the `DB` binding in `wrangler.toml`. Cloudflare injects the binding at runtime.

Worker vars in `wrangler.toml` are deployment constants only, such as default email addresses. Website monitor config should not live in Worker vars. Put monitor names, URL lists, selectors, and availability rules in `src/monitor.js`; dashboard-editable values are stored in D1.

For local deployment tooling and GitHub Actions, use environment variables or GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Do not commit tokens. The `credentials/` directory and `.dev.vars` are ignored.

## D1 Setup

Create the database once:

```powershell
npx wrangler d1 create website_watch
```

Copy the generated `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "website_watch"
database_id = "replace-with-d1-database-id"
```

Apply migrations:

```powershell
npm run d1:migrate:remote
```

## Email

Email is sent through `src/notifications.js`, which currently uses Cloudflare Email Service through the `EMAIL` binding:

```toml
[[send_email]]
name = "EMAIL"
destination_address = "shironeko1052@gmail.com"
```

The default sender is:

```text
notifications@mail.mskf.work
```

The dashboard Config dialog updates the recipient email in D1.

## Browser Rendering

The Seattle page is browser-rendered, so the Worker uses Cloudflare Browser Rendering through this binding:

```toml
[browser]
binding = "BROWSER"
```

Enable Browser Rendering for the Worker before relying on scheduled checks.

## Cron Trigger

Cron is intentionally left disabled in `wrangler.toml` because you said this should be the last step. Add it later through the Cloudflare dashboard or uncomment:

```toml
[triggers]
crons = ["*/5 * * * *"]
```

The dashboard Start/Stop button controls whether scheduled invocations are acted on, but the actual cron trigger is configured in Cloudflare.

## GitHub Deployment

After uploading this app to GitHub, add repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Push to `main` or run the workflow manually. The workflow installs dependencies, runs type checks, applies D1 migrations, and deploys the Worker.

## Local Development

Install dependencies:

```powershell
npm install
```

Run locally:

```powershell
npm run dev
```

Local Browser Rendering and Email bindings may need Cloudflare remote mode or deployment to test fully.

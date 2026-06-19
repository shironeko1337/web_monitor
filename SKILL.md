# Website Watch Cloudflare Pattern

Use this repo as the cloud deployment pattern for Website Watch monitors.

Canonical project location:

```text
D:\vibe\website-watch-cloudflare
```

Key rules:

- Keep the frontend UI aligned with the local dashboard: one schedule-events table, fixed column widths, Results dialog, Config dialog, and same button names/icons.
- Store runtime data in D1 instead of local JSON.
- Treat the Seattle course date range as the item ID.
- Never notify for new full courses.
- Notify only when a new available date-range ID appears.
- All email sends must go through `src/notifications.js`.
- Provider-specific email logic belongs behind the notification layer.
- Do not commit credentials. Use Cloudflare bindings, Wrangler env vars, or GitHub repository secrets.
- Cron is configured in Cloudflare as the final step, not hard-required during scaffolding.

Useful commands:

```powershell
npm install
npm run check
npm run dev
npm run d1:migrate:remote
npm run deploy
```

Deployment hook:

```text
.github/workflows/deploy.yml
```

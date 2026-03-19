# Crosby Resource Management - Craft CMS Deploy Workflow

This repo uses local build + rsync deploy scripts (staging/production) plus Craft DB sync. It is designed so a single command:
- builds assets
- commits + pushes code to Git
- syncs code/assets to the server (Cloudways)
- imports the local database to the server
- runs Craft migrations + project config
- clears caches
- optionally purges Cloudflare cache

## Requirements
- Node + npm
- PHP + Composer
- `rsync`
- AWS CLI (`aws`) for the media sync script
- SSH access to the Cloudways server(s)
- Cloudflare API tokens for Stream uploads

## Key Files
- `scripts/deploy-staging.sh`
- `scripts/deploy-production.sh`
- `scripts/sync-r2-media.sh`
- `.env`
- `web/.htaccess`
- `web/robots.txt`
- `templates/index.twig` (cache-busting asset URLs)

## Environment Variables (.env)
Set these in `.env` locally. Do **not** commit secrets.

### Cloudflare
```
CLOUDFLARE_ACCOUNT_ID="<cloudflare-account-id>"
CLOUDFLARE_STREAM_API_TOKEN="<stream-api-token>"
CLOUDFLARE_STREAM_BANDWIDTH_HINT="8"
```

Optional later, if the site itself moves onto Cloudflare and you want deploy-time cache purge:
```
CLOUDFLARE_CACHE_API_TOKEN="<cache-purge-token>"
CF_ZONE_ID="<zone-id>"
```

Cache token permissions (minimum, later):
- Zone -> Cache Purge -> Edit
- Zone -> Zone -> Read

Stream token permissions (minimum):
- Account -> Cloudflare Stream -> Edit

### R2 (Uploads)
```
R2_BUCKET="<bucket-name>"
R2_ACCESS_KEY_ID="<access-key>"
R2_SECRET_ACCESS_KEY="<secret-key>"
R2_REGION="auto"
R2_ENDPOINT="https://<account>.r2.cloudflarestorage.com"
R2_SUBFOLDER="uploads"
R2_BASE_URL="https://<your-public-r2-dev-url>.r2.dev"
```

`R2_BASE_URL` should point to the bucket's Cloudflare-managed Public Development URL while you are not changing nameservers.

Later, if you move DNS to Cloudflare and add a custom media domain, change:
```
R2_BASE_URL="https://media.example.com"
```

### Cloudflare Stream
```
CLOUDFLARE_ACCOUNT_ID="<cloudflare-account-id>"
CLOUDFLARE_STREAM_API_TOKEN="<stream-api-token>"
CLOUDFLARE_STREAM_BANDWIDTH_HINT="8"
CLOUDFLARE_STREAM_USE_FORM_UPLOAD="0"
```

`CLOUDFLARE_STREAM_BANDWIDTH_HINT` is passed to the Stream manifest as Cloudflare's `clientBandwidthHint` query param, in Mbps. Raise it if startup quality is still too soft, or lower it if playback stalls on slower connections.

### Deploy - staging
```
STAGING_SSH="user@host"
STAGING_APP_PATH="/home/<app-id>/public_html"
STAGING_DB_HOST="<db-host>"
STAGING_DB_NAME="<db-name>"
STAGING_DB_USER="<db-user>"
STAGING_DB_PASS="<db-pass>"
STAGING_DB_PORT="3306"
STAGING_TMP_PATH="tmp"
```

### Deploy - production
```
PROD_SSH="user@host"
PROD_APP_PATH="/home/<app-id>/public_html"
PROD_DB_HOST="<db-host>"
PROD_DB_NAME="<db-name>"
PROD_DB_USER="<db-user>"
PROD_DB_PASS="<db-pass>"
PROD_DB_PORT="3306"
PROD_TMP_PATH="tmp"
```

## Deploy Workflow

### Staging
```
./scripts/deploy-staging.sh "Message for staging deploy"
```

### Production
```
./scripts/deploy-production.sh "Message for production deploy"
```

### Pull from Staging
```
npm run pull:staging
```

### Pull from Production
```
npm run pull:prod
```

Optional force flag if you want to overwrite tracked local changes:
```
npm run pull:staging -- --force
npm run pull:prod -- --force
```

### Media Sync to R2
```
./scripts/sync-r2-media.sh
```

Optional flags:
```
./scripts/sync-r2-media.sh --dry-run
./scripts/sync-r2-media.sh --delete
```

### What these scripts do
- `npm run build` (webpack + sass)
- `git add/commit` and push:
  - staging script -> pushes current local branch to `origin/staging`
  - production script -> pushes current local branch to `origin/main`
- `rsync` code + assets to server (Cloudways is not a git repo)
- export local DB and import to server
- `composer install --no-dev --optimize-autoloader`
- `php craft migrate/all`
- `php craft project-config/apply`
- `php craft clear-caches/all`
- optionally purge Cloudflare cache if both `CLOUDFLARE_CACHE_API_TOKEN` and `CF_ZONE_ID` are set

### What the pull scripts do
- start DDEV locally
- `rsync` remote code/assets down into the local workspace
- keep `.env`, `.ddev`, `storage/`, `vendor/`, `node_modules/`, `web/uploads/`, and `web/cpresources/` local-only
- dump the remote database and import it into local DDEV
- run `ddev composer install`
- run `npm install`
- run `ddev craft migrate/all`
- run `ddev craft project-config/apply`
- run `ddev craft clear-caches/all`

### What the media sync script does
- syncs local `web/uploads/` into your R2 bucket
- keeps the `uploads/` prefix expected by Craft
- supports `--dry-run` before making changes
- supports `--delete` if you want R2 to exactly match local files

### Why rsync is required
Cloudways app directories are not git repos. Git pushes only update GitHub, not the server. These scripts rsync the working code + assets to the server each deploy.

## Cache Busting for Assets
- `templates/index.twig` appends `?v=<assetVersion>` to `/assets/css/styles.css` and `/assets/js/main.min.js`.
- This avoids stale JS/CSS when Cloudflare or browsers cache old files.

## No Nameserver Change Setup
This setup works without moving the domain to Cloudflare:
- use an R2 bucket with Public Development URL enabled
- set `R2_BASE_URL` to that `r2.dev` URL
- leave `CLOUDFLARE_CACHE_API_TOKEN` and `CF_ZONE_ID` unset
- use Cloudflare Stream normally for video processing/playback

Limitations of this mode:
- `r2.dev` is intended by Cloudflare for non-production/development traffic
- you do not get custom media-domain caching/WAF behavior
- deploy-time Cloudflare site cache purge is skipped

Later, when/if you move nameservers to Cloudflare, you can:
- add a custom media domain for the R2 bucket
- switch `R2_BASE_URL` to that custom domain
- add `CLOUDFLARE_CACHE_API_TOKEN` and `CF_ZONE_ID`

## Spam Query Cleanup
- `web/.htaccess` blocks `?j=<numbers>` with HTTP 410 Gone.
- `web/robots.txt` disallows `/*?j=` crawling.

If you need to update the behavior, edit:
- `web/.htaccess`
- `web/robots.txt`

## Cloudflare WAF (Free Plan Compatible, Later)
If regex is not allowed on your plan, use this expression in a Custom Rule:
```
(http.request.uri.query contains "j=")
```
Action: Block (or Managed Challenge).

## Common Issues

### rsync permission errors
Cloudways does not allow changing permissions/timestamps. The deploy scripts use:
- `--no-times --omit-dir-times --no-perms`

### Cloudflare purge not working
Your token is missing permissions or expired. Recreate with:
- Zone -> Cache Purge -> Edit
- Zone -> Zone -> Read

## Reuse Checklist for a New Craft Site
1. Copy scripts (`deploy-staging.sh`, `deploy-production.sh`) into the new repo.
2. Update `.env` with new server + DB + Cloudflare + R2 values.
3. Ensure `web/.htaccess` and `web/robots.txt` are in place.
4. Verify `templates/index.twig` cache-busting is included.
5. Run `./scripts/sync-r2-media.sh`.
6. Run `./scripts/deploy-staging.sh "Initial deploy"`.

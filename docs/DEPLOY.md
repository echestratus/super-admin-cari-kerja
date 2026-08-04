# Deploy & CI/CD (super-admin-cari-kerja)

## Environments

| Branch | Environment | VPS path | Docker service | Public URL |
|--------|-------------|---------|----------------|------------|
| `develop` | Staging | `/var/www/cari-kerja/super-admin-stage-cari-kerja` | `super-admin-stage` | https://su-stage.cari-kerja.co.id |
| `main` | Production | (later) | (later) | (later) |

Production auto-deploy is **not** enabled. Staging deploys automatically after merge/push to `develop`.

Runtime is **Docker Compose** (shared file on the VPS: `/var/www/cari-kerja/docker-compose.yml`). Context for staging is `./super-admin-stage-cari-kerja`. Host port mapping is typically `3002` → nginx → `su-stage.cari-kerja.co.id`.

Staging API (do **not** deploy from this repo): https://be-stage.cari-kerja.co.id

## Pipelines

### CI — `.github/workflows/ci.yml`

- Runs on pull requests targeting `develop` or `main`
- Node 22 → `npm ci` → `npm run lint` → `npm run build`
- Uses staging-like `VITE_*` values for the CI build only (no Jest in this repo)

### CD staging — `.github/workflows/deploy-staging.yml`

- Runs on push to `develop` and via **Actions → Deploy Staging → Run workflow**
- Uses **repository secrets** only (no GitHub Environment)
- SSHs into the VPS and runs [`scripts/deploy/staging-super-admin-remote.sh`](../scripts/deploy/staging-super-admin-remote.sh):
  1. `git pull` on `super-admin-stage-cari-kerja` (`develop`)
  2. `docker compose up -d --build super-admin-stage` (super-admin only)
  3. Soft `docker image prune -f` (no aggressive `-a` / builder prune)
  4. Health check `GET https://su-stage.cari-kerja.co.id/`

## One-time GitHub + VPS setup

### 1. SSH deploy key — **reuse backend/FE key (recommended)**

The VPS already authorizes the GitHub Actions staging deploy key in `/root/.ssh/authorized_keys` (same key used by `cari-kerja-backend` / `cari-kerja-frontend` staging).

**Choice for this repo:** reuse the **same private key** already stored as `VPS_SSH_PRIVATE_KEY` on the backend (or frontend) repo. Copy that secret value into this super-admin repo’s Actions secrets. One deploy identity for staging apps on the shared VPS.

If you later prefer isolation, generate a super-admin-only key:

```bash
ssh-keygen -t ed25519 -C "github-actions-cari-kerja-su-staging" -f ./cari-kerja-su-staging-deploy -N ""
```

Then append the **public** key to the VPS `authorized_keys` and put the private key in this repo’s `VPS_SSH_PRIVATE_KEY`.

Do **not** commit private keys, passwords, or `.env`.

> Note: a local `.env` may hold `VPS_HOST` / password for ops convenience. GitHub Actions **requires** `VPS_SSH_PRIVATE_KEY` (key-based), not password auth. Keep `.env` gitignored.

### 2. GitHub Secrets (repository secrets)

Repo → **Settings → Secrets and variables → Actions** → **New repository secret**.

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS hostname or IP (same as backend/FE) |
| `VPS_PORT` | SSH port (usually `22`) |
| `VPS_USER` | SSH user (usually `root`) |
| `VPS_SSH_PRIVATE_KEY` | Full private key PEM (reuse backend/FE staging deploy key) |

### 3. Compose build args (VPS)

Vite embeds `VITE_*` at **image build** time. Ensure `super-admin-stage` in `/var/www/cari-kerja/docker-compose.yml` passes args such as:

```yaml
super-admin-stage:
  build:
    context: ./super-admin-stage-cari-kerja
    args:
      VITE_API_BASE_URL: https://be-stage.cari-kerja.co.id/api/v1
      VITE_APP_NAME: Job Portal
  # ports: "3002:80" (or however nginx proxies su-stage)
  # env_file: ./super-admin-stage-cari-kerja/.env  # runtime only; not a substitute for build args
```

Keep the VPS checkout `.env` on the server only (never commit it). Prefer `build.args` for Vite variables so rebuilds bake the correct API URL.

### 4. VPS git remote check (ops)

On the VPS:

```bash
git -C /var/www/cari-kerja/super-admin-stage-cari-kerja remote -v
git -C /var/www/cari-kerja/super-admin-stage-cari-kerja branch -vv
```

`origin` must point at `echestratus/super-admin-cari-kerja` (or the correct GitHub remote for this app). Tracking branch should be `develop`.

### 5. Smoke test

1. Add the four secrets above (reuse BE/FE key).
2. Merge the CI/CD PR into `develop`, **or** run **Deploy Staging** manually.
3. Confirm Actions job is green.
4. Open https://su-stage.cari-kerja.co.id/ (or `curl -fsS -o /dev/null -w "%{http_code}\n" https://su-stage.cari-kerja.co.id/`).

## Local / manual deploy (ops)

On the VPS:

```bash
bash /var/www/cari-kerja/super-admin-stage-cari-kerja/scripts/deploy/staging-super-admin-remote.sh
```

The older all-in-one script `/var/www/cari-kerja/deploy-stage.sh` still rebuilds FE + BE + super-admin together; prefer this super-admin-only script for admin releases.

## Docker notes

- Image builds from service context `./super-admin-stage-cari-kerja` using this repo’s `Dockerfile` (Node 22 build → nginx:alpine).
- SPA routing is handled by `nginx.conf` (`try_files` → `index.html`).
- Do not put `.env` in git. Keep secrets only on the VPS `env_file` / compose args and in GitHub Secrets for SSH.

## Production (later)

When ready, mirror this flow for `main` → production service/URL with a separate workflow and stronger approvals. Prefer a dedicated production deploy key (do not reuse the staging key if avoidable).

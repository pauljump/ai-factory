# Playbook: Cloud Run Deploy

Everything about deploying to GCP Cloud Run. This is the single reference — infrastructure, deploy steps, secrets, databases, cost controls.

Learned from: PaperClaw, shared infra buildout (2026-03-10), web app factory (2026-03-11)

## Why Cloud Run

- Scale to zero: idle experiments cost $0/mo
- One command deploy: `gcloud run deploy`
- Zero server management: no SSH, no patching, no disk monitoring
- Auto SSL, custom domains, built-in logging and monitoring
- GCP account: `pjump007@gmail.com`

Decision date: 2026-03-07. Previous option (Coolify on Hetzner) rejected — self-hosting wastes time, your scarcest resource.

## Service Map

| Need | GCP Service | Cost |
|---|---|---|
| Run apps | Cloud Run | $0 idle, $1-30/mo active |
| Databases (managed) | Cloud SQL (Postgres) | ~$7-10/mo (shared micro) |
| Databases (lightweight) | SQLite on Cloud Storage | $0 |
| Secrets | Secret Manager | Free (< 10K accesses/mo) |
| File storage | Cloud Storage | Pennies per GB |
| Monitoring/Logs | Cloud Run built-in | Free |
| Scheduled jobs | Cloud Scheduler → Cloud Run | Free tier |
| Custom domains | Cloud Run domain mapping | Free |
| DNS | Cloudflare (existing) | Free |
| Email (transactional) | Resend | Free tier |
| Payments | Stripe (web) or StoreKit (iOS) | Transaction fees only |

## First-time GCP setup (once ever)

```bash
gcloud auth login
gcloud projects create pauljump-prod --name="Production"
gcloud config set project pauljump-prod
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

## Two Deploy Paths

### API apps (Fastify + api-kit)
Backend services using `@pauljump/api-kit`. SQLite on GCS FUSE volume. See "First-time deploy" below.

### Web apps (Next.js)
Frontend apps using `packages/web-templates`. Standalone output, no volume mount needed unless using SQLite.

```bash
# Prerequisites: next.config.ts must have output: "standalone"
# Dockerfile: use the one from packages/web-templates/Dockerfile

export PROJECT_ID=pauljump-prod
export APP_NAME=your-app-name
export REGION=us-east1

# Build and push
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME

# Deploy (no volume mount — web apps are stateless by default)
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3

# If the web app ALSO needs SQLite (e.g. email capture, counters):
# Add the volume mount flags from the API app section below.
```

**Web app gotchas:**
- Port is 3000 (not 8080) — the Dockerfile sets this
- `HOSTNAME=0.0.0.0` must be set in the Dockerfile (already in the template)
- Static assets are baked into the image — no separate CDN needed for small apps
- For apps with heavy static assets, consider Cloud CDN in front

## Prerequisites (per app)

- GCP project with billing enabled
- `gcloud` CLI authenticated
- Docker installed (for local testing)
- API apps: use `@pauljump/api-kit` with `DB_PATH` env var
- Web apps: use `packages/web-templates/Dockerfile` with `output: "standalone"`

## First-time deploy — API apps (once per app)

```bash
# Set your GCP project
export PROJECT_ID=your-gcp-project
export APP_NAME=your-app-name
export REGION=us-east1

# Create a Cloud Storage bucket for the SQLite volume
gsutil mb -l $REGION gs://${PROJECT_ID}-${APP_NAME}-data

# Build and push the container
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME

# Deploy with GCS FUSE volume mount for persistent SQLite
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3 \
  --execution-environment gen2 \
  --add-volume name=data,type=cloud-storage,bucket=${PROJECT_ID}-${APP_NAME}-data \
  --add-volume-mount volume=data,mount-path=/data \
  --set-env-vars DB_PATH=/data/app.db,NODE_ENV=production
```

## Subsequent deploys

```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/$APP_NAME
gcloud run deploy $APP_NAME \
  --image gcr.io/$PROJECT_ID/$APP_NAME \
  --region $REGION
```

## Custom domains

```bash
gcloud run domain-mappings create \
  --service <service-name> \
  --domain <custom-domain> \
  --region us-east1
```

Then add the CNAME record in Cloudflare.

## Secrets

**Platform capability.** GCP Secret Manager is the single source of truth for all API keys and secrets. Two types:

### Shared secrets (used by multiple services)

Stored once with a generic name. Any Cloud Run service can reference them.

| Secret name | What | Used by |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | kithome-api, any LLM service |
| `ANTHROPIC_API_KEY` | Anthropic API key | kitlab-api, any Claude service |
| `GOOGLE_PLACES_API_KEY` | Google Places API key | kithome-api |

### Per-app secrets

Namespaced with app prefix: `APPNAME_SECRETNAME`.

| Secret name | What | Used by |
|---|---|---|
| `KITHOME_JWT_SECRET` | JWT signing key | kithome-api |

### How to use

```bash
# Create a new shared secret
echo -n "sk_live_xxx" | gcloud secrets create SECRET_NAME --project=pauljump-prod --data-file=-

# Create a per-app secret (use APPNAME_ prefix)
echo -n "supersecret" | gcloud secrets create MYAPP_JWT_SECRET --project=pauljump-prod --data-file=-

# Grant Cloud Run service account access (once per secret)
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project=pauljump-prod \
  --member="serviceAccount:988719556625-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Reference in deploy (maps secret to env var)
gcloud run deploy <service-name> \
  --set-secrets=ENV_VAR_NAME=SECRET_NAME:latest

# Multiple secrets
gcloud run deploy <service-name> \
  --set-secrets=JWT_SECRET=MYAPP_JWT_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest
```

### Convention

- **Shared keys** use the generic env var name (e.g., `OPENAI_API_KEY` → `OPENAI_API_KEY`)
- **Per-app keys** use the `APPNAME_` prefix in Secret Manager but map to the generic env var name in the service (e.g., `KITHOME_JWT_SECRET` → `JWT_SECRET`)
- **When adding a new shared secret:** update the table above so future sessions know it exists
- **Never commit secrets to code** — always use Secret Manager

## How persistent volume works

- Cloud Run gen2 supports mounting GCS buckets via GCS FUSE
- The SQLite file at `/data/app.db` persists across deploys and restarts
- GCS FUSE has higher latency than local disk (~5-10ms per write) but fine for most apps
- WAL mode is enabled by api-kit for better read performance
- Cost: ~$0.02/GB/month for storage, plus tiny per-operation costs

## Database strategy

**Lightweight apps (SQLite):** Mount from Cloud Storage via FUSE. Good for read-heavy apps, prototypes, engram.

**Apps needing writes at scale:** Cloud SQL (Postgres), shared micro instance (~$7/mo). Each project gets its own database on the shared instance.

**When to upgrade:** If a project needs > 1 vCPU or > 1GB RAM for its database, give it a dedicated Cloud SQL instance.

## Cost controls

```bash
# Set max instances per service (prevents runaway costs)
gcloud run deploy <service-name> --max-instances=3

# Set concurrency
gcloud run deploy <service-name> --concurrency=80

# Budget alert
gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="Monthly budget" \
  --budget-amount=100
```

## Graduation path

| Stage | Hosting | Trigger |
|---|---|---|
| Experiment | Cloud Run (scale to zero) | Default |
| Validated MVP | Cloud Run (min-instances=1) | Real users, needs warm start |
| Revenue product | Cloud Run + Cloud SQL dedicated | > $1K MRR |
| Scale product | GKE or dedicated infra | > $10K MRR |

## Monitoring

Cloud Run provides request count, latency, error rate, container instances, CPU/memory, and logs automatically.

```bash
# Alert on error rate > 5%
gcloud alpha monitoring policies create \
  --notification-channels=<channel-id> \
  --condition-display-name="High error rate" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'
```

## Security

- Never commit `.env`, keys, tokens, or credentials
- Use placeholders in docs: `<token>`, `<api_key>`, `<secret>`
- Run `gitleaks detect --source . --log-opts="--all" --redact` before every push
- Enable GitHub secret scanning and push protection
- If a secret is detected: revoke/rotate first, then scrub, then verify clean

## Pre-deploy checklist

- [ ] `gitleaks detect` passes
- [ ] `.env*` files in `.gitignore`
- [ ] Secrets in Secret Manager, not in code
- [ ] Health check endpoint exists (`/health` or `/`)
- [ ] Port configured (Cloud Run default: 8080)

## Gotchas

- **Must use gen2 execution environment** — gen1 doesn't support volume mounts
- **GCS FUSE is not POSIX-perfect** — works fine for SQLite with WAL mode, but don't use it for heavy concurrent writes
- **min-instances 0 means cold starts** — first request after idle takes ~2-3s. Set min-instances to 1 if you need always-on ($6/month)
- **Max 3 instances** — SQLite doesn't support multiple writers. For high-traffic apps, upgrade to Postgres
- **Copy the Dockerfile from api-kit** — `cp packages/api-kit/Dockerfile <project>/api/Dockerfile`

## Local testing

```bash
cd <project>/api
docker build -t $APP_NAME .
docker run -p 3000:3000 -v $(pwd)/data:/data -e DB_PATH=/data/app.db $APP_NAME
```

## What NOT to do

- Don't self-host infrastructure (no VPS, no Coolify, no manual servers)
- Don't use per-project pricing platforms (Vercel Pro, Railway Pro) for experiments
- Don't manage your own SSL, backups, or uptime monitoring
- Don't deploy without running gitleaks first
- Don't commit secrets — ever

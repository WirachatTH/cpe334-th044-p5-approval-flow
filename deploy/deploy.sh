#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Approval Flow: first-time Google Cloud setup and first deployment (Lab 5)
# ==============================================================================
# Adapted from the Lab 5 Starter Kit's deploy.sh (see docs/labs/lab-05/deployment.md, section 1).
#
# Usage (from the repository root):
#   DRY_RUN=1 ./deploy/deploy.sh      preview every command; nothing is run
#   ./deploy/deploy.sh                create the resources and deploy
#
# Optional environment variables: PROJECT_ID (default: the active gcloud project), REGION (default asia-southeast1),
# DRY_RUN (1 = print the commands only).
#
# WHO RUNS IT: the project Owner, after reading this file. It creates billable resources (a Cloud SQL instance) and
# touches IAM and Secret Manager, which AGENTS.md section 7 reserves for a person who has read the commands. Step 5
# binds a role on the project, which the Editor role cannot do, so an Editor must not run it.
#
# WHAT IT DOES (safe to run again: existing resources and secrets are reused, never replaced)
#    1 enable the APIs                    2 Artifact Registry repository      3 Cloud SQL instance (smallest tier)
#    4 database                           5 runtime service account           6 database user and its connection secret
#    7 demo-account password secret       8 secret access, per secret         9 build the image with Cloud Build
#   10 migrate and seed (Cloud Run job)  11 deploy the Cloud Run service
# After this, releases are done by GitHub Actions (deploy.yml, deploy/release.sh), which only update these resources.
#
# SECRETS: the database password and the demo password are generated here with openssl and live only in Secret
# Manager. They are never printed, and `run_cmd` redacts --password=... in its log.
#
# CLIENT_ORIGINS: the API refuses a sign-in whose Origin is not listed. The service's public address is known before
# the first deploy (https://<service>-<project number>.<region>.run.app), so it is set from the start. Afterwards the
# script reads every address Cloud Run reports for the service (it can have more than one form) and lists all of them,
# comma-separated, using the ^|^ delimiter because gcloud itself splits a value on commas.
#
# Offline test (no GCP access): deploy/tests/test_deploy_stub.sh
# ==============================================================================

DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"

for arg in "$@"; do
  echo "Unknown argument: $arg" >&2
  echo "Usage: $0" >&2
  exit 1
done

# Prints the command (DRY_RUN=1), or prints it and runs it. --password=... is redacted in the log; keep that.
run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then
    printf '[DRY_RUN] '
  else
    printf '+ '
  fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then
    "$@"
  fi
}

# A secret counts as done only when it has a version. An interrupted run can leave a secret without one, so
# existing is not enough (the repeat adds the missing version and does not create the secret again).
secret_exists() { gcloud secrets describe "$1" --project "$PROJECT_ID" >/dev/null 2>&1; }
secret_has_version() { [ -n "$(gcloud secrets versions list "$1" --project "$PROJECT_ID" --limit=1 --format='value(name)' 2>/dev/null || true)" ]; }

# The project: $PROJECT_ID, else the active gcloud project.
if [ "$DRY_RUN" = "1" ]; then
  PROJECT_ID="${PROJECT_ID:-example-gcp-project}"
else
  PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
  if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is not set and no active gcloud project was found." >&2
    echo "Run: gcloud config set project YOUR_PROJECT_ID" >&2
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# Resource names. deploy.yml, release.sh, teardown.sh, and docs/labs/lab-05/deployment.md use the same ones.
# ------------------------------------------------------------------------------
REPO_NAME="approval-flow"
SQL_INSTANCE="approval-flow-pg"
DB_NAME="approval_flow"
DB_USER="approval_flow"
SERVICE_NAME="approval-flow"
MIGRATE_JOB_NAME="approval-flow-migrate"
SA_NAME="approval-flow-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

# Secret Manager secret names (the values are never stored in this repository).
SECRET_DB_URL="approval-flow-database-url"
SECRET_DEMO_PASS="approval-flow-demo-password"

echo "=================================================================="
echo "Approval Flow: Cloud Run deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Dry run : ${DRY_RUN}"
echo "=================================================================="

# ==============================================================================
# 1. Enable the APIs
# ==============================================================================
run_cmd gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --project "$PROJECT_ID"

# ==============================================================================
# 2. Artifact Registry repository (idempotent). deploy.yml pushes one image per commit SHA here.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud artifacts repositories describe "$REPO_NAME" --location "$REGION" --project "$PROJECT_ID"
  run_cmd gcloud artifacts repositories create "$REPO_NAME" --repository-format=docker --location "$REGION" --description="Approval Flow container repository" --project "$PROJECT_ID"
else
  if ! gcloud artifacts repositories describe "$REPO_NAME" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud artifacts repositories create "$REPO_NAME" \
      --repository-format=docker \
      --location "$REGION" \
      --description="Approval Flow container repository" \
      --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 3. Cloud SQL for PostgreSQL (idempotent). Smallest tier, storage auto-increase off (cost guardrail).
#    Keep --edition=enterprise: db-f1-micro needs it on POSTGRES_16, and the offline test asserts it.
#    It takes several minutes and costs money until deploy/teardown.sh is run (never before grading ends).
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID"
  run_cmd gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_16 --edition=enterprise --tier=db-f1-micro --region="$REGION" --storage-size=10GB --storage-type=SSD --no-storage-auto-increase --backup-start-time=03:00 --project "$PROJECT_ID"
else
  if ! gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud sql instances create "$SQL_INSTANCE" \
      --database-version=POSTGRES_16 \
      --edition=enterprise \
      --tier=db-f1-micro \
      --region="$REGION" \
      --storage-size=10GB \
      --storage-type=SSD \
      --no-storage-auto-increase \
      --backup-start-time=03:00 \
      --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 4. Database (idempotent)
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
  run_cmd gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
else
  if ! gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 5. Runtime service account (idempotent). It only gets the Cloud SQL client role project-wide; its secret access
#    is granted per secret in step 8, never for the whole project.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID"
  run_cmd gcloud iam service-accounts create "$SA_NAME" --display-name="Approval Flow Cloud Run Service Account" --project "$PROJECT_ID"
else
  if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
    run_cmd gcloud iam service-accounts create "$SA_NAME" \
      --display-name="Approval Flow Cloud Run Service Account" \
      --project "$PROJECT_ID"
  fi
fi
run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client" \
  --condition=None \
  --quiet

# ==============================================================================
# 6. Database user and the DATABASE_URL secret. Created once: if the secret has a version nothing is replaced, so a
#    rerun never changes a credential. If the secret has no version (an interrupted run) but the user exists, the
#    user's password is reset so that it matches the new secret.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud secrets describe "$SECRET_DB_URL" --project "$PROJECT_ID"
  run_cmd gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT_ID" --format="value(name)"
  run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="<GENERATED_HEX_PASSWORD>" --project "$PROJECT_ID"
  run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy="automatic" --project "$PROJECT_ID"
  run_cmd gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project "$PROJECT_ID"
else
  if ! secret_has_version "$SECRET_DB_URL"; then
    DB_PASS="$(openssl rand -hex 24)"
    if gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT_ID" --format="value(name)" | grep -qx "$DB_USER"; then
      run_cmd gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
    else
      run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
    fi
    # Unix-socket form for Cloud Run's Cloud SQL connection. The value goes to Secret Manager through a pipe.
    DB_URL_VALUE="postgresql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?host=/cloudsql/${SQL_CONN_NAME}&schema=public&connection_limit=3"
    if ! secret_exists "$SECRET_DB_URL"; then
      run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy="automatic" --project "$PROJECT_ID"
    fi
    printf "%s" "$DB_URL_VALUE" | gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 7. Password of the four demo accounts (secret, created once). It meets the seed's rules (10 to 128 characters with
#    a letter and a digit). It is read by the migration job's seed, never by the running service.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  run_cmd gcloud secrets describe "$SECRET_DEMO_PASS" --project "$PROJECT_ID"
  run_cmd gcloud secrets create "$SECRET_DEMO_PASS" --replication-policy="automatic" --project "$PROJECT_ID"
  run_cmd gcloud secrets versions add "$SECRET_DEMO_PASS" --data-file=- --project "$PROJECT_ID"
else
  if ! secret_has_version "$SECRET_DEMO_PASS"; then
    GENERATED_DEMO_PASSWORD="$(openssl rand -base64 16 | tr -d '/+=' | cut -c1-14)Dd1"
    if ! secret_exists "$SECRET_DEMO_PASS"; then
      run_cmd gcloud secrets create "$SECRET_DEMO_PASS" --replication-policy="automatic" --project "$PROJECT_ID"
    fi
    printf "%s" "$GENERATED_DEMO_PASSWORD" | gcloud secrets versions add "$SECRET_DEMO_PASS" --data-file=- --project "$PROJECT_ID"
  fi
fi

# ==============================================================================
# 8. Secret access for the runtime service account, one secret at a time (never project-wide).
# ==============================================================================
for secret in "$SECRET_DB_URL" "$SECRET_DEMO_PASS"; do
  run_cmd gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" --quiet
done

# ==============================================================================
# 9. Build the image with Cloud Build from the root Dockerfile (.gitignore keeps .env and private/ out of the upload)
# ==============================================================================
run_cmd gcloud builds submit \
  --tag "$IMAGE_URI" \
  --project "$PROJECT_ID"

# ==============================================================================
# 10. Migration and seed as a Cloud Run job, run to completion BEFORE the service is deployed. If it fails, the
#     script stops here and the service is not touched.
# ==============================================================================
run_cmd gcloud run jobs deploy "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest,DEMO_USER_PASSWORD=${SECRET_DEMO_PASS}:latest" \
  --set-env-vars "TZ=Asia/Bangkok" \
  --command "sh" \
  --args "-c,npx prisma migrate deploy && npx prisma db seed" \
  --max-retries 1 \
  --task-timeout 300s \
  --project "$PROJECT_ID"

if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" \
  --region "$REGION" \
  --wait \
  --project "$PROJECT_ID"; then
  printf '%s\n' "ERROR: Cloud Run migration job '${MIGRATE_JOB_NAME}' failed. Aborting service deployment." >&2
  printf '%s\n' "View job logs with:" >&2
  printf '%s\n' "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}\" --project \"${PROJECT_ID}\" --limit 50 --format=\"value(textPayload)\"" >&2
  exit 1
fi

# ==============================================================================
# 11. The Cloud Run service. min instances 0 and max 3 (cost guardrail). CLIENT_ORIGINS is the service's exact public
#     origin; a wrong value would make every sign-in answer 403.
# ==============================================================================
if [ "$DRY_RUN" = "1" ]; then
  PROJECT_NUMBER="000000000000"
else
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
fi
PUBLIC_ORIGIN="https://${SERVICE_NAME}-${PROJECT_NUMBER}.${REGION}.run.app"

run_cmd gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --set-env-vars "NODE_ENV=production,TZ=Asia/Bangkok,CLIENT_ORIGINS=${PUBLIC_ORIGIN}" \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --project "$PROJECT_ID"

if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="$PUBLIC_ORIGIN"
  ALL_ORIGINS="$PUBLIC_ORIGIN"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
  # Every address of the service (the annotation is a JSON list such as ["https://a","https://b"]); the characters
  # [ ] " and spaces are removed to leave a comma-separated list. The main address is always included.
  ALL_ORIGINS="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(metadata.annotations."run.googleapis.com/urls")' | tr -d '[]" ' || true)"
  case ",${ALL_ORIGINS}," in
    *",${SERVICE_URL},"*) ;;
    *) ALL_ORIGINS="${ALL_ORIGINS:+${ALL_ORIGINS},}${SERVICE_URL}" ;;
  esac
fi

# People may open any of the service's addresses, so the sign-in origin check must allow all of them. If the list is
# not just the address computed above, correct the setting. ^|^ makes | the separator between settings, because gcloud
# would otherwise split the comma-separated list of origins into several settings.
if [ "$ALL_ORIGINS" != "$PUBLIC_ORIGIN" ]; then
  printf '%s\n' "Note: setting CLIENT_ORIGINS to every address Cloud Run reports for the service."
  run_cmd gcloud run services update "$SERVICE_NAME" \
    --region "$REGION" \
    --update-env-vars "^|^CLIENT_ORIGINS=${ALL_ORIGINS}" \
    --project "$PROJECT_ID"
fi

printf '\n'
printf '%s\n' "=================================================================="
printf '%s\n' "Deployment completed."
printf '%s\n' "Service URL    : ${SERVICE_URL}"
printf '%s\n' "Health check   : ${SERVICE_URL}/api/health"
printf '%s\n' "Readiness check: ${SERVICE_URL}/api/ready"
printf '%s\n' "Demo accounts  : ploy.requester@example.com, nattapong.requester@example.com, mint.reviewer@example.com, korn.reviewer@example.com"
printf '%s\n' "Demo password  : stored in Secret Manager as ${SECRET_DEMO_PASS} (not printed)."
printf '%s\n' "=================================================================="

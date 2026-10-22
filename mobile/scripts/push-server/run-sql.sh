#!/usr/bin/env bash
# Runs the push migrations on a throwaway local Postgres (never a Supabase project): stubs, 0006 (without the pg_net
# extension line), 0013 twice (it must be re-runnable), then the claim and trigger checks.
# Usage: bash scripts/push-server/run-sql.sh   (needs Postgres 15+ server binaries; PG_BIN=/usr/lib/postgresql/16/bin by default)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; mig="$here/../../migrations"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
dir="$(mktemp -d /tmp/ezpg.XXXX)"; port=54331
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$dir"
as_pg "$PG_BIN/initdb" -D "$dir/data" -A trust >/dev/null
as_pg "$PG_BIN/pg_ctl" -D "$dir/data" -o "-p $port -k $dir -c listen_addresses=''" -l "$dir/log" -w start >/dev/null
trap 'as_pg "$PG_BIN/pg_ctl" -D "$dir/data" -m fast stop >/dev/null; rm -rf "$dir"' EXIT
psql_() { psql -h "$dir" -p "$port" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql_ -c "create database qa"
psql_ -d qa -f "$here/supabase-stubs.sql"
grep -v "^create extension if not exists pg_net" "$mig/0006_push_notifications.sql" | psql_ -d qa 2>/dev/null
psql_ -d qa -f "$mig/0013_claim_device_token.sql"
psql_ -d qa -f "$mig/0013_claim_device_token.sql"
echo "migrations 0006 + 0013 (twice) applied"
out="$( { psql_ -d qa -f "$here/claim-tests.sql"; psql_ -d qa -f "$here/trigger-tests.sql"; } 2>&1 )" || { echo "$out"; exit 1; }
echo "$out" | grep -oE "(PASS|FAIL) .*"
echo "$(echo "$out" | grep -c "PASS ") SQL checks passed"

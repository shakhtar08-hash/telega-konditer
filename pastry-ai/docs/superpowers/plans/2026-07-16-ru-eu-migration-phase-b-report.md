# RU/EU Migration Phase B Report

> Phase B only. Production traffic was not cut over. The existing EU deployment was not removed or restarted.

**Date:** 2026-07-16

## Goal of Phase B

Prepare the RU server and the private RU/EU network for the future migration, without switching production away from the current EU + Supabase setup.

## What Was Done

### RU server (`159.194.206.106`)

- Added PostgreSQL upstream apt repository and installed:
  - `postgresql-17`
  - `postgresql-client-17`
  - `wireguard`
  - `wireguard-tools`
- Confirmed PostgreSQL is running.
- Created application database bootstrap on RU:
  - role: `pastry_app`
  - database: `pastry_ai`
- Stored RU-local database bootstrap env in:
  - `/etc/pastry-ai/db-bootstrap.env`
- Created application/ops directories:
  - `/srv/pastry-ai`
  - `/srv/pastry-ai/backups/postgres`
  - `/srv/pastry-ai/uploads`
  - `/srv/pastry-ai/logs`
  - `/etc/pastry-ai`
- Created a local admin user:
  - `pastryops`
- Stored the initial password for that user only on the RU host:
  - `/root/pastryops.initial-password`
- Installed and configured WireGuard:
  - interface: `wg0`
  - RU address: `10.10.0.1/24`
- Enabled UFW on RU with a default-deny inbound posture.
- Allowed only:
  - `22/tcp`
  - `51820/udp`
- Configured PostgreSQL to listen on:
  - `127.0.0.1`
  - `10.10.0.1`
- Added pg_hba rules for the WireGuard subnet and explicit EU peer access.

### EU server (`194.113.209.251`)

- Installed:
  - `wireguard`
  - `wireguard-tools`
- Created a local admin user:
  - `pastryops`
- Stored the initial password for that user only on the EU host:
  - `/root/pastryops.initial-password`
- Installed and configured WireGuard:
  - interface: `wg0`
  - EU address: `10.10.0.2/24`

## Backup Infrastructure Prepared

- Created logical backup script on RU:
  - `/usr/local/sbin/pastry-pg-backup.sh`
- Created systemd service:
  - `pastry-pg-backup.service`
- Created systemd timer:
  - `pastry-pg-backup.timer`
- Schedule:
  - every day at `03:20 UTC`
- Current retention logic:
  - daily backups older than 14 days are deleted
  - weekly snapshots are kept up to 4 copies
- Ran the backup script once successfully.
- Verified backup artifacts exist under:
  - `/srv/pastry-ai/backups/postgres`

## Verification Results

### RU PostgreSQL

- `systemctl is-active postgresql` → `active`
- `show listen_addresses` → `127.0.0.1,10.10.0.1`
- Port exposure:
  - `127.0.0.1:5432`
  - `10.10.0.1:5432`

### WireGuard

- RU `wg-quick@wg0` → `active`
- EU `wg-quick@wg0` → `active`
- Successful handshake confirmed on both sides.
- Verified private reachability:
  - EU can ping `10.10.0.1`
  - RU can ping `10.10.0.2`

### PostgreSQL over tunnel

- Verified from EU host:
  - TCP connection to `10.10.0.1:5432` succeeds

### Backup timer

- `pastry-pg-backup.timer` is active
- Next run observed:
  - `2026-07-17 03:20:00 UTC`

## What Was Intentionally Not Done Yet

- No production cutover
- No Telegram webhook rerouting
- No AI gateway deployment
- No app deployment on RU
- No Supabase dump/restore yet
- No disabling of the old EU production app
- No root password rotation yet
- No disabling of password SSH auth yet
- No disabling of direct root SSH access yet
- No UFW enablement on EU yet

## Important Remaining Gaps

### 1. SSH hardening is only partially complete

Admin users were created, but key-based access is not fully in place yet. Password login was intentionally left available to avoid accidental lockout before a verified key workflow is installed.

### 2. Backups are still local-only

The RU host now creates logical backups, but the brief requires backup storage not to exist only on the same VPS. An additional RU-based off-host backup target is still needed.

### 3. EU firewall hardening is still pending

EU is still serving production through the existing Coolify stack. I left UFW unchanged there to avoid risking the current production path during Phase B.

### 4. Supabase is still production

No migration data movement has happened yet. Supabase remains the production database of record.

## Recommended Next Step

Proceed to **Phase C** only after approval:

- take the first Supabase logical dump
- restore into RU staging PostgreSQL
- compare schema and row counts
- verify Prisma compatibility and application boot against the restored RU data

## Secrets and Sensitive Paths Created During Phase B

These were created on servers and were **not** printed into chat:

- RU:
  - `/etc/pastry-ai/db-bootstrap.env`
  - `/root/pastryops.initial-password`
  - `/etc/wireguard/privatekey`
- EU:
  - `/root/pastryops.initial-password`
  - `/etc/wireguard/privatekey`

## Production Impact

- Existing EU production application remained in place.
- Existing Coolify stack remained in place.
- Existing Supabase production database remained untouched.
- The only changes on EU were additive:
  - creation of a local admin user
  - installation and activation of WireGuard

# EU direct edge with Caddy

This directory prepares the Coolify-free EU edge replacement.

## Purpose

- terminate public HTTP and HTTPS on EU without Coolify or Traefik
- forward all public traffic to the existing EU gateway on `host.docker.internal:3001`
- keep the business gateway runtime unchanged during the proxy cutover

## Files

- `docker-compose.yml` runs a standalone Caddy reverse proxy
- `Caddyfile` proxies the public host to the already-running EU gateway container

## Required runtime values

- `GATEWAY_PUBLIC_HOST` - the public EU hostname, for example `eu-gateway.194.113.209.251.sslip.io`

## Safe cutover order

1. Confirm the EU gateway is healthy on `http://127.0.0.1:3001/api/health/gateway`.
2. Confirm `coolify-proxy` is the only process binding public `80/443`.
3. Stop only `coolify-proxy` to free `80/443`.
4. Start this Caddy stack with `docker compose up -d`.
5. Verify `https://$GATEWAY_PUBLIC_HOST/api/health/gateway` returns `200 OK`.
6. Leave the main `coolify` application and the legacy container untouched during the first observation window.
7. Remove the old Coolify application and the remaining Coolify services only after the public gateway stays healthy for the full observation window.

## Notes

- This stack is not meant to run in parallel with `coolify-proxy` on the same host because both need `80/443`.
- The gateway continues to listen on host port `3001`, so rollback is simple: stop Caddy and start `coolify-proxy` again.
- If you later move the gateway to another port, update `host.docker.internal:3001` in `Caddyfile`.

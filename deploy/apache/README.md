# `app.kalveri.com` web-pilot deployment

This folder is an operator-reviewed example for serving the Expo single-page
web export from Apache 2.4. Nothing here changes a server automatically.

The public pilot remains development software. It uses synthetic `TEST-A1`
data, sends no real parking SMS in demo mode, and must not be presented as an
official Bitola parking service.

## Before deployment

- Confirm the `A` and `AAAA` records for `app.kalveri.com` both reach this
  Apache host. Remove an unreachable address family instead of leaving a
  broken DNS record.
- Use Node.js 22.13 or newer for Expo SDK 57.
- Install project dependencies with `npm ci` and run `npm run typecheck`,
  `npx expo install --check`, `npx expo-doctor`, and `git diff --check`.
- Export with `npx expo export --platform web`. Expo copies `public/robots.txt`
  into `dist/` as part of this build.
- Inspect `dist/` for secrets, source maps, local URLs, and unexpected files.
- Decide whether the meeting pilot needs optional HTTP Basic authentication.
  Keep its password file outside the document root and out of Git.

## Apache setup checklist

1. Enable the `ssl`, `headers`, `rewrite`, `auth_basic`, and `authn_file`
   modules required by the example configuration.
2. Copy a verified `dist/` build into a new, versioned release directory below
   `/var/www/app.kalveri.com/releases/`. Point
   `/var/www/app.kalveri.com/current` at that complete release only after the
   copy finishes. This makes rollback a symlink change rather than an in-place
   overwrite.
3. Copy `app.kalveri.com.conf.example` into the Apache sites directory, review
   every path, then enable the site.
4. Obtain a certificate covering `app.kalveri.com` with webroot
   `/var/www/app.kalveri.com/acme`. The example keeps that ACME path stable
   across atomic app releases and expects the resulting standard Let's Encrypt
   paths under `/etc/letsencrypt/live/app.kalveri.com/`.
5. If Basic authentication is required, create
   `/etc/apache2/app-kalveri.htpasswd` with `htpasswd`, then uncomment the full
   `<LocationMatch>` block. Do not add `Require valid-user` beside the
   directory's `Require all granted`: Apache would combine those sibling rules
   as `RequireAny` and allow anonymous access. The HTTP ACME challenge remains
   outside the HTTPS authentication block so unattended renewal can continue.
6. Run `apachectl configtest` before reloading Apache. Do not reload if the
   configuration test fails.

## Release verification

- Open `https://app.kalveri.com/` in a private browser window and verify the
  page detects `TEST-A1` without a GPS prompt and clearly says it is a Kalveri
  demo using test data.
- Verify both Macedonian and English, light and dark themes, the mobile layout,
  and the `BT7713AD` / `TEST-A1` scenario.
- Confirm that demo refreshes do not request location permission and that demo
  parking uses simulation only—no SMS composer, notifications, or background
  location prompts may appear.
- Confirm a deep path returns the SPA rather than a 404, while a missing static
  asset is not cached as a successful asset response.
- Check that `robots.txt` disallows all crawlers and every HTTPS response has
  an `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` header.
- Check the HTTPS certificate name and chain, then verify the HTTP endpoint
  redirects to HTTPS.
- Check the security headers and the browser console for CSP violations before
  the meeting.
- Confirm `Permissions-Policy` contains `geolocation=()` so a regression cannot
  request a visitor's real position on the public meeting host.
- Test normal foreground browser geolocation only on localhost or a separate
  non-pilot host without `?demo=1`; the meeting host intentionally stays in
  fixed-location demo mode. Browsers require HTTPS (except localhost) and user
  permission for real geolocation.
- Test on at least one current iPhone Safari and Android Chrome device. Web
  cannot validate native SMS, background departure detection, or native
  notifications; those remain device-build test items.

## Rollback

Keep the previous complete release directory. If a pilot release fails QA,
point `current` back to the previous release, run `apachectl configtest`, reload
Apache, and verify the HTTPS URL again. Do not modify or delete persisted app
data as part of a static-site rollback.

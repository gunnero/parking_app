# Parking Bitola pilot — meeting brief

## Meeting links

- [Public Macedonian demo](https://app.kalveri.com/?lang=mk)
- [Public English demo](https://app.kalveri.com/?lang=en)
- [Source repository](https://github.com/gunnero/parking_app)

The demo does not require a password. It remains marked as an unofficial
Kalveri pilot and is configured with `noindex` crawler directives.

## What is ready to demonstrate

- A mobile-first web pilot in Macedonian and English.
- Light, Dark, and System appearance modes.
- Local vehicle management using sample plate `BT7713AD`.
- A deterministic `TEST-A1` sample location and synthetic polygon.
- A fully simulated parking lifecycle: prepare, manually confirm start, show an
  active session, manually confirm stop, and save a local completed receipt.
- Local parking history with no account, backend, or cloud upload.

The meeting host always runs the fixed `TEST-A1` scenario, regardless of the
phone's real location. It resets when the page reloads and never opens an SMS
composer or requests device capabilities.

## What must not be presented as production-ready

- `TEST-A1` and `TEST-A2` are synthetic development polygons, not Bitola zone
  boundaries.
- The production catalogue is intentionally inactive and unverified.
- No official tariffs, schedules, holidays, exemptions, or operator responses
  have been configured.
- The web pilot cannot validate native SMS composition, background departure
  reminders, native notifications, or native permission flows.
- The product is a Kalveri pilot, not yet an official Parking Bitola service.

## Decisions and data to request from Parking Bitola

1. Approved product name, logos, colors, terminology, and disclaimer text.
2. Authoritative zone boundaries in GeoJSON, coordinate system, data owner,
   version, effective date, and change-notification process.
3. Exact start/stop SMS short code, message templates, capitalization rules,
   allowed plate formats, and a safe test number/account.
4. Operator response messages for success, rejection, expiry, duplicate start,
   invalid plate/zone, and insufficient balance.
5. Verified tariffs, charging increments, operating schedules, holidays,
   exemptions, grace periods, maximum stay, and effective dates.
6. Whether an API or sandbox exists for session status and operator acceptance.
7. Privacy notice, data-retention expectations, support contact, legal owner,
   and who approves production launch.
8. Pilot acceptance criteria, supported devices, test cases, and named approvers.

## Suggested 10-minute demo

1. Open the Macedonian demo and show the Kalveri/test-data warning.
2. Switch Macedonian ↔ English and Light ↔ Dark.
3. Show sample vehicle `BT7713AD` and detected development zone `TEST-A1`.
4. Start and stop a simulated session, emphasizing both manual confirmations.
5. Open the completed receipt and History.
6. Close with the list of operator data needed to replace every TEST/unverified
   value before any real parking activation.

## Web and data limitations

Normal web state is stored in browser-local AsyncStorage-compatible storage. It
is per-browser, unencrypted at the application layer, not synchronized, and can
be lost when site data is cleared. The meeting demo uses discard-only storage
and intentionally resets on reload.

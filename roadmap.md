# Roadmap

## Move backend from Firebase to Supabase
- [x] Link user's "Gaming IQ" Supabase project
- [x] Tables + row security for profiles, roles, saved setups, custom devices, aim lab runs, presets, phone catalog
- [x] Rewrite data layer on Supabase; remove Firebase completely
- [x] Sign-in page: email first, then password with Log in / Sign up auto-selected; Google button
- [x] Verified log in, save setup, publish preset, reload persistence
- [ ] Google sign-in: user must enable Google provider + redirect URLs in their Supabase dashboard (blocked on user)
- Decision: start fresh, no Firebase data copy; no profile editing for now

## Mobile-first redesign
- [x] New design system (black & red, glass bars, glow, animations)
- [x] App shell: top bar + floating bottom nav
- [x] Calibrate (game, phone, play style, results)
- [x] Presets, Saved, Aim Lab, device picker, admin sync, sign-in page
- [x] Verify on phone + desktop

## Premium minimalist rebuild (Nov 2026 brief)
- [x] New design system: light/dark follows phone, graphite accent, no gradients/glow
- [x] Database: games table + small starter catalog (8 brands)
- [x] Brand → Model → Game → Generate flow with verified device preview
- [x] Recommendation computed on the server per game
- [x] Results page with Copy All, Save
- [x] Dashboard sections: benefits + supported games
- [x] Keep only Saved results; remove Presets and Aim Lab from the app (tables kept)
- [x] Verify on phone + desktop, light + dark

## Top bar & account menu (Nov 18)
- [x] Remove Generate / Saved tabs from the top bar
- [x] Signed out: "Get Started" button; signed in: profile picture in top right
- [x] Profile menu: History, Upgrade Plan, Terms of Service, Privacy Policy, Sign out
- [x] Pages for Upgrade Plan, Terms of Service, Privacy Policy (placeholder text until owner supplies real copy)

## Exact game sensitivity lists + bigger phone list (Nov 18)
- [x] Research each game's real in-game sensitivity names, groups, ranges and what each one is for
- [x] Update Free Fire / BGMI / PUBG Mobile settings with exact names + short "why" for each
- [x] Show the "why" for each setting on the results screen
- [x] Add all mid-range and flagship phones from the bundled list (all brands)
- [x] Research and add newer mid-range / flagship models per brand (verified specs with sources only)

## Game-specific sensitivity system (Nov 18 brief)
- [x] Database: separate setting structures per game (schemas, sections, settings, per-game starting values) with checks that block mixing games
- [x] Free Fire: only its six settings; PUBG Mobile + BGMI: shared Camera / ADS / Gyroscope / ADS Gyroscope / Free Look with exact labels (incl. TPP Aim, FPP Aim)
- [x] Results screen renders by the game's structure (collapsible sections for PUBG/BGMI)
- [x] Tests for each game's structure + cross-game blocking; check all three games in the browser

## Personal Free Fire calculator (Nov 20 brief)
- [x] Audit project, database and security
- [x] Nullable, source-labelled tables for benchmarks, touch and in-game performance data (empty until real measurements exist)
- [x] Optional "How you play" form for signed-in Free Fire players
- [x] Six values calculated separately, with range, confidence, data completeness and what moved each value
- [x] Separate performance and touch/display scores with versioned weights in the database
- [x] Per-setting feedback that changes only that setting; test results saved in the background (no test screen)
- [x] Private history of every result, feedback and test result; tests for the calculator rules

## Rotation-based General Sensitivity (Nov 21 brief)
- [x] Rotation engine: target 14 rotations, linear 3x assumption, measured-curve support, limits 0–200
- [x] Tables: config, user calibrations, rotation measurements, component profiles/point rules, calculation logs
- [x] Two-box rotation picker (1–99 + 1–9 decimal) + device age in the generator (Free Fire)
- [x] Server calculation with reproducible logs; component points as separate bounded layer (not applied)
- [x] Result card: recommended General, target, zero rotation, predicted rotations, reachability, phone age
- [x] Tests: all reference examples (9.5→47, 3→200 unreachable, 6→133, 9→56, 10→40) + inverse point rule

## Free Fire Version 1 formulas (Nov 21 brief)
- [x] Store rotations at General 200 (new fields; old General 0 setup switched off)
- [ ] One calculation function: G = min(200, 2800/R), F = 10.5/R, scopes from Redmi 10C reference, Free Look = G × 65/190, round + clamp
- [ ] Server: Free Fire values come only from this function; logged with all six values
- [ ] Rotations step asks for rotations at General 200
- [ ] Hide "How you play" form and per-setting feedback for Free Fire (user confirmed)
- [ ] Tests incl. mandatory R = 14 → 200/71/94/56/19/68

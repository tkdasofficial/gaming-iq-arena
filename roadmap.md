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

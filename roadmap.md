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
- [ ] New design system (black & red, glass bars, glow, animations)
- [ ] App shell: top bar + floating bottom nav
- [ ] Calibrate (game, phone, play style, results)
- [ ] Presets, Saved, Aim Lab, device picker, admin sync, sign-in page
- [ ] Verify on phone + desktop

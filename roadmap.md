# Roadmap

## Move backend from Firebase to Supabase (user's own "Gaming IQ" Supabase project)
- [ ] BLOCKED: user links their Supabase project (Settings → General → External Supabase → Connect, pick "Gaming IQ")
- [ ] Tables + row security: profiles, admins/user_roles, saved_setups, custom_devices, aim_lab_runs, presets (public read), brands, chipsets, devices, game_compatibility (public read, admin write)
- [ ] Replace Firebase Auth with Supabase Google sign-in
- [ ] Rewrite src/firebase/* services against Supabase; keep the same app-facing hook API
- [ ] Load bundled phone dataset into Supabase (admin sync)
- [ ] Remove firebase package, firebase config files and firestore rules
- [ ] Verify sign-in, save setup, publish preset, aim lab run end-to-end
- Decision: start fresh, no Firebase data copy

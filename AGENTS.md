<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Backend is the user's own external Supabase project (not Lovable Cloud). All data access lives in `src/backend/` (`catalog.ts` public catalog reads, `recommend.functions.ts` server generation, `services.ts` saved results, `BackendContext.tsx` session); components never call Supabase directly, so the backend can change in one place.
- Firebase was fully removed; do not reintroduce it.
- The app shell is loaded client-only (`ClientOnly` + lazy import in `src/routes/index.tsx`) because it reads the browser session.
- Saved results refetch through a small in-module change bus in `services.ts` after each write (no Realtime).
- Phone catalog tables (`brands`, `chipsets`, `devices`, `game_compatibility`) store the original record in a `data` jsonb column plus indexed lookup columns, matching `data/smartphone-db/`. The live subset is listed in `data/smartphone-db/starter-catalog.json` and loaded insert-if-missing by `scripts/seed-starter-catalog.ts`, so new phones are added by editing the bundled data + list and existing rows are never bulk-replaced. New device records need a spec source and verified display size + refresh rate.
- Each game points at one sensitivity schema (`games.sensitivity_schema_id`); a schema owns its categories and sliders (`sensitivity_categories`, `sensitivity_settings`: label, slider range, order, touch/gyro, headline slot) and games sharing a layout (PUBG Mobile, BGMI) share the schema. Per-game starting values live in `game_sensitivity_profiles`, whose composite foreign keys + range trigger reject values from another schema or outside the slider range. `games.config` keeps only extras/options. `src/engine/sensitivity.ts` assembles these rows into the engine's GameRecord and drops anything not in the game's schema, so adding or tuning a game is a data change.
- Recommendations are computed only on the server (`generateRecommendation` server fn) from ids; the browser never sends specs. The pure engine is `src/engine/recommend.ts` and is covered by `recommend.test.ts` and `sensitivity.test.ts` (fixture `__fixtures__/sensitivity.json` mirrors the sensitivity tables).
- Device specs are normalised strictly: missing values stay `null` and render as "Not verified"; a phone without display size + refresh rate cannot be generated. Never add default/estimated hardware values.
- Saved results store a full recommendation snapshot in `saved_setups.input` (`version: 2`) so they render without recomputation.
- Admin rights come only from `public.user_roles` via `has_role`; the owner's verified email is granted admin by the `handle_new_user` trigger.
- The email-first sign-in check runs in a server function (`src/backend/auth.functions.ts`) calling the service-role-only `email_has_account` RPC; never expose that RPC to anon.
- `tsconfig.json` has `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` off because the imported app code was written without them.
- Shared UI building blocks live in `src/components/giq/primitives.tsx`; screens compose these plus shadcn components and use only semantic tokens from `src/styles.css`. Light/dark is driven by `prefers-color-scheme` (the `dark` variant is a media query, no `.dark` class).
- No animation library: interaction feedback is plain CSS transitions.
- Free Fire uses the personal calculator in `src/engine/freefire/` (pure, tested in `freefire.test.ts`); its weights/coefficients live in the active `model_versions` row so tuning is a data change, and BGMI/PUBG stay on `src/engine/recommend.ts`. Why: per-game rollout without breaking the existing generator.
- Player history (`recommendations`, `feedback_events`, `calibration_*`) is written only by server functions in `src/backend/player.functions.ts` or the validating `record_calibration_session` RPC; players can read but never edit it. Why: results and feedback stay trustworthy.
- `src/start.ts` registers `attachSupabaseAuth` (`src/backend/auth-attacher.ts`) so `requireSupabaseAuth` server functions receive the bearer token. Why: no generated attacher exists for this external project.
- Free Fire General can come from the rotation engine `src/engine/freefire/rotation.ts` (target-rotation model, config in `general_sensitivity_config`, tested in `rotation.test.ts`); server pipeline is `src/backend/rotation.core.ts`. Component points (`component-points.ts`) are a separate bounded layer and never modify the recommended value. Why: rotation calibration stays the primary source until a documented calibration method exists.


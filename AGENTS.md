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
- Phone catalog tables (`brands`, `chipsets`, `devices`, `game_compatibility`) store the original record in a `data` jsonb column plus indexed lookup columns, matching `data/smartphone-db/`. The starter subset is listed in `data/smartphone-db/starter-catalog.json` and loaded insert-if-missing by `scripts/seed-starter-catalog.ts`, so the live catalog stays small and is never bulk-replaced.
- Games live in the `games` table; each row's `config` jsonb (groups, settings with base/min/max/factor, core mapping, extras) drives that game's recommendation, so adding or tuning a game is a data change, not a code change.
- Recommendations are computed only on the server (`generateRecommendation` server fn) from ids; the browser never sends specs. The pure engine is `src/engine/recommend.ts` and is covered by `recommend.test.ts` (fixture mirrors the `games` rows).
- Device specs are normalised strictly: missing values stay `null` and render as "Not verified"; a phone without display size + refresh rate cannot be generated. Never add default/estimated hardware values.
- Saved results store a full recommendation snapshot in `saved_setups.input` (`version: 2`) so they render without recomputation.
- Admin rights come only from `public.user_roles` via `has_role`; the owner's verified email is granted admin by the `handle_new_user` trigger.
- The email-first sign-in check runs in a server function (`src/backend/auth.functions.ts`) calling the service-role-only `email_has_account` RPC; never expose that RPC to anon.
- `tsconfig.json` has `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` off because the imported app code was written without them.
- Shared UI building blocks live in `src/components/giq/primitives.tsx`; screens compose these plus shadcn components and use only semantic tokens from `src/styles.css`. Light/dark is driven by `prefers-color-scheme` (the `dark` variant is a media query, no `.dark` class).
- No animation library: interaction feedback is plain CSS transitions.

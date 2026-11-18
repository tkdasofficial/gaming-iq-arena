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

- Backend is the user's own external Supabase project (not Lovable Cloud). All data access lives in `src/backend/` (`services.ts`, `deviceDatabase.ts`, `adminImport.ts`, `BackendContext.tsx`); components never call Supabase directly, so the backend can change in one place.
- Firebase was fully removed; do not reintroduce it.
- The app shell is loaded client-only (`ClientOnly` + lazy import in `src/routes/index.tsx`) because it reads the browser session and was written as a browser SPA.
- Lists refetch through a small in-module change bus in `services.ts` after each write (no Realtime), keeping the old subscribe/unsubscribe API.
- Phone catalog tables (`brands`, `chipsets`, `devices`, `game_compatibility`) store the original record in a `data` jsonb column plus indexed lookup columns, so the bundled dataset in `data/smartphone-db/` syncs without reshaping.
- Admin rights come only from `public.user_roles` via `has_role`; the owner's verified email is granted admin by the `handle_new_user` trigger.
- The email-first sign-in check runs in a server function (`src/backend/auth.functions.ts`) calling the service-role-only `email_has_account` RPC; never expose that RPC to anon.
- `tsconfig.json` has `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noPropertyAccessFromIndexSignature` off because the imported app code was written without them.
- Shared UI building blocks (Panel, Segmented, OptionTile, Chip, RangeSlider, Sheet, EmptyState…) live in `src/components/giq/`; screens compose these and use only semantic tokens from `src/styles.css`, so the look changes in one place.
- Animations use the `motion` package (`motion/react`); sliding active indicators rely on unique `layoutId`s per control.

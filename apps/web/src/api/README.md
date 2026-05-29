# `apps/web/src/api/`

One folder per API resource. Inside each folder, **one file per hook** so each
file does exactly one thing: makes one API call.

## Layout

```text
api/
  <resource>/
    keys.ts              Query keys used by every hook in this folder
    types.ts             (optional) Shared request/response types
    <action>.ts          One hook per file: useUsers, useDeleteUser, ...
    index.ts             Barrel — re-exports everything for ergonomic imports
```

Example:

```text
api/users/
  keys.ts                USERS_KEYS
  types.ts               ManagedUser, InviteUserVars
  users.ts               useUsers (the list)
  invite-user.ts         useInviteUser
  update-user-role.ts    useUpdateUserRole
  delete-user.ts         useDeleteUser
  ...
  index.ts               re-exports all of the above
```

## Why this shape

- **Find any API call in O(1).** "What endpoints touch users?" → `ls api/users/`.
- **Diffs name the action.** `delete-user.ts: +5 -3` says exactly what changed in PRs.
- **One concern per file.** A hook plus its types is the smallest meaningful unit.
- **Pages stay clean.** Barrel exports let pages import from `@/api/users`, not
  `@/api/users/delete-user`.
- **Query keys live next to their hooks.** The `keys.ts` file is the single
  source of truth for that resource — `useDeleteUser` invalidates `USERS_KEYS.all`
  without guessing the string.

## Adding a new hook

1. Create `api/<resource>/<action>.ts` with a single named export.
2. If the resource needs a query key, import it from `./keys.ts` (or add it there).
3. Re-export from `api/<resource>/index.ts`.

```ts
// api/users/ban-user.ts
"use client";
import { useApiMutation } from "@/hooks/useApiQuery";
import { USERS_KEYS } from "./keys";

export function useBanUser() {
  return useApiMutation<string, void>(
    (c, id) => c.post(`/users/${id}/ban`),
    { invalidates: [USERS_KEYS.all] },
  );
}
```

```ts
// api/users/index.ts — add the new line
export { useBanUser } from "./ban-user";
```

## In a page

```tsx
import { useUsers, useDeleteUser } from "@/api/users";

const users = useUsers();
const del = useDeleteUser();
del.mutate(id);
```

Pages never import from `@/api/users/<action>` directly — always via the barrel.
That keeps the per-file split refactor-safe.

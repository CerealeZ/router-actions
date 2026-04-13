# router-actions

A type-safe action system for server-side form submissions in **React Router v7 Framework Mode**. Bridge the gap between React Router's action/fetcher API and a clean, promise-based workflow.

## Features

- **Type-safe** — full TypeScript inference from server action return types to the client
- **Promise-based** — `await` the result of any action directly in your component
- **Framework Mode first** — designed for React Router v7's server-rendered architecture
- **Hook included** — drop-in `useRouterAction` hook with `data`, `loading`, and `error` state
- **Zero runtime dependencies** — only peer deps on `react` and `react-router`

## Installation

```bash
npm install router-actions
```

> **Peer dependencies:** `react ^18.2.0 || ^19.0.0` and `react-router ^7.5.3` must be installed in your project.

## Quick Start

### 1. Define your server actions

Use the `Actions.createServerActions` static method in your route's `action` function. Each key becomes a typed action name:

```ts
// routes/profile.tsx
import { Actions } from "router-actions";
import type { Route } from "./+types/profile";

export async function action(args: Route.ActionArgs) {
  const handleActions = Actions.createServerActions({
    updateName: async ({ request }: Route.ActionArgs) => {
      const { name } = await request.json();
      await db.user.update({ data: { name } });
      return { name };
    },
    updateEmail: async ({ request }: Route.ActionArgs) => {
      const { email } = await request.json();
      await db.user.update({ data: { email } });
      return { email };
    },
  });
  return await handleActions(args);
}
```

### 2. Create the Actions instance and clientAction

Create an `Actions` instance typed against the server `action`'s return type, then call `handleServerAction` inside `clientAction` to bridge server and client:

```ts
// routes/profile.tsx (continued)
import type { ServerActionReturn, InferActionReturn } from "router-actions";

export const ProfileActionHandler = new Actions<
  ServerActionReturn<InferActionReturn<typeof action>>
>();

export const clientAction = async (args: Route.ClientActionArgs) => {
  const data = await ProfileActionHandler.handleServerAction(
    args.request,
    args.serverAction,
  );
  return data;
};
```

### 3. Use the hook in your component

```tsx
// routes/profile.tsx (continued)
import { useRouterAction } from "router-actions";

export default function ProfilePage() {
  const { execute, data, loading, error } = useRouterAction(
    ProfileActionHandler,
    "updateName",
    {
      onSuccess: (result) => console.log("Updated:", result.name),
      onError: (err) => console.error(err),
    },
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name") as string;
    await execute({ name });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" defaultValue="John" />
      <button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save"}
      </button>
      {data && <p>Saved: {data.name}</p>}
      {error && <p>Error occurred.</p>}
    </form>
  );
}
```

## License

MIT

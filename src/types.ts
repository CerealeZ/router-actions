import type { useLoaderData } from "react-router";

export type RecordPayload = Record<PropertyKey, unknown>;

/**
 * Converters a RecordPayload (Record Type) to a ServerActionReturn (Union type)
 */
export type ServerActionReturn<T extends RecordPayload> = {
  [K in keyof T]: {
    action: K;
    value: T[K];
  };
}[keyof T];

export type ActionPayload<
  ActionName extends PropertyKey = string,
  Data = unknown,
> = {
  action: ActionName;
  value: Data;
};

export type RecoveredOptions<
  U extends { action: PropertyKey; value: unknown },
> = {
  [K in U["action"]]: Extract<U, { action: K }>["value"];
};

export type InferActionReturn<T extends (...args: never[]) => unknown> =
  SerializeFrom<() => ReturnType<T>> extends ActionPayload
    ? RecoveredOptions<
        Extract<SerializeFrom<() => ReturnType<T>>, ActionPayload>
      >
    : never;
type SerializeFrom<T> = ReturnType<typeof useLoaderData<T>>;

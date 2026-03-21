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

export type ActionReturn<ActionName extends PropertyKey, Data> = {
  action: ActionName;
  value: Data;
};

export type RecoveredOptions<
  U extends { action: PropertyKey; value: unknown },
> = {
  [K in U["action"]]: Extract<U, { action: K }>["value"];
};

export type InferActionReturn<
  T extends (
    ...args: never[]
  ) => ActionReturn<Key, Data> | Promise<ActionReturn<Key, Data>>,
  Key extends PropertyKey = string,
  Data = unknown,
> = RecoveredOptions<
  Awaited<
    Extract<
      ReturnType<T>,
      ActionReturn<Key, Data> | Promise<ActionReturn<Key, Data>>
    >
  >
>;

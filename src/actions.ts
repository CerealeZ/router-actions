import {
  type FetcherSubmitFunction,
  type FetcherSubmitOptions,
  type SubmitFunction,
  type SubmitOptions,
  type SubmitTarget,
} from "react-router";
import { Observable } from "@/observable";
import {
  type RecordPayload,
  type ServerActionReturn,
  type RecoveredOptions,
  type ActionReturn,
} from "@/types";

export class Actions<ServerData extends ServerActionReturn<RecordPayload>> {
  #observer = new Observable<
    | {
        actionId: string;
        data: ServerData;
      }
    | {
        actionId: string;
        error: unknown;
      }
  >();
  #registeredActions = new Map<
    string,
    {
      reject: (err: unknown) => void;
    }
  >();

  async submit<T extends keyof RecoveredOptions<ServerData>>(
    actionType: T,
    payload: SubmitTarget,
    submitFn: FetcherSubmitFunction,
    options?: FetcherSubmitOptions,
  ): Promise<RecoveredOptions<ServerData>[T]>;

  async submit<T extends keyof RecoveredOptions<ServerData>>(
    actionType: T,
    payload: SubmitTarget,
    submitFn: SubmitFunction,
    options?: SubmitOptions,
  ): Promise<RecoveredOptions<ServerData>[T]>;

  async submit<T extends keyof RecoveredOptions<ServerData>>(
    actionType: T,
    payload: SubmitTarget,
    submitFn: SubmitFunction | FetcherSubmitFunction,
    options?: SubmitOptions | FetcherSubmitOptions,
  ): Promise<RecoveredOptions<ServerData>[T]> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const promise = new Promise<RecoveredOptions<ServerData>[T]>(
      (resolve, reject) => {
        const disconnect = this.#observer.subscribe((response) => {
          const { actionId } = response;
          if (actionId !== id) return;
          if ("error" in response) {
            reject(response.error);
          } else {
            const { data } = response;
            if (data.action === actionType) {
              resolve(data.value as RecoveredOptions<ServerData>[T]);
            } else {
              reject(
                new Error("Returned action type does not match", {
                  cause: data,
                }),
              );
            }
          }
          this.#registeredActions.delete(id);
          disconnect();
        });

        this.#registeredActions.set(id, {
          reject: (err: unknown) => {
            reject(err);
            disconnect();
            this.#registeredActions.delete(id);
          },
        });
      },
    );

    submitFn(...this.#createPayload(payload, id, String(actionType), options));

    return promise;
  }

  async handleServerAction(
    request: Request,
    serverAction: () => Promise<ServerData>,
  ) {
    const queries = new URL(request.url).searchParams;
    const actionId = queries.get("action_id");
    if (!actionId) return serverAction();
    const { reject } = this.#registeredActions.get(actionId) ?? {};
    try {
      const data = await serverAction();
      this.#observer.notify({
        actionId,
        data,
      });
      return data;
    } catch (error) {
      // TODO: Notify the listeners that the action failed
      reject?.(error);
      throw error;
    }
  }

  #createPayload(
    value: SubmitTarget,
    id: string,
    actionType: string,
    options?: SubmitOptions | FetcherSubmitOptions,
  ) {
    const { action: actionPath = "", ...restOptions } = options || {};

    const actionUrl = this.#addActionTypeToActionPath(
      actionPath,
      actionType,
      id,
    );

    return [
      value,
      {
        method: "post",
        encType: "application/json",
        action: actionUrl,
        ...restOptions,
      } as SubmitOptions | FetcherSubmitOptions,
    ] as const;
  }

  #addActionTypeToActionPath(
    actionPath: string,
    actionType: string,
    id: string,
  ) {
    const url = new URL(actionPath, window.location.href);
    url.searchParams.set("action_type", actionType);
    url.searchParams.set("action_id", id);
    return url.pathname + url.search;
  }

  on<Type extends keyof RecoveredOptions<ServerData>>(
    actionType: Type,
    listener: (data: RecoveredOptions<ServerData>[Type]) => void,
  ) {
    return this.#observer.subscribe((response) => {
      if ("data" in response && response.data.action === actionType) {
        listener(response.data.value as RecoveredOptions<ServerData>[Type]);
      }
    });
  }

  /**
   * Returns the action type from the url
   */
  static getActionType(url: Request["url"]) {
    return new URL(url).searchParams.get("action_type");
  }

  static createActionReturn<T extends string, U>(
    action: T,
    data: U,
  ): ActionReturn<T, U> {
    return {
      action,
      value: data,
    };
  }

  static createServerActions<
    ActionsArgs extends { request: Request },
    T extends Record<PropertyKey, (args: ActionsArgs) => Promise<unknown>>,
  >(actions: T) {
    const handler = async (args: ActionsArgs) => {
      const { request } = args;
      const action = Actions.getActionType(request.url);
      if (!action) throw new Error("Action not found");
      const callAction = actions[action];
      if (!callAction) throw new Error("Action not found");
      const data = await callAction(args);
      return Actions.createActionReturn(action, data) as {
        [K in keyof T]: ActionReturn<K, Awaited<ReturnType<T[K]>>>;
      }[keyof T];
    };
    return handler;
  }
}

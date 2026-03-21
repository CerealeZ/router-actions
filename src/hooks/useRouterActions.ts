import { useCallback, useRef, useState } from "react";
import { Actions } from "@/actions";
import type { RecoveredOptions } from "@/types";
import { useSubmit, type SubmitOptions, type SubmitTarget } from "react-router";

export const useRouterAction = <
  U extends { action: string; value: unknown },
  SelectedAction extends U["action"],
>(
  actions: Actions<U>,
  actionType: SelectedAction,
  options?: {
    onSuccess?: (data: RecoveredOptions<U>[SelectedAction]) => void;
    onError?: (error: unknown) => void;
  },
) => {
  const submit = useSubmit();
  const [data, setData] = useState<RecoveredOptions<U>[SelectedAction]>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setLoading(false);
  }, []);

  const execute = useCallback(
    async (
      payload: SubmitTarget = {},
      submitOptions?: SubmitOptions,
    ): Promise<RecoveredOptions<U>[SelectedAction]> => {
      setLoading(true);
      setError(undefined);

      try {
        const result = await actions.submit(actionType, payload, submit, {
          unstable_defaultShouldRevalidate: false,
          navigate: false,
          ...submitOptions,
        });

        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }

        options?.onSuccess?.(result);

        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err);
          setLoading(false);
        }

        options?.onError?.(err);

        throw err;
      }
    },
    [actions, actionType, submit, options],
  );

  return {
    data,
    error,
    loading,
    execute,
    reset,
  };
};

export const isDataReady = <T>(
  data: T,
  loading: boolean,
): data is NonNullable<T> => {
  return data !== undefined && !loading;
};

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import type { ApiClient } from "@/lib/api-client";

// Thin, opinionated wrappers around TanStack Query so pages don't have to:
//   • re-create QueryClient
//   • thread the api client through every call
//   • re-implement loading / error / refetch boilerplate
//
// Always pass a stable queryKey: `[ "patients", { page, q } ]` etc.
// React Query will dedupe, cache (30s default), and cancel in-flight fetches on
// unmount automatically — replacing every hand-rolled useEffect+useState pattern.

type QueryFn<T> = (client: ApiClient) => Promise<T>;

export function useApiQuery<T>(
  queryKey: readonly unknown[],
  queryFn: QueryFn<T>,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">
) {
  const api = useApi();
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey,
    queryFn: () => queryFn(api),
    ...options,
  });
}

type MutationFn<TVars, TData> = (client: ApiClient, vars: TVars) => Promise<TData>;

export function useApiMutation<TVars, TData = unknown>(
  mutationFn: MutationFn<TVars, TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVars>, "mutationFn"> & {
    invalidates?: ReadonlyArray<readonly unknown[]>;
  }
) {
  const api = useApi();
  const qc = useQueryClient();
  const { invalidates, onSuccess, ...rest } = options ?? {};

  return useMutation<TData, Error, TVars>({
    mutationFn: (vars) => mutationFn(api, vars),
    onSuccess: async (data, vars, ctx) => {
      if (invalidates?.length) {
        await Promise.all(
          invalidates.map((key) => qc.invalidateQueries({ queryKey: key }))
        );
      }
      await onSuccess?.(data, vars, ctx);
    },
    ...rest,
  });
}

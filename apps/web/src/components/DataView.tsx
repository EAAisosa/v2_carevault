"use client";

import { type ReactNode } from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

// Standardised loading / error / empty wrapper. Use with useApiQuery() to
// avoid the same `if (loading) ... if (error) ... if (!data.length) ...`
// boilerplate on every data page.
//
//   const q = useApiQuery(['patients'], c => c.get('/patients'));
//   return <DataView query={q} empty="No patients yet">{(data) => ...}</DataView>;

interface DataViewProps<T> {
  query: {
    data: T | undefined;
    isPending: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  empty?: ReactNode | ((data: T) => ReactNode);
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

export function DataView<T>({ query, empty, isEmpty, children }: DataViewProps<T>) {
  if (query.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground mb-3">Something went wrong loading this data.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (isEmpty?.(query.data)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground mb-2" />
        <div className="text-sm text-muted-foreground">
          {typeof empty === "function" ? empty(query.data) : (empty ?? "Nothing to show yet.")}
        </div>
      </div>
    );
  }

  return <>{children(query.data)}</>;
}

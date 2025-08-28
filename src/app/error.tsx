"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);

    // TODO: Send error to monitoring service
    // if (process.env.NODE_ENV === 'production') {
    //   sendToMonitoring(error);
    // }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            We apologize for the inconvenience. An error occurred while
            processing your request.
          </p>

          {process.env.NODE_ENV === "development" && (
            <details className="text-left bg-muted p-3 rounded text-sm">
              <summary className="cursor-pointer font-medium mb-2">
                Error Details
              </summary>
              <code className="text-red-600 break-all">{error.message}</code>
              {error.digest && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Digest: {error.digest}
                </p>
              )}
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center text-white bg-red-900/20 rounded-xl border border-red-500/30 m-4">
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-red-200 mb-4">{this.state.error?.message}</p>
                    <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
                </div>
            );
        }
        return this.props.children;
    }
}

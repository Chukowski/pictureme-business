import { createContext, useContext, ReactNode, useState } from "react";

interface PlaygroundContextType {
    preview: ReactNode;
    setPreview: (node: ReactNode) => void;
    previewToolbar: ReactNode;
    setPreviewToolbar: (node: ReactNode) => void;
    isRightSidebarOpen: boolean;
    setIsRightSidebarOpen: (open: boolean) => void;
    isPreviewFullscreen: boolean;
    setIsPreviewFullscreen: (full: boolean) => void;
    hasNewAsset: boolean;
    setHasNewAsset: (has: boolean) => void;
    triggerNewAsset: (autoOpen?: boolean) => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export function PlaygroundProvider({ children }: { children: ReactNode }) {
    const [preview, setPreview] = useState<ReactNode>(null);
    const [previewToolbar, setPreviewToolbar] = useState<ReactNode>(null);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const [hasNewAsset, setHasNewAsset] = useState(false);

    const triggerNewAsset = (autoOpen: boolean = true) => {
        setHasNewAsset(true);
        if (autoOpen) setIsRightSidebarOpen(true);
    };

    return (
        <PlaygroundContext.Provider value={{
            preview,
            setPreview,
            previewToolbar,
            setPreviewToolbar,
            isRightSidebarOpen,
            setIsRightSidebarOpen,
            isPreviewFullscreen,
            setIsPreviewFullscreen,
            hasNewAsset,
            setHasNewAsset,
            triggerNewAsset
        }}>
            {children}
        </PlaygroundContext.Provider>
    );
}

export function usePlayground() {
    const context = useContext(PlaygroundContext);
    if (context === undefined) {
        throw new Error("usePlayground must be used within a PlaygroundProvider");
    }
    return context;
}

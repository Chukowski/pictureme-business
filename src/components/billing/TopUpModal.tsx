import { Dialog, DialogContent } from "@/components/ui/dialog";
import BillingTab from "@/components/dashboard/BillingTab";
import { getCurrentUser } from "@/services/eventsApi";

interface TopUpModalProps {
    open: boolean;
    onClose: () => void;
}

export function TopUpModal({ open, onClose }: TopUpModalProps) {
    const user = getCurrentUser();

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-5xl h-[85vh] overflow-y-auto bg-black border-white/10 p-0">
                <div className="p-0">
                    {/* Passing openPlansModal=true to highlight top-up options if supported, 
                         otherwise BillingTab usually shows current plan + options */}
                    <BillingTab currentUser={user} openPlansModal={true} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

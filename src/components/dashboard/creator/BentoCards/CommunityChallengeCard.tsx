import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommunityChallengeCard({ navigate }: { navigate: (p: string) => void }) {
    return (
        <div
            role="button"
            tabIndex={0}
            className="flex-1 min-h-0 text-left bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20 p-3 md:p-4 flex flex-col relative overflow-hidden group cursor-pointer"
            onClick={() => navigate('/creator/challenges')}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/creator/challenges');
                }
            }}
        >
            {/* Abstract shapes */}
            <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-10px] left-[-10px] w-20 h-20 bg-purple-500/20 rounded-full blur-xl"></div>

            <div className="flex items-center justify-between mb-2 relative z-10">
                <Badge variant="secondary" className="bg-indigo-500 text-white border-0 text-[10px] uppercase font-bold tracking-wider">
                    Weekly Challenge
                </Badge>
                <span className="text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 2d left
                </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-0.5 relative z-10">
                "Space Odyssey"
            </h3>
            <p className="text-[11px] text-indigo-200/70 mb-3 line-clamp-2 relative z-10">
                Create a sci-fi masterpiece featuring nebulae and astronauts.
            </p>

            <div className="mt-auto flex items-center justify-between relative z-10">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold">
                            {String.fromCharCode(64 + i)}
                        </div>
                    ))}
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold pl-1">
                        +42
                    </div>
                </div>
                <Button size="sm" className="h-7 text-xs bg-white text-indigo-900 hover:bg-indigo-50 font-semibold">Join</Button>
            </div>
        </div>
    );
}

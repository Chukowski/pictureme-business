import React from 'react';
import { Store, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";

export const TemplatesView = () => (
    <div className="flex-1 bg-[#101112] p-8 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">My Models</h2>
                    <p className="text-zinc-400">Manage your trained models and styles</p>
                </div>
                <Button className="bg-white text-black hover:bg-zinc-200">
                    <Plus className="w-4 h-4 mr-2" /> Train New Model
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Placeholder Card */}
                <div className="group relative aspect-[3/4] bg-card rounded-xl border border-white/10 overflow-hidden hover:border-[#D1F349] transition-all">
                    <div className="absolute inset-0 bg-zinc-800 flex flex-col items-center justify-center text-zinc-500 gap-2">
                        <Store className="w-8 h-8 opacity-20" />
                        <span className="text-xs">No custom models yet</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

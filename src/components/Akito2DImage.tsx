import React from 'react';
import { Zap } from 'lucide-react';

export default function Akito2DImage() {
  return (
    <div className="relative z-10 w-full max-w-md mx-auto group">
      <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full -z-10" />
      <img 
        src="/assets/akito-3d.png" 
        alt="Akito - Akitá AI Assistant" 
        className="w-full h-auto drop-shadow-2xl animate-float transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      <div className="hidden w-full aspect-square bg-zinc-800/50 rounded-3xl border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 flex-col gap-4">
        <Zap className="w-16 h-16 text-indigo-500" />
        <p>Akito 3D Model</p>
      </div>
    </div>
  );
}


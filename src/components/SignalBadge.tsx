import React from 'react';

interface SignalBadgeProps {
    type: 'bull' | 'bear' | 'neutral';
    text: string;
    intensity?: 'high' | 'medium' | 'low';
}

const SignalBadge: React.FC<SignalBadgeProps> = ({ type, text, intensity = 'medium' }) => {
    let containerClass = "from-gray-800 to-gray-900 border-gray-700 text-gray-400";
    let glowClass = "";
    let icon = '⚖️';

    if (type === 'bull') {
        containerClass = "from-red-900/40 to-red-950/40 border-red-500/50 text-red-100";
        glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.3)]";
        icon = '🚀';
    } else if (type === 'bear') {
        containerClass = "from-green-900/40 to-green-950/40 border-green-500/50 text-green-100";
        glowClass = "shadow-[0_0_15px_rgba(16,185,129,0.3)]";
        icon = '⚠️';
    } else {
        containerClass = "from-yellow-900/20 to-yellow-950/20 border-yellow-500/30 text-yellow-100";
        icon = '🤔';
    }

    return (
        <div className={`
            relative group overflow-hidden
            flex items-center gap-3 px-5 py-3 
            bg-gradient-to-br ${containerClass}
            border-l-4 rounded-r-xl backdrop-blur-md
            ${glowClass} transition-all duration-300
        `}>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-20 transition-opacity" />
            <span className="text-2xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform">{icon}</span>
            <span className="font-bold tracking-wider text-sm uppercase">{text}</span>
        </div>
    );
};

export default SignalBadge;

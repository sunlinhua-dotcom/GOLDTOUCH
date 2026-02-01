"use client";

import React, { useState } from 'react';
import { TERM_DEFINITIONS } from '@/lib/definitions';

interface TermProps {
    term: string;
    children: React.ReactNode;
}

export const TermTooltip: React.FC<TermProps> = ({ term, children }) => {
    const definition = TERM_DEFINITIONS[term] || TERM_DEFINITIONS[term.toUpperCase()];
    const [isVisible, setIsVisible] = useState(false);

    if (!definition) {
        return <>{children}</>;
    }

    return (
        <span
            className="relative cursor-help group inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)} // Mobile tap support
        >
            <span className="border-b-[1.5px] border-dotted border-gray-400/60 dark:border-gray-500/60 hover:border-yellow-500 transition-colors">
                {children}
            </span>

            {/* Tooltip Popup - use span to avoid <div> inside <p> hydration error */}
            <span
                className={`
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3
                    bg-gray-900/95 backdrop-blur-md text-gray-100 text-xs rounded-lg shadow-xl
                    border border-gray-700 z-50 transform transition-all duration-200 origin-bottom block
                    ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                `}
            >
                <span className="font-bold text-yellow-500 mb-1 block">{term}</span>
                <span className="leading-relaxed block">{definition}</span>

                {/* Arrow */}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900/95"></span>
            </span>
        </span>
    );
};

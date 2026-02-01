import React, { ReactNode } from 'react';

interface ReportCardProps {
    title?: string;
    children: ReactNode;
    variant?: 'default' | 'featured' | 'danger' | 'success';
    className?: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, children, variant = 'default', className = '' }) => {
    let borderClass = 'border-white/10';
    let bgClass = 'bg-black/20';
    let titleColor = 'text-gray-300';

    if (variant === 'featured') {
        borderClass = 'border-yellow-500/50';
        bgClass = 'bg-gradient-to-br from-yellow-500/5 to-transparent';
        titleColor = 'text-yellow-500';
    } else if (variant === 'danger') {
        borderClass = 'border-red-500/30';
        bgClass = 'bg-gradient-to-br from-red-500/5 to-transparent';
        titleColor = 'text-red-400';
    } else if (variant === 'success') {
        borderClass = 'border-green-500/30';
        bgClass = 'bg-gradient-to-br from-green-500/5 to-transparent';
        titleColor = 'text-green-400';
    }

    return (
        <div className={`
            relative overflow-hidden rounded-2xl backdrop-blur-md border 
            border ${borderClass} ${bgClass} 
            p-4 md:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl 
            ${className}
        `}>
            {/* Glossy Reflection Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none" />

            {title && (
                <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${titleColor} flex items-center gap-2`}>
                    <span className="w-1 h-3 rounded-full bg-current opacity-70"></span>
                    {title}
                </div>
            )}

            <div className="relative z-10 text-gray-200 leading-relaxed">
                {children}
            </div>
        </div>
    );
};

export default ReportCard;

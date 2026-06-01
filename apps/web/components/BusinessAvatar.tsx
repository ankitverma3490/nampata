"use client";

import React from 'react';
import { getImageUrl } from '../lib/api';

interface BusinessAvatarProps {
    src?: string | null;
    alt?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    isPreview?: boolean;
}

export default function BusinessAvatar({
    src,
    alt = 'Avatar',
    size = 'md',
    className = '',
    isPreview = false,
}: BusinessAvatarProps) {
    const sizeClasses = {
        sm: 'w-7 h-7 rounded-lg',
        md: 'w-12 h-12 rounded-xl',
        lg: 'w-32 h-32 rounded-3xl',
        xl: 'w-40 h-40 rounded-[2.5rem]',
    };

    const imageUrl = isPreview ? src : (src ? getImageUrl(src) : null);

    if (imageUrl) {
        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden border border-slate-200 bg-white ${className}`}>
                <img
                    src={imageUrl}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement?.classList.add('bg-slate-50');
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-white border border-slate-200 p-1 ${className}`}>
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-slate-900"
                fill="currentColor"
            >
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="38" r="18" />
                <path d="M20 85 C20 65 30 58 50 58 C70 58 80 65 80 85" />
            </svg>
        </div>
    );
}

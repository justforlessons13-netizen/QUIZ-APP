import React, { useState } from 'react';
interface Emoji3DProps {
    emoji: string;
    className?: string;
}
export function Emoji3D({ emoji, className = "w-6 h-6 inline-block" }: Emoji3DProps) {
    const [error, setError] = useState(false);
    let codePoint = '';
    if (emoji && emoji.length > 0) {
        codePoint = Array.from(emoji)[0].codePointAt(0)?.toString(16) || '';
    }
    if (!codePoint || error) {
        return <span className={className}>{emoji}</span>;
    }
    return (
        <img
            src={`https://fonts.gstatic.com/s/e/notoemoji/latest/${codePoint}/512.webp`}
            alt={emoji}
            className={`object-contain leading-none align-middle ${className}`}
            loading="lazy"
            onError={() => setError(true)}
        />
    );
}
"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { identifyStock, searchStocksAction } from "@/app/actions/stock"; // Import new action
import styles from "@/app/page.module.css";
import { SearchResult } from "@/lib/market";

export default function SearchInput() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const router = useRouter();
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim().length > 1) {
                const results = await searchStocksAction(query);
                setSuggestions(results);
                setShowDropdown(true);
            } else {
                setSuggestions([]);
                setShowDropdown(false);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSearch = async (overrideQuery?: string) => {
        const targetQuery = overrideQuery || query;
        if (!targetQuery.trim()) return;

        setLoading(true);
        setShowDropdown(false); // Close dropdown

        try {
            const stock = await identifyStock(targetQuery);
            if (stock) {
                router.push(`/report/${stock.code}`);
            } else {
                alert("未找到该股票，请尝试输入代码（如 00700）");
                setLoading(false);
            }
        } catch (error) {
            console.error("Search failed", error);
            setLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleSuggestionClick = (item: SearchResult) => {
        setQuery(`${item.name} (${item.code})`);
        // Directly go to report, skipping identifyStock check since we have the code
        setLoading(true);
        setShowDropdown(false);
        router.push(`/report/${item.code}`);
    };

    return (
        <div className={styles.searchWrapper} ref={wrapperRef}>
            <input
                type="text"
                className={styles.searchInput}
                placeholder={loading ? "AI 正在识别..." : "输入股票代码 / 简称..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                autoFocus
            />

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
                <ul className={styles.suggestionsList}>
                    {suggestions.map((item) => (
                        <li
                            key={item.code}
                            className={styles.suggestionItem}
                            onClick={() => handleSuggestionClick(item)}
                        >
                            <span className={styles.suggestionName}>{item.name}</span>
                            <span className={styles.suggestionCode}>{item.code}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}


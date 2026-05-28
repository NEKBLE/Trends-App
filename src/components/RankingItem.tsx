import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ExternalLink, Sparkles, Search } from 'lucide-react';

export const CATEGORY_MAP: Record<string, { label: string, color: string }> = {
  news: { label: "시사/뉴스", color: "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20 dark:border-[#EF4444]/30" },
  sports: { label: "스포츠/게임", color: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20 dark:border-[#10B981]/30" },
  entertainment: { label: "엔터/문화", color: "text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/20 dark:border-[#8B5CF6]/30" },
  tech: { label: "테크/경제", color: "text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20 dark:border-[#3B82F6]/30" },
  other: { label: "기타", color: "text-[#6B7280] bg-[#6B7280]/10 border-[#6B7280]/20 dark:border-[#6B7280]/30" },
};

interface RankingItemProps {
  keyword: string;
  category?: string;
  index: number;
  selectedModel?: string;
  apiKey?: string;
  isExpanded: boolean;
  onToggle: () => void;
  key?: React.Key;
}

export function RankingItem({ keyword, category = 'other', index, selectedModel = 'gemini-3.5-flash', apiKey = '', isExpanded, onToggle }: RankingItemProps) {
  const [relatedNews, setRelatedNews] = useState<{ title: string, link: string, source: string, time: string }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Reset related news when keyword changes
  useEffect(() => {
    setRelatedNews([]);
  }, [keyword]);

  // Load related news when expanded
  useEffect(() => {
    if (isExpanded && relatedNews.length === 0) {
      loadRelatedNews();
    }
  }, [isExpanded, relatedNews.length, keyword]);

  const loadRelatedNews = async () => {
    setNewsLoading(true);
    try {
      const response = await fetch(`/api/related-news?keyword=${encodeURIComponent(keyword)}`);
      if (response.ok) {
        const data = await response.json();
        setRelatedNews(data.news || []);
      }
    } catch (e) {
      console.error("Failed to load related news for", keyword, e);
    } finally {
      setNewsLoading(false);
    }
  };

  const namuWikiUrl = `https://namu.wiki/w/${encodeURIComponent(keyword)}`;
  const arcaLiveUrl = `https://arca.live/b/namuhotnow?target=all&keyword=${encodeURIComponent(keyword)}`;

  const getBentoColSpan = () => {
    if (index === 0) {
      return "col-span-1 md:col-span-2";
    }
    return "col-span-1";
  };

  const getCardClasses = () => {
    const base = "rounded-[22px] border transition-all duration-300 group cursor-pointer relative overflow-hidden active:scale-[0.985] shadow-[0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between h-full";
    
    // Dynamic padding to make featured bento-blocks wider/taller on PC
    let padding = "p-4 sm:p-[18px]";
    if (index === 0) {
      padding = "p-5 sm:p-6 lg:p-[26px]";
    }

    if (index === 0) {
      return `${base} ${padding} bg-gradient-to-br from-amber-500/12 via-amber-500/[0.01] to-white/60 dark:from-amber-500/8 dark:via-zinc-900/60 dark:to-[#1C1C1E]/40 border-amber-500/30 dark:border-amber-500/15 hover:border-amber-500/50 dark:hover:border-amber-500/35`;
    }
    if (index === 1) {
      return `${base} ${padding} bg-gradient-to-br from-slate-400/12 via-slate-400/[0.01] to-white/60 dark:from-zinc-400/8 dark:via-zinc-900/60 dark:to-[#1C1C1E]/40 border-zinc-400/35 dark:border-zinc-500/20 hover:border-zinc-400/50 dark:hover:border-zinc-500/35`;
    }
    if (index === 2) {
      return `${base} ${padding} bg-gradient-to-br from-amber-700/12 via-amber-700/[0.01] to-white/60 dark:from-amber-700/8 dark:via-zinc-900/60 dark:to-[#1C1C1E]/40 border-amber-700/30 dark:border-amber-700/15 hover:border-amber-700/40 dark:hover:border-amber-700/25`;
    }
    return `${base} ${padding} bg-white/70 dark:bg-[#2C2C2E]/50 border-black/[0.04] dark:border-white/[0.05] hover:bg-white/95 dark:hover:bg-[#3A3A3C]/50 hover:border-black/10 dark:hover:border-white/10`;
  };

  const getTitleFontClass = () => {
    const base = "break-words flex-1 pr-1.5 whitespace-normal font-sans tracking-tight font-bold text-left [word-break:keep-all] transition-colors duration-200";
    if (index === 0) {
      return `${base} text-[18px] sm:text-[21px] md:text-[22.5px] text-amber-700 dark:text-amber-400 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-300`;
    }
    if (index === 1) {
      return `${base} text-[17px] sm:text-[19.5px] md:text-[20.5px] text-zinc-700 dark:text-zinc-300 leading-snug group-hover:text-zinc-600 dark:group-hover:text-zinc-200`;
    }
    if (index === 2) {
      return `${base} text-[16.5px] sm:text-[18.5px] md:text-[19.5px] text-amber-900 dark:text-amber-500 leading-snug group-hover:text-amber-800 dark:group-hover:text-amber-400`;
    }
    return `${base} text-[15.5px] sm:text-[17px] md:text-[18px] text-[#1C1C1E] dark:text-white leading-snug group-hover:text-[#007AFF] dark:group-hover:text-[#30D158]`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        layout: { type: 'spring', stiffness: 350, damping: 28 },
        opacity: { duration: 0.3 },
        y: { duration: 0.3 },
        scale: { duration: 0.3 }
      }}
      className={`mb-0 ${getBentoColSpan()}`}
    >
      <div 
        className={getCardClasses()}
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
          onToggle();
        }}
      >
        
        {/* Main Row */}
        <div className={`flex justify-between items-center ${isExpanded ? 'mb-2' : 'mb-0'} transition-all duration-300`}>
          <div className="flex items-center flex-1 gap-3 pr-2 min-w-0">
            {index === 0 ? (
              <span className="text-[13px] text-white bg-amber-500 px-2.5 py-1 rounded-[10px] font-bold shrink-0 shadow-[0_2px_8px_rgba(245,158,11,0.3)]">
                {index + 1}
              </span>
            ) : index === 1 ? (
              <span className="text-[13px] text-white bg-slate-400 dark:bg-zinc-500 px-2.5 py-1 rounded-[10px] font-bold shrink-0 shadow-[0_2px_8px_rgba(148,163,184,0.3)]">
                {index + 1}
              </span>
            ) : index === 2 ? (
              <span className="text-[13px] text-white bg-[#B45309] px-2.5 py-1 rounded-[10px] font-bold shrink-0 shadow-[0_2px_8px_rgba(180,83,9,0.3)]">
                {index + 1}
              </span>
            ) : (
              <span className="text-[13px] text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-[10px] font-semibold shrink-0">
                {index + 1}
              </span>
            )}
            <h2 className={getTitleFontClass()}>
              {keyword}
            </h2>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#C7C7CC] dark:text-zinc-500 shrink-0 ml-1"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </div>

        {/* AI Summary Dropdown */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="overflow-hidden"
            >
              {/* External Search Action Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <a
                  href={namuWikiUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 border border-[#007AFF]/15 py-2 px-1 rounded-[12px] text-[11px] sm:text-[12px] font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>나무위키</span>
                </a>
                <a
                  href={arcaLiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 border border-[#FF3B30]/15 py-2 px-1 rounded-[12px] text-[11px] sm:text-[12px] font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>아카라이브</span>
                </a>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(keyword)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-center bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-black/10 dark:hover:bg-white/20 border border-black/5 dark:border-white/5 py-2 px-1 rounded-[12px] text-[11px] sm:text-[12px] font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span>구글 검색</span>
                </a>
              </div>

              {/* Related News List */}
              <div className="mt-3 bg-black/[0.02] dark:bg-white/[0.03] p-4 rounded-[16px] border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="bg-[#007AFF]/10 border border-[#007AFF]/20 text-[#007AFF] text-[9.5px] tracking-wide font-extrabold px-1.5 py-0.5 rounded-[5px] flex items-center justify-center shrink-0">NEWS</div>
                  <span className="text-[12.5px] font-bold text-[#1C1C1E] dark:text-white">실시간 주요 관련 뉴스</span>
                </div>

                {newsLoading ? (
                  <div className="space-y-2 py-1">
                    <div className="h-6 bg-black/5 dark:bg-white/5 rounded-[8px] animate-pulse w-[90%]" />
                    <div className="h-6 bg-black/5 dark:bg-white/5 rounded-[8px] animate-pulse w-[75%]" />
                  </div>
                ) : relatedNews.length === 0 ? (
                  <p className="text-[11.5px] text-[#8E8E93] dark:text-zinc-500 py-1 text-left">관련된 실시간 뉴스가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {relatedNews.map((news, i) => (
                      <a
                        key={i}
                        href={news.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="group/news flex items-start justify-between gap-3 p-1.5 rounded-[10px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-all duration-200 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-[#3A3A3C] dark:text-zinc-300 group-hover/news:text-[#007AFF] dark:group-hover/news:text-[#30D158] transition-colors leading-[1.4] line-clamp-2 [word-break:keep-all]">
                            {news.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8E8E93] dark:text-zinc-500 font-medium">
                            <span className="text-[10px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-[6px] text-[#8E8E93] dark:text-zinc-400">
                              {news.source}
                            </span>
                            <span>•</span>
                            <span>{news.time}</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-[#C7C7CC] group-hover/news:text-[#007AFF] transition-colors shrink-0 mt-1" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

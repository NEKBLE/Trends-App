/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, ChevronsUpDown } from 'lucide-react';
import { RankingItem } from './components/RankingItem';
import { NewsTicker } from './components/NewsTicker';
import { ExtraInfoBar } from './components/ExtraInfoBar';

export interface TrendItem {
  keyword: string;
  category: string;
}

export default function App() {
  const [ranking, setRanking] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set());
  
  // Pull to refresh state
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = React.useRef(0);
  const isPulling = React.useRef(false);

  useEffect(() => {
    fetchRanking();
  }, []);

  const toggleExpand = (keyword: string) => {
    setExpandedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  };

  const isAllExpanded = ranking.length > 0 && ranking.every(item => expandedKeywords.has(item.keyword));

  const toggleExpandAll = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
    if (isAllExpanded) {
      setExpandedKeywords(new Set());
    } else {
      setExpandedKeywords(new Set(ranking.map(r => r.keyword)));
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (isPulling.current) {
      const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dy = currentY - startY.current;
      if (dy > 0) {
        setPullProgress(Math.min(dy * 0.4, 70));
      } else {
        setPullProgress(0);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling.current) {
      if (pullProgress >= 50 && !loading && !isRefreshing) {
        setIsRefreshing(true);
        await fetchRanking(true);
        setIsRefreshing(false);
      }
      isPulling.current = false;
      setPullProgress(0);
    }
  };

  const fetchRanking = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const response = await fetch('/api/ranking');
      if (!response.ok) {
        throw new Error('Failed to fetch ranking from server');
      }
      const data = await response.json();
      setRanking(data.ranking || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!background) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[#007AFF]/30 w-full overflow-hidden antialiased transition-colors duration-500 relative flex flex-col justify-center items-center">
      
      {/* Background ambient gradients */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-100 dark:opacity-20"
        style={{
          background: `radial-gradient(circle at 0% 0%, #FFD6FF 0%, transparent 50%),
                       radial-gradient(circle at 100% 0%, #E7D1FF 0%, transparent 50%),
                       radial-gradient(circle at 100% 100%, #D1E9FF 0%, transparent 50%),
                       radial-gradient(circle at 0% 100%, #FFF9E0 0%, transparent 50%)`
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] md:max-w-[760px] lg:max-w-[1024px] xl:max-w-[1140px] h-[100dvh] md:h-[840px] md:max-h-[90vh] bg-white/60 dark:bg-black/40 backdrop-blur-[30px] md:rounded-[40px] border-none md:border md:border-white/50 dark:border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.1),inset_0_0_2px_rgba(255,255,255,0.8)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.5),inset_0_0_2px_rgba(255,255,255,0.1)] flex flex-col overflow-hidden transition-all duration-300">
        
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="px-4 pt-4 pb-1.5 md:px-6 md:pt-5 md:pb-3 flex flex-row justify-between items-center relative"
        >
          <h1 className="text-[26px] md:text-[34px] font-[800] tracking-[-0.8px] text-[#1C1C1E] dark:text-white m-0 leading-tight relative">
            NEKBLE Trends
            {new Date().getTime() <= new Date('2026-06-03T23:59:59+09:00').getTime() && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute -top-0.5 -right-4 text-[#E52425]">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M10.5 7V17M10.5 11.5L15 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </h1>

          {/* Premium Control Center */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Collapse / Expand All Button */}
            <button
              onClick={toggleExpandAll}
              title={isAllExpanded ? "전체 접기" : "전체 펼치기"}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] bg-black/[0.04] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.15] active:scale-95 transition-all duration-200 cursor-pointer border border-black/[0.02] dark:border-white/[0.02]"
            >
              <ChevronsUpDown 
                className={`w-[17px] h-[17px] transition-transform duration-300 ${isAllExpanded ? 'rotate-180 text-[#007AFF] dark:text-[#30D158]' : ''}`}
              />
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(10);
                }
                fetchRanking();
              }}
              title="새로고침"
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-[12px] bg-black/[0.04] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.08] dark:hover:bg-white/[0.15] active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 border border-black/[0.02] dark:border-white/[0.02]"
            >
              <RefreshCw className={`w-[15px] h-[15px] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </motion.header>

        <ExtraInfoBar />
        <NewsTicker />

        <main 
          ref={scrollRef}
          onPointerDown={handleTouchStart}
          onPointerMove={handleTouchMove}
          onPointerUp={handleTouchEnd}
          onPointerCancel={handleTouchEnd}
          onPointerLeave={handleTouchEnd}
          className="flex-1 overflow-y-auto relative custom-scrollbar z-10 touch-pan-y"
        >
          <div className="absolute top-0 left-0 right-0 -translate-y-full flex justify-center items-end pb-4 min-h-[60px]">
            <RefreshCw 
              className={`w-5 h-5 text-[#8E8E93] ${isRefreshing ? 'animate-spin opacity-100' : ''}`}
              style={{
                opacity: isRefreshing ? 1 : Math.min(pullProgress / 50, 1),
                transform: isRefreshing ? 'none' : `rotate(${pullProgress * 4}deg)`
              }}
            />
          </div>

          <motion.div
            animate={{ y: isRefreshing ? 50 : pullProgress }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="min-h-full px-4 pb-6 pt-1 md:px-5 md:pb-10 md:pt-2 bg-white/0"
          >
            {loading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-[3px] border-zinc-200 dark:border-zinc-800 border-t-[#007AFF] rounded-full"
              />
              <p className="text-[#8E8E93] text-[14px] font-medium">실시간 순위 분석 중...</p>
            </div>
          ) : error ? (
            <div className="p-6 mx-3 rounded-[24px] bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-center backdrop-blur-xl mt-10">
              <p className="text-red-500 dark:text-red-400 mb-4 text-[14px] font-semibold">{error}</p>
              <button 
                onClick={fetchRanking}
                className="px-5 py-2.5 rounded-[16px] bg-[#007AFF]/10 text-[#007AFF] font-[600] text-[13px] backdrop-blur-[5px] transition-colors hover:bg-[#007AFF]/20"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5 grid-flow-row-dense items-stretch relative">
              <AnimatePresence mode="popLayout">
                {ranking.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 dark:text-zinc-500 w-full col-span-full"
                  >
                    <p className="text-[14px] font-semibold">이 카테고리의 트렌드가 없습니다.</p>
                  </motion.div>
                ) : (
                  ranking.map((item, index) => {
                    return (
                      <RankingItem 
                        key={item.keyword} 
                        keyword={item.keyword} 
                        category={item.category}
                        index={index}
                        isExpanded={expandedKeywords.has(item.keyword)}
                        onToggle={() => toggleExpand(item.keyword)}
                      />
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}
          </motion.div>
        </main>
        
      </div>
    </div>
  );
}

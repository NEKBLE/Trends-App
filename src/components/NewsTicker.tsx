import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio } from 'lucide-react';

export function NewsTicker() {
  const [news, setNews] = useState<{title: string, link: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data.news && data.news.length > 0) {
          setNews(data.news);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchNews();
    
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (news.length === 0) return;
    
    // Rotate news every 4 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [news]);

  if (news.length === 0) return null;

  return (
    <div className="mx-4 md:mx-6 mb-3 md:mb-4 overflow-hidden rounded-[12px] bg-white/50 dark:bg-[#2C2C2E]/60 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] px-3.5 py-2 flex items-center gap-2">
      <Radio className="w-[14px] h-[14px] text-[#FF3B30] animate-pulse shrink-0" />
      <div className="flex-1 overflow-hidden relative h-[20px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.a
            key={currentIndex}
            href={news[currentIndex].link}
            target="_blank"
            rel="noreferrer"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-x-0 top-0 bottom-0 flex items-center text-[13px] font-[600] tracking-tight text-[#1C1C1E] dark:text-white truncate hover:text-[#007AFF] dark:hover:text-[#30D158] transition-colors"
          >
            {news[currentIndex].title}
          </motion.a>
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface KospiData {
  price: string;
  change: string;
  ratio: string;
  status: string;
}

interface WeatherData {
  temperature: number;
  weathercode: number;
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return '☀️'; // Clear sky
  if ([1, 2, 3].includes(code)) return '⛅'; // Mainly clear, partly cloudy, and overcast
  if ([45, 48].includes(code)) return '🌫️'; // Fog
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'; // Rain
  if ([71, 73, 75].includes(code)) return '❄️'; // Snow
  if ([95, 96, 99].includes(code)) return '⛈️'; // Thunderstorm
  return '🌡️';
};

const getWeatherDesc = (code: number) => {
  if (code === 0) return '맑음';
  if ([1, 2, 3].includes(code)) return '구름많음';
  if ([45, 48].includes(code)) return '안개';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '비';
  if ([71, 73, 75].includes(code)) return '눈';
  if ([95, 96, 99].includes(code)) return '뇌우';
  return '보통';
};

export function ExtraInfoBar() {
  const [kospi, setKospi] = useState<KospiData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    const fetchKospi = async () => {
      try {
        const res = await fetch('/api/kospi');
        const data = await res.json();
        if (data.price) setKospi(data);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
        const data = await res.json();
        if (data.current_weather) {
          setWeather(data.current_weather);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchKospi();
    fetchWeather();

    const interval = setInterval(() => {
      fetchKospi();
      fetchWeather();
    }, 60 * 1000); // refresh every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 md:px-6 pb-2.5 md:pb-3 flex items-center justify-between gap-3">
      {/* Kospi Widget */}
      {kospi ? (
        <motion.a 
          href="https://m.stock.naver.com/domestic/index/KOSPI"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-white/50 dark:bg-[#2C2C2E]/60 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] px-3 py-2 rounded-[12px] cursor-pointer hover:bg-white/70 dark:hover:bg-[#3A3A3C]/60 transition-colors"
        >
          <span className="text-[12px] font-[700] text-[#1C1C1E] dark:text-white/80">KOSPI</span>
          <span className="text-[13px] font-[600] text-[#1C1C1E] dark:text-white">{kospi.price}</span>
          <div className={`flex items-center text-[11px] font-[700] ${kospi.status === '2' ? 'text-[#FF3B30] dark:text-[#FF453A]' : kospi.status === '5' ? 'text-[#007AFF] dark:text-[#0A84FF]' : 'text-[#8E8E93]'}`}>
            {kospi.status === '2' ? (
              <TrendingUp className="w-3 h-3 mr-0.5" />
            ) : kospi.status === '5' ? (
              <TrendingDown className="w-3 h-3 mr-0.5" />
            ) : (
              <Minus className="w-3 h-3 mr-0.5" />
            )}
            {kospi.ratio}%
          </div>
        </motion.a>
      ) : <div className="flex-1" />}

      {/* Weather Widget */}
      {weather && (
        <motion.a 
          href="https://m.search.naver.com/search.naver?query=날씨"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5 bg-white/50 dark:bg-[#2C2C2E]/60 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] px-3 py-2 rounded-[12px] cursor-pointer hover:bg-white/70 dark:hover:bg-[#3A3A3C]/60 transition-colors"
        >
          <span className="text-[14px] leading-none">{getWeatherIcon(weather.weathercode)}</span>
          <span className="text-[12px] font-[600] text-[#1C1C1E] dark:text-white opacity-90">
            {getWeatherDesc(weather.weathercode)} {Math.round(weather.temperature)}°
          </span>
        </motion.a>
      )}
    </div>
  );
}

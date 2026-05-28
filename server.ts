import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { XMLParser } from "fast-xml-parser";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Cache for summaries to improve speed
  const summaryCache = new Map<string, { text: string, time: number, model: string }>();
  const pendingRequests = new Map<string, Promise<string>>();

  // Cache for news
  let newsCache: { items: any[], time: number } | null = null;
  const parser = new XMLParser();
  const keywordNewsCache = new Map<string, { items: any[], time: number }>();

  // API Route to fetch keyword-specific related news articles
  app.get("/api/related-news", async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ error: "Keyword is required" });
    }
    const kw = String(keyword);

    // Check cache (15 minutes)
    const cached = keywordNewsCache.get(kw);
    if (cached && Date.now() - cached.time < 15 * 60 * 1000) {
      return res.json({ news: cached.items });
    }

    try {
      const rssRes = await fetch("https://news.google.com/rss/search?q=" + encodeURIComponent(kw) + "&hl=ko&gl=KR&ceid=KR:ko");
      if (!rssRes.ok) {
        throw new Error("Failed to fetch RSS from Google News");
      }
      const xmlData = await rssRes.text();
      const jsonObj = parser.parse(xmlData);
      const rawItems = jsonObj?.rss?.channel?.item || [];
      const itemsList = Array.isArray(rawItems) ? rawItems : [rawItems];
      
      const newsItems = itemsList.filter(Boolean).slice(0, 4).map((item: any) => {
        const titleRaw = String(item.title || "");
        const match = titleRaw.match(/(.*) - ([^-]+)$/);
        const cleanTitle = match ? match[1].trim() : titleRaw;
        const sourceName = match ? match[2].trim() : (item.source?.['#text'] || item.source || "뉴스");
        
        let timeStr = "";
        try {
          if (item.pubDate) {
            const date = new Date(item.pubDate);
            const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
            if (diffMin < 60) {
              timeStr = `${diffMin}분 전`;
            } else if (diffMin < 1440) {
              timeStr = `${Math.floor(diffMin / 60)}시간 전`;
            } else {
              timeStr = `${Math.floor(diffMin / 1440)}일 전`;
            }
          }
        } catch {
          timeStr = "최근";
        }

        return {
          title: cleanTitle,
          link: item.link || `https://www.google.com/search?q=${encodeURIComponent(kw)}`,
          source: sourceName,
          time: timeStr
        };
      });

      keywordNewsCache.set(kw, { items: newsItems, time: Date.now() });
      res.json({ news: newsItems });
    } catch (err) {
      console.error("Failed to parse related news for:", kw, err);
      res.json({ news: [] });
    }
  });

  // Cache for category reports to minimize redundant Gemini calls
  const categoryReportCache = new Map<string, { report: any, time: number }>();

  // API Route to generate professional trend report for categories
  app.post("/api/category-report", async (req, res) => {
    const { category, keywords } = req.body;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    const kvs = Array.isArray(keywords) ? keywords : [];
    const cacheKey = `${category}:${kvs.sort().join(",")}`;

    // Check cache (12 minutes)
    const cached = categoryReportCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 12 * 60 * 1000) {
      return res.json(cached.report);
    }

    try {
      const categoryNames: Record<string, string> = {
        all: "전체 분야 종합",
        news: "시사/뉴스 분야",
        sports: "스포츠/게임 분야",
        entertainment: "연예/문화 분야",
        tech: "테크/경제 분야",
        other: "기타 일반분야"
      };

      const printableCategory = categoryNames[category] || category;
      const prompt = `당신은 대한민국 최고의 디지털 트렌드 애널리스트입니다.
현재 "${printableCategory}" 카테고리에서 다음 검색어들이 실시간 인기 검색어로 뜨고 있습니다:
${kvs.join("\n")}

이 키워드 데이터를 면밀히 분석하여 전문적이고 인사이트풀한 실시간 트렌드 보고서를 JSON 객체로 생성해 주세요.
반드시 아래 JSON 스키마를 준수하여 완벽한 JSON으로만 답해 주십시오.

{
  "overview": "현재 이 분야의 열기를 자아내는 핵심 원인과 거시적 동향을 한국어로 1-2문장으로 간결하고 전문적인 톤으로 요약",
  "attentionScore": 85~99 사이의 정수로 정성 평가한 이 분야의 실시간 대중 집중 점수,
  "keyThemes": ["주목해야 할 맥락/테마 1", "주목해야 할 맥락/테마 2"],
  "prosOpinion": "전문가 관점에서의 이 트렌드가 산업/사회에 미칠 파급력 분석이나 전망 (1문장, 공손하고 신뢰도 높은 어조)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING },
              attentionScore: { type: Type.INTEGER },
              keyThemes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              prosOpinion: { type: Type.STRING }
            },
            required: ["overview", "attentionScore", "keyThemes", "prosOpinion"]
          },
          temperature: 0.2
        }
      });

      const text = response.text?.trim() || "{}";
      const report = JSON.parse(text);

      categoryReportCache.set(cacheKey, { report, time: Date.now() });
      res.json(report);
    } catch (err) {
      console.error("Failed to generate category report:", err);
      // Fallback response with clean defaults
      const fallbacks: Record<string, any> = {
        news: {
          overview: "현재 주요 시사/뉴스 분야에서는 사회적 이슈 및 정책적 소식에 대한 국민들의 지속적인 알 권리와 탐색 활동이 지배하고 있습니다.",
          attentionScore: 92,
          keyThemes: ["주요 사회적 쟁점", "인물 중심적 탐색"],
          prosOpinion: "미디어 보도 추이에 따라 여론의 파급 효과가 길어질 수 있어 신뢰할 수 있는 소스의 교차 검증이 요구됩니다."
        },
        sports: {
          overview: "시즌 중인 프로 스포츠 리그와 글로벌 매치, 새로운 비디오 게임 및 e-스포츠 대회의 경기 결과가 트렌드를 이끌고 있습니다.",
          attentionScore: 89,
          keyThemes: ["리그 실시간 경기 결과", "대표급 선수들의 활약상"],
          prosOpinion: "팬덤 중심의 온라인 커뮤니티 전파 속도가 매우 활발하여 즉각적인 미디어 가공과 연계 마케팅 효과가 큽니다."
        },
        entertainment: {
          overview: "신작 드라마/영화의 개봉 정보와 신인 및 기성 아티스트들의 미디어 복귀 소식 및 서브컬처 콘텐츠가 화제의 중심입니다.",
          attentionScore: 95,
          keyThemes: ["신작 복귀작 피드백", "아티스트 관련 SNS 트렌드"],
          prosOpinion: "글로벌 K-콘텐츠의 수요 견인과 소셜 미디어 내 입소문 확산이 흥행 여부를 가르는 즉각적 지표로 작용하고 있습니다."
        },
        tech: {
          overview: "차세대 하드웨어 출시 정보, 글로벌 빅테크 기업들의 기술 로드맵 공개와 함께 자산 가격의 주식/가상자산 움직임에 주시하고 있습니다.",
          attentionScore: 91,
          keyThemes: ["신기술 적용 고도화", "투자 관심 종목 분석"],
          prosOpinion: "거시 경제적 흐름과 직결된 기술 수용 주기가 단축되는 시기이므로 선제적인 시장 정보 모니터링이 가치가 큽니다."
        },
        other: {
          overview: "일반 상식어, 화제가 되는 공간/지리 지명, 혹은 특별 유행어들이 실시간 검색 영역에서 산발적으로 관심을 모으고 있습니다.",
          attentionScore: 86,
          keyThemes: ["커뮤니티 파생 밈(Meme)", "계절성/일상 편의 정보"],
          prosOpinion: "가벼운 밈성 소비는 일시적 트렌드로 소멸하기 쉬우나, 사회 문화적 공감대를 반영하는 기폭제가 되기도 합니다."
        }
      };

      const fallback = fallbacks[category] || {
        overview: "실시간 검색 키워드 분석을 토대로 한 인사이트 정보입니다. 미디어 반응도가 고조되고 있습니다.",
        attentionScore: 88,
        keyThemes: ["사용자 관심사 분산 탐색", "실시간 화두 인출"],
        prosOpinion: "지속 가능한 트렌드인지 여부는 수 시간 내 검색 지속성을 분석함으로 측정할 수 있습니다."
      };

      res.json(fallback);
    }
  });

  // API Route to get breaking news ticker
  app.get("/api/news", async (req, res) => {
    try {
      if (newsCache && Date.now() - newsCache.time < 5 * 60 * 1000) {
        return res.json({ news: newsCache.items });
      }

      let xmlData = "";
      let isGoogleNews = false;

      // 1. Try Google News Latest Headlines RSS (Highly dynamic multi-outlet aggregator)
      try {
        const rssRes = await fetch("https://news.google.com/rss/headlines/section/topic/LATEST?hl=ko&gl=KR&ceid=KR:ko");
        if (rssRes.ok) {
          xmlData = await rssRes.text();
          isGoogleNews = true;
        }
      } catch (err) {
        console.warn("Failed to fetch Google News LATEST, trying main RSS:", err);
      }

      // 2. Try Google News general RSS
      if (!xmlData) {
        try {
          const rssRes = await fetch("https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko");
          if (rssRes.ok) {
            xmlData = await rssRes.text();
            isGoogleNews = true;
          }
        } catch (err) {
          console.warn("Failed to fetch Google News main RSS:", err);
        }
      }

      // 3. Fallback to SBS News RSS
      if (!xmlData) {
        const rssRes = await fetch("https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER");
        if (!rssRes.ok) {
          throw new Error("Failed to fetch all news RSS sources");
        }
        xmlData = await rssRes.text();
      }

      const jsonObj = parser.parse(xmlData);
      const rawItems = jsonObj?.rss?.channel?.item || [];
      const itemsList = Array.isArray(rawItems) ? rawItems : [rawItems];
      
      const newsItems = itemsList.filter(Boolean).slice(0, 25).map((item: any) => {
        const originalTitle = String(item.title || "");
        
        if (isGoogleNews) {
          const match = originalTitle.match(/(.*) - ([^-]+)$/);
          let cleanTitle = match ? match[1].trim() : originalTitle;
          const sourceName = match ? match[2].trim() : (item.source?.['#text'] || item.source || "뉴스");
          
          // Strip redundant publisher prefixes
          if (cleanTitle.startsWith(`[${sourceName}]`)) {
            cleanTitle = cleanTitle.substring(sourceName.length + 2).trim();
          }
          
          return {
            title: cleanTitle,
            link: item.link
          };
        } else {
          return {
            title: originalTitle,
            link: item.link
          };
        }
      });

      newsCache = { items: newsItems, time: Date.now() };
      res.json({ news: newsItems });
    } catch (error) {
      console.error("Failed to fetch news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // API Route to get KOSPI index
  app.get("/api/kospi", async (req, res) => {
    try {
      const kospiRes = await fetch("https://m.stock.naver.com/api/index/KOSPI/basic");
      if (!kospiRes.ok) {
        throw new Error("Failed to fetch KOSPI");
      }
      const data = await kospiRes.json();
      res.json({
        price: data.closePrice,
        change: data.compareToPreviousClosePrice,
        ratio: data.fluctuationsRatio,
        status: data.compareToPreviousPrice?.code // 2: RISING, 5: FALLING, 3: STEADY
      });
    } catch (error) {
      console.error("Failed to fetch KOSPI:", error);
      res.status(500).json({ error: "Failed to fetch KOSPI" });
    }
  });

  // Cache for categorized ranking
  let rankingCache: { items: { keyword: string, category: string }[], time: number } | null = null;

  // Initialize Gemini Client
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route to get ranking with AI classification
  app.get("/api/ranking", async (req, res) => {
    try {
      // 1. Check cache (valid for 3 minutes)
      if (rankingCache && (Date.now() - rankingCache.time < 3 * 60 * 1000)) {
        return res.json({ ranking: rankingCache.items });
      }

      let rawKeywords: string[] = [];
      try {
        const response = await fetch("https://api.codetabs.com/v1/proxy?quest=https://search.namu.wiki/api/ranking");
        if (!response.ok) {
          throw new Error("Failed to fetch ranking");
        }
        rawKeywords = await response.json();
      } catch (err) {
        console.warn("API proxy blocked. Yielding to fallback data.", err);
        rawKeywords = [
          "박지현",
          "이준",
          "김세의",
          "리센느",
          "lck",
          "백룸(영화)",
          "군체",
          "홍민택",
          "서소문고가도로 붕괴 사건",
          "백룸"
        ];
      }

      if (!rawKeywords || rawKeywords.length === 0) {
        return res.json({ ranking: [] });
      }

      // 2. Classify keywords using Gemini-3.5-flash
      const classificationMap: Record<string, string> = {};
      try {
        const prompt = `주어진 실시간 검색어 키워드 목록을 아래 5가지 카테고리 중 하나로 정확하게 분류해 주세요:
- 'news': 시사, 정치, 사회적 이슈, 사건사고, 경제 정책 관련 뉴스 인물
- 'sports': 스포츠 경기, 선수, 구단, 리그, e-스포츠, 비디오 게임
- 'entertainment': 연예, 연예인, 아이돌, 노래, K-pop, 영화, 드라마, 웹툰, 방송 프로그램, 서브컬처 문화 콘텐츠
- 'tech': 테크, IT 기업, 플랫폼, 스마트폰, 과학, 하드웨어/소프트웨어, 가상자산/주식 등 경제 투자 트렌드
- 'other': 기타 일상어, 유행어, 신조어, 지리/지명, 일반 단락/이야기 등 위 분류에 명확하지 않은 것

분류할 키워드 목록:
${rawKeywords.join("\n")}

반드시 각 키워드와 분류 카테고리쌍의 JSON 배열 형식으로만 응답해 주세요. 예: [{"keyword": "...", "category": "news/sports/entertainment/tech/other"}]`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["keyword", "category"]
              }
            },
            temperature: 0.1
          }
        });

        const text = response.text?.trim() || "[]";
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.keyword && item.category) {
              classificationMap[item.keyword] = item.category;
            }
          }
        }
      } catch (geminiErr) {
        console.error("Gemini classification failed, using fallback rule-based categories:", geminiErr);
        // Fallback: Simple heuristic rules
        for (const kw of rawKeywords) {
          const lower = kw.toLowerCase();
          if (lower.includes("lck") || lower.includes("epl") || lower.includes("축구") || lower.includes("경기") || lower.includes("리그")) {
            classificationMap[kw] = "sports";
          } else if (lower.includes("영화") || lower.includes("가수") || lower.includes("아이돌") || lower.includes("그룹") || lower.includes("드라마")) {
            classificationMap[kw] = "entertainment";
          } else if (lower.includes("사건") || lower.includes("붕괴") || lower.includes("사고") || lower.includes("대통령")) {
            classificationMap[kw] = "news";
          } else {
            classificationMap[kw] = "other";
          }
        }
      }

      // Map raw keywords into objects
      const items = rawKeywords.map((kw) => ({
        keyword: kw,
        category: classificationMap[kw] || "other"
      }));

      // Cache the result
      rankingCache = { items, time: Date.now() };

      res.json({ ranking: items });

    } catch (criticalError: any) {
      console.error("Critical error in /api/ranking:", criticalError);
      res.status(500).json({ error: criticalError.message || "Failed to fetch and classify ranking" });
    }
  });

  // API Route to summarize keyword why it's trending
  app.post("/api/summary", async (req, res) => {
    const { keyword, model = "gemini-flash-lite-latest", apiKey } = req.body;
    if (!keyword) {
      return res.status(400).json({ error: "Keyword is required" });
    }

    // Check cache (3 hours) to minimize API requests and save tokens.
    // For frequently searched keywords, we share the cache regardless of the selected model.
    const cacheKey = keyword;
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 3 * 60 * 60 * 1000) {
      return res.json({ summary: cached.text });
    }

    // Deduping: If a request for this keyword is already in flight, wait for it instead of making a duplicate API call.
    if (pendingRequests.has(cacheKey)) {
      try {
        const summaryText = await pendingRequests.get(cacheKey);
        return res.json({ summary: summaryText });
      } catch (e) {
        // Fall through to try again if the pending request failed
      }
    }

    const fetchSummary = async (): Promise<string> => {
      const currentApiKey = apiKey || process.env.GEMINI_API_KEY;

      if (model.startsWith('gpt-')) {
        if (!apiKey) throw new Error("OpenAI 모델은 사용자 지정 API Key가 필요합니다.");
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: `"${keyword}" 검색어 트렌딩 이유 1 줄로 요약` }],
            max_tokens: 60,
            temperature: 0.1
          })
        });
        if (!openaiRes.ok) {
          const errData = await openaiRes.json();
          throw new Error(errData.error?.message || "OpenAI API 호출 실패");
        }
        const data = await openaiRes.json();
        const summaryText = data.choices?.[0]?.message?.content || "";
        summaryCache.set(cacheKey, { text: summaryText, time: Date.now(), model });
        return summaryText;
      }

      if (model.startsWith('claude-')) {
        if (!apiKey) throw new Error("Anthropic 모델은 사용자 지정 API Key가 필요합니다.");
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: `"${keyword}" 검색어 트렌딩 이유 1 줄로 요약` }],
            max_tokens: 60,
            temperature: 0.1
          })
        });
        if (!anthropicRes.ok) {
          const errData = await anthropicRes.json();
          throw new Error(errData.error?.message || "Anthropic API 호출 실패");
        }
        const data = await anthropicRes.json();
        const summaryText = data.content?.[0]?.text || "";
        summaryCache.set(cacheKey, { text: summaryText, time: Date.now(), model });
        return summaryText;
      }

      const aiClient = new GoogleGenAI({ 
        apiKey: currentApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await aiClient.models.generateContent({
        model: model,
        contents: `"${keyword}" 검색어 트렌딩 이유 1 줄로 요약`,
        config: {
          tools: [{ googleSearch: {} }],
          maxOutputTokens: 60,
          temperature: 0.1,
        },
      });

      const summaryText = response.text || "";
      summaryCache.set(cacheKey, { text: summaryText, time: Date.now(), model });
      return summaryText;
    };

    const promise = fetchSummary().finally(() => {
      pendingRequests.delete(cacheKey);
    });

    pendingRequests.set(cacheKey, promise);

    try {
      const summaryText = await promise;
      res.json({ summary: summaryText });
    } catch (error: any) {
      const isRateLimit = 
        (error?.status === 429) || 
        (error?.message?.includes("429")) || 
        (error?.message?.includes("RESOURCE_EXHAUSTED")) ||
        (error?.message?.includes("quota"));
        
      if (!isRateLimit) {
        console.error("Error generating summary:", error);
      }
      
      try {
        const rssRes = await fetch("https://news.google.com/rss/search?q=" + encodeURIComponent(keyword) + "&hl=ko&gl=KR&ceid=KR:ko");
        if (rssRes.ok) {
          const xmlData = await rssRes.text();
          const jsonObj = parser.parse(xmlData);
          const items = jsonObj?.rss?.channel?.item || [];
          const firstNews = Array.isArray(items) ? items[0] : items;
          
          if (firstNews && firstNews.title) {
            // Strip out the source name normally appended at the end " - 소스명"
            const titleClean = firstNews.title.replace(/ - [^-]+$/, "");
            const fallbackSummary = `[관련 뉴스] ${titleClean}`;
            summaryCache.set(cacheKey, { text: fallbackSummary, time: Date.now(), model });
            return res.json({ summary: fallbackSummary });
          }
        }
      } catch (newsError) {
        console.error("Failed to fetch fallback news:", newsError);
      }

      if (isRateLimit) {
        // Silent fallback for rate limit to protect UI experience
        const fallbackSummary = "최근 이슈 및 뉴스 등으로 인해 검색량이 증가하고 있습니다. (AI 일일 쿼터 초과)";
        summaryCache.set(cacheKey, { text: fallbackSummary, time: Date.now(), model });
        res.json({ summary: fallbackSummary });
      } else {
        res.status(500).json({ error: error?.message || "AI 요약 생성에 실패했습니다." });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 4 uses * for catch-all
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

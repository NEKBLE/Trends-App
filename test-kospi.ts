fetch("https://m.stock.naver.com/api/index/KOSPI/basic").then(r=>r.json()).then(console.log).catch(console.error)

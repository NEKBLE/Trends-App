import { XMLParser } from "fast-xml-parser";

const test = async () => {
    const parser = new XMLParser();
    const rssRes = await fetch("https://news.google.com/rss/search?q=%EC%BD%94%EC%8A%A4%ED%94%BC&hl=ko&gl=KR&ceid=KR:ko");
    const xmlData = await rssRes.text();
    const jsonObj = parser.parse(xmlData);
    const items = jsonObj?.rss?.channel?.item || [];
    console.log(items[0]?.title);
}
test();

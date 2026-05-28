import { GoogleGenAI } from "@google/genai";
async function testModel(modelName: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({ model: modelName, contents: "test" });
    console.log(`Success: ${modelName}`);
  } catch (e: any) {
    console.log(`Failed: ${modelName}`);
  }
}
(async () => {
  await testModel("gemini-3.5-flash");
  await testModel("gemini-3.1-flash-lite");
  await testModel("gemini-2.5-flash-lite");
  await testModel("gemini-flash-lite-latest");
})();

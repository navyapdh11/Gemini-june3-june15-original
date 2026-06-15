/**
 * AASTACLEAN Competitive Analysis Engine
 * Uses Gemini AI to perform deep AEO, GEO, SEO, and CRO research across Australian postcodes.
 * 
 * Usage:
 * const engine = new CompetitiveAnalysisEngine(apiKey);
 * const report = await engine.analyzeSuburb("Subiaco", "6008");
 */

import { GoogleGenAI } from "@google/genai";

export class CompetitiveAnalysisEngine {
  private ai: any;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Performs a multi-pillar competitive audit for a specific Australian locality.
   */
  async analyzeSuburb(suburb: string, postcode: string) {
    const prompt = `Perform a comprehensive AEO, GEO, SEO, and CRO competitive analysis for cleaning services in ${suburb}, Australia (Postcode: ${postcode}).

Identify:
1. Top 10 Competitors in this specific postcode.
2. SEO: Who dominates local search and what keywords are they winning?
3. AEO: Who is being cited by AI agents (Siri, Alexa, Google Assistant) for local cleaning queries?
4. GEO: Visibility in Generative Search (Gemini, ChatGPT) - who has the highest trust sentiment?
5. CRO: Benchmark the top competitor's landing page conversion features.

Output the result as a structured JSON object with the following keys:
- suburb
- postcode
- top_competitors (array of names)
- seo_analysis (string)
- aeo_analysis (string)
- geo_analysis (string)
- cro_benchmarks (string)
- strategic_recommendation (string)`;

    try {
      const result = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { role: "user", parts: [{ text: prompt }] }
        ]
      });
      const response = await result;
      let text = response.text().trim();
      
      // Strip potential Markdown code blocks (e.g., ```json ... ```)
      if (text.startsWith("```")) {
        text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "");
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.error(`Error analyzing ${suburb}:`, error);
      throw error;
    }
  }

  /**
   * Batch process an array of suburbs (e.g. from the PERTH_SUBURBS_80KM_DATA.csv)
   */
  async batchAnalyze(suburbs: { name: string; postcode: string }[]) {
    const reports = [];
    for (const sub of suburbs) {
      console.log(`🚀 Analyzing ${sub.name} (${sub.postcode})...`);
      const report = await this.analyzeSuburb(sub.name, sub.postcode);
      reports.push(report);
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return reports;
  }
}

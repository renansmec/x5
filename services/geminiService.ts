
import { GoogleGenAI } from "@google/genai";
import { FullRankingEntry } from "../types";

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || process.env.VITE_API_KEY || process.env.REACT_APP_API_KEY || "";
    }
  } catch(e) {}
  return "";
};

export const getRankingInsights = async (ranking: FullRankingEntry[], seasonName: string): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "Configuração de API Key do Gemini ausente.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const rankingSummary = ranking.map(r => 
    `${r.nick}: KD ${r.kd.toFixed(2)}, Dano ${r.damage}, Assistências ${r.assists}`
  ).join('\n');

  const prompt = `
    Como um analista profissional de e-sports, faça uma breve análise (em português) do ranking da ${seasonName}.
    Destaque quem foi o MVP (baseado em KD e Dano) e dê um "conselho" engraçado para quem está na lanterna.
    Seja breve (máximo 150 palavras).
    
    Dados do Ranking:
    ${rankingSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
      }
    });
    return response.text || "Não foi possível gerar análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O analista de IA está de folga hoje.";
  }
};

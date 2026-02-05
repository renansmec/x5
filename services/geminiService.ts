
import { GoogleGenAI } from "@google/genai";
import { PlayerRankingRow } from "../types";

export const getPlayerInsights = async (ranking: PlayerRankingRow[], seasonName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const topPlayers = ranking.slice(0, 5).map(p => 
    `Nick: ${p.nick}, K/D: ${p.kd}, Dano Médio: ${p.avg_damage}, Partidas: ${p.matches}`
  ).join('\n');

  const prompt = `Você é um analista profissional de e-sports de CS/Valorant. 
Analise o ranking da "${seasonName}" para o grupo de amigos X5.
Com base nestes dados dos top 5 jogadores:
${topPlayers}

Crie um resumo sarcástico e divertido (estilo narração de e-sports) destacando quem está carregando e quem é o "baiter". 
Dê um prêmio fictício para cada um dos 3 primeiros colocados. 
Limite o texto a 3 parágrafos curtos.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "O analista de IA está tirando um cochilo. Tente novamente mais tarde.";
  }
};

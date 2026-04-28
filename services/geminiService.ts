
import { GoogleGenAI, Type } from "@google/genai";
import { FullRankingEntry, ExtractedMatchData } from "../types";

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.API_KEY) return process.env.API_KEY;
      if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
      if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
      if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
    }
  } catch(e) {}
  
  try {
    // @ts-ignore
    if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
  } catch(e) {}
  
  return "";
};

export const extractMatchDataFromImage = async (base64Image: string, mimeType: string): Promise<ExtractedMatchData> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("Configuração de API Key do Gemini ausente.");
    throw new Error("API Key do Gemini não encontrada! \\nPara funcionar na Vercel:\\n1. Gere uma chave em aistudio.google.com/app/apikey\\n2. Vá no painel da Vercel (Settings -> Environment Variables)\\n3. Crie uma variável chamada VITE_GEMINI_API_KEY com sua chave\\n4. Faça um novo Deploy na Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analise a imagem do placar final de uma partida de jogo de tiro (como CS:GO, Valorant, etc).
    Extraia as seguintes informações:
    1. O nome do mapa jogado.
    2. O nome do Time 1 e seu placar (pontos/rounds ganhos).
    3. O nome do Time 2 e seu placar (pontos/rounds ganhos).
    4. O nome do time vencedor.
    5. Para cada jogador na partida, extraia:
       - nick (nome do jogador)
       - team (indique se o jogador pertence ao 'team1' ou 'team2')
       - kills (vítimas/abates)
       - deaths (mortes)
       - assists (assistências)
       - damage (dano total causado)
       - hsPercent (porcentagem de headshots, apenas o número, ex: 45 para 45%)
    
    Se algum dado não estiver visível, tente inferir ou coloque 0.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        { text: prompt },
        { inlineData: { data: base64Image, mimeType } }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            map: { type: Type.STRING, description: "Nome do mapa" },
            team1Name: { type: Type.STRING, description: "Nome do Time 1" },
            team2Name: { type: Type.STRING, description: "Nome do Time 2" },
            team1Score: { type: Type.INTEGER, description: "Placar do Time 1" },
            team2Score: { type: Type.INTEGER, description: "Placar do Time 2" },
            winningTeam: { type: Type.STRING, description: "Nome do time vencedor" },
            players: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nick: { type: Type.STRING, description: "Nome do jogador" },
                  team: { type: Type.STRING, description: "Time do jogador ('team1' ou 'team2')" },
                  kills: { type: Type.INTEGER, description: "Número de kills/abates" },
                  deaths: { type: Type.INTEGER, description: "Número de mortes" },
                  assists: { type: Type.INTEGER, description: "Número de assistências" },
                  damage: { type: Type.INTEGER, description: "Dano total" },
                  hsPercent: { type: Type.INTEGER, description: "Porcentagem de Headshots (apenas o número, ex: 45 para 45%)" }
                },
                required: ["nick", "team", "kills", "deaths", "assists", "damage", "hsPercent"]
              }
            }
          },
          required: ["map", "team1Name", "team2Name", "team1Score", "team2Score", "winningTeam", "players"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("A resposta da IA estava vazia.");
    }
    
    return JSON.parse(text) as ExtractedMatchData;
  } catch (error: any) {
    console.error("Erro detalhado do Gemini SDK:", error);
    throw new Error("Falha na IA: " + (error?.message || JSON.stringify(error) || "Desconhecido"));
  }
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
      model: 'gemini-1.5-flash',
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

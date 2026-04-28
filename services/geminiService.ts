
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

  const config = {
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
  };

  const modelsToTry = [
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b'
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType } }
        ],
        config
      });

      let text = response.text;
      if (!text) {
        throw new Error("A resposta da IA estava vazia.");
      }
      
      // Limpeza de possíveis blocos de Markdown JSON
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      return JSON.parse(text) as ExtractedMatchData;
    } catch (error: any) {
      console.warn(`Erro com o modelo ${model}:`, error);
      lastError = error;
      
      const errorMsg = error?.message || JSON.stringify(error) || "";
      
      // Se for um erro de cota ou limite, ele afeta a conta toda. Paramos aqui para mostrar a mensagem certa.
      if (errorMsg.includes("limit: 0") || errorMsg.includes("Quota exceeded") || errorMsg.includes("429")) {
        throw new Error("Sua chave da API do Gemini não possui COTA GRATUITA habilitada ou atingiu o limite diário.\\n\\nVerifique sua conta no Google AI Studio (aistudio.google.com). Pode ser necessário ativar o faturamento na conta do Google Cloud vinculada.");
      }
      
      // Se for SyntaxError de JSON, não tenta denovo com outro modelo,
      // pois o problema não é o modelo, é o output
      if (error instanceof SyntaxError) {
        throw new Error("Falha ao organizar os dados da imagem. O resultado não pôde ser lido.");
      }
    }
  }

  // Se nenhum funcionou:
  console.error("Todos os modelos falharam. Último erro:", lastError);
  let errorMsg = lastError?.message || JSON.stringify(lastError);
  
  if (errorMsg.includes("limit: 0")) {
    throw new Error("Sua chave da API do Gemini não possui COTA GRATUITA habilitada ou atingiu o limite.\\n\\nVerifique sua conta no Google AI Studio. Pode ser necessário criar um novo projeto ou chave.");
  }
  
  throw new Error("Nenhum modelo da IA funcionou:\\n" + errorMsg);
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

  const modelsToTry = [
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b'
  ];

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.8,
        }
      });
      if (response.text) return response.text;
    } catch (error) {
      console.warn(`Erro com o modelo ${model} no Ranking Insights:`, error);
    }
  }

  return "O analista de IA está de folga hoje. (Limite excedido ou erro de chave)";
};

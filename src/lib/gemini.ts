import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { supabase } from "./supabase";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function analyzeConsultation(data: {
  weight: number;
  height: number;
  bmi: number;
  systolic: number;
  diastolic: number;
  glucose: number;
  patientSex?: 'M' | 'F';
  isSmoker?: boolean;
  isTreated?: boolean;
  cvdRisk?: number;
  physicalExamination?: string;
}) {
  // Modelo Lite para economia de tokens e quota
  const model = "gemini-3.1-flash-lite-preview";
  
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return "Erro: Chave API do Gemini não configurada.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `Você é um Médico Especialista da Iniciativa Sidrah em Moçambique.
Gere um relatório de triagem EXTREMAMENTE CONCISO (máximo 100 palavras).

ESTRUTURA:
1. ✅ NORMAL: Indicadores normais.
2. ⚠️ ALERTAS: O que está fora do padrão.
3. 💡 AÇÕES: Recomendações diretas.
4. 🏥 SEGUIMENTO: Quando procurar médico.

ESTILO: Markdown, direto, sem introduções.`;

  const prompt = `DADOS: IMC ${data.bmi.toFixed(1)}, TA ${data.systolic}/${data.diastolic}, Glicemia ${data.glucose}, Sexo ${data.patientSex}, Fumador ${data.isSmoker ? 'Sim' : 'Não'}, Risco CVD ${data.cvdRisk}%. ${data.physicalExamination ? `Exame: ${data.physicalExamination}` : ''}`;

  try {
    const parts: any[] = [{ text: prompt }];

    // Fetch Knowledge Base - Limitado a 1 documento para economizar tokens
    const { data: kbDocs } = await supabase
      .from('knowledge_base')
      .select('file_url')
      .limit(1); 

    if (kbDocs?.[0]) {
      try {
        const res = await fetch(kbDocs[0].file_url);
        if (res.ok) {
          const blob = await res.blob();
          // Limite de 2MB para preservar quota
          if (blob.size <= 2 * 1024 * 1024) {
            const base64 = await blobToBase64(blob);
            const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: 'application/pdf'
              }
            });
          }
        }
      } catch (e) {
        console.error("Error loading KB doc:", e);
      }
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.1,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // Minimiza custo de tokens
      },
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia.");

    return text;
  } catch (error: any) {
    console.error("Error analyzing with Gemini:", error);
    if (error?.message?.includes("quota")) {
      return "Erro: Limite de utilização atingido. Otimizações de tokens aplicadas para reduzir este erro.";
    }
    return "Erro técnico na análise automática. Por favor, realize a análise manualmente.";
  }
}

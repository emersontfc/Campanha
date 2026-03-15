import { GoogleGenAI } from "@google/genai";
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
  const model = "gemini-3-flash-preview";
  
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing");
    return "Erro: Chave API do Gemini não configurada. Por favor, adicione uma chave nas definições do projeto.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `Você é um Médico Especialista da Al-Shifa Health em Moçambique.
Gere um relatório de triagem Racional, Conciso e Direto (máximo 150 palavras).

ESTRUTURA OBRIGATÓRIA:
1. ✅ PARÂMETROS NORMAIS: Liste apenas os nomes dos indicadores que estão dentro da normalidade.
2. ⚠️ ALTERAÇÕES DETECTADAS: Explique brevemente o que está fora do padrão e o risco associado.
3. 💡 RECOMENDAÇÕES: Sugestões não farmacológicas (dieta, exercício, hábitos). Utilize as diretrizes fornecidas nos documentos da Base de Conhecimento se disponíveis.
4. 🏥 SEGUIMENTO: Recomendação clara de quando e onde procurar apoio médico.

ESTILO:
- Use Markdown para estruturar (negrito para destaques).
- Tom profissional, empático e focado em Moçambique.
- Evite introduções longas ou saudações excessivas. Vá direto aos pontos.`;

  const prompt = `DADOS DO PACIENTE:
- IMC: ${data.bmi.toFixed(1)} (Peso: ${data.weight}kg, Altura: ${data.height}cm)
- TA: ${data.systolic}/${data.diastolic} mmHg
- Glicemia: ${data.glucose} mmol/L
- Sexo: ${data.patientSex === 'M' ? 'Masc' : 'Fem'}
- Fumador: ${data.isSmoker ? 'Sim' : 'Não'}
- Em tratamento TA: ${data.isTreated ? 'Sim' : 'Não'}
- Risco CVD (10 anos): ${data.cvdRisk}%
${data.physicalExamination ? `- Exame Físico: ${data.physicalExamination}` : ''}

REFERÊNCIA DE NORMALIDADE:
- TA: < 130/85 mmHg
- Glicemia: 4.0 - 7.0 mmol/L
- IMC: 18.5 - 24.9

Gere a análise clínica racionalizada baseando-se nos dados acima e nas diretrizes dos documentos anexados (se houver).`;

  try {
    const parts: any[] = [{ text: prompt }];

    // Fetch Knowledge Base documents
    const { data: kbDocs } = await supabase
      .from('knowledge_base')
      .select('file_url')
      .limit(2); // Reduced limit to avoid payload size issues

    if (kbDocs && kbDocs.length > 0) {
      for (const doc of kbDocs) {
        try {
          const res = await fetch(doc.file_url);
          if (!res.ok) continue;
          const blob = await res.blob();
          if (blob.size > 4 * 1024 * 1024) continue; // Skip files > 4MB
          const base64 = await blobToBase64(blob);
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf'
            }
          });
        } catch (e) {
          console.error("Error loading KB doc:", e);
        }
      }
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.2, // Lower temperature for more consistent medical advice
        topP: 0.8,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("A IA retornou uma resposta vazia.");
    }

    return text;
  } catch (error: any) {
    console.error("Error analyzing with Gemini:", error);
    const errorMessage = error?.message || String(error);
    
    if (errorMessage.includes("API key not valid")) {
      return "Erro: A chave API do Gemini é inválida. Por favor, verifique as definições.";
    }
    
    if (errorMessage.includes("permission") || error?.status === "PERMISSION_DENIED") {
      return "Erro: A sua chave API não tem permissão para usar este modelo. Certifique-se de que a API Generative Language está ativa no seu projeto Google Cloud.";
    }
    
    if (errorMessage.includes("quota")) {
      return "Erro: Limite de utilização da IA atingido. Por favor, tente novamente mais tarde.";
    }

    return "Pedimos desculpa, mas não conseguimos gerar a análise automática agora devido a um erro técnico. Por favor, realize a análise manualmente.";
  }
}

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeConsultation(data: {
  weight: number;
  height: number;
  bmi: number;
  systolic: number;
  diastolic: number;
  glucose: number;
}) {
  const model = "gemini-2.5-flash-latest";
  
  const systemInstruction = `Você é um Arquiteto de Saúde e Médico Especialista da Al-Shifa Health Initiative em Moçambique.
Sua tarefa é analisar dados biométricos de triagens comunitárias e gerar um relatório humanizado, preventivo e educativo.

DIRETRIZES:
1. Linguagem: Português de Moçambique, simples, empática e direta.
2. Foco: Prevenção de Doenças Não Transmissíveis (DNTs).
3. Estrutura: 
   - Saudação calorosa.
   - Explicação do IMC (Peso vs Altura).
   - Explicação da Tensão Arterial (Risco Cardiovascular).
   - Explicação da Glicemia (Risco de Diabetes).
   - 3 Recomendações práticas de estilo de vida.
   - Encorajamento para seguimento médico.

IMPORTANTE: Não use termos técnicos complexos. Seja motivador, não alarmista.`;

  const prompt = `DADOS CLÍNICOS PARA ANÁLISE:
- IMC: ${data.bmi.toFixed(2)} (Peso: ${data.weight}kg, Altura: ${data.height}cm)
- Tensão Arterial: ${data.systolic}/${data.diastolic} mmHg
- Glicemia: ${data.glucose} mmol/L (Millimol por litro)
- Nota: Considere 4.0 a 7.0 mmol/L como normal em jejum.

Por favor, gere o relatório de saúde para o paciente.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing with Gemini:", error);
    return "Pedimos desculpa, mas não conseguimos gerar a análise automática agora. Por favor, fale com o profissional de saúde presente.";
  }
}

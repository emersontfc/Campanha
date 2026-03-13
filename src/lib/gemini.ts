import { GoogleGenAI } from "@google/genai";

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
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return "Erro: Chave API do Gemini não configurada. Por favor, adicione GEMINI_API_KEY nas definições do projeto.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `Você é um Médico Especialista da Al-Shifa Health em Moçambique.
Gere um relatório de triagem Racional, Conciso e Direto (máximo 150 palavras).

ESTRUTURA OBRIGATÓRIA:
1. ✅ PARÂMETROS NORMAIS: Liste apenas os nomes dos indicadores que estão dentro da normalidade.
2. ⚠️ ALTERAÇÕES DETECTADAS: Explique brevemente o que está fora do padrão e o risco associado.
3. 💡 RECOMENDAÇÕES: Sugestões não farmacológicas (dieta, exercício, hábitos).
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

Gere a análise clínica racionalizada seguindo a estrutura solicitada.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.4,
        topP: 0.8,
      },
    });

    if (!response.text) {
      throw new Error("Resposta vazia da IA");
    }

    return response.text;
  } catch (error) {
    console.error("Error analyzing with Gemini:", error);
    return "Pedimos desculpa, mas não conseguimos gerar a análise automática agora. Por favor, fale com o profissional de saúde presente.";
  }
}

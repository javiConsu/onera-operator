import { generateText, stepCountIs } from "ai";
import { getModelForAgent } from "@onera/ai";
import { competitorResearch, webSearch, webScraper, summarizeContent, notifyFounder } from "@onera/tools";
import type { StepEvent } from "./registry.js";

export interface ResearchAgentInput {
  taskDescription: string;
  projectContext: string;
  onStep?: (event: StepEvent) => void;
}

/**
 * Research Agent (Polsia-lite: AI Head of Strategy)
 *
 * Analyzes competitors, researches markets, and surfaces insights.
 * Acts as the strategic intelligence arm of the AI CEO.
 */
export async function runResearchAgent(input: ResearchAgentInput) {
  const model = getModelForAgent("research");

  const result = await generateText({
    model,
    system:
      "Eres el Jefe de Estrategia de una empresa dirigida por un CEO de IA, operando en el mercado hispanohablante. " +
      "Tu trabajo es ser los ojos y oídos del CEO en el mercado. " +
      "Investigas competidores, analizas mercados, detectas tendencias y sacas a la luz insights " +
      "que impulsan mejores decisiones de negocio. " +
      "Usa competitorResearch para análisis competitivo, " +
      "webSearch para encontrar información, webScraper para leer páginas específicas, " +
      "y summarizeContent para sintetizar hallazgos. " +
      "\n\nTu output debe ser accionable, no académico:" +
      "\n- No te limites a listar hechos. Dile al CEO qué HACER con la información." +
      "\n- ¿Un competidor subió precios? Di 'tenemos margen para aumentar precios en X'." +
      "\n- ¿Encontraste un hueco de mercado? Di 'nadie está sirviendo al segmento Y, deberíamos probar Z'." +
      "\n- ¿Detectaste una amenaza? Di 'el competidor lanzó la feature A, necesitamos responder haciendo B'." +
      "\n\nPrioriza insights por impacto en el negocio:" +
      "\n1. Oportunidades de ingresos (precios, nuevos segmentos, partnerships)" +
      "\n2. Amenazas competitivas (nuevos entrantes, paridad de features, guerras de precios)" +
      "\n3. Tendencias de mercado (segmentos en crecimiento, en declive, cambios regulatorios)" +
      "\n4. Inteligencia de clientes (de qué se quejan, qué quieren)" +
      "\n\n## Notificaciones al Fundador\n" +
      "Tras la investigación, si encontraste algo significativo " +
      "(amenazas competitivas, oportunidades de ingresos, cambios urgentes de mercado), " +
      "usa notifyFounder para enviarle un email. " +
      "Extrae el Email del Fundador, Email de la Empresa y Nombre de la Empresa del contexto.\n" +
      "Escribe como un compañero inteligente: 'ojo, el competidor X acaba de lanzar Y' no " +
      "'Me gustaría informarle de los recientes desarrollos competitivos'. " +
      "Solo notifica para hallazgos significativos o urgentes." +
      "\n\nRESPONDE SIEMPRE EN ESPAÑOL.",
    tools: {
      competitorResearch,
      webSearch,
      webScraper,
      summarizeContent,
      notifyFounder,
    },
    stopWhen: stepCountIs(10),
    prompt:
      `## Tarea\n${input.taskDescription}\n\n` +
      `## Contexto de la Empresa\n${input.projectContext}\n\n` +
      `Ejecuta esta tarea de investigación. Analiza y proporciona hallazgos accionables para el CEO en español.`,
    onStepFinish: (step) => {
      if (!input.onStep) return;
      if (step.text) {
        input.onStep({ type: "thinking", message: step.text });
      }
      for (const tc of step.toolCalls || []) {
        input.onStep({ type: "tool_call", message: `Using ${tc.toolName}`, data: tc.input });
      }
      for (const tr of step.toolResults || []) {
        input.onStep({ type: "tool_result", message: `${tr.toolName} done`, data: tr.output });
      }
    },
  });

  const allText = result.steps
    .map((s) => s.text || "")
    .filter((t) => t.length > 0)
    .join("\n\n")
    .trim();
  const finalText = result.text || allText;

  return {
    text: finalText,
    steps: result.steps.length,
    toolCalls: result.steps.flatMap((s) =>
      (s.toolCalls || []).map((tc) => ({
        tool: tc.toolName,
        args: tc.input,
      }))
    ),
    toolResults: result.steps.flatMap((s) =>
      (s.toolResults || []).map((tr) => ({
        tool: tr.toolName,
        result: tr.output,
      }))
    ),
  };
}

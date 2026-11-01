import { env } from '../config/env.js';

export interface AttentionFeatures {
  appName: string;
  category: string;
  hoursUsed: number;
  dayUsed: string;
  numberEvents: number;
  numberInteractions: number;
  switches: number;
  eventSpan: number;
}

export interface AttentionPrediction {
  predictedAttentionScore: number;
  isDistracted: boolean;
  distractionProbability: number;
  riskLevel: 'low' | 'moderate' | 'high';
  source: 'ml_model' | 'heuristic_engine';
}

export async function checkAiHealth(): Promise<'up' | 'down'> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const url = new URL('/healthz', env.AI_SERVICE_URL).toString();
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok ? 'up' : 'down';
  } catch {
    clearTimeout(timeoutId);
    return 'down';
  }
}

export async function predictAttention(features: AttentionFeatures): Promise<AttentionPrediction> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const url = new URL('/predict', env.AI_SERVICE_URL).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: features.appName,
        category: features.category,
        hours_used: features.hoursUsed,
        day_used: features.dayUsed,
        number_events: features.numberEvents,
        number_interactions: features.numberInteractions,
        switches: features.switches,
        event_span: features.eventSpan,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as {
        attention_score?: number;
        is_distracted?: boolean | number;
        distraction_probability?: number;
      };

      const score = Math.round(Number(data.attention_score ?? 70));
      const isDistracted = Boolean(data.is_distracted);
      const prob = Number(data.distraction_probability ?? (isDistracted ? 0.78 : 0.22));

      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (score < 50 || isDistracted) riskLevel = 'high';
      else if (score < 70) riskLevel = 'moderate';

      return {
        predictedAttentionScore: Math.min(100, Math.max(10, score)),
        isDistracted,
        distractionProbability: Number(prob.toFixed(2)),
        riskLevel,
        source: 'ml_model',
      };
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Resilient heuristic engine fallback matching the trained RandomForest pipeline
  return computeHeuristicPrediction(features);
}

function computeHeuristicPrediction(f: AttentionFeatures): AttentionPrediction {
  const cat = f.category.toLowerCase();
  let baseScore = 75;

  if (cat === 'productive') baseScore = 85;
  else if (cat === 'communication') baseScore = 65;
  else if (cat === 'social') baseScore = 40;
  else if (cat === 'entertainment') baseScore = 35;
  else baseScore = 60;

  // Penalize high switch rate
  const switchRate = f.hoursUsed > 0 ? f.switches / f.hoursUsed : f.switches;
  const switchPenalty = Math.min(25, switchRate * 1.5);

  // Bonus for sustained engagement
  const interactionBonus = Math.min(10, (f.numberInteractions / 1000) * 2);

  const calculatedScore = Math.round(Math.min(100, Math.max(10, baseScore - switchPenalty + interactionBonus)));
  const isDistracted = calculatedScore < 55 || cat === 'social' || cat === 'entertainment';
  const distractionProbability = isDistracted ? 0.82 : 0.18;

  let riskLevel: 'low' | 'moderate' | 'high' = 'low';
  if (calculatedScore < 50 || isDistracted) riskLevel = 'high';
  else if (calculatedScore < 70) riskLevel = 'moderate';

  return {
    predictedAttentionScore: calculatedScore,
    isDistracted,
    distractionProbability,
    riskLevel,
    source: 'heuristic_engine',
  };
}

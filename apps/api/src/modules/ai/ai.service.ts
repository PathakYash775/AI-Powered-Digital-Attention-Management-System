import { recommendationsService } from '../recommendations/recommendations.service.js';
import { analyticsService } from '../analytics/analytics.service.js';
import { geminiService } from '../../lib/gemini.service.js';
import { checkAiHealth } from '../../lib/aiClient.js';
import type { ExplainFindingInput, AssistantQuestionInput } from './ai.schemas.js';

export const aiService = {
  async getDailyBriefing(userId: string, targetDate?: string) {
    const ctx = await recommendationsService.getTelemetryContext(userId, targetDate);
    return geminiService.generateDailyBriefing(ctx);
  },

  async getWeeklyReport(userId: string, targetDate?: string) {
    const date = targetDate || new Date().toISOString().slice(0, 10);
    const [ctx, weeklySummary] = await Promise.all([
      recommendationsService.getTelemetryContext(userId, date),
      analyticsService.getWeeklySummary(userId, date),
    ]);

    const daysWithSwitchCount = (weeklySummary.days || []).map((d) => ({
      ...d,
      switchCount: (d as any).switchCount || 0,
    }));

    return geminiService.generateWeeklyReport(ctx, daysWithSwitchCount);
  },

  async explainFinding(userId: string, input: ExplainFindingInput) {
    const ctx = await recommendationsService.getTelemetryContext(userId, input.date);
    const details = typeof input.findingDetails === 'object' && input.findingDetails !== null
      ? (input.findingDetails as Record<string, any>)
      : undefined;
    return geminiService.explainFinding(ctx, input.findingType, details);
  },

  async askAssistant(userId: string, input: AssistantQuestionInput) {
    const ctx = await recommendationsService.getTelemetryContext(userId, input.date);
    return geminiService.answerAssistantQuestion(ctx, input.question, input.history);
  },

  async getModelInfo() {
    const mlHealth = await checkAiHealth();

    return {
      serviceName: 'Attention Behavioral ML & GenAI Engine',
      regressor: {
        modelName: 'RandomForestRegressor (Attention Score)',
        version: '1.0.0',
        algorithm: 'Random Forest Ensemble Regressor (Scikit-learn)',
        target: 'continuous attention score [10 - 100]',
        estimators: 50,
        maxDepth: 12,
        evaluatedR2: 0.884,
      },
      classifier: {
        modelName: 'RandomForestClassifier (Distraction Detector)',
        version: '1.0.0',
        algorithm: 'Random Forest Binary Classifier (Scikit-learn)',
        target: 'is_distracted binary classification [0 = Focused, 1 = Distracted]',
        estimators: 50,
        evaluatedAccuracy: 0.912,
      },
      featureInputs: [
        { name: 'app_name', type: 'categorical', description: 'Normalized foreground application executable or domain' },
        { name: 'category', type: 'categorical', description: 'Productive, social, communication, entertainment, or other' },
        { name: 'day_used', type: 'categorical', description: 'Day of week (circadian & weekly pattern modulation)' },
        { name: 'hours_used', type: 'numeric', description: 'Total active usage duration in hours' },
        { name: 'number_events', type: 'numeric', description: 'Foreground window polling intervals recorded' },
        { name: 'number_interactions', type: 'numeric', description: 'Aggregated keyboard strokes and mouse interactions' },
        { name: 'switches', type: 'numeric', description: 'Context transition frequency between application boundaries' },
        { name: 'event_span', type: 'numeric', description: 'Total continuous elapsed window span in minutes' },
      ],
      generativeAi: {
        provider: 'Google Gemini 3.8 Flash (v1beta API)',
        status: process.env.GEMINI_API_KEY ? 'Configured & Active' : 'Fallback Behavioral Pipeline Active',
        capabilities: [
          'Daily Attention Briefing',
          'Weekly Multi-day Trend Analysis',
          'Anomaly & Context-Switch Explanations',
          'Natural Language Attention Assistant Q&A',
          'Personalized Focus Recommendations',
        ],
      },
      distinctions: {
        calculatedMetrics: [
          'Total Screen Time (active minutes + idle minutes)',
          'Productive vs Distracting Duration',
          'Context Switch Frequency',
          'Application Session Counts',
          'Goal Completion Percentages',
        ],
        ruleBasedFindings: [
          'Quiet Hours Suppressions',
          'Interruption Threshold Warnings (>20 context switches)',
          'Daily Goal Progress Status',
          'Optimal Break Frequency Recommendations',
        ],
        mlPredictions: [
          'Predicted Continuous Attention Score (RandomForestRegressor)',
          'Distraction Classification Probability (RandomForestClassifier)',
          'Cognitive Load / Fatigue Risk Estimation',
        ],
      },
      mlMicroserviceStatus: mlHealth,
      transparencyStatement:
        'All reported screen time durations, application session counts, and task switches are deterministic measurements from device telemetry. Attention scores and distraction indicators are probabilistic machine learning inferences evaluated by the trained model pipeline.',
    };
  },
};

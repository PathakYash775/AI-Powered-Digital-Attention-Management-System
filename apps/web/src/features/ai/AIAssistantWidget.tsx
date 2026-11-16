import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/ai';
import styles from './AIAssistantWidget.module.css';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  groundedPoints?: string[];
  suggestions?: string[];
}

const DEFAULT_PROMPTS = [
  'Why did my focus score change?',
  'Which apps took most of my time today?',
  'When is my optimal focus window?',
  'How can I reduce task switching?',
];

export function AIAssistantWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Attention Assistant. Ask me anything about your focus scores, task switching patterns, or daily productivity telemetry.',
      suggestions: DEFAULT_PROMPTS,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    const question = textToSend.trim();
    if (!question || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', text: question }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.slice(1).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await aiApi.askAssistant(question, history);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: res.answer,
          groundedPoints: res.groundedDataPoints,
          suggestions: res.suggestions,
        },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: 'Unable to analyze telemetry at this moment. Please verify your connection or try again shortly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.widgetHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBadge}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
            </svg>
          </div>
          <div>
            <h4 className={styles.title}>AI Attention Assistant</h4>
            <p className={styles.subtitle}>Grounded strictly in your device telemetry & focus records</p>
          </div>
        </div>
      </div>

      <div className={styles.chatHistory} ref={scrollRef}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`${styles.messageBubble} ${
              m.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
          >
            <div>{m.text}</div>
            {m.groundedPoints && m.groundedPoints.length > 0 && (
              <div className={styles.citationsList}>
                {m.groundedPoints.map((pt, pIdx) => (
                  <span key={pIdx} className={styles.citationTag}>
                    📊 {pt}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className={`${styles.messageBubble} ${styles.assistantMessage}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              Consulting behavioral model & Gemini analysis...
            </div>
          </div>
        )}
      </div>

      {/* Suggested Follow-ups */}
      {messages.length > 0 && messages[messages.length - 1]?.suggestions && (
        <div className={styles.quickPrompts}>
          {messages[messages.length - 1].suggestions!.map((prompt, idx) => (
            <button
              key={idx}
              className={styles.promptChip}
              onClick={() => void handleSendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        className={styles.inputRow}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendMessage(input);
        }}
      >
        <input
          type="text"
          className={styles.chatInput}
          placeholder="Ask a question about your attention patterns..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}


/**
 * Context for summarization prompts
 * Allows dynamic injection of system prompts and user interests
 */
export interface SummarizeContext {
  /** Base system prompt for the LLM */
  systemPrompt: string;
  /** Source-specific prompt additions (e.g., for Slack vs Signal) */
  sourcePrompt?: string;
  /** User interests to highlight in the summary */
  interestPrompt?: string;
}

/**
 * Interface for LLM clients (Ollama, OpenAI, etc.)
 * This abstraction allows swapping LLM providers without changing core code
 */
export interface LLMClient {
  /**
   * Generate a summary from a list of messages
   * @param messages Array of message objects to summarize
   * @param context Optional context with system prompt and interests
   * @returns Promise resolving to the generated summary text
   */
  summarize(
    messages: Array<{ text: string; user: string; timestamp: string }>,
    context?: SummarizeContext
  ): Promise<string>;
}


import { apiRequest } from '../../services/apiClient';
import type { AssistantConversationMessage } from '../../domain/assistant/types';

export interface AssistantCanvasContext {
  nodes: Array<{
    id: string;
    type: string;
    title?: string;
    lifecycle?: string;
    isStale?: boolean;
    hasBrandConflict?: boolean;
  }>;
  selectedNodes: Array<{ id: string; type: string; title?: string }>;
}

export const sendAssistantMessage = (input: {
  message: string;
  context: AssistantCanvasContext;
  history: AssistantConversationMessage[];
}) => apiRequest<{ response: string; mode: 'provider' | 'local-fallback'; model: string | null }>('/api/assistant/chat', {
  method: 'POST',
  body: JSON.stringify(input)
});

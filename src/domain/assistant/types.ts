export type CanvasCommandRisk = 'low' | 'high';

export type CanvasCommandOperation =
  | { type: 'add-node'; nodeType: string; label: string }
  | { type: 'tidy-layout' }
  | { type: 'branch-selected' }
  | { type: 'delete-selected'; count: number }
  | { type: 'clear-canvas'; count: number }
  | { type: 'create-workflow'; replaceExisting: boolean };

export interface CanvasCommandPlan {
  id: string;
  request: string;
  title: string;
  summary: string;
  risk: CanvasCommandRisk;
  requiresConfirmation: boolean;
  reversible: boolean;
  operations: CanvasCommandOperation[];
}

export interface CanvasOperationRecord {
  id: string;
  request: string;
  planTitle: string;
  risk: CanvasCommandRisk;
  status: 'executed' | 'cancelled' | 'failed';
  operationTypes: string[];
  createdAt: string;
  message?: string;
}

export interface CanvasCommandContext {
  nodeCount: number;
  selectedNodeCount: number;
}

export interface AssistantConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'provider' | 'local-fallback';
  createdAt: string;
}

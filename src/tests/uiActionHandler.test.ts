import { jest } from '@jest/globals';
import { handleUiAction } from '../hooks/uiActionHandler';
import { useSessionStore } from '@/lib/store';

jest.mock('@/lib/store', () => ({
  useSessionStore: {
    getState: jest.fn(),
  },
}));

describe('handleUiAction dispatch table', () => {
  const mockSetActiveView = jest.fn();
  const mockAddBlock = jest.fn();
  const mockUpdateBlock = jest.fn();
  const mockSetAgentStatusText = jest.fn();
  const mockSetDiagramDefinition = jest.fn();
  const mockSetIsDiagramGenerating = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionStore.getState as unknown as jest.Mock).mockReturnValue({
      setActiveView: mockSetActiveView,
      addBlock: mockAddBlock,
      updateBlock: mockUpdateBlock,
      setAgentStatusText: mockSetAgentStatusText,
      setDiagramDefinition: mockSetDiagramDefinition,
      setIsDiagramGenerating: mockSetIsDiagramGenerating,
      whiteboardBlocks: [],
      isAwaitingAIResponse: false,
      isPushToTalkActive: false,
      isAgentSpeaking: false,
      setShowWaitingPill: jest.fn(),
      setIsMicEnabled: jest.fn(),
    });
  });

  it('calls executeBrowserAction for BROWSER_NAVIGATE', async () => {
    const mockExecuteBrowserAction = jest.fn();
    await handleUiAction('BROWSER_NAVIGATE', { url: 'https://example.com' }, { executeBrowserAction: mockExecuteBrowserAction });
    expect(mockExecuteBrowserAction).toHaveBeenCalledWith({ tool_name: 'browser_navigate', parameters: { url: 'https://example.com' } });
  });

  it('adds an excalidraw block and switches view for ADD_EXCALIDRAW_BLOCK', async () => {
    const mockExecuteBrowserAction = jest.fn();
    await handleUiAction('ADD_EXCALIDRAW_BLOCK', { id: 'block1', summary: 'Test Block', elements: [] }, { executeBrowserAction: mockExecuteBrowserAction });
    expect(mockAddBlock).toHaveBeenCalled();
    expect(mockSetActiveView).toHaveBeenCalledWith('excalidraw');
  });

  it('returns rpcResponse for SET_UI_STATE with GET_BLOCK_CONTENT', async () => {
    const mockExecuteBrowserAction = jest.fn();
    (useSessionStore.getState as unknown as jest.Mock).mockReturnValueOnce({
      whiteboardBlocks: [{ id: 'b1', type: 'excalidraw', summary: 'S', elements: [] }],
    });
    const res = await handleUiAction('SET_UI_STATE', { action: 'GET_BLOCK_CONTENT', id: 'b1' }, { executeBrowserAction: mockExecuteBrowserAction });
    expect(res).toBeTruthy();
    expect((res as any).rpcResponse.success).toBe(true);
    expect(JSON.parse((res as any).rpcResponse.message)).toEqual({ id: 'b1', type: 'excalidraw', summary: 'S', elements: [] });
  });
});

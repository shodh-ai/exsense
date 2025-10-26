import { jest } from '@jest/globals';
import { handleUiAction } from '../hooks/uiActionHandler';
import { useSessionStore } from '@/lib/store';

jest.mock('@/lib/store', () => ({
  useSessionStore: {
    getState: jest.fn(),
  },
}));

describe('handleUiAction additional handlers', () => {
  const mockSetAgentStatusText = jest.fn();
  const mockUpdateBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionStore.getState as unknown as jest.Mock).mockReturnValue({
      setAgentStatusText: mockSetAgentStatusText,
      updateBlock: mockUpdateBlock,
      setActiveView: jest.fn(),
      whiteboardBlocks: [],
      isAwaitingAIResponse: false,
      isPushToTalkActive: false,
      isAgentSpeaking: false,
      setShowWaitingPill: jest.fn(),
    });
  });

  it('calls executeBrowserAction for BROWSER_CLICK', async () => {
    const mockExecuteBrowserAction = jest.fn(async (_: any) => {}) as unknown as (payload: { tool_name: string; parameters: any }) => Promise<void>;
    await handleUiAction('BROWSER_CLICK', { x: 10, y: 20 }, { executeBrowserAction: mockExecuteBrowserAction });
    expect(mockExecuteBrowserAction).toHaveBeenCalledWith({ tool_name: 'browser_click', parameters: { x: 10, y: 20 } });
  });

  it('updates status text for SHOW_OVERLAY', async () => {
    const mockExecuteBrowserAction = jest.fn(async (_: any) => {}) as unknown as (payload: { tool_name: string; parameters: any }) => Promise<void>;
    await handleUiAction('SHOW_OVERLAY', { message: 'Hello' }, { executeBrowserAction: mockExecuteBrowserAction });
    expect(mockSetAgentStatusText).toHaveBeenCalledWith('Hello');
  });

  it('updates block elements for EXCALIDRAW_UPDATE_ELEMENTS', async () => {
    const mockExecuteBrowserAction = jest.fn(async (_: any) => {}) as unknown as (payload: { tool_name: string; parameters: any }) => Promise<void>;
    await handleUiAction('EXCALIDRAW_UPDATE_ELEMENTS', { id: 'b1', elements: [{ id: 'e1' }] }, { executeBrowserAction: mockExecuteBrowserAction });
    expect(mockUpdateBlock).toHaveBeenCalledWith('b1', expect.objectContaining({ elements: expect.any(Array) }));
  });
});

import { useSessionStore, SessionView } from '@/lib/store';

export interface UiActionOptions {
  executeBrowserAction: (payload: { tool_name: string; parameters: any }) => Promise<void>;
  visualizerBaseUrl?: string;
}

// --- Additional handlers to support FrontendClient.execute_visual_action() ---
async function handleBrowserClick(params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'browser_click', parameters: params || {} });
}

async function handleBrowserType(params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'browser_type', parameters: params || {} });
}

async function handleShowOverlay(params: any): Promise<void> {
  try {
    const msg = typeof params?.message === 'string' ? params.message : 'Overlay shown';
    getStore().setAgentStatusText(msg);
  } catch {}
}

async function handleHideOverlay(params: any): Promise<void> {
  try {
    const msg = typeof params?.message === 'string' ? params.message : 'Overlay hidden';
    getStore().setAgentStatusText(msg);
  } catch {}
}

async function handleSetupJupyter(params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'setup_jupyter', parameters: params || {} });
}

async function handleExcalidrawUpdateElements(params: any): Promise<void> {
  try {
    const blockId = params.id || params.block_id || params.blockId;
    let elements: any[] | undefined;
    const raw = params.elements;
    if (Array.isArray(raw)) elements = raw as any[];
    else if (typeof raw === 'string') { try { elements = JSON.parse(raw); } catch {} }
    if (blockId && elements) {
      getStore().updateBlock(blockId, { elements } as any);
      getStore().setActiveView('excalidraw');
    }
  } catch {}
}

async function handleExcalidrawRemoveHighlighting(): Promise<void> {
  try { (window as any)?.__excalidrawDebug?.removeHighlighting?.(); } catch {}
}

async function handleExcalidrawHighlightElementsAdvanced(params: any): Promise<void> {
  try {
    const ids = Array.isArray(params?.element_ids) ? params.element_ids : [];
    const options = params?.options || {};
    const dbg = (window as any)?.__excalidrawDebug;
    if (dbg?.highlightElementsAdvanced) {
      try { dbg.highlightElementsAdvanced(ids, options); } catch {}
    } else if (dbg?.highlightElements && ids.length > 0) {
      try { dbg.highlightElements(ids); } catch {}
    }
  } catch {}
}

async function handleExcalidrawModifyElements(params: any): Promise<void> {
  try { (window as any)?.__excalidrawDebug?.modifyElements?.(params || {}); } catch {}
}

async function handleExcalidrawCaptureScreenshot(params: any): Promise<void> {
  try { await (window as any)?.__excalidrawDebug?.captureScreenshot?.(params || {}); } catch {}
}

async function handleExcalidrawGetCanvasElements(params: any): Promise<UiActionResult | void> {
  try {
    const dbg = (window as any)?.__excalidrawDebug;
    if (dbg?.getElements) {
      const els = await dbg.getElements();
      return { rpcResponse: { success: true, message: JSON.stringify(els || []) } };
    }
    const blockId = params?.id || params?.block_id || params?.blockId;
    if (blockId) {
      const { whiteboardBlocks } = getStore();
      const found = (whiteboardBlocks || []).find((b: any) => b.id === blockId) as any;
      if (found && Array.isArray(found.elements)) {
        return { rpcResponse: { success: true, message: JSON.stringify((found as any).elements) } };
      }
    }
  } catch {}
  return { rpcResponse: { success: false, message: '' } };
}

async function handleExcalidrawSetGenerating(params: any): Promise<void> {
  try { getStore().setIsDiagramGenerating(!!params?.enabled); } catch {}
}

export interface UiActionResult {
  rpcResponse?: { success: boolean; message?: string };
}

// Helper to read store consistently
const getStore = () => useSessionStore.getState();

// --- Individual handlers ---
async function handleBrowserNavigate(params: any, opts: UiActionOptions) {
  if (params?.url) {
    await opts.executeBrowserAction({ tool_name: 'browser_navigate', parameters: { url: params.url } });
  }
}

async function handleJupyterClickPyodide(_params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'jupyter_click_pyodide', parameters: {} });
}

async function handleJupyterTypeInCell(params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'jupyter_type_in_cell', parameters: params });
  try {
    const st = getStore();
    if (!st.isAwaitingAIResponse && !st.isPushToTalkActive && !st.isAgentSpeaking) {
      st.setShowWaitingPill(true);
    }
  } catch {}
}

async function handleJupyterRunCell(params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'jupyter_run_cell', parameters: { cell_index: params?.cell_index || 0 } });
}

async function handleJupyterCreateNewCell(_params: any, opts: UiActionOptions) {
  await opts.executeBrowserAction({ tool_name: 'jupyter_create_new_cell', parameters: {} });
}

async function handleSetUiState(params: any): Promise<UiActionResult | void> {
  try {
    const innerAction = ((params as any)?.action || (params as any)?.Action || '').toString();
    if (innerAction === 'GET_BLOCK_CONTENT') {
      const blockId = ((params as any)?.block_id || (params as any)?.blockId || (params as any)?.id || '').toString();
      let result: any = null;
      if (blockId) {
        const { whiteboardBlocks } = getStore();
        const found = (whiteboardBlocks || []).find((b: any) => b.id === blockId);
        if (found) result = found;
      }
      return { rpcResponse: { success: !!result, message: result ? JSON.stringify(result) : '' } };
    }
  } catch {}

  try {
    const st = getStore();
    if ('statusText' in params || 'status_text' in params) {
      const statusText = (params.statusText || params.status_text) as string;
      st.setAgentStatusText(statusText);
    }
    if ('view' in params) {
      const viewParam = String(params.view || '');
      let targetView: SessionView | null = null;
      if (viewParam === 'vnc_browser' || viewParam === 'vnc') targetView = 'vnc';
      else if (viewParam === 'excalidraw' || viewParam === 'drawing') targetView = 'excalidraw';
      else if (viewParam === 'video') targetView = 'video';
      else if (viewParam === 'intro') targetView = 'intro';
      if (targetView) st.setActiveView(targetView);
    }
  } catch {}
}

async function handleSuggestedResponses(): Promise<void> {
  try { getStore().clearSuggestedResponses(); } catch {}
}

async function handleRrwebReplay(params: any): Promise<void> {
  const url = params?.events_url;
  if (url && typeof url === 'string') {
    const id = params.id || `rrweb_${Date.now()}`;
    const summary = params.summary || params.title || 'Session Replay';
    try {
      getStore().addBlock({ id, type: 'rrweb', summary, eventsUrl: url } as any);
      getStore().setActiveView('excalidraw');
    } catch {}
  }
}

async function handleExcalidrawClearCanvas(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
    try { (window as any).__excalidrawDebug.clearCanvas?.(); } catch {}
  }
}

async function handleAddExcalidrawBlock(params: any): Promise<void> {
  try {
    const id = params.id || `exb_${Date.now()}`;
    const summary = params.summary || params.title || 'Diagram';
    let elements: any[] = [];
    const raw = params.elements;
    if (Array.isArray(raw)) elements = raw as any[];
    else if (typeof raw === 'string') { try { elements = JSON.parse(raw); } catch {} }
    getStore().addBlock({ id, type: 'excalidraw', summary, elements } as any);
    getStore().setActiveView('excalidraw');
  } catch {}
}

async function handleUpdateExcalidrawBlock(params: any): Promise<void> {
  try {
    const blockId = params.id || params.block_id || params.blockId;
    if (!blockId) return;
    let elements: any[] | undefined = undefined;
    const raw = params.elements;
    if (Array.isArray(raw)) elements = raw as any[];
    else if (typeof raw === 'string') { try { elements = JSON.parse(raw); } catch {} }
    if (elements) {
      getStore().updateBlock(blockId, { elements } as any);
      getStore().setActiveView('excalidraw');
    }
  } catch {}
}

async function handleFocusOnBlock(params: any): Promise<void> {
  try {
    const blockId = params.id || params.block_id || params.blockId;
    if (blockId && typeof document !== 'undefined') {
      const el = document.getElementById(String(blockId));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    getStore().setActiveView('excalidraw');
  } catch {}
}

async function handleHighlightElement(params: any): Promise<void> {
  try {
    const elementId = String(params?.element_id || params?.id || '');
    if (typeof window !== 'undefined' && (window as any).__excalidrawDebug && elementId) {
      try { (window as any).__excalidrawDebug.highlightElement?.(elementId); } catch {}
    }
  } catch {}
}

async function handleHighlightElements(params: any): Promise<void> {
  try {
    const ids = Array.isArray(params?.element_ids) ? params?.element_ids : [];
    if (typeof window !== 'undefined' && (window as any).__excalidrawDebug && ids.length > 0) {
      try { (window as any).__excalidrawDebug.highlightElements?.(ids); } catch {}
    }
  } catch {}
}

async function handleShowFeedback(params: any): Promise<void> {
  try {
    const message = String(params?.message || '');
    if (message) getStore().setAgentStatusText(message);
  } catch {}
}

async function handleGiveStudentControl(params: any): Promise<void> {
  try {
    const message = String(params?.message || 'Student control granted');
    getStore().setAgentStatusText(message);
    getStore().setIsMicEnabled(true);
  } catch {}
}

async function handleTakeAiControl(params: any): Promise<void> {
  try {
    const message = String(params?.message || 'AI control resumed');
    getStore().setAgentStatusText(message);
    getStore().setIsMicEnabled(false);
  } catch {}
}

async function handleGenerateVisualization(params: any, opts: UiActionOptions): Promise<void> {
  try {
    const els = params?.elements;
    const prompt = params?.prompt;
    const topic = params?.topic_context || params?.topic || '';
    if (Array.isArray(els)) {
      getStore().setIsDiagramGenerating(true);
      getStore().setVisualizationData(els);
      getStore().setIsDiagramGenerating(false);
    } else if (typeof prompt === 'string' && prompt.trim().length > 0) {
      try { getStore().setIsDiagramGenerating(true); } catch {}
      try {
        const base = (opts.visualizerBaseUrl && opts.visualizerBaseUrl.trim().length > 0) ? opts.visualizerBaseUrl.replace(/\/$/, '') : 'http://localhost:8011';
        const url = `${base}/generate-mermaid-text`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text_to_visualize: prompt, topic_context: topic }),
        });
        if (resp.ok) {
          const mermaidText = (await resp.text()).trim();
          getStore().setDiagramDefinition?.(mermaidText);
        } else {
          getStore().setDiagramDefinition?.('flowchart TD\n    Error["Generation Failed"]');
        }
      } finally {
        try { getStore().setIsDiagramGenerating(false); } catch {}
      }
    }
  } catch {}
}

// --- Dispatch table ---
const actionHandlers: Record<string, (params: any, opts: UiActionOptions) => Promise<UiActionResult | void>> = {
  BROWSER_NAVIGATE: handleBrowserNavigate,
  BROWSER_CLICK: handleBrowserClick,
  BROWSER_TYPE: handleBrowserType,
  JUPYTER_CLICK_PYODIDE: handleJupyterClickPyodide,
  JUPYTER_TYPE_IN_CELL: handleJupyterTypeInCell,
  JUPYTER_RUN_CELL: handleJupyterRunCell,
  JUPYTER_CREATE_NEW_CELL: handleJupyterCreateNewCell,
  SETUP_JUPYTER: async (p, o) => handleSetupJupyter(p, o),
  SHOW_OVERLAY: async (p) => handleShowOverlay(p),
  HIDE_OVERLAY: async (p) => handleHideOverlay(p),
  SET_UI_STATE: async (p) => handleSetUiState(p),
  SUGGESTED_RESPONSES: async () => handleSuggestedResponses(),
  SHOW_SUGGESTED_RESPONSES: async () => handleSuggestedResponses(),
  RRWEB_REPLAY: async (p) => handleRrwebReplay(p),
  EXCALIDRAW_CLEAR_CANVAS: async () => handleExcalidrawClearCanvas(),
  CLEAR_ALL_ANNOTATIONS: async () => handleExcalidrawClearCanvas(),
  ADD_EXCALIDRAW_BLOCK: async (p) => handleAddExcalidrawBlock(p),
  UPDATE_EXCALIDRAW_BLOCK: async (p) => handleUpdateExcalidrawBlock(p),
  EXCALIDRAW_UPDATE_ELEMENTS: async (p) => handleExcalidrawUpdateElements(p),
  EXCALIDRAW_REMOVE_HIGHLIGHTING: async () => handleExcalidrawRemoveHighlighting(),
  EXCALIDRAW_HIGHLIGHT_ELEMENTS_ADVANCED: async (p) => handleExcalidrawHighlightElementsAdvanced(p),
  EXCALIDRAW_MODIFY_ELEMENTS: async (p) => handleExcalidrawModifyElements(p),
  EXCALIDRAW_CAPTURE_SCREENSHOT: async (p) => handleExcalidrawCaptureScreenshot(p),
  EXCALIDRAW_GET_CANVAS_ELEMENTS: async (p) => handleExcalidrawGetCanvasElements(p),
  EXCALIDRAW_SET_GENERATING: async (p) => handleExcalidrawSetGenerating(p),
  FOCUS_ON_BLOCK: async (p) => handleFocusOnBlock(p),
  HIGHLIGHT_ELEMENT: async (p) => handleHighlightElement(p),
  HIGHLIGHT_ELEMENTS: async (p) => handleHighlightElements(p),
  SHOW_FEEDBACK: async (p) => handleShowFeedback(p),
  GIVE_STUDENT_CONTROL: async (p) => handleGiveStudentControl(p),
  TAKE_AI_CONTROL: async (p) => handleTakeAiControl(p),
  GENERATE_VISUALIZATION: handleGenerateVisualization,
};

// --- Main dispatcher ---
export async function handleUiAction(actionInput: string | number, parameters: any, opts: UiActionOptions): Promise<UiActionResult | void> {
  const action = String(actionInput).toUpperCase();
  const handler = actionHandlers[action];
  if (handler) {
    try {
      return await handler(parameters || {}, opts);
    } catch (error) {
      console.error(`Error executing UI action "${action}":`, error);
    }
  } else {
    console.warn(`No handler found for UI action: "${action}"`);
  }
  return;
}

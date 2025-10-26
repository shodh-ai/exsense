import { handleUiAction } from '../uiActionHandler';

describe('uiActionHandler dispatch', () => {
  test('BROWSER_NAVIGATE dispatches browser_navigate', async () => {
    const executeBrowserAction = jest.fn().mockResolvedValue(undefined);
    await handleUiAction('BROWSER_NAVIGATE', { url: 'https://example.com' }, { executeBrowserAction });
    expect(executeBrowserAction).toHaveBeenCalledWith({ tool_name: 'browser_navigate', parameters: { url: 'https://example.com' } });
  });

  test('BROWSER_CLICK dispatches browser_click', async () => {
    const executeBrowserAction = jest.fn().mockResolvedValue(undefined);
    await handleUiAction('BROWSER_CLICK', { selector: '#btn' }, { executeBrowserAction });
    expect(executeBrowserAction).toHaveBeenCalledWith({ tool_name: 'browser_click', parameters: { selector: '#btn' } });
  });

  test('JUPYTER_RUN_CELL dispatches jupyter_run_cell', async () => {
    const executeBrowserAction = jest.fn().mockResolvedValue(undefined);
    await handleUiAction('JUPYTER_RUN_CELL', { cell_index: 2 }, { executeBrowserAction });
    expect(executeBrowserAction).toHaveBeenCalledWith({ tool_name: 'jupyter_run_cell', parameters: { cell_index: 2 } });
  });
});

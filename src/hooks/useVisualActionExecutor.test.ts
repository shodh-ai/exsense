// In useVisualActionExecutor.test.ts

// We can't test the hook directly, so we import the utility function
// You'll need to export it from the main file.
// In useVisualActionExecutor.ts, add `export` before the function definition.
import { convertSkeletonToExcalidrawElements, type SkeletonElement } from './convertSkeletonToExcalidrawElements';

describe('convertSkeletonToExcalidrawElements', () => {
  // Use the same realistic mock data from the AI
  const mockAiElements: SkeletonElement[] = [
    { id: 'nanda_dynasty', type: 'rectangle', text: 'Nanda Dynasty (Pre-existing)', x: 100, y: 50, width: 150, height: 50 },
    { id: 'chandragupta', type: 'rectangle', text: 'Chandragupta Maurya', x: 100, y: 150, width: 150, height: 50 },
    {
        id: 'overthrow_arrow', type: 'arrow', text: 'Overthrows', startBinding: { elementId: 'chandragupta' }, endBinding: { elementId: 'nanda_dynasty' },
        x: 0,
        y: 0,
        width: 0,
        height: 0
    }
  ];

  it('should convert skeleton elements to a valid Excalidraw format', () => {
    const result = convertSkeletonToExcalidrawElements(mockAiElements);

    // Assertion 1: It should create more elements than the input (shapes + text)
    expect(result.length).toBe(5); // 2 rectangles + 2 text elements + 1 arrow

    // Assertion 2: Check if the text is correctly created and bound to its shape
    const nandaRectangle = result.find((e: { id: string; }) => e.id === 'nanda_dynasty');
    const nandaText = result.find((e: { containerId: string; }) => e.containerId === 'nanda_dynasty');
    
    expect(nandaRectangle).toBeDefined();
    expect(nandaText).toBeDefined();
    expect(nandaText.text).toBe('Nanda Dynasty (Pre-existing)');

    // Assertion 3: Check if the arrow is correctly created with proper bindings
    const overthrowArrow = result.find((e: { id: string; }) => e.id === 'overthrow_arrow');
    
    expect(overthrowArrow).toBeDefined();
    expect(overthrowArrow.type).toBe('arrow');
    expect(overthrowArrow.startBinding.elementId).toBe('chandragupta');
    expect(overthrowArrow.endBinding.elementId).toBe('nanda_dynasty');
  });
});
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// Minimal DOM setup for Node environment so the parser can run
const { window } = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.DOMParser = window.DOMParser;
// Setup DOMPurify and expose globally with the expected API
const DOMPurify = createDOMPurify(window);
globalThis.DOMPurify = DOMPurify;

const mermaid = `flowchart TD
  A[Start] --> B{Check}
  B -->|yes| C[Go]
  B -->|no| D[Stop]`;

try {
  console.log('Input Mermaid diagram:\n', mermaid, '\n');
  const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
  const { elements: skeleton } = await parseMermaidToExcalidraw(mermaid);
  console.log('Skeleton elements:', skeleton.length);
  console.log('\nSample skeleton (first 3):');
  console.log(JSON.stringify(skeleton.slice(0, 3), null, 2));
  console.log('\nSuccess: Mermaid parsed to Excalidraw skeleton.');
} catch (e) {
  console.error('Conversion failed:', e?.message || e);
  process.exit(1);
}

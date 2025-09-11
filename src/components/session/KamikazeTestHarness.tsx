"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface DeliveryAction {
    tool_name: string;
    parameters: Record<string, any>;
}

interface DeliveryPlan {
    actions: DeliveryAction[];
}

interface KamikazeTestHarnessProps {
    onGenerateDiagram: (mermaidCode: string) => void;
    onGenerationStatusChange: (status: 'idle' | 'streaming' | 'finished' | 'error') => void;
}

const KamikazeTestHarness: React.FC<KamikazeTestHarnessProps> = ({ onGenerateDiagram, onGenerationStatusChange }) => {
    const [studentInput, setStudentInput] = useState<string>("Okay, that makes sense. Can you explain the 'sunlight' part in more detail?");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [aiSpokenResponse, setAiSpokenResponse] = useState<string>('');
    const [lastDeliveryPlan, setLastDeliveryPlan] = useState<DeliveryPlan | null>(null);

    const KAMIKAZE_API_URL = process.env.NEXT_PUBLIC_KAMIKAZE_TEST_URL || 'http://localhost:8080/test_turn';
    const VISUALIZER_URL = process.env.NEXT_PUBLIC_VISUALIZER_URL || 'http://localhost:8000';

    const visualizerFunctionsRef = useRef({ onGenerateDiagram, onGenerationStatusChange });
    
    useEffect(() => {
        visualizerFunctionsRef.current = { onGenerateDiagram, onGenerationStatusChange };
    }, [onGenerateDiagram, onGenerationStatusChange]);

    const triggerVisualizer = useCallback(async (text: string, context: string) => {
        console.log("🧪 Test Harness: Triggering visualizer service...");
        visualizerFunctionsRef.current.onGenerationStatusChange('streaming');
        try {
            const response = await fetch(`${VISUALIZER_URL}/generate-diagram-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text_to_visualize: text,
                    topic_context: context,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`Visualizer service returned an error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulatedText += decoder.decode(value, { stream: true });
            }

            console.log("🧪 Test Harness: Visualizer returned Mermaid code.");
            visualizerFunctionsRef.current.onGenerateDiagram(accumulatedText);
            visualizerFunctionsRef.current.onGenerationStatusChange('finished');
        } catch (error) {
            console.error("Test Harness: Visualizer call failed:", error);
            visualizerFunctionsRef.current.onGenerationStatusChange('error');
        }
    }, [VISUALIZER_URL]);

    useEffect(() => {
        if (!apiResponse || !apiResponse.delivery_plan) {
            return;
        }

        const plan: DeliveryPlan = apiResponse.delivery_plan;
        console.log("🧪 Test Harness: Processing delivery plan...", plan);

        let spokenText = '';

        plan.actions.forEach(action => {
            console.log(`🧪 Executing action: ${action.tool_name}`, action.parameters);

            switch (action.tool_name) {
                case 'speak':
                    spokenText += action.parameters.text + ' ';
                    break;

                case 'display_visual_aid':
                    if (action.parameters.text_to_visualize && action.parameters.topic_context) {
                        triggerVisualizer(
                            action.parameters.text_to_visualize,
                            action.parameters.topic_context
                        );
                    } else {
                        console.warn("display_visual_aid action was missing parameters.");
                    }
                    break;
                
                // --- START of MODIFICATION ---
                // The window interface is extended to provide type safety for our global debug/action functions.
                // Improved highlighting logic in KamikazeTestHarness.tsx
                case 'excalidraw_highlight_elements':
                console.log('🎯 Highlighting elements:', action.parameters);
                if (window.__excalidrawActions?.highlightElements) {
                    const ids = (action.parameters.element_ids || []) as string[];
                    const reason = action.parameters.reason || '';
                    
                    console.log(`🎯 Attempting to highlight ${ids.length} elements:`, ids);
                    console.log(`🎯 Reason: ${reason}`);
                    
                    // Get current scene elements to verify IDs exist
                    const currentElements = window.__excalidrawActions.getSceneElements?.() || [];
                    console.log(`🎯 Current canvas has ${currentElements.length} total elements`);
                    
                    const existingIds = currentElements
                    .filter(el => el && !el.isDeleted)
                    .map(el => el.id);
                    
                    console.log(`🎯 Valid element IDs on canvas:`, existingIds.slice(0, 10));
                    
                    const validIds = ids.filter(id => existingIds.includes(id));
                    
                    if (validIds.length === 0) {
                    console.warn('🎯 None of the requested element IDs exist in scene');
                    console.warn('🎯 Requested:', ids);
                    console.warn('🎯 Available:', existingIds.slice(0, 10));
                    } else {
                    console.log(`🎯 Highlighting ${validIds.length} valid elements:`, validIds);
                    window.__excalidrawActions.highlightElements(validIds);
                    
                    // Auto-remove highlighting after 5 seconds
                    setTimeout(() => {
                        if (window.__excalidrawActions?.removeHighlighting) {
                        console.log('🎯 Auto-removing highlights');
                        window.__excalidrawActions.removeHighlighting();
                        }
                    }, 5000);
                    }
                } else {
                    console.warn('🎯 __excalidrawActions.highlightElements not available');
                    console.warn('🎯 Available actions:', Object.keys(window.__excalidrawActions || {}));
                }
                break;

                case 'excalidraw_focus_on_elements':
                    if (window.__excalidrawActions?.focusOnElements) {
                        const ids = (action.parameters.element_ids || []) as string[];
                        window.__excalidrawActions.focusOnElements(ids);
                    } else {
                        console.warn('__excalidrawActions.focusOnElements not found!');
                    }
                    break;
                // --- END of MODIFICATION ---


                default:
                    console.log(`Action "${action.tool_name}" has no test handler.`);
                    break;
            }
        });

        setAiSpokenResponse(spokenText.trim());
        setLastDeliveryPlan(plan);

    }, [apiResponse, triggerVisualizer]);

    const handleSend = useCallback(async () => {
        // --- START of MODIFICATION ---
        // This is the crucial cleanup step. Before sending the new turn, we
        // remove any highlights from the previous turn.
        if (window.__excalidrawActions?.removeHighlighting) {
            console.log("🧪 Test Harness: Clearing previous highlights.");
            window.__excalidrawActions.removeHighlighting();
        }
        // --- END of MODIFICATION ---
        
        setIsLoading(true);
        setApiResponse(null);
        setAiSpokenResponse('');
        setLastDeliveryPlan(null);

        let whiteboardState = [];
        if (window.__excalidrawActions?.getSceneElements) {
            whiteboardState = window.__excalidrawActions.getSceneElements();
            console.log(`🧪 Test Harness: Captured ${whiteboardState.length} elements from Excalidraw.`);
        } else {
            console.warn("Could not capture whiteboard state: __excalidrawActions.getSceneElements is not available.");
        }

        const payload = {
            session_id: "test-session-123",
            student_id: "test-student-abc",
            curriculum_id: "default_curriculum",
            student_input: studentInput,
            whiteboard_state: whiteboardState
        };

        console.log("🧪 Test Harness: Sending payload to Kamikaze:", payload);

        try {
            const response = await fetch(KAMIKAZE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `HTTP Error: ${response.status}`);
            }

            console.log("🧪 Test Harness: Received response:", data);
            setApiResponse(data);

        } catch (error) {
            console.error("Error calling Kamikaze test endpoint:", error);
            setApiResponse({ error: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    }, [studentInput, KAMIKAZE_API_URL]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '400px',
            maxHeight: '70vh',
            backgroundColor: 'rgba(40, 40, 40, 0.9)',
            border: '1px solid #555',
            borderRadius: '10px',
            padding: '15px',
            color: 'white',
            zIndex: 9999,
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
        }}>
            <h3 style={{ margin: 0, paddingBottom: '10px', borderBottom: '1px solid #555' }}>🧪 Kamikaze Test Harness</h3>
            
            <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Student Input:</label>
                <textarea
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#333', color: 'white', border: '1px solid #666', borderRadius: '4px', padding: '8px' }}
                />
            </div>
            
            <button
                onClick={handleSend}
                disabled={isLoading}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: isLoading ? '#555' : '#4a90e2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                }}
            >
                {isLoading ? 'Processing...' : 'Send Turn to Kamikaze'}
            </button>

            {aiSpokenResponse && (
                <div style={{ background: '#2d3748', padding: '10px', borderRadius: '5px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '5px' }}>AI Spoken Response:</h4>
                    <p style={{ margin: 0, fontSize: '14px', fontStyle: 'italic' }}>{aiSpokenResponse}</p>
                </div>
            )}
            
            {lastDeliveryPlan && (
                <div style={{ background: '#2d3748', padding: '10px', borderRadius: '5px' }}>
                     <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Full Delivery Plan:</h4>
                    <pre style={{ margin: 0, background: '#1a202c', padding: '8px', borderRadius: '4px', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(lastDeliveryPlan, null, 2)}
                    </pre>
                </div>
            )}

            {apiResponse?.error && (
                 <div style={{ background: '#c53030', padding: '10px', borderRadius: '5px' }}>
                     <h4 style={{ marginTop: 0, marginBottom: '5px' }}>Error:</h4>
                     <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {apiResponse.error}
                     </pre>
                 </div>
            )}
        </div>
    );
};

export default KamikazeTestHarness;
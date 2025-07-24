"use client";
import { useSessionStore } from "@/lib/store";

export const AgentTestPanel = () => {
    // Get all the actions from the Zustand store
    const {
        setIsMicEnabled,
        setAgentStatusText,
        setActiveView,
        setIsAgentSpeaking,
        setIsStudentTurn
    } = useSessionStore();

    const simulate = (action: () => void) => {
        console.log(`[Test Panel] Simulating agent action...`);
        action();
    };

    return (
        <div className="fixed bottom-24 right-4 z-50 p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg flex flex-col gap-2 w-64">
            <h3 className="text-white font-bold text-center border-b border-gray-600 pb-2">Agent Test Panel</h3>

            <button onClick={() => simulate(() => setIsMicEnabled(true))} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded">
                Simulate: START Listening
            </button>

            <button onClick={() => simulate(() => setIsMicEnabled(false))} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded">
                Simulate: STOP Listening
            </button>

            <button onClick={() => simulate(() => setAgentStatusText("Rox is thinking..."))} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">
                Simulate: Set Status "Thinking"
            </button>

            <button onClick={() => simulate(() => setActiveView("vnc"))} className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded">
                Simulate: Switch View to VNC
            </button>

            <button onClick={() => simulate(() => setIsStudentTurn(true))} className="bg-yellow-600 hover:bg-yellow-700 text-black p-2 rounded">
                Simulate: "Your Turn"
            </button>
        </div>
    );
};
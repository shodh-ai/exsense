"use client";
import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { useThesisGraph } from "@/hooks/useThesisGraph";

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

type RFNodeData = { label?: string; raw?: any };

function layout(nodes: Node<RFNodeData>[], edges: Edge[]) {
  const g = dagreGraph;
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });
  nodes.forEach((n) => g.setNode(n.id, { width: 220, height: 62 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const newNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - 110, y: pos.y - 31 },
      // prevent React Flow from re-positioning on load
      positionAbsolute: { x: pos.x - 110, y: pos.y - 31 } as any,
    };
  });
  return { nodes: newNodes, edges };
}

export type ArgumentGraphVisualizerProps = {
  thesisId: string;
  refreshKey?: any; // change to force reload
  highlightTerms?: string[];
};

export default function ArgumentGraphVisualizer({ thesisId, refreshKey, highlightTerms = [] }: ArgumentGraphVisualizerProps) {
  const { graph, loading, error, refresh } = useThesisGraph(thesisId);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // prepare nodes/edges
  const rfData = useMemo(() => {
    const ns: Node<RFNodeData>[] = (graph.nodes || []).map((n: any) => ({
      id: n.id,
      type: "default",
      data: { label: n?.data?.label ?? n?.id, raw: n },
      position: n.position || { x: 0, y: 0 },
      style: {
        border: "1px solid #d1d5db",
        borderRadius: 6,
        background: "#fff",
        padding: 8,
        fontSize: 12,
      },
    }));
    const es: Edge[] = (graph.edges || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: e.type || "smoothstep",
      animated: !!e.animated,
      style: { strokeWidth: 1.5 },
      labelStyle: { fontSize: 11, fill: "#374151" },
    }));
    return layout(ns, es);
  }, [graph]);

  // apply layout
  useEffect(() => {
    setNodes(rfData.nodes as unknown as Node<RFNodeData>[]);
    setEdges(rfData.edges);
  }, [rfData, setNodes, setEdges]);

  // refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined) {
      refresh();
    }
  }, [refreshKey, refresh]);

  // highlight by terms
  useEffect(() => {
    if (!highlightTerms?.length) return;
    const terms = highlightTerms.map((s) => s.toLowerCase());
    setNodes((ns) =>
      (ns as Node<RFNodeData>[]).map((n) => {
        const label: string = n?.data?.label || "";
        const hit = terms.some((t) => label.toLowerCase().includes(t));
        return {
          ...n,
          style: {
            ...(n.style as any),
            boxShadow: hit ? "0 0 0 3px rgba(59,130,246,0.4)" : undefined,
            border: hit ? "2px solid #3b82f6" : (n.style as any)?.border,
          },
        } as Node<RFNodeData>;
      }) as unknown as Node<RFNodeData>[]
    );
  }, [highlightTerms, setNodes]);

  if (loading) return <div className="p-3 text-sm text-gray-600">Loading graph…</div>;
  if (error) return <div className="p-3 text-sm text-red-600">{error}</div>;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 420 }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
        <MiniMap pannable zoomable />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

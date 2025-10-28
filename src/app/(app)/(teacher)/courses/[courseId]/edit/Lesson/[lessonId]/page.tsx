"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLessonContents, useAddLessonContent, useDeleteLessonContent } from "@/hooks/useApi";

export default function LessonContentEditorPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();

  const { data: items = [], isLoading, error, refetch } = useLessonContents(lessonId);
  const addMutation = useAddLessonContent(lessonId);
  const deleteMutation = useDeleteLessonContent(lessonId);

  const [type, setType] = useState("TEXT");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const add = async () => {
    await addMutation.mutateAsync({ type, title, text, url }, {
      onSuccess: () => {
        setTitle(""); setText(""); setUrl("");
        refetch(); // Refetch the list to show the new item
      }
    });
  };

  const remove = async (contentId: string) => {
    await deleteMutation.mutateAsync(contentId, {
        onSuccess: () => {
            refetch(); // Refetch the list after deleting an item
        }
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h1 className="text-xl font-bold text-[#394169]">Edit Lesson Content</h1>
          {error && <p className="text-red-500 text-sm mt-2">{(error as any)?.message || "Failed to load content"}</p>}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Content Type</label>
              <select className="w-full border rounded-lg p-2" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="TEXT">Text Block</option>
                <option value="VIDEO">Video URL</option>
                <option value="PDF">PDF URL</option>
                <option value="LINK">External Link</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {type === "TEXT" && (
              <div className="md:col-span-2">
                <label className="block text-sm">Content</label>
                <textarea rows={5} className="w-full border rounded-lg p-2" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            )}
            {(type === "VIDEO" || type === "PDF" || type === "LINK") && (
              <div className="md:col-span-2">
                <label className="block text-sm">URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={add} disabled={!title || addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Content Block"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>Done</Button>
          </div>

          <ul className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-[#394169] border-t pt-4 mt-4">Existing Content</h2>
            {isLoading ? (
              <p className="text-[#8187a0]">Loading content...</p>
            ) : items.map((it: any) => (
              <li key={it.id} className="p-3 border rounded-lg flex items-center gap-2">
                <span className="flex-1 text-sm text-[#394169]">[{it.type}] {it.title}</span>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(it.id)} disabled={deleteMutation.isPending}>Delete</Button>
              </li>
            ))}
            {!isLoading && items.length === 0 && <p className="text-[#8187a0]">This lesson has no content yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
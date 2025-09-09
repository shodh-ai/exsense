"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useLessonContents, useAddLessonContent, useDeleteLessonContent } from "@/hooks/useApi";

export default function LessonContentEditorPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();

  const { data: items = [], isLoading, error } = useLessonContents(lessonId);
  const addMutation = useAddLessonContent(lessonId);
  const deleteMutation = useDeleteLessonContent(lessonId);

  const [type, setType] = useState("TEXT");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const add = async () => {
    await addMutation.mutateAsync({ type, title, text, url });
    setTitle(""); setText(""); setUrl("");
  };

  const remove = async (contentId: string) => {
    await deleteMutation.mutateAsync(contentId);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h1 className="text-xl font-bold text-[#394169]">Lesson Content</h1>
          {error && <p className="text-red-500 text-sm mt-2">{(error as any)?.message || "Failed to load content"}</p>}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm">Type</label>
              <select className="w-full border rounded-lg p-2" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="TEXT">Text</option>
                <option value="VIDEO">Video</option>
                <option value="PDF">PDF</option>
                <option value="LINK">Link</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {type === "TEXT" && (
              <div className="md:col-span-2">
                <label className="block text-sm">Text</label>
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
            <Button onClick={add} disabled={!title || addMutation.isPending}>Add Block</Button>
            <Button variant="outline" onClick={() => router.back()}>Back</Button>
          </div>

          <ul className="mt-6 space-y-3">
            {isLoading ? (
              <p className="text-[#8187a0]">Loading content...</p>
            ) : items.map((it: any) => (
              <li key={it.id} className="p-3 border rounded-lg flex items-center gap-2">
                <span className="flex-1 text-sm text-[#394169]">[{it.type}] {it.title}</span>
                <Button variant="ghost" onClick={() => remove(it.id)} disabled={deleteMutation.isPending}>Delete</Button>
              </li>
            ))}
            {!isLoading && items.length === 0 && <p className="text-[#8187a0]">No content yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

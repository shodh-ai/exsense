"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useNewCourseStore } from "@/lib/newCourseStore"; // Adjust import path
import { Button } from "@/components/button";
import { Input } from "@/components/input";
// ... import other form components

export default function CourseDetailsFormPage() {
    const router = useRouter();
    // Get the current state and the setter from the store
    const { tags, skills, difficulty, setData } = useNewCourseStore();

    const handleSaveAndReturn = () => {
        // The data is already saved in the store on every input change.
        // We just need to navigate back to the curriculum editor.
        router.back(); 
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-xl font-bold">Course Details</h1>
            <p className="text-gray-600 mb-6">Add high-level details for your course.</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm">Tags (comma-separated)</label>
                    <Input 
                        value={tags.join(', ')}
                        onChange={(e) => setData({ tags: e.target.value.split(',').map(t => t.trim()) })}
                    />
                </div>

                <div>
                    <label className="block text-sm">Skills (comma-separated)</label>
                    <Input 
                        value={skills.join(', ')}
                        onChange={(e) => setData({ skills: e.target.value.split(',').map(s => s.trim()) })}
                    />
                </div>

                <div>
                    <label className="block text-sm">Difficulty</label>
                    <select
                        className="w-full border rounded-lg p-2"
                        value={difficulty}
                        onChange={(e) => setData({ difficulty: e.target.value })}
                    >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>
                
                {/* ... add other form fields here ... */}
            </div>

            <div className="mt-6">
                <Button onClick={handleSaveAndReturn}>Save and Return to Editor</Button>
            </div>
        </div>
    );
}
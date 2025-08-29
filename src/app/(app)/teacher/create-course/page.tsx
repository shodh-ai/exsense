'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import Sphere from '@/components/Sphere';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Input } from '@/components/input';
import { Button } from '@/components/button';
import { useCreateCourse } from '@/hooks/useApi';

const CreateCoursePage = () => {
  const router = useRouter();
  const createCourse = useCreateCourse();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }

    setLoading(true);
    try {
      const result = await createCourse.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      const newCourseId = (result as any)?.id;
      if (!newCourseId) throw new Error('Course created but no ID returned by API.');
      router.push(`/teacher?courseId=${encodeURIComponent(newCourseId)}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sphere />
      <div className="relative w-full max-h-[87%] overflow-x-hidden">
        <div className="flex flex-col w-full max-w-2xl mx-auto pt-16 px-4 sm:px-6 lg:px-8 pb-10 relative z-10">
          <Card className="border border-[#566fe966] rounded-xl bg-white">
            <CardHeader>
              <CardTitle className="text-[#394169]">Create New Course</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#394169]">Course Title</label>
                  <Input
                    placeholder="e.g. JavaScript Essentials"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-[#394169]">Description (optional)</label>
                  <Input
                    placeholder="Short description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600" role="alert">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={loading || createCourse.isPending} className="rounded-[40px]">
                    {loading || createCourse.isPending ? 'Creating…' : 'Create Course'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-[40px]"
                    disabled={loading}
                    onClick={() => router.push('/teacher-dash')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CreateCoursePage;

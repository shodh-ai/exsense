'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCourse } from '@/hooks/useApi';
import { useApiService } from '@/lib/api';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import Sphere from '@/components/Sphere';
import Footer from '@/components/Footer';

// A simple component for a form section
const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-bold text-[#394169] mb-4">{title}</h2>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export default function CourseSettingsPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const router = useRouter();
    const api = useApiService();

    // Fetch the current course data to populate the form
    const { data: course, isLoading, error } = useCourse(courseId);

    // State for all our form fields
    const [difficulty, setDifficulty] = useState('');
    const [duration, setDuration] = useState('');
    const [language, setLanguage] = useState('');
    const [tags, setTags] = useState(''); // Storing as comma-separated string for simplicity
    const [skills, setSkills] = useState(''); // Storing as comma-separated string
    const [learningOutcomes, setLearningOutcomes] = useState<string[]>(['']);
    const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([{ question: '', answer: '' }]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // When the course data is loaded, update the form state
    useEffect(() => {
        if (course) {
            setDifficulty(course.difficulty || '');
            setDuration(course.duration || '');
            setLanguage(course.language || '');
            setTags(course.tags?.join(', ') || '');
            setSkills(course.skills?.join(', ') || '');
            setLearningOutcomes(course.learningOutcomes?.length ? course.learningOutcomes : ['']);
            setFaqs(course.faqs?.length ? course.faqs : [{ question: '', answer: '' }]);
        }
    }, [course]);
    
    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const payload = {
                difficulty,
                duration,
                language,
                // Split comma-separated strings into arrays, trimming whitespace
                tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
                skills: skills.split(',').map(skill => skill.trim()).filter(Boolean),
                learningOutcomes: learningOutcomes.filter(Boolean),
                faqs: faqs.filter(f => f.question && f.answer),
            };

            await api.updateCourse(courseId, payload);
            alert('Settings saved successfully!');
            // Redirect back to the main course overview page to see the changes
            router.push(`/teacher/courses/${courseId}`);

        } catch (err) {
            setSaveError((err as Error).message || 'Failed to save settings.');
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Failed to load course data.</div>;

    return (
        <>
            <Sphere />
            <div className="w-full h-full overflow-y-auto p-6 font-sans">
                <div className="max-w-4xl mx-auto space-y-6 pb-24">
                    <h1 className="text-3xl font-bold text-[#394169]">Course Settings for "{course?.title}"</h1>

                    <FormSection title="Core Details">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Difficulty Level</label>
                            <Input value={difficulty} onChange={e => setDifficulty(e.target.value)} placeholder="e.g., Beginner, Intermediate" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Course Duration</label>
                            <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g., 8 hrs 21 mins" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Language</label>
                            <Input value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g., English Only" />
                        </div>
                    </FormSection>

                    <FormSection title="Course Metadata">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tags</label>
                            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., Top Rated, AI-Powered" />
                            <p className="text-xs text-gray-500 mt-1">Separate tags with a comma.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Skills Taught</label>
                            <Textarea value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g., Data Preprocessing, Neural Networks" />
                            <p className="text-xs text-gray-500 mt-1">Separate skills with a comma.</p>
                        </div>
                    </FormSection>

                    <FormSection title="What Students Will Learn">
                        {learningOutcomes.map((outcome, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={outcome}
                                    onChange={e => {
                                        const newOutcomes = [...learningOutcomes];
                                        newOutcomes[index] = e.target.value;
                                        setLearningOutcomes(newOutcomes);
                                    }}
                                    placeholder={`Learning outcome #${index + 1}`}
                                />
                                <Button variant="destructive" size="sm" onClick={() => setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index))}>Remove</Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setLearningOutcomes([...learningOutcomes, ''])}>+ Add Outcome</Button>
                    </FormSection>

                    <FormSection title="Frequently Asked Questions (FAQs)">
                        {faqs.map((faq, index) => (
                            <div key={index} className="space-y-2 p-3 border rounded-lg">
                                <Input value={faq.question} onChange={e => { const newFaqs = [...faqs]; newFaqs[index].question = e.target.value; setFaqs(newFaqs); }} placeholder="Question" />
                                <Textarea value={faq.answer} onChange={e => { const newFaqs = [...faqs]; newFaqs[index].answer = e.target.value; setFaqs(newFaqs); }} placeholder="Answer" />
                                <Button variant="destructive" size="sm" onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}>Remove FAQ</Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}>+ Add FAQ</Button>
                    </FormSection>

                    <div className="flex items-center gap-4 mt-8">
                        <Button onClick={handleSave} disabled={isSaving} size="lg">
                            {isSaving ? 'Saving...' : 'Save All Settings'}
                        </Button>
                        <Button variant="ghost" onClick={() => router.push(`/teacher/courses/${courseId}`)}>
                            Cancel
                        </Button>
                        {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
export default function TestPage() {
    return (
        <main className="w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            {[...Array(1000)].map((_, i) => <h1 key={i} className="text-2xl">Test Page</h1>)}
        </main>
    );
}
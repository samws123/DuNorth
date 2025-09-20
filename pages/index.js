export default function Home() {
  if (typeof window !== 'undefined') {
    window.location.href = '/anara';
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to DuNorth...</h1>
        <p>If you're not redirected, <a href="/anara" className="text-blue-500 underline">click here</a>.</p>
      </div>
    </div>
  );
}

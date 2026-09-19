import Dock from "./Dock";

export default function Home() {
  return (
    <main className="page">
      <div className="bg-wall" aria-hidden="true">
        <span>xxxxx</span>
      </div>

      <div className="hero">
        <p className="prompt">
          you found it<span className="cursor" />
        </p>
        <h1>everything's down there ↓</h1>
      </div>

      <Dock />
    </main>
  );
}

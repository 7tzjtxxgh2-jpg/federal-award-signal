import Markdown from "react-markdown";

export function PursuitMemo({ memo }: { memo: string }) {
  return (
    <section className="card memo-card">
      <div className="section-heading">
        <div>
          <span className="section-index">05</span>
          <h2>Pursuit memo</h2>
        </div>
        <span className="count-pill">Evidence-bound</span>
      </div>
      <div className="markdown">
        <Markdown>{memo}</Markdown>
      </div>
    </section>
  );
}

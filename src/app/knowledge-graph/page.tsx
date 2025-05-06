import EntityCards from "~/components/entity-cards";
import KnowledgeGraph from "~/components/knowledge-graph";

export default function KnowledgeGraphPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4">
      <div className="w-full max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold">Meeting Knowledge Graph</h1>

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
            Extracted Entities
          </h2>
          <EntityCards />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
            Graph Visualization
          </h2>
          <KnowledgeGraph />
        </section>
      </div>
    </main>
  );
}

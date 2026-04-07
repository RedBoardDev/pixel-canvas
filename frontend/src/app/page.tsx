import { CanvasContainer } from "@/applications/Canvas/Ui/CanvasContainer";
import { Header } from "./components/Header";

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1">
        <CanvasContainer />
      </main>
    </div>
  );
}

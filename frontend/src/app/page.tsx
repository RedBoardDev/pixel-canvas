import { CanvasContainer } from "@/applications/Canvas/Ui/CanvasContainer";
import { Header } from "./components/Header";

export default function HomePage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Header />
      <CanvasContainer />
    </div>
  );
}

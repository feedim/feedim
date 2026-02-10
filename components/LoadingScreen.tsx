import { Heart } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
    </div>
  );
}

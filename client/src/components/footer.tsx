import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-6 border-t bg-background">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          Built with <Heart className="w-4 h-4 text-red-500 fill-current" /> to Padel in Berlin
        </p>
      </div>
    </footer>
  );
}
import { Heart } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="py-6 border-t bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-6 text-sm">
            <Link 
              to="/american-format-rules" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              American Format Rules
            </Link>
            <a 
              href="https://padel-camp.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Padel Camp GranCanaria 2025/26
            </a>
          </div>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            Built with <Heart className="w-4 h-4 text-red-500 fill-current" /> to Padel in Berlin
          </p>
        </div>
      </div>
    </footer>
  );
}
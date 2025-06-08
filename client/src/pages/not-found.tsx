import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Heart } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              The page you're looking for doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <footer className="py-6 border-t bg-background">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            Built with <Heart className="w-4 h-4 text-red-500 fill-current" /> to Padel in Berlin
          </p>
        </div>
      </footer>
    </div>
  );
}

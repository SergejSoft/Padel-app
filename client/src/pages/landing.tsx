import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { Calendar, Users, Trophy, Share, Heart } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Padel Tournament Manager
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Create and manage American Format padel tournaments with ease
            </p>
            <Button 
              size="lg" 
              onClick={() => window.location.href = "/api/login"}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card>
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Automatic American Format scheduling for 8 players and 2 courts
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Player Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Easy player registration and tournament organization
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>PDF Scorecards</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Generate professional tournament schedules and scorecards
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Share className="h-12 w-12 mx-auto mb-4 text-primary" />
                <CardTitle>Share Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Generate shareable links for players to view schedules
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to organize your tournament?
            </h2>
            <p className="text-muted-foreground mb-8">
              Sign in to start creating and managing your padel tournaments
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = "/api/login"}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In to Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
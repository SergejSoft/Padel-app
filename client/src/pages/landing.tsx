import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/footer";
import { FeaturePreviewModal } from "@/components/feature-preview-modal";
import { Calendar, Users, Trophy, Share, Heart, Eye, UserPlus, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tournament } from "@shared/schema";
import setupPreviewImage from "@assets/1_1749482036883.png";
import playersPreviewImage from "@assets/2_1749482562652.png";
import schedulePreviewImage from "@assets/3_1749482762994.png";

export const FreeButtonIcon = ({ size = "1em", color = 'currentColor', ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 64 64" 
    width={size} 
    height={size} 
    fill={color}
    {...props}
  >
    <path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M52 2H12C6.477 2 2 6.477 2 12v40c0 5.523 4.477 10 10 10h40c5.523 0 10-4.477 10-10V12c0-5.523-4.477-10-10-10zM18 26h-5.09v4.5H18v3h-5.09V41H10V23h8v3zm12.475 15h-3.021l-2.471-7.5h-1.125V41H21V23h5c2.758 0 5 2.355 5 5.25c0 2.197-1.293 4.084-3.121 4.865L30.475 41zM42 26h-5.09v4.5H42v3h-5.09V38H42v3h-8V23h8v3zm12 0h-5.09v4.5H54v3h-5.09V38H54v3h-8V23h8v3z"/><path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M26 26h-2.143v4.5H26c1.182 0 2.143-1.01 2.143-2.25S27.182 26 26 26z"/>
  </svg>
);

export const BouncingBallIcon = ({ size = "1em", color = 'currentColor', ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill={color}
    {...props}
  >
    <ellipse xmlns="http://www.w3.org/2000/svg" cx="12" cy="5" fill="currentColor" rx="4" ry="4"><animate id="svgSpinnersBouncingBall0" fill="freeze" attributeName="cy" begin="0;svgSpinnersBouncingBall2.end" calcMode="spline" dur="0.375s" keySplines=".33,0,.66,.33" values="5;20"/><animate attributeName="rx" begin="svgSpinnersBouncingBall0.end" calcMode="spline" dur="0.05s" keySplines=".33,0,.66,.33;.33,.66,.66,1" values="4;4.8;4"/><animate attributeName="ry" begin="svgSpinnersBouncingBall0.end" calcMode="spline" dur="0.05s" keySplines=".33,0,.66,.33;.33,.66,.66,1" values="4;3;4"/><animate id="svgSpinnersBouncingBall1" attributeName="cy" begin="svgSpinnersBouncingBall0.end" calcMode="spline" dur="0.025s" keySplines=".33,0,.66,.33" values="20;20.5"/><animate id="svgSpinnersBouncingBall2" attributeName="cy" begin="svgSpinnersBouncingBall1.end" calcMode="spline" dur="0.4s" keySplines=".33,.66,.66,1" values="20.5;5"/></ellipse>
  </svg>
);

export const TennisIcon = ({ size = "1em", color = 'currentColor', ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 512 512" 
    width={size} 
    height={size} 
    fill={color}
    {...props}
  >
    <path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M144 80a64 64 0 1 0-64 64a64.072 64.072 0 0 0 64-64Zm-96 0a32 32 0 1 1 32 32a32.036 32.036 0 0 1-32-32Zm392.65-8.564a133.367 133.367 0 0 0-94.233-39.348h-.622c-37.49 0-74.1 15.969-103.135 45.007c-29.579 29.58-53.748 74.529-64.652 120.24a217.034 217.034 0 0 0-5.459 34.69a119.932 119.932 0 0 1-15.265 51.463A142.364 142.364 0 0 1 134.593 313l-79.285 81.211c-12.389 12.431-13.708 25.214-12.626 33.756c1.254 9.919 6.525 19.771 15.243 28.49S76.5 470.447 86.416 471.7a37.826 37.826 0 0 0 4.754.3c8.188 0 18.755-2.679 29.074-13l79.278-81.2a142.035 142.035 0 0 1 31.969-24.044a118.7 118.7 0 0 1 48.6-13.943a216.365 216.365 0 0 0 34.886-5.562c45.544-10.991 90.409-35.227 120.011-64.83c29.2-29.2 45.182-66.048 45.005-103.757a133.37 133.37 0 0 0-39.343-94.228Zm-343.094 365c-3.944 3.917-6.256 3.625-7.128 3.517c-2.729-.346-6.328-2.577-9.875-6.124s-5.779-7.146-6.124-9.876c-.111-.877-.405-3.2 3.577-7.186l63.374-64.912l19.61 19.61Zm86.05-87.61l-19.972-19.971a173.6 173.6 0 0 0 21.186-29.091a72.769 72.769 0 0 0 27.88 27.875a173.632 173.632 0 0 0-29.094 21.188ZM412.366 246.8c-25.234 25.233-65.426 46.826-104.891 56.35c-39.275 9.477-72.175 5.684-88.012-10.15c-33.763-33.765-8.923-138.532 45.825-193.28c25.064-25.064 53.5-35.508 80.192-35.508a103.213 103.213 0 0 1 72.543 29.851c35.65 35.65 45.783 101.295-5.657 152.737Z"/>
  </svg>
);

export default function Landing() {
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    imageSrc: "",
    imageAlt: ""
  });

  const showPreview = (title: string, description: string, imageSrc: string, imageAlt: string) => {
    setPreviewModal({
      isOpen: true,
      title,
      description,
      imageSrc,
      imageAlt
    });
  };

  const closePreview = () => {
    setPreviewModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* FREE Stamp */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full transform rotate-12 shadow-lg border-2 border-blue-700">
          <span className="font-bold text-sm">FREE</span>
        </div>
      </div>
      
      <div className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
              <TennisIcon size="3rem" className="text-primary" />
              Padel Tournament App
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Create and manage American Format padel tournaments with ease
            </p>
            <div className="flex items-center justify-center gap-3 mb-12">
              <Button 
                size="lg" 
                onClick={() => window.location.href = "/login"}
                className="bg-primary text-primary-foreground hover:bg-[#2563eb] transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Button>
              <BouncingBallIcon size="2rem" className="text-primary" />
            </div>
          </div>

          {/* Tournament Registration Section */}
          <div className="mb-16">
            <Tabs defaultValue="features" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="tournaments">Upcoming Tournaments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="features" className="mt-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => showPreview(
                      "Smart Scheduling",
                      "See how our American Format algorithm automatically creates optimal tournament schedules for 8 players and 2 courts",
                      setupPreviewImage,
                      "Tournament Setup Interface"
                    )}
                  >
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

                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => showPreview(
                      "Player Management",
                      "Easily manage tournament participants with our intuitive player entry system",
                      playersPreviewImage,
                      "Player Entry Interface"
                    )}
                  >
                    <CardHeader className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <CardTitle>Player Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        Simple player registration and tournament participation
                      </CardDescription>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => showPreview(
                      "Tournament Results",
                      "Generate professional tournament schedules and scorecards with PDF export",
                      schedulePreviewImage,
                      "Tournament Schedule Display"
                    )}
                  >
                    <CardHeader className="text-center">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <CardTitle>Professional Output</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        PDF export for schedules and scorecards
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tournaments" className="mt-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-4">Upcoming Tournaments</h3>
                  <p className="text-muted-foreground">Join tournaments or view upcoming events in your area</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Sample tournament cards - these would be populated from API in real implementation */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Summer Championship</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Open
                        </Badge>
                      </div>
                      <CardDescription>July 15, 2025 • City Sports Center</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Players:</span>
                          <span>6/8</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Courts:</span>
                          <span>2</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => window.location.href = "/login"}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Join Tournament
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Weekend Warriors</CardTitle>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <Clock className="w-3 h-3 mr-1" />
                          Filling
                        </Badge>
                      </div>
                      <CardDescription>July 22, 2025 • Park Courts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Players:</span>
                          <span>8/8</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Courts:</span>
                          <span>2</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        disabled
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Tournament Full
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Elite Series</CardTitle>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Open
                        </Badge>
                      </div>
                      <CardDescription>August 5, 2025 • Elite Club</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Players:</span>
                          <span>3/8</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Courts:</span>
                          <span>2</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => window.location.href = "/login"}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Join Tournament
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center mt-8">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = "/login"}
                  >
                    Sign In to View More Tournaments
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => showPreview(
                "Smart Scheduling",
                "See how our American Format algorithm automatically creates optimal tournament schedules for 8 players and 2 courts",
                setupPreviewImage,
                "Tournament Setup Interface"
              )}
            >
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

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => showPreview(
                "Player Management",
                "Easily add and manage all tournament participants with our intuitive player registration system",
                playersPreviewImage,
                "Player Names Interface"
              )}
            >
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

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => showPreview(
                "Share Tournaments",
                "Generate shareable links that display professional tournament schedules with real-time updates and match results",
                schedulePreviewImage,
                "Tournament Schedule Interface"
              )}
            >
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
                onClick={() => window.location.href = "/login"}
                className="bg-primary text-primary-foreground hover:bg-[#2563eb] transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In to Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
      
      <FeaturePreviewModal
        isOpen={previewModal.isOpen}
        onClose={closePreview}
        title={previewModal.title}
        description={previewModal.description}
        imageSrc={previewModal.imageSrc}
        imageAlt={previewModal.imageAlt}
      />
    </div>
  );
}
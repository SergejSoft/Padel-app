import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { FeaturePreviewModal } from "@/components/feature-preview-modal";
import { Calendar, Users, Trophy } from "lucide-react";
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
    <path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-8 361.93C171.22 402.63 109.32 340.77 101.93 264H248zm56 0V264h146.07C442.68 340.77 380.78 402.63 304 409.93zM394.07 232H248V85.93C324.78 93.37 386.68 155.23 394.07 232zM216 85.93V232H69.93C77.32 155.23 139.22 93.37 216 85.93z"/>
  </svg>
);

export default function Landing() {
  const [previewModal, setPreviewModal] = useState({
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
                onClick={() => window.location.href = "/api/login"}
                className="bg-primary text-primary-foreground hover:bg-[#2563eb] transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Button>
              <BouncingBallIcon size="2rem" className="text-primary" />
            </div>
          </div>

          {/* Features Section */}
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

          {/* Feature Preview Modal */}
          <FeaturePreviewModal 
            isOpen={previewModal.isOpen}
            onClose={closePreview}
            title={previewModal.title}
            description={previewModal.description}
            imageSrc={previewModal.imageSrc}
            imageAlt={previewModal.imageAlt}
          />
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function Login() {
  useEffect(() => {
    // Auto-redirect to Replit Auth after a brief moment to show branding
    const timer = setTimeout(() => {
      window.location.href = "/api/login";
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <TennisIcon size="4rem" className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Padel Tournament App
          </CardTitle>
          <CardDescription>
            Professional tournament management for padel players
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Redirecting you to secure login...
          </p>
          <Button 
            onClick={() => window.location.href = "/api/login"}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Continue to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
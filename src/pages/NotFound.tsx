
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full glass-card p-8 rounded-xl shadow-soft text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-xl text-foreground mb-8">
          La página que estás buscando no existe
        </p>
        <Button
          asChild
          className="transition-all duration-300 hover:shadow-md"
          size="lg"
        >
          <a href="/">Volver al Inicio</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

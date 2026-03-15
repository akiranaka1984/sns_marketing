import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-full max-w-md mx-4 text-center">
        <div className="bg-neutral-950 rounded-lg border border-white/[0.06] p-8">
          <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-6 w-6 text-emerald-500" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-1">404</h1>

          <h2 className="text-sm font-bold text-neutral-500 mb-3">
            Page Not Found
          </h2>

          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <Button
            onClick={handleGoHome}
            className="bg-emerald-500 hover:bg-emerald-500 text-white px-6 h-9 text-sm font-bold border border-white/[0.06] rounded-lg hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

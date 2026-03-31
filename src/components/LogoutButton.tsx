import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = "ghost",
  size = "default",
  className = "",
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      localStorage.removeItem("user");
      sessionStorage.clear();

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);

      localStorage.removeItem("user");
      sessionStorage.clear();

      toast({
        title: "Logout Failed",
        description: "There was an error logging you out",
        variant: "destructive",
      });

      navigate("/login", { replace: true });
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
};

export default LogoutButton;
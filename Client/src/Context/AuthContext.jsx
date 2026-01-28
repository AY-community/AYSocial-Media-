import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Spinner from "../Components/Ui/Spinner";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const isAuthPage = location.pathname.startsWith("/auth");
    
    const fetchUser = async () => {
      const startTime = Date.now();
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API}/me`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        setUser(null);
      } finally {
        // Calculate elapsed time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(2000 - elapsedTime, 0); // Minimum 2 seconds
        
        // Wait for remaining time before hiding spinner
        setTimeout(() => {
          setLoadingUser(false);
        }, remainingTime);
      }
    };

    if (isAuthPage) {
      setLoadingUser(false);
      return;
    }

    if (!user) {
      fetchUser();
    } else {
      setLoadingUser(false);
    }

    setTimeout(() => {
      fetchUser();
    }, 3000);
  }, []);

  const updatePrivacySettings = async (settings) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API}/update-privacy-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(settings),
        }
      );

      if (!res.ok) throw new Error("Failed to update privacy settings");

      const data = await res.json();

      setUser((prevUser) => ({
        ...prevUser,
        privacySettings: data.privacySettings,
      }));

      return { success: true, data };
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      return { success: false, error: error.message };
    }
  };

  if (loadingUser) {
    return <Spinner />;
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, loadingUser, updatePrivacySettings }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
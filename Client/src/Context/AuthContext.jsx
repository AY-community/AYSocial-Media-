import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Spinner from "../Components/Ui/Spinner";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const isMountedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const clearAuthState = () => {
    requestInFlightRef.current = false;
    setUser(null);
    setLoadingUser(false);
  };

  useEffect(() => {
    const isAuthPage = location.pathname.startsWith("/auth");

    if (isAuthPage) {
      setLoadingUser(false);
      return;
    }

    if (user) {
      setLoadingUser(false);
      return;
    }

    if (requestInFlightRef.current) return;

    const fetchUser = async () => {
      requestInFlightRef.current = true;
      setLoadingUser(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API}/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          clearAuthState();
          return;
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        clearAuthState();
      } finally {
        requestInFlightRef.current = false;
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [location.pathname, user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
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
      value={{ user, setUser, loadingUser, clearAuthState, updatePrivacySettings }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
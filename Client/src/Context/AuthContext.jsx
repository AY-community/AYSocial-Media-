import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Spinner from "../Components/Ui/Spinner";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const isMountedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const authCheckSettledRef = useRef(false);

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const clearAuthState = () => {
    requestInFlightRef.current = false;
    authCheckSettledRef.current = true;
    setUser(null);
    setLoadingUser(false);
  };

  useEffect(() => {
    const isAuthPage = location.pathname.startsWith("/auth");

    if (isAuthPage) {
      authCheckSettledRef.current = false;
      setLoadingUser(false);
      return;
    }

    if (user) {
      authCheckSettledRef.current = true;
      setLoadingUser(false);
      return;
    }

    if (authCheckSettledRef.current || requestInFlightRef.current) {
      setLoadingUser(false);
      return;
    }

    const fetchUser = async () => {
      requestInFlightRef.current = true;
      setLoadingUser(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API}/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          authCheckSettledRef.current = true;
          setUser(null);
          setLoadingUser(false);
          return;
        }

        const data = await res.json();
        authCheckSettledRef.current = true;
        setUser(data);
      } catch (err) {
        authCheckSettledRef.current = true;
        setUser(null);
      } finally {
        requestInFlightRef.current = false;
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [location.pathname]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const wrappedFetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401 && !location.pathname.startsWith("/auth")) {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }

      return response;
    };

    window.fetch = wrappedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (!location.pathname.startsWith("/auth")) {
        clearAuthState();
      }
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [location.pathname]);

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
import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(true);

    const API_URL = "http://localhost:4000/api";

    useEffect(() => {
        const verifyAuth = async () => {
            const storedToken = localStorage.getItem("token");
            const headers = {};
            if (storedToken) {
                headers["Authorization"] = `Bearer ${storedToken}`;
            }

            try {
                // Pass credentials: "include" so HTTP-only cookies are automatically sent to the backend
                const response = await fetch(`${API_URL}/auth/profile`, {
                    method: "GET",
                    headers,
                    credentials: "include"
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                    if (storedToken) {
                        setToken(storedToken);
                    }
                } else {
                    // Cookie or token is invalid / expired
                    localStorage.removeItem("token");
                    setToken(null);
                    setUser(null);
                }
            } catch (err) {
                console.error("Auth verification failed:", err);
            } finally {
                setLoading(false);
            }
        };

        verifyAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include", // Receives and stores HTTP-only cookie
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            if (data.token) {
                localStorage.setItem("token", data.token);
                setToken(data.token);
            }
            setUser(data.user);
            return data.user;
        } catch (err) {
            console.error("Login Context error:", err);
            throw err;
        }
    };

    const register = async (name, email, password, role) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include", // Receives and stores HTTP-only cookie
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            if (data.token) {
                localStorage.setItem("token", data.token);
                setToken(data.token);
            }
            setUser(data.user);
            return data.user;
        } catch (err) {
            console.error("Registration Context error:", err);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                credentials: "include" // Clears the HTTP-only cookie
            });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, API_URL }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

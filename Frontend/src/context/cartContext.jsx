import React, { createContext, useState, useEffect, useContext } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const localCart = localStorage.getItem("cart");
        return localCart ? JSON.parse(localCart) : [];
    });

    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart));
    }, [cart]);

    const addToCart = (comic, quantity = 1) => {
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.comic._id === comic._id);

            if (existingIndex > -1) {
                const newQuantity = prevCart[existingIndex].quantity + quantity;
                if (newQuantity > comic.stock) {
                    alert(`Cannot add more than available stock (${comic.stock})!`);
                    return prevCart;
                }
                const updatedCart = [...prevCart];
                updatedCart[existingIndex].quantity = newQuantity;
                return updatedCart;
            } else {
                if (quantity > comic.stock) {
                    alert(`Cannot add more than available stock (${comic.stock})!`);
                    return prevCart;
                }
                return [...prevCart, { comic, quantity }];
            }
        });
    };

    const removeFromCart = (comicId) => {
        setCart(prevCart => prevCart.filter(item => item.comic._id !== comicId));
    };

    const updateQuantity = (comicId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(comicId);
            return;
        }

        setCart(prevCart => {
            const item = prevCart.find(i => i.comic._id === comicId);
            if (!item) return prevCart;

            if (quantity > item.comic.stock) {
                alert(`Cannot add more than available stock (${item.comic.stock})!`);
                return prevCart;
            }

            return prevCart.map(i => i.comic._id === comicId ? { ...i, quantity } : i);
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const getCartTotal = () => {
        return cart.reduce((acc, curr) => acc + (curr.comic.price * curr.quantity), 0);
    };

    const getCartCount = () => {
        return cart.reduce((acc, curr) => acc + curr.quantity, 0);
    };

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            getCartTotal,
            getCartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};

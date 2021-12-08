import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { STORAGE_KEY } from "../constants";
import { Product, Stock } from "../types";
import { api } from "../services/api";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(`${STORAGE_KEY}:cart`);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (!productExists) {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );

          toast(`${product.title} foi adicionado!`);

          return;
        }
      }

      if (productExists) {
        const { data: stock } = await api.get(`/stock/${productId}`);

        if (stock.amount > productExists.amount) {
          const updatedCart = cart.map((cartItem) =>
            cartItem.id === productId
              ? {
                  ...cartItem,
                  amount: Number(cartItem.amount) + 1,
                }
              : cartItem
          );

          setCart(updatedCart);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updatedCart)
          );

          toast(`${productExists.title} foi adicionado!`);

          return;
        } else {
          toast.error("Quantidade solicitada fora de estoque");

          return;
        }
      }
    } catch {
      toast.error("Erro na adição do produto");

      return;
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productExists = cart.find(
        (cartProduct) => cartProduct.id === productId
      );

      if (!productExists) {
        toast.error("Erro na remoção do produto");

        return;
      }

      const updatedCart = cart.filter((cartItem) => cartItem.id !== productId);

      setCart(updatedCart);

      localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");

      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Erro na alteração de quantidade do produto!");

        return;
      }

      const { data: productStock } = await api.get<Stock>(
        `/stock/${productId}`
      );

      if (amount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      const productExists = cart.find(
        (cartProduct) => cartProduct.id === productId
      );

      if (!productExists) {
        toast.error("Erro na alteração de quantidade do produto");

        return;
      }

      const updatedCart = cart.map((cartItem) =>
        cartItem.id === productId
          ? {
              ...cartItem,
              amount: amount,
            }
          : cartItem
      );

      setCart(updatedCart);

      localStorage.setItem(`${STORAGE_KEY}:cart`, JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");

      return;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

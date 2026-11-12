// Single-restaurant context (Clancy's) + loyalty snapshot.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Loyalty, type Restaurant } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";

type Ctx = {
  restaurant: Restaurant | null;
  loyalty: Loyalty | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const RestaurantCtx = createContext<Ctx | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [loading, setLoading] = useState(true);

  // Depende del id y el rol, no del objeto `user`: auth.refresh() trae un objeto
  // nuevo aunque sea la misma persona, y eso cambiaba `load`, que la pantalla de
  // Perfil vuelve a llamar al enfocarse (bucle infinito de peticiones).
  const userId = user?.user_id;
  const role = user?.role;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.restaurant();
      setRestaurant(r);
      if (userId && role === "customer") {
        try {
          const l = await api.loyalty();
          setLoyalty(l);
        } catch {}
      } else {
        setLoyalty(null);
      }
    } catch (e) {
      console.log("restaurant load error", e);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(
    () => ({ restaurant, loyalty, loading, refresh: load }),
    [restaurant, loyalty, loading, load]
  );
  return <RestaurantCtx.Provider value={value}>{children}</RestaurantCtx.Provider>;
}

export function useRestaurant() {
  const c = useContext(RestaurantCtx);
  if (!c) throw new Error("useRestaurant must be used within RestaurantProvider");
  return c;
}

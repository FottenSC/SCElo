import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type AuthContextValue = {
    session: Session | null;
    loading: boolean;
    isAdmin: boolean;
    signInWithGithub: () => Promise<void>;
    signInWithTwitter: () => Promise<void>;
    signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
    undefined,
);

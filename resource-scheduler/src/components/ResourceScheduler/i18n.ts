// src/components/ResourceScheduler/i18n.ts
import { createContext, useContext } from "react";
import { defaultI18n, type I18nContextValue } from "./i18nCore";

// Labels, date formats and their types live in i18nCore (no React), so the
// headless entry can use them. This file adds the context around them.
export * from "./i18nCore";

export const I18nContext = createContext<I18nContextValue>(defaultI18n);

export const useI18n = () => useContext(I18nContext);

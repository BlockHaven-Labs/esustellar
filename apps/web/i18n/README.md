# i18n Convention

All user-facing UI strings must go in `i18n/locales/<lang>.json`, never
hardcoded in components.

Usage in a component:

    import { useTranslation } from "react-i18next";
    const { t } = useTranslation();
    <button>{t("common.save")}</button>

Supported locales: en (default), ha (Hausa).
To add a new key: add it to `locales/en.json` first, then mirror it in
every other locale file.

import { Button } from "@fluentui/react-components";
import { LANGUAGES, useI18n } from "../i18n";

/** IT / EN buttons: the choice is kept in this browser. */
export function LanguageSwitch() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.language.label}>
      {LANGUAGES.map((option) => (
        <Button
          key={option.value}
          size="small"
          appearance={option.value === language ? "primary" : "subtle"}
          aria-pressed={option.value === language}
          title={option.label}
          onClick={() => setLanguage(option.value)}
        >
          {option.value.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}

import type { Locale } from '../../lib/cms/client';

const LABELS: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English', fr: 'Français' };
const LOCALES: Locale[] = ['vi', 'en', 'fr'];

type Props = {
  value: Locale;
  onChange: (locale: Locale) => void;
  present?: Partial<Record<Locale, boolean>>;
};

export default function LocaleTabs({ value, onChange, present }: Props) {
  return (
    <div className="locale-tabs" role="tablist" aria-label="Ngôn ngữ">
      {LOCALES.map((locale) => {
        const filled = present ? present[locale] !== false : true;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={value === locale}
            className={`locale-tab ${value === locale ? 'active' : ''}`}
            onClick={() => onChange(locale)}
          >
            {LABELS[locale]}
            <span className={`dot ${filled ? '' : 'missing'}`} />
          </button>
        );
      })}
    </div>
  );
}

export const LOCALE_LABELS = LABELS;

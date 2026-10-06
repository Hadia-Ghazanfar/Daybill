import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import featAen from './featA.en';
import featAur from './featA.ur';
import featBen from './featB.en';
import featBur from './featB.ur';

export type Lang = 'en' | 'ur';

type Dict = Record<string, string>;

const enBase: Dict = {
  'app.tagline1': 'Roz ka karobar, ab asaan',
  'app.tagline2': 'Your daily trade, simplified',

  'nav.overview': 'Overview',
  'nav.bills': 'Bills',
  'nav.create': 'Create',
  'nav.createInvoice': 'Create Invoice',
  'nav.contacts': 'Contacts',
  'nav.products': 'Products',
  'nav.profile': 'Profile',
  'nav.admin': 'Admin',
  'nav.purchases': 'Purchases',
  'nav.sales': 'Sales',
  'nav.catalog': 'Catalog',
  'nav.account': 'Account',
  'nav.logout': 'Log out',

  'auth.user': 'User',
  'auth.admin': 'Admin',
  'auth.phone': 'Phone number',
  'auth.pin': '4-digit PIN',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.login': 'Log in',
  'auth.loginTitle': 'Welcome back',
  'auth.loginSubtitle': 'Log in to manage your shop',
  'auth.invalidCreds': 'Invalid phone number or PIN.',
  'auth.invalidAdminCreds': 'Invalid email or password.',
  'auth.phoneInvalid': 'Enter a valid phone number (0300-0000000).',
  'auth.pinInvalid': 'PIN must be 4 digits.',
  'auth.emailInvalid': 'Enter a valid email address.',
  'auth.required': 'This field is required.',

  'welcome.title': 'Welcome to Daybill!',
  'welcome.slide1': 'Run your whole shop from your pocket',
  'welcome.slide2': 'Make bills with a live preview',
  'welcome.slide3': 'Share invoices on WhatsApp in one tap',
  'welcome.cta': 'Access Your Account',
  'welcome.noAccount': "Don't have an account?",
  'welcome.signup': 'Signup',

  'register.title': 'Create your account',
  'register.subtitle': 'Set up your shop in under a minute',
  'register.name': 'Your name',
  'register.shopName': 'Shop name',
  'register.shopAddress': 'Shop address',
  'register.submit': 'Create account',
  'register.haveAccount': 'Already have an account?',
  'register.login': 'Log in',

  'notfound.title': 'Page not found',
  'notfound.message': "The page you're looking for doesn't exist.",
  'notfound.home': 'Back to home',

  'common.loading': 'Loading…',
  'common.retry': 'Try again',
  'common.error': 'Something went wrong. Please try again.',
  'common.building': 'This section is still being built.',
};

const urBase: Dict = {
  'app.tagline1': 'Roz ka karobar, ab asaan',
  'app.tagline2': 'Your daily trade, simplified',

  'nav.overview': 'جائزہ',
  'nav.bills': 'بلز',
  'nav.create': 'بنائیں',
  'nav.createInvoice': 'نیا بل بنائیں',
  'nav.contacts': 'رابطے',
  'nav.products': 'مصنوعات',
  'nav.profile': 'پروفائل',
  'nav.admin': 'ایڈمن',
  'nav.purchases': 'خریداری',
  'nav.sales': 'فروخت',
  'nav.catalog': 'کیٹلاگ',
  'nav.account': 'اکاؤنٹ',
  'nav.logout': 'لاگ آؤٹ',

  'auth.user': 'صارف',
  'auth.admin': 'ایڈمن',
  'auth.phone': 'فون نمبر',
  'auth.pin': '4 ہندسوں کا پن',
  'auth.email': 'ای میل',
  'auth.password': 'پاس ورڈ',
  'auth.login': 'لاگ اِن',
  'auth.loginTitle': 'خوش آمدید',
  'auth.loginSubtitle': 'اپنی دکان کا انتظام کرنے کے لیے لاگ اِن کریں',
  'auth.invalidCreds': 'فون نمبر یا پن غلط ہے۔',
  'auth.invalidAdminCreds': 'ای میل یا پاس ورڈ غلط ہے۔',
  'auth.phoneInvalid': 'درست فون نمبر درج کریں (0300-0000000)۔',
  'auth.pinInvalid': 'پن 4 ہندسوں کا ہونا چاہیے۔',
  'auth.emailInvalid': 'درست ای میل درج کریں۔',
  'auth.required': 'یہ خانہ ضروری ہے۔',

  'welcome.title': 'Daybill میں خوش آمدید!',
  'welcome.slide1': 'اپنی پوری دکان اپنی جیب سے چلائیں',
  'welcome.slide2': 'لائیو پیش نظارے کے ساتھ بل بنائیں',
  'welcome.slide3': 'ایک ٹیپ میں واٹس ایپ پر انوائس بھیجیں',
  'welcome.cta': 'اپنے اکاؤنٹ تک رسائی حاصل کریں',
  'welcome.noAccount': 'اکاؤنٹ نہیں ہے؟',
  'welcome.signup': 'سائن اپ',

  'register.title': 'اپنا اکاؤنٹ بنائیں',
  'register.subtitle': 'ایک منٹ سے کم میں اپنی دکان سیٹ اپ کریں',
  'register.name': 'آپ کا نام',
  'register.shopName': 'دکان کا نام',
  'register.shopAddress': 'دکان کا پتہ',
  'register.submit': 'اکاؤنٹ بنائیں',
  'register.haveAccount': 'پہلے سے اکاؤنٹ ہے؟',
  'register.login': 'لاگ اِن',

  'notfound.title': 'صفحہ نہیں ملا',
  'notfound.message': 'آپ جو صفحہ تلاش کر رہے ہیں وہ موجود نہیں ہے۔',
  'notfound.home': 'ہوم پر واپس جائیں',

  'common.loading': 'لوڈ ہو رہا ہے…',
  'common.retry': 'دوبارہ کوشش کریں',
  'common.error': 'کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔',
  'common.building': 'یہ حصہ ابھی بن رہا ہے۔',
};

/**
 * Feature dictionaries added by other agents as `i18n/feat*.en.ts` /
 * `i18n/feat*.ur.ts` (default-exported {key: string} objects) are picked up
 * automatically via the eager glob below — no registration needed.
 */
function buildDict(lang: Lang): Dict {
  const base = lang === 'ur' ? urBase : enBase;
  const dict: Dict = { ...base };
  if (lang === 'ur') {
    Object.assign(dict, featAur, featBur);
  } else {
    Object.assign(dict, featAen, featBen);
  }
  return dict;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANG_KEY = 'daybill-lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    localStorage.getItem(LANG_KEY) === 'ur' ? 'ur' : 'en'
  );

  const dicts = useMemo(
    () => ({ en: buildDict('en'), ur: buildDict('ur') }),
    []
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_KEY, lang);
    // Notify feature string hooks that read the persisted key directly.
    window.dispatchEvent(new Event('daybill:lang'));
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback(
    (key: string) => dicts[lang][key] ?? key,
    [dicts, lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

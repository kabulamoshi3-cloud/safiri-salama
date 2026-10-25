/**
 * Public Website i18n system
 * Simple, reactive, localStorage-persisted
 */

export type Lang = 'en' | 'sw';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    nav_home: 'Home', nav_services: 'Services', nav_traffic: 'Traffic',
    nav_driver: 'Become a Driver', nav_about: 'About', nav_help: 'Help',
    nav_sign_in: 'Sign In', nav_book_ride: 'Book a Ride',
    // Home
    hero_title: 'Ride Smarter.\nMove Morogoro.',
    hero_subtitle: 'Safiri Haraka is your trusted AI-powered ride-hailing platform, connecting you to safe, reliable and affordable rides in Morogoro and beyond.',
    get_started: 'Get Started',
    download_app: 'Download App',
    passenger_app: 'Passenger App',
    driver_app: 'Driver App',
    install_passenger: 'Install Passenger App',
    install_driver: 'Install Driver App',
    features_title: 'Why Choose Safiri Haraka?',
    feature_fast: 'Fast & Safe Booking',
    feature_fast_desc: 'Book a ride in seconds. Verified drivers with high ratings.',
    feature_tracking: 'Live Tracking & ETA',
    feature_tracking_desc: 'Track your driver in real-time. Share your trip for safety.',
    feature_payment: 'Multiple Payment Options',
    feature_payment_desc: 'Pay with Cash, M-Pesa, Tigo Pesa, or Airtel Money.',
    feature_ai: 'AI Traffic Prediction',
    feature_ai_desc: 'Smart routing avoids traffic. Save time every trip.',
    feature_support: '24/7 Support',
    feature_support_desc: 'We are always here for you. Call, chat, or email anytime.',
    // Login
    welcome_back: 'Welcome Back',
    sign_in_subtitle: 'Sign in to your Safiri Haraka account',
    continue_google: 'Continue with Google',
    continue_apple: 'Continue with Apple',
    or: 'or',
    email_phone: 'Email or Phone',
    email_phone_placeholder: 'Enter your email or phone number',
    password: 'Password',
    password_placeholder: 'Enter your password',
    forgot_password: 'Forgot password?',
    sign_in: 'Sign In',
    signing_in: 'Signing In...',
    no_account: "Don't have an account?",
    register: 'Register',
    passenger: 'Passenger',
    driver: 'Driver',
    login_success: 'Account created successfully! Please sign in.',
    login_error: 'Invalid email or password. Please try again.',
    // Register
    create_account: 'Create Account',
    join_subtitle: 'Join Safiri Haraka today',
    register_as: 'I want to register as:',
    full_name: 'Full Name',
    full_name_placeholder: 'Enter your full name',
    phone: 'Phone Number',
    phone_placeholder: 'e.g., +255 700 000 000',
    email_optional: 'Email (Optional)',
    email_placeholder: 'Enter your email',
    confirm_password: 'Confirm Password',
    confirm_password_placeholder: 'Confirm your password',
    vehicle_type: 'Vehicle Type',
    license_number: 'License Number',
    plate_number: 'Plate Number',
    agree_terms: 'I agree to the',
    terms: 'Terms of Service',
    and: 'and',
    privacy: 'Privacy Policy',
    creating: 'Creating Account...',
    have_account: 'Already have an account?',
    passwords_no_match: 'Passwords do not match',
    agree_terms_error: 'You must agree to the Terms of Service and Privacy Policy',
    // About
    about_title: 'About Safiri Haraka',
    about_subtitle: 'Intelligence in Every Journey',
    // Help
    help_title: 'Help & Support',
    help_subtitle: "We're here to help 24/7",
    // Services
    services_title: 'Our Services',
    // Driver
    driver_title: 'Become a Driver',
    driver_subtitle: 'Earn money on your schedule',
    // Footer
    footer_rights: 'All rights reserved.',
    footer_tagline: 'Intelligence in Every Journey.',
  },
  sw: {
    // Nav
    nav_home: 'Nyumbani', nav_services: 'Huduma', nav_traffic: 'Msongamano',
    nav_driver: 'Kuwa Dereva', nav_about: 'Kuhusu', nav_help: 'Msaada',
    nav_sign_in: 'Ingia', nav_book_ride: 'Piga Nauli',
    // Home
    hero_title: 'Safari Bora.\nHamia Morogoro.',
    hero_subtitle: 'Safiri Haraka ni jukwaa lako la kuomba usafiri linalotumia akili bandia, linalokuunganisha na safari salama, za kuaminika na za bei nafuu Morogoro na zaidi.',
    get_started: 'Anza Sasa',
    download_app: 'Pakua Programu',
    passenger_app: 'Programu ya Abiria',
    driver_app: 'Programu ya Dereva',
    install_passenger: 'Sakinisha Programu ya Abiria',
    install_driver: 'Sakinisha Programu ya Dereva',
    features_title: 'Kwa Nini Uchague Safiri Haraka?',
    feature_fast: 'Kuomba Haraka na Salama',
    feature_fast_desc: 'Omba safari kwa sekunde. Madereva waliothibitishwa wenye alama nzuri.',
    feature_tracking: 'Ufuatiliaji wa Moja kwa Moja na ETA',
    feature_tracking_desc: 'Fuatilia dereva wako wakati halisi. Shiriki safari yako kwa usalama.',
    feature_payment: 'Njia Nyingi za Malipo',
    feature_payment_desc: 'Lipa kwa Pesa Taslimu, M-Pesa, Tigo Pesa, au Airtel Money.',
    feature_ai: 'Utabiri wa Msongamano wa AI',
    feature_ai_desc: 'Njia bora zaepuka msongamano. Okoa muda kila safari.',
    feature_support: 'Msaada wa Saa 24/7',
    feature_support_desc: 'Sisi daima tuko hapa kwako. Piga simu, zungumza, au tuma barua pepe wakati wowote.',
    // Login
    welcome_back: 'Karibu Tena',
    sign_in_subtitle: 'Ingia kwenye akaunti yako ya Safiri Haraka',
    continue_google: 'Endelea na Google',
    continue_apple: 'Endelea na Apple',
    or: 'au',
    email_phone: 'Barua pepe au Simu',
    email_phone_placeholder: 'Weka barua pepe au nambari ya simu',
    password: 'Nenosiri',
    password_placeholder: 'Weka nenosiri lako',
    forgot_password: 'Umesahau nenosiri?',
    sign_in: 'Ingia',
    signing_in: 'Inaingia...',
    no_account: 'Huna akaunti?',
    register: 'Jisajili',
    passenger: 'Abiria',
    driver: 'Dereva',
    login_success: 'Akaunti imeundwa! Tafadhali ingia.',
    login_error: 'Barua pepe au nenosiri si sahihi. Jaribu tena.',
    // Register
    create_account: 'Fungua Akaunti',
    join_subtitle: 'Jiunge na Safiri Haraka leo',
    register_as: 'Nataka kujisajili kama:',
    full_name: 'Jina Kamili',
    full_name_placeholder: 'Weka jina lako kamili',
    phone: 'Nambari ya Simu',
    phone_placeholder: 'mfano +255 700 000 000',
    email_optional: 'Barua pepe (Si lazima)',
    email_placeholder: 'Weka barua pepe yako',
    confirm_password: 'Thibitisha Nenosiri',
    confirm_password_placeholder: 'Rudia nenosiri',
    vehicle_type: 'Aina ya Gari',
    license_number: 'Nambari ya Leseni',
    plate_number: 'Nambari ya Bodi',
    agree_terms: 'Nakubali',
    terms: 'Masharti ya Huduma',
    and: 'na',
    privacy: 'Sera ya Faragha',
    creating: 'Inaunda Akaunti...',
    have_account: 'Una akaunti tayari?',
    passwords_no_match: 'Manenosiri hayalingani',
    agree_terms_error: 'Lazima ukubali Masharti ya Huduma na Sera ya Faragha',
    // About
    about_title: 'Kuhusu Safiri Haraka',
    about_subtitle: 'Akili katika Kila Safari',
    // Help
    help_title: 'Msaada na Usaidizi',
    help_subtitle: 'Tuko hapa kukusaidia saa 24/7',
    // Services
    services_title: 'Huduma Zetu',
    // Driver
    driver_title: 'Kuwa Dereva',
    driver_subtitle: 'Pata pesa kwa ratiba yako',
    // Footer
    footer_rights: 'Haki zote zimehifadhiwa.',
    footer_tagline: 'Akili katika Kila Safari.',
  },
};

let currentLang: Lang = 'en';
let listeners: (() => void)[] = [];

const saved = localStorage.getItem('safiri_pub_lang');
if (saved === 'en' || saved === 'sw') currentLang = saved;

export const pubI18n = {
  t(key: string): string {
    return translations[currentLang][key] || translations['en'][key] || key;
  },
  getLanguage(): Lang { return currentLang; },
  setLanguage(lang: Lang) {
    currentLang = lang;
    localStorage.setItem('safiri_pub_lang', lang);
    listeners.forEach(fn => fn());
  },
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
};

export default pubI18n;

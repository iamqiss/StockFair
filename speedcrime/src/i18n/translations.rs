//! Translation strings for all 11 SA official languages.
//!
//! Xitsonga translations are culturally reviewed.
//! Others are currently English fallbacks — replace with native speaker
//! translations before launch.

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub enum Language {
    #[default]
    English,
    Zulu,
    Xhosa,
    Afrikaans,
    Sepedi,
    Setswana,
    Sesotho,
    Xitsonga,  // First-class — culturally reviewed
    Siswati,
    Tshivenda,
    Isindebele,
}

impl Language {
    pub fn code(&self) -> &'static str {
        match self {
            Self::English    => "en",
            Self::Zulu       => "zu",
            Self::Xhosa      => "xh",
            Self::Afrikaans  => "af",
            Self::Sepedi     => "nso",
            Self::Setswana   => "tn",
            Self::Sesotho    => "st",
            Self::Xitsonga   => "ts",
            Self::Siswati    => "ss",
            Self::Tshivenda  => "ve",
            Self::Isindebele => "nr",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::English    => "English",
            Self::Zulu       => "isiZulu",
            Self::Xhosa      => "isiXhosa",
            Self::Afrikaans  => "Afrikaans",
            Self::Sepedi     => "Sepedi",
            Self::Setswana   => "Setswana",
            Self::Sesotho    => "Sesotho",
            Self::Xitsonga   => "Xitsonga",
            Self::Siswati    => "siSwati",
            Self::Tshivenda  => "Tshivenda",
            Self::Isindebele => "isiNdebele",
        }
    }

    pub fn all() -> &'static [Language] {
        &[
            Self::English, Self::Zulu, Self::Xhosa, Self::Afrikaans,
            Self::Sepedi, Self::Setswana, Self::Sesotho, Self::Xitsonga,
            Self::Siswati, Self::Tshivenda, Self::Isindebele,
        ]
    }
}

#[derive(Debug, Clone, Copy)]
pub enum TranslationKey {
    // ── Auth ───────────────────────────────────────────────────────────────
    WelcomeTitle,
    WelcomeTagline,
    SignIn,
    SignUp,
    CreateAccount,
    PhoneNumber,
    Password,
    ForgotPassword,
    EnterOtp,
    OtpSentTo,
    Verify,
    Resend,

    // ── Home ───────────────────────────────────────────────────────────────
    WelcomeBack,
    TotalSavings,
    NextPayout,
    ContributeNow,
    History,
    MyStokvels,
    ViewAll,

    // ── Groups ─────────────────────────────────────────────────────────────
    MyGroups,
    CreateGroup,
    JoinGroup,
    Members,
    Contributions,
    GroupPot,
    Payout,
    Active,
    Pending,
    Overdue,
    Paid,

    // ── Market ─────────────────────────────────────────────────────────────
    Market,
    BulkDeals,
    PreOrder,
    Partners,
    SearchProducts,

    // ── Discover ───────────────────────────────────────────────────────────
    Discover,
    NearYou,
    Featured,
    TopPerformers,
    Safest,
    RequestToJoin,

    // ── Profile ────────────────────────────────────────────────────────────
    Profile,
    FairScore,
    Settings,
    Language,
    Theme,
    SignOut,
    Verified,
    NotVerified,

    // ── Wallet ─────────────────────────────────────────────────────────────
    Wallet,
    Balance,
    Deposit,
    Withdraw,
    Send,
    Receive,

    // ── Generic ────────────────────────────────────────────────────────────
    Continue,
    Back,
    Cancel,
    Save,
    Confirm,
    Loading,
    Error,
    Success,
    TryAgain,
    NetworkError,
}

/// Get a translated string for the given language and key.
pub fn t(lang: Language, key: TranslationKey) -> &'static str {
    match lang {
        Language::Xitsonga   => ts(key),
        Language::Zulu       => zu(key),
        Language::Sesotho    => st(key),
        _                    => en(key), // fallback to English
    }
}

// ── English ───────────────────────────────────────────────────────────────────

fn en(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "Welcome to StockFair",
        TranslationKey::WelcomeTagline  => "Your stokvel, your way",
        TranslationKey::SignIn          => "Sign In",
        TranslationKey::SignUp          => "Sign Up",
        TranslationKey::CreateAccount   => "Create Account",
        TranslationKey::PhoneNumber     => "Phone Number",
        TranslationKey::Password        => "Password",
        TranslationKey::ForgotPassword  => "Forgot Password?",
        TranslationKey::EnterOtp        => "Enter Code",
        TranslationKey::OtpSentTo       => "Code sent to",
        TranslationKey::Verify          => "Verify",
        TranslationKey::Resend          => "Resend",
        TranslationKey::WelcomeBack     => "Welcome back",
        TranslationKey::TotalSavings    => "Total Savings",
        TranslationKey::NextPayout      => "Next Payout",
        TranslationKey::ContributeNow   => "Contribute Now",
        TranslationKey::History         => "History",
        TranslationKey::MyStokvels      => "My Stokvels",
        TranslationKey::ViewAll         => "View All",
        TranslationKey::MyGroups        => "My Groups",
        TranslationKey::CreateGroup     => "Create Group",
        TranslationKey::JoinGroup       => "Join Group",
        TranslationKey::Members         => "Members",
        TranslationKey::Contributions   => "Contributions",
        TranslationKey::GroupPot        => "Group Pot",
        TranslationKey::Payout          => "Payout",
        TranslationKey::Active          => "Active",
        TranslationKey::Pending         => "Pending",
        TranslationKey::Overdue         => "Overdue",
        TranslationKey::Paid            => "Paid",
        TranslationKey::Market          => "Market",
        TranslationKey::BulkDeals       => "Bulk deals for your stokvel",
        TranslationKey::PreOrder        => "Pre-Order",
        TranslationKey::Partners        => "Partners",
        TranslationKey::SearchProducts  => "Search products...",
        TranslationKey::Discover        => "Discover",
        TranslationKey::NearYou         => "Near You",
        TranslationKey::Featured        => "Featured",
        TranslationKey::TopPerformers   => "Top Performers",
        TranslationKey::Safest          => "Safest",
        TranslationKey::RequestToJoin   => "Request to Join",
        TranslationKey::Profile         => "Profile",
        TranslationKey::FairScore       => "Fair Score",
        TranslationKey::Settings        => "Settings",
        TranslationKey::Language        => "Language",
        TranslationKey::Theme           => "Theme",
        TranslationKey::SignOut         => "Sign Out",
        TranslationKey::Verified        => "Verified",
        TranslationKey::NotVerified     => "Not Verified",
        TranslationKey::Wallet          => "Wallet",
        TranslationKey::Balance         => "Balance",
        TranslationKey::Deposit         => "Deposit",
        TranslationKey::Withdraw        => "Withdraw",
        TranslationKey::Send            => "Send",
        TranslationKey::Receive         => "Receive",
        TranslationKey::Continue        => "Continue",
        TranslationKey::Back            => "Back",
        TranslationKey::Cancel          => "Cancel",
        TranslationKey::Save            => "Save",
        TranslationKey::Confirm         => "Confirm",
        TranslationKey::Loading         => "Loading...",
        TranslationKey::Error           => "Something went wrong",
        TranslationKey::Success         => "Success",
        TranslationKey::TryAgain        => "Try Again",
        TranslationKey::NetworkError    => "Network error. Check your connection.",
    }
}

// ── Xitsonga — first-class, culturally reviewed ────────────────────────────────
// TODO: complete review with native Tsonga teachers

fn ts(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "Amukelekile eka StockFair",
        TranslationKey::WelcomeTagline  => "Stokvel ya wena, endlela ya wena",
        TranslationKey::SignIn          => "Nghena",
        TranslationKey::SignUp          => "Tsarisa",
        TranslationKey::CreateAccount   => "Tumbuluxa Akhaunto",
        TranslationKey::PhoneNumber     => "Nomboro ya Foni",
        TranslationKey::Password        => "Phasiwedi",
        TranslationKey::ForgotPassword  => "U kandziyerile Phasiwedi?",
        TranslationKey::EnterOtp        => "Nghenisa Khodi",
        TranslationKey::OtpSentTo       => "Khodi i rhumeriwe eka",
        TranslationKey::Verify          => "Hlohlometa",
        TranslationKey::Resend          => "Rhumela Nakambe",
        TranslationKey::WelcomeBack     => "Amukelekile Nakambe",
        TranslationKey::TotalSavings    => "Malanga Hinkwawo",
        TranslationKey::NextPayout      => "Rihlawulo ra Riva",
        TranslationKey::ContributeNow   => "Pfumela Sweswi",
        TranslationKey::History         => "Matsalwa",
        TranslationKey::MyStokvels      => "Swistokvel Swanga",
        TranslationKey::ViewAll         => "Vona Hinkwaswo",
        TranslationKey::MyGroups        => "Swikambana Swanga",
        TranslationKey::CreateGroup     => "Tumbuluxa Nkambana",
        TranslationKey::JoinGroup       => "Nghena Nkambana",
        TranslationKey::Members         => "Vanhu va Nkambana",
        TranslationKey::Contributions   => "Swipfumelo",
        TranslationKey::GroupPot        => "Mbita ya Nkambana",
        TranslationKey::Payout          => "Rihlawulo",
        TranslationKey::Active          => "Ri Tirha",
        TranslationKey::Pending         => "Ri Languta",
        TranslationKey::Overdue         => "Ri Hundza Nkarhi",
        TranslationKey::Paid            => "Ri Hlawiwe",
        TranslationKey::Market          => "Maxavelo",
        TranslationKey::BulkDeals       => "Mitengo ya ku xava ngopfu eka stokvel ya wena",
        TranslationKey::PreOrder        => "Odela Ku Nga si Fika",
        TranslationKey::Partners        => "Valandzi",
        TranslationKey::SearchProducts  => "Lava swivulavulo...",
        TranslationKey::Discover        => "Kuma Vantshwa",
        TranslationKey::NearYou         => "Eswifanelekeni na Wena",
        TranslationKey::Featured        => "Swi Hlawuriwe",
        TranslationKey::TopPerformers   => "Swi Tirhisiwa Swinene",
        TranslationKey::Safest          => "Swi Hlayiseka Swinene",
        TranslationKey::RequestToJoin   => "Kombela ku Nghena",
        TranslationKey::Profile         => "Ndzawulo ya Wena",
        TranslationKey::FairScore       => "Ntlhelo wa Ku Tshembiwa",
        TranslationKey::Settings        => "Swileriso",
        TranslationKey::Language        => "Ririmi",
        TranslationKey::Theme           => "Nhluvuko",
        TranslationKey::SignOut         => "Huma",
        TranslationKey::Verified        => "Hlohlometeriwile",
        TranslationKey::NotVerified     => "A Hlohlometeriwanga",
        TranslationKey::Wallet          => "Saka ra Timali",
        TranslationKey::Balance         => "Ntsengo",
        TranslationKey::Deposit         => "Nghenisa Timali",
        TranslationKey::Withdraw        => "Huma na Timali",
        TranslationKey::Send            => "Rhumela",
        TranslationKey::Receive         => "Amukela",
        TranslationKey::Continue        => "Tlhelela Emahlweni",
        TranslationKey::Back            => "Tlhelela Ehansi",
        TranslationKey::Cancel          => "Yima",
        TranslationKey::Save            => "Hlayisa",
        TranslationKey::Confirm         => "Pfumela",
        TranslationKey::Loading         => "Ri Hlayisa...",
        TranslationKey::Error           => "Ku humile xiphiqo",
        TranslationKey::Success         => "Swi Humelele",
        TranslationKey::TryAgain        => "Ringeta Nakambe",
        TranslationKey::NetworkError    => "Xiphiqo xa inthanete. Tarisa vuxokoxoko bya wena.",
    }
}

// ── isiZulu ───────────────────────────────────────────────────────────────────
// TODO: native speaker review

fn zu(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "Wamukelekile ku StockFair",
        TranslationKey::WelcomeTagline  => "Istokveli sakho, ngendlela yakho",
        TranslationKey::SignIn          => "Ngena",
        TranslationKey::SignUp          => "Bhalisa",
        TranslationKey::CreateAccount   => "Dala i-Akhawunti",
        TranslationKey::PhoneNumber     => "Inombolo Yekheli",
        TranslationKey::Password        => "Iphasiwedi",
        TranslationKey::ForgotPassword  => "Ukhohlwe Iphasiwedi?",
        TranslationKey::EnterOtp        => "Faka Ikhodi",
        TranslationKey::OtpSentTo       => "Ikhodi ithunyelwe ku",
        TranslationKey::Verify          => "Qinisekisa",
        TranslationKey::Resend          => "Thumela Futhi",
        TranslationKey::WelcomeBack     => "Wamukelekile Futhi",
        TranslationKey::TotalSavings    => "Impela Yemali Egcinwe",
        TranslationKey::NextPayout      => "Inkokhelo Elandelayo",
        TranslationKey::ContributeNow   => "Faka Manje",
        TranslationKey::MyStokvels      => "Omastokveli Bami",
        TranslationKey::ViewAll         => "Bona Konke",
        TranslationKey::Active          => "Iyasebenza",
        TranslationKey::Pending         => "Ilindile",
        TranslationKey::Overdue         => "Idlulile Isikhathi",
        TranslationKey::Paid            => "Ikhokhiwe",
        TranslationKey::Market          => "Imakethe",
        TranslationKey::Discover        => "Thola",
        TranslationKey::Profile         => "Iphrofayili",
        TranslationKey::SignOut         => "Phuma",
        TranslationKey::Wallet          => "Isikhwama",
        TranslationKey::Continue        => "Qhubeka",
        TranslationKey::Back            => "Buyela",
        TranslationKey::NetworkError    => "Iphutha lenethiwekhi. Hlola uxhumano lwakho.",
        _ => en(key), // fallback for keys not yet translated
    }
}

// ── Sesotho ───────────────────────────────────────────────────────────────────
// TODO: native speaker review

fn st(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "O Amohelwa ho StockFair",
        TranslationKey::WelcomeTagline  => "Stokvel ya hao, tsela ya hao",
        TranslationKey::SignIn          => "Kena",
        TranslationKey::SignUp          => "Ngodisa",
        TranslationKey::ContributeNow   => "Tshela Jwale",
        TranslationKey::MyStokvels      => "Mastokvele a Ka",
        TranslationKey::Active          => "E Sebetsa",
        TranslationKey::Pending         => "E Emetse",
        TranslationKey::Paid            => "E Lefuoe",
        TranslationKey::SignOut         => "Tswa",
        TranslationKey::Continue        => "Tswela Pele",
        TranslationKey::Back            => "Kgutlela",
        TranslationKey::NetworkError    => "Phoso ya marang-rang. Hlahloba khokahano ya hao.",
        _ => en(key),
    }
}

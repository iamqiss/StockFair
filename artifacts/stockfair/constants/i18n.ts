export type Language = 
  | 'en'   // English
  | 'zu'   // Zulu
  | 'xh'   // Xhosa
  | 'af'   // Afrikaans
  | 'ns'   // Northern Sotho (Sepedi)
  | 'st'   // Southern Sotho (Sesotho)
  | 'tn'   // Tswana (Setswana)
  | 've'   // Venda (Tshivenda)
  | 'ts'   // Tsonga (Xitsonga)
  | 'ss'   // Swazi (siSwati)
  | 'nr';  // Ndebele (isiNdebele)

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  zu: 'isiZulu',
  xh: 'isiXhosa',
  af: 'Afrikaans',
  ns: 'Sepedi',
  st: 'Sesotho',
  tn: 'Setswana',
  ve: 'Tshivenda',
  ts: 'Xitsonga',
  ss: 'siSwati',
  nr: 'isiNdebele',
};

type TranslationKeys = {
  appName: string;
  tagline: string;
  home: string;
  groups: string;
  marketplace: string;
  transactions: string;
  profile: string;
  myGroups: string;
  createGroup: string;
  joinGroup: string;
  totalSavings: string;
  nextPayout: string;
  contributeNow: string;
  groupMembers: string;
  monthlyContribution: string;
  payoutSchedule: string;
  deals: string;
  partners: string;
  viewAll: string;
  addToCart: string;
  bulkDeals: string;
  groceries: string;
  confirmPayment: string;
  paymentSuccess: string;
  balance: string;
  send: string;
  receive: string;
  history: string;
  recentActivity: string;
  settings: string;
  language: string;
  notifications: string;
  security: string;
  help: string;
  logout: string;
  welcome: string;
  savings: string;
  members: string;
  payout: string;
  due: string;
  active: string;
  inactive: string;
  rotation: string;
  burial: string;
  investment: string;
  grocery: string;
  social: string;
  noGroups: string;
  createFirst: string;
  explore: string;
  featured: string;
  popular: string;
  new: string;
  perUnit: string;
  minOrder: string;
  addGroup: string;
  groupName: string;
  groupType: string;
  contributionAmount: string;
  frequency: string;
  monthly: string;
  weekly: string;
  biweekly: string;
  maxMembers: string;
  create: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  confirm: string;
  back: string;
  next: string;
  done: string;
  loading: string;
  error: string;
  retry: string;
  search: string;
  filter: string;
  sortBy: string;
  total: string;
  paid: string;
  pending: string;
  overdue: string;
  amount: string;
  date: string;
  description: string;
  category: string;
  allTime: string;
  thisMonth: string;
  thisWeek: string;
};

type Translations = Record<Language, TranslationKeys>;

export const translations: Translations = {
  en: {
    appName: 'StockFair',
    tagline: 'Save together, grow together',
    home: 'Home',
    groups: 'Groups',
    marketplace: 'Market',
    transactions: 'Money',
    profile: 'Profile',
    myGroups: 'My Stokvels',
    createGroup: 'Create Stokvel',
    joinGroup: 'Join Stokvel',
    totalSavings: 'Total Savings',
    nextPayout: 'Next Payout',
    contributeNow: 'Contribute Now',
    groupMembers: 'Members',
    monthlyContribution: 'Monthly Contribution',
    payoutSchedule: 'Payout Schedule',
    deals: 'Deals',
    partners: 'Partners',
    viewAll: 'View All',
    addToCart: 'Add to Cart',
    bulkDeals: 'Bulk Deals',
    groceries: 'Groceries',
    confirmPayment: 'Confirm Payment',
    paymentSuccess: 'Payment Successful',
    balance: 'Balance',
    send: 'Send',
    receive: 'Receive',
    history: 'History',
    recentActivity: 'Recent Activity',
    settings: 'Settings',
    language: 'Language',
    notifications: 'Notifications',
    security: 'Security',
    help: 'Help & Support',
    logout: 'Log Out',
    welcome: 'Welcome',
    savings: 'Savings',
    members: 'Members',
    payout: 'Payout',
    due: 'Due',
    active: 'Active',
    inactive: 'Inactive',
    rotation: 'Rotating',
    burial: 'Burial Society',
    investment: 'Investment',
    grocery: 'Grocery',
    social: 'Social',
    noGroups: 'No stokvels yet',
    createFirst: 'Create your first stokvel',
    explore: 'Explore',
    featured: 'Featured',
    popular: 'Popular',
    new: 'New',
    perUnit: 'per unit',
    minOrder: 'Min. order',
    addGroup: 'Add Group',
    groupName: 'Group Name',
    groupType: 'Group Type',
    contributionAmount: 'Contribution Amount',
    frequency: 'Frequency',
    monthly: 'Monthly',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    maxMembers: 'Max Members',
    create: 'Create',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
    search: 'Search',
    filter: 'Filter',
    sortBy: 'Sort By',
    total: 'Total',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    amount: 'Amount',
    date: 'Date',
    description: 'Description',
    category: 'Category',
    allTime: 'All Time',
    thisMonth: 'This Month',
    thisWeek: 'This Week',
  },
  zu: {
    appName: 'StockFair',
    tagline: 'Gcina ndawonye, khula ndawonye',
    home: 'Ikhaya',
    groups: 'Amaqembu',
    marketplace: 'Imakethe',
    transactions: 'Imali',
    profile: 'Iphrofayeli',
    myGroups: 'Amastokveli ami',
    createGroup: 'Yenza Istokveli',
    joinGroup: 'Joyina Istokveli',
    totalSavings: 'Imali Yonke Egciniwe',
    nextPayout: 'Inkokhelo Elandelayo',
    contributeNow: 'Faka Imali',
    groupMembers: 'Amalungu',
    monthlyContribution: 'Iminikelo Yanyanga Zonke',
    payoutSchedule: 'Uhlelo Lwezinkokhelo',
    deals: 'Izivumelwano',
    partners: 'Abangani',
    viewAll: 'Bona Konke',
    addToCart: 'Faka Ekhathini',
    bulkDeals: 'Izivumelwano Ezinkulu',
    groceries: 'Ukudla',
    confirmPayment: 'Qinisekisa Inkokhelo',
    paymentSuccess: 'Inkokhelo Iphumelele',
    balance: 'Ibhalansi',
    send: 'Thumela',
    receive: 'Yamukela',
    history: 'Umlando',
    recentActivity: 'Umsebenzi Wakamuva',
    settings: 'Izilungiselelo',
    language: 'Ulimi',
    notifications: 'Izaziso',
    security: 'Ukuphepha',
    help: 'Usizo',
    logout: 'Phuma',
    welcome: 'Wamukelekile',
    savings: 'Imali Egciniwe',
    members: 'Amalungu',
    payout: 'Inkokhelo',
    due: 'Esifanele',
    active: 'Iyasebenza',
    inactive: 'Ayisebenzi',
    rotation: 'Ukuphenduka',
    burial: 'Umngcwabo',
    investment: 'Ukutshalwa Kwemali',
    grocery: 'Ukudla',
    social: 'Inhlalo',
    noGroups: 'Awekho amastokveli',
    createFirst: 'Yenza istokveli sakho sokuqala',
    explore: 'Hlola',
    featured: 'Okukhethiwe',
    popular: 'Okudumile',
    new: 'Okusha',
    perUnit: 'ngesinye',
    minOrder: 'I-odha encane kakhulu',
    addGroup: 'Engeza Iqembu',
    groupName: 'Igama Leqembu',
    groupType: 'Uhlobo Lweqembu',
    contributionAmount: 'Inani Lomnikelo',
    frequency: 'Ukuvamile',
    monthly: 'Nyanga zonke',
    weekly: 'Eviki lonke',
    biweekly: 'Kabili Ngeviki',
    maxMembers: 'Amalungu Amaningi Kakhulu',
    create: 'Yenza',
    cancel: 'Khansela',
    save: 'Gcina',
    edit: 'Hlela',
    delete: 'Susa',
    confirm: 'Qinisekisa',
    back: 'Emuva',
    next: 'Okulandelayo',
    done: 'Kuqedile',
    loading: 'Iyalayisha...',
    error: 'Kukhona iphutha',
    retry: 'Zama futhi',
    search: 'Sesha',
    filter: 'Hlunga',
    sortBy: 'Hlela Nge',
    total: 'Isamba',
    paid: 'Okukhokhelwe',
    pending: 'Okulindile',
    overdue: 'Edlulile',
    amount: 'Inani',
    date: 'Usuku',
    description: 'Incazelo',
    category: 'Isigaba',
    allTime: 'Isikhathi Sonke',
    thisMonth: 'Le Nyanga',
    thisWeek: 'Leli Viki',
  },
  xh: {
    appName: 'StockFair',
    tagline: 'Gcina ndawonye, khula ndawonye',
    home: 'Ekhaya',
    groups: 'Amaqela',
    marketplace: 'Imakethe',
    transactions: 'Imali',
    profile: 'Iprofayili',
    myGroups: 'Iistokveli Zam',
    createGroup: 'Yenza Istokveli',
    joinGroup: 'Joyina Istokveli',
    totalSavings: 'Imali Yonke Egciniweyo',
    nextPayout: 'Intlawulo Elandelayo',
    contributeNow: 'Nikela Ngoku',
    groupMembers: 'Amalungu',
    monthlyContribution: 'Inikelo Lenyanga Zonke',
    payoutSchedule: 'Ishedyuli Yeentlawulo',
    deals: 'Izivumelwano',
    partners: 'Abadibani',
    viewAll: 'Jonga Konke',
    addToCart: 'Yongeza Kwi-Cart',
    bulkDeals: 'Izivumelwano Ezinkulu',
    groceries: 'Ukutya',
    confirmPayment: 'Qinisekisa Intlawulo',
    paymentSuccess: 'Intlawulo Iphumelele',
    balance: 'Ibhalansi',
    send: 'Thumela',
    receive: 'Yamkela',
    history: 'Imbali',
    recentActivity: 'Umsebenzi Wakamatsha',
    settings: 'Izicwangciso',
    language: 'Ulwimi',
    notifications: 'Izaziso',
    security: 'Ukhuseleko',
    help: 'Uncedo',
    logout: 'Phuma',
    welcome: 'Wamkelekile',
    savings: 'Imali Egciniweyo',
    members: 'Amalungu',
    payout: 'Intlawulo',
    due: 'Efunekayo',
    active: 'Iyasebenza',
    inactive: 'Ayisebezi',
    rotation: 'Ukujikeleza',
    burial: 'Umngcwabo',
    investment: 'Utyalo Lwemali',
    grocery: 'Ukutya',
    social: 'Inhlalo',
    noGroups: 'Azikho iistokveli',
    createFirst: 'Yenza istokveli sakho sokuqala',
    explore: 'Phanda',
    featured: 'Ekhethiweyo',
    popular: 'Edumileyo',
    new: 'Entsha',
    perUnit: 'ngesinye',
    minOrder: 'I-odha encinci',
    addGroup: 'Yongeza Iqela',
    groupName: 'Igama Leqela',
    groupType: 'Uhlobo Lweqela',
    contributionAmount: 'Inani Lwenikelo',
    frequency: 'Rhoqo',
    monthly: 'Nyanga zonke',
    weekly: 'Iveki yonke',
    biweekly: 'Kabini Ngenyanga',
    maxMembers: 'Amalungu Amaninzi',
    create: 'Yenza',
    cancel: 'Rhoxisa',
    save: 'Gcina',
    edit: 'Hlela',
    delete: 'Cima',
    confirm: 'Qinisekisa',
    back: 'Emuva',
    next: 'Okulandelayo',
    done: 'Kuphela',
    loading: 'Iyalayisha...',
    error: 'Kukhona impazamo',
    retry: 'Zama kwakhona',
    search: 'Khangela',
    filter: 'Hlela',
    sortBy: 'Hlela Nge',
    total: 'Isibalo Sonke',
    paid: 'Ehlawuliweyo',
    pending: 'Elindileyo',
    overdue: 'Elidlulileyo',
    amount: 'Inani',
    date: 'Umhla',
    description: 'Inkcazelo',
    category: 'Udidi',
    allTime: 'Lonke Ixesha',
    thisMonth: 'Le Nyanga',
    thisWeek: 'Le Veki',
  },
  af: {
    appName: 'StockFair',
    tagline: 'Spaar saam, groei saam',
    home: 'Tuis',
    groups: 'Groepe',
    marketplace: 'Mark',
    transactions: 'Geld',
    profile: 'Profiel',
    myGroups: 'My Stokvels',
    createGroup: 'Skep Stokvel',
    joinGroup: 'Sluit aan by Stokvel',
    totalSavings: 'Totale Spaargeld',
    nextPayout: 'Volgende Uitbetaling',
    contributeNow: 'Dra by',
    groupMembers: 'Lede',
    monthlyContribution: 'Maandelikse Bydrae',
    payoutSchedule: 'Uitbetalingskedule',
    deals: 'Aanbiedings',
    partners: 'Vennote',
    viewAll: 'Sien Alles',
    addToCart: 'Voeg by Mandjie',
    bulkDeals: 'Grootmaat-aanbiedings',
    groceries: 'Kruideniersware',
    confirmPayment: 'Bevestig Betaling',
    paymentSuccess: 'Betaling Suksesvol',
    balance: 'Balans',
    send: 'Stuur',
    receive: 'Ontvang',
    history: 'Geskiedenis',
    recentActivity: 'Onlangse Aktiwiteit',
    settings: 'Instellings',
    language: 'Taal',
    notifications: 'Kennisgewings',
    security: 'Sekuriteit',
    help: 'Hulp',
    logout: 'Meld Af',
    welcome: 'Welkom',
    savings: 'Spaargeld',
    members: 'Lede',
    payout: 'Uitbetaling',
    due: 'Verskuldig',
    active: 'Aktief',
    inactive: 'Onaktief',
    rotation: 'Rotasie',
    burial: 'Begrafnisvereniging',
    investment: 'Belegging',
    grocery: 'Kruideniersware',
    social: 'Sosiaal',
    noGroups: 'Geen stokvels nie',
    createFirst: 'Skep jou eerste stokvel',
    explore: 'Verken',
    featured: 'Uitgelig',
    popular: 'Gewild',
    new: 'Nuut',
    perUnit: 'per eenheid',
    minOrder: 'Min. bestelling',
    addGroup: 'Voeg Groep By',
    groupName: 'Groepnaam',
    groupType: 'Groeptipe',
    contributionAmount: 'Bydraebedrag',
    frequency: 'Frekwensie',
    monthly: 'Maandeliks',
    weekly: 'Weekliks',
    biweekly: 'Tweeweekliks',
    maxMembers: 'Maks Lede',
    create: 'Skep',
    cancel: 'Kanselleer',
    save: 'Stoor',
    edit: 'Wysig',
    delete: 'Verwyder',
    confirm: 'Bevestig',
    back: 'Terug',
    next: 'Volgende',
    done: 'Klaar',
    loading: 'Laai...',
    error: 'Iets het verkeerd geloop',
    retry: 'Probeer weer',
    search: 'Soek',
    filter: 'Filter',
    sortBy: 'Sorteer op',
    total: 'Totaal',
    paid: 'Betaal',
    pending: 'Hangende',
    overdue: 'Agterstallig',
    amount: 'Bedrag',
    date: 'Datum',
    description: 'Beskrywing',
    category: 'Kategorie',
    allTime: 'Altyd',
    thisMonth: 'Hierdie Maand',
    thisWeek: 'Hierdie Week',
  },
  ns: { appName: 'StockFair', tagline: 'Boloka mmogo, gola mmogo', home: 'Gae', groups: 'Mekgatlo', marketplace: 'Mmaraka', transactions: 'Tšhelete', profile: 'Profaele', myGroups: 'Mastokvele Aga', createGroup: 'Theola Stokvel', joinGroup: 'Tsena Stokvel', totalSavings: 'Palomoka ya Poloko', nextPayout: 'Tefelo ye e Latelago', contributeNow: 'Neela Bjale', groupMembers: 'Maloko', monthlyContribution: 'Monyenyo wa Kgwedi', payoutSchedule: 'Leano la Tefelo', deals: 'Ditumelano', partners: 'Bagwebi', viewAll: 'Bona Kamoka', addToCart: 'Kenya Karoteng', bulkDeals: 'Ditumelano tše Kgolo', groceries: 'Dijo', confirmPayment: 'Netefatša Tefelo', paymentSuccess: 'Tefelo e Atlehile', balance: 'Tekatekano', send: 'Romela', receive: 'Amogela', history: 'Histori', recentActivity: 'Mošomo wa Bjale', settings: 'Dipeakanyo', language: 'Polelo', notifications: 'Dikenywa', security: 'Tšhireletšo', help: 'Thušo', logout: 'Tswa', welcome: 'Amogela', savings: 'Poloko', members: 'Maloko', payout: 'Tefelo', due: 'E swanetšego', active: 'E šomago', inactive: 'E sa šomego', rotation: 'Phetošo', burial: 'Mokgatlho wa Poloko', investment: 'Katišo ya Tšhelete', grocery: 'Dijo', social: 'Setšhaba', noGroups: 'Ga go na mastokvele', createFirst: 'Theola stokvel ya gago ya mathomo', explore: 'Hlwa', featured: 'E Khethilwego', popular: 'E Tumilego', new: 'Ye mpsha', perUnit: 'ka unit', minOrder: 'Taelo ye nnyane', addGroup: 'Oketša Mokgatlo', groupName: 'Leina la Mokgatlo', groupType: 'Mohuta wa Mokgatlo', contributionAmount: 'Palalo ya Monyenyo', frequency: 'Khafetšo', monthly: 'Kgwedi le Kgwedi', weekly: 'Beke le Beke', biweekly: 'Gabedi ka Kgwedi', maxMembers: 'Maloko a Mengwe', create: 'Theola', cancel: 'Khansela', save: 'Boloka', edit: 'Rulaganya', delete: 'Phumula', confirm: 'Netefatša', back: 'Morao', next: 'E Latelago', done: 'Phethagaletše', loading: 'E laela...', error: 'Go na le phošo', retry: 'Leka gape', search: 'Nyaka', filter: 'Hlaola', sortBy: 'Rulaganya Ka', total: 'Kakaretšo', paid: 'E Duetšwego', pending: 'E Letetšwego', overdue: 'E Fetilego', amount: 'Palalo', date: 'Letšatši', description: 'Tlhalošo', category: 'Mokgoba', allTime: 'Nako Yohle', thisMonth: 'Kgwedi ye', thisWeek: 'Beke ye' },
  st: { appName: 'StockFair', tagline: 'Boloka mmogo, hola mmogo', home: 'Hae', groups: 'Mekgatlo', marketplace: 'Mmaraka', transactions: 'Tjhelete', profile: 'Profaele', myGroups: 'Mastokvele Aka', createGroup: 'Theha Stokvel', joinGroup: 'Kena Stokvel', totalSavings: 'Kakaretso ya Poloko', nextPayout: 'Tefo e Latelang', contributeNow: 'Fana Jwale', groupMembers: 'Maloko', monthlyContribution: 'Monyetla wa Kgwedi', payoutSchedule: 'Lenaneo la Tefo', deals: 'Tumellano', partners: 'Baramanye', viewAll: 'Bona Hosohle', addToCart: 'Kenya Karoteng', bulkDeals: 'Tumellano tse Kholo', groceries: 'Dijo', confirmPayment: 'Netefatsa Tefo', paymentSuccess: 'Tefo e Atlehile', balance: 'Tekatekano', send: 'Romela', receive: 'Amohela', history: 'Histori', recentActivity: 'Mesebetsi ya Hajoale', settings: 'Dipeakanyo', language: 'Puo', notifications: 'Dikenywa', security: 'Tshireletso', help: 'Thuso', logout: 'Tswa', welcome: 'Amohetswe', savings: 'Poloko', members: 'Maloko', payout: 'Tefo', due: 'e Hlokahalang', active: 'e Sebetsang', inactive: 'e sa Sebetseng', rotation: 'Phetoho', burial: 'Mokgatlo wa Poloko', investment: 'Katiso ya Tjhelete', grocery: 'Dijo', social: 'Sechaba', noGroups: 'Ha ho mastokvele', createFirst: 'Theha stokvel ya hao ya pele', explore: 'Lekola', featured: 'e Khethilweng', popular: 'e Tumileng', new: 'e Ntjha', perUnit: 'ka unit', minOrder: 'Taelo e nyane', addGroup: 'Kenya Mokgatlo', groupName: 'Lebitso la Mokgatlo', groupType: 'Mofuta wa Mokgatlo', contributionAmount: 'Palo ya Monyetla', frequency: 'Khafetso', monthly: 'Kgwedi le Kgwedi', weekly: 'Beke le Beke', biweekly: 'Habedi ka Kgwedi', maxMembers: 'Maloko a Mangwe', create: 'Theha', cancel: 'Khansela', save: 'Boloka', edit: 'Hlophisa', delete: 'Hlakola', confirm: 'Netefatsa', back: 'Morao', next: 'e Latelang', done: 'Phethahetswe', loading: 'e Laelwa...', error: 'Ho na le phoso', retry: 'Leka hape', search: 'Batlisisa', filter: 'Hlaola', sortBy: 'Hlophisa Ka', total: 'Kakaretso', paid: 'e Duetsweng', pending: 'e Letetsweng', overdue: 'e Fetileng', amount: 'Palo', date: 'Letsatsi', description: 'Tlhaloso', category: 'Mokgoba', allTime: 'Nako Yohle', thisMonth: 'Kgwedi ena', thisWeek: 'Beke ena' },
  tn: { appName: 'StockFair', tagline: 'Boloka mmogo, gola mmogo', home: 'Gae', groups: 'Mekgatlho', marketplace: 'Mmaraka', transactions: 'Madi', profile: 'Profaele', myGroups: 'Mastokvele Ame', createGroup: 'Theia Stokvel', joinGroup: 'Tsena Stokvel', totalSavings: 'Palomoka ya Poloko', nextPayout: 'Tuelo e Latelang', contributeNow: 'Naya Jaanong', groupMembers: 'Maloko', monthlyContribution: 'Moneelo wa Kgwedi', payoutSchedule: 'Lenaneo la Tuelo', deals: 'Dithumelano', partners: 'Badirathirisano', viewAll: 'Bona Gotlhe', addToCart: 'Tsenya mo Karoteng', bulkDeals: 'Dithumelano tse Dikgolo', groceries: 'Dijo', confirmPayment: 'Netefatsa Tuelo', paymentSuccess: 'Tuelo e Atlehile', balance: 'Tekatekano', send: 'Romela', receive: 'Amogela', history: 'Histori', recentActivity: 'Mošomo wa Jaanong', settings: 'Dipeakanyo', language: 'Puo', notifications: 'Dikenywa', security: 'Tshireletso', help: 'Thuso', logout: 'Tswa', welcome: 'Amogetswe', savings: 'Poloko', members: 'Maloko', payout: 'Tuelo', due: 'e Tlhokegang', active: 'e Dirwang', inactive: 'e sa Dirweng', rotation: 'Phetogo', burial: 'Mokgatlho wa Poloko', investment: 'Katiso ya Madi', grocery: 'Dijo', social: 'Sechaba', noGroups: 'Ga go na mastokvele', createFirst: 'Theia stokvel ya gago ya ntlha', explore: 'Tlhatlhoba', featured: 'e Khethilweng', popular: 'e Tumileng', new: 'e Ntsha', perUnit: 'ka unit', minOrder: 'Taelo e nnyane', addGroup: 'Tlhomamisa Mokgatlho', groupName: 'Leina la Mokgatlho', groupType: 'Mofuta wa Mokgatlho', contributionAmount: 'Palalo ya Moneelo', frequency: 'Khafetso', monthly: 'Kgwedi le Kgwedi', weekly: 'Beke le Beke', biweekly: 'Gabedi ka Kgwedi', maxMembers: 'Maloko a Mantsi', create: 'Theia', cancel: 'Khansela', save: 'Boloka', edit: 'Rulaganya', delete: 'Phimola', confirm: 'Netefatsa', back: 'Morago', next: 'e Latelang', done: 'Phethogile', loading: 'e Laelwa...', error: 'Go na le phoso', retry: 'Leka gape', search: 'Batlisa', filter: 'Hlaola', sortBy: 'Rulaganya Ka', total: 'Kakaretso', paid: 'e Duetsweng', pending: 'e Emetse', overdue: 'e Fitlheletswe', amount: 'Palalo', date: 'Letsatsi', description: 'Tlhaloso', category: 'Mokgoba', allTime: 'Nako Yotlhe', thisMonth: 'Kgwedi eno', thisWeek: 'Beke eno' },
  ve: { appName: 'StockFair', tagline: 'Boloka vhukati, kula vhukati', home: 'Hayani', groups: 'Madzangano', marketplace: 'Mashaambelo', transactions: 'Tshelede', profile: 'Profaele', myGroups: 'Mastokvele Anga', createGroup: 'Bumba Stokvel', joinGroup: 'Dzhena Stokvel', totalSavings: 'Palomoka ya u Vhofholela', nextPayout: 'Mbadelo i tevhelaho', contributeNow: 'Ipa Zvino', groupMembers: 'Lushaka', monthlyContribution: 'Mbadelo ya Nwedzi Wone Wone', payoutSchedule: 'Ndinganyiso ya Mbadelo', deals: 'Zwipereka', partners: 'Vhabereki', viewAll: 'Vhona Zwose', addToCart: 'Isela Karoteni', bulkDeals: 'Zwipereka Zwinzhi', groceries: 'Zwiliwa', confirmPayment: 'Khwinifhadza Mbadelo', paymentSuccess: 'Mbadelo yo Atelela', balance: 'Tekatekano', send: 'Romela', receive: 'Amukela', history: 'Histori', recentActivity: 'Mishumo ya Zwino', settings: 'Nzudzanyo', language: 'Luambo', notifications: 'Zwidivhadzo', security: 'Vhulamuludzi', help: 'Thuso', logout: 'Bva', welcome: 'Ṱoḓea', savings: 'u Vhofholela', members: 'Lushaka', payout: 'Mbadelo', due: 'yo Humbulaho', active: 'yo Shuma', inactive: 'i sa Shumi', rotation: 'u Phinduladza', burial: 'Murado wa Poloko', investment: 'u Ima Tshelede', grocery: 'Zwiliwa', social: 'Vhutshilo', noGroups: 'A huna mastokvele', createFirst: 'Bumba stokvel yau ya u thoma', explore: 'Sedza', featured: 'yo Nangwa', popular: 'yo Takuwa', new: 'Nthihi', perUnit: 'kha unit', minOrder: 'Odara dzo thotiwa', addGroup: 'Engedza Murado', groupName: 'Dzina la Murada', groupType: 'Mufuda wa Murada', contributionAmount: 'Palalo ya Mbadelo', frequency: 'Nga Phindano', monthly: 'Nwedzi Wone Wone', weekly: 'Vhege Yone Yone', biweekly: 'Kavhili nga Nwedzi', maxMembers: 'Lushaka Lwinzhi', create: 'Bumba', cancel: 'Khansela', save: 'Vhofholela', edit: 'Dzudzanya', delete: 'Fufha', confirm: 'Khwinifhadza', back: 'Murahu', next: 'i Tevhelaho', done: 'Yo Fhelela', loading: 'i Laelwa...', error: 'Hu na phosho', retry: 'Linga hafhu', search: 'Kanda', filter: 'Hlaola', sortBy: 'Dzudzanya Ka', total: 'Palomoka', paid: 'yo Badiliswa', pending: 'yo Lindela', overdue: 'yo Fhirela', amount: 'Palalo', date: 'Datumu', description: 'Ṱhaluso', category: 'Klassi', allTime: 'Tshifhinga Thoṱhe', thisMonth: 'Nwedzi Uyu', thisWeek: 'Vhege Iyi' },
  ts: { appName: 'StockFair', tagline: 'Hlayisa hi wun\'we, kula hi wun\'we', home: 'Kaya', groups: 'Mirho', marketplace: 'Ntlawa wa Xikwama', transactions: 'Timali', profile: 'Profayili', myGroups: 'Mastokvele ya Mina', createGroup: 'Tumbuluxa Stokvel', joinGroup: 'Nghena Stokvel', totalSavings: 'Palomoka ya Ku Hlayisa', nextPayout: 'Rihlawulo Lerikumaka', contributeNow: 'Nyika Sweswi', groupMembers: 'Vulanguta', monthlyContribution: 'Nkanelo wa Ximundzuku', payoutSchedule: 'Xedule xa Rihlawulo', deals: 'Xivumelwano', partners: 'Vaxamali', viewAll: 'Vona Hinkwaxo', addToCart: 'Engetela eka Karata', bulkDeals: 'Xivumelwano Lexikulu', groceries: 'Swakudya', confirmPayment: 'Xiyisisa Rihlawulo', paymentSuccess: 'Rihlawulo ri Atselile', balance: 'Tekatekano', send: 'Rhumela', receive: 'Amukela', history: 'Histori', recentActivity: 'Misirha ya Sweswi', settings: 'Nkanelo', language: 'Ririmi', notifications: 'Swiviso', security: 'Vulamulavulami', help: 'Nhluvuko', logout: 'Huma', welcome: 'Amukeriwa', savings: 'Ku Hlayisa', members: 'Vulanguta', payout: 'Rihlawulo', due: 'Lerifunekaka', active: 'Leri Tirhaka', inactive: 'Leri nga Tirhiki', rotation: 'Ku Hlamuseriwana', burial: 'Mirho wa Ku Hlayisa', investment: 'Ku Byela Timali', grocery: 'Swakudya', social: 'Ndhawu ya Vanhu', noGroups: 'Ku na mastokvele', createFirst: 'Tumbuluxa stokvel ya wena ya swa khale', explore: 'Lavisisa', featured: 'Leri Hlawuriweke', popular: 'Leri Tivekaka', new: 'Ritswa', perUnit: 'hi unit', minOrder: 'Xibumabumelo lexi Fikelaka', addGroup: 'Engetela Mirho', groupName: 'Vito ra Mirho', groupType: 'Mhaka wa Mirho', contributionAmount: 'Nhlayo ya Nkanelo', frequency: 'Khafetiso', monthly: 'Ximundzuku na Ximundzuku', weekly: 'Civivi na Civivi', biweekly: 'Kaviri hi Ximundzuku', maxMembers: 'Vulanguta Levikulu', create: 'Tumbuluxa', cancel: 'Khansela', save: 'Hlayisa', edit: 'Lungisa', delete: 'Susa', confirm: 'Xiyisisa', back: 'Endzhaku', next: 'Lerikumaka', done: 'Ku Herile', loading: 'Ku Layisha...', error: 'Ku na xiphiqo', retry: 'Ringeta Nakambe', search: 'Lava', filter: 'Hlaola', sortBy: 'Hlela Ka', total: 'Palomoka', paid: 'Leri Hlamuseriweke', pending: 'Leri Rindzeleke', overdue: 'Leri Dlulereke', amount: 'Nhlayo', date: 'Siku', description: 'Tshivumbiwa', category: 'Ndzawulo', allTime: 'Nkarhi Hinkwawo', thisMonth: 'Ximundzuku Lexi', thisWeek: 'Civivi Lexi' },
  ss: { appName: 'StockFair', tagline: 'Gcina ndvawonye, khula ndvawonye', home: 'Ekhaya', groups: 'Emaqembu', marketplace: 'Imakethe', transactions: 'Imali', profile: 'Iphrofayili', myGroups: 'Emastokveli Ami', createGroup: 'Yenta Stokvel', joinGroup: 'Joyina Stokvel', totalSavings: 'Imali Yonkhe Legciniwe', nextPayout: 'Inkokhelo Yekucala', contributeNow: 'Faka Imali', groupMembers: 'Emalungu', monthlyContribution: 'Umnikelo Wenyanga', payoutSchedule: 'Luhlu Lwenkokhelo', deals: 'Tivumelwano', partners: 'Labashiyanako', viewAll: 'Bona Konkhe', addToCart: 'Faka Ekhathini', bulkDeals: 'Tivumelwano Letinkhulu', groceries: 'Kudla', confirmPayment: 'Qinisekisa Inkokhelo', paymentSuccess: 'Inkokhelo Iphumelele', balance: 'Sibalo', send: 'Thumela', receive: 'Yamukela', history: 'Umlandvo', recentActivity: 'Umsebenzi Wakamuva', settings: 'Tilungiselelo', language: 'Lulwimi', notifications: 'Tisaziso', security: 'Tiphephelo', help: 'Lusito', logout: 'Phuma', welcome: 'Wamukelekile', savings: 'Imali Legciniwe', members: 'Emalungu', payout: 'Inkokhelo', due: 'Lefunekako', active: 'Iyasebenta', inactive: 'Ayisebenti', rotation: 'Ukuphendvuka', burial: 'Inhlangano Yangomngcwabo', investment: 'Ukutshalwa Kwemali', grocery: 'Kudla', social: 'Inhlalo', noGroups: 'Awekho emastokveli', createFirst: 'Yenta stokvel yakho sekucala', explore: 'Phenyela', featured: 'Lekhethiwe', popular: 'Lodvumile', new: 'Lomusha', perUnit: 'ngesinye', minOrder: 'Umtsetfo Lomncane', addGroup: 'Engeta Iqembu', groupName: 'Ligama Leqembu', groupType: 'Uhlobo Lweqembu', contributionAmount: 'Inani Lomnikelo', frequency: 'Imikhakha', monthly: 'Nyanga Yonkhe', weekly: 'Emavikini Onkhe', biweekly: 'Kabili Ngenyanga', maxMembers: 'Emalungu Lamaningi', create: 'Yenta', cancel: 'Khansela', save: 'Gcina', edit: 'Lungisa', delete: 'Susa', confirm: 'Qinisekisa', back: 'Emuva', next: 'Lokulandzela', done: 'Kuphele', loading: 'Iyalayisha...', error: 'Kukhona iphutha', retry: 'Zama futsi', search: 'Funa', filter: 'Hlunga', sortBy: 'Hlela Nge', total: 'Sibalo Sonkhe', paid: 'Lekhokhelwe', pending: 'Lelindile', overdue: 'Ledluliwe', amount: 'Inani', date: 'Lusuku', description: 'Incazelo', category: 'Isigaba', allTime: 'Sikhati Sonkhe', thisMonth: 'Le Nyanga', thisWeek: 'Leli Viki' },
  nr: { appName: 'StockFair', tagline: 'Londoloza ndawonye, khula ndawonye', home: 'Ekhaya', groups: 'Amaqembu', marketplace: 'Imakethe', transactions: 'Imali', profile: 'Iphrofayeli', myGroups: 'Amastokveli ami', createGroup: 'Yenza Istokveli', joinGroup: 'Joyina Istokveli', totalSavings: 'Imali Yonke Egciniweko', nextPayout: 'Inkokhelo Elandelako', contributeNow: 'Faka Imali', groupMembers: 'Amalungu', monthlyContribution: 'Umnikelo Wenyanga', payoutSchedule: 'Isheduli Yenkokhelo', deals: 'Izivumelwano', partners: 'Abalingani', viewAll: 'Bona Konke', addToCart: 'Faka Ekhathini', bulkDeals: 'Izivumelwano Ezikulu', groceries: 'Ukudla', confirmPayment: 'Qinisekisa Inkokhelo', paymentSuccess: 'Inkokhelo Iphumelele', balance: 'Ibhalansi', send: 'Thumela', receive: 'Yamukela', history: 'Umlando', recentActivity: 'Umsebenzi Wakamuva', settings: 'Izilungiselelo', language: 'Ulimi', notifications: 'Izaziso', security: 'Ukuphepha', help: 'Usizo', logout: 'Phuma', welcome: 'Wamukelekile', savings: 'Imali Egciniweko', members: 'Amalungu', payout: 'Inkokhelo', due: 'Esifaneleko', active: 'Iyasebenza', inactive: 'Ayisebezi', rotation: 'Ukuphenduka', burial: 'Umngcwabo', investment: 'Ukutshalwa Kwemali', grocery: 'Ukudla', social: 'Inhlalo', noGroups: 'Awekho amastokveli', createFirst: 'Yenza istokveli sakho sokuqala', explore: 'Hlola', featured: 'Ekhethiwe', popular: 'Edumile', new: 'Okusha', perUnit: 'ngesinye', minOrder: 'I-odha Encane', addGroup: 'Engeza Iqembu', groupName: 'Igama Leqembu', groupType: 'Uhlobo Lweqembu', contributionAmount: 'Inani Lomnikelo', frequency: 'Ukuvama', monthly: 'Nyanga Zonke', weekly: 'Eviki Lonke', biweekly: 'Kabili Ngeviki', maxMembers: 'Amalungu Amaningi', create: 'Yenza', cancel: 'Khansela', save: 'Londoloza', edit: 'Hlela', delete: 'Susa', confirm: 'Qinisekisa', back: 'Emuva', next: 'Okulandelako', done: 'Kuphela', loading: 'Iyalayisha...', error: 'Kukhona iphutha', retry: 'Zama futhi', search: 'Sesha', filter: 'Hlunga', sortBy: 'Hlela Nge', total: 'Isamba', paid: 'Okukhokhelwe', pending: 'Okulindile', overdue: 'Edlulile', amount: 'Inani', date: 'Usuku', description: 'Incazelo', category: 'Isigaba', allTime: 'Isikhathi Sonke', thisMonth: 'Le Nyanga', thisWeek: 'Leli Viki' },
};

export function t(lang: Language, key: keyof TranslationKeys): string {
  return translations[lang]?.[key] ?? translations['en'][key] ?? key;
}

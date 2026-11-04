// Words that can't be posted in comments, grouped by language. Matching
// (src/lib/moderation.js) ignores case and accents, common look-alike
// characters (@ → a, 0 → o, $ → s …), stretched letters ("fuuuck"), masked
// letters ("f**k") and the usual English endings (-s, -ing, -er …), but only
// matches whole words, so "class" or "assistant" are fine.
//
// To add a word: put it in lowercase under its language, in whatever script
// people actually type it — native script and romanized spellings are both
// needed (e.g. 'లంజ' and 'lanja'). To add a language, add a new key.
//
// Everyday words people use about themselves ("I felt so stupid") are left
// out on purpose, so nobody is blocked or suspended for describing her pain.
// Have a native speaker review each language before launch.
export const curseWordsByLanguage = {
  english: [
    'fuck', 'fck', 'fuk', 'motherfucker', 'shit', 'shitty', 'bullshit', 'bitch',
    'bastard', 'ass', 'asshole', 'arse', 'arsehole', 'dick', 'dickhead', 'cock',
    'pussy', 'cunt', 'twat', 'wanker', 'bollocks', 'goddamn', 'slut', 'whore',
    'skank', 'douche', 'douchebag', 'jackass', 'dumbass', 'retard', 'retarded',
    'stfu', 'kys','wtf',
  ],
  telugu: [
    'lanja', 'lanjakodaka', 'lanjadana', 'dengu', 'dengey', 'dengutha', 'puku',
    'pooku', 'modda', 'gudda', 'gudha', 'erripuka', 'erripuku', 'nee amma',
    'nee yamma', 'kojja', 'sulli',
    'లంజ', 'లంజకొడకా', 'లంజదాన', 'దెంగు', 'దెంగెయ్', 'పూకు', 'మొడ్డ', 'గుద్ద',
    'ఎర్రిపూకు', 'కొజ్జా', 'సుల్లి',
  ],
  hindi: [
    'chutiya', 'chutiye', 'chut', 'madarchod', 'maderchod', 'behenchod',
    'bhenchod', 'bhosdike', 'bhosdi', 'bhosda', 'gaandu', 'gandu', 'gaand',
    'harami', 'haramzada', 'haramzadi', 'kutta', 'kutti', 'kutiya', 'kamina',
    'kamini', 'randi', 'lauda', 'lavda', 'lund', 'tatti',
    'चूतिया', 'चुतिया', 'चूत', 'मादरचोद', 'बहनचोद', 'भेनचोद', 'भोसडीके', 'भोसड़ा',
    'गांडू', 'गांड', 'हरामी', 'हरामज़ादा', 'हरामजादी', 'कुत्ती', 'कुतिया', 'कमीना',
    'कमीनी', 'रंडी', 'लौड़ा', 'लंड',
  ],
  tamil: [
    'punda', 'pundai', 'thevidiya', 'thevdiya', 'otha', 'oombu', 'sunni', 'koothi',
    'பூண்டை', 'புண்டை', 'தேவடியா', 'ஓத்தா', 'ஊம்பு', 'சுன்னி', 'கூதி',
  ],
  kannada: [
    'soole', 'sule', 'bolimaga', 'boli maga', 'tullu', 'thullu', 'gandu',
    'ಸೂಳೆ', 'ಬೋಳಿಮಗ', 'ತುಲ್ಲು', 'ಗಾಂಡು',
  ],
  malayalam: [
    'myre', 'myru', 'thayoli', 'poori', 'pooru', 'kunna', 'pundachi', 'koothichi',
    'മൈര്', 'തായോളി', 'പൂറ്', 'കുണ്ണ', 'പുണ്ടച്ചി',
  ],
  marathi: [
    'zavadya', 'bhadwa', 'bhadva', 'aaighalya', 'chinal', 'randya',
    'झवाड्या', 'भडवा', 'आईघाल्या', 'छिनाल',
  ],
  bengali: [
    'khanki', 'magi', 'bokachoda', 'banchod', 'chodna', 'shuorer bachcha',
    'খানকি', 'মাগি', 'বোকাচোদা', 'বানচোদ', 'শুয়োরের বাচ্চা',
  ],
  punjabi: ['penchod', 'kanjri', 'kuttiya', 'ਪੈਂਚੋਦ', 'ਕੰਜਰੀ', 'ਕੁੱਤੀ'],
  urdu: ['kutiya', 'harami', 'haramzada', 'کتیا', 'حرامی', 'حرامزادہ', 'رنڈی'],
  gujarati: ['bhosrina', 'bhosdina', 'gando', 'ભોસડીના', 'ગાંડુ'],
  spanish: [
    'puta', 'puto', 'mierda', 'cabrón', 'pendejo', 'coño', 'joder', 'gilipollas',
    'zorra', 'hijo de puta', 'chinga', 'chingada', 'pinche', 'culero',
  ],
  french: [
    'merde', 'putain', 'pute', 'connard', 'connasse', 'salope', 'enculé',
    'salaud', 'nique ta mère', 'ta gueule',
  ],
  german: [
    'scheiße', 'scheisse', 'arschloch', 'fotze', 'hure', 'wichser', 'fick',
    'ficken', 'schlampe', 'hurensohn',
  ],
  portuguese: ['caralho', 'porra', 'foda-se', 'buceta', 'filho da puta', 'vadia', 'cuzão'],
  italian: ['cazzo', 'stronzo', 'vaffanculo', 'puttana', 'figa', 'coglione'],
  arabic: [
    'sharmouta', 'sharmuta', 'kos omak', 'kus emak', 'ibn el sharmouta', 'khara',
    'شرموطة', 'كس امك', 'ابن الشرموطة', 'خرا',
  ],
};

export const curseWords = [...new Set(Object.values(curseWordsByLanguage).flat())];

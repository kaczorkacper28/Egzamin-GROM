require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
if (!TOKEN || !CLIENT_ID || !GUILD_ID) { console.error("Brak TOKEN, CLIENT_ID lub GUILD_ID w Environment."); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const sessions = new Map();
const results = new Map();

// 80 pytań. Każde pytanie jest liczone do testu 70 pkt.
const TEST_MAX = 70;
const PRACTICAL_MAX = 30;
const PASS_SCORE = 85;

// 80 pytań. Egzamin dotyczy wyłącznie ERLC/RP: procedur serwera, komunikacji, jazdy, współpracy i fair play.
const Q = [
["Co jest najważniejsze podczas egzaminu RP?",["Wygranie za wszelką cenę","Przestrzeganie regulaminu i dobre RP","Jak najszybsze strzelanie","Omijanie procedur"],1],
["Co robisz, gdy nie rozumiesz polecenia dowódcy?",["Ignorujesz je","Pytasz o doprecyzowanie","Robisz po swojemu","Opuszczasz akcję"],1],
["Co oznacza FailRP?",["Dobre RP","Działanie łamiące realizm/zasady RP","Radio","Jazda patrolowa"],1],
["Co oznacza MetaGaming?",["Wykorzystanie wiedzy spoza postaci","Dobra komunikacja","Jazda konwojem","Raport"],0],
["Co robisz po własnym błędzie?",["Ukrywasz go","Przyznajesz się i zgłaszasz go","Obwiniasz kolegę","Kończysz egzamin"],1],
["Czy można używać exploitów?",["Tak","Tylko na egzaminie","Nie","Tylko nocą"],2],
["Kto koordynuje zespół podczas scenariusza?",["Najgłośniejszy gracz","Wyznaczony dowódca","Losowa osoba","Cywil"],1],
["Co robisz, gdy polecenia dwóch osób są sprzeczne?",["Wybierasz losowo","Prosisz o wyjaśnienie dowódcy","Ignorujesz wszystkich","Robisz to szybciej"],1],
["Dlaczego komunikacja jest ważna?",["Żeby zajmować radio","Żeby zespół miał wspólny obraz sytuacji","Żeby przeszkadzać innym","Nie jest ważna"],1],
["Czy możesz celowo przeszkadzać innym kandydatom?",["Tak","Nie","Tylko podczas finału","Jeśli przegrywasz"],1],
["Jak zachować się wobec cywila w RP?",["Zgodnie z regulaminem i scenariuszem","Ignorować zawsze","Prowokować","Wykorzystywać OOC informacje"],0],
["Co robisz, gdy przeciwnik prowokuje na czacie?",["Prowokujesz mocniej","Zachowujesz spokój i trzymasz RP","Spamujesz","Kończysz serwer"],1],
["Czy wiedza z Discorda może być automatycznie wiedzą postaci?",["Tak","Nie","Zawsze","Tylko na egzaminie"],1],
["Co oznacza PowerGaming?",["Wymuszanie nierealistycznych działań/przewagi RP","Jazda autem","Radio","Raport"],0],
["Co robisz, gdy gra ma błąd?",["Wykorzystujesz go","Zgłaszasz i postępujesz zgodnie z zasadami","Ukrywasz","Używasz go przeciw innym"],1],
["Czy można odradzać się, by wrócić natychmiast do tej samej sceny, jeśli regulamin tego zabrania?",["Tak","Nie","Tylko po przegranej","Zawsze"],1],
["Co jest ważniejsze od wyniku egzaminu?",["Fair play i regulamin","Wygrana","Liczba eliminacji","Szybkość"],0],
["Jak odpowiadasz na polecenie radiowe?",["Krótko i jasno","Spamem","Memem","Milczeniem"],0],
["Co robisz po zakończeniu akcji?",["Ignorujesz wynik","Przekazujesz raport/debrief zgodnie z RP","Prowokujesz","Kasujesz czat"],1],
["Czy znajomości powinny wpływać na wynik?",["Tak","Nie","Tylko finał","Tylko jazda"],1],
["Jaki powinien być komunikat radiowy?",["Krótki, konkretny i zrozumiały","Bardzo długi","Pełen żartów","Bez lokalizacji"],0],
["Co robisz, gdy radio jest zajęte?",["Spamujesz","Czekasz, chyba że sytuacja wymaga pilnego komunikatu zgodnie z zasadami","Wyłączasz radio","Krzyczysz na czacie"],1],
["Jak potwierdzić polecenie?",["Jasnym potwierdzeniem","Emotką na czacie","Milczeniem","Losowym słowem"],0],
["Czy kilku członków powinno jednocześnie mówić?",["Tak","Nie, jeśli można tego uniknąć","Zawsze","Tylko dla zabawy"],1],
["Co podajesz przy zgłoszeniu lokalizacji?",["Czytelną lokalizację zgodną z mapą/ERLC","Losowe miejsce","Adres z internetu","Nic"],0],
["Co robisz, gdy nie usłyszałeś komunikatu?",["Zgadujesz","Prosisz o powtórzenie","Ignorujesz","Działasz na ślepo"],1],
["Kiedy zgłaszasz zmianę sytuacji?",["Gdy ma znaczenie dla zespołu","Nigdy","Po godzinie","Tylko po akcji"],0],
["Co robisz, gdy radio zaczyna być chaotyczne?",["Dodajesz kolejny komunikat","Czekasz na uporządkowanie lub prosisz o ciszę zgodnie z RP","Wyłączasz serwer","Spamujesz"],1],
["Czy można używać radia do prywatnych rozmów podczas akcji?",["Tak","Nie","Zawsze","Tylko podczas pościgu"],1],
["Jak kończysz ważny komunikat?",["Jasnym potwierdzeniem/zwrotem zgodnym z serwerem","Krzykiem","Emoji","Brakiem odpowiedzi"],0],
["Jak prowadzić pojazd podczas zwykłego przejazdu RP?",["Kontrolowanie i zgodnie z zasadami ruchu serwera","Jak najszybciej","Pod prąd zawsze","Po chodniku"],0],
["Czy jednostka specjalna ma prawo celowo powodować chaos w ruchu?",["Tak","Nie","Zawsze","Tylko na egzaminie"],1],
["Co robisz po kolizji?",["Kontynuujesz bez słowa","Oceniasz sytuację i odgrywasz ją zgodnie z RP","Kasujesz pojazd","Obwiniasz innych"],1],
["Co robisz, gdy tracisz konwój?",["Zgłaszasz utratę kontaktu i czekasz na instrukcję","Jedziesz losowo","Wracasz sam","Porzucasz zadanie"],0],
["Czy możesz samowolnie zmienić trasę całej grupy?",["Tak","Nie, chyba że masz odpowiednie polecenie/uzgodnienie","Zawsze","Tylko gdy chcesz"],1],
["Co robisz, gdy pojazd jest niesprawny?",["Zgłaszasz i postępujesz według procedury RP","Ukrywasz","Jedziesz mimo wszystko","Teleportujesz się"],0],
["Czy jazda przez przeszkody bez uzasadnienia RP jest dobrym egzaminem?",["Tak","Nie","Zawsze","Tylko przy pościgu"],1],
["Co jest ważniejsze dla kierowcy?",["Kontrola pojazdu i bezpieczeństwo RP","Prędkość za wszelką cenę","Efektowny drift","Kolizje"],0],
["Co robisz, gdy inny gracz blokuje drogę?",["Reagujesz zgodnie z RP i zasadami serwera","Celowo taranujesz","Wyłączasz grę","Spamujesz"],0],
["Czy możesz porzucić pojazd w dowolnym miejscu bez powodu RP?",["Tak","Nie","Zawsze","Tylko w mieście"],1],
["Jak powinien zachować się konwój?",["Koordynacja, bezpieczne odstępy i komunikacja","Każdy jedzie gdzie chce","Wszyscy taranują","Brak radia"],0],
["Co robisz, jeśli gra ogranicza widoczność/sterowanie?",["Zgłaszasz problem i zachowujesz fair play","Wykorzystujesz błąd","Udajesz, że go nie ma","Obwiniasz graczy"],0],
["Czy glitch dający przewagę jest dozwolony?",["Tak","Nie","Tylko w finale","Tylko dla GROM"],1],
["Czy exploit można wykorzystać, jeśli nikt nie patrzy?",["Tak","Nie","Tylko raz","Tylko po zgodzie kolegi"],1],
["Co robisz, gdy przeciwnik używa exploita?",["Kopiujesz go","Zgłaszasz i nie wykorzystujesz go sam","Ukrywasz","Robisz to samo"],1],
["Czy OOC informacje mogą być użyte IC bez uzasadnienia?",["Tak","Nie","Zawsze","Tylko na mapie"],1],
["Co oznacza RDM?",["Losowe/nieuzasadnione atakowanie lub eliminowanie graczy zgodnie z definicją serwera","Radio","Raport","Konwój"],0],
["Co robisz po przypadkowym błędzie mechanicznym?",["Zgłaszasz i odgrywasz sytuację zgodnie z regulaminem","Wykorzystujesz go","Ukrywasz","Powtarzasz"],0],
["Czy możesz używać mechaniki gry do wymuszenia nierealistycznej sytuacji?",["Tak","Nie","Zawsze","Tylko gdy wygrywasz"],1],
["Czy można omijać regulamin, bo to tylko gra?",["Tak","Nie","Zawsze","Tylko na egzaminie"],1],
["Co robisz, gdy postać zostanie wyeliminowana i regulamin przewiduje koniec udziału?",["Respektujesz zasady","Wracasz natychmiast","Teleportujesz się","Udajesz, że nic się nie stało"],0],
["Co robisz, gdy nie znasz zasady serwera?",["Sprawdzasz ją lub pytasz komisję","Wymyślasz","Ignorujesz","Łamiesz ją"],0],
["Co robisz, gdy przeciwnik łamie regulamin?",["Zachowujesz RP i zgłaszasz sprawę właściwą drogą","Łamiesz go też","Obrażasz","Spamujesz"],0],
["Dowódca mówi 'czekamy', a kolega mówi 'idziemy'. Co robisz?",["Idziesz za kolegą","Czekasz i prosisz o wyjaśnienie","Działasz sam","Kończysz akcję"],1],
["Widzisz cel scenariusza, ale nie ma jeszcze polecenia działania. Co robisz?",["Działasz sam","Czekasz na instrukcję, chyba że regulamin/scenariusz stanowi inaczej","Uciekasz","Prowokujesz"],1],
["Kolega blokuje radio krzykiem. Co robisz?",["Dołączasz","Krótko prosisz o zachowanie dyscypliny radiowej i przekazujesz ważne informacje","Wyłączasz wszystkich","Spamujesz"],1],
["Tracisz kontakt z zespołem. Co robisz?",["Zgłaszasz to i stosujesz ustalone zasady regroupu/oczekiwania","Jedziesz sam","Opuszczasz serwer","Działasz losowo"],0],
["Pojazd zostaje uszkodzony. Co robisz?",["Informujesz zespół i odgrywasz awarię zgodnie z RP","Jedziesz przez ściany","Teleportujesz auto","Ukrywasz"],0],
["Kolega proponuje glitch. Co odpowiadasz?",["Odmawiam i zgłaszam, jeśli trzeba","Zgadzam się","Tylko raz","Jeśli nikt nie widzi"],0],
["Dowódca popełnia błąd. Co robisz?",["Kulturalnie zgłaszasz problem/ryzyko i stosujesz właściwą hierarchię","Obrażasz","Ignorujesz zawsze","Robisz bunt"],0],
["Cywil jest w obszarze scenariusza. Co robisz?",["Uwzględniasz go i działasz zgodnie z zasadami RP","Ignorujesz","Celowo taranujesz","Wykorzystujesz OOC"],0],
["Przeciwnik prowokuje Cię na czacie. Co robisz?",["Zachowujesz spokój i nie wychodzisz z RP bez potrzeby","Obrażasz","Spamujesz","Rzucasz grę"],0],
["Drużyna przegrywa. Co robisz?",["Kończysz scenariusz zgodnie z RP i analizujesz błędy","Rewanżujesz się OOC","Łamiesz regulamin","Opuszczasz serwer bez słowa"],0],
["Co jest oznaką dobrego dowódcy?",["Jasna komunikacja, odpowiedzialność i organizacja","Krzyk","Samowola","Ignorowanie zespołu"],0],
["Co robisz, gdy członek zespołu potrzebuje pomocy?",["Komunikujesz sytuację i wspierasz go zgodnie z zadaniem","Ignorujesz","Wyśmiewasz","Opuszczasz"],0],
["Czy ambicja usprawiedliwia łamanie regulaminu?",["Tak","Nie","Czasami","Na finale"],1],
["Co robisz, gdy nie zgadzasz się z decyzją komisji?",["Zachowujesz kulturę i korzystasz z drogi odwoławczej, jeśli istnieje","Obrażasz komisję","Spamujesz","Łamiesz zasady"],0],
["Jak zachować się podczas presji czasu?",["Spokojnie priorytetyzować i komunikować decyzje","Działać chaotycznie","Milczeć","Łamać zasady"],0],
["Co jest celem pracy zespołowej?",["Wspólne wykonanie zadania zgodnie z RP","Indywidualna sława","Wyścig","Chaos"],0],
["Co robisz po nieudanej próbie?",["Analizujesz błąd i poprawiasz go","Obwiniasz innych","Rezygnujesz zawsze","Łamiesz zasady"],0],
["Jak traktować nowych członków zespołu?",["Z szacunkiem i instruktażem","Poniżać","Ignorować","Testować przez łamanie zasad"],0],
["Co powinno decydować o wyniku egzaminu?",["Wynik, zachowanie i przestrzeganie regulaminu","Znajomości","Najlepszy sprzęt","Stała ranga"],0],
["Dlaczego warto zgłaszać własne błędy?",["Pozwala to poprawić RP i bezpieczeństwo scenariusza","Żeby stracić punkty","Nie ma powodu","Żeby przerwać egzamin"],0],
["Co robisz, gdy instruktor zmienia scenariusz?",["Słuchasz nowych informacji i dostosowujesz działanie","Ignorujesz","Działasz według starego planu bez sprawdzenia","Kończysz"],0],
["Jak reagować na sprzeczne informacje?",["Prosić o potwierdzenie i ustalić właściwy komunikat","Losować","Krzyczeć","Ignorować"],0],
["Co powinno wyróżniać kandydata GROM w ERLC?",["Dyscyplina, komunikacja, fair play i dobre RP","Agresja OOC","Samowola","Glitche"],0],
["Czy wynik 84/100 spełnia próg 85?",["Tak","Nie","Zależy od nastroju","Zawsze"],1],
["Co dzieje się przy błędzie krytycznym?",["Automatyczne niezaliczenie zgodnie z regulaminem egzaminu","Dodatkowe punkty","Nic","Bonus"],0]
];

const practical = [
"📻 Test radiowy — 5 pkt: krótkość, jasność, poprawna lokalizacja i potwierdzanie.",
"🚓 Jazda RP — 5 pkt: kontrola pojazdu, ruch drogowy, brak celowych kolizji.",
"👥 Praca zespołowa — 5 pkt: komunikacja, wykonywanie poleceń i współpraca.",
"⏱️ Presja czasu — 5 pkt: opanowanie, priorytety i poprawność decyzji.",
"🔄 Zmiana scenariusza — 5 pkt: reakcja na nowe informacje bez chaosu.",
"🏆 Finał RP — 5 pkt: połączenie radia, jazdy, współpracy i decyzji."
];

const commands = [
 new SlashCommandBuilder().setName("grom-egzamin").setDescription("Uruchamia panel egzaminu GROM ERLC.").setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON(),
 new SlashCommandBuilder().setName("grom-wynik").setDescription("Ustawia wynik praktyczny kandydata.").addUserOption(o=>o.setName("osoba").setDescription("Kandydat").setRequired(true)).addIntegerOption(o=>o.setName("punkty").setDescription("Punkty praktyczne 0-30").setRequired(true).setMinValue(0).setMaxValue(30)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON(),
 new SlashCommandBuilder().setName("grom-reset").setDescription("Resetuje egzamin kandydata.").addUserOption(o=>o.setName("osoba").setDescription("Kandydat").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator).toJSON()
];

async function register(){ const rest=new REST({version:"10"}).setToken(TOKEN); await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands}); }

// Przelicza 80 odpowiedzi testowych na dokładnie 70 pkt.
// Wynik praktyczny jest osobno oceniany w skali 0-30 pkt.
function calculateTestPoints(correctAnswers){
  return Math.round((correctAnswers / Q.length) * TEST_MAX);
}

function getTotal(quiz, practical){
  return quiz + (practical ?? 0);
}

function getStatus(total){
  return total >= PASS_SCORE ? "✅ **ZALICZONY**" : "❌ **NIEZALICZONY**";
}

function panel(){
 return { embeds:[new EmbedBuilder().setColor(0x8b0000).setTitle("🇵🇱 EGZAMIN REKRUTACYJNY GROM — ERLC").setDescription("**POZIOM: EKSTREMALNY**\n\n80 pytań = **70 pkt** + zadania praktyczne = **30 pkt**.\n**Maksymalnie: 100 pkt. Próg zaliczenia: 85/100 pkt.**\n\n❌ Exploity, MetaGaming, FailRP, PowerGaming lub celowe łamanie regulaminu = **automatyczne niezaliczenie**.\n\nKliknij przycisk, aby rozpocząć egzamin.").setFooter({text:"GROM • ERLC RP • 70 pkt test + 30 pkt praktyka = 100 pkt"})],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("grom_start").setLabel("Rozpocznij egzamin").setEmoji("🎯").setStyle(ButtonStyle.Danger))]};
}

client.once("ready",async()=>{ console.log(`✅ ${client.user.tag} online`); try{await register(); console.log("✅ Komendy zarejestrowane");}catch(e){console.error(e);} });

client.on("interactionCreate",async i=>{
 if(i.isChatInputCommand()){
  if(i.commandName==="grom-egzamin") return i.reply({...panel(),ephemeral:false});
  if(i.commandName==="grom-reset"){sessions.delete(i.options.getUser("osoba").id);results.delete(i.options.getUser("osoba").id);return i.reply({content:`✅ Zresetowano egzamin dla <@${i.options.getUser("osoba").id}>.`,ephemeral:true});}
  if(i.commandName==="grom-wynik"){
   const u=i.options.getUser("osoba"),p=i.options.getInteger("punkty"),r=results.get(u.id)||{quiz:0};
   r.practical=p;
   r.total=getTotal(r.quiz,p);
   results.set(u.id,r);
   return i.reply({content:`📋 **Wynik GROM — <@${u.id}>**\n🧠 Test: **${r.quiz}/${TEST_MAX}**\n🔥 Praktyka: **${p}/${PRACTICAL_MAX}**\n🏆 Razem: **${r.total}/100**\n\n${getStatus(r.total)}`,ephemeral:false});
  }
 }
 if(!i.isButton()) return;
 if(i.customId==="grom_start"){
  if(sessions.has(i.user.id)) return i.reply({content:"⚠️ Masz już rozpoczęty egzamin. Dokończ go albo poproś komisję o reset.",ephemeral:true});
  sessions.set(i.user.id,{n:0,score:0}); return sendQuestion(i);
 }
 if(i.customId.startsWith("grom_ans_")){
  const s=sessions.get(i.user.id); if(!s)return i.reply({content:"❌ Nie masz aktywnego egzaminu.",ephemeral:true});
  const a=Number(i.customId.split("_")[2]),q=Q[s.n]; if(a===q[2])s.score++;
  s.n++;
  if(s.n>=Q.length){
   sessions.delete(i.user.id);
   const quizPoints=calculateTestPoints(s.score);
   results.set(i.user.id,{quiz:quizPoints,correct:s.score,total:quizPoints,practical:null});
   return i.update({embeds:[new EmbedBuilder().setColor(0x8b0000).setTitle("🏁 CZĘŚĆ TESTOWA ZAKOŃCZONA").setDescription(`Kandydat: <@${i.user.id}>\n📝 Poprawne odpowiedzi: **${s.score}/${Q.length}**\n🧠 Wynik testu: **${quizPoints}/${TEST_MAX} pkt**\n\nKomisja musi teraz przyznać **0–30 pkt** za zadania praktyczne komendą \`/grom-wynik\`.\n\n**Maksymalny wynik: 100 pkt (70 test + 30 praktyka).**\n**Próg końcowy: 85/100 pkt.**\nBłąd krytyczny = automatyczne niezaliczenie.`)],components:[]});
  }
  return sendQuestion(i);
 }
});

async function sendQuestion(i){const s=sessions.get(i.user.id),q=Q[s.n];const rows=new ActionRowBuilder().addComponents(q[1].map((x,k)=>new ButtonBuilder().setCustomId(`grom_ans_${k}`).setLabel(`${String.fromCharCode(65+k)}. ${x}`.slice(0,80)).setStyle(ButtonStyle.Secondary)));const e=new EmbedBuilder().setColor(0x8b0000).setTitle(`🇵🇱 GROM — Pytanie ${s.n+1}/${Q.length}`).setDescription(`**${q[0]}**\n\n📊 Aktualne poprawne odpowiedzi: **${s.score}**`);return i.update({embeds:[e],components:[rows]});}

process.on("unhandledRejection",e=>console.error(e));
client.login(TOKEN);

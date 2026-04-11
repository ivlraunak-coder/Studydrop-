import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase,ref,push,set,onValue,remove,update,onDisconnect,get }
  from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const firebaseConfig={
  apiKey:"AIzaSyAU5lhYGSoZRQGE-Qk1z2OOFwkGfolPOb0",
  authDomain:"studydrop-6af19.firebaseapp.com",
  projectId:"studydrop-6af19",
  storageBucket:"studydrop-6af19.firebasestorage.app",
  messagingSenderId:"216969700185",
  appId:"1:216969700185:web:edb2a8b06573b08bc86248",
  databaseURL:"https://studydrop-6af19-default-rtdb.firebaseio.com"
};
const app=initializeApp(firebaseConfig);
const db=getDatabase(app);

// ── STATE ──
let userName='',userPfp='',userId='',currentRoomId='',currentRoomName='';
let subjects=[],pendingGoalFile=null,selectedColor='#e8708a',tempPfpData='',tempPfpData2='';
let allGoals={},allMessages={},allUsers={},allStudying={};
const POMO_CIRC=603;
let pomoMode='focus',pomoRunning=false,pomoInterval=null,pomoSecondsLeft=25*60;
let pomoSessions=0,pomoFocusMin=0,pomoSettings={focus:25,short:5,long:15};
let pomoStreak=0,lastStudyDay='';
let unlockedBadges=[];

// ── MUSHROOM COIN STATE ──
let mushroomCoins=0;
let ownedItems=[];
let equippedTitle='';
let equippedBadges=[];
let equippedTheme='';
let currentShopFilter='all';

// ── XP & LEVEL STATE ──
let xp=0;
let level=1;
const XP_LEVELS=[
  {level:1,title:'Seedling',icon:'🌱',xpNeeded:0},
  {level:2,title:'Sprout',icon:'🌿',xpNeeded:100},
  {level:3,title:'Apprentice Scholar',icon:'📖',xpNeeded:250},
  {level:4,title:'Focused Student',icon:'🎯',xpNeeded:500},
  {level:5,title:'Study Knight',icon:'⚔️',xpNeeded:900},
  {level:6,title:'Knowledge Seeker',icon:'🔍',xpNeeded:1400},
  {level:7,title:'Brain Wizard',icon:'🧙',xpNeeded:2100},
  {level:8,title:'Scholar Elite',icon:'🏅',xpNeeded:3000},
  {level:9,title:'Grand Master',icon:'👑',xpNeeded:4200},
  {level:10,title:'Study Legend',icon:'🌟',xpNeeded:6000},
];
function getLevelInfo(totalXp){
  let cur=XP_LEVELS[0];
  for(let i=XP_LEVELS.length-1;i>=0;i--){if(totalXp>=XP_LEVELS[i].xpNeeded){cur=XP_LEVELS[i];break;}}
  return cur;
}
function getNextLevelInfo(totalXp){
  const cur=getLevelInfo(totalXp);
  const idx=XP_LEVELS.findIndex(l=>l.level===cur.level);
  return idx<XP_LEVELS.length-1?XP_LEVELS[idx+1]:null;
}

// ── SAVED ROOMS (multi-room) ──
let savedRooms=[];

// ── STUDY STATUS (broadcast to room) ──
let studyStatusInterval=null; // interval to update studying status in Firebase

// ── DARK MODE ──
let darkMode=false;

// ── MISSIONS STATE ──
let completedMissions={};     // {date: [missionIds]}
let missionStreak=0;
let lastMissionDay='';
let missionsCompleted=0;      // total all-time missions completed
let plannerTasks=0;           // total planner tasks added
let nightOwl=false;
let earlyBird=false;

// ── PLANNER STATE ──
let plannerData={};           // {YYYY-MM-DD: [{id,text,done,color}]}
let plannerMode='month';
let plannerDate=new Date();
let plannerSelectedDate=null;

// ── REPORT STATE ──
let reportWeekOffset=0;       // 0=current week, -1=last week etc.
let weeklyStudyLog={};        // {YYYY-MM-DD: mins}

// ── BADGE DEFINITIONS (40+) ──
const BADGES=[
  // Study Hours
  {id:'first_goal',icon:'🌱',name:'First Drop',desc:'Post your very first goal',color:'#a8c5a0',req:'Post 1 goal',check:u=>u.goalCount>=1},
  {id:'hours_1',icon:'🕐',name:'Getting Started',desc:'Study for 1+ hour total',color:'#f4c88a',req:'Study 1 hour',check:u=>u.totalMins>=60},
  {id:'hours_5',icon:'⏰',name:'5-Hour Club',desc:'Study for 5+ total hours',color:'#f2a98a',req:'Study 5 hours',check:u=>u.totalMins>=300},
  {id:'hours_10',icon:'🔥',name:'Grind Mode',desc:'Study for 10+ total hours',color:'#e8708a',req:'Study 10 hours',check:u=>u.totalMins>=600},
  {id:'hours_25',icon:'💪',name:'Study Beast',desc:'Study for 25+ total hours',color:'#c95070',req:'Study 25 hours',check:u=>u.totalMins>=1500},
  {id:'hours_50',icon:'👑',name:'Scholar',desc:'Study for 50+ total hours',color:'#f0b429',req:'Study 50 hours',check:u=>u.totalMins>=3000},
  {id:'hours_100',icon:'🏛️',name:'Century Studier',desc:'Study for 100+ total hours — absolute legend',color:'#9b59b6',req:'Study 100 hours',check:u=>u.totalMins>=6000},
  {id:'hours_200',icon:'🌌',name:'Eternal Flame',desc:'200+ hours. You are a force of nature.',color:'#e74c3c',req:'Study 200 hours',check:u=>u.totalMins>=12000},
  {id:'hours_500',icon:'🪐',name:'Transcendent',desc:'500 hours. Beyond human limits.',color:'#2c3e50',req:'Study 500 hours',check:u=>u.totalMins>=30000},
  // Streaks
  {id:'streak_2',icon:'💫',name:'Back-to-Back',desc:'Study 2 days in a row',color:'#f4c88a',req:'2-day streak',check:u=>u.pomoStreak>=2},
  {id:'streak_3',icon:'🌟',name:'3-Day Streak',desc:'Study 3 days in a row',color:'#c5b4e3',req:'3-day streak',check:u=>u.pomoStreak>=3},
  {id:'streak_7',icon:'✨',name:'Week Warrior',desc:'Study 7 days in a row',color:'#9b59b6',req:'7-day streak',check:u=>u.pomoStreak>=7},
  {id:'streak_14',icon:'🌙',name:'Fortnight Force',desc:'Study 14 days in a row',color:'#2d3748',req:'14-day streak',check:u=>u.pomoStreak>=14},
  {id:'streak_30',icon:'🌕',name:'Month Master',desc:'Study every day for a month',color:'#f0b429',req:'30-day streak',check:u=>u.pomoStreak>=30},
  {id:'streak_60',icon:'☀️',name:'Relentless',desc:'60 days without stopping. Incredible.',color:'#e67e22',req:'60-day streak',check:u=>u.pomoStreak>=60},
  {id:'streak_100',icon:'🏆',name:'Century Streak',desc:'100 consecutive study days. Mythical.',color:'#e74c3c',req:'100-day streak',check:u=>u.pomoStreak>=100},
  // Pomodoros
  {id:'pomo_1',icon:'🍅',name:'First Pomo',desc:'Complete your first Pomodoro session',color:'#e74c3c',req:'1 Pomodoro',check:u=>u.pomoSessions>=1},
  {id:'pomo_5',icon:'🍅',name:'5 Pomos',desc:'Complete 5 focus sessions',color:'#e8708a',req:'5 Pomodoros',check:u=>u.pomoSessions>=5},
  {id:'pomo_10',icon:'🍅',name:'Pomodoro Pro',desc:'Complete 10 focus sessions',color:'#e74c3c',req:'10 Pomodoros',check:u=>u.pomoSessions>=10},
  {id:'pomo_25',icon:'🎯',name:'Focus Veteran',desc:'Complete 25 focus sessions',color:'#c0392b',req:'25 Pomodoros',check:u=>u.pomoSessions>=25},
  {id:'pomo_50',icon:'🎯',name:'Focus Master',desc:'Complete 50 focus sessions',color:'#96281b',req:'50 Pomodoros',check:u=>u.pomoSessions>=50},
  {id:'pomo_100',icon:'⚡',name:'Pomo Century',desc:'100 Pomodoro sessions. Unstoppable.',color:'#7b241c',req:'100 Pomodoros',check:u=>u.pomoSessions>=100},
  // Subjects
  {id:'subjects_1',icon:'📖',name:'First Subject',desc:'Start tracking your first subject',color:'#3498db',req:'1 subject',check:u=>(u.subjects?.length||0)>=1},
  {id:'subjects_3',icon:'📚',name:'Multi-Tasker',desc:'Track 3+ subjects',color:'#3498db',req:'3 subjects tracked',check:u=>(u.subjects?.length||0)>=3},
  {id:'subjects_5',icon:'🗂️',name:'Subject Collector',desc:'Track 5+ subjects',color:'#2980b9',req:'5 subjects',check:u=>(u.subjects?.length||0)>=5},
  {id:'subjects_8',icon:'🧠',name:'Renaissance Studier',desc:'Track 8+ subjects — true polymath',color:'#1a5276',req:'8 subjects',check:u=>(u.subjects?.length||0)>=8},
  // Social
  {id:'social',icon:'💬',name:'Team Player',desc:'React to 5 goals from others',color:'#27ae60',req:'React to 5 goals',check:u=>u.reactCount>=5},
  {id:'social_20',icon:'🤝',name:'Supporter',desc:'React to 20 goals',color:'#1e8449',req:'React to 20 goals',check:u=>u.reactCount>=20},
  {id:'social_50',icon:'💖',name:'Community Pillar',desc:'React to 50 goals — you\'re a legend',color:'#145a32',req:'React to 50 goals',check:u=>u.reactCount>=50},
  {id:'goals_5',icon:'🎯',name:'Goal Setter',desc:'Post 5 goals',color:'#e8708a',req:'Post 5 goals',check:u=>u.goalCount>=5},
  {id:'goals_15',icon:'📋',name:'Consistent Poster',desc:'Post 15 goals',color:'#c95070',req:'Post 15 goals',check:u=>u.goalCount>=15},
  {id:'goals_30',icon:'📝',name:'Goal Maniac',desc:'Post 30 goals — you never stop hustling',color:'#a93226',req:'Post 30 goals',check:u=>u.goalCount>=30},
  // Coins
  {id:'coins_100',icon:'🍄',name:'Mushroom Collector',desc:'Earn 100 Mushroom Coins',color:'#8B6914',req:'Earn 100 coins',check:u=>u.mushroomCoins>=100},
  {id:'coins_500',icon:'💰',name:'Coin Hoarder',desc:'Earn 500 Mushroom Coins',color:'#a07020',req:'Earn 500 coins',check:u=>u.mushroomCoins>=500},
  {id:'coins_1000',icon:'💎',name:'Wealthy Scholar',desc:'Earn 1000 Mushroom Coins',color:'#7d6608',req:'Earn 1000 coins',check:u=>u.mushroomCoins>=1000},
  {id:'coins_5000',icon:'🪙',name:'Coin Tycoon',desc:'Earn 5000 Mushroom Coins. Absurd.',color:'#6e2f01',req:'Earn 5000 coins',check:u=>u.mushroomCoins>=5000},
  // Missions
  {id:'mission_first',icon:'⚡',name:'Mission Accepted',desc:'Complete your first daily mission',color:'#f39c12',req:'Complete 1 mission',check:u=>u.missionsCompleted>=1},
  {id:'mission_10',icon:'🏅',name:'Mission Veteran',desc:'Complete 10 missions total',color:'#e67e22',req:'Complete 10 missions',check:u=>u.missionsCompleted>=10},
  {id:'mission_50',icon:'🎖️',name:'Mission Commander',desc:'Complete 50 missions',color:'#d35400',req:'Complete 50 missions',check:u=>u.missionsCompleted>=50},
  // Planner
  {id:'planner_first',icon:'📅',name:'Planner',desc:'Add your first task to the study planner',color:'#16a085',req:'Plan 1 task',check:u=>u.plannerTasks>=1},
  {id:'planner_30',icon:'🗓️',name:'Organized Scholar',desc:'Add 30 tasks to the planner',color:'#0e6655',req:'Plan 30 tasks',check:u=>u.plannerTasks>=30},
  // Special
  {id:'night_owl',icon:'🦉',name:'Night Owl',desc:'Log a study session after midnight',color:'#2d3748',req:'Study after midnight',check:u=>u.nightOwl},
  {id:'early_bird',icon:'🐦',name:'Early Bird',desc:'Log a study session before 7am',color:'#f0b429',req:'Study before 7am',check:u=>u.earlyBird},
];

// ── SHOP ITEMS ──
const SHOP_ITEMS=[
  // THEMES
  {id:'theme_night',type:'theme',name:'Midnight Study',icon:'🌙',preview:'🌙',desc:'Deep dark theme with purple accents. Easy on the eyes for late-night grinding.',price:6000,cssClass:'theme-night'},
  {id:'theme_forest',type:'theme',name:'Forest Focus',icon:'🌿',preview:'🌿',desc:'Earthy greens and warm tones. Nature vibes for calm studying.',price:5250,cssClass:'theme-forest'},
  {id:'theme_ocean',type:'theme',name:'Ocean Deep',icon:'🌊',preview:'🌊',desc:'Cool blues and teals. Feel like studying underwater (but productively).',price:5700,cssClass:'theme-ocean'},
  {id:'theme_sakura',type:'theme',name:'Sakura Bloom',icon:'🌸',preview:'🌸',desc:'Extra pink and soft. The ultimate kawaii study aesthetic.',price:4500,cssClass:'theme-sakura'},
  {id:'theme_gold',type:'theme',name:'Golden Hour',icon:'☀️',preview:'☀️',desc:'Warm amber and gold tones. Feels like studying at sunset.',price:7500,cssClass:'theme-gold'},
  {id:'theme_galaxy',type:'theme',name:'Galaxy Mode',icon:'🌌',preview:'🌌',desc:'Deep space vibes with neon accents. Study among the stars.',price:9000,cssClass:'theme-galaxy'},
  {id:'theme_cherry',type:'theme',name:'Cherry Matcha',icon:'🍵',preview:'🍵',desc:'Soft green and cherry red. Japanese café aesthetic for focused work.',price:6300,cssClass:'theme-cherry'},
  // PROFILE BADGES
  {id:'badge_mushroom',type:'badge',name:'Mushroom Collector',icon:'🍄',preview:'🍄',desc:'Show off your love for Mushroom Coins. A true currency enthusiast.',price:2250},
  {id:'badge_diamond',type:'badge',name:'Diamond Scholar',icon:'💎',preview:'💎',desc:'Rare and shiny — awarded to those who grind for the bling.',price:9000},
  {id:'badge_fire',type:'badge',name:'On Fire',icon:'🔥',preview:'🔥',desc:'You\'re absolutely blazing through your study sessions.',price:3000},
  {id:'badge_star',type:'badge',name:'Star Student',icon:'⭐',preview:'⭐',desc:'Shining bright in the leaderboard galaxy.',price:2700},
  {id:'badge_cat',type:'badge',name:'Study Cat',icon:'🐱',preview:'🐱',desc:'Calm, curious, and always watching the timer.',price:3300},
  {id:'badge_robot',type:'badge',name:'Study Bot',icon:'🤖',preview:'🤖',desc:'Highly optimized studying machine. Beep boop.',price:3750},
  {id:'badge_crown',type:'badge',name:'Royal Grinder',icon:'👑',preview:'👑',desc:'The crown is earned, not given. Wear it with pride.',price:11250},
  {id:'badge_unicorn',type:'badge',name:'Unicorn Mode',icon:'🦄',preview:'🦄',desc:'So rare, so magical. Your study habits are legendary.',price:13500},
  {id:'badge_dragon',type:'badge',name:'Dragon Slayer',icon:'🐉',preview:'🐉',desc:'You slay procrastination like a dragon. Fearless.',price:15000},
  {id:'badge_lightning',type:'badge',name:'Lightning Learner',icon:'⚡',preview:'⚡',desc:'Fast, electric, unstoppable. You learn at the speed of light.',price:4500},
  {id:'badge_moon',type:'badge',name:'Moon Child',icon:'🌙',preview:'🌙',desc:'Night owl by nature, scholar by choice.',price:4200},
  {id:'badge_planet',type:'badge',name:'Galaxy Brain',icon:'🪐',preview:'🪐',desc:'Your intelligence is cosmic. Out of this world studying.',price:6750},
  {id:'badge_ghost',type:'badge',name:'Ghost Grinder',icon:'👻',preview:'👻',desc:'You appear and disappear but always get the work done.',price:4800},
  {id:'badge_alien',type:'badge',name:'Alien Intellect',icon:'👽',preview:'👽',desc:'Human study methods can\'t contain your alien brain.',price:7500},
  // TITLES
  {id:'title_grinder',type:'title',name:'"The Grinder"',icon:'💪',preview:'"The Grinder"',desc:'For those who never stop. A title that speaks for itself.',price:4500,titleText:'The Grinder',titleColor:'#e8708a'},
  {id:'title_scholar',type:'title',name:'"Eternal Scholar"',icon:'📚',preview:'"Eternal Scholar"',desc:'Knowledge is your weapon. Wisdom is your goal.',price:6750,titleColor:'#9b59b6',titleText:'Eternal Scholar'},
  {id:'title_nocturnal',type:'title',name:'"Nocturnal Nerd"',icon:'🦉',preview:'"Nocturnal Nerd"',desc:'The library closes at midnight. You don\'t.',price:5700,titleColor:'#2d3748',titleText:'Nocturnal Nerd'},
  {id:'title_speedrun',type:'title',name:'"Speedrunner"',icon:'⚡',preview:'"Speedrunner"',desc:'Efficient, fast, and deadly accurate. Study speedrunning champion.',price:6000,titleColor:'#f0b429',titleText:'Speedrunner'},
  {id:'title_legend',type:'title',name:'"Legend"',icon:'🌟',preview:'"Legend"',desc:'You\'ve transcended ordinary studying. You are a legend.',price:22500,titleColor:'#f0b429',titleText:'Legend'},
  {id:'title_chaos',type:'title',name:'"Chaos Learner"',icon:'🌀',preview:'"Chaos Learner"',desc:'No schedule, just vibes — and somehow top of the leaderboard.',price:5250,titleColor:'#e74c3c',titleText:'Chaos Learner'},
  {id:'title_machine',type:'title',name:'"The Machine"',icon:'🤖',preview:'"The Machine"',desc:'Emotions? No. Study hours? Yes. Fully optimized.',price:7500,titleColor:'#2d3748',titleText:'The Machine'},
  {id:'title_phantom',type:'title',name:'"The Phantom"',icon:'👻',preview:'"The Phantom"',desc:'No one sees you coming, but they see you on the leaderboard.',price:9000,titleColor:'#6c3483',titleText:'The Phantom'},
  {id:'title_goat',type:'title',name:'"The G.O.A.T."',icon:'🐐',preview:'"The G.O.A.T."',desc:'Greatest Of All Time. For the ones at the very top.',price:30000,titleColor:'#c0392b',titleText:'The G.O.A.T.'},
];

// ── HELPERS ──
function genUid(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function genCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('');}
function initial(n){return(n||'?').trim()[0].toUpperCase();}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmtTime(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
const PALETTES=[['#fce8ef','#c95070'],['#fde8d8','#d4724a'],['#e8d5f5','#7b4fa8'],['#d5ecd5','#3d7a3d'],['#d5e8f5','#2d6a9f'],['#fff8e6','#a07020']];
function getAv(n){let h=0;for(let c of(n||''))h=(h*31+c.charCodeAt(0))&0xffffffff;return PALETTES[Math.abs(h)%PALETTES.length];}
function avatarEl(name,pfp,size){
  const[bg,fg]=getAv(name);
  if(pfp)return`<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${pfp}" style="width:100%;height:100%;object-fit:cover"></div>`;
  return`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${size*.38}px;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0">${initial(name)}</div>`;
}
function formatMins(m){const h=Math.floor(m/60),mm=m%60;if(h&&mm)return`${h}h ${mm}m`;if(h)return`${h}h`;return`${mm}m`;}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._to);t._to=setTimeout(()=>t.classList.remove('show'),2800);}
function getCloudPayload(){
  return{
    subjects,pomoSessions,pomoFocusMin,pomoStreak,lastStudyDay,
    unlockedBadges,mushroomCoins,ownedItems,equippedTitle,
    equippedBadges,equippedTheme,savedRooms,darkMode,
    completedMissions,missionStreak,lastMissionDay,missionsCompleted,
    plannerData,plannerTasks,weeklyStudyLog,nightOwl,earlyBird,
    xp,level,userName,userPfp,savedAt:Date.now()
  };
}
function applyPayload(d){
  if(!d)return;
  if(d.subjects!==undefined){
    // Only restore from cloud if localStorage has no subjects saved recently
    const localSubjectsRaw=localStorage.getItem('sd_subjects');
    const localAge=Date.now()-parseInt(localStorage.getItem('sd_saved_at')||'0');
    if(!localSubjectsRaw||localAge>300000){
      subjects=d.subjects; // >5min old local data, trust cloud
    }
    // else keep localStorage subjects (user may have just deleted one)
  }
  if(d.pomoSessions!==undefined)pomoSessions=d.pomoSessions;
  if(d.pomoFocusMin!==undefined)pomoFocusMin=d.pomoFocusMin;
  if(d.pomoStreak!==undefined)pomoStreak=d.pomoStreak;
  if(d.lastStudyDay!==undefined)lastStudyDay=d.lastStudyDay;
  if(d.unlockedBadges!==undefined)unlockedBadges=d.unlockedBadges;
  if(d.mushroomCoins!==undefined)mushroomCoins=d.mushroomCoins;
  if(d.ownedItems!==undefined)ownedItems=d.ownedItems;
  if(d.equippedTitle!==undefined)equippedTitle=d.equippedTitle;
  if(d.equippedBadges!==undefined)equippedBadges=d.equippedBadges;
  if(d.equippedTheme!==undefined)equippedTheme=d.equippedTheme;
  if(d.savedRooms!==undefined)savedRooms=d.savedRooms;
  if(d.darkMode!==undefined)darkMode=d.darkMode;
  if(d.completedMissions!==undefined)completedMissions=d.completedMissions;
  if(d.missionStreak!==undefined)missionStreak=d.missionStreak;
  if(d.lastMissionDay!==undefined)lastMissionDay=d.lastMissionDay;
  if(d.missionsCompleted!==undefined)missionsCompleted=d.missionsCompleted;
  if(d.plannerData!==undefined)plannerData=d.plannerData;
  if(d.plannerTasks!==undefined)plannerTasks=d.plannerTasks;
  if(d.weeklyStudyLog!==undefined)weeklyStudyLog=d.weeklyStudyLog;
  if(d.nightOwl!==undefined)nightOwl=d.nightOwl;
  if(d.earlyBird!==undefined)earlyBird=d.earlyBird;
  if(d.xp!==undefined)xp=d.xp;
  if(d.level!==undefined)level=d.level;
  if(d.userName)userName=d.userName;
  if(d.userPfp)userPfp=d.userPfp;
}
// Debounced cloud save — fires 3s after the last saveLocal call
let _cloudSaveTimer=null;
function scheduleCloudSave(){
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer=setTimeout(()=>{
    if(!userId)return;
    set(ref(db,`profiles/${userId}`),getCloudPayload()).catch(()=>{});
  },3000);
}
function saveLocal(){
  // ── localStorage (instant) ──
  localStorage.setItem('sd_subjects',JSON.stringify(subjects));
  localStorage.setItem('sd_pomo_sessions',pomoSessions);
  localStorage.setItem('sd_pomo_focus',pomoFocusMin);
  localStorage.setItem('sd_streak',pomoStreak);
  localStorage.setItem('sd_lastday',lastStudyDay);
  localStorage.setItem('sd_unlocked',JSON.stringify(unlockedBadges));
  localStorage.setItem('sd_coins',mushroomCoins);
  localStorage.setItem('sd_owned_items',JSON.stringify(ownedItems));
  localStorage.setItem('sd_equipped_title',equippedTitle);
  localStorage.setItem('sd_equipped_badges',JSON.stringify(equippedBadges));
  localStorage.setItem('sd_equipped_theme',equippedTheme);
  localStorage.setItem('sd_saved_rooms',JSON.stringify(savedRooms));
  localStorage.setItem('sd_dark',darkMode?'1':'0');
  localStorage.setItem('sd_completed_missions',JSON.stringify(completedMissions));
  localStorage.setItem('sd_mission_streak',missionStreak);
  localStorage.setItem('sd_last_mission_day',lastMissionDay);
  localStorage.setItem('sd_missions_completed',missionsCompleted);
  localStorage.setItem('sd_planner',JSON.stringify(plannerData));
  localStorage.setItem('sd_planner_tasks',plannerTasks);
  localStorage.setItem('sd_weekly_log',JSON.stringify(weeklyStudyLog));
  localStorage.setItem('sd_night_owl',nightOwl?'1':'0');
  localStorage.setItem('sd_early_bird',earlyBird?'1':'0');
  localStorage.setItem('sd_xp',xp);
  localStorage.setItem('sd_level',level);
  // ── Firebase (debounced 3s) ──
  scheduleCloudSave();
}
// Load full profile from Firebase, fall back to localStorage
async function loadProfileFromCloud(uid){
  try{
    const snap=await get(ref(db,`profiles/${uid}`));
    if(snap.exists()){
      const cloudData=snap.val();
      const localSaved=parseInt(localStorage.getItem('sd_saved_at')||'0');
      if((cloudData.savedAt||0)>=localSaved){
        applyPayload(cloudData);
        // If localStorage has subjects saved within last 2 minutes, trust them over cloud
        // (guards against cloud restoring deleted subjects before debounced save fires)
        const localSubjectsRaw=localStorage.getItem('sd_subjects');
        const localSubjectsAge=Date.now()-localSaved;
        if(localSubjectsRaw&&localSubjectsAge<120000){
          subjects=JSON.parse(localSubjectsRaw);
        }
        mirrorToLocalStorage();
        return true;
      }
    }
  }catch(e){/* offline - use localStorage */}
  return false;
}
function mirrorToLocalStorage(){
  localStorage.setItem('sd_subjects',JSON.stringify(subjects));
  localStorage.setItem('sd_pomo_sessions',pomoSessions);
  localStorage.setItem('sd_pomo_focus',pomoFocusMin);
  localStorage.setItem('sd_streak',pomoStreak);
  localStorage.setItem('sd_lastday',lastStudyDay);
  localStorage.setItem('sd_unlocked',JSON.stringify(unlockedBadges));
  localStorage.setItem('sd_coins',mushroomCoins);
  localStorage.setItem('sd_owned_items',JSON.stringify(ownedItems));
  localStorage.setItem('sd_equipped_title',equippedTitle);
  localStorage.setItem('sd_equipped_badges',JSON.stringify(equippedBadges));
  localStorage.setItem('sd_equipped_theme',equippedTheme);
  localStorage.setItem('sd_saved_rooms',JSON.stringify(savedRooms));
  localStorage.setItem('sd_dark',darkMode?'1':'0');
  localStorage.setItem('sd_completed_missions',JSON.stringify(completedMissions));
  localStorage.setItem('sd_mission_streak',missionStreak);
  localStorage.setItem('sd_last_mission_day',lastMissionDay);
  localStorage.setItem('sd_missions_completed',missionsCompleted);
  localStorage.setItem('sd_planner',JSON.stringify(plannerData));
  localStorage.setItem('sd_planner_tasks',plannerTasks);
  localStorage.setItem('sd_weekly_log',JSON.stringify(weeklyStudyLog));
  localStorage.setItem('sd_night_owl',nightOwl?'1':'0');
  localStorage.setItem('sd_early_bird',earlyBird?'1':'0');
  localStorage.setItem('sd_xp',xp);
  localStorage.setItem('sd_level',level);
  localStorage.setItem('sd_name',userName);
  localStorage.setItem('sd_pfp',userPfp);
  localStorage.setItem('sd_saved_at',Date.now());
}
const COLORS=['#e8708a','#f2a98a','#c5b4e3','#a8c5a0','#7bb8d4','#f4c88a','#e89ab4','#9bc4ae'];

// ── DARK MODE ──
function toggleDark(){
  darkMode=!darkMode;
  applyDark();
  saveLocal();
}
function applyDark(){
  document.documentElement.setAttribute('data-theme',darkMode?'dark':'light');
}

// ── MUSHROOM COIN SYSTEM ──
function awardCoins(amount,reason){
  mushroomCoins+=amount;
  saveLocal();
  updateCoinDisplay();
  showCoinPopup(`+${amount} 🍄`,reason);
}
function updateCoinDisplay(){
  document.getElementById('coinDisplay').textContent=mushroomCoins;
  const mc=document.getElementById('mobileCoinDisplay');
  if(mc)mc.textContent=mushroomCoins;
  const sb=document.getElementById('shopCoinBalance');
  if(sb)sb.textContent=mushroomCoins;
}
function showCoinPopup(amt,reason){
  const el=document.getElementById('coinEarnPopup');
  document.getElementById('coinEarnAmt').textContent=amt;
  document.getElementById('coinEarnReason').textContent=reason;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.remove('show'),2800);
}

// ── XP SYSTEM ──
function awardXP(amount,reason){
  const oldLevel=getLevelInfo(xp);
  xp+=amount;
  const newLevel=getLevelInfo(xp);
  level=newLevel.level;
  saveLocal();
  updateXpDisplay();
  showXpPopup(`+${amount} XP`,reason);
  // Level up!
  if(newLevel.level>oldLevel.level){
    setTimeout(()=>showLevelUpPopup(newLevel),500);
  }
  // Sync to Firebase so others see your level
  if(currentRoomId)syncUser();
}
function updateXpDisplay(){
  const cur=getLevelInfo(xp);
  const next=getNextLevelInfo(xp);
  const pct=next?Math.round(((xp-cur.xpNeeded)/(next.xpNeeded-cur.xpNeeded))*100):100;
  const headerBar=document.getElementById('headerXpBar');
  const headerLvl=document.getElementById('headerLevelText');
  if(headerBar)headerBar.style.width=pct+'%';
  if(headerLvl)headerLvl.textContent=`LVL ${cur.level}`;
}
function showXpPopup(amt,reason){
  const el=document.getElementById('xpEarnPopup');
  if(!el)return;
  document.getElementById('xpEarnAmt').textContent=amt;
  document.getElementById('xpEarnReason').textContent=reason;
  el.classList.add('show');
  clearTimeout(el._xt);
  el._xt=setTimeout(()=>el.classList.remove('show'),2400);
}
function showLevelUpPopup(lvlInfo){
  const el=document.getElementById('levelupPopup');
  if(!el)return;
  document.getElementById('luLevelNum').textContent=`Level ${lvlInfo.level}`;
  document.getElementById('luLevelTitle').textContent=`${lvlInfo.icon} ${lvlInfo.title}`;
  el.classList.add('show');
  clearTimeout(el._lt);
  el._lt=setTimeout(()=>el.classList.remove('show'),3800);
}

// ── SHOP SYSTEM ──
function filterShop(type,btn){
  currentShopFilter=type;
  document.querySelectorAll('.shop-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  renderShop();
}
function renderShop(){
  const grid=document.getElementById('shopGrid');
  const items=currentShopFilter==='all'?SHOP_ITEMS:SHOP_ITEMS.filter(i=>i.type===currentShopFilter);
  grid.innerHTML=items.map(item=>{
    const owned=ownedItems.includes(item.id);
    const canAfford=mushroomCoins>=item.price;
    const typeLabel={theme:'🎨 Theme',badge:'🏅 Badge',title:'👑 Title'}[item.type];
    const typeCls={theme:'type-theme',badge:'type-badge',title:'type-title'}[item.type];
    let btnHtml='';
    if(owned){
      // For badge/title: show equip/unequip
      if(item.type==='badge'){
        const equipped=equippedBadges.includes(item.id);
        btnHtml=`<button class="shop-buy-btn owned-badge" onclick="toggleEquipBadge('${item.id}')">${equipped?'✓ Equipped · Click to Unequip':'Equip Badge'}</button>`;
      } else if(item.type==='title'){
        const equipped=equippedTitle===item.id;
        btnHtml=`<button class="shop-buy-btn owned-badge" onclick="equipTitle('${item.id}')">${equipped?'✓ Title Active':'Set as Title'}</button>`;
      } else if(item.type==='theme'){
        const equipped=equippedTheme===item.id;
        btnHtml=`<button class="shop-buy-btn owned-badge" onclick="equipTheme('${item.id}')">${equipped?'✓ Active Theme':'Apply Theme'}</button>`;
      }
    } else {
      btnHtml=`<button class="shop-buy-btn ${canAfford?'can-buy':'no-funds'}" onclick="${canAfford?`buyItem('${item.id}')`:''}">${canAfford?`Buy · 🍄 ${item.price}`:`Need 🍄 ${item.price-mushroomCoins} more`}</button>`;
    }
    return`<div class="shop-item ${owned?'owned':''}">
      <span class="shop-item-type ${typeCls}">${typeLabel}</span>
      <div class="shop-item-preview">${item.preview}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-desc">${item.desc}</div>
      <div class="shop-item-price"><span class="coin-sm">🍄</span>${item.price} coins</div>
      ${btnHtml}
    </div>`;
  }).join('');
}
function buyItem(id){
  const item=SHOP_ITEMS.find(i=>i.id===id);
  if(!item||ownedItems.includes(id))return;
  if(mushroomCoins<item.price){showToast('Not enough Mushroom Coins! 🍄');return;}
  mushroomCoins-=item.price;
  ownedItems.push(id);
  saveLocal();
  updateCoinDisplay();
  renderShop();
  showToast(`✅ Purchased: ${item.name}!`);
  // Auto-equip on first purchase
  if(item.type==='badge')toggleEquipBadge(id,true);
  if(item.type==='title')equipTitle(id);
  if(item.type==='theme')equipTheme(id);
}
function toggleEquipBadge(id,forceEquip=false){
  if(!ownedItems.includes(id))return;
  if(forceEquip||!equippedBadges.includes(id)){
    if(equippedBadges.length>=4&&!equippedBadges.includes(id)){showToast('Max 4 badges equipped! Unequip one first.');return;}
    if(!equippedBadges.includes(id))equippedBadges.push(id);
  } else {
    equippedBadges=equippedBadges.filter(b=>b!==id);
  }
  saveLocal();renderShop();updateEquippedDisplay();syncUser();
  showToast(equippedBadges.includes(id)?'Badge equipped! ✨':'Badge unequipped.');
}
function equipTitle(id){
  if(!ownedItems.includes(id))return;
  equippedTitle=equippedTitle===id?'':id;
  saveLocal();renderShop();updateEquippedDisplay();syncUser();
  const item=SHOP_ITEMS.find(i=>i.id===id);
  showToast(equippedTitle===id?`Title "${item?.titleText}" equipped! 👑`:'Title removed.');
}
function equipTheme(id){
  if(!ownedItems.includes(id))return;
  const wasEquipped=equippedTheme===id;
  equippedTheme=wasEquipped?'':id;
  applyShopTheme();
  saveLocal();renderShop();updateEquippedDisplay();
  showToast(wasEquipped?'Theme removed.':'Theme applied! 🎨');
}
function applyShopTheme(){
  // Themes just modify CSS variables via data-shoptheme attribute
  document.documentElement.setAttribute('data-shoptheme',equippedTheme||'');
  // Apply theme overrides
  const el=document.documentElement;
  if(equippedTheme==='theme_night'){
    if(!darkMode){darkMode=true;applyDark();}
  } else if(equippedTheme==='theme_forest'){
    el.style.setProperty('--pink','#6da861');el.style.setProperty('--pink2','#8bc47f');el.style.setProperty('--pink3','rgba(109,168,97,.12)');el.style.setProperty('--rose','#4a8f50');el.style.setProperty('--grad','linear-gradient(135deg,#6da861,#a8c5a0)');
  } else if(equippedTheme==='theme_ocean'){
    el.style.setProperty('--pink','#2980b9');el.style.setProperty('--pink2','#5dade2');el.style.setProperty('--pink3','rgba(41,128,185,.12)');el.style.setProperty('--rose','#1a6a99');el.style.setProperty('--grad','linear-gradient(135deg,#2980b9,#5dade2)');
  } else if(equippedTheme==='theme_sakura'){
    el.style.setProperty('--pink','#ff6b9d');el.style.setProperty('--pink2','#ff8eb5');el.style.setProperty('--pink3','rgba(255,107,157,.12)');el.style.setProperty('--rose','#e0527a');el.style.setProperty('--grad','linear-gradient(135deg,#ff6b9d,#ffb3d1)');
  } else if(equippedTheme==='theme_gold'){
    el.style.setProperty('--pink','#d4a017');el.style.setProperty('--pink2','#e8b830');el.style.setProperty('--pink3','rgba(212,160,23,.12)');el.style.setProperty('--rose','#b8860b');el.style.setProperty('--grad','linear-gradient(135deg,#d4a017,#f0c040)');
  } else {
    // Reset to default
    el.style.removeProperty('--pink');el.style.removeProperty('--pink2');el.style.removeProperty('--pink3');el.style.removeProperty('--rose');el.style.removeProperty('--grad');
  }
}
function updateEquippedDisplay(){
  const el=document.getElementById('equippedDisplay');
  const parts=[];
  if(equippedTitle){const t=SHOP_ITEMS.find(i=>i.id===equippedTitle);if(t)parts.push(`Title: <strong>"${t.titleText}"</strong>`);}
  if(equippedBadges.length){const badges=equippedBadges.map(id=>{const i=SHOP_ITEMS.find(x=>x.id===id);return i?i.preview:''}).join(' ');parts.push(`Badges: ${badges}`);}
  if(equippedTheme){const t=SHOP_ITEMS.find(i=>i.id===equippedTheme);if(t)parts.push(`Theme: ${t.icon} ${t.name}`);}
  el.innerHTML=parts.length?parts.join('<br>'):' No cosmetics equipped yet. Visit the Shop! 🍄';
}

// ── QUICK NOTES ──
function saveQuickNotes(){
  const txt=document.getElementById('quickNotesArea');
  if(!txt)return;
  localStorage.setItem('sd_quick_notes',txt.value);
  showToast('Notes saved! 📝');
}
function loadQuickNotes(){
  const txt=document.getElementById('quickNotesArea');
  if(!txt)return;
  txt.value=localStorage.getItem('sd_quick_notes')||'';
}
function updateQuickStats(){
  const totalMins=subjects.reduce((a,s)=>a+s.totalMins,0);
  const qh=document.getElementById('quickTotalHrs');
  const qp=document.getElementById('quickPomos');
  const qs=document.getElementById('quickStreak');
  const qx=document.getElementById('quickXp');
  if(qh)qh.textContent=formatMins(totalMins)||'0m';
  if(qp)qp.textContent='🍅 '+pomoSessions;
  if(qs)qs.textContent='🔥 '+pomoStreak;
  if(qx)qx.textContent='⭐ '+xp;
  // Update missions widget
  try{
    const todayKey=getTodayKey();
    const done=(completedMissions[todayKey]||[]).length;
    const total=typeof DAILY_MISSIONS!=='undefined'?DAILY_MISSIONS.length:5;
    const mt=document.getElementById('todayMissionsText');
    if(mt){
      if(done>=total)mt.innerHTML='<span style="color:var(--sage);font-weight:700">All done! 🎉</span>';
      else mt.textContent=done+'/'+total+' completed today · tap to view';
    }
  }catch(e){}
}
window.saveQuickNotes=saveQuickNotes;
window.updateQuickStats=updateQuickStats;

// ── MOTIVATIONAL QUOTES ──
const MOTIV_QUOTES=[
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"It always seems impossible until it's done." — Nelson Mandela',
  '"Success is the sum of small efforts, repeated day in and day out." — R. Collier',
  '"You don't have to be great to start, but you have to start to be great." — Zig Ziglar',
  '"Study hard, for the well is deep and our brains are shallow." — Richard Baxter',
  '"The expert in anything was once a beginner." — Helen Hayes',
  '"Push yourself, because no one else is going to do it for you." — Unknown',
  '"Great things never come from comfort zones." — Unknown',
  '"Dream it. Believe it. Build it." — Unknown',
  '"Education is the most powerful weapon which you can use to change the world." — N. Mandela',
  '"The beautiful thing about learning is that no one can take it away from you." — B.B. King',
  '"Don't watch the clock; do what it does. Keep going." — Sam Levenson',
  '"Concentrate all your thoughts upon the work in hand." — Alexander Graham Bell',
  '"Learning is not attained by chance, it must be sought with ardor." — Abigail Adams',
  '"The more that you read, the more things you will know." — Dr. Seuss',
];
let motivQuoteIdx=Math.floor(Math.random()*MOTIV_QUOTES.length);
function rotateMotivQuote(){
  motivQuoteIdx=(motivQuoteIdx+1)%MOTIV_QUOTES.length;
  const el=document.getElementById('motivQuoteText');
  if(el){el.style.opacity='0';setTimeout(()=>{el.textContent='"'+MOTIV_QUOTES[motivQuoteIdx].split('"')[1]+'"';const attr=MOTIV_QUOTES[motivQuoteIdx].split('"')[2];if(attr)el.textContent+=attr;el.style.opacity='1';},200);}
}
window.rotateMotivQuote=rotateMotivQuote;
// Set initial quote
setTimeout(()=>{const el=document.getElementById('motivQuoteText');if(el)el.textContent=MOTIV_QUOTES[motivQuoteIdx];},100);

// ── AI STUDY PLAN GENERATOR (new feature) ──
async function generateStudyPlan(){
  const btn=document.getElementById('studyPlanBtn');
  const output=document.getElementById('studyPlanOutput');
  if(!output)return;
  const apiKey=getGeminiKey();
  if(!apiKey){openApiKeyModal();showToast('Set up your AI key first! 🔑');return;}
  btn.textContent='⏳ Generating…';btn.disabled=true;
  output.style.display='block';
  output.innerHTML='<div style="display:flex;align-items:center;gap:10px;color:var(--muted);padding:16px"><div style="width:22px;height:22px;border:2.5px solid var(--border);border-top-color:var(--pink);border-radius:50%;animation:spin .8s linear infinite"></div><span style="font-size:.85rem">AI is crafting your study plan…</span></div>';
  const subjectList=subjects.length?subjects.map(s=>`${s.name} (${formatMins(s.totalMins)} studied)`).join(', '):'No subjects tracked yet';
  const totalMins=subjects.reduce((a,s)=>a+s.totalMins,0);
  const prompt=`Create a practical 7-day weekly study plan for a student with the following profile:
- Subjects being studied: ${subjectList}
- Total study time logged: ${formatMins(totalMins)}
- Current streak: ${pomoStreak} days
- Pomodoro sessions completed: ${pomoSessions}

Format as a clean day-by-day plan (Monday to Sunday). For each day include: subject focus, suggested hours, and one specific tip. Keep it motivating, realistic and actionable. Use emojis. Be concise.`;
  try{
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
    });
    const data=await res.json();
    const text=data?.candidates?.[0]?.content?.parts?.[0]?.text||'Could not generate plan.';
    output.innerHTML='<div style="font-size:.68rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📋 Your Personalized Weekly Study Plan</div><div style="font-size:.85rem;line-height:1.75;color:var(--text2);white-space:pre-wrap">'+text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>')+'</div>';
    showToast('Study plan ready! 📋');
  }catch(e){
    output.innerHTML='<div style="color:var(--muted);text-align:center;padding:16px;font-size:.85rem">Could not generate plan. Check your AI key and connection.</div>';
  }
  btn.textContent='🔄 Regenerate Plan';btn.disabled=false;
}
window.generateStudyPlan=generateStudyPlan;

// ── FOCUS MODE ──
let focusModeActive=false;
function toggleFocusMode(){
  focusModeActive=!focusModeActive;
  const sidebar=document.getElementById('appSidebar');
  const bottomNav=document.getElementById('mobileBottomNav');
  const mobileHeader=document.getElementById('mobileHeader');
  const btn=document.getElementById('focusModeBtn');
  if(focusModeActive){
    if(sidebar)sidebar.style.display='none';
    if(bottomNav)bottomNav.style.display='none';
    if(mobileHeader)mobileHeader.style.display='none';
    if(btn)btn.textContent='✖ Exit Focus';
    document.body.style.background='var(--bg)';
    showToast('🎯 Focus Mode — all distractions hidden');
  }else{
    if(sidebar)sidebar.style.display='';
    if(bottomNav)bottomNav.style.display='';
    if(mobileHeader)mobileHeader.style.display='';
    if(btn)btn.textContent='🎯';
    showToast('Focus Mode off');
  }
}
window.toggleFocusMode=toggleFocusMode;

// EXPOSE GLOBALS
window.createRoom=createRoom;window.joinRoom=joinRoom;window.showRoomCode=showRoomCode;
window.postGoal=postGoal;window.deleteGoal=deleteGoal;window.react=react;
window.sendChat=sendChat;window.chatEnter=chatEnter;window.deleteChatMsg=deleteChatMsg;
window.goToRoom=goToRoom;window.onPfpChosen=onPfpChosen;window.onPfpChosen2=onPfpChosen2;
window.onGoalFileChosen=onGoalFileChosen;window.clearGoalFile=clearGoalFile;
window.switchTab=switchTab;window.setPomoMode=setPomoMode;window.togglePomo=togglePomo;
window.resetPomo=resetPomo;window.resetStreak=resetStreak;window.applySettings=applySettings;
window.openLightbox=openLightbox;window.closeLightbox=closeLightbox;
window.loadPlaylist=loadPlaylist;window.loadCustomSpotify=loadCustomSpotify;
window.addSubject=addSubject;window.deleteSubject=deleteSubject;window.toggleSubjectTimer=toggleSubjectTimer;
window.toggleComments=toggleComments;window.submitComment=submitComment;window.deleteComment=deleteComment;
window.openProfileModal=openProfileModal;window.closeProfileModal=closeProfileModal;window.saveProfile=saveProfile;
window.toggleDark=toggleDark;
window.filterShop=filterShop;window.buyItem=buyItem;window.toggleEquipBadge=toggleEquipBadge;window.equipTitle=equipTitle;window.equipTheme=equipTheme;
window.openSwitchPanel=openSwitchPanel;window.closeSwitchPanel=closeSwitchPanel;window.switchToRoom=switchToRoom;window.leaveRoom=leaveRoom;window.openAddRoomFromPanel=openAddRoomFromPanel;
window.removeFromSaved=removeFromSaved;
window.broadcastStudyStatus=broadcastStudyStatus;window.clearStudyStatus=clearStudyStatus;

// ── INIT ──
async function init(){
  userId=localStorage.getItem('sd_uid')||(()=>{const id=genUid();localStorage.setItem('sd_uid',id);return id;})();
  userName=localStorage.getItem('sd_name')||'';
  userPfp=localStorage.getItem('sd_pfp')||'';
  subjects=JSON.parse(localStorage.getItem('sd_subjects')||'[]');
  pomoSessions=parseInt(localStorage.getItem('sd_pomo_sessions')||'0');
  pomoFocusMin=parseInt(localStorage.getItem('sd_pomo_focus')||'0');
  pomoStreak=parseInt(localStorage.getItem('sd_streak')||'0');
  lastStudyDay=localStorage.getItem('sd_lastday')||'';
  unlockedBadges=JSON.parse(localStorage.getItem('sd_unlocked')||'[]');
  currentRoomId=localStorage.getItem('sd_room_id')||'';
  currentRoomName=localStorage.getItem('sd_room_name')||'';
  mushroomCoins=parseInt(localStorage.getItem('sd_coins')||'0');
  ownedItems=JSON.parse(localStorage.getItem('sd_owned_items')||'[]');
  equippedTitle=localStorage.getItem('sd_equipped_title')||'';
  equippedBadges=JSON.parse(localStorage.getItem('sd_equipped_badges')||'[]');
  equippedTheme=localStorage.getItem('sd_equipped_theme')||'';
  savedRooms=JSON.parse(localStorage.getItem('sd_saved_rooms')||'[]');
  darkMode=localStorage.getItem('sd_dark')==='1';
  completedMissions=JSON.parse(localStorage.getItem('sd_completed_missions')||'{}');
  missionStreak=parseInt(localStorage.getItem('sd_mission_streak')||'0');
  lastMissionDay=localStorage.getItem('sd_last_mission_day')||'';
  missionsCompleted=parseInt(localStorage.getItem('sd_missions_completed')||'0');
  plannerData=JSON.parse(localStorage.getItem('sd_planner')||'{}');
  plannerTasks=parseInt(localStorage.getItem('sd_planner_tasks')||'0');
  weeklyStudyLog=JSON.parse(localStorage.getItem('sd_weekly_log')||'{}');
  nightOwl=localStorage.getItem('sd_night_owl')==='1';
  earlyBird=localStorage.getItem('sd_early_bird')==='1';
  xp=parseInt(localStorage.getItem('sd_xp')||'0');
  level=parseInt(localStorage.getItem('sd_level')||'1');

  // ── Try loading from Firebase cloud (syncs progress across devices) ──
  // Skip cloud load if we have recent local data (< 30 minutes old) to avoid slow login
  const hasLocalData=!!localStorage.getItem('sd_name');
  const localSavedAt=parseInt(localStorage.getItem('sd_saved_at')||'0');
  const localIsRecent=(Date.now()-localSavedAt)<30*60*1000;
  let loadedFromCloud=false;
  if(!hasLocalData||!localIsRecent){
    if(!hasLocalData)showCloudLoadingBanner('☁️ Checking for saved progress…');
    loadedFromCloud=await loadProfileFromCloud(userId);
    hideCloudLoadingBanner();
  }
  if(loadedFromCloud){
    // Update room from cloud if we have one
    if(userName)localStorage.setItem('sd_name',userName);
    if(userPfp)localStorage.setItem('sd_pfp',userPfp);
    currentRoomId=localStorage.getItem('sd_room_id')||currentRoomId||'';
    currentRoomName=localStorage.getItem('sd_room_name')||currentRoomName||'';
    if(savedRooms.length&&currentRoomId){
      const found=savedRooms.find(r=>r.id===currentRoomId);
      if(!found&&currentRoomId)savedRooms.push({id:currentRoomId,name:currentRoomName});
    }
  }

  applyDark();
  applyShopTheme();
  updateCoinDisplay();
  updateXpDisplay();

  const cp=document.getElementById('colorPicker');
  COLORS.forEach(c=>{const d=document.createElement('div');d.className='color-dot'+(c===selectedColor?' selected':'');d.style.background=c;d.onclick=()=>{selectedColor=c;document.querySelectorAll('.color-dot').forEach(x=>x.classList.remove('selected'));d.classList.add('selected');};cp.appendChild(d);});

  checkStreak();updatePomoStats();updatePomoDisplay();renderSubjects();renderBadges();loadPetState();
  renderMissions();startMissionTimer();

  if(!userName){document.getElementById('onboardModal').classList.remove('hidden');return;}
  if(currentRoomId){
    if(!savedRooms.find(r=>r.id===currentRoomId)){
      savedRooms.push({id:currentRoomId,name:currentRoomName});saveLocal();
    }
    enterApp();
  } else {
    showRoomLobby();
  }
}
function showCloudLoadingBanner(msg){
  let el=document.getElementById('cloudLoadBanner');
  if(!el){el=document.createElement('div');el.id='cloudLoadBanner';el.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:var(--grad);color:white;text-align:center;padding:10px;font-size:.82rem;font-weight:700;letter-spacing:.3px;';document.body.appendChild(el);}
  el.textContent=msg;el.style.display='block';
}
function hideCloudLoadingBanner(){
  const el=document.getElementById('cloudLoadBanner');
  if(el)el.style.display='none';
}

function checkStreak(){const today=new Date().toDateString();if(lastStudyDay&&lastStudyDay!==today){const y=new Date();y.setDate(y.getDate()-1);if(lastStudyDay!==y.toDateString())pomoStreak=0;}}

// ── ONBOARD ──
function onPfpChosen2(input){
  const file=input.files[0];if(!file)return;
  if(file.size>2*1024*1024){showToast('Max 2MB');return;}
  const r=new FileReader();r.onload=e=>{tempPfpData2=e.target.result;document.getElementById('pfpPreviewImg2').src=tempPfpData2;document.getElementById('pfpPreviewImg2').style.display='block';document.getElementById('pfpEmoji2').style.display='none';};r.readAsDataURL(file);
}
function goToRoom(){
  const name=document.getElementById('nameInput2').value.trim();
  if(!name){showToast('Enter your name first!');return;}
  userName=name;if(tempPfpData2)userPfp=tempPfpData2;
  localStorage.setItem('sd_name',userName);localStorage.setItem('sd_pfp',userPfp);
  // Immediately push to cloud so this device is remembered
  if(userId) set(ref(db,`profiles/${userId}`),getCloudPayload()).catch(()=>{});
  document.getElementById('onboardModal').classList.add('hidden');
  showRoomLobby();
}

// ── ROOM LOBBY ──
function showRoomLobby(){
  document.getElementById('roomLobby').classList.remove('hidden');
  document.getElementById('appWrap').style.display='none';
  renderMyRoomsList();
}
function renderMyRoomsList(){
  const sec=document.getElementById('myRoomsSection');
  const list=document.getElementById('myRoomsList');
  if(!savedRooms.length){sec.style.display='none';return;}
  sec.style.display='block';
  list.innerHTML=savedRooms.map(r=>`
    <div class="my-room-item" onclick="quickJoinRoom('${r.id}','${esc(r.name)}')">
      <div class="room-dot"></div>
      <div class="room-name">${esc(r.name)}</div>
      <div class="room-code-badge">${r.id}</div>
      <button class="room-leave-btn" onclick="event.stopPropagation();removeFromSaved('${r.id}')" title="Remove">✕</button>
    </div>`).join('');
}
function removeFromSaved(id){
  savedRooms=savedRooms.filter(r=>r.id!==id);
  saveLocal();renderMyRoomsList();
  if(id===currentRoomId){currentRoomId='';currentRoomName='';localStorage.removeItem('sd_room_id');localStorage.removeItem('sd_room_name');}
}
function quickJoinRoom(id,name){
  currentRoomId=id;currentRoomName=name;
  localStorage.setItem('sd_room_id',id);localStorage.setItem('sd_room_name',name);
  document.getElementById('roomLobby').classList.add('hidden');
  enterApp();showToast(`Joined "${name}"! 🎉`);
}

function createRoom(){
  const name=document.getElementById('newRoomName').value.trim();
  if(!name){showToast('Enter a room name!');return;}
  if(!userName){showToast('Set up your profile first!');return;}
  const btn=document.getElementById('createRoomBtn')||document.querySelector('[onclick="createRoom()"]');
  if(btn){btn.textContent='Creating…';btn.disabled=true;}
  const code=genCode();
  const roomData={name,code,createdBy:userName,createdAt:Date.now()};
  set(ref(db,`rooms/${code}`),roomData).then(()=>{
    currentRoomId=code;currentRoomName=name;
    localStorage.setItem('sd_room_id',code);localStorage.setItem('sd_room_name',name);
    if(!savedRooms.find(r=>r.id===code))savedRooms.push({id:code,name});
    saveLocal();
    showRoomCodeModal(code,name);
    document.getElementById('roomLobby').classList.add('hidden');
    enterApp();
  }).catch(err=>{
    showToast('Could not create room — check your connection 📶');
    if(btn){btn.textContent='Create Room →';btn.disabled=false;}
  });
}
function joinRoom(){
  const code=document.getElementById('joinCodeInput').value.trim().toUpperCase();
  if(code.length!==6){showToast('Enter a 6-character code!');return;}
  if(!userName){showToast('Set up your profile first!');return;}
  const btn=document.getElementById('joinRoomBtn')||document.querySelector('[onclick="joinRoom()"]');
  if(btn){btn.textContent='Joining…';btn.disabled=true;}
  get(ref(db,`rooms/${code}`)).then(snap=>{
    if(btn){btn.textContent='Join Room →';btn.disabled=false;}
    if(!snap.exists()){showToast('Room not found! Check the code.');return;}
    const room=snap.val();
    currentRoomId=code;currentRoomName=room.name;
    localStorage.setItem('sd_room_id',code);localStorage.setItem('sd_room_name',room.name);
    if(!savedRooms.find(r=>r.id===code))savedRooms.push({id:code,name:room.name});
    saveLocal();
    document.getElementById('roomLobby').classList.add('hidden');
    enterApp();
    showToast(`Joined "${room.name}"! 🎉`);
  }).catch(()=>{
    const btn2=document.getElementById('joinRoomBtn')||document.querySelector('[onclick="joinRoom()"]');
    if(btn2){btn2.textContent='Join Room →';btn2.disabled=false;}
    showToast('Could not reach server — check your connection 📶');
  });
}
function showRoomCodeModal(code,name){
  const html=`<div style="position:fixed;inset:0;z-index:500;background:var(--overlay-bg);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px" id="codeModal">
    <div style="background:var(--white);border:1px solid var(--border);border-radius:28px;padding:40px;max-width:380px;width:100%;text-align:center;box-shadow:var(--sh-lg)">
      <div style="font-size:2rem;margin-bottom:12px">🎉</div>
      <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;margin-bottom:6px;color:var(--text)">Room Created!</div>
      <div style="color:var(--muted);font-size:.85rem;margin-bottom:20px">Share this code with friends to join <strong>${esc(name)}</strong></div>
      <div class="room-code-display" onclick="copyCode('${code}')">${code}</div>
      <div class="copy-hint">Click to copy code</div>
      <button class="btn btn-primary" onclick="document.getElementById('codeModal').remove()" style="width:100%;justify-content:center;border-radius:14px">Start Studying! →</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
window.copyCode=function(code){navigator.clipboard.writeText(code).then(()=>showToast('Code copied! 📋')).catch(()=>{const el=document.createElement('textarea');el.value=code;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();showToast('Code copied! 📋');});};

// ── CHAT TAB (dedicated chat page) ──
function chatEnterTab(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatTab();}}
function sendChatTab(){
  const input=document.getElementById('chatInputTab');
  if(!input)return;
  const text=input.value.trim();if(!text)return;
  if(!userName)return;
  push(ref(db,`rooms/${currentRoomId}/messages`),{author:userName,pfp:userPfp,uid:userId,text,time:fmtTime(),timestamp:Date.now()});
  input.value='';input.style.height='auto';
}
function renderChatTab(){
  const box=document.getElementById('chatMsgsTab');
  if(!box)return;
  const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  const sysNote=box.querySelector('.sys-note');
  const entries=Object.entries(allMessages).sort((a,b)=>a[1].timestamp-b[1].timestamp);
  const html=entries.map(([key,m])=>{
    const own=m.uid===userId||m.author===userName;
    const[bg,fg]=getAv(m.author);
    const avHtml=m.pfp?`<img src="${m.pfp}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:.58rem;font-weight:800;color:${fg}">${initial(m.author)}</span>`;
    const delBtn=own?`<button class="msg-del-btn" onclick="deleteChatMsg('${key}')">Delete</button>`:'';
    return`<div class="chat-msg ${own?'own':''}">
      <div class="chat-av" style="${m.pfp?'':` background:${bg};`}">${avHtml}</div>
      <div class="msg-wrap">${!own?`<div class="msg-name">${esc(m.author)}</div>`:''}<div class="bubble">${esc(m.text)}</div><div class="msg-time">${m.time}</div>${delBtn}</div>
    </div>`;
  }).join('');
  box.innerHTML=(sysNote?sysNote.outerHTML:'')+html;
  if(atBottom||entries.length<=1)box.scrollTop=box.scrollHeight;
  // sync online count
  const onlineEl=document.getElementById('onlineCountChatTab');
  const mainOnline=document.getElementById('onlineCountChat');
  if(onlineEl&&mainOnline)onlineEl.textContent=mainOnline.textContent;
}
window.chatEnterTab=chatEnterTab;window.sendChatTab=sendChatTab;
const chatTabInput=document.getElementById('chatInputTab');
if(chatTabInput)chatTabInput.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,80)+'px';});

function showRoomCode(){
  showToast(`Room code: ${currentRoomId} (tap to copy)`);
  navigator.clipboard.writeText(currentRoomId).catch(()=>{});
}

// ── MULTI-ROOM SWITCH PANEL ──
function openSwitchPanel(){
  renderSwitchRooms();
  document.getElementById('switchRoomPanel').classList.remove('hidden');
}
function closeSwitchPanel(){
  document.getElementById('switchRoomPanel').classList.add('hidden');
}
function renderSwitchRooms(){
  const list=document.getElementById('switchRoomsList');
  if(!savedRooms.length){list.innerHTML=`<div style="text-align:center;padding:20px;color:var(--muted);font-size:.85rem">No saved rooms yet. Join or create one!</div>`;return;}
  list.innerHTML=savedRooms.map(r=>{
    const isCurrent=r.id===currentRoomId;
    return`<div class="switch-room-row ${isCurrent?'current':''}" onclick="${isCurrent?'':'switchToRoom(\''+r.id+'\',\''+esc(r.name)+'\')'}">
      <div class="sr-dot"></div>
      <div class="sr-name">${esc(r.name)}</div>
      <div class="sr-code">${r.id}</div>
      ${isCurrent?'<span class="sr-current-label">Current</span>':''}
      <button class="sr-leave" onclick="event.stopPropagation();leaveRoom('${r.id}')" title="Leave room">✕</button>
    </div>`;
  }).join('');
}
function switchToRoom(id,name){
  if(id===currentRoomId){closeSwitchPanel();return;}
  // Remove presence from old room
  if(currentRoomId&&userId){
    remove(ref(db,`rooms/${currentRoomId}/presence/${userId}`)).catch(()=>{});
    clearStudyStatus();
  }
  currentRoomId=id;currentRoomName=name;
  localStorage.setItem('sd_room_id',id);localStorage.setItem('sd_room_name',name);
  closeSwitchPanel();
  enterApp();
  showToast(`Switched to "${name}" 🚪`);
}
function leaveRoom(id){
  if(!confirm('Leave this room? You can rejoin later with the code.'))return;
  savedRooms=savedRooms.filter(r=>r.id!==id);
  if(id===currentRoomId){
    remove(ref(db,`rooms/${id}/presence/${userId}`)).catch(()=>{});
    currentRoomId='';currentRoomName='';
    localStorage.removeItem('sd_room_id');localStorage.removeItem('sd_room_name');
    saveLocal();
    closeSwitchPanel();
    showRoomLobby();
  } else {
    saveLocal();
    renderSwitchRooms();
    showToast('Left room.');
  }
}
function openAddRoomFromPanel(){
  closeSwitchPanel();
  // Remove from app, show lobby
  document.getElementById('appWrap').style.display='none';
  document.getElementById('roomLobby').classList.remove('hidden');
  renderMyRoomsList();
}

function enterApp(){
  document.getElementById('roomLobby').classList.add('hidden');
  document.getElementById('appWrap').style.display='block';
  updateHeader();
  loadPetState();updateAvatarInHeader();
  subscribeFirebase();
  setupPresence();
  // Init pomodoro display so time & stats show immediately
  setTimeout(()=>{updatePomoDisplay();updatePomoStats();updateQuickStats();loadQuickNotes();},50);
}

// ── PROFILE MODAL ──
function openProfileModal(){
  document.getElementById('nameInput').value=userName;
  if(userPfp){document.getElementById('pfpPreviewImg').src=userPfp;document.getElementById('pfpPreviewImg').style.display='block';document.getElementById('pfpEmoji').style.display='none';}
  updateEquippedDisplay();
  // Update XP display in modal
  const cur=getLevelInfo(xp);
  const next=getNextLevelInfo(xp);
  const pct=next?Math.round(((xp-cur.xpNeeded)/(next.xpNeeded-cur.xpNeeded))*100):100;
  const lvlLabel=document.getElementById('profileLevelLabel');
  const xpBar=document.getElementById('profileXpBar');
  const xpCur=document.getElementById('profileXpCurrent');
  const xpNxt=document.getElementById('profileXpNext');
  if(lvlLabel)lvlLabel.textContent=`${cur.icon} Level ${cur.level} · ${cur.title}`;
  if(xpBar)xpBar.style.width=pct+'%';
  if(xpCur)xpCur.textContent=`${xp} XP`;
  if(xpNxt)xpNxt.textContent=next?`Next: ${next.xpNeeded} XP`:'Max Level! 🌟';
  document.getElementById('profileModal').classList.remove('hidden');
}
function closeProfileModal(){document.getElementById('profileModal').classList.add('hidden');}
function onPfpChosen(input){const file=input.files[0];if(!file)return;if(file.size>2*1024*1024){showToast('Max 2MB');return;}const r=new FileReader();r.onload=e=>{tempPfpData=e.target.result;document.getElementById('pfpPreviewImg').src=tempPfpData;document.getElementById('pfpPreviewImg').style.display='block';document.getElementById('pfpEmoji').style.display='none';};r.readAsDataURL(file);}
function saveProfile(){
  const name=document.getElementById('nameInput').value.trim();
  if(!name){showToast('Enter your name!');return;}
  userName=name;if(tempPfpData)userPfp=tempPfpData;
  localStorage.setItem('sd_name',userName);localStorage.setItem('sd_pfp',userPfp);
  // Push to cloud immediately
  if(userId) set(ref(db,`profiles/${userId}`),getCloudPayload()).catch(()=>{});
  updateHeader();loadPetState();updateAvatarInHeader();syncUser();closeProfileModal();
  showToast('Profile updated! ✨');
}

function updateRoomInfoBar(){
  const nameEl=document.getElementById('roomInfoName');
  const codeEl=document.getElementById('roomInfoCode');
  if(nameEl)nameEl.textContent=currentRoomName||'No Room';
  if(codeEl)codeEl.textContent=currentRoomId||'—';
}
function updateHeader(){
  document.getElementById('chipName').textContent=userName;
  document.getElementById('headerRoomName').textContent=currentRoomName;
  document.getElementById('postName').textContent=userName;
  // Mobile header sync
  const mobileRoom=document.getElementById('mobileRoomName');
  if(mobileRoom)mobileRoom.textContent=currentRoomName||'Room';
  const chipAv=document.getElementById('chipAv');
  const[bg,fg]=getAv(userName);
  if(userPfp){
    chipAv.innerHTML=`<img src="${userPfp}" style="width:100%;height:100%;object-fit:cover">`;
    const mobAv=document.getElementById('mobileAvatar');
    if(mobAv)mobAv.innerHTML=`<img src="${userPfp}" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    chipAv.style.background=bg;chipAv.style.color=fg;
    chipAv.innerHTML=`<span style="font-size:.68rem;font-weight:800">${initial(userName)}</span>`;
    const mobAv=document.getElementById('mobileAvatar');
    if(mobAv){mobAv.style.background=bg;mobAv.style.color=fg;mobAv.innerHTML=`<span id="mobileChipInitial" style="font-size:.68rem;font-weight:800">${initial(userName)}</span>`;}
  }
  const pa=document.getElementById('postAvatar');
  if(userPfp){pa.style.cssText='width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0';pa.innerHTML=`<img src="${userPfp}" style="width:100%;height:100%;object-fit:cover">`;}
  else{pa.style.cssText=`width:42px;height:42px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0`;pa.textContent=initial(userName);}
}

// ── TABS ──
function switchTab(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const pg=document.getElementById('page-'+id);
  if(!pg)return;
  pg.classList.add('active');
  if(btn){try{btn.classList.add('active');}catch(e){}}
  // Sync mobile bottom nav
  document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('active'));
  const mobBtn=document.getElementById('mob-'+id);
  if(mobBtn){
    mobBtn.classList.add('active');
    // Scroll mobile nav so the active button is visible
    const nav=document.getElementById('mobileBottomNav');
    if(nav){
      const btnLeft=mobBtn.offsetLeft;
      const btnWidth=mobBtn.offsetWidth;
      const navWidth=nav.offsetWidth;
      nav.scrollTo({left:btnLeft-(navWidth/2)+(btnWidth/2),behavior:'smooth'});
    }
  }
  // Sync mobile coin display
  const mc=document.getElementById('mobileCoinDisplay');
  if(mc)mc.textContent=mushroomCoins||0;
  if(id==='community')renderLeaderboard();
  if(id==='rewards')renderBadges();
  if(id==='shop'){renderShop();updateCoinDisplay();}
  if(id==='missions')renderMissions();
  if(id==='planner')renderPlanner();
  if(id==='report')renderReport();
  if(id==='pet'){loadPetState();renderPet();}
  if(id==='tracker')updatePomoSubjectSelect();
  if(id==='pomodoro'){updatePomoDisplay();updatePomoStats();}
  if(id==='flashcards')renderFlashcardDecks();
  if(id==='goals'){updateQuickStats();}
  if(id==='chat'){setTimeout(()=>renderChatTab(),50);}
  if(id==='aichat'){scrollAiChat();setTimeout(()=>{const b=document.getElementById('aiKeyBannerInChat');if(b&&!getGeminiKey())b.innerHTML='<div style="background:linear-gradient(135deg,var(--pink3),var(--gold-dim));border:1.5px solid rgba(232,112,138,.25);border-radius:14px;padding:14px 18px;margin-bottom:16px;text-align:center;cursor:pointer" onclick="openApiKeyModal()"><div style=\'font-size:1.2rem;margin-bottom:4px\'>🔑</div><div style=\'font-weight:800;font-size:.88rem;color:var(--rose);margin-bottom:3px\'>Set up your free AI key first</div><div style=\'font-size:.75rem;color:var(--muted)\'>Tap here to connect Google Gemini — it\'s free (1,500 req/day)</div></div>';},50);}
}

// ── PRESENCE ──
function setupPresence(){
  if(!userName||!currentRoomId)return;
  const myRef=ref(db,`rooms/${currentRoomId}/presence/${userId}`);
  set(myRef,{name:userName,pfp:userPfp,at:Date.now()});
  onDisconnect(myRef).remove();
  onValue(ref(db,`rooms/${currentRoomId}/presence`),snap=>{
    const n=Object.keys(snap.val()||{}).length;
    document.getElementById('onlineText').textContent=`${n} online`;
    document.getElementById('onlineCountChat').textContent=`${n} online`;
  });
}

// ── FIREBASE SUBS ──
let activeListeners=[];
function subscribeFirebase(){
  if(!currentRoomId)return;
  // Clean up old listeners if any
  activeListeners=[];
  onValue(ref(db,`rooms/${currentRoomId}/goals`),snap=>{allGoals=snap.val()||{};renderGoals();});
  onValue(ref(db,`rooms/${currentRoomId}/messages`),snap=>{allMessages=snap.val()||{};renderChat();renderChatTab();});
  onValue(ref(db,`rooms/${currentRoomId}/users`),snap=>{allUsers=snap.val()||{};});
  subscribeStudyingNow();
  syncUser();
}
function syncUser(){
  if(!userName||!currentRoomId)return;
  const totalMins=subjects.reduce((a,s)=>a+s.totalMins,0);
  const reactCount=parseInt(localStorage.getItem('sd_react_count')||'0');
  const goalCount=parseInt(localStorage.getItem('sd_goal_count')||'0');
  const titleItem=SHOP_ITEMS.find(i=>i.id===equippedTitle);
  const displayBadges=equippedBadges.map(id=>{const it=SHOP_ITEMS.find(i=>i.id===id);return it?it.preview:''}).filter(Boolean);
  const curLvl=getLevelInfo(xp);
  set(ref(db,`rooms/${currentRoomId}/users/${userId}`),{
    name:userName,pfp:userPfp,uid:userId,subjects,pomoSessions,pomoFocusMin,pomoStreak,
    totalMins,reactCount,goalCount,badges:unlockedBadges,
    equippedTitle:titleItem?titleItem.titleText:'',
    equippedTitleColor:titleItem?titleItem.titleColor:'',
    equippedBadgesDisplay:displayBadges,
    xp,level:curLvl.level,levelTitle:curLvl.title,levelIcon:curLvl.icon,
    updatedAt:Date.now()
  });
  checkBadges({totalMins,pomoSessions,pomoStreak,subjects,reactCount,goalCount,
    mushroomCoins,missionsCompleted,plannerTasks,nightOwl,earlyBird});
  updateQuickStats();
}

// ── BADGE SYSTEM ──
function checkBadges(stats){
  let newUnlocks=[];
  BADGES.forEach(b=>{
    if(!unlockedBadges.includes(b.id)&&b.check(stats)){unlockedBadges.push(b.id);newUnlocks.push(b);}
  });
  if(newUnlocks.length){saveLocal();newUnlocks.forEach((b,i)=>setTimeout(()=>showBadgePopup(b),i*1800));}
}
function showBadgePopup(b){
  const el=document.getElementById('badgePopup');
  document.getElementById('bupIcon').textContent=b.icon;
  document.getElementById('bupTitle').textContent='Badge Unlocked!';
  document.getElementById('bupDesc').textContent=b.name+' — '+b.desc;
  el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),4000);
}

function renderBadges(){
  const totalMins=subjects.reduce((a,s)=>a+s.totalMins,0);
  const reactCount=parseInt(localStorage.getItem('sd_react_count')||'0');
  const goalCount=parseInt(localStorage.getItem('sd_goal_count')||'0');
  const myRow=document.getElementById('myBadgesRow');
  const earned=BADGES.filter(b=>unlockedBadges.includes(b.id));
  if(!earned.length){myRow.innerHTML=`<div style="color:var(--muted);font-size:.85rem">Study to earn badges! 🌸</div>`;}
  else{myRow.innerHTML=earned.map(b=>`<div class="badge-pill" style="background:${b.color}18;color:${b.color};border-color:${b.color}40"><span class="b-icon">${b.icon}</span>${b.name}</div>`).join('');}
  document.getElementById('allBadgesGrid').innerHTML=BADGES.map(b=>{
    const unlocked=unlockedBadges.includes(b.id);
    let pct=0;
    if(b.id.startsWith('hours_')){const target=parseInt(b.id.split('_')[1])*60;pct=Math.min(100,Math.round(totalMins/target*100));}
    else if(b.id.startsWith('streak_')){const target=parseInt(b.id.split('_')[1]);pct=Math.min(100,Math.round(pomoStreak/target*100));}
    else if(b.id.startsWith('pomo_')){const target=parseInt(b.id.split('_')[1]);pct=Math.min(100,Math.round(pomoSessions/target*100));}
    else if(b.id==='subjects_3'){pct=Math.min(100,Math.round((subjects.length/3)*100));}
    else if(b.id==='first_goal'){pct=goalCount>=1?100:0;}
    else if(b.id==='social'){pct=Math.min(100,Math.round(reactCount/5*100));}
    else pct=unlocked?100:0;
    return`<div class="badge-card ${unlocked?'unlocked':''}">
      ${unlocked?`<div class="unlocked-stamp">EARNED</div>`:''}
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
      <div class="badge-req">${b.req}</div>
      <div class="badge-progress-bg"><div class="badge-progress-fill" style="width:${pct}%;background:${b.color}"></div></div>
    </div>`;
  }).join('');
}

// ── GOALS ──
function onGoalFileChosen(input){const file=input.files[0];if(!file)return;if(file.size>5*1024*1024){showToast('Max 5MB');return;}const r=new FileReader();r.onload=e=>{const isImg=file.type.startsWith('image/');pendingGoalFile={name:file.name,data:e.target.result,isImage:isImg};const chip=document.getElementById('goalFileChip');chip.style.display='inline-flex';chip.innerHTML=`<div class="file-chip">${isImg?'🖼':'📎'} ${esc(file.name)}<button onclick="clearGoalFile()">×</button></div>`;};r.readAsDataURL(file);}
function clearGoalFile(){pendingGoalFile=null;document.getElementById('goalFileChip').style.display='none';document.getElementById('goalFile').value='';}
function postGoal(){
  const text=document.getElementById('goalText').value.trim();
  if(!text){showToast('Write your goal first! ✨');return;}
  if(!userName){showToast('Set up profile first!');return;}
  push(ref(db,`rooms/${currentRoomId}/goals`),{
    author:userName,pfp:userPfp,uid:userId,text,time:fmtTime(),timestamp:Date.now(),
    file:pendingGoalFile?{...pendingGoalFile}:null,
    reactions:{'🔥':[],'💪':[],'✅':[],'❤️':[],'😮':[]},comments:{}
  });
  const gc=parseInt(localStorage.getItem('sd_goal_count')||'0')+1;
  localStorage.setItem('sd_goal_count',gc);
  // Track today goals for missions
  const tgc=parseInt(localStorage.getItem('sd_today_goals')||'0')+1;
  localStorage.setItem('sd_today_goals',tgc);
  document.getElementById('goalText').value='';clearGoalFile();
  // Award coins for posting goal
  awardCoins(5,'Goal posted! 🎯');
  awardXP(20,'Goal posted! 🎯');
  syncUser();
}
function react(key,emoji){
  if(!userName)return;
  const g=allGoals[key];if(!g)return;
  const rArr=Array.isArray(g.reactions?.[emoji])?[...g.reactions[emoji]]:Object.values(g.reactions?.[emoji]||{});
  const i=rArr.indexOf(userName);
  const wasAdding=i<0;
  if(i>=0)rArr.splice(i,1);else rArr.push(userName);
  update(ref(db,`rooms/${currentRoomId}/goals/${key}/reactions`),{[emoji]:rArr});
  if(wasAdding&&g.uid!==userId){
    const rc=parseInt(localStorage.getItem('sd_react_count')||'0')+1;
    localStorage.setItem('sd_react_count',rc);
    // Track today reacts for missions
    const trc=parseInt(localStorage.getItem('sd_today_reacts')||'0')+1;
    localStorage.setItem('sd_today_reacts',trc);
    syncUser();
  }
}
function deleteGoal(key){remove(ref(db,`rooms/${currentRoomId}/goals/${key}`));}

// ── COMMENTS ──
function toggleComments(key){const el=document.getElementById('comments_'+key);if(el)el.style.display=el.style.display==='none'?'block':'none';}
function submitComment(key){
  const input=document.getElementById('ci_'+key);const text=input.value.trim();if(!text)return;
  push(ref(db,`rooms/${currentRoomId}/goals/${key}/comments`),{author:userName,pfp:userPfp,uid:userId,text,time:fmtTime(),timestamp:Date.now()});
  input.value='';
}
function deleteComment(goalKey,commentKey){remove(ref(db,`rooms/${currentRoomId}/goals/${goalKey}/comments/${commentKey}`));}

function renderGoals(){
  const feed=document.getElementById('goalFeed');
  const entries=Object.entries(allGoals).sort((a,b)=>b[1].timestamp-a[1].timestamp);
  document.getElementById('goalCount').textContent=entries.length;
  if(!entries.length){feed.innerHTML=`<div class="empty-feed"><div class="ei">🌸</div><p>No goals yet.<br>Be the first to drop yours!</p></div>`;return;}
  feed.innerHTML=entries.map(([key,g])=>{
    const own=g.uid===userId||g.author===userName;
    const EMOJIS=['🔥','💪','✅','❤️','😮'];
    const reactHtml=EMOJIS.map(emoji=>{
      const uArr=Array.isArray(g.reactions?.[emoji])?g.reactions[emoji]:Object.values(g.reactions?.[emoji]||{});
      const active=uArr.includes(userName)?'active':'';
      return`<button class="react-btn ${active}" onclick="react('${key}','${emoji}')">${emoji}${uArr.length?' '+uArr.length:''}</button>`;
    }).join('');
    const fileHtml=g.file?(g.file.isImage?`<img class="goal-img" src="${g.file.data}" onclick="openLightbox(this.src)" alt="">`:`<a class="goal-file-link" href="${g.file.data}" download="${esc(g.file.name)}">📎 ${esc(g.file.name)} ↓</a>`):'';
    const comments=g.comments?Object.entries(g.comments).sort((a,b)=>a[1].timestamp-b[1].timestamp):[];
    const commentsHtml=comments.map(([ck,c])=>{
      const isOwn=c.uid===userId||c.author===userName;
      return`<div class="comment-item">
        ${avatarEl(c.author,c.pfp,26)}
        <div class="comment-bubble">
          <div class="comment-author">${esc(c.author)}</div>
          <div class="comment-text">${esc(c.text)}</div>
          <div class="comment-time">${c.time}</div>
        </div>
        ${isOwn?`<button class="comment-del" onclick="deleteComment('${key}','${ck}')">✕</button>`:''}
      </div>`;
    }).join('');
    return`<div class="goal-item">
      <div class="goal-meta">${avatarEl(g.author,g.pfp,36)}<span class="goal-author">${esc(g.author)}</span><span class="goal-time">${g.time}</span>${own?`<button class="del-btn" onclick="deleteGoal('${key}')">✕</button>`:''}</div>
      <div class="goal-text">${esc(g.text)}</div>${fileHtml}
      <div class="reactions-row">${reactHtml}</div>
      <div class="comments-section">
        <button class="comments-toggle" onclick="toggleComments('${key}')">💬 ${comments.length} comment${comments.length!==1?'s':''} · tap to ${comments.length?'view':'add'}</button>
        <div id="comments_${key}" style="display:none">
          ${comments.length?`<div class="comments-list">${commentsHtml}</div>`:''}
          <div class="add-comment-row">
            ${avatarEl(userName,userPfp,26)}
            <input class="comment-input" id="ci_${key}" placeholder="Add a comment…" onkeydown="if(event.key==='Enter')submitComment('${key}')">
            <button class="comment-send" onclick="submitComment('${key}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── CHAT ──
function chatEnter(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}}
function sendChat(){
  const input=document.getElementById('chatInput');const text=input.value.trim();if(!text)return;
  if(!userName)return;
  push(ref(db,`rooms/${currentRoomId}/messages`),{author:userName,pfp:userPfp,uid:userId,text,time:fmtTime(),timestamp:Date.now()});
  input.value='';input.style.height='auto';
}
function deleteChatMsg(msgKey){
  remove(ref(db,`rooms/${currentRoomId}/messages/${msgKey}`));
}
function renderChat(){
  const box=document.getElementById('chatMsgs');
  const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  const sysNote=box.querySelector('.sys-note');
  const entries=Object.entries(allMessages).sort((a,b)=>a[1].timestamp-b[1].timestamp);
  const html=entries.map(([key,m])=>{
    const own=m.uid===userId||m.author===userName;
    const[bg,fg]=getAv(m.author);
    const avHtml=m.pfp?`<img src="${m.pfp}" style="width:100%;height:100%;object-fit:cover">`:`<span style="font-size:.58rem;font-weight:800;color:${fg}">${initial(m.author)}</span>`;
    // Delete button only for own messages
    const delBtn=own?`<button class="msg-del-btn" onclick="deleteChatMsg('${key}')">Delete</button>`:'';
    return`<div class="chat-msg ${own?'own':''}">
      <div class="chat-av" style="${m.pfp?'':` background:${bg};`}">${avHtml}</div>
      <div class="msg-wrap">${!own?`<div class="msg-name">${esc(m.author)}</div>`:''}<div class="bubble">${esc(m.text)}</div><div class="msg-time">${m.time}</div>${delBtn}</div>
    </div>`;
  }).join('');
  box.innerHTML=(sysNote?sysNote.outerHTML:'')+html;
  if(atBottom||entries.length<=1)box.scrollTop=box.scrollHeight;
}
document.getElementById('chatInput').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,80)+'px';});

// ── LEADERBOARD ──
function renderLeaderboard(){
  const grid=document.getElementById('leaderboardGrid');
  const entries=Object.entries(allUsers).sort((a,b)=>(b[1].totalMins||0)-(a[1].totalMins||0));
  if(!entries.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">No members yet! 🌸</div>`;return;}
  const medals=['🥇','🥈','🥉'];
  grid.innerHTML=entries.map(([uid,u],i)=>{
    const rankClass=i<3?`rank-${i+1}`:'';
    const medal=i<3?medals[i]:`#${i+1}`;
    const totalMins=u.totalMins||0;
    const badgesHtml=(u.badges||[]).slice(0,5).map(id=>{const b=BADGES.find(x=>x.id===id);return b?`<span class="lb-badge-mini" title="${b.name}">${b.icon}</span>`:''}).join('');
    const shopBadgesHtml=(u.equippedBadgesDisplay||[]).map(b=>`<span class="lb-badge-mini">${b}</span>`).join('');
    const subjectsHtml=(u.subjects||[]).slice(0,4).map(s=>`<div class="subj-tag"><div class="subj-tag-dot" style="background:${s.color}"></div>${esc(s.name)} · ${formatMins(s.totalMins)}</div>`).join('');
    const titleHtml=u.equippedTitle?`<span class="equipped-title-label" style="background:${(u.equippedTitleColor||'#f0b429')}22;color:${u.equippedTitleColor||'#a07020'};border-color:${(u.equippedTitleColor||'#f0b429')}44">${esc(u.equippedTitle)}</span>`:'';
    // XP / Level
    const userXp=u.xp||0;
    const userLvl=u.level||1;
    const userLvlTitle=u.levelTitle||'Seedling';
    const userLvlIcon=u.levelIcon||'🌱';
    const lvlInfo=getLevelInfo(userXp);
    const nextLvl=getNextLevelInfo(userXp);
    const xpPct=nextLvl?Math.round(((userXp-lvlInfo.xpNeeded)/(nextLvl.xpNeeded-lvlInfo.xpNeeded))*100):100;
    const levelBadgeHtml=`<span class="lb-level-badge">${userLvlIcon} Lv.${userLvl} ${esc(userLvlTitle)}</span>`;
    // Is this user currently studying?
    // We check the local studying data via allStudying
    const studyingEntry=allStudying[uid];
    const studyingBadge=studyingEntry?`<span class="lb-studying-badge">📖 Studying ${esc(studyingEntry.subject)}</span>`:'';
    return`<div class="lb-card ${rankClass}">
      <div class="rank-badge">${medal}</div>
      <div class="lb-user-row">${avatarEl(u.name,u.pfp,44)}<div><div class="lb-name">${esc(u.name)} ${titleHtml}${levelBadgeHtml}${studyingBadge}</div><div class="lb-join">${u.subjects?.length||0} subject${u.subjects?.length!==1?'s':''}</div></div></div>
      ${(badgesHtml||shopBadgesHtml)?`<div class="lb-badges-row">${badgesHtml}${shopBadgesHtml?'<span style="margin-left:4px">'+shopBadgesHtml+'</span>':''}</div>`:''}
      <div class="lb-stats-row">
        <div class="lb-stat"><div class="lb-stat-val" style="color:var(--pink)">${formatMins(totalMins)}</div><div class="lb-stat-lbl">Studied</div></div>
        <div class="lb-stat"><div class="lb-stat-val" style="color:var(--sage)">🍅${u.pomoSessions||0}</div><div class="lb-stat-lbl">Pomos</div></div>
        <div class="lb-stat"><div class="lb-stat-val" style="color:var(--peach)">🔥${u.pomoStreak||0}</div><div class="lb-stat-lbl">Streak</div></div>
        <div class="lb-stat"><div class="lb-stat-val" style="color:var(--lavender)">⭐${userXp}</div><div class="lb-stat-lbl">XP</div></div>
      </div>
      <div class="lb-xp-row">
        <div class="lb-xp-label">XP</div>
        <div class="lb-xp-bar-bg"><div class="lb-xp-bar-fill" style="width:${xpPct}%"></div></div>
        <div style="font-size:.62rem;font-weight:800;color:var(--muted);min-width:28px;text-align:right">${xpPct}%</div>
      </div>
      ${subjectsHtml?`<div class="lb-subjects-row">${subjectsHtml}</div>`:''}
    </div>`;
  }).join('');
}

// ── LIGHTBOX ──
function openLightbox(src){document.getElementById('lightboxImg').src=src;document.getElementById('lightbox').classList.remove('hidden');}
function closeLightbox(){document.getElementById('lightbox').classList.add('hidden');}

// ── SPOTIFY ──
function loadPlaylist(id,name){document.getElementById('spotifyEmbed').src=`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`;showToast(`🎵 Loading ${name}…`);}
function loadCustomSpotify(){
  const raw=document.getElementById('spCustomInput').value.trim();if(!raw){showToast('Paste a Spotify URL first!');return;}
  const m=raw.match(/spotify\.com\/(playlist|album|track|episode|show)\/([a-zA-Z0-9]+)/);
  if(!m){showToast('Invalid Spotify URL');return;}
  const[,type,id]=m;
  document.getElementById('spotifyEmbed').src=`https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  showToast('🎵 Loaded!');document.getElementById('spCustomInput').value='';
}

// ── POMODORO ──
function setPomoMode(mode,btn){if(pomoRunning){showToast('Stop timer first!');return;}pomoMode=mode;document.querySelectorAll('.pomo-mode-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const mins=mode==='focus'?pomoSettings.focus:mode==='short'?pomoSettings.short:pomoSettings.long;pomoSecondsLeft=mins*60;updatePomoDisplay();const ring=document.getElementById('pomoRing');ring.className='ring-prog';ring.classList.add(mode==='focus'?'focus':mode==='short'?'short':'long');
  document.getElementById('pomoCoinPreview').textContent=mode==='focus'?`🍄 +${pomoSettings.focus} on finish`:'Break time 🌸';
}
function togglePomo(){if(pomoRunning)pausePomo();else startPomo();}
function startPomo(){pomoRunning=true;document.getElementById('pomoStartBtn').textContent='⏸ Pause';document.getElementById('pomoStartBtn').classList.add('running');document.getElementById('pomoRing').classList.add('running');['p1','p2','p3'].forEach(id=>document.getElementById(id).classList.add('active'));pomoInterval=setInterval(pomoTick,1000);}
function pausePomo(){pomoRunning=false;clearInterval(pomoInterval);document.getElementById('pomoStartBtn').textContent='▶ Resume';document.getElementById('pomoStartBtn').classList.remove('running');document.getElementById('pomoRing').classList.remove('running');['p1','p2','p3'].forEach(id=>document.getElementById(id).classList.remove('active'));}
function resetPomo(){pausePomo();document.getElementById('pomoStartBtn').textContent='▶ Start';const mins=pomoMode==='focus'?pomoSettings.focus:pomoMode==='short'?pomoSettings.short:pomoSettings.long;pomoSecondsLeft=mins*60;updatePomoDisplay();}
function pomoTick(){if(pomoSecondsLeft<=0){pomoFinished();return;}pomoSecondsLeft--;const td=document.getElementById('pomoTime');td.classList.remove('tick');void td.offsetWidth;td.classList.add('tick');updatePomoDisplay();}
function launchConfetti(){const c=document.getElementById('confettiContainer');c.innerHTML='';const cols=['#e8708a','#f2a98a','#c5b4e3','#a8c5a0','#f4c88a','#fff'];for(let i=0;i<24;i++){const el=document.createElement('div');el.className='confetti-piece';el.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*40+30}%;background:${cols[i%cols.length]};animation-delay:${Math.random()*.5}s;animation-duration:${1.2+Math.random()*.8}s;transform:rotate(${Math.random()*360}deg);border-radius:${Math.random()>.5?'50%':'2px'}`;c.appendChild(el);}setTimeout(()=>c.innerHTML='',2500);}
function pomoFinished(){
  pausePomo();
  document.getElementById('pomoStartBtn').textContent='▶ Start';
  launchConfetti();
  if(pomoMode==='focus'){
    pomoSessions++;pomoFocusMin+=pomoSettings.focus;
    const today=new Date().toDateString();
    if(lastStudyDay!==today){pomoStreak++;lastStudyDay=today;}
    // Track today pomos for missions
    const tp=parseInt(localStorage.getItem('sd_today_pomos')||'0')+1;
    localStorage.setItem('sd_today_pomos',tp);
    // Award mushroom coins: 1 coin per minute of focus
    const coinsEarned=pomoSettings.focus;
    awardCoins(coinsEarned,`${pomoSettings.focus}min focus complete! 🍅`);
    // Award XP: 5 XP per minute + 25 bonus for completing a full session
    awardXP(pomoSettings.focus*5+25,`Pomodoro session complete! 🍅`);
    // Also log focus time to weekly log for missions
    logStudyToWeekly(pomoSettings.focus);
    showToast('🎉 Focus session done! Take a break.');
  } else {showToast('Break over! 💪');}
  updatePomoStats();saveLocal();syncUser();
  const mins=pomoMode==='focus'?pomoSettings.focus:pomoMode==='short'?pomoSettings.short:pomoSettings.long;
  pomoSecondsLeft=mins*60;updatePomoDisplay();
}
function updatePomoDisplay(){
  const m=Math.floor(pomoSecondsLeft/60),s=pomoSecondsLeft%60;
  document.getElementById('pomoTime').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const totalSecs=(pomoMode==='focus'?pomoSettings.focus:pomoMode==='short'?pomoSettings.short:pomoSettings.long)*60;
  document.getElementById('pomoRing').style.strokeDashoffset=POMO_CIRC*(pomoSecondsLeft/totalSecs);
  document.getElementById('pomoLabel').textContent={focus:'FOCUS',short:'SHORT BREAK',long:'LONG BREAK'}[pomoMode];
}
function updatePomoStats(){document.getElementById('pomoSessions').textContent=pomoSessions;document.getElementById('pomoFocusMin').textContent=pomoFocusMin;document.getElementById('pomoStreak').textContent='🔥'+pomoStreak;}
function resetStreak(){if(!confirm('Reset your streak?'))return;pomoStreak=0;saveLocal();updatePomoStats();}
function applySettings(){pomoSettings.focus=parseInt(document.getElementById('setFocus').value)||25;pomoSettings.short=parseInt(document.getElementById('setShort').value)||5;pomoSettings.long=parseInt(document.getElementById('setLong').value)||15;resetPomo();}

// ── TRACKER (TIMER-BASED) ──
let activeTimerId=null;       // subject id currently being timed
let activeTimerStart=null;    // Date.now() when timer started
let activeTimerInterval=null; // setInterval handle
let linkedPomoSubjectId=null; // subject linked to pomodoro

function addSubject(){
  const name=document.getElementById('subjectName').value.trim();
  if(!name){showToast('Enter a subject name!');return;}
  // Re-sync from localStorage before checking duplicates (guards against stale memory)
  const localSubjects=JSON.parse(localStorage.getItem('sd_subjects')||'[]');
  subjects=localSubjects;
  if(subjects.find(s=>s.name.toLowerCase()===name.toLowerCase())){showToast('Already exists!');return;}
  subjects.push({id:'s'+Date.now(),name,color:selectedColor,totalMins:0,sessions:[]});
  saveLocal();
  // Immediately push to cloud
  if(userId) set(ref(db,`profiles/${userId}`),getCloudPayload()).catch(()=>{});
  renderSubjects();syncUser();
  document.getElementById('subjectName').value='';
  updatePomoSubjectSelect();
  showToast('Subject added! ✅');
}
function deleteSubject(id){
  if(String(activeTimerId)===String(id))stopActiveTimer(false);
  subjects=subjects.filter(s=>String(s.id)!==String(id));
  if(String(linkedPomoSubjectId)===String(id))linkedPomoSubjectId=null;
  saveLocal();
  // Immediately push deletion to cloud so it doesn't restore on next load
  if(userId) set(ref(db,`profiles/${userId}`),getCloudPayload()).catch(()=>{});
  renderSubjects();syncUser();updatePomoSubjectSelect();
}

function toggleSubjectTimer(id){
  const sid=String(id);
  if(String(activeTimerId)===sid){
    stopActiveTimer(true);
  } else {
    if(activeTimerId!==null)stopActiveTimer(true);
    startSubjectTimer(sid);
  }
}
function startSubjectTimer(id){
  const subj=subjects.find(s=>String(s.id)===String(id));if(!subj)return;
  activeTimerId=String(id);
  activeTimerStart=Date.now();
  // Show banner
  const banner=document.getElementById('activeTimerBanner');
  document.getElementById('activeTimerIcon').textContent='📖';
  document.getElementById('activeTimerSubject').textContent=subj.name;
  banner.style.display='flex';
  // Broadcast study status to Firebase
  broadcastStudyStatus(subj.name);
  // Tick
  activeTimerInterval=setInterval(()=>{
    const elapsed=Math.floor((Date.now()-activeTimerStart)/1000);
    const m=Math.floor(elapsed/60),s=elapsed%60;
    document.getElementById('activeTimerDisplay').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // Update card live display
    const liveEl=document.getElementById('live_'+String(id));
    if(liveEl)liveEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // Refresh studying-now list every 30s
    if(elapsed%30===0)refreshStudyingNow();
  },1000);
  renderSubjects();
  showToast(`⏱ Timer started for ${subj.name}`);
  refreshStudyingNow();
}
function stopActiveTimer(save=true){
  if(activeTimerId===null)return;
  clearInterval(activeTimerInterval);activeTimerInterval=null;
  const id=activeTimerId;const start=activeTimerStart;
  activeTimerId=null;activeTimerStart=null;
  document.getElementById('activeTimerBanner').style.display='none';
  document.getElementById('activeTimerDisplay').textContent='00:00';
  // Clear study status from Firebase
  clearStudyStatus();

  const subj=subjects.find(s=>String(s.id)===String(id));
  if(save&&subj){
    const elapsedSec=Math.floor((Date.now()-start)/1000);
    const minsToAdd=Math.floor(elapsedSec/60);
    if(minsToAdd>=1){
      subj.totalMins+=minsToAdd;
      subj.sessions.push({mins:minsToAdd,date:new Date().toLocaleDateString(),time:fmtTime()});
      if(subj.sessions.length>20)subj.sessions=subj.sessions.slice(-20);
      // Streak
      const today=new Date().toDateString();
      if(lastStudyDay!==today){const y=new Date();y.setDate(y.getDate()-1);if(lastStudyDay===y.toDateString())pomoStreak++;else pomoStreak=1;lastStudyDay=today;}
      awardCoins(minsToAdd,`${formatMins(minsToAdd)} studied for ${subj.name}! 📖`);
      // XP: 3 XP per minute studied
      awardXP(minsToAdd*3,`${formatMins(minsToAdd)} studied for ${subj.name}! ⭐`);
      logStudyToWeekly(minsToAdd);
      saveLocal();renderSubjects();syncUser();
      showToast(`+${formatMins(minsToAdd)} logged for ${subj.name}! 🎉`);
    } else {
      showToast('Less than 1 min — not logged.');
      renderSubjects();
    }
  } else {
    renderSubjects();
  }
  refreshStudyingNow();
}
window.stopActiveTimer=stopActiveTimer;

// ── STUDY STATUS BROADCAST ──
function broadcastStudyStatus(subjectName){
  if(!currentRoomId||!userId)return;
  const statusRef=ref(db,`rooms/${currentRoomId}/studying/${userId}`);
  set(statusRef,{
    name:userName,pfp:userPfp,subject:subjectName,startedAt:Date.now(),uid:userId
  });
  onDisconnect(statusRef).remove();
  // Refresh every 60s to keep alive timestamp
  clearInterval(studyStatusInterval);
  studyStatusInterval=setInterval(()=>{
    if(activeTimerId!==null){
      update(ref(db,`rooms/${currentRoomId}/studying/${userId}`),{heartbeat:Date.now()});
    }
  },60000);
}
function clearStudyStatus(){
  if(!currentRoomId||!userId)return;
  clearInterval(studyStatusInterval);
  remove(ref(db,`rooms/${currentRoomId}/studying/${userId}`)).catch(()=>{});
}
function subscribeStudyingNow(){
  if(!currentRoomId)return;
  onValue(ref(db,`rooms/${currentRoomId}/studying`),snap=>{
    const data=snap.val()||{};
    allStudying=data;
    renderStudyingNow(data);
  });
}
function refreshStudyingNow(){
  // Read from live allStudying data (not stale DOM dataset) so timer never resets on re-render
  const sections=['studyingNowList','studyingNowListLB'];
  sections.forEach(listId=>{
    const el=document.getElementById(listId);
    if(!el)return;
    const cards=el.querySelectorAll('.study-status-card[data-uid]');
    cards.forEach(card=>{
      const uid=card.dataset.uid;
      const entry=allStudying[uid];
      if(!entry)return;
      const elapsed=Math.floor((Date.now()-entry.startedAt)/1000);
      const m=Math.floor(elapsed/60),s=elapsed%60;
      const timeEl=card.querySelector('.ss-time');
      if(timeEl)timeEl.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    });
  });
}
function renderStudyingNow(data){
  const entries=Object.entries(data);
  const html=entries.length?entries.map(([uid,s])=>{
    const elapsed=Math.floor((Date.now()-s.startedAt)/1000);
    const m=Math.floor(elapsed/60),sec=elapsed%60;
    const isMe=uid===userId;
    return`<div class="study-status-card" data-uid="${uid}">
      ${avatarEl(s.name,s.pfp,28)}
      <div>
        <div class="ss-name">${esc(s.name)}${isMe?' (you)':''}</div>
        <div class="ss-subject">📖 ${esc(s.subject)}</div>
      </div>
      <div class="ss-pulse"></div>
      <div class="ss-time">${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}</div>
    </div>`;
  }).join(''):`<div class="studying-now-empty">No one is actively studying yet — start the tracker! 📖</div>`;
  ['studyingNowList','studyingNowListLB'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.innerHTML=html;
  });
}
// Refresh elapsed timers every second
setInterval(refreshStudyingNow,1000);

function updatePomoSubjectSelect(){
  const sel=document.getElementById('pomoSubjectSelect');
  if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">— No subject linked —</option>'+subjects.map(s=>`<option value="${String(s.id)}">${esc(s.name)}</option>`).join('');
  if(cur&&subjects.find(s=>String(s.id)===String(cur)))sel.value=cur;
  sel.onchange=()=>{
    linkedPomoSubjectId=sel.value||null;
    const subj=subjects.find(s=>String(s.id)===String(linkedPomoSubjectId));
    document.getElementById('pomoLinkStatus').textContent=subj?`✅ Pomodoro sessions will log to "${subj.name}" automatically.`:'Select a subject above — when a Pomodoro focus session finishes, it logs time to that subject automatically.';
  };
}

function renderSubjects(){
  const grid=document.getElementById('subjectsGrid');
  if(!subjects.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);font-size:.85rem">No subjects yet! Add one above to start tracking 📚</div>`;updateTotalStats();return;}
  const maxMins=Math.max(...subjects.map(s=>s.totalMins),1);
  grid.innerHTML=subjects.map(s=>{
    const sid=String(s.id);
    const pct=(s.totalMins/maxMins*100).toFixed(1);
    const isRunning=String(activeTimerId)===sid;
    const sessionsHtml=s.sessions.slice().reverse().slice(0,5).map(se=>`<div class="session-entry">${se.date} ${se.time}<span>+${formatMins(se.mins)}</span></div>`).join('');
    return`<div class="subject-card ${isRunning?'timer-running':''}">
      <div class="subject-top">
        <div class="subject-dot" style="background:${s.color}"></div>
        <div class="subject-name">${esc(s.name)}</div>
        ${isRunning?`<div class="subject-live-time"><span style="width:6px;height:6px;border-radius:50%;background:var(--pink);display:inline-block;animation:livepulse 1.5s infinite"></span><span id="live_${sid}">00:00</span></div>`:''}
        <button class="subject-menu" onclick="event.stopPropagation();deleteSubject('${sid}')">✕</button>
      </div>
      <div class="subject-hrs" style="color:${s.color}">${formatMins(s.totalMins)}</div>
      <div class="subject-hrs-lbl">Total Studied</div>
      <div class="subject-bar-bg"><div class="subject-bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
      <button class="subject-timer-btn ${isRunning?'running':''}" onclick="toggleSubjectTimer('${sid}')">${isRunning?'⏹ Stop &amp; Save':'▶ Start Timer'}</button>
      ${s.sessions.length?`<div class="subject-sessions" style="margin-top:10px">${sessionsHtml}</div>`:''}
    </div>`;
  }).join('');
  updateTotalStats();
  updatePomoSubjectSelect();
}
function updateTotalStats(){const total=subjects.reduce((a,s)=>a+s.totalMins,0);document.getElementById('totalHrsVal').textContent=formatMins(total)||'0m';document.getElementById('totalSubjectsVal').textContent=subjects.length;const top=subjects.slice().sort((a,b)=>b.totalMins-a.totalMins)[0];document.getElementById('topSubjectVal').textContent=top?top.name:'—';}

// ── MISSIONS SYSTEM ──
const DAILY_MISSIONS=[
  {id:'d_study30',icon:'📖',name:'Study 30 Minutes',desc:'Log or Pomodoro 30+ mins today',reward:30,type:'daily',check:()=>getTodayMins()>=30},
  {id:'d_study60',icon:'🔥',name:'Study 1 Hour',desc:'Log or Pomodoro 60+ mins today',reward:60,type:'daily',check:()=>getTodayMins()>=60},
  {id:'d_pomo1',icon:'🍅',name:'One Pomodoro',desc:'Complete 1 focus session today',reward:25,type:'daily',check:()=>getTodayPomos()>=1},
  {id:'d_post_goal',icon:'🎯',name:'Drop a Goal',desc:'Post at least 1 goal today',reward:20,type:'daily',check:()=>getTodayGoals()>=1},
  {id:'d_react',icon:'💬',name:'Be Supportive',desc:'React to someone\'s goal today',reward:15,type:'daily',check:()=>getTodayReacts()>=1},
  {id:'d_planner',icon:'📅',name:'Plan Ahead',desc:'Add 1 task to the planner today',reward:20,type:'daily',check:()=>getTodayPlannerAdds()>=1},
];
const WEEKLY_MISSIONS=[
  {id:'w_study5h',icon:'💪',name:'5 Hours This Week',desc:'Study 5+ hours this week',reward:150,type:'weekly',check:()=>getWeekMins()>=300},
  {id:'w_study10h',icon:'👑',name:'10-Hour Week',desc:'Study 10+ hours this week',reward:300,type:'weekly',check:()=>getWeekMins()>=600},
  {id:'w_pomo5',icon:'🍅',name:'5 Pomodoros',desc:'Complete 5 focus sessions this week',reward:100,type:'weekly',check:()=>getWeekPomos()>=5},
  {id:'w_streak5',icon:'🌟',name:'5-Day Streak',desc:'Study 5 days in a row this week',reward:200,type:'weekly',check:()=>pomoStreak>=5},
  {id:'w_goals5',icon:'📋',name:'5 Goals Posted',desc:'Post 5 goals this week',reward:100,type:'weekly',check:()=>getWeekGoals()>=5},
];

function getTodayKey(){return new Date().toISOString().slice(0,10);}
function getWeekStart(){const d=new Date();d.setDate(d.getDate()-d.getDay());return d.toISOString().slice(0,10);}

function getTodayMins(){
  const today=getTodayKey();
  return weeklyStudyLog[today]||0;
}
function getTodayPomos(){return parseInt(localStorage.getItem('sd_today_pomos')||'0');}
function getTodayGoals(){return parseInt(localStorage.getItem('sd_today_goals')||'0');}
function getTodayReacts(){return parseInt(localStorage.getItem('sd_today_reacts')||'0');}
function getTodayPlannerAdds(){return parseInt(localStorage.getItem('sd_today_planner')||'0');}
function getWeekMins(){
  const ws=getWeekStart();const now=new Date();let total=0;
  for(let i=0;i<7;i++){const d=new Date(ws);d.setDate(d.getDate()+i);const k=d.toISOString().slice(0,10);total+=weeklyStudyLog[k]||0;}
  return total;
}
function getWeekPomos(){return pomoSessions;}
function getWeekGoals(){return parseInt(localStorage.getItem('sd_goal_count')||'0');}

function renderMissions(){
  const todayKey=getTodayKey();
  const todayDone=completedMissions[todayKey]||[];
  const weekKey=getWeekStart();
  const weekDone=completedMissions[weekKey+'_w']||[];

  // Check and auto-complete missions
  [...DAILY_MISSIONS,...WEEKLY_MISSIONS].forEach(m=>{
    const key=m.type==='daily'?todayKey:weekKey+'_w';
    if(!completedMissions[key])completedMissions[key]=[];
    const alreadyDone=completedMissions[key].includes(m.id);
    if(!alreadyDone&&m.check()){
      completedMissions[key].push(m.id);
      missionsCompleted++;
      awardCoins(m.reward,`Mission: "${m.name}" 🎯`);
      awardXP(m.reward*2,`Mission: "${m.name}" ⭐`);
      showToast(`⚡ Mission Complete: ${m.name}! +${m.reward} 🍄`);
      saveLocal();
    }
  });

  // Check mission streak
  if(DAILY_MISSIONS.every(m=>(completedMissions[todayKey]||[]).includes(m.id))){
    if(lastMissionDay!==todayKey){
      const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
      const yKey=yesterday.toISOString().slice(0,10);
      if(lastMissionDay===yKey)missionStreak++;else missionStreak=1;
      lastMissionDay=todayKey;saveLocal();
    }
  }

  // Update streak banner
  document.getElementById('missionStreakVal').textContent=`${missionStreak}-Day Mission Streak`;

  // Update badge
  const allDailyDone=DAILY_MISSIONS.every(m=>(completedMissions[todayKey]||[]).includes(m.id));
  const badge=document.getElementById('missionBadge');
  badge.textContent=allDailyDone?'✓':'!';
  badge.style.background=allDailyDone?'var(--sage)':'';

  function missionHtml(missions,doneArr){
    return missions.map(m=>{
      const done=doneArr.includes(m.id);
      const progress=done?1:Math.min(1,getProgress(m));
      return`<div class="mission-card ${done?'completed':''}">
        <div class="mission-icon">${m.icon}</div>
        <div class="mission-name">${m.name}</div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-reward">🍄 +${m.reward} coins</div>
        <div class="mission-progress-bar"><div class="mission-progress-fill ${done?'done':''}" style="width:${Math.round(progress*100)}%"></div></div>
        <div class="mission-progress-text">${done?'✅ Completed!':Math.round(progress*100)+'% — keep going!'}</div>
      </div>`;
    }).join('');
  }
  // Re-read after auto-complete loop so newly completed missions show as done immediately
  const todayDoneFinal=completedMissions[todayKey]||[];
  const weekDoneFinal=completedMissions[weekKey+'_w']||[];
  document.getElementById('dailyMissionsGrid').innerHTML=missionHtml(DAILY_MISSIONS,todayDoneFinal);
  document.getElementById('weeklyMissionsGrid').innerHTML=missionHtml(WEEKLY_MISSIONS,weekDoneFinal);
}

function getProgress(m){
  if(m.id==='d_study30')return getTodayMins()/30;
  if(m.id==='d_study60')return getTodayMins()/60;
  if(m.id==='d_pomo1')return getTodayPomos()>=1?1:0;
  if(m.id==='d_post_goal')return getTodayGoals()>=1?1:0;
  if(m.id==='d_react')return getTodayReacts()>=1?1:0;
  if(m.id==='d_planner')return getTodayPlannerAdds()>=1?1:0;
  if(m.id==='w_study5h')return getWeekMins()/300;
  if(m.id==='w_study10h')return getWeekMins()/600;
  if(m.id==='w_pomo5')return Math.min(1,getWeekPomos()/5);
  if(m.id==='w_streak5')return Math.min(1,pomoStreak/5);
  if(m.id==='w_goals5')return Math.min(1,getWeekGoals()/5);
  return 0;
}

function startMissionTimer(){
  let lastDay=new Date().toDateString();
  function tick(){
    const now=new Date();
    const midnight=new Date();midnight.setHours(24,0,0,0);
    const diff=midnight-now;
    const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    const el=document.getElementById('missionResetTimer');
    if(el)el.textContent=`Resets in: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // Reset today counters at midnight
    const today=now.toDateString();
    if(today!==lastDay){
      lastDay=today;
      localStorage.removeItem('sd_today_pomos');
      localStorage.removeItem('sd_today_goals');
      localStorage.removeItem('sd_today_reacts');
      localStorage.removeItem('sd_today_planner');
      renderMissions();
    }
  }
  tick();setInterval(tick,1000);
}

// ── PLANNER SYSTEM ──
function setPlannerMode(mode,btn){
  plannerMode=mode;
  document.querySelectorAll('.planner-mode-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderPlanner();
}
function plannerNav(dir){
  if(plannerMode==='month'){plannerDate.setMonth(plannerDate.getMonth()+dir);}
  else{plannerDate.setFullYear(plannerDate.getFullYear()+dir);}
  renderPlanner();
}
function renderPlanner(){
  if(plannerMode==='month')renderMonthPlanner();
  else renderYearPlanner();
}
function renderMonthPlanner(){
  const y=plannerDate.getFullYear(),m=plannerDate.getMonth();
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('plannerLabel').textContent=`${monthNames[m]} ${y}`;
  const first=new Date(y,m,1);const last=new Date(y,m+1,0);
  const startDow=first.getDay();
  const today=new Date();
  let html=`<div class="planner-grid-month">`;
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>html+=`<div class="planner-day-header">${d}</div>`);
  // blank cells before
  for(let i=0;i<startDow;i++){
    const d=new Date(y,m,1-startDow+i);
    const k=d.toISOString().slice(0,10);
    const tasks=plannerData[k]||[];
    html+=`<div class="planner-day other-month ${tasks.length?'has-tasks':''}" onclick="openPlannerDay('${k}')"><div class="planner-day-num">${d.getDate()}</div>${tasks.slice(0,2).map(t=>`<div class="planner-task-chip ${t.done?'done-chip':''}">${esc(t.text)}</div>`).join('')}<button class="planner-add-btn">+</button></div>`;
  }
  for(let day=1;day<=last.getDate();day++){
    const d=new Date(y,m,day);
    const k=d.toISOString().slice(0,10);
    const tasks=plannerData[k]||[];
    const isToday=d.toDateString()===today.toDateString();
    const studiedMins=weeklyStudyLog[k]||0;
    html+=`<div class="planner-day ${isToday?'today':''} ${tasks.length?'has-tasks':''}" onclick="openPlannerDay('${k}')"><div class="planner-day-num">${day}${studiedMins?`<span style="font-size:.55rem;color:var(--muted);font-weight:500;margin-left:3px">${formatMins(studiedMins)}</span>`:''}</div>${tasks.slice(0,2).map(t=>`<div class="planner-task-chip ${t.done?'done-chip':''}">${esc(t.text)}</div>`).join('')}${tasks.length>2?`<div style="font-size:.58rem;color:var(--muted);margin-top:1px">+${tasks.length-2} more</div>`:''}<button class="planner-add-btn">+</button></div>`;
  }
  html+=`</div>`;
  document.getElementById('plannerGrid').innerHTML=html;
}
function renderYearPlanner(){
  const y=plannerDate.getFullYear();
  document.getElementById('plannerLabel').textContent=`${y}`;
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const today=new Date();
  let html=`<div class="planner-grid-year">`;
  for(let m=0;m<12;m++){
    const first=new Date(y,m,1),last=new Date(y,m+1,0);
    const startDow=first.getDay();
    html+=`<div class="planner-mini-month"><div class="planner-mini-month-title">${monthNames[m]}</div><div class="planner-mini-grid">`;
    ['S','M','T','W','T','F','S'].forEach(d=>html+=`<div style="text-align:center;font-size:.52rem;color:var(--muted);font-weight:800">${d}</div>`);
    for(let i=0;i<startDow;i++){
      const d=new Date(y,m,1-startDow+i);
      const k=d.toISOString().slice(0,10);
      const hasTasks=(plannerData[k]||[]).length>0;
      html+=`<div class="planner-mini-day other-month ${hasTasks?'has-tasks':''}" onclick="openPlannerDay('${k}')">${d.getDate()}</div>`;
    }
    for(let day=1;day<=last.getDate();day++){
      const d=new Date(y,m,day);
      const k=d.toISOString().slice(0,10);
      const hasTasks=(plannerData[k]||[]).length>0;
      const isToday=d.toDateString()===today.toDateString();
      html+=`<div class="planner-mini-day ${isToday?'today':''} ${hasTasks?'has-tasks':''}" onclick="openPlannerDay('${k}')">${day}</div>`;
    }
    html+=`</div></div>`;
  }
  html+=`</div>`;
  document.getElementById('plannerGrid').innerHTML=html;
}
function openPlannerDay(dateKey){
  plannerSelectedDate=dateKey;
  const d=new Date(dateKey+'T12:00:00');
  const opts={weekday:'long',year:'numeric',month:'long',day:'numeric'};
  document.getElementById('plannerDayTitle').textContent=d.toLocaleDateString(undefined,opts);
  const studied=weeklyStudyLog[dateKey]||0;
  const studyInfo=document.getElementById('plannerDayStudyInfo');
  if(studied>0){studyInfo.style.display='block';studyInfo.textContent=`📊 You studied ${formatMins(studied)} on this day!`;}
  else{studyInfo.style.display='none';}
  renderPlannerTaskList();
  document.getElementById('plannerDayModal').classList.remove('hidden');
}
function closePlannerModal(){document.getElementById('plannerDayModal').classList.add('hidden');renderPlanner();}
function renderPlannerTaskList(){
  const tasks=plannerData[plannerSelectedDate]||[];
  const list=document.getElementById('plannerTaskList');
  if(!tasks.length){list.innerHTML=`<div style="text-align:center;padding:20px;color:var(--muted);font-size:.82rem">No tasks yet — add one below!</div>`;return;}
  list.innerHTML=tasks.map((t,i)=>`<div class="planner-task-item ${t.done?'done':''}">
    <input type="checkbox" ${t.done?'checked':''} onchange="togglePlannerTask(${i})">
    ${t.color?`<div class="planner-task-subject-dot" style="background:${t.color}"></div>`:''}
    <div class="planner-task-text">${esc(t.text)}</div>
    <button class="planner-task-del" onclick="deletePlannerTask(${i})">✕</button>
  </div>`).join('');
}
function addPlannerTask(){
  const input=document.getElementById('plannerTaskInput');
  const text=input.value.trim();if(!text)return;
  if(!plannerData[plannerSelectedDate])plannerData[plannerSelectedDate]=[];
  plannerData[plannerSelectedDate].push({id:Date.now(),text,done:false,color:selectedColor});
  plannerTasks++;
  // Track today's planner adds for missions
  const todayKey=getTodayKey();
  if(plannerSelectedDate===todayKey){
    const cur=parseInt(localStorage.getItem('sd_today_planner')||'0');
    localStorage.setItem('sd_today_planner',cur+1);
  }
  saveLocal();renderPlannerTaskList();input.value='';
  showToast('Task added to planner! 📅');
  renderMissions();
  syncUser();
}
function togglePlannerTask(idx){
  const tasks=plannerData[plannerSelectedDate];if(!tasks||!tasks[idx])return;
  tasks[idx].done=!tasks[idx].done;
  saveLocal();renderPlannerTaskList();
  if(tasks[idx].done)showToast('Task done! ✅');
}
function deletePlannerTask(idx){
  if(!plannerData[plannerSelectedDate])return;
  plannerData[plannerSelectedDate].splice(idx,1);
  saveLocal();renderPlannerTaskList();
}

// ── WEEKLY REPORT SYSTEM ──
function reportNav(dir){reportWeekOffset+=dir;if(reportWeekOffset>0)reportWeekOffset=0;renderReport();}
function getWeekDays(offset){
  const days=[];
  const now=new Date();
  const startOfWeek=new Date(now);
  startOfWeek.setDate(now.getDate()-now.getDay()+(offset*7));
  for(let i=0;i<7;i++){
    const d=new Date(startOfWeek);d.setDate(startOfWeek.getDate()+i);
    days.push(d);
  }
  return days;
}
function renderReport(){
  const days=getWeekDays(reportWeekOffset);
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const start=days[0],end=days[6];
  document.getElementById('reportWeekLabel').textContent=
    `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;

  // Gather data
  const minsPerDay=days.map(d=>weeklyStudyLog[d.toISOString().slice(0,10)]||0);
  const totalMins=minsPerDay.reduce((a,b)=>a+b,0);
  const studiedDays=minsPerDay.filter(m=>m>0).length;
  const avgMins=studiedDays>0?Math.round(totalMins/studiedDays):0;
  const bestDayIdx=minsPerDay.indexOf(Math.max(...minsPerDay));
  const bestDayMins=minsPerDay[bestDayIdx];

  // Stats
  document.getElementById('rTotalHrs').textContent=formatMins(totalMins)||'0m';
  document.getElementById('rDailyAvg').textContent=formatMins(avgMins)||'0m';
  document.getElementById('rBestDay').textContent=bestDayMins>0?dayNames[bestDayIdx]:'—';
  document.getElementById('rPomos').textContent='🍅'+pomoSessions;
  document.getElementById('rStreak').textContent='🔥'+pomoStreak;

  // Missions count
  const todayKey=getTodayKey();
  const totalMissionsThisWeek=DAILY_MISSIONS.length*7+WEEKLY_MISSIONS.length;
  const doneMissionsThisWeek=days.reduce((a,d)=>{
    const k=d.toISOString().slice(0,10);
    return a+(completedMissions[k]||[]).length;
  },0)+(completedMissions[getWeekStart()+'_w']||[]).length;
  document.getElementById('rMissions').textContent=`${doneMissionsThisWeek}/${totalMissionsThisWeek}`;

  // Bar chart
  const maxMins=Math.max(...minsPerDay,60);
  const today=new Date().toISOString().slice(0,10);
  const barHtml=days.map((d,i)=>{
    const k=d.toISOString().slice(0,10);
    const mins=minsPerDay[i];
    const pct=Math.max(2,(mins/maxMins)*100);
    const isToday=k===today;
    return`<div class="bar-wrap">
      <div class="bar-fill-wrap">
        <div class="bar-fill ${isToday?'today-bar':''}" style="height:${pct}%" data-tip="${formatMins(mins)||'0m'}"></div>
      </div>
      <div class="bar-label">${dayNames[i]}</div>
      <div class="bar-val">${mins>0?formatMins(mins):''}</div>
    </div>`;
  }).join('');
  document.getElementById('reportBarChart').innerHTML=barHtml;

  // Subject breakdown
  const subjectBreak=document.getElementById('reportSubjectBreakdown');
  if(!subjects.length){subjectBreak.innerHTML=`<div style="color:var(--muted);font-size:.85rem">No subjects tracked yet. Add some in My Tracker!</div>`;
  } else {
    const maxSubMins=Math.max(...subjects.map(s=>s.totalMins),1);
    subjectBreak.innerHTML=subjects.slice().sort((a,b)=>b.totalMins-a.totalMins).map(s=>`
      <div class="subject-break-item">
        <div class="subject-break-dot" style="background:${s.color}"></div>
        <div class="subject-break-name">${esc(s.name)}</div>
        <div class="subject-break-bar-bg"><div class="subject-break-bar" style="width:${(s.totalMins/maxSubMins*100).toFixed(1)}%;background:${s.color}"></div></div>
        <div class="subject-break-time">${formatMins(s.totalMins)}</div>
      </div>`).join('');
  }

  // Insights
  const insights=[];
  if(studiedDays>=5)insights.push({icon:'🔥',text:'Amazing consistency — you studied 5+ days this week!'});
  else if(studiedDays>=3)insights.push({icon:'👍',text:`You studied ${studiedDays} days this week. Great progress!`});
  else if(studiedDays>0)insights.push({icon:'💡',text:`You studied ${studiedDays} day${studiedDays>1?'s':''} this week. Try to be more consistent!`});
  else insights.push({icon:'😴',text:'No study sessions logged this week yet. Start today!'});
  if(totalMins>=600)insights.push({icon:'🏆',text:`Incredible — over ${formatMins(totalMins)} studied this week!`});
  if(pomoStreak>=7)insights.push({icon:'🌟',text:`${pomoStreak}-day streak! You're on an absolute roll.`});
  if(bestDayMins>=120)insights.push({icon:'💎',text:`Best day: ${dayNames[bestDayIdx]} with ${formatMins(bestDayMins)} — phenomenal!`});
  document.getElementById('reportInsights').innerHTML=insights.map(i=>`<div class="report-insight-item"><span>${i.icon}</span><span>${i.text}</span></div>`).join('');

  // Weekly score (0-100)
  const consistencyScore=(studiedDays/7)*30;
  const hoursScore=Math.min(30,(totalMins/600)*30);
  const pomosScore=Math.min(20,(pomoSessions/10)*20);
  const missionScore=Math.min(20,(doneMissionsThisWeek/14)*20);
  const score=Math.round(consistencyScore+hoursScore+pomosScore+missionScore);
  const scoreEl=document.getElementById('reportScore');
  scoreEl.textContent=score;
  scoreEl.style.color=score>=80?'var(--sage)':score>=50?'var(--pink)':'var(--peach)';
}

// Update study log when hours are logged
function logStudyToWeekly(minsAdded){
  const today=getTodayKey();
  weeklyStudyLog[today]=(weeklyStudyLog[today]||0)+minsAdded;
  // Check night owl / early bird
  const hr=new Date().getHours();
  if(hr>=0&&hr<3&&!nightOwl){nightOwl=true;}
  if(hr>=5&&hr<7&&!earlyBird){earlyBird=true;}
  saveLocal();
  renderMissions();
}

// expose new globals
window.setPlannerMode=setPlannerMode;window.plannerNav=plannerNav;
window.openPlannerDay=openPlannerDay;window.closePlannerModal=closePlannerModal;
window.addPlannerTask=addPlannerTask;window.togglePlannerTask=togglePlannerTask;
window.deletePlannerTask=deletePlannerTask;
window.reportNav=reportNav;


// ── PET SYSTEM ──
const PET_SPECIES = [
  { id:'cat',   name:'Kitty',   stages:['🥚','🐱','😸','😻','🦁'] },
  { id:'dog',   name:'Doggo',   stages:['🥚','🐶','🐕','🦮','🐺'] },
  { id:'dragon',name:'Dragon',  stages:['🥚','🦎','🐊','🐲','🐉'] },
  { id:'bunny', name:'Bunny',   stages:['🥚','🐰','🐇','🐇','🦊'] },
  { id:'panda', name:'Panda',   stages:['🥚','🐼','🐼','🦝','🐻'] },
];
const PET_STAGES = [
  { label:'Egg',     hrs:0,   mood:'💤', msg:'Start studying to hatch me! 🌱' },
  { label:'Baby',    hrs:1,   mood:'😊', msg:'I hatched! Keep going! 🎉' },
  { label:'Kid',     hrs:5,   mood:'😄', msg:"Growing strong! You're doing great 💪" },
  { label:'Teen',    hrs:15,  mood:'🔥', msg:"Wow, look at me glow! 🌟" },
  { label:'Evolved', hrs:30,  mood:'👑', msg:"Full power! You're a study legend! 👑" },
];
const AVATAR_EMOJIS = ['🌸','⚡','🌙','🔥','🦋','🎯','🌿','💎','🦊','🐉','🌊','⭐'];
const AVATAR_BGS = [
  'linear-gradient(135deg,#e8708a,#f2a98a)',
  'linear-gradient(135deg,#c5b4e3,#e8708a)',
  'linear-gradient(135deg,#a8c5a0,#7bb8d4)',
  'linear-gradient(135deg,#f4c88a,#f2a98a)',
  'linear-gradient(135deg,#7bb8d4,#c5b4e3)',
  'linear-gradient(135deg,#2d3748,#4a3535)',
  'linear-gradient(135deg,#f0b429,#f2a98a)',
  'linear-gradient(135deg,#e8d5f5,#c5b4e3)',
];

let petName = 'Studdy';
let petSpecies = 'cat';
let avatarEmoji = '🌸';
let avatarBg = AVATAR_BGS[0];
let avatarEmojiIdx = 0;

function loadPetState(){
  petName    = localStorage.getItem('sd_pet_name')    || 'Studdy';
  petSpecies = localStorage.getItem('sd_pet_species') || 'cat';
  avatarEmoji= localStorage.getItem('sd_avatar_emoji')|| '🌸';
  avatarBg   = localStorage.getItem('sd_avatar_bg')   || AVATAR_BGS[0];
  avatarEmojiIdx = AVATAR_EMOJIS.indexOf(avatarEmoji);
  if(avatarEmojiIdx<0)avatarEmojiIdx=0;
}
function savePetState(){
  localStorage.setItem('sd_pet_name', petName);
  localStorage.setItem('sd_pet_species', petSpecies);
  localStorage.setItem('sd_avatar_emoji', avatarEmoji);
  localStorage.setItem('sd_avatar_bg', avatarBg);
}

function getPetStageIndex(){
  const totalMins = subjects.reduce((a,s)=>a+s.totalMins,0) + pomoFocusMin;
  const hrs = totalMins / 60;
  let stage = 0;
  for(let i=PET_STAGES.length-1;i>=0;i--){
    if(hrs >= PET_STAGES[i].hrs){ stage=i; break; }
  }
  return stage;
}

function renderPet(){
  loadPetState();
  const totalMins = subjects.reduce((a,s)=>a+s.totalMins,0) + pomoFocusMin;
  const hrs = totalMins / 60;
  const stageIdx = getPetStageIndex();
  const stage = PET_STAGES[stageIdx];
  const sp = PET_SPECIES.find(s=>s.id===petSpecies) || PET_SPECIES[0];

  // Pet emoji
  document.getElementById('petEmoji').textContent = sp.stages[stageIdx];
  document.getElementById('petMood').textContent  = stage.mood;
  document.getElementById('petName').textContent  = petName;
  document.getElementById('petStage').textContent = stage.label + ' · ' + sp.name;
  document.getElementById('petMsg').textContent   = stage.msg;
  document.getElementById('petNameInput').value   = petName;

  // Happiness: goes up with recent activity (based on streak), max 100
  const happy = Math.min(100, pomoStreak * 14 + (pomoSessions > 0 ? 20 : 0));
  // Growth: based on total hours vs max stage threshold
  const maxHrs = PET_STAGES[PET_STAGES.length-1].hrs;
  const growth = Math.min(100, Math.round((hrs / maxHrs) * 100));
  document.getElementById('petHappyBar').style.width  = happy + '%';
  document.getElementById('petHappyVal').textContent  = happy + '%';
  document.getElementById('petGrowthBar').style.width = growth + '%';
  document.getElementById('petGrowthVal').textContent = growth + '%';

  // Evolution row
  const evoRow = document.getElementById('petEvolutionRow');
  evoRow.innerHTML = '';
  PET_STAGES.forEach((s,i)=>{
    const reached = stageIdx >= i;
    const div = document.createElement('div');
    div.className = 'pet-stage-step' + (reached?' reached':'');
    div.innerHTML = '<div class="pss-emoji">'+sp.stages[i]+'</div>'
      +'<div class="pss-label">'+s.label+'</div>'
      +'<div style="font-size:.52rem;color:var(--muted2)">'+s.hrs+'h</div>';
    evoRow.appendChild(div);
    if(i < PET_STAGES.length-1){
      const conn = document.createElement('div');
      conn.className = 'pet-connector' + (stageIdx>i?' reached':'');
      evoRow.appendChild(conn);
    }
  });

  // Species picker
  const spRow = document.getElementById('petSpeciesRow');
  spRow.innerHTML = '';
  PET_SPECIES.forEach(s=>{
    const btn = document.createElement('button');
    btn.className = 'species-btn' + (s.id===petSpecies?' sel':'');
    btn.innerHTML = s.stages[1]+' '+s.name;
    btn.onclick = ()=>{ petSpecies=s.id; savePetState(); renderPet(); showToast('Pet changed to '+s.name+'! 🐾'); };
    spRow.appendChild(btn);
  });

  // Avatar display
  renderAvatarDisplay();

  // Avatar emoji picker
  const apRow = document.getElementById('avatarPickerRow');
  apRow.innerHTML = '';
  AVATAR_EMOJIS.forEach((e,i)=>{
    const d = document.createElement('div');
    d.className = 'avatar-opt' + (e===avatarEmoji?' sel':'');
    d.textContent = e;
    d.onclick = ()=>{ avatarEmoji=e; avatarEmojiIdx=i; savePetState(); renderPet(); };
    apRow.appendChild(d);
  });
  document.getElementById('avatarName').textContent = 'Your avatar: ' + avatarEmoji;

  // Avatar background picker
  const bgRow = document.getElementById('avatarBgRow');
  bgRow.innerHTML = '';
  AVATAR_BGS.forEach(bg=>{
    const d = document.createElement('div');
    d.className = 'avatar-bg-opt' + (bg===avatarBg?' sel':'');
    d.style.cssText = 'width:34px;height:34px;border-radius:50%;cursor:pointer;border:3px solid '+(bg===avatarBg?'var(--text)':'transparent')+';background:'+bg+';transition:all .2s;flex-shrink:0;';
    d.onclick = ()=>{ avatarBg=bg; savePetState(); renderPet(); updateAvatarInHeader(); };
    bgRow.appendChild(d);
  });
}

function renderAvatarDisplay(){
  const disp = document.getElementById('avatarDisplay');
  if(disp){ disp.style.background=avatarBg; disp.textContent=avatarEmoji; }
  updateAvatarInHeader();
}

function updateAvatarInHeader(){
  // Replace the chip avatar with the custom emoji avatar if no photo uploaded
  if(!userPfp){
    const chipAv = document.getElementById('chipAv');
    if(chipAv){
      chipAv.style.background = avatarBg;
      chipAv.style.color = 'white';
      chipAv.innerHTML = '<span style="font-size:.9rem">'+avatarEmoji+'</span>';
    }
  }
}

function cycleAvatar(){
  avatarEmojiIdx = (avatarEmojiIdx+1) % AVATAR_EMOJIS.length;
  avatarEmoji = AVATAR_EMOJIS[avatarEmojiIdx];
  savePetState();
  const disp = document.getElementById('avatarDisplay');
  if(disp){ disp.style.animation='none'; void disp.offsetWidth; disp.style.animation='petPop .4s ease'; }
  renderPet();
}

function savePetName(){
  const v = document.getElementById('petNameInput').value.trim();
  if(!v){ showToast('Enter a name!'); return; }
  petName = v;
  savePetState();
  renderPet();
  showToast('Pet renamed to '+petName+'! 🐾');
}

window.cycleAvatar  = cycleAvatar;
window.savePetName  = savePetName;

// ── BOOT ──
init();

// ══════════════════════════════════════════════════════════
//  AI FEATURES — Secure Backend-Powered Chat, Quiz, Flashcards
//  ⚠️  API keys are NEVER stored in the browser.
//      All AI calls go through /api/ai/* on your backend.
//      The backend holds the Gemini key in a server-side env var.
// ══════════════════════════════════════════════════════════

// ── BACKEND CONFIG ──
// Change this to your deployed backend URL in production
// e.g. 'https://api.studydrop.app' or your Firebase Functions URL
const AI_BACKEND_URL = window.SD_BACKEND_URL || 'http://localhost:3001';

// ── USER IDENTITY ──
// Send the logged-in user's ID with every request so the backend
// can apply per-user rate limiting. If you use Firebase Auth, replace
// this with the actual UID from firebase.auth().currentUser.uid
function getUserId() {
  let uid = localStorage.getItem('sd_uid');
  if (!uid) {
    // Generate a stable anonymous ID for this browser session
    uid = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('sd_uid', uid);
  }
  return uid;
}

// ── CORE FETCH HELPER ──
// All AI requests go through this single function.
// Handles: auth headers, error parsing, rate-limit feedback, retries.
async function apiFetch(path, body, retries = 2) {
  const url = `${AI_BACKEND_URL}${path}`;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff between retries: 800ms, 1600ms
      await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt - 1)));
    }

    let resp;
    try {
      resp = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID':    getUserId(),   // Per-user rate limiting key
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      lastErr = new Error('Network error — check your connection.');
      continue;  // Retry on network failure
    }

    // Parse response body regardless of status
    let data;
    try { data = await resp.json(); } catch { data = {}; }

    if (resp.ok) return data;

    // Rate limit — tell the user how long to wait, don't retry
    if (resp.status === 429) {
      const wait = data.retryAfter || 60;
      showToast(`⏳ AI rate limit — please wait ${wait}s before trying again.`);
      throw new Error('rate_limit');
    }

    // Server error — retry
    if (resp.status >= 500) {
      lastErr = new Error(data.message || 'AI service temporarily unavailable.');
      continue;
    }

    // Client error (400, 401, etc.) — don't retry
    throw new Error(data.message || `Request failed (${resp.status})`);
  }

  throw lastErr || new Error('AI request failed after retries.');
}

// ── PUBLIC AI METHODS ──
// These replace the old callGemini / callGeminiChat functions.
// Same interface — rest of the app calls these unchanged.

async function callGemini(systemPrompt, userPrompt) {
  const data = await apiFetch('/api/ai/chat', {
    message:           userPrompt,
    systemInstruction: systemPrompt,
  });
  return data.text;
}

async function callGeminiChat(systemPrompt, history) {
  // Condense history into a single message for the stateless backend
  // (for a stateful chat, you'd send the full history to a /chat/multi endpoint)
  const lastMessage = history[history.length - 1]?.content || '';
  const data = await apiFetch('/api/ai/chat', {
    message:           lastMessage,
    systemInstruction: systemPrompt,
  });
  return data.text;
}

// ── AI STATUS INDICATOR ──
// Shows AI as always active (no key setup needed by users)
(function checkAiKeyIndicator(){
  const tab = document.getElementById('aiKeyTab');
  if(!tab) return;
  tab.innerHTML = '🤖 AI: <span style="color:var(--sage)">✓</span>';
  tab.title = 'AI powered by StudyDrop backend';
})();

// No-op stubs for any code that still calls the old key modal
function openApiKeyModal()  { showToast('✅ AI is already active — no key needed!'); }
function closeApiKeyModal() {}
function saveApiKey()       {}
function saveApiKeyDirect() {}
window.openApiKeyModal  = openApiKeyModal;
window.closeApiKeyModal = closeApiKeyModal;
window.saveApiKey       = saveApiKey;
window.saveApiKeyDirect = saveApiKeyDirect;

// ── GEMINI KEY STUB ──
// AI is backend-powered — no client-side key required.
// This stub returns a truthy value so existing checks like
// `if (!getGeminiKey())` don't block AI features.
function getGeminiKey() { return 'backend'; }
window.getGeminiKey = getGeminiKey;

// ── EXTRACT JSON STUB ──
// Safely parses JSON from AI text responses (strips markdown fences)
function extractJson(text) {
  const clean = (text || '').replace(/```json|```/g, '').trim();
  const arrStart = clean.indexOf('[');
  const objStart = clean.indexOf('{');
  let start = -1;
  if (arrStart !== -1 && objStart !== -1) start = Math.min(arrStart, objStart);
  else if (arrStart !== -1) start = arrStart;
  else if (objStart !== -1) start = objStart;
  if (start === -1) throw new Error('No JSON found in response');
  const isArr = clean[start] === '[';
  const end = isArr ? clean.lastIndexOf(']') + 1 : clean.lastIndexOf('}') + 1;
  return JSON.parse(clean.slice(start, end));
}
window.extractJson = extractJson;

// ── QUIZ & FLASHCARD OVERRIDES ──
// These replace the raw Gemini JSON calls with typed backend endpoints.
// The backend validates and sanitises the AI response before sending it.
window._backendGenerateQuiz = async function(topic, difficulty, count) {
  const data = await apiFetch('/api/ai/quiz/generate', { topic, difficulty, count });
  return data.questions;
};

window._backendGenerateFlashcards = async function(topic, count) {
  const data = await apiFetch('/api/ai/flashcards/generate', { topic, count });
  return data.cards;
};

// ── AI CHAT ──
let aiChatHistory = [];

async function sendAiMessage() {
  const input = document.getElementById('aiChatInput');
  const msg = input.value.trim();
  if (!msg) return;
  if (!getGeminiKey()) { openApiKeyModal(); return; }
  input.value = '';
  input.style.height = 'auto';

  appendAiMsg('user', msg);
  aiChatHistory.push({ role: 'user', content: msg });

  const typingId = 'typing_' + Date.now();
  appendAiMsg('assistant', '...', typingId, true);
  document.getElementById('aiSendBtn').disabled = true;

  try {
    const subjectCtx = subjects.length
      ? 'The student is currently tracking these subjects: ' + subjects.map(s => s.name).join(', ') + '.'
      : '';
    const sysPrompt = `You are StudyDrop's friendly AI tutor — encouraging, concise, and brilliant. Help students understand concepts, solve problems, explain tricky topics, and stay motivated. Use clear explanations with examples. ${subjectCtx} Keep responses focused and under 300 words unless a detailed explanation is truly needed.`;
    const reply = await callGeminiChat(sysPrompt, aiChatHistory.slice(-12));
    aiChatHistory.push({ role: 'assistant', content: reply });
    const typingEl = document.getElementById(typingId);
    if (typingEl) {
      typingEl.classList.remove('typing');
      typingEl.querySelector('.ai-msg-text').innerHTML = formatAiText(reply);
    }
  } catch(e) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) {
      const errText = (e.message === 'No API key set' || e.message === 'No API key')
        ? '🔑 Please set your Gemini API key first! Click the AI: tab in the menu.'
        : e.message === 'invalid_key'
        ? '❌ API key rejected. Click the AI: tab to update it.'
        : `⚠️ Error: ${e.message}. Please try again!`;
      typingEl.querySelector('.ai-msg-text').textContent = errText;
      typingEl.classList.remove('typing');
    }
    console.error('AI Chat error:', e);
  }
  document.getElementById('aiSendBtn').disabled = false;
  scrollAiChat();
}

function appendAiMsg(role, text, id, isTyping) {
  const feed = document.getElementById('aiChatFeed');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + role + (isTyping ? ' typing' : '');
  if (id) div.id = id;
  const avatar = role === 'user'
    ? `<div class="ai-av user-av">${initial(userName)||'U'}</div>`
    : `<div class="ai-av bot-av">🤖</div>`;
  div.innerHTML = avatar + `<div class="ai-msg-bubble"><div class="ai-msg-text">${isTyping ? '<span class="typing-dots"><span></span><span></span><span></span></span>' : formatAiText(text)}</div></div>`;
  feed.appendChild(div);
  scrollAiChat();
}

function formatAiText(t) {
  return t
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code style="background:var(--surface3);padding:1px 6px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:.85em">$1</code>')
    .replace(/\n/g,'<br>');
}

function scrollAiChat() {
  const feed = document.getElementById('aiChatFeed');
  if (feed) setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 60);
}

function aiChatEnter(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
}

function clearAiChat() {
  aiChatHistory = [];
  const hasKey = !!getGeminiKey();
  const keyBanner = hasKey ? '' : `<div style="background:linear-gradient(135deg,var(--pink3),var(--gold-dim));border:1.5px solid rgba(232,112,138,.25);border-radius:14px;padding:14px 18px;margin-bottom:16px;text-align:center;cursor:pointer" onclick="openApiKeyModal()"><div style="font-size:1.2rem;margin-bottom:4px">🔑</div><div style="font-weight:800;font-size:.88rem;color:var(--rose);margin-bottom:3px">Set up your free AI key</div><div style="font-size:.75rem;color:var(--muted)">Tap here to connect Google Gemini (free, 1500 req/day)</div></div>`;
  document.getElementById('aiChatFeed').innerHTML = `<div class="ai-welcome">${keyBanner}<div class="ai-welcome-icon">🤖</div><div class="ai-welcome-title">Hey there, I'm your AI Tutor!</div><div class="ai-welcome-sub">Ask me anything — concepts, homework help, study tips, or just to explain something tricky.</div><div class="ai-quick-btns"><button onclick="quickAsk('Explain the Pomodoro technique to me')">⏱ Pomodoro tips</button><button onclick="quickAsk('How do I stay focused while studying?')">🎯 Focus tips</button><button onclick="quickAsk('Give me a quick quiz on any topic')">🧠 Quick quiz</button><button onclick="quickAsk('Motivate me to study!')">✨ Motivate me</button></div></div>`;
}

function quickAsk(q) {
  document.getElementById('aiChatInput').value = q;
  sendAiMessage();
}

window.sendAiMessage = sendAiMessage;
window.aiChatEnter = aiChatEnter;
window.clearAiChat = clearAiChat;
window.quickAsk = quickAsk;

// ── AI STUDY INSIGHTS ──
let insightsLoaded = false;

async function generateInsights() {
  const btn = document.getElementById('insightsGenBtn');
  const out = document.getElementById('insightsOutput');
  btn.disabled = true;
  btn.textContent = '✨ Analyzing...';
  out.innerHTML = '<div class="insights-loading"><div class="insights-spinner"></div><p>Crunching your study data…</p></div>';

  const totalMins = subjects.reduce((a,s) => a + s.totalMins, 0) + pomoFocusMin;
  const totalHrs = (totalMins / 60).toFixed(1);
  const subjectBreakdown = subjects.map(s => `${s.name}: ${s.totalMins} mins`).join(', ') || 'No subjects tracked yet';
  const streakInfo = `Study streak: ${pomoStreak} days`;
  const pomoInfo = `Pomodoros completed: ${pomoSessions}`;
  const lvlInfo = getLevelInfo(xp);

  try {
    const sysPrompt = 'You are an expert learning coach and data analyst. Analyze study data and give personalized, actionable insights. Be encouraging but honest. Return ONLY valid JSON with no markdown, no extra text, in this exact structure: {"overall":"2-3 sentence overall assessment","strengths":["strength1","strength2","strength3"],"improvements":["tip1","tip2","tip3"],"focus_subject":"best subject to focus on next","daily_goal":"suggested daily study goal in minutes","motivation":"one powerful motivational sentence","score":85}';
    const userMsg = `Here is my study data: Total study time: ${totalHrs} hours. ${subjectBreakdown}. ${streakInfo}. ${pomoInfo}. XP: ${xp}, Level: ${lvlInfo.level} (${lvlInfo.title}). Analyze this and give me personalized insights.`;
    const raw = await callGemini(sysPrompt, userMsg);
    const insights = extractJson(raw);
    renderInsights(insights);
  } catch(e) {
    if (e.message === 'No API key set' || e.message === 'No API key') {
      out.innerHTML = '<div class="insights-error" style="cursor:pointer" onclick="openApiKeyModal()">🔑 Set up your free Gemini API key to unlock AI Insights! <strong>Click here →</strong></div>';
    } else if (e.message === 'invalid_key') {
      out.innerHTML = '<div class="insights-error">❌ API key issue. Click the <strong>AI: tab</strong> to update it.</div>';
    } else {
      out.innerHTML = `<div class="insights-error">⚠️ Error: ${e.message}. Please try again!</div>`;
      console.error('Insights error:', e);
    }
  }
  btn.disabled = false;
  btn.textContent = '🔄 Refresh Insights';
}

function renderInsights(d) {
  const out = document.getElementById('insightsOutput');
  const score = d.score || 50;
  const scoreColor = score >= 80 ? 'var(--sage)' : score >= 60 ? 'var(--gold)' : 'var(--pink)';
  out.innerHTML = `
    <div class="insight-score-ring" style="--score:${score};--score-color:${scoreColor}">
      <div class="insight-score-inner">
        <div class="insight-score-num">${score}</div>
        <div class="insight-score-lbl">Study Score</div>
      </div>
    </div>
    <div class="insight-card overall-card">
      <div class="insight-card-icon">📊</div>
      <div class="insight-card-content">
        <div class="insight-card-title">Overall Assessment</div>
        <p>${d.overall || ''}</p>
      </div>
    </div>
    <div class="insight-two-col">
      <div class="insight-card strengths-card">
        <div class="insight-card-icon">💪</div>
        <div class="insight-card-title">Your Strengths</div>
        <ul>${(d.strengths||[]).map(s=>`<li>${s}</li>`).join('')}</ul>
      </div>
      <div class="insight-card improvements-card">
        <div class="insight-card-icon">🎯</div>
        <div class="insight-card-title">Areas to Improve</div>
        <ul>${(d.improvements||[]).map(s=>`<li>${s}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="insight-row-cards">
      <div class="insight-mini-card">
        <div class="imc-icon">📚</div>
        <div class="imc-label">Focus Subject</div>
        <div class="imc-val">${d.focus_subject || '—'}</div>
      </div>
      <div class="insight-mini-card">
        <div class="imc-icon">⏱</div>
        <div class="imc-label">Daily Goal</div>
        <div class="imc-val">${d.daily_goal ? d.daily_goal + ' min' : '—'}</div>
      </div>
    </div>
    <div class="insight-motivation">
      <div class="im-icon">✨</div>
      <div class="im-text">${d.motivation || ''}</div>
    </div>
  `;
}

window.generateInsights = generateInsights;

// ── FLASHCARDS ──
let flashcardDecks = JSON.parse(localStorage.getItem('sd_flashcard_decks') || '[]');
let currentDeckIdx = null;
let currentCardIdx = 0;
let cardFlipped = false;

function saveFlashcardDecks() {
  localStorage.setItem('sd_flashcard_decks', JSON.stringify(flashcardDecks));
}

function renderFlashcardDecks() {
  const list = document.getElementById('flashcardDeckList');
  if (!flashcardDecks.length) {
    list.innerHTML = '<div class="fc-empty">No decks yet — create one or generate with AI! 🃏</div>';
    return;
  }
  list.innerHTML = flashcardDecks.map((deck, i) => `
    <div class="fc-deck-item" onclick="openDeck(${i})">
      <div class="fc-deck-icon">${deck.icon || '📚'}</div>
      <div class="fc-deck-info">
        <div class="fc-deck-name">${deck.name}</div>
        <div class="fc-deck-count">${deck.cards.length} cards</div>
      </div>
      <div class="fc-deck-actions">
        <button onclick="event.stopPropagation();deleteDeck(${i})" class="fc-del-btn">🗑</button>
      </div>
    </div>
  `).join('');
}

function openDeck(idx) {
  currentDeckIdx = idx;
  currentCardIdx = 0;
  cardFlipped = false;
  document.getElementById('fcDeckView').style.display = 'none';
  document.getElementById('fcStudyView').style.display = 'block';
  renderStudyCard();
}

function renderStudyCard() {
  const deck = flashcardDecks[currentDeckIdx];
  if (!deck || !deck.cards.length) return;
  const card = deck.cards[currentCardIdx];
  const total = deck.cards.length;

  document.getElementById('fcStudyDeckName').textContent = deck.name;
  document.getElementById('fcCardProgress').textContent = `${currentCardIdx + 1} / ${total}`;
  document.getElementById('fcProgressBar').style.width = ((currentCardIdx + 1) / total * 100) + '%';

  const frontEl = document.getElementById('fcCardFront');
  const backEl = document.getElementById('fcCardBack');
  frontEl.innerHTML = `<div class="fc-card-label">QUESTION</div><div class="fc-card-main-text">${card.front}</div>`;
  backEl.innerHTML = `<div class="fc-card-label answer-label">ANSWER</div><div class="fc-card-main-text">${card.back}</div>`;

  const cardInner = document.getElementById('fcCardInner');
  cardFlipped = false;
  cardInner.style.transform = 'rotateY(0deg)';
}

function flipCard() {
  const cardInner = document.getElementById('fcCardInner');
  cardFlipped = !cardFlipped;
  cardInner.style.transform = cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
}

function nextCard() {
  const deck = flashcardDecks[currentDeckIdx];
  if (currentCardIdx < deck.cards.length - 1) {
    currentCardIdx++;
    cardFlipped = false;
    document.getElementById('fcCardInner').style.transform = 'rotateY(0deg)';
    renderStudyCard();
  } else {
    showToast('🎉 Deck complete! Great work!');
    awardXP(20, 'Completed flashcard deck');
    awardCoins(10, 'Flashcard session');
  }
}

function prevCard() {
  if (currentCardIdx > 0) {
    currentCardIdx--;
    cardFlipped = false;
    document.getElementById('fcCardInner').style.transform = 'rotateY(0deg)';
    renderStudyCard();
  }
}

function shuffleCards() {
  const deck = flashcardDecks[currentDeckIdx];
  for (let i = deck.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
  }
  currentCardIdx = 0;
  renderStudyCard();
  showToast('Cards shuffled! 🔀');
}

function closeDeck() {
  document.getElementById('fcDeckView').style.display = 'block';
  document.getElementById('fcStudyView').style.display = 'none';
  renderFlashcardDecks();
}

function deleteDeck(idx) {
  if (!confirm('Delete this deck?')) return;
  flashcardDecks.splice(idx, 1);
  saveFlashcardDecks();
  renderFlashcardDecks();
  showToast('Deck deleted.');
}

function openCreateDeck() {
  document.getElementById('fcCreateModal').classList.remove('hidden');
  document.getElementById('fcNewDeckName').value = '';
  document.getElementById('fcNewDeckCards').value = '';
}

function closeCreateDeck() {
  document.getElementById('fcCreateModal').classList.add('hidden');
}

function saveNewDeck() {
  const name = document.getElementById('fcNewDeckName').value.trim();
  const raw = document.getElementById('fcNewDeckCards').value.trim();
  if (!name) { showToast('Enter a deck name!'); return; }
  const cards = raw.split('\n').filter(l => l.includes('|')).map(l => {
    const [front, ...rest] = l.split('|');
    return { front: front.trim(), back: rest.join('|').trim() };
  }).filter(c => c.front && c.back);
  if (!cards.length) { showToast('Add at least one card using Q | A format'); return; }
  flashcardDecks.push({ name, icon: '📚', cards });
  saveFlashcardDecks();
  renderFlashcardDecks();
  closeCreateDeck();
  showToast(`Deck "${name}" created with ${cards.length} cards! 🃏`);
  awardXP(15, 'Created flashcard deck');
}

async function aiGenerateDeck() {
  const topic = document.getElementById('fcAiTopic').value.trim();
  if (!topic) { showToast('Enter a topic first!'); return; }
  const btn = document.getElementById('fcAiGenBtn');
  btn.disabled = true;
  btn.textContent = '✨ Generating...';

  try {
    const sysPrompt = 'You are a flashcard generator. Create educational flashcards. Return ONLY a valid JSON array with no markdown, no extra text: [{"front":"question","back":"answer"}]. Generate 8-12 high-quality cards.';
    const raw = await callGemini(sysPrompt, `Create flashcards for: ${topic}`);
    const cards = extractJson(raw);
    if (!Array.isArray(cards) || !cards.length) throw new Error('Bad response');
    flashcardDecks.push({ name: topic, icon: '🤖', cards });
    saveFlashcardDecks();
    renderFlashcardDecks();
    document.getElementById('fcAiTopic').value = '';
    showToast(`AI created ${cards.length} cards on "${topic}"! 🤖`);
    awardXP(10, 'AI flashcard generation');
    awardCoins(15, 'Created AI flashcards');
  } catch(e) {
    if (e.message === 'No API key set' || e.message === 'No API key' || e.message === 'invalid_key') { btn.disabled=false; btn.textContent='✨ Generate with AI'; return; }
    showToast('⚠️ ' + (e.message || 'AI generation failed') + '. Try again!');
    console.error('Flashcard AI error:', e);
  }
  btn.disabled = false;
  btn.textContent = '✨ Generate with AI';
}

window.openDeck = openDeck;
window.flipCard = flipCard;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.shuffleCards = shuffleCards;
window.closeDeck = closeDeck;
window.deleteDeck = deleteDeck;
window.openCreateDeck = openCreateDeck;
window.closeCreateDeck = closeCreateDeck;
window.saveNewDeck = saveNewDeck;
window.aiGenerateDeck = aiGenerateDeck;

// ── QUIZ ──
let quizQuestions = [];
let quizCurrent = 0;
let quizScore = 0;
let quizAnswered = false;
let quizActive = false;

async function generateQuiz() {
  const topic = document.getElementById('quizTopicInput').value.trim();
  const difficulty = document.getElementById('quizDifficulty').value;
  const count = parseInt(document.getElementById('quizCount').value) || 5;
  if (!topic) { showToast('Enter a topic first!'); return; }

  const btn = document.getElementById('quizGenBtn');
  btn.disabled = true;
  btn.textContent = '🧠 Generating...';
  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('quizLoading').style.display = 'flex';

  try {
    const sysPrompt = 'You are a quiz generator. Return ONLY a valid JSON array with no markdown or extra text. Each item must be: {"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"brief explanation"}. The correct field is the 0-based index of the correct option in the options array.';
    const raw = await callGemini(sysPrompt, `Generate ${count} ${difficulty} multiple choice questions about: ${topic}`);
    quizQuestions = extractJson(raw);
    if (!Array.isArray(quizQuestions) || !quizQuestions.length) throw new Error('Bad response');
    quizCurrent = 0;
    quizScore = 0;
    quizAnswered = false;
    quizActive = true;
    document.getElementById('quizLoading').style.display = 'none';
    document.getElementById('quizGame').style.display = 'block';
    document.getElementById('quizTopicDisplay').textContent = topic;
    renderQuizQuestion();
  } catch(e) {
    document.getElementById('quizLoading').style.display = 'none';
    document.getElementById('quizSetup').style.display = 'block';
    if (e.message !== 'No API key set' && e.message !== 'No API key' && e.message !== 'invalid_key') {
      showToast('⚠️ ' + (e.message || 'Quiz generation failed') + '. Try again!');
      console.error('Quiz AI error:', e);
    }
  }
  btn.disabled = false;
  btn.textContent = '🚀 Start Quiz';
}

function renderQuizQuestion() {
  if (quizCurrent >= quizQuestions.length) { showQuizResults(); return; }
  const q = quizQuestions[quizCurrent];
  document.getElementById('quizQuestionNum').textContent = `Question ${quizCurrent + 1} of ${quizQuestions.length}`;
  document.getElementById('quizProgressFill').style.width = (quizCurrent / quizQuestions.length * 100) + '%';
  document.getElementById('quizQuestionText').textContent = q.question;
  document.getElementById('quizExplanation').style.display = 'none';
  quizAnswered = false;

  const optionsEl = document.getElementById('quizOptions');
  optionsEl.innerHTML = q.options.map((opt, i) => `
    <button class="quiz-option" onclick="answerQuiz(${i})">${String.fromCharCode(65+i)}. ${opt}</button>
  `).join('');

  const nextBtn = document.getElementById('quizNextBtn');
  nextBtn.style.display = 'none';
}

function answerQuiz(idx) {
  if (quizAnswered) return;
  quizAnswered = true;
  const q = quizQuestions[quizCurrent];
  const options = document.querySelectorAll('.quiz-option');

  options[q.correct].classList.add('correct');
  if (idx !== q.correct) {
    options[idx].classList.add('wrong');
  } else {
    quizScore++;
  }
  options.forEach(o => o.disabled = true);

  document.getElementById('quizExplanation').style.display = 'block';
  document.getElementById('quizExplanationText').textContent = q.explanation || '';
  document.getElementById('quizNextBtn').style.display = 'block';
}

function nextQuizQuestion() {
  quizCurrent++;
  if (quizCurrent >= quizQuestions.length) { showQuizResults(); }
  else { renderQuizQuestion(); }
}

function showQuizResults() {
  document.getElementById('quizGame').style.display = 'none';
  document.getElementById('quizResults').style.display = 'block';
  const pct = Math.round(quizScore / quizQuestions.length * 100);
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚';
  const msg = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep studying!';
  document.getElementById('quizResultEmoji').textContent = emoji;
  document.getElementById('quizResultScore').textContent = `${quizScore} / ${quizQuestions.length}`;
  document.getElementById('quizResultPct').textContent = pct + '%';
  document.getElementById('quizResultMsg').textContent = msg;
  const xpEarned = quizScore * 5;
  const coinsEarned = quizScore * 3;
  awardXP(xpEarned, 'Quiz completed');
  awardCoins(coinsEarned, 'Quiz performance');
  showToast(`Quiz done! +${xpEarned} XP, +${coinsEarned} 🍄`);
}

function resetQuiz() {
  quizActive = false;
  quizQuestions = [];
  document.getElementById('quizGame').style.display = 'none';
  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizSetup').style.display = 'block';
  document.getElementById('quizTopicInput').value = '';
}

window.generateQuiz = generateQuiz;
window.answerQuiz = answerQuiz;
window.nextQuizQuestion = nextQuizQuestion;
window.resetQuiz = resetQuiz;

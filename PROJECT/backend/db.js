// Catalog of Hindi songs (metadata only). Cover art + audio are resolved at runtime via the iTunes Search API.
const fs = require('fs'), path = require('path');
const SONGS_DIR = path.join(__dirname, 'songs');
const MOODS = { R: 'Romantic', P: 'Party', S: 'Sad', T: 'Retro', J: 'Punjabi', D: 'Devotional & Patriotic' };
const RAW = {
R: `Tum Hi Ho|Arijit Singh;Kesariya|Arijit Singh;Raabta|Arijit Singh;Tera Ban Jaunga|Akhil Sachdeva;Pehla Nasha|Udit Narayan;Tujhe Dekha To|Kumar Sanu;Humsafar|Akhil Sachdeva;Tum Se Hi|Mohit Chauhan;Tera Hone Laga Hoon|Atif Aslam;Hawayein|Arijit Singh;Apna Bana Le|Arijit Singh;Tere Vaaste|Varun Jain;Raataan Lambiyan|Jubin Nautiyal;Humnava Mere|Jubin Nautiyal;Dil Diyan Gallan|Atif Aslam;Kabira|Tochi Raina;Ve Kamleya|Arijit Singh;Mast Magan|Arijit Singh;Phir Le Aya Dil|Arijit Singh;Soch Na Sake|Arijit Singh;Lag Ja Gale|Lata Mangeshkar;Tum Mile|Neeraj Shridhar;Zara Zara|Bombay Jayashree;Pal Pal Dil Ke Paas|Arijit Singh;Tum Hi Aana|Jubin Nautiyal;Mere Liye Tum Kaafi Ho|Ayushmann Khurrana;Qaafirana|Arijit Singh;Tera Zikr|Darshan Raval;Chogada|Darshan Raval;Ranjha|B Praak`,
S: `Agar Tum Saath Ho|Arijit Singh;Channa Mereya|Arijit Singh;Tujhe Kitna Chahne Lage|Arijit Singh;Phir Bhi Tumko Chahunga|Arijit Singh;Bekhayali|Sachet Tandon;Kabhi Jo Baadal Barse|Arijit Singh;Tadap Tadap|KK;Jeene Laga Hoon|Atif Aslam;Hamari Adhuri Kahani|Arijit Singh;Muskurane|Arijit Singh;Ae Dil Hai Mushkil|Arijit Singh;Sunn Raha Hai|Ankit Tiwari;Kaise Hua|Vishal Mishra;Kal Ho Naa Ho|Sonu Nigam;Abhi Mujh Mein Kahin|Sonu Nigam;Tere Bina|A. R. Rahman;Judaai|Arijit Singh;Yeh Dooriyan|Mohit Chauhan;Dil Ibaadat|KK;Tu Hi Hai Aashiqui|Arijit Singh;Khairiyat|Arijit Singh;Phir Kabhi|Arijit Singh;Main Rahoon Ya Na Rahoon|Armaan Malik;Pachtaoge|Arijit Singh;Jab Tak|Armaan Malik`,
P: `Badtameez Dil|Benny Dayal;Balam Pichkari|Vishal Dadlani;London Thumakda|Labh Janjua;Kala Chashma|Badshah;Swag Se Swagat|Vishal Dadlani;Chittiyaan Kalaiyaan|Kanika Kapoor;Lungi Dance|Yo Yo Honey Singh;Abhi Toh Party Shuru Hui Hai|Badshah;DJ Waley Babu|Badshah;Genda Phool|Badshah;Dilbar|Neha Kakkar;Kar Gayi Chull|Badshah;Gerua|Arijit Singh;Nashe Si Chadh Gayi|Arijit Singh;Ghungroo|Arijit Singh;Jhoome Jo Pathaan|Arijit Singh;Besharam Rang|Shilpa Rao;Malhari|Vishal Dadlani;Aankh Marey|Neha Kakkar;Sheila Ki Jawani|Sunidhi Chauhan;Munni Badnaam Hui|Mamta Sharma;Chikni Chameli|Shreya Ghoshal;Dhoom Machale|Sunidhi Chauhan;Desi Girl|Vishal Dadlani;Nagada Sang Dhol|Shreya Ghoshal;Ghagra|Rekha Bhardwaj;Coca Cola|Tony Kakkar;Kamariya|Aastha Gill;Mauja Hi Mauja|Mika Singh;Tamma Tamma|Badshah;Saturday Saturday|Indeep Bakshi;Sauda Khara Khara|Sukhbir;Ainvayi Ainvayi|Salim Merchant;Bole Chudiyan|Udit Narayan`,
T: `Mere Sapnon Ki Rani|Kishore Kumar;Yeh Shaam Mastani|Kishore Kumar;Roop Tera Mastana|Kishore Kumar;Chura Liya Hai Tumne|Asha Bhosle;Aaj Kal Tere Mere Pyar Ke Charche|Mohammed Rafi;Kabhi Kabhie Mere Dil Mein|Mukesh;Dum Maro Dum|Asha Bhosle;Piya Tu Ab To Aaja|Asha Bhosle;Ek Ladki Ko Dekha|Kumar Sanu;Chaiyya Chaiyya|Sukhwinder Singh;Kuch Kuch Hota Hai|Udit Narayan;Mera Joota Hai Japani|Mukesh;Papa Kehte Hain|Udit Narayan;Mujhe Neend Na Aaye|Udit Narayan;Kaho Naa Pyaar Hai|Udit Narayan;Ye Kaali Kaali Aankhen|Udit Narayan;Dil To Pagal Hai|Lata Mangeshkar;Jadoo Teri Nazar|Udit Narayan;Pardesi Pardesi|Udit Narayan;Mera Dil Bhi Kitna Pagal Hai|Kumar Sanu`,
J: `Lahore|Guru Randhawa;High Rated Gabru|Guru Randhawa;Suit Suit|Guru Randhawa;Brown Munde|AP Dhillon;Excuses|AP Dhillon;Softly|Karan Aujla;Lover|Diljit Dosanjh;Laembadgini|Diljit Dosanjh;Proper Patola|Diljit Dosanjh;Qismat|Ammy Virk;Pani Di Gal|Maninder Buttar;Tera Ghata|Gajendra Verma;Naah|Harrdy Sandhu;Bijlee Bijlee|Harrdy Sandhu`,
D: `Shri Hanuman Chalisa|Hariharan;Deva Shree Ganesha|Ajay-Atul;Teri Mitti|B Praak;Maa|Shankar Mahadevan;Kun Faya Kun|A. R. Rahman;Khwaja Mere Khwaja|A. R. Rahman;Jai Ho|A. R. Rahman;Ilahi|Arijit Singh;Kar Har Maidan Fateh|Sukhwinder Singh;Chak De India|Sukhwinder Singh;Ae Watan|Arijit Singh;Vande Mataram|A. R. Rahman;Maa Tujhe Salaam|A. R. Rahman;Om Jai Jagdish Hare|Anuradha Paudwal;Shiv Tandav Stotram|Shankar Mahadevan`,
};
let n = 0;
const catalog = [];
for (const k in RAW) for (const e of RAW[k].split(';')) {
  const [title, artist] = e.split('|');
  catalog.push({ id: 'h' + ++n, title, artist, mood: MOODS[k] });
}
function loadSongs() {
  const list = [...catalog];
  if (fs.existsSync(SONGS_DIR)) fs.readdirSync(SONGS_DIR).forEach((f, i) => {
    const ext = path.extname(f).toLowerCase();
    if (!['.mp3', '.ogg', '.wav', '.m4a', '.flac'].includes(ext)) return;
    const [a, ...t] = path.basename(f, ext).split(' - ');
    list.push({ id: 'l' + i, title: t.length ? t.join(' - ') : a, artist: t.length ? a : 'My Music', mood: 'My Music', url: '/songs/' + encodeURIComponent(f) });
  });
  return list;
}
module.exports = { loadSongs, SONGS_DIR };

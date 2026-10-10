/* js/classes.js — Biến trạng thái toàn cục (state,animSpeed,gameId) + CLASSES:4 class và 5 kỹ năng mỗi class. */
/* =====================================================
   PHẦN 2:TRẠNG THÁI GAME (mọi dữ liệu thay đổi nằm đây)
   ===================================================== */
let state;
let animSpeed = 1;   // 1 = chậm (mặc định) · 2 = nhanh,đúng gấp đôi x1
try { if (localStorage.getItem("rpgAnim") === "2") animSpeed = 2; } catch (e) {}
const TS_X1 = 2.5,TS = () => animSpeed === 2 ? TS_X1 / 2 :TS_X1,sleep = ms => new Promise(r => setTimeout(r,ms * TS()));
function setAnimSpeed(v,save) {
  animSpeed = v; document.documentElement.style.setProperty("--ts",TS());
  const b = $("speedbtn"); if (b) { b.textContent = v === 2 ? "⏩ x2" :"▶ x1"; b.classList.toggle("on",v === 2); }
  if (save) try { localStorage.setItem("rpgAnim",v); } catch (e) {}
}

/* ----- CLASS:mỗi class 5 kỹ năng (c = mana,t = loại,m = hệ số sát thương,a = lượng hồi)
         tier:basic (cơ bản) · adv (nâng cao) · ult (tối thượng,luôn là kỹ năng số 5,nút lớn cuối bảng Kỹ năng)
         cdn:hồi chiêu (số lượt phải chờ sau khi dùng; giảm 1 sau mỗi lượt của chủ và thêm 1 sau mỗi trận thắng) ----- */
const CLASSES = {
  knight:{ name:"Hiệp sĩ",icon:"🤺",wp:"🛡️",col:"#5b8def",role:"Tank",tag:"Chắn đòn, bảo vệ cả đội",rt:[5,2,2,3],hp:185,mana:60,rg:9,lv:{ hp:18,atk:2 },a:[8,13],crit:.07,luck:3,cd:1.5,spd:8,eva:.03,red:.6,sk:[
    { n:"Khiêu khích",tier:"basic",cdn:2,i:"📣",c:10,t:"taunt",dur:4,d:"Hút đòn, -40% st (3 lượt)",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Khiêu khích thép",dur:6 },
        b:{ n:"Khiêu khích dồn dập",dur:5,c:6,cdn:1,cond:{ k:"uses",n:10,txt:"Khiêu khích 10 lần" } } } },
    { n:"Đập khiên",tier:"basic",cdn:2,i:"🔨",c:10,t:"hit",m:2.4,st:[["stun",1,.7]],d:"St mạnh,choáng 70%",
      evo:{ exp:100,xp:{ use:10,stuns:15 },
        a:{ n:"Đập khiên chấn động",m:1.2,st:[["stun",1,.85]] },
        b:{ n:"Đập khiên liên hoàn",st:[["stun",1,.7]],cdn:1,cond:{ k:"stuns",n:5,txt:"Đập khiên choáng 5 lần" } } } },
    { n:"Tường thép",tier:"adv",cdn:3,i:"🧱",c:15,t:"guard",dur:4,d:"-70% st (3 lượt)",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Tường thành",dur:6 },
        b:{ n:"Tường thép cơ động",dur:5,c:10,cond:{ k:"uses",n:8,txt:"Tường thép 8 lần" } } } },
    { n:"Gầm thét",tier:"adv",cdn:4,i:"🦁",c:14,t:"debuff",dur:4,st:[["weak",3,1]],d:"Quái yếu 3 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Gầm thét uy vũ",dur:6,st:[["weak",5,1]] },
        b:{ n:"Gầm thét dồn dập",st:[["weak",3,1]],cdn:2,cond:{ k:"uses",n:8,txt:"Gầm thét 8 lần" } } } },
    { n:"Phản đòn",tier:"ult",cdn:5,i:"🌵",c:20,t:"thorns",dur:5,d:"Phản 50% st (4 lượt)",
      evo:{ exp:150,xp:{ use:10 },
        a:{ n:"Phản đòn tuyệt đối",dur:7 },
        b:{ n:"Phản đòn liên tục",cdn:3,cond:{ k:"uses",n:6,txt:"Phản đòn 6 lần" } } } } ] },
  swordmaster:{ name:"Kiếm sĩ",icon:"⚔️",wp:"🗡️",col:"#38bdf8",role:"DPS",tag:"Chém liên hoàn, kiếm khí sắc bén",rt:[1,5,5,1],hp:130,mana:60,lv:{ hp:20,atk:2 },a:[13,19],crit:.15,luck:6,cd:1.6,spd:14,eva:.10,red:.5,sk:[
    { n:"Kiếm khí",tier:"basic",cdn:2,i:"💨",c:12,t:"hit",m:1.7,st:[["bleed",3,.5,.25]],d:"Phóng kiếm khí, 50% gây chảy máu 3 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Kiếm khí phá không",m:2.4,st:[["bleed",3,.7,.25]] },
        b:{ n:"Kiếm khí liên phát",m:2.0,c:8,cond:{ k:"uses",n:8,txt:"Kiếm khí 8 lần" } } } },
    { n:"Huyết kiếm",tier:"basic",cdn:2,i:"🩸",c:12,t:"hit",m:1.8,ls:0.5,d:"Chém 1 mục tiêu, hút 50% sát thương thành máu",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Huyết kiếm cuồng nộ",m:2.4,ls:0.6 },
        b:{ n:"Huyết kiếm linh hoạt",m:2.0,c:8,cond:{ k:"uses",n:8,txt:"Huyết kiếm 8 lần" } } } },
    { n:"Liên trảm",tier:"adv",cdn:2,i:"🌀",c:18,t:"multi",m:.9,d:"3 nhát chém liên hoàn ngẫu nhiên",
      evo:{ exp:100,xp:{ use:10,kills:15 },
        a:{ n:"Liên trảm cuồng phong",m:1.2 },
        b:{ n:"Liên trảm chớp nhoáng",c:12,cdn:1,cond:{ k:"kills",n:6,txt:"Hạ đủ 6 quái bằng Liên trảm" } } } },
    { n:"Thân pháp",tier:"adv",cdn:3,i:"💨",c:14,t:"evade",dur:4,d:"Tăng 40% né tránh trong 3 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Thân pháp thần hành",dur:6 },
        b:{ n:"Thân pháp linh động",dur:4,c:10,cond:{ k:"uses",n:8,txt:"Thân pháp 8 lần" } } } },
    { n:"Vạn kiếm quy tông",tier:"ult",cdn:6,i:"🌊",c:32,t:"aoe",m:2.4,d:"Kiếm khí xanh chém mọi quái",
      evo:{ exp:150,xp:{ use:10,kills:15 },
        a:{ n:"Vạn kiếm diệt thế",m:3.4 },
        b:{ n:"Vạn kiếm liên miên",m:2.8,cdn:4,cond:{ k:"kills",n:8,txt:"Hạ đủ 8 quái bằng Vạn kiếm quy tông" } } } } ] },
  cleric:{ name:"Nữ tu sĩ",icon:"😇",wp:"✝️",col:"#f2c230",role:"Healer",tag:"Hồi máu, hỗ trợ đồng đội",rt:[3,2,3,5],hp:130,mana:90,lv:{ hp:28,atk:3 },a:[12,17],crit:.03,luck:5,cd:1.5,spd:10,eva:.05,red:.5,sk:[
    { n:"Chữa lành",tier:"basic",cdn:1,i:"💚",c:12,t:"heal",a:55,d:"Hồi cho người yếu nhất, giải trừ hiệu ứng xấu",
      evo:{ exp:100,xp:{ use:10,clutch:20 },
        a:{ n:"Chữa lành mạnh",a:80 },
        b:{ n:"Chữa lành nhanh",cdn:0,cond:{ k:"clutch",n:3,txt:"Cứu nguy 3 lần" } } } },
    { n:"Niệm thánh",tier:"basic",cdn:1,i:"✝️",c:8,t:"hit",m:1.0,d:"Ánh sáng thánh đánh 1 mục tiêu (sát thương thấp)",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Niệm thánh mạnh",m:1.6 },
        b:{ n:"Niệm thánh nhanh",m:1.2,c:5,cond:{ k:"uses",n:10,txt:"Niệm thánh 10 lần" } } } },
    { n:"Phước lành",tier:"adv",cdn:4,i:"🙏",c:16,t:"buff",dur:5,d:"Cả đội +40% sát thương 4 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Phước lành lớn",dur:7 },
        b:{ n:"Phước lành nhanh",dur:5,c:10,cond:{ k:"uses",n:8,txt:"Phước lành 8 lần" } } } },
    { n:"Lá chắn thánh",tier:"adv",cdn:4,i:"🛡️",c:18,t:"shieldall",dur:4,d:"Tạo khiên thánh hấp thụ sát thương cho cả đội 3 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Lá chắn thánh vững",dur:6 },
        b:{ n:"Lá chắn thánh nhanh",cdn:2,cond:{ k:"uses",n:8,txt:"Lá chắn thánh 8 lần" } } } },
    { n:"Phán xét",tier:"ult",cdn:5,i:"⚖️",c:28,t:"debuff",dur:4,st:[["vuln",3,1]],d:"Mọi quái chịu +30% sát thương trong 3 lượt",
      evo:{ exp:150,xp:{ use:10 },
        a:{ n:"Phán xét cuối cùng",dur:6,st:[["vuln",5,1]] },
        b:{ n:"Phán xét liên tục",cdn:3,cond:{ k:"uses",n:6,txt:"Phán xét 6 lần" } } } } ] },
  mage:{ name:"Pháp sư",icon:"🧙",wp:"🔮",col:"#ff7a45",role:"AOE",tag:"Thiêu rụi cả bầy quái",rt:[2,5,3,2],hp:140,mana:110,lv:{ hp:28,atk:2 },a:[7,11],crit:.07,luck:5,cd:1.6,spd:10,eva:.05,red:.5,sk:[
    { n:"Cầu lửa",tier:"basic",cdn:1,i:"🔥",c:10,t:"hit",m:3.2,st:[["burn",3,.5,.2]],d:"Sát thương lớn 1 mục tiêu, 50% gây bỏng",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Cầu lửa lớn",m:4.0,st:[["burn",3,.7,.2]] },
        b:{ n:"Cầu lửa nhanh",m:3.4,c:7,cond:{ k:"uses",n:10,txt:"Cầu lửa 10 lần" } } } },
    { n:"Lá chắn mana",tier:"basic",cdn:2,i:"🔷",c:10,t:"manashield",dur:4,d:"Sát thương trừ vào mana trước trong 3 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Lá chắn mana vững",dur:6 },
        b:{ n:"Lá chắn mana nhanh",cdn:1,cond:{ k:"uses",n:8,txt:"Lá chắn mana 8 lần" } } } },
    { n:"Bão lửa",tier:"adv",cdn:2,i:"🌪️",c:22,t:"aoe",m:1.7,st:[["blind",2,.6]],d:"Đánh mọi quái, 60% gây mù 2 lượt",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Bão lửa dữ dội",m:2.2,st:[["blind",2,.8]] },
        b:{ n:"Bão lửa liên tục",cdn:1,cond:{ k:"uses",n:8,txt:"Bão lửa 8 lần" } } } },
    { n:"Băng giá",tier:"adv",cdn:4,i:"❄️",c:26,t:"freeze",m:.7,st:[["freeze",1,.75]],d:"Đánh mọi quái, 75% đóng băng 1 lượt (sau đó kháng khống chế)",
      evo:{ exp:100,xp:{ use:10 },
        a:{ n:"Băng giá tuyệt đối",m:.9,st:[["freeze",1,.9]] },
        b:{ n:"Băng giá nhanh",cdn:2,cond:{ k:"uses",n:8,txt:"Băng giá 8 lần" } } } },
    { n:"Thiên thạch",tier:"ult",cdn:6,i:"☄️",c:42,t:"aoe",m:4.2,st:[["stun",1,.5]],d:"Đòn hủy diệt mọi quái, 50% gây choáng",
      evo:{ exp:150,xp:{ use:10,kills:15 },
        a:{ n:"Thiên thạch hủy diệt",m:5.0,st:[["stun",1,.7]] },
        b:{ n:"Mưa thiên thạch",m:4.6,cdn:4,cond:{ k:"kills",n:8,txt:"Hạ đủ 8 quái bằng Thiên thạch" } } } } ] }
};
let gameId = 0,myClass = "knight";
try { const c = localStorage.getItem("rpgClass"); if (CLASSES[c]) myClass = c; } catch (e) {}


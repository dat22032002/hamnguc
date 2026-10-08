/* js/boot.js — Điểm khởi động: hiện menu chính. Luôn nạp CUỐI CÙNG. */
/* Than lửa bay trên nền menu (ảnh tĩnh + hiệu ứng động) */
{ const em = $("m-embers");
  if (em) for (let i = 0; i < 16; i++) {
    const s = document.createElement("i");
    s.style.left = (4 + Math.random() * 92) + "%";
    const d = 6 + Math.random() * 8, sz = 2 + Math.random() * 3;
    s.style.width = s.style.height = sz + "px";
    s.style.animationDuration = d + "s"; s.style.animationDelay = (-Math.random() * d) + "s";
    em.appendChild(s);
  } }
showMenu();

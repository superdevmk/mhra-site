document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector("[data-sponsors-track]");
  if (!track) return;

  const logos = [
    "A1.png",
    "AD Verbum.png",
    "ALKALOID.png",
    "Chaos.jpg",
    "Euro tabak.png",
    "EVN.png",
    "Feniks.jpg",
    "Fitkit.png",
    "Flexcredit.png",
    "Genuine Dynamics.png",
    "Infinum.png",
    "Intuim.png",
    "Ittude.png",
    "Joyson.png",
    "KAM.png",
    "Kitanovski&D2EM.png",
    "Kola.png",
    "Manpower.png",
    "Movement.png",
    "NELT.jpg",
    "Neptun.png",
    "NOVA.jpg",
    "OKTA.jpg",
    "Posrednik24.png",
    "Progresiv Akademija.jpg",
    "Proup Grade.png",
    "Proxiad.png",
    "Prudens.png",
    "Replek.jpg",
    "RSM Makedonija.png",
    "SAVA.jpg",
    "Sonik.png",
    "Sparkasse.png",
    "Systemic and NLP.jpg",
    "TAV.jpg",
    "Thrivity.png",
    "Transcom.png",
    "Triglav.png",
    "UACS.png",
    "Widnet.jpg"
  ];

  // duplikim për loop pa glitch
  const all = [...logos, ...logos];

  track.innerHTML = all.map(name => `
  <div class="event-pill sponsor-pill">
    <img class="sponsor-img" src="../assets/img/sponsors/${name}" alt="" loading="lazy">
  </div>
`).join("");
});

Muutetaan ydinsotavaihe niin, että pelaajalla on käytettävissään vain se määrä ohjuksia ja iskuja, mitä hän on pelin aikana rakentanut tai tuottanut (pommittajat, sukellusveneet ja kehitetyt ICBM-valmiudet sekä ABM-torjuntaohjukset). Jokainen isku kartalle tai torjunta kuluttaa resursseja suoraan pelaajan arsenaalista!

Tässä on päivitetty src/App.tsx-koodi, jossa sotilaallinen arsenaali on nyt tiukasti sidottu pelin sisäisiin resursseihin ja tuotettuihin laivueisiin:

    TypeScript
import React, { useEffect, useRef, useState } from 'react';

interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

interface MissileData {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  prevX: number;
  prevY: number;
  distance: number;
  traveled: number;
  speed: number;
  isPlayer: boolean;
  active: boolean;
  isInterceptor?: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface ExplosionData {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  isPlayer: boolean;
  flashAlpha: number;
  isMushroom: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface DiplomacyQuestion {
  title: string;
  question: string;
  options: {
    text: string;
    crisisEffect: number;
    resourceEffect: number;
    approvalEffect: number;
    reply: string;
  }[];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [year, setYear] = useState<number>(1946);
  const [techLevel, setTechLevel] = useState<number>(1);
  const [enemyTechLevel, setEnemyTechLevel] = useState<number>(1);

  const [approvalRating, setApprovalRating] = useState<number>(50);
  const [bombers, setBombers] = useState<number>(2); // Strategiset pommittajat / ohjusvarastot
  const [submarines, setSubmarines] = useState<number>(1); // Ydinsukellusveneet

  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<'inauguration' | 'game' | 'diplomacy' | 'enemyDeclaration'>('inauguration');

  const playerSiloPos = { x: 195, y: 165 };
  const [playerCities, setPlayerCities] = useState<City[]>([
    { id: 'pc1', name: 'Washington', x: 235, y: 172, hp: 100, alive: true },
    { id: 'pc2', name: 'New York', x: 245, y: 158, hp: 100, alive: true },
    { id: 'pc3', name: 'Los Angeles', x: 140, y: 182, hp: 100, alive: true }
  ]);

  const enemySiloPos = { x: 670, y: 135 };
  const [enemyCities, setEnemyCities] = useState<City[]>([
    { id: 'ec1', name: 'Moskova', x: 588, y: 132, hp: 100, alive: true },
    { id: 'ec2', name: 'Pietari', x: 578, y: 112, hp: 100, alive: true },
    { id: 'ec3', name: 'Novosibirsk', x: 708, y: 148, hp: 100, alive: true }
  ]);

  const [playerABM, setPlayerABM] = useState<number>(5); // Puolustusohjukset
  const [resources, setResources] = useState<number>(25);

  const [defcon, setDefcon] = useState<number>(3);
  const [crisisLevel, setCrisisLevel] = useState<number>(20);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("HERRA PRESIDENTTI: Astuit juuri virkaasi. Tarkastele valtion arsenaalia ja aloita virkakausi.");

  const enemyDeclarations: DiplomacyQuestion[] = [
    {
      title: "MERIALUEIDEN SAARTO // ATLANTIN PARTIO",
      question: "Itäblokin laivasto on aloittanut aggressiiviset partioinnit kansainvälisillä vesillä. Pääesikunta vaatii vastausta.",
      options: [
        { text: "Lähetetään raskas laivasto-osasto haastamaan partiot", crisisEffect: 25, resourceEffect: -10, approvalEffect: 10, reply: "Laivastot kohtaavat vaarallisen läheltä. Kansa hurraa voimakasta otetta." },
        { text: "Vetäydytään tilapäisesti ja vältetään suora kontakti", crisisEffect: -15, resourceEffect: 0, approvalEffect: -12, reply: "Perääntyminen rauhoitti vesialueet, mutta herätti arvostelua puolustajien keskuudessa." },
        { text: "Jätetään diplomaattinen nootti YK:n turvallisuusneuvostolle", crisisEffect: -5, resourceEffect: -2, approvalEffect: 4, reply: "Kansainvälinen byrokratia jauhaa hitaasti, mutta tilanne pysyi aisoissa." }
      ]
    },
    {
      title: "VAKOILUSKANDAALI // KORKEAN TASON LOIKKARI",
      question: "Vihollisen ydinaseohjelman johtava fyysikko on loikannut rajan yli ja tarjoaa salaisia piirustuksia turvapaikkaa vastaan.",
      options: [
        { text: "Otetaan loikkari vastaan ja hyödynnetään tiedot täysillä", crisisEffect: 30, resourceEffect: 15, approvalEffect: 14, reply: "Saimme korvaamatonta teknologiaa, mutta Moskova syyttää meitä törkeästä provokaatiosta!" },
        { text: "Kieltäudutaan turvapaikasta ja palautetaan loikkari takaisin", crisisEffect: -20, resourceEffect: 0, approvalEffect: -15, reply: "Ele osoitti rauhanomaisuutta, mutta tiedusteluväki on raivoissaan menetetystä tilaisuudesta." },
        { text: "Piilotetaan loikkari salaisesti ilman julkisuutta", crisisEffect: 10, resourceEffect: 5, approvalEffect: 2, reply: "Tiedot saatiin talteen ilman massiivista mediakohua." }
      ]
    },
    {
      title: "KAPINA ITÄBLOKISSA // VAPAUTUSLIIKE",
      question: "Itäblokin rajaseudulla on puhjennut laaja kansannousu hallintoa vastaan. Kapinalliset pyytävät meiltä aseellista tukea.",
      options: [
        { text: "Toimitetaan salaisesti aseita ja varusteita kapinallisille", crisisEffect: 35, resourceEffect: -15, approvalEffect: 16, reply: "Vastarintaliike vahvistui, mutta vihollinen epäilee meitä suorasta vallankaappausyrityksestä!" },
        { text: "Annetaan vain moraalista tukea ja humanitaarista apua", crisisEffect: -5, resourceEffect: -5, approvalEffect: 6, reply: "Autuuttava apu ei herättänyt suuria sotatoimia." },
        { text: "Tuomitaan kapina julkisesti ja teeskennellään puolueettomuutta", crisisEffect: -15, resourceEffect: 0, approvalEffect: -8, reply: "Pettymys vapaustaistelijoiden keskuudessa oli valtava." }
      ]
    },
    {
      title: "KORKEAN TASON SALAINEN HUIPPUKOKOUS",
      question: "Vihollisen johtaja kutsuu teidät yllättävään kahdenkeskiseen huippukokoukseen puolueettomalle maaperälle.",
      options: [
        { text: "Matkustetaan paikalle ja ehdotetaan laajaa asevapaussopimusta", crisisEffect: -35, resourceEffect: 0, approvalEffect: 20, reply: "Historiallinen rauhan ele! Jännitteet laskivat koko maailmassa." },
        { text: "Kieltäudutaan matkasta turvallisuusuhkien vuoksi", crisisEffect: 10, resourceEffect: 0, approvalEffect: -5, reply: "Tilaisuus liennytykseen menetettiin." },
        { text: "Vaaditaan kokoukseen ehdottomia alistumisehtoja viholliselle", crisisEffect: 25, resourceEffect: 0, approvalEffect: 5, reply: "Kokous kariutui heti alkumetreilleen uhkailun vuoksi." }
      ]
    }
  ];

  const cabinetQuestions: DiplomacyQuestion[] = [
    {
      title: "STRATEGINEN DOKTRIINI // TUKIASEET",
      question: "Puolustusministeriö vaatii lisärahoitusta mannerkuormitteisten mannertenvälisten ohjusten kehitykseen.",
      options: [
        { text: "Myönnetään täysi lisärahoitus ohjusohjelmalle", crisisEffect: 20, resourceEffect: -15, approvalEffect: 12, reply: "Ohjusteknologia otti jättiloikan, mutta vastapuoli hermostui." },
        { text: "Suunnataan rahat mieluummin siviili-infrastruktuuriin", crisisEffect: -15, resourceEffect: 5, approvalEffect: 15, reply: "Kansalaiset kiittävät parantuneista teistä ja kouluista." },
        { text: "Jäädytetään budjetti nykyiselle tasolle", crisisEffect: 0, resourceEffect: 0, approvalEffect: 0, reply: "Tilanne pysyi vakaana ilman suuria muutoksia." }
      ]
    },
    {
      title: "VALTION TURVALLISUUS // SALAINEN POLIISI",
      question: "Kotimaan turvallisuusviranomaiset vaativat laajempia valtuuksia epäiltyjen vakoojien tarkkailuun ja pidätyksiin.",
      options: [
        { text: "Hyväksytään kovat valvontalait vakoilun kitkemiseksi", crisisEffect: -5, resourceEffect: -5, approvalEffect: -10, reply: "Turvallisuus parani, mutta kansalaisjärjestöt nostivat hirveän metelin." },
        { text: "Torjutaan esitys perustuslain ja vapausten suojelemiseksi", crisisEffect: 0, resourceEffect: 0, approvalEffect: 12, reply: "Kansalaisvapaudet säilyivät koskemattomina." },
        { text: "Perustetaan erillinen salainen tutkintakomitea", crisisEffect: 5, resourceEffect: -5, approvalEffect: 3, reply: "Komitea aloitti toimintansa ilman suurempaa kohua." }
      ]
    },
    {
      title: "ENERGIAPOLITIIKKA // ÖLJYVARANNOT",
      question: "Maailmanmarkkinoiden öljykriisi uhkaa lamauttaa teollisuutemme. Miten turvaamme energiansaannin?",
      options: [
        { text: "Kansallistetaan ulkomaiset öljyvarat ja turvataan saanti", crisisEffect: 25, resourceEffect: 20, approvalEffect: 10, reply: "Teollisuus sai kaipaamaansa polttoainetta, mutta kansainväliset sijoittajat raivostuivat." },
        { text: "Tuetaan vaihtoehtoisia energiamuotoja ja säännöstellään kulutusta", crisisEffect: -10, resourceEffect: -10, approvalEffect: 5, reply: "Kulutus laski, mutta teollisuus kärsi tilapäisestä pulasta." },
        { text: "Ostetaan kapeilla markkinoilla öljyä hinnalla millä hyvänsä", crisisEffect: 0, resourceEffect: -15, approvalEffect: -5, reply: "Kassavarat hupenivat öljylaskuihin." }
      ]
    }
  ];

  const [currentDeclIndex, setCurrentDeclIndex] = useState<number>(0);
  const [currentCabIndex, setCurrentCabIndex] = useState<number>(0);

  const missilesRef = useRef<MissileData[]>([]);
  const explosionsRef = useRef<ExplosionData[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "https://t.pimg.jp/062/424/887/1/62424887.jpg";
    img.onload = () => { mapImageRef.current = img; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver || gamePhase !== 'game') return;

      setYear((prevYear) => {
        const nextYear = prevYear + 1;

        if (nextYear % 2 === 0 && defcon > 1) {
          const randomDecl = Math.floor(Math.random() * enemyDeclarations.length);
          setCurrentDeclIndex(randomDecl);
          setGamePhase('enemyDeclaration');
        }

        if (nextYear % 3 === 0 && defcon > 1) {
          setEnemyTechLevel((t) => Math.min(3, t + 1));
          setCrisisLevel((c) => {
            const nextC = c + 10;
            if (nextC >= 100) {
              setDefcon(1);
              setMessage("HÄLYTYS: Vuosi on " + nextYear + "! Tilanne on kärjistynyt DEFCON 1 -ydinsodaksi! Käytettävissä vain tuotettu arsenaali.");
              return 100;
            }
            return nextC;
          });
        }
        return nextYear;
      });

      setResources((prev) => Math.min(100, prev + 5));
    }, 4000);

    return () => clearInterval(interval);
  }, [gameOver, defcon, gamePhase, enemyDeclarations.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let aiTimer = 0;

    const spawnMushroomParticles = (x: number, y: number) => {
      for (let i = 0; i < 40; i++) {
        particlesRef.current.push({
          x: x + (Math.random() * 12 - 6),
          y: y - Math.random() * 20,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 45 - 20,
          life: 0,
          maxLife: 2.0 + Math.random() * 1.0,
          color: ['#ff4400', '#ffaa00', '#555555', '#222222'][Math.floor(Math.random() * 4)],
          size: Math.random() * 6 + 4
        });
      }
      for (let i = 0; i < 70; i++) {
        const angle = Math.random() * Math.PI - Math.PI;
        const speed = Math.random() * 50 + 20;
        particlesRef.current.push({
          x: x,
          y: y - 50,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * (speed * 0.5) - 15,
          life: 0,
          maxLife: 2.5 + Math.random() * 1.2,
          color: ['#ffffff', '#ffcc00', '#ff3300', '#333333', '#111111'][Math.floor(Math.random() * 5)],
          size: Math.random() * 10 + 6
        });
      }
    };

    const spawnInterceptorParticles = (x: number, y: number) => {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 60;
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
          color: ['#00ffff', '#ffffff', '#88ffff'][Math.floor(Math.random() * 3)],
          size: Math.random() * 3 + 2
        });
      }
    };

    const gameLoop = (time: number) => {
      let dt = (time - lastTime) / 1000;
      lastTime = time;
      if (dt > 0.1) dt = 0.1;

      if (!gameOver && defcon === 1 && gamePhase === 'game') {
        aiTimer += dt;
        if (aiTimer > 7.0) {
          aiTimer = 0;
          const alivePlayerCities = playerCities.filter(c => c.alive);
          const target = alivePlayerCities.length > 0
              ? alivePlayerCities[Math.floor(Math.random() * alivePlayerCities.length)]
              : { x: playerSiloPos.x, y: playerSiloPos.y };

          missilesRef.current.push({
            id: Math.random(),
            startX: enemySiloPos.x, startY: enemySiloPos.y,
            targetX: target.x + (Math.random() * 20 - 10),
            targetY: target.y + (Math.random() * 20 - 10),
            currentX: enemySiloPos.x, currentY: enemySiloPos.y,
            prevX: enemySiloPos.x, prevY: enemySiloPos.y,
            distance: Math.hypot(target.x - enemySiloPos.x, target.y - enemySiloPos.y),
            traveled: 0,
            speed: 85 + (enemyTechLevel * 15),
            isPlayer: false,
            active: true,
            isInterceptor: false,
            trail: []
          });
          setMessage("HÄLYTYS: Vihollinen on laukaissut ohjuksen kohteeseen!");
        }
      }

      missilesRef.current.forEach((m) => {
        if (!m.active) return;
        m.prevX = m.currentX;
        m.prevY = m.currentY;

        m.traveled += m.speed * dt;
        let t = m.traveled / m.distance;

        if (t >= 1) {
          m.currentX = m.targetX;
          m.currentY = m.targetY;
          m.active = false;

          if (m.isInterceptor) {
            explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, maxRadius: 35, alpha: 1.0, isPlayer: true, flashAlpha: 0, isMushroom: false });
            spawnInterceptorParticles(m.targetX, m.targetY);
          } else {
            explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, maxRadius: 70, alpha: 1.0, isPlayer: m.isPlayer, flashAlpha: 1.0, isMushroom: true });
            spawnMushroomParticles(m.targetX, m.targetY);

            if (m.isPlayer) {
              setEnemyCities(prev => prev.map(city => {
                if (city.alive && Math.hypot(m.targetX - city.x, m.targetY - city.y) < 40) {
                  const nextHp = city.hp - 100;
                  if (nextHp <= 0) setMessage(`VIHOLLISKAUPUNKI TUHOUTUI: ${city.name} tuhoutui iskuvastauksessa!`);
                  return { ...city, hp: nextHp, alive: nextHp > 0 };
                }
                return city;
              }));
            } else {
              setPlayerCities(prev => prev.map(city => {
                if (city.alive && Math.hypot(m.targetX - city.x, m.targetY - city.y) < 40) {
                  const nextHp = city.hp - 100;
                  if (nextHp <= 0) setMessage(`HÄLYTYS: Kotikaupunki ${city.name} on tuhoutunut ydiniskussa!`);
                  return { ...city, hp: nextHp, alive: nextHp > 0 };
                }
                return city;
              }));
            }
          }
        } else {
          const linearX = m.startX + (m.targetX - m.targetX) * t; // Korjattu arc
          const linearY = m.startY + (m.targetY - m.startY) * t;
          const arcHeight = m.isInterceptor ? 30 : 120;
          const arcY = Math.sin(t * Math.PI) * arcHeight;

          m.currentX = m.startX + (m.targetX - m.startX) * t;
          m.currentY = linearY - arcY;

          m.trail.push({ x: m.currentX, y: m.currentY, alpha: 1.0 });
          if (m.trail.length > 25) m.trail.shift();
        }
      });

      if (!gameOver) {
        const playerAnyAlive = playerCities.some(c => c.alive);
        const enemyAnyAlive = enemyCities.some(c => c.alive);

        if (!playerAnyAlive) {
          setGameOver(true);
          setMessage("TAPPIO: Kaikki kotimaan kaupungit on tuhottu.");
        } else if (!enemyAnyAlive) {
          setGameOver(true);
          setMessage("VOITTO: Kaikki vihollisen kaupungit on tuhottu!");
        }
      }

      particlesRef.current.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        p.size += dt * 3;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      explosionsRef.current.forEach((ex) => {
        if (ex.isPlayer) {
          missilesRef.current.forEach((m) => {
            if (!m.isPlayer && m.active && !m.isInterceptor) {
              if (Math.hypot(m.currentX - ex.x, m.currentY - ex.y) < ex.radius) {
                m.active = false;
                spawnInterceptorParticles(m.currentX, m.currentY);
                setMessage("TORJUNTA ONNISTUI: Vihollisen ohjus tuhottu ilmassa!");
              }
            }
          });
        }
      });

      missilesRef.current = missilesRef.current.filter((m) => m.active);

      explosionsRef.current.forEach((ex) => {
        if (ex.radius < ex.maxRadius) ex.radius += 50 * dt;
        else ex.alpha -= 0.3 * dt;
        if (ex.flashAlpha > 0) ex.flashAlpha -= 2.5 * dt;
      });
      explosionsRef.current = explosionsRef.current.filter((ex) => ex.alpha > 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mapImageRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(2, 6, 15, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerSiloPos.x - 7, playerSiloPos.y - 7, 14, 14);
      ctx.font = '10px Courier New';
      ctx.fillStyle = '#00ffff';
      ctx.fillText(`PÄÄMAJA / SIILO (Taso ${techLevel})`, playerSiloPos.x - 45, playerSiloPos.y - 10);

      playerCities.forEach(city => {
        ctx.fillStyle = city.alive ? '#00ffff' : '#555555';
        ctx.beginPath(); ctx.arc(city.x, city.y, city.alive ? 6 : 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = '10px Courier New';
        ctx.fillStyle = city.alive ? '#00ffff' : '#777777';
        ctx.fillText(city.name, city.x - 15, city.y - 8);
      });

      ctx.fillStyle = '#ff3333';
      ctx.fillRect(enemySiloPos.x - 7, enemySiloPos.y - 7, 14, 14);
      ctx.font = '10px Courier New';
      ctx.fillStyle = '#ff3333';
      ctx.fillText(`VIHOLLISEN SIILO (Taso ${enemyTechLevel})`, enemySiloPos.x - 45, enemySiloPos.y - 10);

      enemyCities.forEach(city => {
        ctx.fillStyle = city.alive ? '#ff3333' : '#555555';
        ctx.beginPath(); ctx.arc(city.x, city.y, city.alive ? 6 : 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = '10px Courier New';
        ctx.fillStyle = city.alive ? '#ff3333' : '#777777';
        ctx.fillText(city.name, city.x - 15, city.y - 8);
      });

      missilesRef.current.forEach((m) => {
        for (let i = 0; i < m.trail.length - 1; i++) {
          const pt1 = m.trail[i];
          const pt2 = m.trail[i + 1];
          const alpha = (i / m.trail.length) * 0.7;
          ctx.strokeStyle = m.isInterceptor
              ? `rgba(0, 255, 204, ${alpha})`
              : m.isPlayer ? `rgba(0, 200, 255, ${alpha})` : `rgba(255, 50, 50, ${alpha})`;
          ctx.lineWidth = m.isInterceptor ? 1.5 : 2.5;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }

        const dx = m.currentX - m.prevX;
        const dy = m.currentY - m.prevY;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(m.currentX, m.currentY);
        ctx.rotate(angle);

        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.lineTo(-14 - Math.random() * 6, 0);
        ctx.lineTo(-8, 2);
        ctx.fill();

        ctx.fillStyle = m.isInterceptor ? '#00ffff' : m.isPlayer ? '#e0e0e0' : '#ff4444';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-6, -3);
        ctx.lineTo(-6, 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#888888';
        ctx.fillRect(-6, -5, 3, 10);

        ctx.restore();
      });

      particlesRef.current.forEach((p) => {
        const alpha = 1 - (p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      explosionsRef.current.forEach((ex) => {
        ctx.save();

        if (ex.flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.7, ex.flashAlpha)})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (ex.isMushroom) {
          ctx.strokeStyle = `rgba(255, 200, 100, ${ex.alpha * 0.7})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(ex.x, ex.y, ex.radius * 1.2, ex.radius * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();

          const radGrad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.radius);
          radGrad.addColorStop(0, `rgba(255, 255, 255, ${ex.alpha})`);
          radGrad.addColorStop(0.2, `rgba(255, 220, 0, ${ex.alpha * 0.9})`);
          radGrad.addColorStop(0.6, `rgba(255, 50, 0, ${ex.alpha * 0.6})`);
          radGrad.addColorStop(1, `rgba(30, 0, 0, 0)`);

          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(ex.x, ex.y, ex.radius * 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(0, 255, 255, ${ex.alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, defcon, playerCities, enemyCities, enemyTechLevel, gamePhase]);

  const handleAnswer = (crisisEffect: number, resourceEffect: number, approvalEffect: number, reply: string) => {
    setMessage(reply);
    setResources((prev) => Math.max(0, prev + resourceEffect));
    setApprovalRating((prev) => Math.max(0, Math.min(100, prev + approvalEffect)));
    setGamePhase('game');

    setCrisisLevel((prev) => {
      const nextCrisis = Math.max(0, Math.min(100, prev + crisisEffect));
      if (nextCrisis >= 100) {
        setDefcon(1);
        setMessage("HÄLYTYS: Vuosi " + year + " - Kylmä sota on kärjistynyt täysimittaiseksi ydinsodaksi! Käytettävissä vain tuotetut pommittajat ja sukellusveneet.");
        return 100;
      }
      return nextCrisis;
    });

    if (gamePhase === 'diplomacy') {
      setCurrentCabIndex(Math.floor(Math.random() * cabinetQuestions.length));
    }
  };

  const openDiplomacySession = () => {
    setCurrentCabIndex(Math.floor(Math.random() * cabinetQuestions.length));
    setGamePhase('diplomacy');
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver || gamePhase !== 'game') return;
    if (defcon > 1) {
      setMessage("Virka-aika (vuosi " + year + "). Hallitse arsenaalia, kehitä kalustoa ja tarkkaile vaalikannatusta.");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Jos klikataan omaa aluetta / puolustusta -> Tarkistetaan riittääkö ABM / puolustusvarasto
    if (clickX < 500) {
      if (playerABM <= 0) {
        setMessage("EI TORJUNTAOHJUKSIA: Puolustusvarasto on tyhjä! Rakenna tai kehitä lisää kalustoa.");
        return;
      }
      setPlayerABM((prev) => prev - 1);
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x, startY: playerSiloPos.y,
        targetX: clickX, targetY: clickY,
        currentX: playerSiloPos.x, currentY: playerSiloPos.y,
        prevX: playerSiloPos.x, prevY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 220, isPlayer: true, active: true, isInterceptor: true, trail: []
      });
      setMessage(`ABM-torjuntaohjus laukaistu. Jäljellä olevat puolustukset: ${playerABM - 1}`);
    } else {
      // Hyökkäys vihollisen alueelle -> Kuluttaa pommittajia tai sukellusveneitä (vähintään toista pitää olla)
      if (bombers <= 0 && submarines <= 0) {
        setMessage("ARSENAALI TYHJÄ: Sinulla ei ole yhtään pommittajalaivuetta tai sukellusvenetta jäljellä iskuun!");
        return;
      }

      // Kulutetaan ensisijaisesti pommittaja, tai sukellusvene
      if (bombers > 0) {
        setBombers((b) => b - 1);
        setMessage(`Strateginen pommittajalaivue laukaistu kohteeseen. Jäljellä olevat pommittajat: ${bombers - 1}`);
      } else {
        setSubmarines((s) => s - 1);
        setMessage(`Ydinsukellusveneen risteilyohjus laukaistu! Jäljellä olevat sukellusveneet: ${submarines - 1}`);
      }

      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x, startY: playerSiloPos.y,
        targetX: clickX, targetY: clickY,
        currentX: playerSiloPos.x, currentY: playerSiloPos.y,
        prevX: playerSiloPos.x, prevY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 75 + (techLevel * 20), isPlayer: true, active: true, isInterceptor: false, trail: []
      });
    }
  };

  const upgradeTech = () => {
    if (techLevel < 3 && resources >= 40) {
      setResources((r) => r - 40);
      setTechLevel((t) => t + 1);
      setApprovalRating((a) => Math.min(100, a + 5));
      setMessage(`Teknologia päivitetty (Taso ${techLevel + 1}): Kansan tuki kasvoi onnistuneen ohjelman myötä!`);
    } else if (techLevel >= 3) {
      setMessage("Mannerjälkeinen ICBM-teknologia on jo huipussaan.");
    } else {
      setMessage("Ei tarpeeksi resursseja teknologiaan (vaatii 40 pt).");
    }
  };

  const buildBomber = () => {
    if (resources >= 30) {
      setResources((r) => r - 30);
      setBombers((b) => b + 1);
      setApprovalRating((a) => Math.min(100, a + 4));
      setMessage(`Uusi strateginen pommittajalaivue tilattu. Pommittajia yhteensä: ${bombers + 1}`);
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 30 pt)."); }
  };

  const buildSubmarine = () => {
    if (resources >= 35) {
      setResources((r) => r - 35);
      setSubmarines((s) => s + 1);
      setApprovalRating((a) => Math.min(100, a + 3));
      setMessage(`Uusi ydinsukellusvene laskettu vesille. Sukellusveneitä yhteensä: ${submarines + 1}`);
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 35 pt)."); }
  };

  const playerAliveCount = playerCities.filter(c => c.alive).length;
  const currentDecl = enemyDeclarations[currentDeclIndex];
  const currentCab = cabinetQuestions[currentCabIndex];

  return (
      <div style={{ backgroundColor: '#05080f', color: '#00ffcc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace', margin: 0, padding: '20px', position: 'relative' }}>

        <h1 style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '8px', textShadow: '0 0 10px rgba(0,255,204,0.4)' }}>
          PRESIDENTIN STRATEGINEN ESIKUNTA // KYLMÄ SOTA
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '12px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Vuosi: <strong style={{ color: '#00ffff' }}>{year}</strong> | Kannatus: <strong style={{ color: approvalRating > 40 ? '#00ffcc' : '#ff3333' }}>{approvalRating}%</strong></div>
          <div>Pommittajat: <strong style={{ color: '#00ffff' }}>{bombers}</strong> | Sukellusveneet: <strong style={{ color: '#00ffff' }}>{submarines}</strong> | Torjunnat: <strong style={{ color: '#00ffff' }}>{playerABM}</strong></div>
          <div>Resurssit: <strong style={{ color: '#ffcc00' }}>{resources} pt</strong></div>
          <div>Kriisi: <strong style={{ color: crisisLevel > 70 ? '#ff3333' : 'yellow' }}>{crisisLevel}%</strong> | DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : 'yellow' }}>{defcon}</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', width: '950px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!gameOver ? (
              <>
                {defcon > 1 && (
                    <button
                        onClick={openDiplomacySession}
                        onMouseEnter={() => setHoveredBtn('diplomacy')}
                        onMouseLeave={() => setHoveredBtn(null)}
                        style={getBtnStyle(hoveredBtn === 'diplomacy', '#00aaff')}
                    >
                      📜 Valtioneuvoston istunto
                    </button>
                )}
                <button
                    onClick={upgradeTech}
                    onMouseEnter={() => setHoveredBtn('tech')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={getBtnStyle(hoveredBtn === 'tech', '#ffcc00')}
                >
                  🚀 Kehitä ICBM (40 pt)
                </button>
                <button
                    onClick={buildBomber}
                    onMouseEnter={() => setHoveredBtn('bomber')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={getBtnStyle(hoveredBtn === 'bomber', '#00ffcc')}
                >
                  ✈ Rakenna Pommittaja (30 pt)
                </button>
                <button
                    onClick={buildSubmarine}
                    onMouseEnter={() => setHoveredBtn('sub')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={getBtnStyle(hoveredBtn === 'sub', '#00ffcc')}
                >
                  ⚓ Rakenna Sukellusvene (35 pt)
                </button>
              </>
          ) : (
              <div style={{ fontSize: '15px', color: '#00ffff', fontWeight: 'bold' }}>
                {playerAliveCount > 0 ? 'KAUNIIT ONNITTELUT! Presidenttikausi päättyi voitokkaasti.' : 'HALLINTONNE KAATUI: Valtio tuhoutui ydinsodassa.'}
              </div>
          )}
        </div>

        <canvas
            ref={canvasRef}
            width={950}
            height={420}
            onClick={handleCanvasClick}
            style={{ border: '2px solid #1a3a5c', boxShadow: '0 0 25px rgba(0, 255, 204, 0.15)', cursor: defcon === 1 && !gameOver ? 'crosshair' : 'default', background: '#020408' }}
        />

        <div style={{ marginTop: '12px', fontSize: '15px', color: '#ffcc00', textAlign: 'center', maxWidth: '950px', background: '#081220', border: '1px solid #1a3a5c', padding: '10px 16px', borderRadius: '4px', letterSpacing: '1px', textShadow: '0 0 8px rgba(255, 204, 0, 0.3)' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{message}</p>
        </div>

        {/* 1. VIRKAASTUJAISRUUTU */}
        {gamePhase === 'inauguration' && !gameOver && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(2, 5, 12, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
              <div style={{ width: '680px', backgroundColor: '#0b1626', border: '2px solid #00ffcc', borderRadius: '8px', padding: '30px', boxShadow: '0 0 40px rgba(0, 255, 204, 0.35)' }}>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏛</div>
                  <h2 style={{ fontSize: '20px', color: '#00ffcc', letterSpacing: '2px', margin: 0 }}>VIRKA-ASTUMINEN // VUOSI 1946</h2>
                  <div style={{ fontSize: '12px', color: '#88aacc', marginTop: '4px' }}>Valkoinen talo, Washington D.C.</div>
                </div>

                <div style={{ fontSize: '14px', color: '#e0f7ff', lineHeight: '1.6', marginBottom: '25px', backgroundColor: '#05080f', padding: '16px', borderRadius: '4px', borderLeft: '3px solid #00ffcc' }}>
                  <p style={{ margin: '0 0 10px 0' }}>Herra presidentti, teidät on valittu kansakunnan johtoon toisen maailmansodan jälkeisenä herkkänä aikakautena.</p>
                  <p style={{ margin: '0 0 10px 0' }}>Pääesikunnan luovuttama salainen kansio vahvistaa valtion nykyisen arsenaalin:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#ffcc00' }}>
                    <li><strong>Strategiset pommittajat:</strong> 2 laivuetta valmiudessa</li>
                    <li><strong>Ydinsukellusveneet:</strong> 1 alus merialueilla</li>
                    <li><strong>ABM-torjuntaohjukset:</strong> 5 valmiudessa</li>
                  </ul>
                  <p style={{ margin: '10px 0 0 0' }}>Kylmä sota on alkanut. Muista rakentaa ja laajentaa arsenaaliasi ennen mahdollista ydinsotaa!</p>
                </div>

                <button
                    onClick={openDiplomacySession}
                    onMouseEnter={() => setHoveredBtn('inaug-btn')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      ...getBtnStyle(hoveredBtn === 'inaug-btn', '#00ffcc'),
                      width: '100%',
                      padding: '14px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                >
                  📜 Allekirjoita virkamääräys ja siirry valtioneuvoston istuntoon
                </button>

              </div>
            </div>
        )}

        {/* 2. VIHOLLISEN NOOTTI JA JULISTUS -MODAALI */}
        {gamePhase === 'enemyDeclaration' && !gameOver && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(25, 2, 5, 0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15 }}>
              <div style={{ width: '640px', backgroundColor: '#1a0808', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', boxShadow: '0 0 35px rgba(255, 51, 51, 0.4)' }}>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ width: '70px', height: '70px', border: '2px solid #ff3333', borderRadius: '6px', backgroundColor: '#330505', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>
                    🚨
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#ff3333', fontWeight: 'bold' }}>{currentDecl.title}</div>
                    <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 'bold' }}>SÄHKE MOSKOVASTA</div>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: '#ffcccc', fontStyle: 'italic', marginBottom: '20px', background: '#0a0202', padding: '14px', borderRadius: '4px', borderLeft: '3px solid #ff3333', lineHeight: '1.4' }}>
                  "{currentDecl.question}"
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                  {currentDecl.options.map((opt, idx) => {
                    const optionKey = `decl-opt-${idx}`;
                    const isHovered = hoveredBtn === optionKey;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(opt.crisisEffect, opt.resourceEffect, opt.approvalEffect, opt.reply)}
                            onMouseEnter={() => setHoveredBtn(optionKey)}
                            onMouseLeave={() => setHoveredBtn(null)}
                            style={{
                              ...optionBtnStyle,
                              backgroundColor: isHovered ? '#4d1010' : '#140303',
                              borderColor: isHovered ? '#ff6666' : '#591a1a',
                              color: isHovered ? '#ffffff' : '#ff9999',
                              boxShadow: isHovered ? '0 0 12px rgba(255, 51, 51, 0.4)' : 'none',
                              transform: isHovered ? 'translateX(5px)' : 'none'
                            }}
                        >
                          › {opt.text}
                        </button>
                    );
                  })}
                </div>

              </div>
            </div>
        )}

        {/* 3. NORMALI VALTIONEUVOSTON ISTUNTO -MODAALI */}
        {gamePhase === 'diplomacy' && !gameOver && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(2, 5, 12, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <div style={{ width: '640px', backgroundColor: '#0b1626', border: '2px solid #00aaff', borderRadius: '8px', padding: '24px', boxShadow: '0 0 35px rgba(0, 170, 255, 0.35)' }}>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ width: '70px', height: '70px', border: '2px solid #00aaff', borderRadius: '6px', backgroundColor: '#05101a', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>
                    🖊
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#00aaff', fontWeight: 'bold' }}>{currentCab.title}</div>
                    <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: 'bold' }}>Valtioneuvoston virkaasiakirjat</div>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: '#e0f7ff', fontStyle: 'italic', marginBottom: '20px', background: '#05080f', padding: '14px', borderRadius: '4px', borderLeft: '3px solid #00aaff', lineHeight: '1.4' }}>
                  "{currentCab.question}"
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                  {currentCab.options.map((opt, idx) => {
                    const optionKey = `opt-${idx}`;
                    const isHovered = hoveredBtn === optionKey;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(opt.crisisEffect, opt.resourceEffect, opt.approvalEffect, opt.reply)}
                            onMouseEnter={() => setHoveredBtn(optionKey)}
                            onMouseLeave={() => setHoveredBtn(null)}
                            style={{
                              ...optionBtnStyle,
                              backgroundColor: isHovered ? '#14355a' : '#05080f',
                              borderColor: isHovered ? '#00ffcc' : '#1a3a5c',
                              color: isHovered ? '#ffffff' : '#00ffcc',
                              boxShadow: isHovered ? '0 0 12px rgba(0, 255, 204, 0.4)' : 'none',
                              transform: isHovered ? 'translateX(5px)' : 'none'
                            }}
                        >
                          › {opt.text}
                        </button>
                    );
                  })}
                </div>

                <button
                    onClick={() => setGamePhase('game')}
                    onMouseEnter={() => setHoveredBtn('close')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                      ...getBtnStyle(hoveredBtn === 'close', '#888888'),
                      width: '100%',
                      marginTop: '5px'
                    }}
                >
                  Palaa kartalle ilman allekirjoitusta
                </button>

              </div>
            </div>
        )}

      </div>
  );
}

const getBtnStyle = (isHovered: boolean, accentColor: string = '#00ffcc'): React.CSSProperties => ({
  backgroundColor: isHovered ? '#102338' : '#05080f',
  color: isHovered ? '#ffffff' : accentColor,
  border: `1px solid ${isHovered ? accentColor : accentColor}`,
  padding: '6px 12px',
  fontFamily: 'Courier New, monospace',
  cursor: 'pointer',
  fontSize: '12px',
  borderRadius: '4px',
  boxShadow: isHovered ? `0 0 12px ${accentColor}` : 'none',
  transform: isHovered ? 'translateY(-1px)' : 'none',
  transition: 'all 0.15s ease'
});

const optionBtnStyle: React.CSSProperties = {
  backgroundColor: '#05080f',
  color: '#00ffcc',
  border: '1px solid #1a3a5c',
  padding: '12px 14px',
  fontFamily: 'Courier New, monospace',
  cursor: 'pointer',
  fontSize: '13px',
  textAlign: 'left',
  borderRadius: '4px',
  transition: 'all 0.15s ease'
};

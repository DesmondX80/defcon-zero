Korjataan TypeScriptin ilmoittamat käyttämättömät muuttujat (playerSilos, hoveredButton, enemyAliveCount), jotta kääntäjä menee heittämällä läpi.

    Kopioi tämä virheetön koodi tiedostoon src/App.tsx:

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
    reply: string;
  }[];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [year, setYear] = useState<number>(1946);
  const [techLevel, setTechLevel] = useState<number>(1);
  const [enemyTechLevel, setEnemyTechLevel] = useState<number>(1);

  const playerSiloPos = { x: 210, y: 150 };
  const [playerCities, setPlayerCities] = useState<City[]>([
    { id: 'pc1', name: 'Washington', x: 265, y: 175, hp: 100, alive: true },
    { id: 'pc2', name: 'New York', x: 275, y: 160, hp: 100, alive: true },
    { id: 'pc3', name: 'Los Angeles', x: 150, y: 185, hp: 100, alive: true }
  ]);

  const enemySiloPos = { x: 670, y: 130 };
  const [enemyCities, setEnemyCities] = useState<City[]>([
    { id: 'ec1', name: 'Moskova', x: 650, y: 140, hp: 100, alive: true },
    { id: 'ec2', name: 'Pietari', x: 630, y: 115, hp: 100, alive: true },
    { id: 'ec3', name: 'Novosibirsk', x: 760, y: 150, hp: 100, alive: true }
  ]);

  const [playerABM, setPlayerABM] = useState<number>(5);
  const [resources, setResources] = useState<number>(20);

  const [defcon, setDefcon] = useState<number>(3);
  const [crisisLevel, setCrisisLevel] = useState<number>(20);
  const [showDiplomacyModal, setShowDiplomacyModal] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("VUOSI 1946: Toinen maailmansota on päättynyt. Kylmä sota ja varustelukilpailu ovat alkaneet.");

  const questionsList: DiplomacyQuestion[] = [
    {
      title: "BERLIININ SAARTO // DIPLOMATIA",
      question: "Vihollinen sulkee maayhteydet sektoriimme. Miten reagoimme kriisiin?",
      options: [
        { text: "Järjestetään massiivinen ilmasilta ja vältetään yhteenotto.", crisisEffect: -15, resourceEffect: -10, reply: "Ilmasilta onnistui! Jännitteet laskivat väliaikaisesti." },
        { text: "Vaaditaan reitin avaamista asevoimin uhaten.", crisisEffect: +30, resourceEffect: +10, reply: "Uhkaava kanta nosti kriisiprosenttia rajusti!" },
        { text: "Vetäydytään hiljaisesti kiistellyltä alueelta.", crisisEffect: -25, resourceEffect: -5, reply: "Peräännyitte neuvottelupöydässä." }
      ]
    },
    {
      title: "YDINASETESTI // TIEDE",
      question: "Tiedemiehemme vaativat lisärahoitusta ensimmäiselle vetypommitestille.",
      options: [
        { text: "Myönnetään varat ja kiihdytetään ohjastutkimusta.", crisisEffect: +20, resourceEffect: -20, reply: "Teknologiataso nousi! Vihollinen reagoi olympialaisella varustelulla." },
        { text: "Hylätään hanke ja panostetaan tavanomaiseen puolustukseen.", crisisEffect: -10, resourceEffect: +10, reply: "Säästitte resursseja, mutta teknologia laahaa." }
      ]
    }
  ];

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQ = questionsList[currentQIndex];

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
      if (gameOver) return;

      setYear((prevYear) => {
        const nextYear = prevYear + 1;
        if (nextYear % 3 === 0 && defcon > 1) {
          setEnemyTechLevel((t) => Math.min(3, t + 1));
          setCrisisLevel((c) => {
            const nextC = c + 15;
            if (nextC >= 100) {
              setDefcon(1);
              setMessage("HÄLYTYS: Vuosi on " + nextYear + "! Kylmä sota on kärjistynyt DEFCON 1 -sodaksi!");
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
  }, [gameOver, defcon]);

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

      if (!gameOver && defcon === 1) {
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
          setMessage("HÄLYTYS: Vihollinen on laukaissut strategisen ohjuksen!");
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
                  if (nextHp <= 0) setMessage(`VIHOLLISKAUPUNKI TUHOUTUI: ${city.name} on tuhottu!`);
                  return { ...city, hp: nextHp, alive: nextHp > 0 };
                }
                return city;
              }));
            } else {
              setPlayerCities(prev => prev.map(city => {
                if (city.alive && Math.hypot(m.targetX - city.x, m.targetY - city.y) < 40) {
                  const nextHp = city.hp - 100;
                  if (nextHp <= 0) setMessage(`HÄLYTYS: Kotikaupunki ${city.name} on tuhoutunut!`);
                  return { ...city, hp: nextHp, alive: nextHp > 0 };
                }
                return city;
              }));
            }
          }
        } else {
          const linearX = m.startX + (m.targetX - m.startX) * t;
          const linearY = m.startY + (m.targetY - m.startY) * t;
          const arcHeight = m.isInterceptor ? 30 : 120;
          const arcY = Math.sin(t * Math.PI) * arcHeight;

          m.currentX = linearX;
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
        ctx.globalAlpha = 0.45;
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerSiloPos.x - 7, playerSiloPos.y - 7, 14, 14);
      ctx.font = '10px Courier New';
      ctx.fillText(`OMA SIILO (Taso ${techLevel})`, playerSiloPos.x - 35, playerSiloPos.y - 10);

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
  }, [gameOver, defcon, playerCities, enemyCities, enemyTechLevel]);

  const handleAnswer = (crisisEffect: number, resourceEffect: number, reply: string) => {
    setMessage(reply);
    setResources((prev) => Math.max(0, prev + resourceEffect));
    setShowDiplomacyModal(false);

    setCrisisLevel((prev) => {
      const nextCrisis = Math.max(0, Math.min(100, prev + crisisEffect));
      if (nextCrisis >= 100) {
        setDefcon(1);
        setMessage("HÄLYTYS: Vuosi " + year + " - Kylmä sota on kärjistynyt täysimittaiseksi ydinsodaksi!");
        return 100;
      } else if (nextCrisis <= 0) {
        setMessage("Rauhansopimus solmittu! Kriisi laantui hetkellisesti.");
      }
      return nextCrisis;
    });

    setCurrentQIndex((prev) => (prev + 1) % questionsList.length);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    if (defcon > 1) {
      setMessage("Rauhan aika (vuosi " + year + "). Kehitä teknologiaa tai käytä neuvotteluja ennen sotaa.");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 500 && playerABM > 0) {
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
      setMessage("ABM-torjuntaohjus laukaistu.");
    } else {
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x, startY: playerSiloPos.y,
        targetX: clickX, targetY: clickY,
        currentX: playerSiloPos.x, currentY: playerSiloPos.y,
        prevX: playerSiloPos.x, prevY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 75 + (techLevel * 20), isPlayer: true, active: true, isInterceptor: false, trail: []
      });
      setMessage("Strateginen ICBM laukaistu kohteeseen.");
    }
  };

  const upgradeTech = () => {
    if (techLevel < 3 && resources >= 40) {
      setResources((r) => r - 40);
      setTechLevel((t) => t + 1);
      setMessage(`Teknologia päivitetty (Taso ${techLevel + 1}): Ohjusten kantama ja nopeus kasvoivat!`);
    } else if (techLevel >= 3) {
      setMessage("Mannerjälkeinen ICBM-teknologia on jo huipussaan.");
    } else {
      setMessage("Ei tarpeeksi resursseja teknologiaan (vaatii 40 pt).");
    }
  };

  const buildABM = () => {
    if (resources >= 15) {
      setResources((r) => r - 15);
      setPlayerABM((a) => a + 4);
      setMessage("Puolustusta täydennetty (+4 ABM-ohjusta).");
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 15 pt)."); }
  };

  const playerAliveCount = playerCities.filter(c => c.alive).length;
  const enemyAliveCountDisp = enemyCities.filter(c => c.alive).length;

  return (
      <div style={{ backgroundColor: '#05080f', color: '#00ffcc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace', margin: 0, padding: '20px', position: 'relative' }}>

        <h1 style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '8px', textShadow: '0 0 10px rgba(0,255,204,0.4)' }}>
          DEFCON ZERO // KYLMÄ SOTA JA VARUSTELU
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Vuosi: <strong style={{ color: '#00ffff' }}>{year}</strong> | Teko-taso: <strong>{techLevel}/3</strong></div>
          <div>Resurssit: <strong style={{ color: '#ffcc00' }}>{resources} pt</strong></div>
          <div>Kriisi: <strong style={{ color: crisisLevel > 70 ? '#ff3333' : 'yellow' }}>{crisisLevel}%</strong> | DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : 'yellow' }}>{defcon}</strong></div>
          <div>Vihollisen taso: <strong style={{ color: '#ff3333' }}>{enemyTechLevel}/3</strong> ({enemyAliveCountDisp} kaupunkia)</div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', width: '950px', justifyContent: 'center' }}>
          {!gameOver ? (
              <>
                {defcon > 1 && (
                    <button
                        onClick={() => setShowDiplomacyModal(true)}
                        style={{ ...btnStyle, borderColor: '#00aaff', color: '#00aaff', fontWeight: 'bold' }}
                    >
                      🤝 NEUVOTTELE / KRIISI
                    </button>
                )}
                <button
                    onClick={upgradeTech}
                    style={{ ...btnStyle, borderColor: '#ffcc00', color: '#ffcc00' }}
                >
                  🚀 Kehitä ICBM-teknologiaa (40 pt)
                </button>
                <button
                    onClick={buildABM}
                    style={btnStyle}
                >
                  🛡 Osta ABM (15 pt)
                </button>
              </>
          ) : (
              <div style={{ fontSize: '15px', color: '#00ffff', fontWeight: 'bold' }}>
                {playerAliveCount > 0 ? 'VOITTO! Kylmä sota voitettu tai vihollinen tuhottu.' : 'TAPPIO: Valtiosi on tuhottu.'}
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

        <div style={{ marginTop: '12px', fontSize: '16px', color: '#ffcc00', textAlign: 'center', maxWidth: '950px', background: '#081220', border: '1px solid #1a3a5c', padding: '10px 16px', borderRadius: '4px', letterSpacing: '1px', textShadow: '0 0 8px rgba(255, 204, 0, 0.3)' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{message}</p>
        </div>

        {showDiplomacyModal && defcon > 1 && !gameOver && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(2, 5, 12, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <div style={{ width: '600px', backgroundColor: '#0b1626', border: '2px solid #00aaff', borderRadius: '8px', padding: '20px', boxShadow: '0 0 30px rgba(0, 170, 255, 0.3)' }}>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ width: '70px', height: '70px', border: '2px solid #ff3333', borderRadius: '6px', backgroundColor: '#1a0505', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>
                    🗿
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#00aaff', fontWeight: 'bold' }}>{currentQ.title}</div>
                    <div style={{ fontSize: '14px', color: '#ff3333', fontWeight: 'bold' }}>Neuvottelija</div>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: '#ffffff', fontStyle: 'italic', marginBottom: '15px', background: '#05080f', padding: '12px', borderRadius: '4px', borderLeft: '3px solid #ff3333' }}>
                  "{currentQ.question}"
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                  {currentQ.options.map((opt, idx) => (
                      <button
                          key={idx}
                          onClick={() => handleAnswer(opt.crisisEffect, opt.resourceEffect, opt.reply)}
                          style={optionBtnStyle}
                      >
                        › {opt.text}
                      </button>
                  ))}
                </div>

                <button
                    onClick={() => setShowDiplomacyModal(false)}
                    style={{ ...btnStyle, borderColor: '#888', color: '#888', width: '100%' }}
                >
                  Sulje ikkuna
                </button>

              </div>
            </div>
        )}

      </div>
  );
}

const btnStyle: React.CSSProperties = {
  backgroundColor: '#05080f',
  color: '#00ffcc',
  border: '1px solid #00ffcc',
  padding: '6px 12px',
  fontFamily: 'Courier New, monospace',
  cursor: 'pointer',
  fontSize: '12px',
  borderRadius: '4px'
};

const optionBtnStyle: React.CSSProperties = {
  backgroundColor: '#05080f',
  color: '#00ffcc',
  border: '1px solid #1a3a5c',
  padding: '10px 12px',
  fontFamily: 'Courier New, monospace',
  cursor: 'pointer',
  fontSize: '13px',
  textAlign: 'left',
  borderRadius: '4px'
};
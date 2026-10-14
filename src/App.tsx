import React, { useEffect, useRef, useState } from 'react';

interface MissileData {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
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
  flashAlpha: number; // Ydinräjähdyksen sokaiseva välähdys
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
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

  const [playerHP, setPlayerHP] = useState<number>(100);
  const [enemyHP, setEnemyHP] = useState<number>(100);
  const [playerABM, setPlayerABM] = useState<number>(10);
  const [playerSilos, setPlayerSilos] = useState<number>(3);
  const [resources, setResources] = useState<number>(40);

  const [defcon, setDefcon] = useState<number>(3);
  const [crisisLevel, setCrisisLevel] = useState<number>(35);
  const [showDiplomacyModal, setShowDiplomacyModal] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("KRIISIVAIHE: Tilanne on kiristynyt. Avaa neuvottelukosketus tai varustaudu.");

  const questionsList: DiplomacyQuestion[] = [
    {
      title: "RAJAKAAKSUS // KRIISINHALLINTA",
      question: "Tiedustelumme havaitsi ohjuspatterisi siirron rajalle. Vaadimme välitöntä vetäytymistä, tai tulkitsemme sen sotatoimeksi!",
      options: [
        { text: "Suostutaan vaatimukseen ja siirretään joukot taakse.", crisisEffect: -25, resourceEffect: -10, reply: "Neuvottelija nyökkää tyytyväisenä. 'Viisas päätös.' (Kriisi laski)" },
        { text: "Kielletään syytökset ja puolustetaan suvereniteettiamme.", crisisEffect: +25, resourceEffect: +10, reply: "Neuvottelija lyö nyrkkiä pöytään! 'Provokaationne ei jää ilman vastinetta!' (Kriisi nousi)" },
        { text: "Vaaditaan vastavuoroisesti heidän lentotukialustensa vetämistä.", crisisEffect: +10, resourceEffect: 0, reply: "Neuvottelija ärsyyntyy vaatimuksestanne." }
      ]
    },
    {
      title: "KAUPPAEMBARGO // KRIISI",
      question: "Asetatteko teknologiasaarron vai avaatteko rajat yhteisille tarkastuksille?",
      options: [
        { text: "Avataan rajat ja sallitaan kansainväliset tarkastukset.", crisisEffect: -30, resourceEffect: -15, reply: "'Tämä osoittaa yhteistyöhalua.' Jännitteet laantuvat." },
        { text: "Suljetaan rajat kokonaan ja katkaistaan diplomaattisuhteet.", crisisEffect: +35, resourceEffect: +20, reply: "'Olette valinneet konfrontaation tien.' Tilanne kiristyy äärimmilleen!" },
        { text: "Vastataan kiertämällä pakotteet kolmansien maiden kautta.", crisisEffect: +15, resourceEffect: 0, reply: "Epäluulo kasvatti jännitteitä." }
      ]
    }
  ];

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQ = questionsList[currentQIndex];

  const playerSiloPos = { x: 200, y: 260 };
  const playerCityPos = { x: 175, y: 290 };
  const enemySiloPos = { x: 800, y: 170 };
  const enemyCityPos = { x: 750, y: 190 };

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
      if (gameOver || defcon === 1) return;
      setResources((prev) => Math.min(100, prev + 3));
    }, 3000);
    return () => clearInterval(interval);
  }, [gameOver, defcon]);

  // Pääsilmukka
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let aiTimer = 0;

    const spawnParticles = (x: number, y: number, count: number, isNuclear: boolean) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * (isNuclear ? 120 : 60);
        particlesRef.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.5 + Math.random() * (isNuclear ? 1.5 : 0.8),
          color: isNuclear
              ? ['#ffffff', '#ffcc00', '#ff3300', '#ff6600', '#555555'][Math.floor(Math.random() * 5)]
              : ['#00ffff', '#ffffff', '#88ffff'][Math.floor(Math.random() * 3)]
        });
      }
    };

    const gameLoop = (time: number) => {
      let dt = (time - lastTime) / 1000;
      lastTime = time;
      if (dt > 0.1) dt = 0.1;

      if (!gameOver && defcon === 1) {
        aiTimer += dt;
        if (aiTimer > 9.0) {
          aiTimer = 0;
          const target = Math.random() > 0.5 ? playerCityPos : playerSiloPos;
          missilesRef.current.push({
            id: Math.random(),
            startX: enemySiloPos.x, startY: enemySiloPos.y,
            targetX: target.x + (Math.random() * 40 - 20),
            targetY: target.y + (Math.random() * 40 - 20),
            currentX: enemySiloPos.x, currentY: enemySiloPos.y,
            distance: Math.hypot(target.x - enemySiloPos.x, target.y - enemySiloPos.y),
            traveled: 0,
            speed: 85,
            isPlayer: false,
            active: true,
            isInterceptor: false,
            trail: []
          });
          setMessage("HÄLYTYS: Vihollinen on laukaissut ICBM-ohjuksen!");
        }
      }

      // Ohjusten päivitys (ballistinen kaari)
      missilesRef.current.forEach((m) => {
        if (!m.active) return;
        m.traveled += m.speed * dt;
        let t = m.traveled / m.distance;

        if (t >= 1) {
          m.currentX = m.targetX;
          m.currentY = m.targetY;
          m.active = false;

          if (m.isInterceptor) {
            explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, maxRadius: 35, alpha: 1.0, isPlayer: true, flashAlpha: 0 });
            spawnParticles(m.targetX, m.targetY, 20, false);
          } else {
            // Ydinräjähdys
            explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, maxRadius: 65, alpha: 1.0, isPlayer: m.isPlayer, flashAlpha: 1.0 });
            spawnParticles(m.targetX, m.targetY, 60, true);

            if (m.isPlayer) {
              if (Math.hypot(m.targetX - enemyCityPos.x, m.targetY - enemyCityPos.y) < 55 ||
                  Math.hypot(m.targetX - enemySiloPos.x, m.targetY - enemySiloPos.y) < 55) {
                setEnemyHP((prev) => {
                  const next = Math.max(0, prev - 35);
                  if (next <= 0) { setGameOver(true); setMessage("VOITTO: Vihollisvaltio on tuhottu."); }
                  return next;
                });
              }
            } else {
              if (Math.hypot(m.targetX - playerCityPos.x, m.targetY - playerCityPos.y) < 55 ||
                  Math.hypot(m.targetX - playerSiloPos.x, m.targetY - playerSiloPos.y) < 55) {
                setPlayerHP((prev) => {
                  const next = Math.max(0, prev - 35);
                  if (next <= 0) { setGameOver(true); setMessage("TAPPIO: Puolustus petti."); }
                  return next;
                });
              }
            }
          }
        } else {
          // Lasketaan kaareva linja (ICBM nousee ilmakehän yli)
          const linearX = m.startX + (m.targetX - m.startX) * t;
          const linearY = m.startY + (m.targetY - m.startY) * t;
          const arcHeight = m.isInterceptor ? 30 : 120; // ICBM tekee korkean kaaren
          const arcY = Math.sin(t * Math.PI) * arcHeight;

          m.currentX = linearX;
          m.currentY = linearY - arcY;

          // Lisätään vana
          m.trail.push({ x: m.currentX, y: m.currentY, alpha: 1.0 });
          if (m.trail.length > 25) m.trail.shift();
        }
      });

      // Hiukkaset
      particlesRef.current.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // Torjunta ilmassa
      explosionsRef.current.forEach((ex) => {
        if (ex.isPlayer) {
          missilesRef.current.forEach((m) => {
            if (!m.isPlayer && m.active && !m.isInterceptor) {
              if (Math.hypot(m.currentX - ex.x, m.currentY - ex.y) < ex.radius) {
                m.active = false;
                spawnParticles(m.currentX, m.currentY, 30, false);
                setMessage("TORJUNTA ONNISTUI: Vihollisen ohjus tuhottu!");
              }
            }
          });
        }
      });

      missilesRef.current = missilesRef.current.filter((m) => m.active);

      explosionsRef.current.forEach((ex) => {
        if (ex.radius < ex.maxRadius) ex.radius += 60 * dt;
        else ex.alpha -= 0.4 * dt;
        if (ex.flashAlpha > 0) ex.flashAlpha -= 2.5 * dt; // Välähdys vaimenee nopeasti
      });
      explosionsRef.current = explosionsRef.current.filter((ex) => ex.alpha > 0);

      // --- PIIRTO ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mapImageRef.current) {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Kohteet
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerSiloPos.x - 8, playerSiloPos.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(playerCityPos.x, playerCityPos.y, 8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ff3333';
      ctx.fillRect(enemySiloPos.x - 8, enemySiloPos.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(enemyCityPos.x, enemyCityPos.y, 8, 0, Math.PI * 2); ctx.fill();

      // Ohjusten savu- ja valovanat
      missilesRef.current.forEach((m) => {
        // Piirretään vana
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

        // Ohjuksen hehkuva kärkipiste
        ctx.shadowBlur = 10;
        ctx.shadowColor = m.isInterceptor ? '#00ffff' : m.isPlayer ? '#00aaff' : '#ff0000';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.currentX, m.currentY, m.isInterceptor ? 2.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Hiukkaset (kipinät ja savu)
      particlesRef.current.forEach((p) => {
        const alpha = 1 - (p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Realistiset ydinräjähdykset (monikerroksinen liukuväri)
      explosionsRef.current.forEach((ex) => {
        ctx.save();

        // 1. Sokaiseva välähdys
        if (ex.flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, ex.flashAlpha)})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 2. Paineaalto (Shockwave)
        ctx.strokeStyle = ex.isPlayer ? `rgba(0, 255, 255, ${ex.alpha * 0.8})` : `rgba(255, 200, 100, ${ex.alpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius * 1.1, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Ydintulipallo (Radial Gradient)
        const radGrad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.radius);
        radGrad.addColorStop(0, `rgba(255, 255, 255, ${ex.alpha})`);
        radGrad.addColorStop(0.3, `rgba(255, 220, 0, ${ex.alpha * 0.9})`);
        radGrad.addColorStop(0.7, `rgba(255, 50, 0, ${ex.alpha * 0.6})`);
        radGrad.addColorStop(1, `rgba(50, 0, 0, 0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, defcon]);

  const handleAnswer = (crisisEffect: number, resourceEffect: number, reply: string) => {
    setMessage(reply);
    setResources((prev) => Math.max(0, prev + resourceEffect));
    setShowDiplomacyModal(false);

    setCrisisLevel((prev) => {
      const nextCrisis = Math.max(0, Math.min(100, prev + crisisEffect));
      if (nextCrisis >= 100) {
        setDefcon(1);
        setMessage("HÄLYTYS: Neuvottelut katkesivat täysin! DEFCON 1 - Ydinsota on alkanut!");
        return 100;
      } else if (nextCrisis <= 0) {
        setMessage("Vihollisen neuvottelija allekirjoitti rauhansopimuksen! Kriisi on ohi.");
      }
      return nextCrisis;
    });

    setCurrentQIndex((prev) => (prev + 1) % questionsList.length);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    if (defcon > 1) {
      setMessage("Sota ei ole syttynyt! Voit käyttää 'Neuvottele rauhasta' -painiketta.");
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
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 220, isPlayer: true, active: true, isInterceptor: true, trail: []
      });
      setMessage("ABM-torjuntaohjus laukaistu.");
    } else if (playerSilos > 0) {
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x, startY: playerSiloPos.y,
        targetX: clickX, targetY: clickY,
        currentX: playerSiloPos.x, currentY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 85, isPlayer: true, active: true, isInterceptor: false, trail: []
      });
      setMessage("Strateginen ICBM laukaistu kohteeseen.");
    }
  };

  const buildSilo = () => {
    if (resources >= 30) {
      setResources((r) => r - 30);
      setPlayerSilos((s) => s + 1);
      setMessage("Uusi siilo rakennettu.");
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 30 pt)."); }
  };

  const buildABM = () => {
    if (resources >= 15) {
      setResources((r) => r - 15);
      setPlayerABM((a) => a + 4);
      setMessage("Torjuntaohjuksia täydennetty (+4 kpl).");
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 15 pt)."); }
  };

  return (
      <div style={{ backgroundColor: '#05080f', color: '#00ffcc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace', margin: 0, padding: '20px', position: 'relative' }}>

        <h1 style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '8px', textShadow: '0 0 10px rgba(0,255,204,0.4)' }}>
          DEFCON ZERO // STRATEGIC COMMAND
        </h1>

        {/* HUD */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Pelaajan Kunto: <strong style={{ color: '#00ffff' }}>{playerHP}%</strong> | Siilot: <strong>{playerSilos}</strong> | ABM: <strong>{playerABM}</strong></div>
          <div>Resurssit: <strong style={{ color: '#ffcc00' }}>{resources} pt</strong></div>
          <div>Vihollisen Kunto: <strong style={{ color: '#ff3333' }}>{enemyHP}%</strong></div>
          <div>Kriisi: <strong style={{ color: crisisLevel > 70 ? '#ff3333' : 'yellow' }}>{crisisLevel}%</strong> | DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : 'yellow' }}>{defcon}</strong></div>
        </div>

        {/* Yläpalkki */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', width: '950px', justifyContent: 'center' }}>
          {defcon > 1 ? (
              <>
                <button onClick={() => setShowDiplomacyModal(true)} style={{...btnStyle, borderColor: '#00aaff', color: '#00aaff', fontWeight: 'bold'}}>
                  🤝 NEUVOTTELE RAUHASTA
                </button>
                <button onClick={buildSilo} style={btnStyle}>Rakenna Siilo (30 pt)</button>
                <button onClick={buildABM} style={btnStyle}>Osta ABM (15 pt)</button>
              </>
          ) : (
              <div style={{ fontSize: '13px', color: '#ff3333', fontWeight: 'bold' }}>
                ⚠ SOTA ON SYTTYNYT! Diplomatia epäonnistui. Puolusta aluettasi tai iske viholliseen!
              </div>
          )}
        </div>

        {/* Canvas */}
        <canvas
            ref={canvasRef}
            width={950}
            height={420}
            onClick={handleCanvasClick}
            style={{ border: '2px solid #1a3a5c', boxShadow: '0 0 25px rgba(0, 255, 204, 0.15)', cursor: defcon === 1 ? 'crosshair' : 'not-allowed', background: '#020408' }}
        />

        <div style={{ marginTop: '10px', fontSize: '12px', color: '#88aaff', textAlign: 'center', maxWidth: '900px' }}>
          <p style={{ color: '#ffcc00', fontWeight: 'bold' }}>{message}</p>
        </div>

        {/* POPUP DALOGI */}
        {showDiplomacyModal && defcon > 1 && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(2, 5, 12, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <div style={{ width: '600px', backgroundColor: '#0b1626', border: '2px solid #00aaff', borderRadius: '8px', padding: '20px', boxShadow: '0 0 30px rgba(0, 170, 255, 0.3)' }}>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ width: '70px', height: '70px', border: '2px solid #ff3333', borderRadius: '6px', backgroundColor: '#1a0505', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>
                    🗿
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#00aaff', fontWeight: 'bold' }}>{currentQ.title}</div>
                    <div style={{ fontSize: '14px', color: '#ff3333', fontWeight: 'bold' }}>Pääneuvottelija</div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#ffffff', fontStyle: 'italic', marginBottom: '15px', background: '#05080f', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #ff3333' }}>
                  "{currentQ.question}"
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                  {currentQ.options.map((opt, idx) => (
                      <button key={idx} onClick={() => handleAnswer(opt.crisisEffect, opt.resourceEffect, opt.reply)} style={optionBtnStyle}>
                        › {opt.text}
                      </button>
                  ))}
                </div>

                <button onClick={() => setShowDiplomacyModal(false)} style={{ ...btnStyle, borderColor: '#888', color: '#888', width: '100%' }}>
                  Sulje neuvottelut toistaiseksi
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
  padding: '8px 12px',
  fontFamily: 'Courier New, monospace',
  cursor: 'pointer',
  fontSize: '12px',
  textAlign: 'left',
  borderRadius: '4px'
};

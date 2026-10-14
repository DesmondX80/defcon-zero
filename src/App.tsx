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
}

interface ExplosionData {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  isPlayer: boolean;
}

interface DiplomacyPrompt {
  question: string;
  options: {
    text: string;
    crisisChange: number;
    resourceChange: number;
    message: string;
  }[];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerHP, setPlayerHP] = useState<number>(100);
  const [enemyHP, setEnemyHP] = useState<number>(100);
  const [playerABM, setPlayerABM] = useState<number>(10);
  const [playerSilos, setPlayerSilos] = useState<number>(3);
  const [resources, setResources] = useState<number>(40);

  const [defcon, setDefcon] = useState<number>(3); // 3 = Rauha/Diplomatia, 1 = Sota
  const [crisisLevel, setCrisisLevel] = useState<number>(30); // 0-100%
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("HOTLINE: Vihollisvaltio vaatii vastausta rajakiistaan.");

  // Ajankohtainen diplomaattinen tilanne / kysymys
  const [currentDiplomacy, setCurrentDiplomacy] = useState<DiplomacyPrompt | null>({
    question: "Vihollinen vaatii sotaharjoitusten lopettamista rajalla. Miten vastaat?",
    options: [
      { text: "Suostutaan vaatimukseen rauhan säilyttämiseksi.", crisisChange: -25, resourceChange: -10, message: "Suostuitte vaatimukseen. Jännitteet laskivat, mutta menetitte resursseja." },
      { text: "Torjutaan vaatimus jyrkästi ja siirretään joukkoja.", crisisChange: +25, resourceChange: +15, message: "Kieltäydyitte alistumasta. Vihollinen närkästyi, mutta saitte sotilaallista nostetta." },
      { text: "Vaaditaan vastavuoroisesti vihollisen vetäytymistä.", crisisChange: +10, resourceChange: 0, message: "Kovensitte panoksia vastavaatimuksella." }
    ]
  });

  // Kohteet kartalla
  const playerSiloPos = { x: 200, y: 260 };
  const playerCityPos = { x: 175, y: 290 };
  const enemySiloPos = { x: 800, y: 170 };
  const enemyCityPos = { x: 750, y: 190 };

  const missilesRef = useRef<MissileData[]>([]);
  const explosionsRef = useRef<ExplosionData[]>([]);
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "https://t.pimg.jp/062/424/887/1/62424887.jpg";
    img.onload = () => { mapImageRef.current = img; };
  }, []);

  // Resurssien keruu normaaliin tapaan
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver || defcon === 1) return;
      setResources((prev) => Math.min(100, prev + 3));
    }, 2500);
    return () => clearInterval(interval);
  }, [gameOver, defcon]);

  // Pääsilmukka sodan aikana
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let aiTimer = 0;

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
            isInterceptor: false
          });
          setMessage("HÄLYTYS: Vihollinen on laukaissut ICBM-ohjuksen!");
        }
      }

      // Ohjusten ja räjähdysten päivitys
      missilesRef.current.forEach((m) => {
        if (!m.active) return;
        m.traveled += m.speed * dt;
        let t = m.traveled / m.distance;

        if (t >= 1) {
          m.currentX = m.targetX;
          m.currentY = m.targetY;
          m.active = false;

          if (m.isInterceptor) {
            explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, maxRadius: 40, alpha: 1.0, isPlayer: true });
          } else {
            explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, maxRadius: 50, alpha: 1.0, isPlayer: m.isPlayer });

            if (m.isPlayer) {
              if (Math.hypot(m.targetX - enemyCityPos.x, m.targetY - enemyCityPos.y) < 50 ||
                  Math.hypot(m.targetX - enemySiloPos.x, m.targetY - enemySiloPos.y) < 50) {
                setEnemyHP((prev) => {
                  const next = Math.max(0, prev - 35);
                  if (next <= 0) { setGameOver(true); setMessage("VOITTO: Vihollisvaltio on tuhottu."); }
                  return next;
                });
              }
            } else {
              if (Math.hypot(m.targetX - playerCityPos.x, m.targetY - playerCityPos.y) < 50 ||
                  Math.hypot(m.targetX - playerSiloPos.x, m.targetY - playerSiloPos.y) < 50) {
                setPlayerHP((prev) => {
                  const next = Math.max(0, prev - 35);
                  if (next <= 0) { setGameOver(true); setMessage("TAPPIO: Puolustus petti."); }
                  return next;
                });
              }
            }
          }
        } else {
          m.currentX = m.startX + (m.targetX - m.startX) * t;
          m.currentY = m.startY + (m.targetY - m.startY) * t;
        }
      });

      // Torjunta ilmassa
      explosionsRef.current.forEach((ex) => {
        if (ex.isPlayer) {
          missilesRef.current.forEach((m) => {
            if (!m.isPlayer && m.active && !m.isInterceptor) {
              if (Math.hypot(m.currentX - ex.x, m.currentY - ex.y) < ex.radius) {
                m.active = false;
                setMessage("TORJUNTA ONNISTUI: Vihollisen ohjus tuhottu!");
              }
            }
          });
        }
      });

      missilesRef.current = missilesRef.current.filter((m) => m.active);

      explosionsRef.current.forEach((ex) => {
        if (ex.radius < ex.maxRadius) ex.radius += 50 * dt;
        else ex.alpha -= 0.6 * dt;
      });
      explosionsRef.current = explosionsRef.current.filter((ex) => ex.alpha > 0);

      // Piirto
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (mapImageRef.current) {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerSiloPos.x - 8, playerSiloPos.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(playerCityPos.x, playerCityPos.y, 8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ff3333';
      ctx.fillRect(enemySiloPos.x - 8, enemySiloPos.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(enemyCityPos.x, enemyCityPos.y, 8, 0, Math.PI * 2); ctx.fill();

      missilesRef.current.forEach((m) => {
        ctx.strokeStyle = m.isInterceptor ? '#00ffcc' : m.isPlayer ? '#00ffff' : '#ff3333';
        ctx.lineWidth = m.isInterceptor ? 1 : 2;
        ctx.beginPath(); ctx.moveTo(m.startX, m.startY); ctx.lineTo(m.currentX, m.currentY); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(m.currentX, m.currentY, m.isInterceptor ? 2 : 3, 0, Math.PI * 2); ctx.fill();
      });

      explosionsRef.current.forEach((ex) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ex.alpha);
        ctx.strokeStyle = ex.isPlayer ? '#00ffff' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, defcon]);

  // Diplomaattisen vastauksen käsittely
  const handleDiplomacyChoice = (crisisChange: number, resourceChange: number, choiceMessage: string) => {
    setMessage(choiceMessage);
    setResources((prev) => Math.max(0, prev + resourceChange));

    setCrisisLevel((prev) => {
      const nextCrisis = Math.max(0, Math.min(100, prev + crisisChange));
      if (nextCrisis >= 100) {
        setDefcon(1);
        setCurrentDiplomacy(null);
        setMessage("HÄLYTYS: Diplomatia romahti täysin! DEFCON 1 - Ydinsota on alkanut!");
        return 100;
      } else if (nextCrisis <= 0) {
        setMessage("Rauhansopimus allekirjoitettu! Kriisi on tällä erää vältetty.");
      }
      return nextCrisis;
    });

    // Generoidaan uusi satunnainen diplomaattinen haaste jos sota ei vielä alkanut
    if (crisisLevel < 100) {
      const randomPrompts: DiplomacyPrompt[] = [
        {
          question: "Vihollinen syyttää sinua kyberhyökkäyksestä infrastruktuuriinsa. Miten vastaat?",
          options: [
            { text: "Myönnetään tapahtunut ja luvataan korvaukset.", crisisChange: -20, resourceChange: -15, message: "Myönsit virheen. Vihollinen tyytyi korvauksiin." },
            { text: "Kielletään jyrkästi ja syytetään vihollista provokaatiosta.", crisisChange: +20, resourceChange: +10, message: "Vastasyytökset kiristivät ilmapiiriä." },
            { text: "Ehdotetaan yhteistä kansainvälistä tutkintaa.", crisisChange: -10, resourceChange: -5, message: "Tutkintapyyntö osti hieman aikaa." }
          ]
        },
        {
          question: "Rajakaupungeissa on levottomuuksia. Vihollinen vaatii demilitarisointia.",
          options: [
            { text: "Vedetään joukot pois rajavyöhykkeeltä.", crisisChange: -30, resourceChange: 0, message: "Peräännyitte rauhan vuoksi. Kriisi laantui." },
            { text: "Vahvistetaan rajan puolustusta entisestään.", crisisChange: +30, resourceChange: -20, message: "Kasvatitte sotilaallista läsnäoloa. Tilanne on veitsen terällä." },
            { text: "Jätetään vaatimus huomiotta.", crisisChange: +10, resourceChange: 0, message: "Ignoroitte vihollisen viestin." }
          ]
        }
      ];
      const nextP = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
      // Pieni viive tai suora päivitys
      setTimeout(() => {
        setCurrentDiplomacy(nextP);
      }, 1500);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    if (defcon > 1) {
      setMessage("Kriisi on käynnissä! Vastaa ensin ylhäällä oleviin diplomaattisiin vaatimuksiin.");
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
        traveled: 0, speed: 220, isPlayer: true, active: true, isInterceptor: true
      });
      setMessage("ABM-torjuntaohjus laukaistu.");
    } else if (playerSilos > 0) {
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x, startY: playerSiloPos.y,
        targetX: clickX, targetY: clickY,
        currentX: playerSiloPos.x, currentY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 85, isPlayer: true, active: true, isInterceptor: false
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
      <div style={{ backgroundColor: '#05080f', color: '#00ffcc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace', margin: 0, padding: '20px' }}>

        <h1 style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '8px', textShadow: '0 0 10px rgba(0,255,204,0.4)' }}>
          DEFCON ZERO // HOTLINE DIPLOMACY
        </h1>

        {/* HUD */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Pelaajan Kunto: <strong style={{ color: '#00ffff' }}>{playerHP}%</strong> | Siilot: <strong>{playerSilos}</strong> | ABM: <strong>{playerABM}</strong></div>
          <div>Resurssit: <strong style={{ color: '#ffcc00' }}>{resources} pt</strong></div>
          <div>Vihollisen Kunto: <strong style={{ color: '#ff3333' }}>{enemyHP}%</strong></div>
          <div>Kriisi: <strong style={{ color: crisisLevel > 70 ? '#ff3333' : 'yellow' }}>{crisisLevel}%</strong> | DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : 'yellow' }}>{defcon}</strong></div>
        </div>

        {/* Diplomaattinen Hotline-paneeli tai Asevarustelu */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px', width: '950px', background: '#0b1626', border: '1px solid #1a3a5c', padding: '10px', borderRadius: '4px' }}>
          {defcon > 1 && currentDiplomacy ? (
              <>
                <div style={{ color: '#00aaff', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>🚨 DIPLOMAATTINEN KRIISI // HOTLINE</div>
                <p style={{ fontSize: '13px', color: '#ffffff', marginBottom: '10px', textAlign: 'center' }}>{currentDiplomacy.question}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {currentDiplomacy.options.map((opt, idx) => (
                      <button key={idx} onClick={() => handleDiplomacyChoice(opt.crisisChange, opt.resourceChange, opt.message)} style={btnStyle}>
                        {opt.text}
                      </button>
                  ))}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '15px' }}>
                  <button onClick={buildSilo} style={{...btnStyle, borderColor: '#ffcc00', color: '#ffcc00'}}>Rakenna Siilo (30 pt)</button>
                  <button onClick={buildABM} style={{...btnStyle, borderColor: '#ffcc00', color: '#ffcc00'}}>Osta ABM (15 pt)</button>
                </div>
              </>
          ) : (
              <div style={{ fontSize: '13px', color: '#ff3333', fontWeight: 'bold', textAlign: 'center' }}>
                ⚠ SOTA ON SYTTYNYT! Diplomatia epäonnistui. Puolusta maata tai hyökkää viholliseen.
              </div>
          )}
        </div>

        {/* Canvas */}
        <canvas
            ref={canvasRef}
            width={950}
            height={400}
            onClick={handleCanvasClick}
            style={{ border: '2px solid #1a3a5c', boxShadow: '0 0 25px rgba(0, 255, 204, 0.15)', cursor: defcon === 1 ? 'crosshair' : 'not-allowed', background: '#020408' }}
        />

        <div style={{ marginTop: '10px', fontSize: '12px', color: '#88aaff', textAlign: 'center', maxWidth: '900px' }}>
          <p style={{ color: '#ffcc00', fontWeight: 'bold' }}>{message}</p>
        </div>

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
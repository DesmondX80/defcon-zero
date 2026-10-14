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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerHP, setPlayerHP] = useState<number>(100);
  const [enemyHP, setEnemyHP] = useState<number>(100);
  const [playerABM, setPlayerABM] = useState<number>(10);
  const [playerSilos, setPlayerSilos] = useState<number>(3);
  const [resources, setResources] = useState<number>(40);

  const [defcon, setDefcon] = useState<number>(3);
  const [crisisLevel, setCrisisLevel] = useState<number>(20);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("KRIISIVAIHE: Tilanne kiristyy. Valmistaudu tai neuvottele.");

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

  // Kriisiajan automaattinen eteneminen
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver) return;
      setResources((prev) => Math.min(100, prev + 4));

      if (defcon > 1) {
        setCrisisLevel((prev) => {
          const next = prev + 3;
          if (next >= 100) {
            setDefcon(1);
            setMessage("HÄLYTYS: Neuvottelut kariutuivat! DEFCON 1 - Ydinsota on alkanut!");
            return 100;
          }
          return next;
        });
      }
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

    const gameLoop = (time: number) => {
      let dt = (time - lastTime) / 1000;
      lastTime = time;
      if (dt > 0.1) dt = 0.1;

      // Tekoälyn iskut sodan aikana (tasapainotettu nopeus)
      if (!gameOver && defcon === 1) {
        aiTimer += dt;
        if (aiTimer > 10.0) {
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
            speed: 85, // Tasapainotettu reaalinopeus
            isPlayer: false,
            active: true,
            isInterceptor: false
          });
          setMessage("HÄLYTYS: Vihollisen ICBM havaittu tutkassa!");
        }
      }

      // Ohjusten päivitys
      missilesRef.current.forEach((m) => {
        if (!m.active) return;
        m.traveled += m.speed * dt;
        let t = m.traveled / m.distance;

        if (t >= 1) {
          m.currentX = m.targetX;
          m.currentY = m.targetY;
          m.active = false;

          if (m.isInterceptor) {
            explosionsRef.current.push({
              id: Math.random(),
              x: m.targetX,
              y: m.targetY,
              radius: 5,
              maxRadius: 40,
              alpha: 1.0,
              isPlayer: true
            });
          } else {
            explosionsRef.current.push({
              id: Math.random(),
              x: m.targetX,
              y: m.targetY,
              radius: 5,
              maxRadius: 50,
              alpha: 1.0,
              isPlayer: m.isPlayer
            });

            if (m.isPlayer) {
              if (Math.hypot(m.targetX - enemyCityPos.x, m.targetY - enemyCityPos.y) < 50 ||
                  Math.hypot(m.targetX - enemySiloPos.x, m.targetY - enemySiloPos.y) < 50) {
                setEnemyHP((prev) => {
                  const next = Math.max(0, prev - 35);
                  if (next <= 0) { setGameOver(true); setMessage("VOITTO: Vihollisvaltio on neutralisoitu."); }
                  return next;
                });
              }
            } else {
              if (Math.hypot(m.targetX - playerCityPos.x, m.targetY - playerCityPos.y) < 50 ||
                  Math.hypot(m.targetX - playerSiloPos.x, m.targetY - playerSiloPos.y) < 50) {
                setPlayerHP((prev) => {
                  const next = Math.max(0, prev - 35);
                  if (next <= 0) { setGameOver(true); setMessage("TAPPIO: Puolustusjärjestelmät murtuivat."); }
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

      // Torjunta lennossa
      explosionsRef.current.forEach((ex) => {
        if (ex.isPlayer) {
          missilesRef.current.forEach((m) => {
            if (!m.isPlayer && m.active && !m.isInterceptor) {
              const dist = Math.hypot(m.currentX - ex.x, m.currentY - ex.y);
              if (dist < ex.radius) {
                m.active = false;
                setMessage("TORJUNTA ONNISTUI: Vihollisen ohjus tuhottu ilmassa!");
              }
            }
          });
        }
      });

      missilesRef.current = missilesRef.current.filter((m) => m.active);

      // Räjähdysten laajeneminen
      explosionsRef.current.forEach((ex) => {
        if (ex.radius < ex.maxRadius) {
          ex.radius += 50 * dt;
        } else {
          ex.alpha -= 0.6 * dt;
        }
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

      // Kohteet
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerSiloPos.x - 8, playerSiloPos.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(playerCityPos.x, playerCityPos.y, 8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ff3333';
      ctx.fillRect(enemySiloPos.x - 8, enemySiloPos.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(enemyCityPos.x, enemyCityPos.y, 8, 0, Math.PI * 2); ctx.fill();

      // Ohjukset
      missilesRef.current.forEach((m) => {
        ctx.strokeStyle = m.isInterceptor ? '#00ffcc' : m.isPlayer ? '#00ffff' : '#ff3333';
        ctx.lineWidth = m.isInterceptor ? 1 : 2;
        ctx.beginPath();
        ctx.moveTo(m.startX, m.startY);
        ctx.lineTo(m.currentX, m.currentY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.currentX, m.currentY, m.isInterceptor ? 2 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Räjähdykset
      explosionsRef.current.forEach((ex) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ex.alpha);
        ctx.strokeStyle = ex.isPlayer ? '#00ffff' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, defcon]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    if (defcon > 1) {
      setMessage("SOTA EI OLE VIELÄ SYTTYNYT! Käytä diplomatiaa.");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 500 && playerABM > 0) {
      setPlayerABM((prev) => prev - 1);
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x,
        startY: playerSiloPos.y,
        targetX: clickX,
        targetY: clickY,
        currentX: playerSiloPos.x,
        currentY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0,
        speed: 220, // Nopea torjuntaohjus
        isPlayer: true,
        active: true,
        isInterceptor: true
      });
      setMessage("ABM-torjuntaohjus laukaistu.");
    } else if (playerSilos > 0) {
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x,
        startY: playerSiloPos.y,
        targetX: clickX,
        targetY: clickY,
        currentX: playerSiloPos.x,
        currentY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0,
        speed: 85, // ICBM lennon nopeus
        isPlayer: true,
        active: true,
        isInterceptor: false
      });
      setMessage("Strateginen ICBM laukaistu matkaan.");
    }
  };

  const negotiatePeace = () => {
    if (defcon === 1) return;
    setCrisisLevel((prev) => Math.max(0, prev - 25));
    setMessage("Neuvottelut laskivat kriisitasoa.");
  };

  const demandWithdrawal = () => {
    if (defcon === 1) return;
    if (Math.random() > 0.4) {
      setCrisisLevel((prev) => Math.max(0, prev - 40));
      setMessage("Vihollinen perääntyi hetkellisesti.");
    } else {
      setCrisisLevel((prev) => Math.min(100, prev + 35));
      setMessage("Vaatimus provosoi vihollista! Kriisi kiristyi.");
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
          DEFCON ZERO // REAL-TIME STRATEGY
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Pelaajan Kunto: <strong style={{ color: '#00ffff' }}>{playerHP}%</strong> | Siilot: <strong>{playerSilos}</strong> | ABM: <strong>{playerABM}</strong></div>
          <div>Resurssit: <strong style={{ color: '#ffcc00' }}>{resources} pt</strong></div>
          <div>Vihollisen Kunto: <strong style={{ color: '#ff3333' }}>{enemyHP}%</strong></div>
          <div>Kriisi: <strong style={{ color: crisisLevel > 70 ? '#ff3333' : 'yellow' }}>{crisisLevel}%</strong> | DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : 'yellow' }}>{defcon}</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', width: '950px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {defcon > 1 ? (
              <>
                <div style={{ fontSize: '12px', color: '#00aaff', width: '100%', textAlign: 'center', marginBottom: '4px' }}>--- DIPLOMATIA & KRIISINHALLINTA ---</div>
                <button onClick={negotiatePeace} style={{...btnStyle, borderColor: '#00aaff', color: '#00aaff'}}>Neuvottele Rauhasta</button>
                <button onClick={demandWithdrawal} style={{...btnStyle, borderColor: '#ffcc00', color: '#ffcc00'}}>Vaadi Vetäytymistä</button>
                <button onClick={buildSilo} style={btnStyle}>Rakenna Siilo (30 pt)</button>
                <button onClick={buildABM} style={btnStyle}>Osta ABM (15 pt)</button>
              </>
          ) : (
              <div style={{ fontSize: '13px', color: '#ff3333', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
                ⚠ SOTA ON SYTTYNYT! Klikkaa vasenta puolta ampuaksesi ABM-torjuntaohjuksia, oikeaa puolta hyökätäksesi.
              </div>
          )}
        </div>

        <canvas
            ref={canvasRef}
            width={950}
            height={440}
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
  backgroundColor: '#0b1626',
  color: '#00ffcc',
  border: '1px solid #00ffcc',
  padding: '6px 12px',
  fontFamily: 'Courier New, monospace',
  cursor: 'pointer',
  fontSize: '12px',
  borderRadius: '4px'
};
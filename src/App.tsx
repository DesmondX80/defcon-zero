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
}

interface ExplosionData {
  id: number;
  x: number;
  y: number;
  radius: number;
  alpha: number;
  isPlayer: boolean;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pelin tilat ja resurssit
  const [playerHP, setPlayerHP] = useState<number>(100);
  const [enemyHP, setEnemyHP] = useState<number>(100);
  const [playerABM, setPlayerABM] = useState<number>(8);
  const [playerSilos, setPlayerSilos] = useState<number>(3);
  const [resources, setResources] = useState<number>(50); // Teollisuuspisteet

  const [defcon, setDefcon] = useState<number>(3); // 3 = Rauha/Kriisi, 2 = Vartiointi, 1 = Sota
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("DEFCON 3: Kylmä sota käynnissä. Kehitä arsenaalia tai käytä diplomatiaa.");

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

  // Resurssien tikitys
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver) return;
      setResources((prev) => Math.min(100, prev + 5));
    }, 2000);
    return () => clearInterval(interval);
  }, [gameOver]);

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

      // Tekoälyn toiminta
      if (!gameOver && defcon === 1) {
        aiTimer += dt;
        if (aiTimer > 10.0) {
          aiTimer = 0;
          const target = Math.random() > 0.5 ? playerCityPos : playerSiloPos;
          missilesRef.current.push({
            id: Math.random(),
            startX: enemySiloPos.x, startY: enemySiloPos.y,
            targetX: target.x + (Math.random() * 30 - 15),
            targetY: target.y + (Math.random() * 30 - 15),
            currentX: enemySiloPos.x, currentY: enemySiloPos.y,
            distance: Math.hypot(target.x - enemySiloPos.x, target.y - enemySiloPos.y),
            traveled: 0, speed: 65, isPlayer: false, active: true
          });
          setMessage("HÄLYTYS: Vihollinen on laukaissut strategisen ohjuksen!");
        }
      }

      // Ohjusten päivitys
      missilesRef.current.forEach((m) => {
        if (!m.active) return;
        m.traveled += m.speed * dt;
        let t = m.traveled / m.distance;

        if (t >= 1) {
          m.currentX = m.targetX; m.currentY = m.targetY; m.active = false;
          explosionsRef.current.push({ id: Math.random(), x: m.targetX, y: m.targetY, radius: 5, alpha: 1.0, isPlayer: m.isPlayer });

          if (m.isPlayer) {
            if (Math.hypot(m.targetX - enemyCityPos.x, m.targetY - enemyCityPos.y) < 45 ||
                Math.hypot(m.targetX - enemySiloPos.x, m.targetY - enemySiloPos.y) < 45) {
              setEnemyHP((prev) => {
                const next = Math.max(0, prev - 35);
                if (next <= 0) { setGameOver(true); setMessage("VOITTO: Vihollessvaltio on tuhottu."); }
                return next;
              });
            }
          } else {
            if (Math.hypot(m.targetX - playerCityPos.x, m.targetY - playerCityPos.y) < 45 ||
                Math.hypot(m.targetX - playerSiloPos.x, m.targetY - playerSiloPos.y) < 45) {
              setPlayerHP((prev) => {
                const next = Math.max(0, prev - 35);
                if (next <= 0) { setGameOver(true); setMessage("TAPPIO: Kotimaasi puolustus murtui."); }
                return next;
              });
            }
          }
        } else {
          m.currentX = m.startX + (m.targetX - m.startX) * t;
          m.currentY = m.startY + (m.targetY - m.startY) * t;
        }
      });
      missilesRef.current = missilesRef.current.filter((m) => m.active);

      // Räjähdykset
      explosionsRef.current.forEach((ex) => {
        ex.radius += 15 * dt;
        ex.alpha -= 0.35 * dt;
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

      // Ohjukset ja räjähdykset
      missilesRef.current.forEach((m) => {
        ctx.strokeStyle = m.isPlayer ? '#00ffff' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(m.startX, m.startY); ctx.lineTo(m.currentX, m.currentY); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(m.currentX, m.currentY, 3, 0, Math.PI * 2); ctx.fill();
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

  // Toiminnot
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver || defcon > 1) {
      if (defcon > 1) setMessage("SOTA EI OLE VIELÄ JULISTETTU. Käytä diplomatiaa tai odota kriisin kärjistymistä!");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // ABM-torjunta
    let intercepted = false;
    for (let m of missilesRef.current) {
      if (!m.isPlayer && m.active) {
        if (Math.hypot(m.currentX - clickX, m.currentY - clickY) < 35 && playerABM > 0) {
          setPlayerABM((prev) => prev - 1);
          m.active = false;
          explosionsRef.current.push({ id: Math.random(), x: m.currentX, y: m.currentY, radius: 5, alpha: 1.0, isPlayer: true });
          intercepted = true;
          setMessage("TORJUNTA ONNISTUI: Vihollisen ohjus tuhottu ilmassa!");
          break;
        }
      }
    }

    // Hyökkäys
    if (!intercepted && playerSilos > 0) {
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSiloPos.x, startY: playerSiloPos.y,
        targetX: clickX, targetY: clickY,
        currentX: playerSiloPos.x, currentY: playerSiloPos.y,
        distance: Math.hypot(clickX - playerSiloPos.x, clickY - playerSiloPos.y),
        traveled: 0, speed: 70, isPlayer: true, active: true
      });
      setMessage("ICBM laukaistu kohteeseen.");
    }
  };

  const buildSilo = () => {
    if (resources >= 30) {
      setResources((r) => r - 30);
      setPlayerSilos((s) => s + 1);
      setMessage("Uusi ohjussiilo rakennettu onnistuneesti.");
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 30 pt)."); }
  };

  const buildABM = () => {
    if (resources >= 15) {
      setResources((r) => r - 15);
      setPlayerABM((a) => a + 4);
      setMessage("Torjuntaohjuksia täydennetty (+4 kpl).");
    } else { setMessage("Ei tarpeeksi resursseja (vaatii 15 pt)."); }
  };

  const doDiplomacyDeescalate = () => {
    if (defcon < 3) {
      setDefcon((d) => d + 1);
      setMessage("Diplomaattinen neuvottelu onnistui! Jännitteet laskivat.");
    } else { setMessage("Tilanne on jo täysin rauhallinen."); }
  };

  const forceWar = () => {
    setDefcon(1);
    setMessage("VAROITUS: DEFCON 1! Ydinsota on alkanut!");
  };

  return (
      <div style={{ backgroundColor: '#05080f', color: '#00ffcc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace', margin: 0, padding: '20px' }}>

        <h1 style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '8px', textShadow: '0 0 10px rgba(0,255,204,0.4)' }}>
          DEFCON ZERO // STRATEGIC COMMAND
        </h1>

        {/* HUD & Resurssit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Pelaajan Kunto: <strong style={{ color: '#00ffff' }}>{playerHP}%</strong> | Siilot: <strong>{playerSilos}</strong> | ABM: <strong>{playerABM}</strong></div>
          <div>Resurssit: <strong style={{ color: '#ffcc00' }}>{resources} pt</strong></div>
          <div>DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : defcon === 2 ? 'orange' : 'yellow' }}>{defcon}</strong></div>
          <div>Vihollisen Kunto: <strong style={{ color: '#ff3333' }}>{enemyHP}%</strong></div>
        </div>

        {/* Diplomaatia- ja Asevarustelupaneeli */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', width: '950px', justifyContent: 'center' }}>
          <button onClick={buildSilo} style={btnStyle}>Rakenna Siilo (30 pt)</button>
          <button onClick={buildABM} style={btnStyle}>Osta ABM (+4 kpl) (15 pt)</button>
          <button onClick={doDiplomacyDeescalate} style={{...btnStyle, borderColor: '#00aaff', color: '#00aaff'}}>Neuvottele Rauhasta</button>
          <button onClick={forceWar} style={{...btnStyle, borderColor: '#ff3333', color: '#ff3333'}}>Julista Sota (DEFCON 1)</button>
        </div>

        {/* Canvas */}
        <canvas
            ref={canvasRef}
            width={950}
            height={460}
            onClick={handleCanvasClick}
            style={{ border: '2px solid #1a3a5c', boxShadow: '0 0 25px rgba(0, 255, 204, 0.15)', cursor: defcon === 1 ? 'crosshair' : 'not-allowed', background: '#020408' }}
        />

        {/* Alapaneeli & Ohjeet */}
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
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

  const [playerHP, setPlayerHP] = useState<number>(100);
  const [enemyHP, setEnemyHP] = useState<number>(100);
  const [playerABM, setPlayerABM] = useState<number>(12);
  const [defcon, setDefcon] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("DEFCON 3: Tilanne tarkkailussa. Odotetaan komentoja.");

  // Tukikohtien sijainnit maailmankartalla (1000x500)
  const playerSilo = { x: 200, y: 260, name: "USA Silo" };
  const playerCity = { x: 175, y: 290, name: "Washington" };

  const enemySilo = { x: 800, y: 170, name: "Venäjä Silo" };
  const enemyCity = { x: 750, y: 190, name: "Moskova" };

  const missilesRef = useRef<MissileData[]>([]);
  const explosionsRef = useRef<ExplosionData[]>([]);
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "https://t.pimg.jp/062/424/887/1/62424887.jpg";
    img.onload = () => {
      mapImageRef.current = img;
    };
  }, []);

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

      if (!gameOver) {
        aiTimer += dt;
        // Vihollisen tekoäly iskee nyt rauhallisemmin (12 sekunnin välein)
        if (aiTimer > 12.0) {
          aiTimer = 0;
          const targets = [playerCity, playerSilo];
          const target = targets[Math.floor(Math.random() * targets.length)];
          const tx = target.x + (Math.random() * 40 - 20);
          const ty = target.y + (Math.random() * 40 - 20);

          missilesRef.current.push({
            id: Math.random(),
            startX: enemySilo.x,
            startY: enemySilo.y,
            targetX: tx,
            targetY: ty,
            currentX: enemySilo.x,
            currentY: enemySilo.y,
            distance: Math.hypot(tx - enemySilo.x, ty - enemySilo.y),
            traveled: 0,
            speed: 55, // Hitaampi vihollisen ohjus
            isPlayer: false,
            active: true
          });
          setDefcon(1);
          setMessage("HÄLYTYS: Vihollisen strateginen ohjus havattu tutkassa!");
        }
      }

      // Päivitä ohjukset
      missilesRef.current.forEach((m) => {
        if (!m.active) return;
        m.traveled += m.speed * dt;
        let t = m.traveled / m.distance;

        if (t >= 1) {
          m.currentX = m.targetX;
          m.currentY = m.targetY;
          m.active = false;

          explosionsRef.current.push({
            id: Math.random(),
            x: m.targetX,
            y: m.targetY,
            radius: 5,
            alpha: 1.0,
            isPlayer: m.isPlayer
          });

          // Osumatarkistukset
          if (m.isPlayer) {
            if (Math.hypot(m.targetX - enemyCity.x, m.targetY - enemyCity.y) < 45 ||
                Math.hypot(m.targetX - enemySilo.x, m.targetY - enemySilo.y) < 45) {
              setEnemyHP((prev) => {
                const nextHP = Math.max(0, prev - 35);
                if (nextHP <= 0) {
                  setGameOver(true);
                  setMessage("VOITTO: Vihollessvaltio on neutralisoitu onnistuneella vastaiskulla.");
                }
                return nextHP;
              });
            }
          } else {
            if (Math.hypot(m.targetX - playerCity.x, m.targetY - playerCity.y) < 45 ||
                Math.hypot(m.targetX - playerSilo.x, m.targetY - playerSilo.y) < 45) {
              setPlayerHP((prev) => {
                const nextHP = Math.max(0, prev - 35);
                if (nextHP <= 0) {
                  setGameOver(true);
                  setMessage("TAPPIO: Puolustusjärjestelmät murtuivat. Maailma tuhoutui.");
                }
                return nextHP;
              });
            }
          }
        } else {
          m.currentX = m.startX + (m.targetX - m.startX) * t;
          m.currentY = m.startY + (m.targetY - m.startY) * t;
        }
      });

      missilesRef.current = missilesRef.current.filter((m) => m.active);

      // Päivitä räjähdykset (rauhallisempi hidastus)
      explosionsRef.current.forEach((ex) => {
        ex.radius += 15 * dt;
        ex.alpha -= 0.35 * dt;
      });
      explosionsRef.current = explosionsRef.current.filter((ex) => ex.alpha > 0);

      // PIIRTÄMINEN
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mapImageRef.current) {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(mapImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#03060a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Taktinen grid
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Tukikohdat
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(playerSilo.x - 8, playerSilo.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(playerCity.x, playerCity.y, 8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ff3333';
      ctx.fillRect(enemySilo.x - 8, enemySilo.y - 8, 16, 16);
      ctx.beginPath(); ctx.arc(enemyCity.x, enemyCity.y, 8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#88aaff';
      ctx.font = '11px Courier New';
      ctx.fillText("USA (Päämaja)", playerCity.x - 40, playerCity.y + 24);
      ctx.fillText("VENÄJÄ (Kohde)", enemyCity.x - 45, enemyCity.y + 24);

      // Ohjukset
      missilesRef.current.forEach((m) => {
        ctx.strokeStyle = m.isPlayer ? '#00ffff' : '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.startX, m.startY);
        ctx.lineTo(m.currentX, m.currentY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.currentX, m.currentY, 3, 0, Math.PI * 2);
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
  }, [gameOver]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // ABM-torjunta lennossa oleviin vihollisen ohjuksiin
    let intercepted = false;
    for (let m of missilesRef.current) {
      if (!m.isPlayer && m.active) {
        const dist = Math.hypot(m.currentX - clickX, m.currentY - clickY);
        if (dist < 35 && playerABM > 0) {
          setPlayerABM((prev) => prev - 1);
          m.active = false;
          explosionsRef.current.push({
            id: Math.random(),
            x: m.currentX,
            y: m.currentY,
            radius: 5,
            alpha: 1.0,
            isPlayer: true
          });
          intercepted = true;
          setMessage("TORJUNTA ONNISTUI: Vihollisen ohjus tuhottu ilmassa!");
          break;
        }
      }
    }

    // Jos ei torjuttu, ammutaan hitaampi ICBM
    if (!intercepted) {
      missilesRef.current.push({
        id: Math.random(),
        startX: playerSilo.x,
        startY: playerSilo.y,
        targetX: clickX,
        targetY: clickY,
        currentX: playerSilo.x,
        currentY: playerSilo.y,
        distance: Math.hypot(clickX - playerSilo.x, clickY - playerSilo.y),
        traveled: 0,
        speed: 70, // Hitaampi pelaajan ohjus
        isPlayer: true,
        active: true
      });
      setDefcon(1);
      setMessage("ICBM laukaistu. Matka-aika kohteeseen on n. 10 sekuntia.");
    }
  };

  return (
      <div style={{ backgroundColor: '#05080f', color: '#00ffcc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New, monospace', margin: 0, padding: '20px' }}>

        <h1 style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '10px', textShadow: '0 0 10px rgba(0,255,204,0.4)' }}>
          DEFCON ZERO // STRATEGIC COMMAND
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '950px', marginBottom: '8px', fontSize: '13px', borderBottom: '1px solid #1a3a5c', paddingBottom: '6px' }}>
          <div>Pelaajan Kunto: <strong style={{ color: '#00ffff' }}>{playerHP}%</strong> | ABM Torjuntaohjukset: <strong style={{ color: '#00ffff' }}>{playerABM}</strong></div>
          <div>DEFCON: <strong style={{ color: defcon === 1 ? '#ff3333' : 'yellow' }}>{defcon}</strong></div>
          <div>Vihollisen Kunto: <strong style={{ color: '#ff3333' }}>{enemyHP}%</strong></div>
        </div>

        <canvas
            ref={canvasRef}
            width={950}
            height={500}
            onClick={handleCanvasClick}
            style={{ border: '2px solid #1a3a5c', boxShadow: '0 0 25px rgba(0, 255, 204, 0.15)', cursor: 'crosshair', background: '#020408' }}
        />

        <div style={{ marginTop: '12px', fontSize: '12px', color: '#88aaff', textAlign: 'center', maxWidth: '900px' }}>
          <p><strong>OHJEET:</strong> Klikkaa karttaa laukaistaksesi strategisen ICBM-ohjuksen (matka kestää rauhassa n. 10s). Klikkaa lennossa olevia punaisia ohjuksia ilmassa tuhotaksesi ne ABM-puolustuksella.</p>
          <p style={{ color: '#ffcc00', fontWeight: 'bold' }}>{message}</p>
        </div>

      </div>
  );
}
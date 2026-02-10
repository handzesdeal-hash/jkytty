/* Plinko - simplified physics inspired by Stake-style board. Deterministic-ish with seeded randomness per drop. */
(() => {
  const canvas = document.getElementById("plinko");
  const ctx = canvas.getContext("2d");
  const betInput = document.getElementById("bet");
  const rowsSel = document.getElementById("rows");
  const riskSel = document.getElementById("risk");
  const balEl = document.getElementById("bal");
  const lastEl = document.getElementById("last");
  const profitEl = document.getElementById("profit");
  const payoutsWrap = document.getElementById("payouts");

  let balance = 100.0;
  let profit = 0.0;

  const gravity = 1600; // px/s^2 (slower descent)
  const pegRadius = 6;
  const ballRadius = 8;
  const maxStep = 1/240;
  const boardPaddingX = 40;
  const boardTop = 40;
  const boardBottomPad = 80;
  const triangleMarginTop = 60;
  let boardLeft = boardPaddingX;
  let boardRight = 0;
  let currentColSpacing = 0;
  const edgeBias = 320;
  const funnelRange = 40;
  const slotWidthScale = 0.9;

  // Motion tuning
  const baseVXMax = 180;
  const vYMin = 170;
  const xDamp = 0.5;      // strong sideways damping per collision
  const yDamp = 0.94;     // keep most of downward energy
  const baseYRestitution = 0.8;
  const maxYRestitution = 0.995;
  const restitutionK = 6; // controls how fast damping eases off with more hits
  const epsilonMax = Math.PI / 90; // ~2 degrees
  const sigmaXBase = 12;  // small lateral randomness per hit
  const centerSpringK = 22; // gentle pull to center
  const dragX = 1.0;      // air drag factor per second
  const pSpike = 0.05;
  const spikeMin = 1.8;
  const spikeMax = 2.5;
  const jitterSpeedMin = 120;
  const jitterImpulse = 38;

  const riskTables = {
    low:   { 12: [3.2,2.4,1.8,1.4,1.2,1.1,1,1,1.1,1.2,1.4,1.8,2.4,3.2], 14:[5.6,3.6,2.4,1.8,1.4,1.2,1.1,1,1,1.1,1.2,1.4,1.8,2.4,3.6,5.6], 16:[9,5.6,3.2,2.2,1.6,1.3,1.2,1.05,1.05,1.2,1.3,1.6,2.2,3.2,5.6,9,14] },
    medium:{ 12: [7,3.6,2.4,1.8,1.4,1.2,1.1,1,1.1,1.2,1.4,1.8,2.4,3.6,7], 14:[12,6,3.2,2.2,1.6,1.3,1.15,1.05,1.05,1.15,1.3,1.6,2.2,3.2,6,12], 16:[29,10,5,3,2,1.5,1.25,1.1,1.1,1.25,1.5,2,3,5,10,20,35] },
    high:  { 12: [35,12,5,2.8,1.8,1.4,1.2,1,1.2,1.4,1.8,2.8,5,12,35], 14:[76,20,8,4,2.4,1.6,1.25,1.05,1.05,1.25,1.6,2.4,4,8,20,60], 16:[130,40,15,7,3.5,2.2,1.5,1.1,1.1,1.5,2.2,3.5,7,15,40,100,180] }
  };

  const balls = [];
  let pegs = [];
  let slots = [];
  let slotLineY = 0;
  let currentRowSpacing = 0;
  let slotStates = [];

  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    buildBoard();
  }
  // expose for SPA view toggles so we can rebuild after the canvas becomes visible
  window.plinkoResize = resize;

  function buildBoard(){
    const rowCount = Number(rowsSel.value);
    const dpr = window.devicePixelRatio||1;
    const canvasW = canvas.width / dpr;
    const availHeight = canvas.height/dpr - triangleMarginTop - boardBottomPad;
    // base width constrained by both horizontal padding and available height for equilateral ratio
    const maxByWidth = canvasW - boardPaddingX*2;
    const maxByHeight = availHeight * 2 / Math.sqrt(3);
    const baseWidth = Math.max(10, Math.min(maxByWidth, maxByHeight));
    boardLeft = (canvasW - baseWidth) / 2;
    boardRight = boardLeft + baseWidth;
    const colSpacing = baseWidth / rowCount;
    const rowSpacing = colSpacing * Math.sqrt(3) * 0.5;
    currentColSpacing = colSpacing;
    const topOffset = 2; // skip first two rows; start with 3 pegs
    const rowsTotal = Math.max(1, rowCount - topOffset);
    pegs = [];
    const centerX = boardLeft + baseWidth/2;
    for(let r=0;r<=rowsTotal;r++){
      const cols = r + 1 + topOffset; // first visible row has 3 pegs
      const span = (cols-1) * colSpacing;
      const startX = centerX - span/2;
      const y = triangleMarginTop + r*rowSpacing;
      for(let c=0;c<cols;c++){
        const x = startX + c*colSpacing;
        pegs.push({x,y});
      }
    }
    // slots along bottom
    slots = [];
    slotStates = [];
    const slotY = triangleMarginTop + rowsTotal*rowSpacing + rowSpacing*0.5;
    for(let i=0;i<=rowCount;i++){
      const x = boardLeft + i*colSpacing + (colSpacing/2);
      slots.push(x);
      const pays = getPayouts();
      slotStates.push({scale:1, glow:0, popup:null, particles:[], mult: pays[i]||0});
    }
    slotLineY = slotY;
    currentRowSpacing = rowSpacing;
    draw();
    renderPayouts();
  }

  function seedRand(seed){
    let x = seed % 2147483647;
    if(x <= 0) x += 2147483646;
    return () => (x = x*16807 % 2147483647) / 2147483647;
  }

  function dropBall(auto=false){
    const bet = clamp2(Number(betInput.value));
    if(!(bet>0)) return toast("Bet > 0");
    if(balance < bet) return toast("Not enough balance");
    balance = clamp2(balance - bet);
    balEl.textContent = balance.toFixed(2);

    const seed = Date.now() + Math.random()*1e6;
    const rand = seedRand(seed);
    const xStart = (boardLeft + boardRight) / 2;
    // occasional spike run that loosens center pull and boosts lateral chaos
    const spikeRoll = rand() < pSpike;
    const spikeFactor = spikeRoll ? (spikeMin + rand()*(spikeMax-spikeMin)) : 1;
    const ball = {
      x: xStart,
      y: triangleMarginTop - currentRowSpacing*2,
      vx: (rand()-0.5)*14, // tiny horizontal offset
      vy: 160,
      bet,
      done:false,
      seed,
      bounceTimer:0,
      collisionCount:0,
      kCenter: centerSpringK / spikeFactor,
      sigmaX: sigmaXBase * spikeFactor,
      vxMax: baseVXMax * spikeFactor
    };
    ball.rand = rand;
    balls.push(ball);
  }

  function triggerSlotHit(idx, mult){
    const s = slotStates[idx];
    if(!s) return;
    s.scale = 1.15;
    s.glow = 1;
    s.popup = {text: `+${mult.toFixed(2)}x`, life:0.8, yOff:0};
    s.particles = Array.from({length:10}, ()=>{
      const ang = Math.random()*Math.PI*2;
      const speed = 60 + Math.random()*80;
      return {x: slots[idx], y: slotLineY-6, vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed, life:0.5};
    });
  }

  function updateSlots(dt){
    slotStates.forEach((s)=>{
      s.scale += (1 - s.scale) * Math.min(1, dt*8);
      s.glow += (0 - s.glow) * Math.min(1, dt*4);
      if(s.popup){
        s.popup.life -= dt;
        s.popup.yOff += -40*dt;
        if(s.popup.life<=0) s.popup=null;
      }
      s.particles = (s.particles||[]).filter(p=>{
        p.life -= dt;
        p.x += p.vx*dt;
        p.y += p.vy*dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        return p.life>0;
      });
    });
  }

  function physics(dt){
    const rPeg = pegRadius + ballRadius;
    balls.forEach(ball=>{
      if(ball.done) return;

      // gentle center bias + drag each step to favor middle bins
      const centerX = (boardLeft + boardRight) * 0.5;
      const axCenter = -ball.kCenter * (ball.x - centerX);
      ball.vx += axCenter * dt;
      ball.vx *= (1 - dragX*dt);

      // gentle edge bias to keep inside board
      if(ball.x < boardLeft + ballRadius + 8){ ball.vx += edgeBias * dt; }
      if(ball.x > boardRight - ballRadius - 8){ ball.vx -= edgeBias * dt; }
      // gravity
      ball.vy += gravity * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if(ball.bounceTimer>0) ball.bounceTimer = Math.max(0, ball.bounceTimer - dt);

      // walls
      if(ball.x < boardLeft+ballRadius){ ball.x = boardLeft+ballRadius; ball.vx = Math.abs(ball.vx)*0.6; }
      if(ball.x > boardRight-ballRadius){ ball.x = boardRight-ballRadius; ball.vx = -Math.abs(ball.vx)*0.6; }

      // peg collisions (simple radial check + deflect)
      for(const peg of pegs){
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist2 = dx*dx + dy*dy;
        if(dist2 < rPeg*rPeg){
          const dist = Math.sqrt(dist2)||0.0001;
          const nx = dx/dist, ny = dy/dist;
          // push out of overlap
          const overlap = rPeg - dist;
          ball.x += nx * (overlap + 0.4); // include small offset to avoid sticking
          ball.y += ny * (overlap + 0.4);

          // reflect velocity on normal (no extra loss here; handled by damping below)
          const dot = ball.vx*nx + ball.vy*ny;
          let vxNew = ball.vx - 2*dot*nx;
          let vyNew = ball.vy - 2*dot*ny;

          // dynamic vertical damping that eases off with more hits
          ball.collisionCount = (ball.collisionCount||0) + 1;
          const tEase = 1 - Math.exp(-ball.collisionCount / restitutionK);
          const eY = lerp(baseYRestitution, maxYRestitution, tEase);

          // tiny angular variance
          const angVar = (ball.rand()-0.5) * (2*epsilonMax);
          const cosA = Math.cos(angVar), sinA = Math.sin(angVar);
          const rx = vxNew * cosA - vyNew * sinA;
          const ry = vxNew * sinA + vyNew * cosA;
          vxNew = rx;
          vyNew = ry;

          // anisotropic damping (reduce sideways, keep downward)
          vxNew *= xDamp;
          vyNew *= yDamp;

          // apply vertical restitution that lessens over time and enforce minimum vy
          vyNew = Math.sign(vyNew||1) * Math.max(Math.abs(vyNew) * eY, vYMin);

          // re-apply gravity instantly after collision
          vyNew += gravity * dt;

          // controlled randomness per collision
          vxNew += randNormal(ball.rand) * (ball.sigmaX || sigmaXBase);

          // clamp sideways motion
          const vxCap = ball.vxMax || baseVXMax;
          if(vxNew > vxCap) vxNew = vxCap;
          if(vxNew < -vxCap) vxNew = -vxCap;

          ball.vx = vxNew;
          ball.vy = vyNew;

          // slight random sway to keep motion lively
          if(Math.hypot(ball.vx, ball.vy) < jitterSpeedMin){
            ball.vx += (ball.rand()-0.5) * jitterImpulse;
            ball.vy += (ball.rand()-0.2) * jitterImpulse;
          }

          ball.bounceTimer = 0.18; // Start bounce animation timer
          break;
        }
      }

      // soft funnel toward nearest slot near the bottom to keep landings clean
      if(ball.y > slotLineY - funnelRange){
        let target = ball.x;
        let best=Infinity, idx=0;
        slots.forEach((sx,i)=>{ const d=Math.abs(ball.x-sx); if(d<best){best=d; idx=i;} });
        target = slots[idx];
        const pull = 18;
        ball.vx += (target - ball.x) * pull * dt;
      }

      // tiny jitter if motion gets near-stuck mid-air
      if(!ball.done){
        const speed = Math.hypot(ball.vx, ball.vy);
        if(speed < jitterSpeedMin && ball.y < slotLineY-10){
          ball.vx += (ball.rand()-0.5) * jitterImpulse;
          ball.vy += (ball.rand()-0.2) * jitterImpulse;
        }
      }

      // floor / slot
      if(ball.y >= slotLineY){
        ball.done = true;
        // map x to slot index (clamped)
        let idx = Math.round((ball.x - (boardLeft + currentColSpacing*0.5)) / currentColSpacing);
        idx = Math.max(0, Math.min(slots.length-1, idx));
        // snap toward slot center for tidy landing
        ball.x = ball.x + (slots[idx] - ball.x)*0.6;
        ball.y = slotLineY;
        const pays = getPayouts();
        const mult = pays[idx] || 0;
        const win = clamp2(ball.bet * mult);
        balance = clamp2(balance + win);
        profit = clamp2(profit + (win - ball.bet));
        balEl.textContent = balance.toFixed(2);
        lastEl.textContent = win ? `Win ${win.toFixed(2)} (${mult.toFixed(2)}x)` : `Lost ${ball.bet.toFixed(2)}`;
        profitEl.textContent = profit.toFixed(2);
        triggerSlotHit(idx, mult||0);
      }
    });

    // remove finished balls so they don't linger on slots
    for(let i=balls.length-1;i>=0;i--){
      if(balls[i].done) balls.splice(i,1);
    }
  }

  function draw(){
    const w = canvas.width/(window.devicePixelRatio||1);
    const h = canvas.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);
    // pegs
    ctx.fillStyle = "rgba(255,255,255,.28)";
    pegs.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x,p.y,pegRadius,0,Math.PI*2);
      ctx.fill();
    });
    // separator line above slots
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boardLeft, slotLineY-6);
    ctx.lineTo(boardRight, slotLineY-6);
    ctx.stroke();

    // slots row (rounded rectangles with glow)
    slotStates.forEach((s, i)=>{
      const x = slots[i];
      const mult = s.mult || 0;
      const wSlot = currentColSpacing * slotWidthScale;
      const hSlot = 32;
      const rx = 8;
      const scale = s.scale || 1;
      const glow = s.glow || 0;
      const cx = x;
      const cy = slotLineY + hSlot*0.5 + 6;
      const halfW = (wSlot*scale)/2;
      const halfH = (hSlot*scale)/2;
      const fill = slotFillColor(mult);
      const stroke = "rgba(255,255,255,.18)";
      if(glow>0.01){
        ctx.shadowColor = fill;
        ctx.shadowBlur = 18*glow;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      drawRoundedRect(ctx, cx-halfW, cy-halfH, wSlot*scale, hSlot*scale, rx);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = stroke;
      ctx.stroke();
      ctx.shadowColor = "transparent";
      // text
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 13px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${mult.toFixed(2)}x`, cx, cy);
      // popup
      if(s.popup){
        ctx.globalAlpha = Math.max(0, s.popup.life/0.8);
        ctx.fillStyle = fill;
        ctx.font = "700 13px 'Inter', system-ui, sans-serif";
        ctx.fillText(s.popup.text, cx, cy - 24 + s.popup.yOff);
        ctx.globalAlpha = 1;
      }
      // particles
      if(s.particles?.length){
        ctx.fillStyle = fill;
        s.particles.forEach(p=>{
          ctx.globalAlpha = Math.max(0, p.life/0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }
    });
    // balls
    balls.forEach(b=>{
      ctx.fillStyle = "rgba(34,197,94,.9)";
      const scale = 1 + 0.18 * (b.bounceTimer ? (b.bounceTimer/0.18) : 0);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  }

  function loop(ts){
    const now = ts/1000;
    if(!loop.last) loop.last = now;
    let dt = now - loop.last;
    loop.last = now;
    while(dt > 0){
      const step = Math.min(dt, maxStep);
      physics(step);
      updateSlots(step);
      dt -= step;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function drawRoundedRect(ctx,x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.lineTo(x+w-rr, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+rr);
    ctx.lineTo(x+w, y+h-rr);
    ctx.quadraticCurveTo(x+w, y+h, x+w-rr, y+h);
    ctx.lineTo(x+rr, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-rr);
    ctx.lineTo(x, y+rr);
    ctx.quadraticCurveTo(x, y, x+rr, y);
    ctx.closePath();
  }

  function slotFillColor(mult){
    if(mult >= 50) return "#ef4444";
    if(mult >= 10) return "#f97316";
    if(mult >= 5) return "#f59e0b";
    if(mult >= 2) return "#fbbf24";
    if(mult >= 1) return "#34d399";
    if(mult >= 0.5) return "#38bdf8";
    return "#6366f1";
  }

  function getPayouts(){
    const r = riskSel.value;
    const rows = Number(rowsSel.value);
    const table = riskTables[r][rows];
    return table || riskTables.medium[16];
  }

  function renderPayouts(){
    const pays = getPayouts();
    payoutsWrap.innerHTML = pays.map((p)=>{
      const cls = p>=10 ? "pill high" : p>1 ? "pill win" : "pill";
      return `<div class="${cls}">${p.toFixed(2)}x</div>`;
    }).join("");
  }

  function clamp2(n){ return Math.round(n*100)/100; }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function randNormal(rand){
    const u1 = Math.max(rand(), 1e-7);
    const u2 = rand();
    return Math.sqrt(-2*Math.log(u1)) * Math.cos(2*Math.PI*u2);
  }
  function toast(msg){ console.log(msg); }

  document.getElementById("drop").onclick = ()=> dropBall(false);
  document.getElementById("auto").onclick = ()=>{
    let n=10;
    const run=()=>{ if(n--<=0) return; dropBall(true); setTimeout(run,180); };
    run();
  };
  document.getElementById("min").onclick = ()=>{ betInput.value = "0.01"; };
  document.getElementById("max").onclick = ()=>{ betInput.value = balance.toFixed(2); };
  document.getElementById("half").onclick = ()=>{ betInput.value = clamp2(Number(betInput.value)/2).toFixed(2); };
  document.getElementById("double").onclick = ()=>{ betInput.value = clamp2(Number(betInput.value)*2).toFixed(2); };

  rowsSel.onchange = buildBoard;
  riskSel.onchange = buildBoard;
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);
})();

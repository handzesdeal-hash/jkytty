// --- Triangle boundary variables ---
const wallRestitution = 0.6; // 0.4–0.8
const wallDamp = 0.98;       // To prevent jitter

// Geometry (set these appropriately to your board's layout)
const centerX = /* board center X */;
const topPegY = /* Y coord. of the topmost row of pegs */;
const pegSpacingX = /* horizontal spacing between pegs in first row */;
const rb = /* ball radius */;
const rp = /* peg radius */;
const spawnGap = 2; // px/padding
const leftBoundX = /* X of left-most bottom peg (or wall) */;
const rightBoundX = /* X of right-most bottom peg (or wall) */;
const topBoundY = /* Y at apex (top of triangle) */;
const bottomBoundY = /* Y at base/slotted row */;

// Helper lerp and clamp
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// Entry positions
const leftEntryX  = centerX - pegSpacingX;
const midEntryX   = centerX;
const rightEntryX = centerX + pegSpacingX;
const spawnY      = topPegY - (rb + spawnGap);

let lastEntryPos = 1; // 0: left, 1: mid, 2: right

function pickEntry(): number {
    // Example: cycle modes
    lastEntryPos = (lastEntryPos + 1) % 3;
    return [leftEntryX, midEntryX, rightEntryX][lastEntryPos];
    // For weighted random:
    // const r = Math.random();
    // return (r < 0.25) ? leftEntryX : (r < 0.75 ? midEntryX : rightEntryX);
}

// --- Ball spawn logic ---
function spawnBall() {
    let x = pickEntry();
    let y = spawnY;

    // Ensure no overlap with pegs: check pegs in top row
    const margin = 2; // px
    let safe = false;
    while (!safe) {
        safe = true;
        for (const peg of topRowPegs) {
            const dx = x - peg.x, dy = y - peg.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < rb + rp + margin) {
                y -= 2; // Bump ball up a bit if overlapping
                safe = false;
                break;
            }
        }
    }

    // Initial velocity: mostly down, small random x
    const vSpawnX = 0.1 * 400; // 10% of vSpawnY
    const vSpawnY = 400 + Math.random() * 200; // adjust as needed
    const vx = (Math.random() * 2 - 1) * vSpawnX;
    const vy = vSpawnY;

    // Create and add new ball
    balls.push({
        x, y,
        vx, vy,
        state: 'falling',
        // ...other ball properties...
    });
}

// --- On each update/frame ---
function updateBall(ball: Ball, dt: number) {
    // ...integrate physics: apply vx, vy, gravity, collisions...
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Apply gravity, peg collisions, etc...

    // --- Clamp inside triangle if falling ---
    if (ball.y < bottomBoundY) {
        // Compute t for interpolation (0=apex, 1=base)
        const t = clamp((ball.y - topBoundY) / (bottomBoundY - topBoundY), 0, 1);
        const xMin = lerp(centerX, leftBoundX,  t) + rb;
        const xMax = lerp(centerX, rightBoundX, t) - rb;

        if (ball.x < xMin) {
            ball.x = xMin;
            ball.vx = Math.abs(ball.vx) * wallRestitution;
            ball.vx *= wallDamp;
        }
        if (ball.x > xMax) {
            ball.x = xMax;
            ball.vx = -Math.abs(ball.vx) * wallRestitution;
            ball.vx *= wallDamp;
        }
    }

    // --- Check for slot capture at bottom ---
    if (ball.y >= bottomBoundY) {
        ball.state = 'captured';
        // resolve into slot/multiplier/capture handling logic here
    }
}
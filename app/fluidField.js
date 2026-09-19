/** A bounded, advected pointer field. Coordinates are relative to the viewport. */
export class FluidField {
  constructor(aspect = 1, decayRate = 3.5, continuousWake = false) {
    this.continuousWake = continuousWake;
    this.decayRate = decayRate;
    this.aspect = Math.max(0.25, Math.min(4, aspect));
    const resolution = continuousWake ? 96 : 64;
    this.columns = this.aspect >= 1 ? resolution : Math.round(resolution * this.aspect);
    this.rows = this.aspect >= 1 ? Math.round(resolution / this.aspect) : resolution;
    this.front = new Float32Array(this.columns * this.rows * 3);
    this.back = new Float32Array(this.front.length);
    this.strokes = [];
    this.advected = [0, 0, 0];
    this.previous = null;
    this.energy = 0;
  }

  get active() {
    return this.energy > 0.0005 || this.strokes.length > 0;
  }

  move(x, y) {
    if (!Number.isFinite(x + y)) return;
    // Entry establishes an anchor; it must not paint a dot or connect to an old exit.
    if (this.continuousWake && !this.previous) {
      this.previous = { x, y };
      return;
    }
    const previous = this.previous ?? { x: x - 0.004, y: y - 0.001 };
    const dx = Math.max(-0.09, Math.min(0.09, x - previous.x));
    const dy = Math.max(-0.09, Math.min(0.09, y - previous.y));
    this.previous = { x, y };
    if (Math.abs(dx) + Math.abs(dy) < 0.0001) return;
    const speed = Math.min(1, Math.hypot(dx * this.aspect, dy) * 25 + 0.06);
    this.strokes.push({ x, y, dx, dy, speed, fromX: previous.x, fromY: previous.y });
    if (this.strokes.length > 12) this.strokes.shift();
  }

  leave() {
    this.previous = null;
  }

  clear() {
    this.front.fill(0);
    this.back.fill(0);
    this.strokes.length = 0;
    this.previous = null;
    this.energy = 0;
  }

  read(data, x, y, out) {
    const gx = Math.max(0, Math.min(this.columns - 1.001, x * (this.columns - 1)));
    const gy = Math.max(0, Math.min(this.rows - 1.001, y * (this.rows - 1)));
    const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const top = (iy * this.columns + ix) * 3, bottom = top + this.columns * 3;
    const leftWeight = 1 - fx, topWeight = 1 - fy;
    out[0] = (data[top] * leftWeight + data[top + 3] * fx) * topWeight
      + (data[bottom] * leftWeight + data[bottom + 3] * fx) * fy;
    out[1] = (data[top + 1] * leftWeight + data[top + 4] * fx) * topWeight
      + (data[bottom + 1] * leftWeight + data[bottom + 4] * fx) * fy;
    out[2] = (data[top + 2] * leftWeight + data[top + 5] * fx) * topWeight
      + (data[bottom + 2] * leftWeight + data[bottom + 5] * fx) * fy;
  }

  sample(x, y, out) {
    this.read(this.front, x, y, out);
  }

  step(seconds) {
    if (!this.active) return;
    const dt = Math.max(0, Math.min(0.05, seconds));
    const decay = Math.exp(-dt * this.decayRate), inkDecay = Math.exp(-dt * (this.decayRate + 0.5));
    const xScale = Math.max(1, this.aspect), yScale = Math.max(1, 1 / this.aspect);
    let peak = 0;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
      const i = (y * this.columns + x) * 3, u = x / (this.columns - 1), v = y / (this.rows - 1);
      const transport = this.continuousWake ? 0.65 : 2;
      const sx = u - this.front[i] * dt * transport, sy = v - this.front[i + 1] * dt * transport;
      this.read(this.front, sx, sy, this.advected);
      let dx = this.advected[0] * decay;
      let dy = this.advected[1] * decay;
      let ink = this.advected[2] * inkDecay;
      for (const stroke of this.strokes) {
        let rx = (u - stroke.x) * xScale, ry = (v - stroke.y) * yScale;
        if (this.continuousWake) {
          const ax = (u - stroke.fromX) * xScale, ay = (v - stroke.fromY) * yScale;
          const bx = (stroke.x - stroke.fromX) * xScale, by = (stroke.y - stroke.fromY) * yScale;
          const along = Math.max(0, Math.min(1, (ax * bx + ay * by) / (bx * bx + by * by || 1)));
          rx = ax - bx * along; ry = ay - by * along;
          const distance = rx * rx + ry * ry;
          if (distance > 0.0225) continue;
          const weight = Math.exp(-distance / 0.0032);
          const travel = Math.hypot(stroke.dx * xScale, stroke.dy * yScale);
          const curl = Math.min(0.025, travel * 0.55);
          dx += (stroke.dx * 4.2 - ry * curl) * weight;
          dy += (stroke.dy * 4.2 + rx * curl) * weight;
          ink = Math.max(ink, Math.min(0.7, travel * 18) * weight);
          continue;
        }
        const distance = rx * rx + ry * ry;
        if (distance > 0.045) continue;
        const weight = Math.exp(-distance / 0.0075);
        const speed = stroke.speed;
        dx += (stroke.dx * 2.8 - ry * speed * 0.16) * weight;
        dy += (stroke.dy * 2.8 + rx * speed * 0.16) * weight;
        ink += speed * weight * 0.3;
      }
      this.back[i] = Math.max(-0.18, Math.min(0.18, dx));
      this.back[i + 1] = Math.max(-0.18, Math.min(0.18, dy));
      this.back[i + 2] = Math.min(0.8, ink);
      peak = Math.max(peak, Math.abs(dx), Math.abs(dy), ink);
    }
    [this.front, this.back] = [this.back, this.front];
    this.strokes.length = 0;
    this.energy = peak;
    if (!this.active) this.clear();
  }
}

/** Same folded-liquid formula as the source, evaluated per grid cell (u,v) instead of per pixel. */
export function sampleLiquid(u, v, aspect, time, flow, field) {
  flow.sample(u, v, field);
  const px = (u - 0.5 - field[0]) * aspect;
  const py = v - 0.5 - field[1];
  const qx = px + 0.22 * Math.sin(py * 5.2 + time * 0.17) + 0.15 * Math.sin(px * 2.4 - py * 3.1 - time * 0.1);
  const qy = py + 0.19 * Math.sin(px * 3.5 + time * 0.13);
  const radius = Math.hypot(qx * 0.8 + 0.18, qy * 1.1);
  const folds = 0.5 + 0.5 * Math.sin(radius * 14 - qx * 2.8 + Math.sin(qy * 5) * 1.4 - time * 0.24);
  const cloud = 0.5 + 0.5 * Math.sin(qx * 3.6 - qy * 2.9 + time * 0.09);
  return Math.max(0, Math.min(1, folds * folds * (0.48 + cloud * 0.32) - 0.075 + field[2] * 0.75));
}

/**
 * Sky Island Glider — CS 174C Term Project
 * Interactive flying game: glide through rings, avoid obstacles, manage wind.
 * Algorithms: (1) Flight dynamics + external forces (2) Path-based obstacle motion
 *             (3) Collision detection (4) Procedural course placement
 */
import { tiny, defs } from './examples/common.js';

const { vec3, vec4, color, Mat4, Shape, Shader, Component } = tiny;

// ---- Procedural placement: generate ring centers along a simple course path ----
function generate_ring_positions(num_rings, spacing = 12, curve = 0.3) {
  const positions = [];
  for (let i = 0; i < num_rings; i++) {
    const t = (i / Math.max(num_rings - 1, 1)) * (num_rings * spacing);
    const x = Math.sin(t * curve) * 25;
    const z = t;
    const y = 15 + Math.sin(t * 0.2) * 5;
    positions.push(vec3(x, y, z));
  }
  return positions;
}

// ---- Path-based animation: parametric position at time t ----
function path_position(obstacle, t) {
  const period = obstacle.period || 8;
  const phase = (t / 1000) * (2 * Math.PI) / period + (obstacle.phase || 0);
  const r = obstacle.radius || 6;
  const center = obstacle.center;
  return vec3(
    center[0] + r * Math.cos(phase),
    center[1] + r * 0.3 * Math.sin(phase * 2),
    center[2] + r * Math.sin(phase)
  );
}

// ---- Wind zone: axis-aligned box + wind vector ----
function is_inside_wind_zone(pos, zone) {
  const [cx, cy, cz] = zone.center;
  const [hw, hh, hd] = zone.halfSize;
  return pos[0] >= cx - hw && pos[0] <= cx + hw &&
         pos[1] >= cy - hh && pos[1] <= cy + hh &&
         pos[2] >= cz - hd && pos[2] <= cz + hd;
}

// ---- Collision: sphere vs sphere (glider vs obstacle) ----
function sphere_sphere_collision(center_a, radius_a, center_b, radius_b) {
  const d = center_a.minus(center_b).norm();
  return d < radius_a + radius_b;
}

// ---- Ring pass: glider center near ring plane and within ring radius ----
function check_ring_pass(glider_pos, ring_center, ring_normal, ring_radius, pass_margin = 2) {
  const to_ring = ring_center.minus(glider_pos);
  const along_normal = Math.abs(to_ring.dot(ring_normal));
  const in_plane = to_ring.minus(ring_normal.times(to_ring.dot(ring_normal)));
  return along_normal < pass_margin && in_plane.norm() < ring_radius + pass_margin;
}

export const Sky_Island_Glider = defs.Sky_Island_Glider =
class Sky_Island_Glider extends Component {
  init() {
    this.widget_options = { make_controls: true };

    // Shapes
    this.shapes = {
      glider: new defs.Subdivision_Sphere(2),
      ring: new defs.Torus(12, 8, [[0, 1], [0, 1]]),
      obstacle: new defs.Subdivision_Sphere(2),
      island: new defs.Cube(),
      sky_quad: new defs.Square(),
    };

    this.shader = new defs.Phong_Shader(2);
    this.materials = {
      glider: { shader: this.shader, color: color(0.2, 0.6, 0.9, 1), ambient: 0.3, diffusivity: 0.8, specularity: 0.3, smoothness: 20 },
      ring: { shader: this.shader, color: color(0.9, 0.7, 0.2, 1), ambient: 0.4, diffusivity: 0.7, specularity: 0.4, smoothness: 25 },
      obstacle: { shader: this.shader, color: color(0.85, 0.3, 0.2, 1), ambient: 0.4, diffusivity: 0.7, specularity: 0.3, smoothness: 20 },
      island: { shader: this.shader, color: color(0.3, 0.6, 0.35, 1), ambient: 0.5, diffusivity: 0.6, specularity: 0.2, smoothness: 10 },
      sky: { shader: this.shader, color: color(0.5, 0.75, 1.0, 1), ambient: 1, diffusivity: 0, specularity: 0, smoothness: 1 },
    };

    // Flight state (external forces + inertia)
    this.glider_pos = vec3(0, 18, -15);
    this.glider_velocity = vec3(0, 0, 0);
    this.glider_pitch = 0;  // radians
    this.glider_yaw = 0;
    this.glider_radius = 1.2;

    // Input state (set by key_triggered_button in render_controls)
    this.pitch_input = 0;
    this.yaw_input = 0;
    this.thrust_on = false;

    // Constants: gravity and thrust (flight dynamics)
    this.gravity = vec3(0, -4, 0);
    this.thrust_strength = 8;
    this.drag = 0.98;
    this.turn_speed = 1.2;

    // Procedural rings
    this.ring_centers = generate_ring_positions(12, 14, 0.25);
    this.ring_normal = vec3(0, 0, 1).normalized();
    this.ring_radius = 4;
    this.rings_passed = new Set();
    this.next_ring_index = 0;

    // Wind zones (external force regions)
    this.wind_zones = [
      { center: vec3(10, 18, 30), halfSize: [8, 6, 10], wind: vec3(-2, 0.5, 0) },
      { center: vec3(-15, 20, 80), halfSize: [10, 5, 12], wind: vec3(1.5, -0.3, -0.5) },
    ];

    // Path-based moving obstacles
    this.obstacles = [
      { center: vec3(5, 19, 40), period: 6, phase: 0, radius: 5 },
      { center: vec3(-8, 21, 70), period: 8, phase: Math.PI / 2, radius: 6 },
      { center: vec3(0, 17, 100), period: 5, phase: Math.PI, radius: 4 },
    ];
    this.obstacle_positions = [];
    this.obstacle_radius = 1.5;

    // Game state
    this.crashed = false;
    this.finished = false;
    this.start_time = 0;
    this.finish_z = 160;
  }

  render_controls() {
    this.control_panel.innerHTML = "Sky Island Glider — Fly through rings, avoid red obstacles. ";
    this.key_triggered_button("Pitch up", ["w"], () => this.pitch_input = 1, undefined, () => this.pitch_input = 0);
    this.key_triggered_button("Pitch down", ["s"], () => this.pitch_input = -1, undefined, () => this.pitch_input = 0);
    this.key_triggered_button("Turn left", ["a"], () => this.yaw_input = 1, undefined, () => this.yaw_input = 0);
    this.key_triggered_button("Turn right", ["d"], () => this.yaw_input = -1, undefined, () => this.yaw_input = 0);
    this.key_triggered_button("Thrust", [" "], () => this.thrust_on = true, undefined, () => this.thrust_on = false);
    this.key_triggered_button("Reset", ["r"], () => this.reset_glider(), "orange");
    this.new_line();
    this.live_string(box => {
      box.textContent = "Rings: " + this.rings_passed.size + " / " + this.ring_centers.length +
        "  |  Crashed: " + (this.crashed ? "Yes" : "No") +
        (this.finished ? "  |  Finished!" : "");
    });
  }

  reset_glider() {
    this.glider_pos = vec3(0, 18, -15);
    this.glider_velocity = vec3(0, 0, 0);
    this.glider_pitch = 0;
    this.glider_yaw = 0;
    this.rings_passed.clear();
    this.next_ring_index = 0;
    this.crashed = false;
    this.finished = false;
    this.start_time = this.uniforms.animation_time;
  }

  render_animation(caller) {
    const dt = (this.uniforms.animation_delta_time || 16) / 1000;
    if (this.start_time === 0) this.start_time = this.uniforms.animation_time;

    // Chase camera: position behind and above glider
    const cam_distance = 14;
    const cam_height = 6;
    const yaw = this.glider_yaw;
    const pitch = this.glider_pitch;
    const back = vec3(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const camera_pos = this.glider_pos.plus(back.times(cam_distance)).plus(vec3(0, cam_height, 0));
    const look_at = this.glider_pos.plus(back.times(-5));
    Shader.assign_camera(Mat4.look_at(camera_pos, look_at, vec3(0, 1, 0)), this.uniforms);
    this.uniforms.projection_transform = Mat4.perspective(Math.PI / 4, caller.width / caller.height, 0.5, 500);
    this.uniforms.lights = [
      defs.Phong_Shader.light_source(vec4(0, 50, 80, 1), color(1, 1, 1, 1), 80000),
      defs.Phong_Shader.light_source(vec4(-30, 40, 0, 1), color(0.9, 0.95, 1, 1), 40000),
    ];

    if (this.crashed || this.finished) {
      this.draw_scene(caller);
      return;
    }

    // ---- Flight dynamics: external forces (gravity + wind) ----
    let accel = this.gravity.copy();

    for (const zone of this.wind_zones) {
      if (is_inside_wind_zone(this.glider_pos, zone)) {
        accel = accel.plus(zone.wind);
      }
    }

    if (this.thrust_on) {
      const thrust_dir = vec3(-Math.sin(this.glider_yaw) * Math.cos(this.glider_pitch), -Math.sin(this.glider_pitch), -Math.cos(this.glider_yaw) * Math.cos(this.glider_pitch));
      accel = accel.plus(thrust_dir.times(this.thrust_strength));
    }

    this.glider_velocity = this.glider_velocity.plus(accel.times(dt));
    this.glider_velocity = this.glider_velocity.times(this.drag);
    this.glider_pos = this.glider_pos.plus(this.glider_velocity.times(dt));

    this.glider_pitch += this.pitch_input * this.turn_speed * dt;
    this.glider_yaw += this.yaw_input * this.turn_speed * dt;
    this.glider_pitch = Math.max(-0.8, Math.min(0.8, this.glider_pitch));

    // Path-based obstacle positions
    const t = this.uniforms.animation_time || 0;
    this.obstacle_positions = this.obstacles.map(obs => path_position(obs, t));

    // Collision: glider vs obstacles
    for (const obs_pos of this.obstacle_positions) {
      if (sphere_sphere_collision(this.glider_pos, this.glider_radius, obs_pos, this.obstacle_radius)) {
        this.crashed = true;
        break;
      }
    }

    // Ring pass detection
    for (let i = 0; i < this.ring_centers.length; i++) {
      if (this.rings_passed.has(i)) continue;
      const rc = this.ring_centers[i];
      if (check_ring_pass(this.glider_pos, rc, this.ring_normal, this.ring_radius)) {
        this.rings_passed.add(i);
        if (i >= this.next_ring_index) this.next_ring_index = i + 1;
      }
    }

    if (this.glider_pos[2] >= this.finish_z) this.finished = true;
    if (this.glider_pos[1] < 5) this.crashed = true;

    this.draw_scene(caller);
  }

  draw_scene(caller) {
    const glider_transform = Mat4.translation(...this.glider_pos)
      .times(Mat4.rotation(this.glider_yaw, 0, 1, 0))
      .times(Mat4.rotation(this.glider_pitch, 1, 0, 0))
      .times(Mat4.scale(this.glider_radius, this.glider_radius, this.glider_radius * 1.2));
    this.shapes.glider.draw(caller, this.uniforms, glider_transform, this.materials.glider);

    // Procedural rings
    for (let i = 0; i < this.ring_centers.length; i++) {
      const rc = this.ring_centers[i];
      const ring_t = Mat4.translation(rc[0], rc[1], rc[2])
        .times(Mat4.rotation(Math.PI / 2, 1, 0, 0))
        .times(Mat4.scale(this.ring_radius, this.ring_radius, 0.4));
      this.shapes.ring.draw(caller, this.uniforms, ring_t, this.materials.ring);
    }

    // Path-animated obstacles
    for (const pos of this.obstacle_positions) {
      const obs_t = Mat4.translation(pos[0], pos[1], pos[2]).times(Mat4.scale(this.obstacle_radius, this.obstacle_radius, this.obstacle_radius));
      this.shapes.obstacle.draw(caller, this.uniforms, obs_t, this.materials.obstacle);
    }

    // Simple floating islands (procedural placement)
    const island_positions = [vec3(0, 10, 20), vec3(-12, 12, 60), vec3(15, 8, 100)];
    for (const ip of island_positions) {
      const island_t = Mat4.translation(ip[0], ip[1], ip[2]).times(Mat4.scale(6, 2, 6));
      this.shapes.island.draw(caller, this.uniforms, island_t, this.materials.island);
    }

    // Distant sky quad (optional)
    const sky_t = Mat4.translation(0, 30, 80).times(Mat4.rotation(-Math.PI / 2, 1, 0, 0)).times(Mat4.scale(200, 200, 1));
    this.shapes.sky_quad.draw(caller, this.uniforms, sky_t, this.materials.sky);
  }

  render_explanation() {
    this.document_region.innerHTML += `
      <p><strong>Sky Island Glider</strong> — Fly through the golden rings, avoid red obstacles, and fight wind zones.
      Uses (1) <em>flight dynamics with external forces</em> (gravity + wind), (2) <em>path-based animation</em> for moving obstacles,
      (3) <em>collision detection</em> for rings and obstacles, and (4) <em>procedural placement</em> of the course.</p>
    `;
  }
};

export default Sky_Island_Glider;

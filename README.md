# Sky Island Glider

**CS 174C Term Project** — An interactive flying game set in a floating-island world above the clouds.

**Repository:** [https://github.com/nathanglon/CS174C_Final_Sky_Island](https://github.com/nathanglon/CS174C_Final_Sky_Island)

## Team

| Name            | UID       |
|----------------|-----------|
| Nathan Glon    | 405917876 |
| Will Speiler   | 706512171 |
| Jack Criminger | 006027673 |

## Description

The player controls a glider and navigates through a sky course made of **checkpoint rings**, **wind gusts**, and **moving obstacles**. The main challenge is keeping the glider under control while the environment pushes back: wind zones drift you off course, obstacles move across your path, and you interact with the environment to stay on course. Goal: an aerial obstacle race with smooth movement, responsive controls, and a visually animated sky setting.

- **Tech:** Browser-based, built with the [tiny-graphics](https://github.com/encyclopedia-of-code/tiny-graphics-js) JavaScript/WebGL library.
- **Controls:** Keyboard for steering; chase-style camera so the player feels like they’re flying through the world.

## Animation Algorithms (≥4 from class)

1. **Flight dynamics with external forces** — Gravity and wind gust regions affect the glider’s velocity and direction (no purely scripted motion).
2. **Path-based animation** — Moving obstacles (e.g. floating debris/platforms) follow parametric/spline paths so the course feels alive and timing matters.
3. **Collision detection** — Ring passes and obstacle impacts use bounding volumes; trigger score updates or crash/reset behavior.
4. **Procedural placement** — Rings, islands, and wind zones are generated with spacing and difficulty constraints so levels aren’t fully hardcoded.

## How to Run

1. **Serve the project over HTTP** (required for ES modules). From the project root:
   ```bash
   python3 server.py
   ```
   Or use the repo’s `host.command` / `host.bat` if you prefer.

2. Open Chrome and go to: **http://localhost:8000** (or the port printed by the server).

3. **Controls (rough draft):**
   - **W / S** — Pitch (nose up / down)
   - **A / D** — Yaw (turn left / right)
   - **Space** — Thrust / climb
   - **R** — Reset glider to start

## Project Requirements (CS 174C)

- Web-based app running in the browser with an animated scene.
- HTML + JavaScript; optionally GLSL for shaders.
- Based on the tiny-graphics library repo; runs in latest Chrome.
- At least 4 animation algorithms supporting one coherent theme (see list above).
- User interaction and a visually clean, glitch-free look.

## Attribution

The project uses the **tiny-graphics-js** library (Garett Ridge / UCLA CS 174). Cite it in your written report as: *tiny-graphics.js*, https://github.com/encyclopedia-of-code/tiny-graphics-js .

## Timeline

- **Feb 14:** Proposal posted on BruinLearn; group members set.
- **Feb 28 (discussion):** Midway demo.
- **March 14, 23:59:** Final code and report due.
- **March 17, 6:30–9:30 PM:** Final demo.

## Repository

**GitHub:** [CS174C_Final_Sky_Island](https://github.com/nathanglon/CS174C_Final_Sky_Island)

To connect this folder to the repo and push (first time):

```bash
git init
git add .
git commit -m "Initial rough draft: Sky Island Glider"
git remote add origin https://github.com/nathanglon/CS174C_Final_Sky_Island.git
git branch -M main
git push -u origin main
```

If the repo already has a README and you want to merge:

```bash
git pull origin main --allow-unrelated-histories
# resolve any conflicts, then:
git push -u origin main
```

After that, collaborators can clone the repo; use branches and pull requests to work in parallel.

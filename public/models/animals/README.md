# Drop-in animal models

Drop a `.glb` here named exactly as below and it **automatically replaces** the
procedural creature in-game — no code change, no rebuild beyond a refresh. If a
file is missing, the game falls back to the built-in low-poly version.

| Filename     | Animal        | In-game height |
|--------------|---------------|----------------|
| `beaver.glb` | Eurasian beaver | ~0.6 units    |
| `boar.glb`   | Wild boar       | ~0.7 units    |
| `heron.glb`  | Grey heron      | ~1.1 units    |
| `bee.glb`    | Honeybee        | ~0.35 units   |

The deer and wolf already use committed models in `../quaternius/`.

## How to generate them (Meshy or Tripo — free tiers work)

1. Go to **meshy.ai** (Text-to-3D) or **tripo3d.ai**.
2. Paste a prompt (below), generate, pick the best result.
3. Download as **GLB**. Rename to the filename above and drop it in this folder.
4. Refresh the game — the model appears. Tell me and I'll fine-tune scale/rotation if needed.

### Prompts (tuned for a friendly low-poly game look)

- **beaver.glb** — `low-poly stylized Eurasian beaver, cute, friendly, sitting upright, flat paddle tail, warm brown fur, game-ready, single mesh, neutral pose`
- **boar.glb** — `low-poly stylized wild boar, cute but rugged, standing on four legs, small tusks, dark brown bristly fur, game-ready, single mesh`
- **heron.glb** — `low-poly stylized grey heron wading bird, standing, long neck and legs, long yellow beak, soft grey and white feathers, game-ready, single mesh`
- **bee.glb** — `low-poly stylized honeybee, cute, plump striped yellow-and-black body, small translucent wings, game-ready, single mesh`

### Requirements

- **Format:** `.glb` (binary glTF, textures embedded).
- **Orientation:** facing +Z (toward camera) and standing on the ground plane (Y up) is ideal; I can correct rotation/offset if it's off.
- **Animation:** optional. If the model includes an idle/walk clip the game will play it; otherwise it gets a gentle idle bob.
- Keep them reasonably small (a few hundred KB–2 MB each) so the page stays quick to load.

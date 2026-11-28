import type * as THREE from 'three'
import { DRIVE, PROPS } from '../../config'
import { SpatialGrid } from '../../core/spatialGrid'
import type { Terrain, TreeSpecies } from '../terrain'
import { PropMeshes } from './meshes'
import { scatterProps } from './scatter'
import type { Bush, Fence, Hay, Rock, Tree } from './types'

function gridOf<T extends { x: number; z: number }>(items: T[]): SpatialGrid<T> {
	const g = new SpatialGrid<T>(PROPS.gridCell)
	for (const it of items) g.add(it)
	return g
}

/** Height of a rock's top above the ground (the stone mesh rises to ~1.1 r; hedgehogs and teeth stand ~1.5 m). */
const rockTop = (rk: Rock) => (rk.kind === 'rock' ? rk.r * 1.1 : 1.5)

/**
 * Vegetation and clutter: trees that tanks knock flat, bushes that hide tanks, rocks that stop them,
 * haystacks that get crushed and fences that get flattened. Everything is instanced.
 */
export class Props {
	readonly trees: Tree[]
	readonly bushes: Bush[]
	readonly rocks: Rock[]
	readonly hay: Hay[]
	readonly fences: Fence[]
	private readonly meshes: PropMeshes
	private readonly treeGrid: SpatialGrid<Tree>
	private readonly bushGrid: SpatialGrid<Bush>
	private readonly rockGrid: SpatialGrid<Rock>
	private readonly hayGrid: SpatialGrid<Hay>
	private readonly fenceGrid: SpatialGrid<Fence>
	private readonly falling: Tree[] = []
	private readonly dirtySpecies = new Set<TreeSpecies>()
	private readonly scratch: (Tree | Bush | Rock | Hay | Fence)[] = []

	constructor(private readonly terrain: Terrain) {
		const set = scatterProps(terrain)
		;({ trees: this.trees, bushes: this.bushes, rocks: this.rocks, hay: this.hay, fences: this.fences } = set)
		this.treeGrid = gridOf(this.trees)
		this.bushGrid = gridOf(this.bushes)
		this.rockGrid = gridOf(this.rocks)
		this.hayGrid = gridOf(this.hay)
		this.fenceGrid = gridOf(this.fences)
		this.meshes = new PropMeshes(terrain, set)
	}

	get group(): THREE.Group {
		return this.meshes.group
	}

	/**
	 * A vehicle of radius r at (x,z) moving (vx,vz): trees go down when hit fast enough (slower, the trunk stops the
	 * hull), hay and fences flatten, rocks push back. Writes the push-out into `out`; returns a slowdown factor.
	 */
	crush(x: number, z: number, r: number, vx: number, vz: number, out: { x: number; z: number }): number {
		out.x = out.z = 0
		const slowTrees = this.crushTrees(x, z, r, vx, vz, out)
		this.pushOutOfRocks(x, z, r, out)
		const slowHay = this.crushHay(x, z, r)
		this.flattenFences(x, z, r)
		return Math.min(slowTrees, slowHay)
	}

	private crushTrees(x: number, z: number, r: number, vx: number, vz: number, out: { x: number; z: number }) {
		let slow = 1
		const speed = Math.hypot(vx, vz)
		for (const t of this.treeGrid.near(x, z, r + 2, this.scratch as Tree[])) {
			if (t.fallen) continue
			const d = Math.hypot(t.x - x, t.z - z)
			if (d > r + 0.4) continue
			if (speed < DRIVE.treeKnock) {
				const push = (r + 0.4 - d) / (d || 1)
				out.x += (x - t.x) * push
				out.z += (z - t.z) * push
				continue
			}
			t.fallen = true
			t.fallT = 0
			t.dirX = vx / speed
			t.dirZ = vz / speed
			this.falling.push(t)
			slow = Math.min(slow, DRIVE.treeSlow)
		}
		return slow
	}

	/** A heavy blast at (x,z): trees within r fall away from it, haystacks and fences there are flattened. */
	blast(x: number, z: number, r: number) {
		for (const t of this.treeGrid.near(x, z, r + 2, this.scratch as Tree[])) {
			const d = Math.hypot(t.x - x, t.z - z)
			if (t.fallen || d > r) continue
			t.fallen = true
			t.fallT = 0
			t.dirX = d > 0.01 ? (t.x - x) / d : 1
			t.dirZ = d > 0.01 ? (t.z - z) / d : 0
			this.falling.push(t)
		}
		this.crushHay(x, z, Math.max(0, r - 1.5))
		this.flattenFences(x, z, Math.max(0, r - 1.2))
	}

	private pushOutOfRocks(x: number, z: number, r: number, out: { x: number; z: number }) {
		for (const rk of this.rockGrid.near(x, z, r + 4, this.scratch as Rock[])) {
			const d = Math.hypot(rk.x - x, rk.z - z)
			const m = r + rk.r * 0.9
			if (d >= m) continue
			const push = (m - d) / (d || 1)
			out.x += (x - rk.x) * push
			out.z += (z - rk.z) * push
		}
	}

	private crushHay(x: number, z: number, r: number) {
		let slow = 1
		for (const h of this.hayGrid.near(x, z, r + 3, this.scratch as Hay[])) {
			if (h.crushed || Math.hypot(h.x - x, h.z - z) > r + 1.5) continue
			h.crushed = true
			this.meshes.writeHay(h, this.hay.indexOf(h))
			slow = PROPS.haySlow
		}
		return slow
	}

	private flattenFences(x: number, z: number, r: number) {
		for (const f of this.fenceGrid.near(x, z, r + 3, this.scratch as Fence[])) {
			if (f.down || Math.hypot(f.x - x, f.z - z) > r + 1.2) continue
			f.down = true
			this.meshes.writeFence(f, this.fences.indexOf(f))
		}
	}

	/** Concealment bonus at (x,z): inside a bush crown. */
	bushAt(x: number, z: number): boolean {
		const near = this.bushGrid.near(x, z, 6, this.scratch as Bush[])
		return near.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + 1.2)
	}

	/**
	 * Does a solid prop (rock) block the segment? Only below the top of the rock: a shell passing over it flies on.
	 * Trees and bushes do not stop shells.
	 */
	blocksSegment(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
		return this.rockContact(ax, ay, az, bx, by, bz, true) >= 0
	}

	/**
	 * Where along the segment (parameter 0..1) it first meets a rock, or −1: the point where it enters the rock's
	 * circle. `any` returns the first rock found instead of the nearest.
	 */
	rockContact(ax: number, ay: number, az: number, bx: number, by: number, bz: number, any = false): number {
		const dx = bx - ax
		const dz = bz - az
		const len2 = dx * dx + dz * dz
		const len = Math.sqrt(len2)
		let best = -1
		// Samples only pick the rocks to test (each lookup covers 4 m around it); the test itself is against the
		// segment, so a small obstacle between two samples still stops the shell
		const n = Math.max(1, Math.ceil(len / 3))
		for (let i = 0; i <= n; i++) {
			const s = i / n
			for (const rk of this.rockGrid.near(ax + dx * s, az + dz * s, 4, this.scratch as Rock[])) {
				const t = len2 > 0 ? Math.max(0, Math.min(1, ((rk.x - ax) * dx + (rk.z - az) * dz) / len2)) : 0
				const x = ax + dx * t
				const z = az + dz * t
				const r = rk.r * 0.8
				const off = Math.hypot(rk.x - x, rk.z - z)
				if (off >= r) continue
				const above = ay + (by - ay) * t - this.terrain.height(x, z)
				if (above > PROPS.rockTopMax || above >= rockTop(rk)) continue
				const enter = len > 0 ? Math.max(0, t - Math.sqrt(r * r - off * off) / len) : 0
				if (any) return enter
				if (best < 0 || enter < best) best = enter
			}
		}
		return best
	}

	/** Is a rock within r of (x,z)? Bots probe this when steering (trees they just push over or stop at). */
	rockAt(x: number, z: number, r: number): boolean {
		const near = this.rockGrid.near(x, z, r + 4, this.scratch as Rock[])
		return near.some((rk) => Math.hypot(rk.x - x, rk.z - z) < r + rk.r)
	}

	/** Animate falling trees. */
	update(dt: number) {
		if (!this.falling.length) return
		const dirty = this.dirtySpecies
		dirty.clear()
		for (let i = this.falling.length - 1; i >= 0; i--) {
			const t = this.falling[i]
			t.fallT = Math.min(1, t.fallT + dt * PROPS.fallSpeed)
			this.meshes.writeTree(t, true)
			dirty.add(t.species)
			if (t.fallT >= 1) this.falling.splice(i, 1)
		}
		this.meshes.markTreesDirty(dirty)
	}

	dispose() {
		this.meshes.dispose()
	}
}

// The plumbing of one-shot sounds: the entry chain of a world sound, when its layers start and letting go of its
// nodes once they have played out.

/**
 * A one-shot's entry point: gain-adjusted volume `v`, how far toward the edge of its reach it is (0…1), and how
 * late it arrives (s): every layer of the sound starts that much later.
 */
export interface Voice {
	node: AudioNode
	v: number
	far: number
	lag: number
	/** The chain's own nodes, let go of when the last of its `layers` has played out. */
	chain: AudioNode[]
	layers: number
}

/** Where a layer of sound goes: a world voice, or straight into a node (the mix, a cockpit filter). */
export type Out = Voice | AudioNode

/** A voice let go of once its layers end; one that got no layer at all (all too quiet) is let go of at once. */
export function chainVoice(voice: Voice): Voice {
	queueMicrotask(() => voice.layers === 0 && voice.chain.forEach((n) => n.disconnect()))
	return voice
}

/** A layer's source and nodes are disconnected when it ends, and its voice's chain after the last layer. */
export function releaseLayer(out: Out, src: AudioScheduledSourceNode, nodes: AudioNode[]) {
	const voice = out instanceof AudioNode ? null : out
	if (voice) voice.layers++
	src.onended = () => {
		for (const n of nodes) n.disconnect()
		if (voice && --voice.layers === 0) voice.chain.forEach((n) => n.disconnect())
	}
}

/** The node a layer connects to and the time it starts at, `delay` seconds after the sound's own lag. */
export function layerStart(ctx: AudioContext, out: Out, delay: number): [AudioNode, number] {
	return out instanceof AudioNode ? [out, ctx.currentTime + delay] : [out.node, ctx.currentTime + out.lag + delay]
}

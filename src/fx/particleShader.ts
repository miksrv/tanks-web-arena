/**
 * Soft round points sized in world units: `aSize` metres → pixels via `uScale` (screen height / tan(fov / 2)), no
 * larger than `uMaxSize` pixels.
 */
export const PARTICLE_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
uniform float uScale;
uniform float uMaxSize;
varying vec3 vC;
varying float vA;

void main() {
	vC = aColor;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	// Smoke right in front of the lens (the gun sight after a shot, dust under the chase camera) would cover the
	// screen in dozens of blended layers: cap the sprite and fade it out as it nears the camera
	vA = aAlpha * smoothstep(0.8, 3.5, -mv.z);
	gl_PointSize = min(aSize * uScale / max(1.0, -mv.z), uMaxSize);
	gl_Position = projectionMatrix * mv;
}
`

export const PARTICLE_FRAGMENT = /* glsl */ `
varying vec3 vC;
varying float vA;

void main() {
	float d = length(gl_PointCoord - 0.5);
	float a = smoothstep(0.5, 0.12, d) * vA;
	if (a < 0.01) discard;
	gl_FragColor = vec4(vC, a);
	#include <colorspace_fragment>
}
`

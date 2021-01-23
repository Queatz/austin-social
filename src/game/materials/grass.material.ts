import { Effect, Scene, ShaderMaterial, Texture } from '@babylonjs/core';

Effect.ShadersStore['grassVertexShader'] = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute float time;

// Uniforms
uniform mat4 worldViewProjection;

// Varying
varying vec4 vPosition;
varying vec3 vNormal;
varying vec2 vUV;

void main() {
	vec4 p = vec4( position, 1. );

	vPosition = p;
	vNormal = normal;
  vUV = uv;
	gl_Position = worldViewProjection * p;
}`

Effect.ShadersStore['grassFragmentShader'] = `
precision highp float;

uniform mat4 worldView;
uniform sampler2D iChannel0;

varying vec4 vPosition;
varying vec2 vUV;

precision mediump float;

void main() {
  vec4 color = texture2D(iChannel0, vUV);

  if (color.a < .4) {
    discard;
  }

  gl_FragColor = texture2D(iChannel0, vUV);
}
`

export function getGrassMaterial(scene: Scene): ShaderMaterial {
	const shaderMaterial = new ShaderMaterial('grassShader', scene, {
		vertex: 'grass',
		fragment: 'grass',
	}, {
		attributes: ['position', 'normal', 'uv'],
    uniforms: ['world', 'worldView', 'worldViewProjection', 'view', 'time', 'projection'],
    needAlphaBlending: true,
    needAlphaTesting: true
	})

	const mainTexture = new Texture('/assets/grass.png', scene, true, false, 12)

	shaderMaterial.setTexture('iChannel0', mainTexture) 
	shaderMaterial.backFaceCulling = false

	return shaderMaterial
}
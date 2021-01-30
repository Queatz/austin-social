import { Mesh, ShadowGenerator, SceneLoader, VertexBuffer, Texture, PBRMaterial, Color3, SolidParticleSystem, Vector3, Material, ShaderMaterial, FloatArray, IndicesArray, Scalar, Vector4, Quaternion, SolidParticle, Engine, MeshBuilder, Scene } from '@babylonjs/core'
import { PBRCustomMaterial } from '@babylonjs/materials'
import { WaterController } from './water.controller'
import * as seedrandom from 'seedrandom'

export class PlantsController {
  addRocks(scene: Scene, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator): void {
    const rnd = seedrandom('rock')
    
    this.scatter(scene, 'rock.glb', 'Rock', .05, undefined, ground, water, shadowGenerator, (particle, info, mesh) => {
      particle.rotation.y += rnd() * Math.PI
      particle.scale.scaleInPlace((rnd() + .5) * .333)

      const r = particle.scale.y * mesh.getBoundingInfo().boundingSphere.radius

      const collider = MeshBuilder.CreateCylinder('Collision', {
        height: r*2,
        diameter: 2 * r,
        subdivisions: 1,
        tessellation: 6
      }, scene)
      collider.collisionRetryCount = 5
      collider.isVisible = false
      collider.checkCollisions = true
      collider.position.copyFrom(particle.position)
      collider.parent = ground

    }, undefined, undefined, .5)
  }

  addGrasses(scene: Scene, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator): void {
    this.scatter(scene, 'grass.glb', 'GrassPatch01', .08, undefined, ground, water, shadowGenerator, (particle, info) => {
      const scale = info[2] > .25 ? info[2] / 10 : 0.05 / 10
      particle.scale.x = scale
      particle.scale.y = scale * 2
      particle.scale.z = scale
    }, () => {
      const tex = new Texture('assets/grass.png', scene)
      tex.hasAlpha = true
      tex.vScale = -1

      const grassMat = new PBRCustomMaterial('grass', scene)
      grassMat.albedoTexture = tex
      grassMat.directIntensity = 4
      grassMat.roughness = .7
      grassMat.metallic = .3
      grassMat.specularIntensity = 0
      grassMat.useAlphaFromAlbedoTexture = true
      grassMat.transparencyMode = Material.MATERIAL_ALPHATEST
      grassMat.backFaceCulling = false
      grassMat.AddUniform('time', 'float', null)

      let time = 0

      grassMat.onBindObservable.add(() => { 
        time += scene.getEngine().getDeltaTime()
        grassMat.getEffect().setFloat('time', time)
      })

      grassMat.Vertex_Before_PositionUpdated(`
        float influence = pow(1. - uv.y, 2.) / 8.;
        float t = time / 4000. + positionUpdated.x / 4. + positionUpdated.y / 4.;

        result = vec3(positionUpdated + influence * vec3(sin(t), 0., cos(t)));
      `)

      return grassMat
    })
  }

  addGrassPatches(scene: Scene, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator): void {
    this.scatter(scene, 'grass patch.glb', 'Grass Patch', .4, 'grass', ground, water, shadowGenerator, (particle, info) => {
      const scale = .1 + info[2] * .4
      particle.scale.scaleInPlace(scale)
    }, material => {
      const tex = (material as PBRMaterial).albedoTexture
      tex.hasAlpha = true

      const grassMat = new PBRCustomMaterial('grass patch', scene)
      grassMat.albedoTexture = tex
      grassMat.directIntensity = 12
      grassMat.roughness = .7
      grassMat.metallic = .0
      grassMat.specularIntensity = 0
      grassMat.useAlphaFromAlbedoTexture = true
      grassMat.transparencyMode = Material.MATERIAL_ALPHATEST
      grassMat.backFaceCulling = false
      grassMat.AddUniform('time', 'float', null)

      let time = 0

      grassMat.onBindObservable.add(() => { 
        time += scene.getEngine().getDeltaTime()
        grassMat.getEffect().setFloat('time', time)
      })

      grassMat.Vertex_Before_PositionUpdated(`
        float influence = pow(1. - uv.y, 2.) / 8.;
        float t = time / 4000. + positionUpdated.x / 4. + positionUpdated.y / 4.;

        result = vec3(positionUpdated + influence * vec3(sin(t), 0., cos(t)));
      `)

      return grassMat
    }, undefined, 1)
  }

  addYellowTwigs(scene: Scene, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator): void {
    this.scatter(scene, 'yellow twig tree.glb', ['Leaves', 'Twigs'], .017, undefined, ground, water, shadowGenerator, (particle, info) => {
      const rnd = seedrandom(particle.idx.toString())
    
      particle.rotation.y += rnd() * Math.PI
      particle.scale.scaleInPlace(info[2] > .25 ? info[2] : 0.25)
    }, undefined, undefined, .5)
  }

  addThistles(scene: Scene, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator): void {
    this.scatter(scene, 'thistle.glb', 'Thistle', .07, 'ehwptrgoi', ground, water, shadowGenerator, (particle, info) => {
      const rnd = seedrandom(particle.idx.toString())
    
      particle.rotation.y += rnd() * Math.PI
      particle.scale.scaleInPlace(info[2] > .25 ? info[2] : 0.25).scaleInPlace(1.5)
    }, material => {
      (material as PBRMaterial).directIntensity = 4
      material.transparencyMode = Material.MATERIAL_ALPHATEST

      return material
    }, undefined, 0, true)
  }

  scatter(scene: Scene, fileName: string | undefined, meshName: string | Array<string> | Mesh | Array<Mesh>, density: number, seed: string | undefined, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator, particleCallback?: (particle: SolidParticle, info: [Vector3, Vector3, number], mesh: Mesh) => void, materialCallback?: (material: Material) => Material, meshCallback?: (mesh: Mesh) => void, alignToNormal = 0, billboard = false, colorFunc?: (color: Vector4) => number): void {
    if (Array.isArray(meshName)) {
      meshName.forEach((x: string | Mesh) => {
        this.scatter(scene, fileName, x, density, seed, ground, water, shadowGenerator, particleCallback, materialCallback, meshCallback, alignToNormal, billboard, colorFunc)
      })
      
      return
    }
    
    if (meshName instanceof Mesh) {
      this.generate(scene, meshName as Mesh, density, seed, ground, water, shadowGenerator, particleCallback, materialCallback, meshCallback, alignToNormal, billboard, colorFunc)
    } else {
      SceneLoader.LoadAssetContainer('assets/', fileName, scene, meshes => {
        this.generate(scene, meshes.meshes.find(x => x.name === meshName) as Mesh, density, seed, ground, water, shadowGenerator, particleCallback, materialCallback, meshCallback, alignToNormal, billboard, colorFunc)
      })
    }
  }

  private generate(scene: Scene, scatterMesh: Mesh, density: number, seed: string | undefined, ground: Mesh, water: WaterController, shadowGenerator: ShadowGenerator, particleCallback?: (particle: SolidParticle, info: [Vector3, Vector3, number], mesh: Mesh) => void, materialCallback?: (material: Material) => Material, meshCallback?: (mesh: Mesh) => void, alignToNormal = 0, billboard = false, colorFunc?: (color: Vector4) => number) {
    const positions = ground.getVerticesData(VertexBuffer.PositionKind)!
    const normals = ground.getVerticesData(VertexBuffer.NormalKind)!
    const colors = ground.getVerticesData(VertexBuffer.ColorKind)!
    const indices = ground.getIndices()!
    const points = this.createSurfacePoints(positions, normals, colors, indices, colorFunc, density)
    
    if (materialCallback) { 
      scatterMesh.material = materialCallback(scatterMesh.material!)
    }

    const SPS = new SolidParticleSystem('SPS', scene, {
      useModelMaterial: true
    })

    SPS.addShape(scatterMesh, points.length)
    const mesh = SPS.buildMesh()

    mesh.position = ground.position
    mesh.rotation = ground.rotation
    mesh.rotationQuaternion = ground.rotationQuaternion
    mesh.parent = ground.parent

    SPS.initParticles = () => {
      for (let p = 0; p < points.length; p++) {
        const particle = SPS.particles[p]  
        const point = points[p]
        particle.position.copyFrom(point[0])
        
        if(alignToNormal) {
          const quat = new Quaternion()
          Quaternion.FromUnitVectorsToRef(new Vector3(0, 1, 0), point[1], quat)
          particle.rotationQuaternion = Quaternion.Identity().multiply(quat.scale(alignToNormal))
        }

        particleCallback?.(particle, point, scatterMesh)
      }
    }

    SPS.isAlwaysVisible = true
    SPS.initParticles()
    SPS.setParticles()
    SPS.mesh.freezeWorldMatrix()

    if (!billboard) {
      SPS.mesh.freezeNormals()
    }

    SPS.mesh.useVertexColors = false
    SPS.mesh.hasVertexAlpha = false
    SPS.mesh.receiveShadows = true
    SPS.computeParticleRotation = false
    SPS.computeParticleColor = false
    SPS.computeParticleTexture = false
    SPS.computeParticleVertex = false
    SPS.computeBoundingBox = false
    shadowGenerator.addShadowCaster(SPS.mesh)
    water.addToRenderList(SPS.mesh)

    if (billboard) {
      SPS.billboard = true
      SPS.mesh.onBeforeBindObservable.add(() => {
        SPS.setParticles()
      })
    }

    meshCallback?.(SPS.mesh)
  }

  private createSurfacePoints(positions: FloatArray, normals: FloatArray, colors: FloatArray, indices: IndicesArray, colorFunc?: (color: Vector4) => number, pointDensity: number = 1, seed?: string): Array<[Vector3, Vector3, number]> {
    if (!colorFunc) colorFunc = x => x.x
    
    let points = [] as Array<[Vector3, Vector3, number]>
    
    let id0 = 0
    let id1 = 0 
    let id2 = 0
    let vertex0 = Vector3.Zero()
    let vertex1 = Vector3.Zero()
    let vertex2 = Vector3.Zero()
    let normal0 = Vector3.Zero()
    let normal1 = Vector3.Zero()
    let normal2 = Vector3.Zero()
    let color0 = Vector4.Zero()
    let color1 = Vector4.Zero()
    let color2 = Vector4.Zero()
    let vec0 = Vector3.Zero()
    let vec1 = Vector3.Zero()
    let vec2 = Vector3.Zero()
    let nor0 = Vector3.Zero()
    let nor1 = Vector3.Zero()
    let nor2 = Vector3.Zero()

    let a = 0 //length of side of triangle
    let b = 0 //length of side of triangle
    let c = 0 //length of side of triangle
    let p = 0 //perimeter of triangle
    let area = 0
    let nbPoints = 0 //nbPoints per triangle
    
    let lamda = 0
    let mu = 0

    const rnd = seedrandom(seed || 'austin')

    for(let index = 0; index < indices.length / 3; index++) {  				
      id0 = indices[3 * index]
      id1 = indices[3 * index + 1] 
      id2 = indices[3 * index + 2]        
      vertex0.fromArray(positions, 3 * id0)
      vertex1.fromArray(positions, 3 * id1)
      vertex2.fromArray(positions, 3 * id2)
      normal0.fromArray(normals, 3 * id0)
      normal1.fromArray(normals, 3 * id1)
      normal2.fromArray(normals, 3 * id2)
      color0.fromArray(colors, 4 * id0)
      color1.fromArray(colors, 4 * id1)
      color2.fromArray(colors, 4 * id2)
      vertex1.subtractToRef(vertex0, vec0)
      vertex2.subtractToRef(vertex1, vec1)
      vertex2.subtractToRef(vertex0, vec2)
      normal1.subtractToRef(normal0, nor0)
      normal2.subtractToRef(normal1, nor1)
      normal2.subtractToRef(normal0, nor2)
      a = vec0.length()
      b = vec1.length()
      c = vec2.length()
      p = (a + b + c) / 2        
      area = Math.sqrt(p * (p - a) * (p - b) * (p - c))

      const overallColor = (colorFunc(color0) + colorFunc(color1) + colorFunc(color2)) / 3

      nbPoints = Math.round(pointDensity * area * overallColor)

      if (nbPoints === 0 && rnd() < pointDensity * overallColor) {
        nbPoints = 1
      }

      for (let i = 0; i < nbPoints; i++) {
        lamda = rnd()
        mu = rnd()
        points.push([
          vertex0.add(vec0.scale(lamda)).add(vec1.scale(lamda * mu)),
          normal0.add(nor0.scale(lamda)).add(nor1.scale(lamda * mu)),
          (color0.x * (1 - lamda - lamda * mu)) +
          (color1.x * lamda) +
          (color2.x * lamda * mu)
        ])
      }	
    }
    return points
  }
}
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { URDFRobot } from 'urdf-loader';
import { WebSocketClient } from './webSocketClient';
import { MessageTypes } from './types/messageTypes';

// @ts-ignore
import URDFLoader from 'urdf-loader';

// Define a constant for the asset path
const ASSETS_PATH = '/assets';
const SERVER_BASE = 'localhost:8000'

/**
 * Class for handling 3D robot visualization using Three.js
 */
export class RobotVisualization {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private robot: URDFRobot | null = null;
  private container: HTMLElement;
  private wsClient: WebSocketClient;
  private animationFrameId: number | null = null;
  public assetsPath: string = ASSETS_PATH;

  constructor(container: HTMLElement, wsClient: WebSocketClient) {
    this.container = container;
    this.wsClient = wsClient;

    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0f0f0);
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(1.5, 1.5, 1.5);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Setup orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;

    this.setupLights();
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
    this.loadRobotModel(this.assetsPath + '/iiwa14_glb.urdf');
    this.setupWebSocketListener();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * Setup scene lighting
   */
  private setupLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light (simulating sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;

    // Adjust shadow properties for better quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.001;

    this.scene.add(directionalLight);
  }

  /**
   * Load the URDF robot model
   */
  public loadRobotModel(modelUrl: string): void {
    if (this.robot) {
      this.scene.remove(this.robot);
      this.robot = null;
    }

    if (!modelUrl.startsWith('http')) {
      modelUrl = 'https://' + SERVER_BASE + modelUrl;
    }

    const loader = new URDFLoader();
    
    loader.loadMeshCb = (path: string, manager: THREE.LoadingManager, onComplete) => {
      return new Promise((resolve) => {
        const gltfLoader = new GLTFLoader(manager);
        gltfLoader.load(
          path,
          result => {
            // this.scene.add( result.scene );
            onComplete( result.scene );
          },
          xhr => {
		        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	        },
          err => {
            console.log("load mesh error: ", err)
              // onComplete( null, err );
          }
        );
      });
    };
    
    loader.load(
      modelUrl,
      (robot: URDFRobot) => {
        this.robot = robot;
        
        robot.position.set(0, 0, 0);
        robot.rotation.set(0, 0, 0);
        
        robot.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.scene.add(robot);
        console.log('Robot URDF model loaded successfully');
      },
      (progress: ProgressEvent) => {
        if (progress && typeof progress.loaded === 'number' && typeof progress.total === 'number') {
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log(`Loading robot model: ${Math.round(percentComplete)}%`);
        } else {
          console.log('Loading robot model... (progress data unavailable)');
        }
      },
      (error: Error) => {
        console.error('Error loading robot URDF:', error);
      }
    );
  }

  /**
   * Setup WebSocket listener for joint updates
   */
  private setupWebSocketListener(): void {
    this.wsClient.on(MessageTypes.JOINT_STATES, (data) => {
      if (this.robot && data.joint_positions) {
        Object.entries(data.joint_positions).forEach(([jointName, position]) => {
          if (this.robot) {
            this.robot.setJointValue(jointName, position as number);
          }
        });
      }
    });


  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    // Update orbit controls
    this.controls.update();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Send updated poses to the backend server
    // this.wsClient.send({
    //   type: 'robot_pose',
    //   data: {
    //     position: this.robot ? this.robot.position.toArray() : [0, 0, 0],
    //     orientation: this.robot ? this.robot.quaternion.toArray() : [0, 0, 0, 1]
    //   }
    // });
  }

  /**
   * Start the rendering loop
   */
  public start(): void {
    this.animate();
  }

  /**
   * Stop the rendering loop and clean up resources
   */
  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.container.removeChild(this.renderer.domElement);
    
    this.renderer.dispose();
  }
}

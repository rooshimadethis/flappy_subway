export const CONFIG = {
    flappy: {
        canvas: { width: 600, height: 800 },
        bird: {
            x: 150,
            y: 300,
            radius: 22,
            gravity: 0.4,
            jumpStrength: -9,
            maxVelocity: 12
        },
        pipes: {
            width: 80,
            gap: 200,
            speed: 3,
            spawnInterval: 1800,
            minHeight: 100,
            maxHeight: 400
        }
    },
    subway: {
        canvas: { width: 600, height: 800 },
        player: {
            lane: 1, // 0 = left, 1 = center, 2 = right
            laneWidth: 150,
            y: 550,
            width: 50,
            height: 70
        },
        obstacles: {
            speed: 8,
            spawnInterval: 1200,
            types: ['train', 'barrier', 'sign'],
            dimensions: {
                train: { width: 60, height: 80 },
                barrier: { width: 60, height: 80 },
                sign: { width: 60, height: 80 }
            }
        },
        coins: {
            speed: 8,
            spawnInterval: 800,
            width: 40,
            height: 40
        }
    }
};

// ===== FIREBASE CONFIGURATION =====
// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyCBXU8m653_Y4WX0zIq8tQ9XQA73H6Zbl0",
    authDomain: "flappy-subway.firebaseapp.com",
    databaseURL: "https://flappy-subway-default-rtdb.firebaseio.com",
    projectId: "flappy-subway",
    storageBucket: "flappy-subway.firebasestorage.app",
    messagingSenderId: "371224647268",
    appId: "1:371224647268:web:07bc5e7e6cd57870707171",
    measurementId: "G-3MRZR5H3LC"
};

// Initialize Firebase safely
let db = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log("Firebase initialized successfully");
    } else {
        console.warn("Firebase SDK not loaded");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

export const firebaseDb = db;

// ===== CACHED ASSETS =====
export const ASSETS = {
    gradients: {},
    colors: {}
};

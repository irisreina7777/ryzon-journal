// ============================================================
// FIREBASE CONFIGURATION — RYZON
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyCBoFwX4l4FMkL6CSAWVT0Qr3G5GEUQjWA",
    authDomain: "ryzon-3e5e3.firebaseapp.com",
    projectId: "ryzon-3e5e3",
    storageBucket: "ryzon-3e5e3.firebasestorage.app",
    messagingSenderId: "440273735534",
    appId: "1:440273735534:web:ebf7f4596f158ac2f1bb7f",
    measurementId: "G-KMD65ML9M2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser');
    }
});

console.log('Firebase initialized for RYZON');

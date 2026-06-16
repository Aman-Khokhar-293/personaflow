/**
 * PersonaFlow - Firebase Client Configuration
 * Configure your Firebase credentials here to enable Google Authentication.
 */

const firebaseConfig = {
    apiKey: "AIzaSyC7tmrb4iJxEqsA17qSmbXkFrnYJBu4bYc",
    authDomain: "personaflow-8c301.firebaseapp.com",
    projectId: "personaflow-8c301",
    storageBucket: "personaflow-8c301.firebasestorage.app",
    messagingSenderId: "140566775216",
    appId: "1:140566775216:web:d73651d346237e6c880275"
};

// Initialize Firebase if the API key is provided
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
} else {
    console.warn("Firebase is not initialized. Please configure your firebaseConfig in frontend/js/firebase-config.js");
}

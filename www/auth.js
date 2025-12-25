// Live Backend URL
const API_BASE_URL = "https://backend-bwwq.onrender.com/api";

// --- Loader Animation ---
function showLoader() {
    if (document.getElementById('loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:9999;';
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.style.cssText = 'border:8px solid #f3f3f3;border-top:8px solid #FF0000;border-radius:50%;width:60px;height:60px;animation:spin 1s linear infinite;';
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
    const style = document.createElement('style');
    if (!document.getElementById('spinner-style')) {
        style.id = 'spinner-style';
        style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }
}

function hideLoader() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}

// --- Centralized Session Handler ---
async function handleUserSession(user) {
    try {
        const idToken = await user.getIdToken(true); // Force refresh
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (response.ok) {
            const profile = await response.json();
            // Ensure photo_url is in the profile, if not, use Firebase's or generate one
            if (!profile.photo_url) {
                profile.photo_url = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`;
            }
            localStorage.setItem('userProfile', JSON.stringify(profile));
            window.location.href = 'index.html';
        } else if (response.status === 404) {
            window.location.href = 'onboarding.html';
        } else {
            throw new Error(`Server error: ${response.status}`);
        }
    } catch (error) {
        console.error("Session handling error:", error);
        // Fallback to onboarding if server is unreachable
        const localProfile = localStorage.getItem('userProfile');
        if (localProfile) {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'onboarding.html';
        }
    }
}

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase is initialized
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded. Check your internet connection or config.js.");
        return;
    }

    // Set Persistence to LOCAL (helps with maintaining session)
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((error) => console.error("Error setting persistence:", error));

    // --- Event Listeners ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const loginInput = document.getElementById('loginInput').value;
            const password = document.getElementById('loginPassword').value;
            login(loginInput, password);
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            signup(name, username, email, password, confirmPassword);
        });
    }

    const googleBtn = document.getElementById('googleSignIn') || document.getElementById('googleSignUp');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            googleLogin();
        });
    }

    const onboardingForm = document.getElementById('onboardingForm');
    if (onboardingForm) {
        onboardingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoader();
            const state = document.getElementById('userState').value;
            const language = document.getElementById('userLanguage').value;

            if (state && language) {
                const user = firebase.auth().currentUser;
                if (user) {
                    try {
                        const idToken = await user.getIdToken();
                        // Get photo URL from Firebase or generate default
                        const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`;

                        const response = await fetch(`${API_BASE_URL}/user/profile`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                            body: JSON.stringify({ state, language, photo_url: photoUrl })
                        });

                        if (response.ok) {
                            const userProfile = {
                                userId: user.uid,
                                email: user.email,
                                state,
                                language,
                                photo_url: photoUrl
                            };
                            localStorage.setItem('userProfile', JSON.stringify(userProfile));
                            window.location.href = 'index.html';
                        } else {
                            throw new Error((await response.json()).detail || "Failed to save profile");
                        }
                    } catch (error) {
                        console.error("Error saving onboarding data:", error);
                        const userProfile = { userId: user.uid, email: user.email, state, language };
                        localStorage.setItem('userProfile', JSON.stringify(userProfile));
                        window.location.href = 'index.html';
                    }
                } else {
                    hideLoader();
                    alert("You must be signed in to save preferences.");
                }
            } else {
                hideLoader();
                alert("Please select both state and language.");
            }
        });
    }

    // --- Auth State Listener ---
    firebase.auth().onAuthStateChanged(async (user) => {
        const path = window.location.pathname;
        let page = path.split("/").pop().split("?")[0] || 'index.html';
        const authPages = ['login.html', 'signup.html', 'verify-email.html'];
        const isAuthPage = authPages.includes(page);

        if (user) {
            // Check for email verification (skip for Google sign-in)
            if (!user.emailVerified && user.providerData[0].providerId === 'password') {
                if (page !== 'verify-email.html') {
                    localStorage.setItem('pendingEmail', user.email);
                    window.location.href = 'verify-email.html';
                }
                return;
            }

            if (isAuthPage) {
                await handleUserSession(user);
            }
        } else {
            const protectedPages = ['index.html', 'profile.html', 'download.html', 'search.html', 'short.html', 'settings.html', 'long.html', 'onboarding.html'];
            if (protectedPages.includes(page)) {
                window.location.href = 'login.html';
            }
        }
    });
});

// --- Auth Functions ---

async function login(loginInput, password) {
    showLoader();
    let email = loginInput;

    // Check if input is a User ID or Email
    if (!loginInput.includes('@')) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginInput })
            });
            if (response.ok) {
                const data = await response.json();
                email = data.email;
            } else {
                throw new Error('User ID not found');
            }
        } catch (error) {
            hideLoader();
            alert("User ID not found. Please check the ID or login with your email.");
            return;
        }
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            if (!userCredential.user.emailVerified) {
                hideLoader();
                localStorage.setItem('pendingEmail', email);
                window.location.href = 'verify-email.html';
            } else {
                await handleUserSession(userCredential.user);
            }
        })
        .catch((error) => {
            hideLoader();
            console.error("Login Error:", error);
            if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                alert("Login failed. \n\n1. If you signed up with Google, please use the 'Continue with Google' button.\n2. Check your email/User ID and password for typos.\n3. If you don't have an account, please Sign Up.");
            } else if (error.code === 'auth/user-not-found') {
                alert("No account found with this email. Please sign up.");
            } else {
                alert("Login failed: " + error.message);
            }
        });
}

let isGoogleLoginPending = false;
function googleLogin() {
    if (isGoogleLoginPending) return;
    isGoogleLoginPending = true;
    showLoader();

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    firebase.auth().signInWithPopup(provider)
        .then(async (result) => {
            isGoogleLoginPending = false;
            await handleUserSession(result.user);
        })
        .catch((error) => {
            isGoogleLoginPending = false;
            hideLoader();
            console.error("Google Sign-In Error:", error);
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                alert("Google Sign-In failed: " + error.message);
            }
        });
}

function signup(name, username, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }
    showLoader();
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            await userCredential.user.updateProfile({ displayName: name });
            const idToken = await userCredential.user.getIdToken();

            // Register user in our backend
            const response = await fetch(`${API_BASE_URL}/user/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ username, email, display_name: name })
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Signup failed: ${errorData.detail}`);
                await userCredential.user.delete();
                hideLoader();
                throw new Error(errorData.detail);
            }

            // Send Verification Email
            await userCredential.user.sendEmailVerification();
            localStorage.setItem('pendingEmail', email);
            window.location.href = 'verify-email.html';
        })
        .catch((error) => {
            hideLoader();
            console.error("Signup Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("This email is already registered. Please login instead.");
            } else {
                alert("Signup failed: " + error.message);
            }
        });
}

function logout() {
    showLoader();
    firebase.auth().signOut().then(() => {
        localStorage.removeItem('userProfile');
        window.location.href = 'login.html';
    }).catch((error) => {
        hideLoader();
        console.error("An error happened during sign-out:", error);
    });
}

window.logout = logout;

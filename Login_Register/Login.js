// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
 
const firebaseConfig = {
  apiKey: "AIzaSyBO4qbODFdmhUlOdcEa4hXQrmd4zzctM2k",
  authDomain: "jsi45-nct.firebaseapp.com",
  databaseURL: "https://jsi45-nct-default-rtdb.firebaseio.com",
  projectId: "jsi45-nct",
  storageBucket: "jsi45-nct.firebasestorage.app",
  messagingSenderId: "701333259060",
  appId: "1:701333259060:web:5786ef73795c431c195b61"
};
 
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth();
 
// ── List of admin emails ──
// Add any email addresses that should have admin access here.
const ADMIN_EMAILS = [
  "admin@thelibrary.com",
  // "anothermanager@thelibrary.com",
];
 
let username_login = document.getElementById("username_input_login");
let password_login = document.getElementById("password_input_login");
let login_btn = document.getElementById("login_btn");
 
// Đăng nhập
login_btn.addEventListener("click", function () {
  let username = username_login.value.trim();
  let password = password_login.value;
 
  signInWithEmailAndPassword(auth, username, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const date = new Date();
 
      update(ref(database, "user/" + user.uid), {
        lastLogin: date.toISOString(),
      }).then(() => {
        localStorage.setItem("name", username);
        localStorage.setItem("userID", user.uid);
 
        // ── Admin check ──
        const isAdmin = ADMIN_EMAILS.includes(username.toLowerCase());
        localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
 
        alert("Đăng nhập thành công");
 
        if (isAdmin) {
          window.location.href = "../Admin/admin.html";
        } else {
          window.location.href = "../Home/index.html";
        }
      });
    })
    .catch((err) => {
      alert(err.message);
    });
});
 
// If already logged in, skip the login page
const name = localStorage.getItem("name");
const isAdmin = localStorage.getItem("isAdmin");
if (name) {
  if (isAdmin === "true") {
    window.location.href = "../Admin/admin.html";
  } else {
    window.location.href = "../Home/index.html";
  }
}
 
let goRegister_btn = document.getElementById("goRegister");
goRegister_btn.addEventListener("click", function () {
  window.location.href = "../Login_Register/Register.html";
});
 
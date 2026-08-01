import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";

import {
  getDatabase,
  set,
  ref,
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-database.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const database = getDatabase(app);
const auth = getAuth(app);

// Inputs
let username_register = document.getElementById("username_input_register");
let password_register = document.getElementById("password_input_register");
let register_btn = document.getElementById("register_btn");

// Register
register_btn.addEventListener("click", async function () {

  let username = username_register.value.trim();
  let password = password_register.value.trim();

  // Validation
  if (username === "" || password === "") {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  if (password.length < 6) {
    alert("Mật khẩu phải có ít nhất 6 ký tự");
    return;
  }

  try {

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      username,
      password
    );

    const user = userCredential.user;

    // Save user data
    await set(ref(database, "user/" + user.uid), {
      id: user.uid,
      username: username,
      createdAt: new Date().toString(),
    });

    alert("Tạo tài khoản thành công");

    // Redirect to login
    window.location.href = "./Login.html";

  } catch (err) {

    console.log(err);

    switch (err.code) {

      case "auth/email-already-in-use":
        alert("Email đã được sử dụng");
        break;

      case "auth/invalid-email":
        alert("Email không hợp lệ");
        break;

      case "auth/weak-password":
        alert("Mật khẩu quá yếu");
        break;

      default:
        alert(err.message);

    }

  }

});

// Go to login page
let goLogin_btn = document.getElementById("goLogin");

goLogin_btn.addEventListener("click", function () {
  window.location.href = "./Login.html";
});